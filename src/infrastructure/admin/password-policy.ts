import {verifyPassword} from "../../../db/passwords.mjs";
export function createAdministratorPasswordPolicy(verify:typeof verifyPassword=verifyPassword){
  // This is a pure property of a hash, not an authentication/session decision.
  // Keep only one verdict per isolate; a changed DB hash is checked immediately.
  let previousHash:string|undefined;
  let isDefault=false;
  return (environment:string,hash:string)=>{
    if(environment!=="production"&&environment!=="staging")return;
    if(hash!==previousHash){
      const result=verify("admin",hash);
      previousHash=hash;
      isDefault=result;
    }
    if(isDefault)throw Object.assign(new Error("Default administrator password is disabled outside local development"),{code:"CONFIGURATION"});
  };
}
export const ensureAdministratorPassword=createAdministratorPasswordPolicy();
