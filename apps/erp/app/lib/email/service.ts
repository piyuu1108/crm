import { createPasswordSetupToken, type UserType } from "@/app/lib/password-setup-token";

export interface PasswordEmailPayload {
  userId: number;
  userCode: string;
  fullName: string;
  email: string;
  userType: UserType;
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
}

interface EmailProvider {
  sendPasswordEmail(payload: PasswordEmailPayload & { setupUrl: string }): Promise<EmailSendResult>;
}

class BrevoEmailProvider implements EmailProvider {
  async sendPasswordEmail(
    payload: PasswordEmailPayload & { setupUrl: string }
  ): Promise<EmailSendResult> {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: "no-reply@pipy.site",
            name: "ERP System",
          },
          to: [{ email: payload.email }],
          subject: "Set your password",
          htmlContent: `
            <p>Hello ${payload.fullName},</p>
            <p>Your account has been created.</p>
            <p>Your ${payload.userType === "student" ? "Student ID" : "Faculty Code"} is: <strong>${payload.userCode}</strong></p>
            <p>Please click below to set your password:</p>
            <p>
              <a href="${payload.setupUrl}">Set Password</a>
            </p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not request this, ignore this email.</p>
          `,
          textContent: `Hello ${payload.fullName}, your ${payload.userType === "student" ? "Student ID" : "Faculty Code"} is ${payload.userCode}. Set your password: ${payload.setupUrl}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

const provider: EmailProvider = new BrevoEmailProvider();

export async function sendPasswordEmail(
  payload: PasswordEmailPayload
): Promise<EmailSendResult> {
  const { rawToken } = await createPasswordSetupToken(payload.userId, payload.userType);

  // Base URL handling (correct for dev + prod)
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set in production");
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");

  const setupUrl = `${normalizedBase}/set-password?token=${encodeURIComponent(
    rawToken
  )}`;

  return provider.sendPasswordEmail({
    ...payload,
    setupUrl,
  });
}
