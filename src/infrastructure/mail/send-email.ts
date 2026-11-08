import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function sendEmail(input: { to: string; subject: string; text: string; key: string }) {
  const { env } = await getCloudflareContext({ async: true });
  const config = env as CloudflareEnv & { RESEND_API_KEY?: string; MAIL_FROM?: string; MAIL_TEST_MODE?: string; APP_ENV?: string };
  if (config.APP_ENV === "development" && config.MAIL_TEST_MODE === "mock") return;
  if (!config.RESEND_API_KEY || !config.MAIL_FROM) throw new Error("メール送信の設定がありません");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": input.key },
    body: JSON.stringify({ from: config.MAIL_FROM, to: [input.to], subject: input.subject, text: input.text }),
  });
  if (!response.ok) throw new Error(`メール送信に失敗しました (${response.status})`);
}
