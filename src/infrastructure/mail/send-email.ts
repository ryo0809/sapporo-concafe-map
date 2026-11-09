import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type EmailBinding = { send(message: { from: string; to: string; subject: string; text: string }): Promise<unknown> };
export class MailDeliveryError extends Error {
  constructor(public readonly reason: string) { super("メールを送信できませんでした"); }
}

export async function sendEmail(input: { to: string; subject: string; text: string }) {
  const { env } = await getCloudflareContext({ async: true });
  const config = env as CloudflareEnv & { EMAIL?: EmailBinding; MAIL_FROM?: string; MAIL_TEST_MODE?: string; APP_ENV?: string };
  if ((config.APP_ENV === "development" && config.MAIL_TEST_MODE === "mock") || (process.env.NODE_ENV === "development" && process.env.MAIL_TEST_MODE === "mock")) return;
  if (!config.EMAIL || !config.MAIL_FROM) throw new MailDeliveryError("NOT_CONFIGURED");
  try {
    await config.EMAIL.send({ from: config.MAIL_FROM, to: input.to, subject: input.subject, text: input.text });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    throw new MailDeliveryError(typeof code === "string" ? code : "SEND_FAILED");
  }
}
