import { createPasswordSetupToken, type UserType } from "@/app/lib/password-setup-token";

export interface PasswordEmailPayload {
  userId: number;
  userCode: string;        // studentId for students, facultyCode for faculty
  fullName: string;
  email: string;
  userType: UserType;
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
}

// ─── HTML template builders (per user type) ──────────────────────────────────

function buildStudentHtml(payload: PasswordEmailPayload & { setupUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <h2 style="margin-bottom: 4px;">Welcome, ${payload.fullName}!</h2>
  <p style="color: #555; margin-top: 0;">Your student account has been created.</p>

  <table style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
    <tr>
      <td style="color: #555; font-size: 13px; padding: 4px 0;">Student ID</td>
      <td style="font-weight: 600; font-size: 15px; padding: 4px 0;">${payload.userCode}</td>
    </tr>
    <tr>
      <td style="color: #555; font-size: 13px; padding: 4px 0;">Email</td>
      <td style="font-weight: 600; font-size: 15px; padding: 4px 0;">${payload.email}</td>
    </tr>
  </table>

  <p>Please set your password using the button below. Use your Student ID or email to log in.</p>

  <p style="margin: 24px 0;">
    <a href="${payload.setupUrl}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Set Password
    </a>
  </p>

  <p style="color: #888; font-size: 13px;">This link expires in <strong>24 hours</strong>. If you did not expect this email, please ignore it.</p>
</body>
</html>
  `.trim();
}

function buildStudentText(payload: PasswordEmailPayload & { setupUrl: string }): string {
  return `Welcome ${payload.fullName}!\n\nYour student account has been created.\n\nStudent ID: ${payload.userCode}\nEmail: ${payload.email}\n\nSet your password here: ${payload.setupUrl}\n\nThis link expires in 24 hours.`;
}

function buildFacultyHtml(payload: PasswordEmailPayload & { setupUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <h2 style="margin-bottom: 4px;">Welcome, ${payload.fullName}!</h2>
  <p style="color: #555; margin-top: 0;">Your faculty account has been created.</p>

  <table style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
    <tr>
      <td style="color: #555; font-size: 13px; padding: 4px 0;">Faculty Code</td>
      <td style="font-weight: 600; font-size: 15px; padding: 4px 0;">${payload.userCode}</td>
    </tr>
    <tr>
      <td style="color: #555; font-size: 13px; padding: 4px 0;">Email</td>
      <td style="font-weight: 600; font-size: 15px; padding: 4px 0;">${payload.email}</td>
    </tr>
  </table>

  <p>Please set your password using the button below. Use your email address to log in.</p>

  <p style="margin: 24px 0;">
    <a href="${payload.setupUrl}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Set Password
    </a>
  </p>

  <p style="color: #888; font-size: 13px;">This link expires in <strong>24 hours</strong>. If you did not expect this email, please ignore it.</p>
</body>
</html>
  `.trim();
}

function buildFacultyText(payload: PasswordEmailPayload & { setupUrl: string }): string {
  return `Welcome ${payload.fullName}!\n\nYour faculty account has been created.\n\nFaculty Code: ${payload.userCode}\nEmail: ${payload.email}\n\nSet your password here: ${payload.setupUrl}\n\nThis link expires in 24 hours.`;
}

// ─── Email provider ───────────────────────────────────────────────────────────

interface EmailProvider {
  sendPasswordEmail(payload: PasswordEmailPayload & { setupUrl: string }): Promise<EmailSendResult>;
}

class BrevoEmailProvider implements EmailProvider {
  async sendPasswordEmail(
    payload: PasswordEmailPayload & { setupUrl: string }
  ): Promise<EmailSendResult> {
    try {
      const isStudent = payload.userType === "student";
      const subject = isStudent
        ? "Set your student account password"
        : "Set your faculty account password";
      const htmlContent = isStudent ? buildStudentHtml(payload) : buildFacultyHtml(payload);
      const textContent = isStudent ? buildStudentText(payload) : buildFacultyText(payload);

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
          to: [{ email: payload.email, name: payload.fullName }],
          subject,
          htmlContent,
          textContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[BrevoEmailProvider] API error:", data);
        return { success: false, error: data.message ?? "Brevo API error" };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[BrevoEmailProvider] Unexpected error:", err);
      return { success: false, error: err.message };
    }
  }
}

const provider: EmailProvider = new BrevoEmailProvider();

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendPasswordEmail(
  payload: PasswordEmailPayload
): Promise<EmailSendResult> {
  // Validate required fields to prevent sending emails with undefined values
  if (!payload.userId || !payload.userCode || !payload.fullName || !payload.email || !payload.userType) {
    const missing = ["userId", "userCode", "fullName", "email", "userType"]
      .filter((k) => !payload[k as keyof PasswordEmailPayload]);
    console.error("[sendPasswordEmail] Missing required fields:", missing, "payload:", payload);
    return { success: false, error: `Missing fields: ${missing.join(", ")}` };
  }

  const { rawToken } = await createPasswordSetupToken(payload.userId, payload.userType);

  console.log(`[sendPasswordEmail] Token created for userId=${payload.userId} userType=${payload.userType} email=${payload.email}`);

  // Base URL handling (correct for dev + prod)
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    return { success: false, error: "NEXT_PUBLIC_APP_URL is not set in production" };
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  // encodeURIComponent ensures the token survives query string parsing
  const setupUrl = `${normalizedBase}/set-password?token=${encodeURIComponent(rawToken)}`;

  return provider.sendPasswordEmail({ ...payload, setupUrl });
}
