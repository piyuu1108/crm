import crypto from "crypto";

export interface LogEventParams {
  type: "LOGIN_SUCCESS" | "LOGIN_FAILED";
  userId: string;
  role: string;
  ip: string | null;
  ua: string | null;
  ts?: number;
}

/**
 * Standard compatibility shim for legacy/login logging events.
 * Transforms and records events using our standard compact JSON schema.
 */
export function logEvent(params: LogEventParams) {
  const isSuccess = params.type === "LOGIN_SUCCESS";
  const cleanLog = {
    ts: new Date(params.ts || Date.now()).toISOString(),
    lvl: isSuccess ? "info" : "warn",
    tid: crypto.randomUUID(),
    env: process.env.NODE_ENV === "production" ? "prod" : "dev",
    evt: {
      act: isSuccess ? "auth.login" : "auth.login_failed",
      cat: "auth",
      s: isSuccess ? 1 : 0,
      dur: 0,
    },
    usr: {
      uid: params.userId,
      rl: params.role,
    },
    req: {
      m: "POST",
      p: "/api/auth/login",
      code: isSuccess ? 200 : 401,
      ip: params.ip || "127.0.0.1",
    },
    biz: {
      sum: isSuccess ? "User logged in successfully" : "User login attempt failed",
      ua: params.ua || undefined,
    },
  };

  // Internal output targeting console.log (Axiom/Vercel standard)
  console.log(JSON.stringify(cleanLog));
}
