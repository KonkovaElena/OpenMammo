import { createHash, randomUUID } from "node:crypto";
import type {
  MammographyCaseDeliveryInput,
  MammographyCaseDeliverySummary,
  MammographyEventAuditContext,
  MammographyCaseLifecycleEvent,
  MammographyCaseReviewInput,
  MammographyCaseReviewSummary,
  MammographyClinicalQuestion,
  MammographyDraftAssessment,
  MammographyDraftGenerationSummary,
  MammographyExam,
  MammographyExamQualitySummary,
  MammographyReportIntegritySeal,
  MammographySecondOpinionCaseSnapshot,
  MammographySafetyFlag,
} from "./contracts";

export type MammographyCaseStatus = "Submitted" | "AwaitingReview" | "Finalized";

export class MammographySecondOpinionCase {
  private readonly _caseId: string;
  private readonly _exam: MammographyExam;
  private readonly _clinicalQuestion: MammographyClinicalQuestion;
  private _status: MammographyCaseStatus;
  private _assessment: MammographyDraftAssessment | null;
  private _modelId: string | null;
  private _latencyMs: number | null;
  private _qc: MammographyExamQualitySummary | null;
  private _generation: MammographyDraftGenerationSummary | null;
  private _review: MammographyCaseReviewSummary | null;
  private _delivery: MammographyCaseDeliverySummary | null;
  private _integritySeal: MammographyReportIntegritySeal | null;
  private _safetyFlags: MammographySafetyFlag[];
  private _events: MammographyCaseLifecycleEvent[];

  private constructor(snapshot: MammographySecondOpinionCaseSnapshot) {
    this._caseId = snapshot.caseId;
    this._status = snapshot.status;
    this._assessment = snapshot.assessment;
    this._modelId = snapshot.modelId;
    this._latencyMs = snapshot.latencyMs;
    this._qc = snapshot.qc;
    this._generation = snapshot.generation;
    this._review = snapshot.review;
    this._delivery = snapshot.delivery;
    this._integritySeal = snapshot.integritySeal;
    this._safetyFlags = snapshot.safetyFlags;
    this._events = snapshot.events;
    this._exam = snapshot.exam;
    this._clinicalQuestion = snapshot.clinicalQuestion;
  }

  static submit(
    exam: MammographyExam,
    clinicalQuestion: MammographyClinicalQuestion,
    auditContext?: MammographyEventAuditContext,
  ): MammographySecondOpinionCase {
    const caseId = randomUUID();

    return new MammographySecondOpinionCase({
      caseId,
      exam,
      clinicalQuestion,
      status: "Submitted",
      assessment: null,
      modelId: null,
      latencyMs: null,
      qc: null,
      generation: null,
      review: null,
      delivery: null,
      integritySeal: null,
      safetyFlags: [],
      events: [createCaseSubmittedEvent(caseId, exam, clinicalQuestion, auditContext)],
    });
  }

  static rehydrate(snapshot: MammographySecondOpinionCaseSnapshot): MammographySecondOpinionCase {
    return new MammographySecondOpinionCase(snapshot);
  }

  completeDraft(
    assessment: MammographyDraftAssessment,
    modelId: string,
    latencyMs: number,
    auditContext?: MammographyEventAuditContext,
  ): void {
    if (this._status !== "Submitted") {
      throw new Error(`Cannot complete draft in state '${this._status}'.`);
    }

    this._assessment = assessment;
    this._modelId = modelId;
    this._latencyMs = latencyMs;
    this._status = "AwaitingReview";
    this._events = [
      ...this._events,
      createDraftGeneratedEvent(this._caseId, assessment, modelId, latencyMs, auditContext),
    ];
  }

  applyExamQuality(summary: MammographyExamQualitySummary, auditContext?: MammographyEventAuditContext): void {
    this._qc = summary;
    this._events = [
      ...this._events,
      createExamQcEvaluatedEvent(this._caseId, summary, auditContext),
    ];
  }

  applySafetyFlags(flags: readonly MammographySafetyFlag[], auditContext?: MammographyEventAuditContext): void {
    this._safetyFlags = [...this._safetyFlags, ...flags];
    this._events = [
      ...this._events,
      createSafetyFlagsAppliedEvent(this._caseId, flags, auditContext),
    ];
  }

  completeDraftOrchestration(
    summary: MammographyDraftGenerationSummary,
    auditContext?: MammographyEventAuditContext,
  ): void {
    this._generation = summary;
    this._events = [
      ...this._events,
      createDraftOrchestrationCompletedEvent(this._caseId, summary, auditContext),
    ];
  }

  finalizeReview(input: MammographyCaseReviewInput, auditContext?: MammographyEventAuditContext): void {
    if (this._status !== "AwaitingReview") {
      throw new Error(`Cannot finalize review in state '${this._status}'.`);
    }

    const reviewSummary: MammographyCaseReviewSummary = {
      ...input,
      finalizedAt: new Date().toISOString(),
    };

    this._review = reviewSummary;
    this._status = "Finalized";
    this._events = [
      ...this._events,
      createCaseReviewFinalizedEvent(this._caseId, reviewSummary, auditContext),
    ];
  }

  recordDelivery(input: MammographyCaseDeliveryInput, auditContext?: MammographyEventAuditContext): void {
    if (this._status !== "Finalized" || !this._review) {
      throw new Error(`Cannot record delivery in state '${this._status}'.`);
    }

    if (this._delivery) {
      throw new Error(`Delivery already recorded for case '${this._caseId}'.`);
    }

    const deliverySummary: MammographyCaseDeliverySummary = {
      ...input,
      deliveredAt: new Date().toISOString(),
    };

    this._delivery = deliverySummary;
    this._events = [
      ...this._events,
      createCaseDeliveredEvent(this._caseId, deliverySummary, auditContext),
    ];
  }

  sealReport(reportBody: string, sealedBy: string, auditContext?: MammographyEventAuditContext): void {
    if (this._status !== "Finalized" || !this._review) {
      throw new Error(`Cannot seal report in state '${this._status}'.`);
    }

    if (this._integritySeal) {
      throw new Error(`Report integrity seal already exists for case '${this._caseId}'.`);
    }

    const reportHash = createHash("sha256").update(reportBody, "utf-8").digest("hex");
    const seal: MammographyReportIntegritySeal = {
      algorithm: "SHA-256",
      reportHash,
      sealedAt: new Date().toISOString(),
      sealedBy,
    };

    this._integritySeal = seal;
    this._events = [
      ...this._events,
      createReportIntegritySealedEvent(this._caseId, seal, auditContext),
    ];
  }

  get caseId(): string {
    return this._caseId;
  }

  get exam(): MammographyExam {
    return this._exam;
  }

  get clinicalQuestion(): MammographyClinicalQuestion {
    return this._clinicalQuestion;
  }

  get status(): MammographyCaseStatus {
    return this._status;
  }

  get assessment(): MammographyDraftAssessment | null {
    return this._assessment;
  }

  get qc(): MammographyExamQualitySummary | null {
    return this._qc;
  }

  get generation(): MammographyDraftGenerationSummary | null {
    return this._generation;
  }

  get review(): MammographyCaseReviewSummary | null {
    return this._review;
  }

  get delivery(): MammographyCaseDeliverySummary | null {
    return this._delivery;
  }

  get integritySeal(): MammographyReportIntegritySeal | null {
    return this._integritySeal;
  }

  get safetyFlags(): readonly MammographySafetyFlag[] {
    return this._safetyFlags;
  }

  get events(): readonly MammographyCaseLifecycleEvent[] {
    return this._events;
  }

  get hasBlockingFlags(): boolean {
    return this._safetyFlags.some((flag) => flag.blocksReview);
  }

  toSnapshot(): MammographySecondOpinionCaseSnapshot {
    return {
      caseId: this._caseId,
      exam: this._exam,
      clinicalQuestion: this._clinicalQuestion,
      status: this._status,
      assessment: this._assessment,
      modelId: this._modelId,
      latencyMs: this._latencyMs,
      qc: this._qc,
      generation: this._generation,
      review: this._review,
      delivery: this._delivery,
      integritySeal: this._integritySeal,
      safetyFlags: this._safetyFlags,
      events: this._events,
    };
  }
}

function createCaseSubmittedEvent(
  caseId: string,
  exam: MammographyExam,
  clinicalQuestion: MammographyClinicalQuestion,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.case-submitted.v1",
    payload: {
      modality: exam.modality,
      studyInstanceUid: exam.studyInstanceUid,
      standardViews: exam.standardViews,
      questionText: clinicalQuestion.questionText,
      urgency: clinicalQuestion.urgency,
    },
  };
}

function createDraftGeneratedEvent(
  caseId: string,
  assessment: MammographyDraftAssessment,
  modelId: string,
  latencyMs: number,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.draft-generated.v1",
    payload: {
      biradsCategory: assessment.biradsCategory,
      confidenceBand: assessment.confidenceBand,
      outputMode: assessment.outputMode,
      modelId,
      latencyMs,
    },
  };
}

function createExamQcEvaluatedEvent(
  caseId: string,
  summary: MammographyExamQualitySummary,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.exam-qc-evaluated.v1",
    payload: summary,
  };
}

function createDraftOrchestrationCompletedEvent(
  caseId: string,
  summary: MammographyDraftGenerationSummary,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.draft-orchestration-completed.v1",
    payload: summary,
  };
}

function createCaseReviewFinalizedEvent(
  caseId: string,
  reviewSummary: MammographyCaseReviewSummary,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.case-review-finalized.v1",
    payload: reviewSummary,
  };
}

function createCaseDeliveredEvent(
  caseId: string,
  deliverySummary: MammographyCaseDeliverySummary,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.case-delivered.v1",
    payload: deliverySummary,
  };
}

function createReportIntegritySealedEvent(
  caseId: string,
  seal: MammographyReportIntegritySeal,
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.report-integrity-sealed.v1",
    payload: seal,
  };
}

function createSafetyFlagsAppliedEvent(
  caseId: string,
  flags: readonly MammographySafetyFlag[],
  auditContext?: MammographyEventAuditContext,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    audit: auditContext,
    type: "mammography.safety-flags-applied.v1",
    payload: {
      flagCount: flags.length,
      hasBlockingFlags: flags.some((flag) => flag.blocksReview),
      flags: [...flags],
    },
  };
}