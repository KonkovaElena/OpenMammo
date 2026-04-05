export interface StructuredLogEntry {
  event: string;
  [key: string]: unknown;
}

export interface StructuredLogger {
  info(entry: StructuredLogEntry): void;
  error(entry: StructuredLogEntry): void;
}

export function createStructuredLogger(): StructuredLogger {
  return {
    info(entry) {
      writeStructuredLog("info", entry, (line) => {
        process.stdout.write(line);
      });
    },
    error(entry) {
      writeStructuredLog("error", entry, (line) => {
        process.stderr.write(line);
      });
    },
  };
}

function writeStructuredLog(
  level: "info" | "error",
  entry: StructuredLogEntry,
  write: (line: string) => void,
): void {
  write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      ...entry,
    })}\n`,
  );
}