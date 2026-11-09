export class CredentialError extends Error {}

export function normalizeMemberEmail(value: unknown): string {
  if (typeof value !== "string") throw new CredentialError("メールアドレスを確認してください。");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CredentialError("メールアドレスを確認してください。");
  return email;
}

export function validateNickname(value: unknown): string {
  if (typeof value !== "string") throw new CredentialError("ニックネームを入力してください。");
  const nickname = value.trim();
  if (Array.from(nickname).length < 2 || Array.from(nickname).length > 30 || /[\u0000-\u001f\u007f]/.test(nickname)) {
    throw new CredentialError("ニックネームは2～30文字で入力してください。");
  }
  return nickname;
}

export function validateMemberPassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128 || new TextEncoder().encode(value).length > 256 || /[\u0000-\u001f\u007f]/.test(value) || !value.trim()) {
    throw new CredentialError("パスワードは12～128文字で入力してください。");
  }
  return value;
}

export function validateSixDigitCode(value: unknown): string {
  if (typeof value !== "string" || !/^\d{6}$/.test(value)) throw new CredentialError("6桁の確認コードを入力してください。");
  return value;
}

export function validateRegistration(value: unknown) {
  if (!value || typeof value !== "object") throw new CredentialError("入力内容を確認してください。");
  const input = value as Record<string,unknown>;
  const nickname = validateNickname(input.nickname);
  const email = normalizeMemberEmail(input.email);
  const password = validateMemberPassword(input.password);
  if (input.passwordConfirmation !== password) throw new CredentialError("パスワードが一致しません。");
  return { nickname, email, password };
}

export function validateNewPassword(value: unknown) {
  if (!value || typeof value !== "object") throw new CredentialError("入力内容を確認してください。");
  const input = value as Record<string,unknown>;
  const password = validateMemberPassword(input.password);
  if (input.passwordConfirmation !== password) throw new CredentialError("パスワードが一致しません。");
  return password;
}
