import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { MammographySecondOpinionCase } from "../../domain/mammography/MammographySecondOpinionCase";
import {
  mammographySecondOpinionCaseSnapshotSchema,
  type MammographySecondOpinionCaseSnapshot,
} from "../../domain/mammography/contracts";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

export class FileBasedMammographySecondOpinionCaseRepository
  implements IMammographySecondOpinionCaseRepository {
  constructor(
    private readonly storePath: string,
  ) {}

  async save(caseAggregate: MammographySecondOpinionCase): Promise<void> {
    const snapshots = await this.readSnapshots();
    const nextSnapshot = caseAggregate.toSnapshot();
    const existingIndex = snapshots.findIndex((snapshot) => snapshot.caseId === nextSnapshot.caseId);

    if (existingIndex >= 0) {
      snapshots[existingIndex] = nextSnapshot;
    } else {
      snapshots.push(nextSnapshot);
    }

    await this.writeSnapshots(snapshots);
  }

  async getById(caseId: string): Promise<MammographySecondOpinionCase | null> {
    const snapshots = await this.readSnapshots();
    const snapshot = snapshots.find((candidate) => candidate.caseId === caseId);

    return snapshot ? MammographySecondOpinionCase.rehydrate(snapshot) : null;
  }

  private async readSnapshots(): Promise<MammographySecondOpinionCaseSnapshot[]> {
    try {
      const raw = await readFile(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return mammographySecondOpinionCaseSnapshotSchema.array().parse(parsed);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  private async writeSnapshots(snapshots: MammographySecondOpinionCaseSnapshot[]): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}