import type { Config } from "./config.ts";
import { logger } from "./logger.ts";
import { getAccessTokenPayload } from "./spotify.ts";

const TOKEN_PATH = "/api/token";

function countCookies(cookieHeader: string | undefined): number {
  if (!cookieHeader) {
    return 0;
  }

  return cookieHeader.split(";").filter((part) => part.trim().length > 0).length;
}

async function handleToken(request: Request, config: Config): Promise<Response> {
  const cookies = request.headers.get("cookie") ?? undefined;

  const timeout = AbortSignal.timeout(config.requestTimeoutMs);
  const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;

  logger.debug("Getting access token payload", { cookieCount: countCookies(cookies) });

  try {
    const body = await getAccessTokenPayload({ cookies, signal });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    if (timeout.aborted) {
      logger.error("Timed out getting access token payload", { timeoutMs: config.requestTimeoutMs });
    } else if (request.signal?.aborted) {
      logger.debug("Client disconnected while getting access token payload");
    } else {
      logger.error("Failed to get access token payload", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return new Response("Failed to get access token payload", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

export function createServer(config: Config): Bun.Server<undefined> {
  return Bun.serve({
    hostname: config.hostname,
    port: config.port,
    async fetch(request: Request): Promise<Response> {
      const { pathname } = new URL(request.url);

      if (pathname !== TOKEN_PATH) {
        return new Response("Not Found", { status: 404 });
      }

      if (request.method !== "GET" && request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "GET, POST" },
        });
      }

      return handleToken(request, config);
    },
  });
}
