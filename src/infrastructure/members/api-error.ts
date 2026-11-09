import "server-only";
import { AccessError, apiError } from "@/infrastructure/admin/http-session";
import { CredentialError } from "@/domain/members/credentials";
import { MailDeliveryError } from "@/infrastructure/mail/send-email";

export function memberApiError(error:unknown) {
  if (error instanceof MailDeliveryError) {
    console.error("Member email delivery failed:", error.reason);
    return Response.json({error:"確認コードのメールを送信できませんでした。時間をおいて再度お試しください。"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
  return apiError(error instanceof CredentialError ? new AccessError(400,error.message) : error);
}
