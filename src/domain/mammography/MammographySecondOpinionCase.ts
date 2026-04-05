import { randomUUID } from "node:crypto";
import type {
  MammographyCaseLifecycleEvent,
  MammographyClinicalQuestion,
  MammographyDraftAssessment,
  MammographyExam,
  MammographyExamQualitySummary,
  MammographySecondOpinionCaseSnapshot,
  MammographySafetyFlag,
} from "./contracts";

export type MammographyCaseStatus = "Submitted" | "AwaitingReview";

export class MammographySecondOpinionCase {
  private readonly _caseId: string;
  private readonly _exam: MammographyExam;
  private readonly _clinicalQuestion: MammographyClinicalQuestion;
  private _status: MammographyCaseStatus;
  private _assessment: MammographyDraftAssessment | null;
  private _modelId: string | null;
  private _latencyMs: number | null;
  private _qc: MammographyExamQualitySummary | null;
  private _safetyFlags: MammographySafetyFlag[];
  private _events: MammographyCaseLifecycleEvent[];

  private constructor(snapshot: MammographySecondOpinionCaseSnapshot) {
    this._caseId = snapshot.caseId;
    this._status = snapshot.status;
    this._assessment = snapshot.assessment;
    this._modelId = snapshot.modelId;
    this._latencyMs = snapshot.latencyMs;
    this._qc = snapshot.qc;
    this._safetyFlags = snapshot.safetyFlags;
    this._events = snapshot.events;
    this._exam = snapshot.exam;
    this._clinicalQuestion = snapshot.clinicalQuestion;
  }

  static submit(
    exam: MammographyExam,
    clinicalQuestion: MammographyClinicalQuestion,
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
      safetyFlags: [],
      events: [createCaseSubmittedEvent(caseId, exam, clinicalQuestion)],
    });
  }

  static rehydrate(snapshot: MammographySecondOpinionCaseSnapshot): MammographySecondOpinionCase {
    return new MammographySecondOpinionCase(snapshot);
  }

  completeDraft(assessment: MammographyDraftAssessment, modelId: string, latencyMs: number): void {
    if (this._status !== "Submitted") {
      throw new Error(`Cannot complete draft in state '${this._status}'.`);
    }

    this._assessment = assessment;
    this._modelId = modelId;
    this._latencyMs = latencyMs;
    this._status = "AwaitingReview";
    this._events = [
      ...this._events,
      createDraftGeneratedEvent(this._caseId, assessment, modelId, latencyMs),
    ];
  }

  applyExamQuality(summary: MammographyExamQualitySummary): void {
    this._qc = summary;
    this._events = [
      ...this._events,
      createExamQcEvaluatedEvent(this._caseId, summary),
    ];
  }

  applySafetyFlags(flags: readonly MammographySafetyFlag[]): void {
    this._safetyFlags = [...this._safetyFlags, ...flags];
    this._events = [
      ...this._events,
      createSafetyFlagsAppliedEvent(this._caseId, flags),
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
      safetyFlags: this._safetyFlags,
      events: this._events,
    };
  }
}

function createCaseSubmittedEvent(
  caseId: string,
  exam: MammographyExam,
  clinicalQuestion: MammographyClinicalQuestion,
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
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
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
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
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    type: "mammography.exam-qc-evaluated.v1",
    payload: summary,
  };
}

function createSafetyFlagsAppliedEvent(
  caseId: string,
  flags: readonly MammographySafetyFlag[],
): MammographyCaseLifecycleEvent {
  return {
    eventId: randomUUID(),
    caseId,
    occurredAt: new Date().toISOString(),
    type: "mammography.safety-flags-applied.v1",
    payload: {
      flagCount: flags.length,
      hasBlockingFlags: flags.some((flag) => flag.blocksReview),
      flags: [...flags],
    },
  };
}