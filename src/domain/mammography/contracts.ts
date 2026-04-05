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

export const mammographyCaseStatusSchema = z.enum(["Submitted", "AwaitingReview"]);

export const mammographySecondOpinionCaseSnapshotSchema = z.object({
  caseId: z.string().uuid(),
  exam: mammographyExamSchema,
  clinicalQuestion: mammographyClinicalQuestionSchema,
  status: mammographyCaseStatusSchema,
  assessment: mammographyDraftAssessmentSchema.nullable(),
  modelId: z.string().min(1).max(128).nullable(),
  latencyMs: z.number().int().min(0).nullable(),
  safetyFlags: z.array(mammographySafetyFlagSchema),
});

export const createMammographyCaseRequestSchema = z.object({
  exam: mammographyExamSchema,
  clinicalQuestion: mammographyClinicalQuestionSchema,
});

export type MammographyExam = z.infer<typeof mammographyExamSchema>;
export type MammographyClinicalQuestion = z.infer<typeof mammographyClinicalQuestionSchema>;
export type MammographyDraftAssessment = z.infer<typeof mammographyDraftAssessmentSchema>;
export type MammographySafetyFlag = z.infer<typeof mammographySafetyFlagSchema>;
export type MammographySecondOpinionCaseSnapshot = z.infer<typeof mammographySecondOpinionCaseSnapshotSchema>;
export type CreateMammographyCaseRequest = z.infer<typeof createMammographyCaseRequestSchema>;