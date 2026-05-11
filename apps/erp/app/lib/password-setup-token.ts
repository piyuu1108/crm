import crypto from "node:crypto";
import { redis } from "@/app/lib/redis";

const PASSWORD_SETUP_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function getTokenKey(hashedToken: string): string {
  return `password:setup:${hashedToken}`;
}

export type UserType = "student" | "faculty";

export async function createPasswordSetupToken(
  userId: number,
  userType: UserType
): Promise<{ rawToken: string; expiresInSeconds: number }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  const key = getTokenKey(hashedToken);

  // Value format: "userType:userId"
  await redis.set(key, `${userType}:${userId}`, {
    ex: PASSWORD_SETUP_TTL_SECONDS,
  });

  console.log(`[password-setup-token] Created token key=${key.slice(0, 30)}... userId=${userId} userType=${userType} ttl=${PASSWORD_SETUP_TTL_SECONDS}s`);

  return {
    rawToken,
    expiresInSeconds: PASSWORD_SETUP_TTL_SECONDS,
  };
}

export async function consumePasswordSetupToken(rawToken: string): Promise<{
  userId: number | null;
  userType: UserType | null;
  key: string;
  reason?: "not_found" | "malformed";
}> {
  if (!rawToken || rawToken.length < 10) {
    console.warn("[password-setup-token] consumePasswordSetupToken called with empty/short token");
    return { userId: null, userType: null, key: "", reason: "malformed" };
  }

  const hashedToken = hashToken(rawToken);
  const key = getTokenKey(hashedToken);

  console.log(`[password-setup-token] Looking up key=${key.slice(0, 30)}... (rawToken length=${rawToken.length})`);

  const value = await redis.get<string>(key);

  if (!value) {
    console.warn(`[password-setup-token] Key not found or expired: ${key.slice(0, 30)}...`);
    return { userId: null, userType: null, key, reason: "not_found" };
  }

  const parts = value.split(":");
  if (parts.length !== 2) {
    console.error(`[password-setup-token] Malformed Redis value: "${value}" for key=${key.slice(0, 30)}...`);
    return { userId: null, userType: null, key, reason: "malformed" };
  }

  const [userType, userIdRaw] = parts;
  const userId = Number(userIdRaw);

  if (!["student", "faculty"].includes(userType) || isNaN(userId) || userId <= 0) {
    console.error(`[password-setup-token] Invalid stored value — userType="${userType}" userId=${userId}`);
    return { userId: null, userType: null, key, reason: "malformed" };
  }

  console.log(`[password-setup-token] Token valid — userId=${userId} userType=${userType}`);
  return { userId, userType: userType as UserType, key };
}
