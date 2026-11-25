export type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  const record = { time: new Date().toISOString(), level, message, ...fields };
  process.stdout.write(`${JSON.stringify(record)}\n`);
}
