import { isLogLevel, type LogLevel } from "./logger.ts";

export interface Config {
  readonly hostname: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly requestTimeoutMs: number;
}

const DEFAULT_ADDR = "0.0.0.0:8080";
const DEFAULT_LOG_LEVEL: LogLevel = "INFO";
const DEFAULT_TIMEOUT_MS = 30_000;

export function parseAddr(addr: string): { hostname: string; port: number } {
  const trimmed = addr.trim();
  const separator = trimmed.lastIndexOf(":");

  let hostname: string;
  let rawPort: string;

  if (separator === -1) {
    hostname = "0.0.0.0";
    rawPort = trimmed;
  } else {
    hostname = trimmed.slice(0, separator) || "0.0.0.0";
    rawPort = trimmed.slice(separator + 1);
  }

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid address "${addr}": expected a host:port pair`);
  }

  return { hostname, port };
}

export function loadConfig(env: Record<string, string | undefined> = Bun.env): Config {
  const addr = env.SPOTIFY_TOKENER_ADDR?.trim() || DEFAULT_ADDR;
  const { hostname, port } = parseAddr(addr);

  let logLevel: LogLevel = DEFAULT_LOG_LEVEL;
  const rawLogLevel = env.SPOTIFY_TOKENER_LOG_LEVEL?.trim();
  if (rawLogLevel) {
    const normalized = rawLogLevel.toUpperCase();
    if (!isLogLevel(normalized)) {
      throw new Error(`Invalid log level "${rawLogLevel}": expected DEBUG, INFO, WARN or ERROR`);
    }
    logLevel = normalized;
  }

  let requestTimeoutMs = DEFAULT_TIMEOUT_MS;
  const rawTimeout = env.SPOTIFY_TOKENER_TIMEOUT?.trim();
  if (rawTimeout) {
    const parsed = Number(rawTimeout);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid timeout "${rawTimeout}": expected a positive number of milliseconds`);
    }
    requestTimeoutMs = parsed;
  }

  return { hostname, port, logLevel, requestTimeoutMs };
}
