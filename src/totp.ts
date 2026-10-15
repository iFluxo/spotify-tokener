import { createHmac } from "node:crypto";

/**
 * Spotify's web player ships a small list of obfuscated TOTP secrets.
 * It always uses the first (newest) entry to sign requests, while the
 * server accepts codes generated from any entry that is still valid.
 *
 * The secrets below are copied verbatim from
 * `https://open.spotifycdn.com/cdn/build/web-player/web-player.*.js`
 * inside the `[{secret:...,version:...}]` array.
 */
const OBFUSCATED_SECRETS: readonly ObfuscatedSecret[] = [
  { secret: ',7/*F("rLJ2oxaKL^f+E1xvP@N', version: 61 },
  { secret: 'OmE{ZA.J^":0FG\\Uz?[@WW', version: 60 },
  { secret: "{iOFn;4}<1PFYKPV?5{%u14]M>/V0hDH", version: 59 },
];

interface ObfuscatedSecret {
  readonly secret: string;
  readonly version: number;
}

export interface TotpSecret {
  readonly version: number;
  readonly key: Buffer;
}

const PERIOD_SECONDS = 30;
const DIGITS = 6;
const MODULO = 10 ** DIGITS;

/**
 * Reverses Spotify's per-character XOR obfuscation. The original player code is:
 *
 *   secret.split("").map((ch, i) => ch.charCodeAt(0) ^ (i % 33 + 9))
 *   Buffer.from(bytes.join(""), "utf8").toString("hex")
 *   Secret.fromHex(hex)
 */
function deobfuscateSecret(secret: string): Buffer {
  const shifted = new Array<number>(secret.length);
  for (let index = 0; index < secret.length; index++) {
    shifted[index] = secret.charCodeAt(index) ^ ((index % 33) + 9);
  }

  const hex = Buffer.from(shifted.join(""), "utf8").toString("hex");
  return Buffer.from(hex, "hex");
}

const keyCache = new Map<number, Buffer>();

function keyFor(entry: ObfuscatedSecret): Buffer {
  const cached = keyCache.get(entry.version);
  if (cached) {
    return cached;
  }

  const key = deobfuscateSecret(entry.secret);
  keyCache.set(entry.version, key);
  return key;
}

/** Returns every known secret, newest version first. */
export function spotifyTotpSecrets(): readonly TotpSecret[] {
  return OBFUSCATED_SECRETS.map((entry) => ({ version: entry.version, key: keyFor(entry) }));
}

/** RFC 4226 HMAC-based one-time password. */
export function hotp(key: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return (binary % MODULO).toString().padStart(DIGITS, "0");
}

/** RFC 6238 time-based one-time password using a 30 second period. */
export function generateTotp(key: Buffer, timestampMs: number): string {
  return hotp(key, Math.floor(timestampMs / 1000 / PERIOD_SECONDS));
}
