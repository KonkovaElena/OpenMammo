import { randomUUID } from "node:crypto";
import type {
  MammographyClinicalQuestion,
  MammographyDraftAssessment,
  MammographyExam,
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
  private _safetyFlags: MammographySafetyFlag[];

  private constructor(snapshot: MammographySecondOpinionCaseSnapshot) {
    this._caseId = snapshot.caseId;
    this._status = snapshot.status;
    this._assessment = snapshot.assessment;
    this._modelId = snapshot.modelId;
    this._latencyMs = snapshot.latencyMs;
    this._safetyFlags = snapshot.safetyFlags;
    this._exam = snapshot.exam;
    this._clinicalQuestion = snapshot.clinicalQuestion;
  }

  static submit(
    exam: MammographyExam,
    clinicalQuestion: MammographyClinicalQuestion,
  ): MammographySecondOpinionCase {
    return new MammographySecondOpinionCase({
      caseId: randomUUID(),
      exam,
      clinicalQuestion,
      status: "Submitted",
      assessment: null,
      modelId: null,
      latencyMs: null,
      safetyFlags: [],
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
  }

  applySafetyFlags(flags: readonly MammographySafetyFlag[]): void {
    this._safetyFlags = [...this._safetyFlags, ...flags];
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

  get safetyFlags(): readonly MammographySafetyFlag[] {
    return this._safetyFlags;
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
      safetyFlags: this._safetyFlags,
    };
  }
}