import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { MammographySecondOpinionCase } from "../../domain/mammography/MammographySecondOpinionCase";
import {
  mammographySecondOpinionCaseSnapshotSchema,
  type MammographySecondOpinionCaseSnapshot,
} from "../../domain/mammography/contracts";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";

const CREATE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS mammography_cases (
    case_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    snapshot_json TEXT NOT NULL
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_mammography_cases_created_at
    ON mammography_cases(created_at, case_id);
`;

export class SqliteMammographySecondOpinionCaseRepository
  implements IMammographySecondOpinionCaseRepository {
  private readonly database: DatabaseSync;

  constructor(private readonly storePath: string) {
    mkdirSync(dirname(this.storePath), { recursive: true });
    this.database = new DatabaseSync(this.storePath, {
      timeout: 5_000,
      defensive: true,
      allowExtension: false,
      enableForeignKeyConstraints: true,
    });
    this.database.exec(CREATE_SCHEMA_SQL);
  }

  async save(caseAggregate: MammographySecondOpinionCase): Promise<void> {
    const snapshot = caseAggregate.toSnapshot();
    const createdAt = snapshot.events[0]?.occurredAt ?? new Date().toISOString();
    const updatedAt = new Date().toISOString();

    this.database.prepare(`
      INSERT INTO mammography_cases (case_id, created_at, updated_at, snapshot_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(case_id) DO UPDATE SET
        updated_at = excluded.updated_at,
        snapshot_json = excluded.snapshot_json
    `).run(
      snapshot.caseId,
      createdAt,
      updatedAt,
      JSON.stringify(snapshot),
    );
  }

  async getById(caseId: string): Promise<MammographySecondOpinionCase | null> {
    const row = this.database.prepare(`
      SELECT snapshot_json
      FROM mammography_cases
      WHERE case_id = ?
    `).get(caseId) as { snapshot_json: string } | undefined;

    if (!row) {
      return null;
    }

    return MammographySecondOpinionCase.rehydrate(parseSnapshot(row.snapshot_json));
  }

  async listAll(): Promise<MammographySecondOpinionCase[]> {
    const rows = this.database.prepare(`
      SELECT snapshot_json
      FROM mammography_cases
      ORDER BY created_at ASC, case_id ASC
    `).all() as Array<{ snapshot_json: string }>;

    return rows.map((row) => MammographySecondOpinionCase.rehydrate(parseSnapshot(row.snapshot_json)));
  }

  close(): void {
    if (this.database.isOpen) {
      this.database.close();
    }
  }
}

function parseSnapshot(snapshotJson: string): MammographySecondOpinionCaseSnapshot {
  return mammographySecondOpinionCaseSnapshotSchema.parse(JSON.parse(snapshotJson) as unknown);
}