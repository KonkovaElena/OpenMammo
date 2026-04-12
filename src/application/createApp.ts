import { randomUUID } from "node:crypto";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { Counter, type Registry } from "prom-client";
import { ZodError } from "zod";
import { CaseIntakeRateLimiter, type CaseIntakeRateLimitConfig } from "./CaseIntakeRateLimiter";
import { standaloneManifest } from "../domain/manifest";
import type { StructuredLogger } from "../logging";
import {
  createMammographyCaseRequestSchema,
  mammographyCaseListQuerySchema,
  mammographyCaseDeliveryInputSchema,
  type MammographyEventAuditContext,
  mammographyCaseReviewInputSchema,
  mammographyReportSealInputSchema,
  type CreateMammographyCaseRequest,
  type MammographyCaseDeliveryInput,
  type MammographyCaseReviewInput,
} from "../domain/mammography/contracts";
import { MammographyCaseDeliveryConflictError } from "./usecases/DeliverMammographyCaseReportUseCase";
import { MammographyCaseReviewConflictError } from "./usecases/FinalizeMammographySecondOpinionReviewUseCase";
import type { MammographyDicomwebArchiveSeamResponse } from "./usecases/RenderDicomwebArchiveSeamUseCase";
import type { MammographyOhifReviewSeamResponse } from "./usecases/RenderOhifReviewSeamUseCase";
import type { PythonSidecarIntegrationSeamResponse } from "./usecases/RenderPythonSidecarIntegrationSeamUseCase";
import { MammographyCaseReportNotReadyError, type MammographyRenderedReportResponse } from "./usecases/RenderMammographyCaseReportUseCase";
import {
  MammographyCaseReportSealConflictError,
  MammographyCaseReportSealNotReadyError,
  type MammographyReportSealInput,
  type MammographyReportSealResponse,
} from "./usecases/SealMammographyCaseReportUseCase";
import {
  MammographyCaseReportNotSealedError,
  type MammographyReportIntegrityResponse,
} from "./usecases/VerifyMammographyCaseReportIntegrityUseCase";
import type {
  ListMammographyCasesInput,
  ListMammographyCasesOutput,
} from "./usecases/ListMammographyCasesUseCase";
import type {
  GenerateMammographySecondOpinionOutput,
  MammographySecondOpinionCaseResponse,
} from "./usecases/GenerateMammographySecondOpinionUseCase";
import type {
  MammographySecondOpinionCaseEventsResponse,
} from "./usecases/GetMammographySecondOpinionCaseEventsUseCase";

interface RequestContext {
  requestId: string;
  correlationId: string;
  actorId?: string;
  actorRole?: string;
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
  caseIntakeRateLimit?: CaseIntakeRateLimitConfig;
  generateCase: (
    input: CreateMammographyCaseRequest,
    auditContext?: MammographyEventAuditContext,
  ) => Promise<GenerateMammographySecondOpinionOutput>;
  getCaseById: (caseId: string) => Promise<MammographySecondOpinionCaseResponse | null>;
  getCaseEventsById: (caseId: string) => Promise<MammographySecondOpinionCaseEventsResponse | null>;
  finalizeCaseReview: (
    caseId: string,
    reviewInput: MammographyCaseReviewInput,
    auditContext?: MammographyEventAuditContext,
  ) => Promise<MammographySecondOpinionCaseResponse | null>;
  renderCaseReport: (caseId: string) => Promise<MammographyRenderedReportResponse | null>;
  deliverCaseReport: (
    caseId: string,
    deliveryInput: MammographyCaseDeliveryInput,
    auditContext?: MammographyEventAuditContext,
  ) => Promise<MammographySecondOpinionCaseResponse | null>;
  renderOhifReviewSeam: (caseId: string) => Promise<MammographyOhifReviewSeamResponse | null>;
  renderDicomwebArchiveSeam: (caseId: string) => Promise<MammographyDicomwebArchiveSeamResponse | null>;
  renderPythonSidecarIntegrationSeam: () => Promise<PythonSidecarIntegrationSeamResponse>;
  sealCaseReport: (
    caseId: string,
    sealInput: MammographyReportSealInput,
    auditContext?: MammographyEventAuditContext,
  ) => Promise<MammographyReportSealResponse | null>;
  verifyCaseReportIntegrity: (caseId: string) => Promise<MammographyReportIntegrityResponse | null>;
  listCases: (input: ListMammographyCasesInput) => Promise<ListMammographyCasesOutput>;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const caseIntakeRateLimiter = new CaseIntakeRateLimiter(
    options.caseIntakeRateLimit ?? { windowMs: 60_000, maxRequests: 0 },
  );

  app.disable("x-powered-by");

  app.use(helmet());
  app.use(express.json());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = getOrCreateHeader(request, "x-request-id");
    const correlationId = getOptionalHeader(request, "x-correlation-id") ?? requestId;
    const requestContext: RequestContext = {
      requestId,
      correlationId,
      actorId: getOptionalHeader(request, "x-actor-id"),
      actorRole: getOptionalHeader(request, "x-actor-role"),
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
        actorId: requestContext.actorId,
        actorRole: requestContext.actorRole,
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

  app.get("/api/v1/integration-seams/python-sidecar", async (request: Request, response: Response) => {
    try {
      const output = await options.renderPythonSidecarIntegrationSeam();
      response.status(200).json(output);
    } catch (error) {
      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Python sidecar integration seam rendering failed unexpectedly.",
        ),
      );
    }
  });

  app.get("/api/v1/cases", async (request: Request, response: Response) => {
    try {
      const listQuery = mammographyCaseListQuerySchema.parse({
        limit: request.query.limit,
        offset: request.query.offset,
      });

      const output = await options.listCases(listQuery);
      response.status(200).json(output);
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json(
          buildErrorEnvelope(
            request,
            "INVALID_QUERY_PARAMETERS",
            "Query parameters do not match the case listing contract.",
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
          "Case listing failed unexpectedly.",
        ),
      );
    }
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

  app.get("/api/v1/cases/:caseId/events", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.getCaseEventsById(caseId);

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
          "Case event retrieval failed unexpectedly.",
        ),
      );
    }
  });

  app.get("/api/v1/cases/:caseId/review-seams/ohif", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.renderOhifReviewSeam(caseId);

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
          "OHIF review seam rendering failed unexpectedly.",
        ),
      );
    }
  });

  app.get("/api/v1/cases/:caseId/archive-seams/dicomweb", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.renderDicomwebArchiveSeam(caseId);

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
          "DICOMweb archive seam rendering failed unexpectedly.",
        ),
      );
    }
  });

  app.get("/api/v1/cases/:caseId/report", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.renderCaseReport(caseId);

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
      if (error instanceof MammographyCaseReportNotReadyError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_REPORT_NOT_READY",
            error.message,
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case report rendering failed unexpectedly.",
        ),
      );
    }
  });

  app.get("/api/v1/cases/:caseId/report/export", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.renderCaseReport(caseId);

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

      response.setHeader("content-type", output.report.format);
      response.setHeader(
        "content-disposition",
        `attachment; filename="${output.report.filename}"`,
      );
      response.status(200).send(output.report.body);
    } catch (error) {
      if (error instanceof MammographyCaseReportNotReadyError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_REPORT_NOT_READY",
            error.message,
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case report export failed unexpectedly.",
        ),
      );
    }
  });

  app.post("/api/v1/cases/:caseId/report/seal", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const sealInput = mammographyReportSealInputSchema.parse(request.body);
      const output = await options.sealCaseReport(caseId, sealInput, buildEventAuditContext(request));

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

      response.status(201).json(output);
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json(
          buildErrorEnvelope(
            request,
            "INVALID_REQUEST_BODY",
            "Seal body does not match the report seal contract.",
            { issues: error.issues },
          ),
        );
        return;
      }

      if (error instanceof MammographyCaseReportSealNotReadyError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_REPORT_SEAL_NOT_READY",
            error.message,
          ),
        );
        return;
      }

      if (error instanceof MammographyCaseReportSealConflictError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_REPORT_SEAL_CONFLICT",
            error.message,
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case report sealing failed unexpectedly.",
        ),
      );
    }
  });

  app.get("/api/v1/cases/:caseId/report/integrity", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const output = await options.verifyCaseReportIntegrity(caseId);

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
      if (error instanceof MammographyCaseReportNotSealedError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_REPORT_NOT_SEALED",
            error.message,
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case report integrity verification failed unexpectedly.",
        ),
      );
    }
  });

  app.post("/api/v1/cases/:caseId/deliver", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const deliveryInput = mammographyCaseDeliveryInputSchema.parse(request.body);
      const output = await options.deliverCaseReport(caseId, deliveryInput, buildEventAuditContext(request));

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
      if (error instanceof ZodError) {
        response.status(400).json(
          buildErrorEnvelope(
            request,
            "INVALID_REQUEST_BODY",
            "Delivery body does not match the delivery tracking contract.",
            { issues: error.issues },
          ),
        );
        return;
      }

      if (error instanceof MammographyCaseDeliveryConflictError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_DELIVERY_CONFLICT",
            error.message,
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case delivery tracking failed unexpectedly.",
        ),
      );
    }
  });

  app.post("/api/v1/cases/:caseId/review", async (request: Request, response: Response) => {
    try {
      const caseId = getSingleRouteParam(request.params.caseId);
      const reviewInput = mammographyCaseReviewInputSchema.parse(request.body);
      const output = await options.finalizeCaseReview(caseId, reviewInput, buildEventAuditContext(request));

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
      if (error instanceof ZodError) {
        response.status(400).json(
          buildErrorEnvelope(
            request,
            "INVALID_REQUEST_BODY",
            "Review body does not match the clinician review contract.",
            { issues: error.issues },
          ),
        );
        return;
      }

      if (error instanceof MammographyCaseReviewConflictError) {
        response.status(409).json(
          buildErrorEnvelope(
            request,
            "CASE_REVIEW_CONFLICT",
            error.message,
          ),
        );
        return;
      }

      logRequestFailure(request, options.logger, error);
      response.status(500).json(
        buildErrorEnvelope(
          request,
          "INTERNAL_ERROR",
          "Case review finalization failed unexpectedly.",
        ),
      );
    }
  });

  app.post("/api/v1/cases", async (request: Request, response: Response) => {
    try {
      const requestContext = getRequestContext(request);
      const rateLimitDecision = caseIntakeRateLimiter.evaluate(getClientAddress(request));

      if (rateLimitDecision.applied && !rateLimitDecision.allowed) {
        response.setHeader("Retry-After", String(rateLimitDecision.retryAfterSeconds));

        options.logger.info({
          event: "http.request.rate_limited",
          method: request.method,
          path: request.path,
          requestId: requestContext.requestId,
          correlationId: requestContext.correlationId,
          limit: rateLimitDecision.limit,
          retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
        });

        response.status(429).json(
          buildErrorEnvelope(
            request,
            "CASE_INTAKE_RATE_LIMITED",
            "Case intake rate limit exceeded for this client. Retry after the indicated backoff window.",
            {
              retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
            },
          ),
        );
        return;
      }

      const input = createMammographyCaseRequestSchema.parse(request.body);
      const output = await options.generateCase(input, buildEventAuditContext(request));

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
    actorId: getOptionalHeader(request, "x-actor-id"),
    actorRole: getOptionalHeader(request, "x-actor-role"),
    startedAtMs: Date.now(),
  };
}

function buildEventAuditContext(request: Request): MammographyEventAuditContext {
  const requestContext = getRequestContext(request);

  return {
    requestId: requestContext.requestId,
    correlationId: requestContext.correlationId,
    ...(requestContext.actorId ? { actorId: requestContext.actorId } : {}),
    ...(requestContext.actorRole ? { actorRole: requestContext.actorRole } : {}),
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
    actorId: requestContext.actorId,
    actorRole: requestContext.actorRole,
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

function getClientAddress(request: Request): string {
  return request.ip || request.socket.remoteAddress || "unknown";
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