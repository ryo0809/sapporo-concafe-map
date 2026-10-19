import {expect,test} from "@playwright/test";
import {createAdministratorPasswordPolicy} from "../../src/infrastructure/admin/password-policy";
import {hashPassword} from "../../db/passwords.mjs";

test("repeated protected requests reuse only the password-policy verdict",()=>{
  let calls=0;
  const check=createAdministratorPasswordPolicy(()=>{calls++;return false;});
  for(let i=0;i<20;i++)check(i%2?"production":"staging","same-hash");
  expect(calls).toBe(1);
});

test("a changed DB hash immediately rejects the default password, even after a safe verdict",()=>{
  const check=createAdministratorPasswordPolicy();
  const safe=hashPassword("unique-test-password"),unsafe=hashPassword("admin");
  check("production",safe);
  for(const environment of ["production","staging","production"]){
    expect(()=>check(environment,unsafe)).toThrow(/Default administrator/);
  }
  expect(()=>check("production",safe)).not.toThrow();
  expect(()=>check("production",unsafe)).toThrow(/Default administrator/);
});

test("a development request cannot seed a protected-environment verdict",()=>{
  let calls=0;
  const check=createAdministratorPasswordPolicy(()=>{calls++;return true;});
  check("development","hash");
  expect(calls).toBe(0);
  expect(()=>check("production","hash")).toThrow();
  expect(calls).toBe(1);
});

test("failed verification is retried instead of caching a successful verdict",()=>{
  let calls=0;
  const check=createAdministratorPasswordPolicy(()=>{if(++calls===1)throw Error("unavailable");return true;});
  expect(()=>check("production","hash")).toThrow("unavailable");
  expect(()=>check("production","hash")).toThrow(/Default administrator/);
  expect(calls).toBe(2);
});
