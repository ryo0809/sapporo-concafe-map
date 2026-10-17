import type { AuthenticationRepository } from "@/domain/admin/repositories";
import { InputError } from "@/domain/admin/managed-cafe";
export class AuthenticateAdministrator {
  constructor(private readonly repository:AuthenticationRepository){}
  login(username:unknown,password:unknown){
    if(typeof username!=="string"||typeof password!=="string"||!username||!password||username.length>100||password.length>200)throw new InputError("ユーザー名とパスワードを入力してください");
    return this.repository.login(username,password);
  }
  session(token:string){return this.repository.session(token);}
  logout(token:string){return this.repository.logout(token);}
}
