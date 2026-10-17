import {verifyPassword} from "../../../db/passwords.mjs";
export function ensureAdministratorPassword(environment:string,hash:string){
  if(["production","staging"].includes(environment)&&verifyPassword("admin",hash))throw Object.assign(new Error("Default administrator password is disabled outside local development"),{code:"CONFIGURATION"});
}
