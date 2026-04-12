import { z } from "zod";

export const standardViewSchema = z.enum(["L-CC", "L-MLO", "R-CC", "R-MLO"]);

export const mammographyExamSchema = z.object({
  studyInstanceUid: z.string().min(1).max(128),
  modality: z.literal("FFDM"),
  standardViews: z.tuple([
    z.literal("L-CC"),
    z.literal("L-MLO"),
    z.literal("R-CC"),
    z.literal("R-MLO"),
  ]),
  patientAge: z.number().int().min(18).max(120).optional(),
  breastDensity: z.enum(["A", "B", "C", "D"]).optional(),
  accessionNumber: z.string().min(1).max(64).optional(),
});

export const mammographyClinicalQuestionSchema = z.object({
  questionText: z.string().min(1).max(2000),
  urgency: z.enum(["routine", "urgent", "stat"]),
});

export const mammographyDraftAssessmentSchema = z.object({
  summary: z.string().min(1).max(4000),
  biradsCategory: z.enum(["0", "1", "2", "3", "4", "5", "6"]),
  confidenceBand: z.enum(["high", "moderate", "low"]),
  outputMode: z.literal("draft-only"),
  findings: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
});

export const mammographySafetyFlagSchema = z.object({
  code: z.string().min(1).max(64),
  severity: z.enum(["info", "warning", "critical"]),
  description: z.string().min(1).max(2000),
  blocksReview: z.boolean(),
});

export const mammographyExamQualityFindingSchema = z.object({
  code: z.string().min(1).max(64),
  severity: z.enum(["info", "warning"]),
  description: z.string().min(1).max(2000),
});

export const mammographyExamQualitySummarySchema = z.object({
  status: z.enum(["pass", "warning"]),
  findingCount: z.number().int().min(0),
  findings: z.array(mammographyExamQualityFindingSchema),
});

export const mammographyDraftGenerationStageSchema = z.object({
  name: z.enum(["exam-qc", "draft-generation", "safety-evaluation"]),
  status: z.literal("completed"),
  latencyMs: z.number().int().min(0),
});

export const mammographyDraftGenerationSummarySchema = z.object({
  orchestratorId: z.string().min(1).max(128),
  modelId: z.string().min(1).max(128),
  totalLatencyMs: z.number().int().min(0),
  stages: z.array(mammographyDraftGenerationStageSchema).min(1),
});

export const mammographyCaseReviewDispositionSchema = z.enum(["confirmed", "modified"]);

export const mammographyCaseReviewInputSchema = z.object({
  reviewerName: z.string().min(1).max(200),
  reviewerRole: z.string().min(1).max(128),
  disposition: mammographyCaseReviewDispositionSchema,
  finalBiradsCategory: z.enum(["0", "1", "2", "3", "4", "5", "6"]),
  finalSummary: z.string().min(1).max(4000),
  reviewNotes: z.string().min(1).max(4000),
});

export const mammographyCaseReviewSummarySchema = mammographyCaseReviewInputSchema.extend({
  finalizedAt: z.string().datetime(),
});

export const mammographyCaseDeliveryChannelSchema = z.enum(["ehr", "secure-email", "worklist"]);

export const mammographyCaseDeliveryInputSchema = z.object({
  channel: mammographyCaseDeliveryChannelSchema,
  destination: z.string().min(1).max(512),
  recipientName: z.string().min(1).max(200),
  deliveredBy: z.string().min(1).max(128),
});

export const mammographyCaseDeliverySummarySchema = mammographyCaseDeliveryInputSchema.extend({
  deliveredAt: z.string().datetime(),
});

export const mammographyCaseStatusSchema = z.enum(["Submitted", "AwaitingReview", "Finalized"]);

const mammographyCaseEventBaseSchema = z.object({
  eventId: z.string().uuid(),
  caseId: z.string().uuid(),
  occurredAt: z.string().datetime(),
});

export const mammographyCaseSubmittedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.case-submitted.v1"),
  payload: z.object({
    modality: z.literal("FFDM"),
    studyInstanceUid: z.string().min(1).max(128),
    standardViews: z.tuple([
      z.literal("L-CC"),
      z.literal("L-MLO"),
      z.literal("R-CC"),
      z.literal("R-MLO"),
    ]),
    questionText: z.string().min(1).max(2000),
    urgency: z.enum(["routine", "urgent", "stat"]),
  }),
});

export const mammographyDraftGeneratedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.draft-generated.v1"),
  payload: z.object({
    biradsCategory: z.enum(["0", "1", "2", "3", "4", "5", "6"]),
    confidenceBand: z.enum(["high", "moderate", "low"]),
    outputMode: z.literal("draft-only"),
    modelId: z.string().min(1).max(128),
    latencyMs: z.number().int().min(0),
  }),
});

export const mammographySafetyFlagsAppliedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.safety-flags-applied.v1"),
  payload: z.object({
    flagCount: z.number().int().min(0),
    hasBlockingFlags: z.boolean(),
    flags: z.array(mammographySafetyFlagSchema),
  }),
});

export const mammographyExamQcEvaluatedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.exam-qc-evaluated.v1"),
  payload: mammographyExamQualitySummarySchema,
});

export const mammographyDraftOrchestrationCompletedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.draft-orchestration-completed.v1"),
  payload: mammographyDraftGenerationSummarySchema,
});

export const mammographyCaseReviewFinalizedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.case-review-finalized.v1"),
  payload: mammographyCaseReviewSummarySchema,
});

export const mammographyCaseDeliveredEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.case-delivered.v1"),
  payload: mammographyCaseDeliverySummarySchema,
});

export const mammographyReportIntegritySealSchema = z.object({
  algorithm: z.literal("SHA-256"),
  reportHash: z.string().regex(/^[a-f0-9]{64}$/),
  sealedAt: z.string().datetime(),
  sealedBy: z.string().min(1).max(200),
});

export const mammographyReportIntegritySealedEventSchema = mammographyCaseEventBaseSchema.extend({
  type: z.literal("mammography.report-integrity-sealed.v1"),
  payload: mammographyReportIntegritySealSchema,
});

export const mammographyCaseLifecycleEventSchema = z.discriminatedUnion("type", [
  mammographyCaseSubmittedEventSchema,
  mammographyExamQcEvaluatedEventSchema,
  mammographyDraftGeneratedEventSchema,
  mammographySafetyFlagsAppliedEventSchema,
  mammographyDraftOrchestrationCompletedEventSchema,
  mammographyCaseReviewFinalizedEventSchema,
  mammographyCaseDeliveredEventSchema,
  mammographyReportIntegritySealedEventSchema,
]);

export const mammographySecondOpinionCaseSnapshotSchema = z.object({
  caseId: z.string().uuid(),
  exam: mammographyExamSchema,
  clinicalQuestion: mammographyClinicalQuestionSchema,
  status: mammographyCaseStatusSchema,
  assessment: mammographyDraftAssessmentSchema.nullable(),
  modelId: z.string().min(1).max(128).nullable(),
  latencyMs: z.number().int().min(0).nullable(),
  qc: mammographyExamQualitySummarySchema.nullable().default(null),
  generation: mammographyDraftGenerationSummarySchema.nullable().default(null),
  review: mammographyCaseReviewSummarySchema.nullable().default(null),
  delivery: mammographyCaseDeliverySummarySchema.nullable().default(null),
  integritySeal: mammographyReportIntegritySealSchema.nullable().default(null),
  safetyFlags: z.array(mammographySafetyFlagSchema),
  events: z.array(mammographyCaseLifecycleEventSchema).default([]),
});

export const createMammographyCaseRequestSchema = z.object({
  exam: mammographyExamSchema,
  clinicalQuestion: mammographyClinicalQuestionSchema,
});

export const mammographyReportSealInputSchema = z.object({
  sealedBy: z.string().min(1).max(200),
});

export const mammographyCaseListQuerySchema = z.object({
  limit: z.preprocess(
    (value) => coerceNumericQueryParameter(value, 50),
    z.number().int().min(1).max(100),
  ),
  offset: z.preprocess(
    (value) => coerceNumericQueryParameter(value, 0),
    z.number().int().min(0),
  ),
});

export type MammographyExam = z.infer<typeof mammographyExamSchema>;
export type MammographyClinicalQuestion = z.infer<typeof mammographyClinicalQuestionSchema>;
export type MammographyDraftAssessment = z.infer<typeof mammographyDraftAssessmentSchema>;
export type MammographyDraftGenerationStage = z.infer<typeof mammographyDraftGenerationStageSchema>;
export type MammographyDraftGenerationSummary = z.infer<typeof mammographyDraftGenerationSummarySchema>;
export type MammographyCaseDeliveryInput = z.infer<typeof mammographyCaseDeliveryInputSchema>;
export type MammographyCaseDeliverySummary = z.infer<typeof mammographyCaseDeliverySummarySchema>;
export type MammographyCaseReviewInput = z.infer<typeof mammographyCaseReviewInputSchema>;
export type MammographyCaseReviewSummary = z.infer<typeof mammographyCaseReviewSummarySchema>;
export type MammographyExamQualityFinding = z.infer<typeof mammographyExamQualityFindingSchema>;
export type MammographyExamQualitySummary = z.infer<typeof mammographyExamQualitySummarySchema>;
export type MammographySafetyFlag = z.infer<typeof mammographySafetyFlagSchema>;
export type MammographyCaseLifecycleEvent = z.infer<typeof mammographyCaseLifecycleEventSchema>;
export type MammographyReportIntegritySeal = z.infer<typeof mammographyReportIntegritySealSchema>;
export type MammographySecondOpinionCaseSnapshot = z.infer<typeof mammographySecondOpinionCaseSnapshotSchema>;
export type CreateMammographyCaseRequest = z.infer<typeof createMammographyCaseRequestSchema>;

function coerceNumericQueryParameter(value: unknown, defaultValue: number): unknown {
  if (typeof value === "undefined") {
    return defaultValue;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (normalized.length === 0) {
      return Number.NaN;
    }

    return Number(normalized);
  }

  return value;
}
