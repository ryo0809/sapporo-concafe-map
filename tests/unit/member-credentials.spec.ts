import {expect,test} from "@playwright/test";
import {normalizeMemberEmail,validateNickname,validateMemberPassword,validateSixDigitCode,validateRegistration,validateNewPassword} from "../../src/domain/members/credentials";

test("会員登録のニックネーム・メール・パスワードを検証する",()=>{
  const valid={nickname:" 札幌さん ",email:" USER@Example.COM ",password:"long passphrase 2026",passwordConfirmation:"long passphrase 2026"};
  expect(validateRegistration(valid)).toEqual({nickname:"札幌さん",email:"user@example.com",password:valid.password});
  expect(validateRegistration({...valid,password:"abcdefgh",passwordConfirmation:"abcdefgh"}).password).toBe("abcdefgh");
  expect(normalizeMemberEmail(valid.email)).toBe("user@example.com");
  expect(validateNickname("  あい  ")).toBe("あい");
  for(const input of [null,{}, {...valid,nickname:"a"},{...valid,nickname:"x".repeat(31)},{...valid,nickname:"改行\n不可"},{...valid,email:"invalid"},{...valid,password:"abcdefg",passwordConfirmation:"abcdefg"},{...valid,password:"x".repeat(129),passwordConfirmation:"x".repeat(129)},{...valid,passwordConfirmation:"different"}]){
    expect(()=>validateRegistration(input)).toThrow();
  }
});

test("再設定コードと新しいパスワードを検証する",()=>{
  expect(validateSixDigitCode("001234")).toBe("001234");
  for(const code of ["12345","1234567","abcdef","１２３４５６",123456])expect(()=>validateSixDigitCode(code)).toThrow();
  expect(validateMemberPassword("long passphrase 2026")).toBe("long passphrase 2026");
  expect(validateNewPassword({password:"abcdefgh",passwordConfirmation:"abcdefgh"})).toBe("abcdefgh");
  expect(()=>validateNewPassword({password:"abcdefg",passwordConfirmation:"abcdefg"})).toThrow();
  expect(validateNewPassword({password:"new long password 2026",passwordConfirmation:"new long password 2026"})).toBe("new long password 2026");
  expect(()=>validateNewPassword({password:"new long password 2026",passwordConfirmation:"mismatch"})).toThrow();
});
