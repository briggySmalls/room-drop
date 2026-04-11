import { env } from "@/lib/env";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface ResendResponse {
  id?: string;
  message?: string;
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ id: string | null }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  const data: ResendResponse = await res.json();

  if (!res.ok) {
    console.error("Resend API error:", data);
    return { id: null };
  }

  return { id: data.id ?? null };
}
