import type { CafeInput, ManagedCafe } from "./managed-cafe";
export interface ManagementRepository {
  list(): Promise<readonly ManagedCafe[]>;
  find(id: string): Promise<ManagedCafe | null>;
  save(input: CafeInput, actor: string, id?: string, version?: number): Promise<ManagedCafe>;
  remove(id: string, actor: string, version: number): Promise<void>;
}
export interface Administrator { id: string; username: string; }
export interface AuthenticationRepository {
  login(username: string,password: string): Promise<{token:string;expiresAt:number;administrator:Administrator}|null>;
  session(token: string): Promise<Administrator|null>;
  logout(token: string): Promise<void>;
}
