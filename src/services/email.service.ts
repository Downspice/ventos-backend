import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.resend.apiKey ? new Resend(env.resend.apiKey) : null;

export async function sendWelcomeEmail(to: string, name?: string): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping welcome email");
    return;
  }

  await resend.emails.send({
    from: env.resend.from,
    to,
    subject: "Welcome to Ventos",
    html: `<p>Hi ${name ?? "there"},</p><p>Welcome to Ventos.</p>`,
  });
}
