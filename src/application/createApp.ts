import { randomUUID } from "node:crypto";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { Counter, type Registry } from "prom-client";
import { ZodError } from "zod";
import { standaloneManifest } from "../domain/manifest";
import type { StructuredLogger } from "../logging";
import {
  createMammographyCaseRequestSchema,
  type CreateMammographyCaseRequest,
} from "../domain/mammography/contracts";
import type {
  GenerateMammographySecondOpinionOutput,
  MammographySecondOpinionCaseResponse,
} from "./usecases/GenerateMammographySecondOpinionUseCase";

interface RequestContext {
  requestId: string;
  correlationId: string;
  startedAtMs: number;
}

const requestContextKey = Symbol("requestContext");
type RequestWithContext = Request & { [requestContextKey]?: RequestContext };

export interface CreateAppOptions {
  metricsEnabled: boolean;
  metricsRegistry: Registry;
  requestCounter: Counter<string>;
  startedAt: Date;
  logger: StructuredLogger;
  isShuttingDown: () => boolean;
  generateCase: (
    input: CreateMammographyCaseRequest,
  ) => Promise<GenerateMammographySecondOpinionOutput>;
  getCaseById: (caseId: string) => Promise<MammographySecondOpinionCaseResponse | null>;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());
  app.use(express.json());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = getOrCreateHeader(request, "x-request-id");
    const correlationId = getOptionalHeader(request, "x-correlation-id") ?? requestId;
    const requestContext: RequestContext = {
      requestId,
      correlationId,
      startedAtMs: Date.now(),
    };

    setRequestContext(request, requestContext);

    response.setHeader("x-request-id", requestId);
    response.setHeader("x-correlation-id", correlationId);

    response.on("finish", () => {
      const durationMs = Date.now() - requestContext.startedAtMs;
      const path = request.route?.path ?? request.path;

      options.requestCounter.inc({
        method: request.method,
        path,
        status_code: String(response.statusCode),
      });

      options.logger.info({
        event: "http.request.completed",
        method: request.method,
        path,
        statusCode: response.statusCode,
        requestId,
        correlationId,
        durationMs,
      });
    });

    next();
  });

  app.get("/healthz", (_request: Request, response: Response) => {
    response.status(200).json({
      status: "ok",
      product: standaloneManifest.product,
      scope: standaloneManifest.scope,
      safety: standaloneManifest.safety,
    });
  });

  app.get("/readyz", (_request: Request, response: Response) => {
    const shuttingDown = options.isShuttingDown();
    const runtime = {
      metricsEnabled: options.metricsEnabled,
      shuttingDown,
      uptimeSeconds: Math.max(0, (Date.now() - options.startedAt.getTime()) / 1000),
    };

    if (shuttingDown) {
      response.status(503).json({
        status: "shutting_down",
        product: standaloneManifest.product,
        runtime,
      });
      return;
    }

    response.status(200).json({
      status: "ready",
      product: standaloneManifest.product,
      runtime,
    });
  });

  app.get("/metrics", async (_request: Request, response: Response) => {
    if (!options.metricsEnabled) {
      response.status(404).json({ status: "disabled" });
      return;
    }

    response.setHeader("content-type", options.metricsRegistry.contentType);
    response.status(200).send(await options.metricsRegistry.metrics());
  });

  app.get("/api/v1/manifest", (_request: Request, response: Response) => {
    response.status(200).json(standaloneManifest);
  });

  app.get("/api/v1/cases/:caseId", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.getCaseById(caseId);

      if (!output) {
        response.status(404).json(
          buildErrorEnvelope(
            request,
            "CASE_NOT_FOUND",
            `Mammography case '${caseId}' was not found.`,
          ),
        );
        return;
      }

      response.status(200).json(output);
    } catch (error) {
      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case retrieval failed unexpectedly.",
        ),
      );
    }
  });

  app.post("/api/v1/cases", async (request: Request, response: Response) => {
    try {
      const input = createMammographyCaseRequestSchema.parse(request.body);
      const output = await options.generateCase(input);

      response.status(201).json(output);
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json(
          buildErrorEnvelope(
            request,
            "INVALID_REQUEST_BODY",
            "Request body does not match the FFDM case intake contract.",
            { issues: error.issues },
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);

      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case intake failed unexpectedly.",
        ),
      );
    }
  });

  return app;
}

function setRequestContext(request: Request, context: RequestContext): void {
  (request as RequestWithContext)[requestContextKey] = context;
}

function getRequestContext(request: Request): RequestContext {
  const existingContext = (request as RequestWithContext)[requestContextKey];

  if (existingContext) {
    return existingContext;
  }

  const requestId = getOrCreateHeader(request, "x-request-id");
  const correlationId = getOptionalHeader(request, "x-correlation-id") ?? requestId;

  return {
    requestId,
    correlationId,
    startedAtMs: Date.now(),
  };
}

function logRequestFailure(request: Request, logger: StructuredLogger, error: unknown): void {
  const requestContext = getRequestContext(request);

  logger.error({
    event: "http.request.failed",
    method: request.method,
    path: request.path,
    requestId: requestContext.requestId,
    correlationId: requestContext.correlationId,
    errorName: error instanceof Error ? error.name : "NonErrorThrown",
    errorMessage: error instanceof Error ? error.message : "Non-error value thrown",
  });
}

function buildErrorEnvelope(
  request: Request,
  code: string,
  message: string,
  extraFields: Record<string, unknown> = {},
): { error: Record<string, unknown> } {
  const requestContext = getRequestContext(request);

  return {
    error: {
      code,
      message,
      requestId: requestContext.requestId,
      correlationId: requestContext.correlationId,
      ...extraFields,
    },
  };
}

function getOptionalHeader(request: Request, headerName: string): string | undefined {
  const header = request.header(headerName);
  return typeof header === "string" && header.length > 0 ? header : undefined;
}

function getOrCreateHeader(request: Request, headerName: string): string {
  return getOptionalHeader(request, headerName) ?? randomUUID();
}

function getSingleRouteParam(routeParam: string | string[] | undefined): string {
  if (typeof routeParam === "string") {
    return routeParam;
  }

  if (Array.isArray(routeParam) && routeParam.length > 0) {
    return routeParam[0];
  }

  throw new Error("Required route parameter is missing.");
}