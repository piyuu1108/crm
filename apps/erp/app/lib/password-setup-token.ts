import crypto from "node:crypto";
import { redis } from "@/app/lib/redis";

const PASSWORD_SETUP_TTL_SECONDS = 60 * 60 * 24;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function getTokenKey(hashedToken: string): string {
  return `password:setup:${hashedToken}`;
}

export type UserType = "student" | "faculty";

export async function createPasswordSetupToken(userId: number, userType: UserType): Promise<{
  rawToken: string;
  expiresInSeconds: number;
}> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  const key = getTokenKey(hashedToken);

  // Store as "type:id"
  await redis.set(key, `${userType}:${userId}`, {
    ex: PASSWORD_SETUP_TTL_SECONDS,
  });

  return {
    rawToken,
    expiresInSeconds: PASSWORD_SETUP_TTL_SECONDS,
  };
}

export async function consumePasswordSetupToken(rawToken: string): Promise<{
  userId: number | null;
  userType: UserType | null;
  key: string;
}> {
  const hashedToken = hashToken(rawToken);
  const key = getTokenKey(hashedToken);

  const value = await redis.get<string>(key);
  if (!value) {
    return { userId: null, userType: null, key };
  }

  const [userType, userIdRaw] = value.split(":");
  return { 
    userId: Number(userIdRaw), 
    userType: userType as UserType,
    key 
  };
}
