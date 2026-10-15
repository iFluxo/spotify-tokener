import { logger } from "./logger.ts";
import { generateTotp, spotifyTotpSecrets } from "./totp.ts";

const SPOTIFY_URL = "https://open.spotify.com";
const SPOTIFY_TOKEN_PATH = "/api/token";
const SPOTIFY_SERVER_TIME_PATH = "/api/server-time";

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

export interface TokenRequest {
  readonly cookies?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

interface TokenResponse {
  readonly accessToken?: unknown;
  readonly isAnonymous?: unknown;
}

async function fetchServerTime(signal?: AbortSignal): Promise<number | undefined> {
  try {
    const response = await fetch(`${SPOTIFY_URL}${SPOTIFY_SERVER_TIME_PATH}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal,
    });
    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as { serverTime?: unknown };
    const serverTime = Number(data.serverTime);
    return Number.isFinite(serverTime) && serverTime > 0 ? serverTime : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetches the raw `/api/token` payload from Spotify.
 *
 * Cookies (for example `sp_dc`) are relayed untouched, which lets Spotify
 * return an account token instead of an anonymous one. Every known TOTP
 * version is attempted so the service keeps working while Spotify rotates
 * its secrets.
 */
export async function getAccessTokenPayload({ cookies, signal }: TokenRequest): Promise<string> {
  const serverTime = await fetchServerTime(signal);

  const headers = new Headers({ "User-Agent": USER_AGENT, Accept: "application/json" });
  if (cookies) {
    headers.set("Cookie", cookies);
  }

  let lastError = "no TOTP secret configured";

  for (const { version, key } of spotifyTotpSecrets()) {
    const params = new URLSearchParams({
      reason: "init",
      productType: "web_player",
      totp: generateTotp(key, Date.now()),
      totpServer: serverTime ? generateTotp(key, serverTime * 1000) : "unavailable",
      totpVer: String(version),
    });

    try {
      const response = await fetch(`${SPOTIFY_URL}${SPOTIFY_TOKEN_PATH}?${params.toString()}`, {
        headers,
        signal,
      });
      const body = await response.text();

      if (response.ok) {
        const parsed = JSON.parse(body) as TokenResponse;
        if (typeof parsed.accessToken === "string" && parsed.accessToken.length > 0) {
          logger.debug("Got access token payload", {
            totpVer: version,
            anonymous: parsed.isAnonymous === true,
          });
          return body;
        }

        lastError = `unexpected response body (totpVer ${version})`;
        continue;
      }

      lastError = `spotify responded with ${response.status} (totpVer ${version})`;
      logger.debug("Spotify rejected token request", { status: response.status, totpVer: version });
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      lastError = error instanceof Error ? error.message : String(error);
      logger.debug("Token request failed", { totpVer: version, error: lastError });
    }
  }

  throw new Error(lastError);
}
