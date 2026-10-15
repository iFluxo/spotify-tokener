export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let minLevel: LogLevel = "INFO";

export function isLogLevel(value: string): value is LogLevel {
  return Object.hasOwn(LEVEL_ORDER, value);
}

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export type LogFields = Record<string, unknown>;

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
    return;
  }

  const line =
    fields && Object.keys(fields).length > 0
      ? `${new Date().toISOString()} ${level.padEnd(5)} ${message} ${JSON.stringify(fields)}`
      : `${new Date().toISOString()} ${level.padEnd(5)} ${message}`;

  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields): void => emit("DEBUG", message, fields),
  info: (message: string, fields?: LogFields): void => emit("INFO", message, fields),
  warn: (message: string, fields?: LogFields): void => emit("WARN", message, fields),
  error: (message: string, fields?: LogFields): void => emit("ERROR", message, fields),
};
