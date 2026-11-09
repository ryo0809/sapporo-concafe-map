import "server-only";
import { AccessError, apiError } from "@/infrastructure/admin/http-session";
import { CredentialError } from "@/domain/members/credentials";

export function memberApiError(error:unknown) {
  return apiError(error instanceof CredentialError ? new AccessError(400,error.message) : error);
}
