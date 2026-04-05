import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { MammographySecondOpinionCase } from "../../domain/mammography/MammographySecondOpinionCase";
import {
  mammographySecondOpinionCaseSnapshotSchema,
  type MammographySecondOpinionCaseSnapshot,
} from "../../domain/mammography/contracts";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

export class FileBasedMammographySecondOpinionCaseRepository
  implements IMammographySecondOpinionCaseRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storePath: string,
  ) {}

  async save(caseAggregate: MammographySecondOpinionCase): Promise<void> {
    return this.enqueueWrite(async () => {
      const snapshots = await this.readSnapshots();
      const nextSnapshot = caseAggregate.toSnapshot();
      const existingIndex = snapshots.findIndex((snapshot) => snapshot.caseId === nextSnapshot.caseId);

      if (existingIndex >= 0) {
        snapshots[existingIndex] = nextSnapshot;
      } else {
        snapshots.push(nextSnapshot);
      }

      await this.writeSnapshots(snapshots);
    });
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
    const tempPath = `${this.storePath}.tmp`;

    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");
    await rename(tempPath, this.storePath);
  }

  private async enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const nextWrite = this.writeQueue.then(operation, operation);

    this.writeQueue = nextWrite.catch(() => undefined);
    await nextWrite;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}