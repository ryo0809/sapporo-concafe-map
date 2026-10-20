import "server-only";
import { ManageCafes } from "@/application/admin/manage-cafes";
import { AuthenticateAdministrator } from "@/application/admin/authenticate";
import { D1ManagementRepository,D1AuthenticationRepository } from "@/infrastructure/admin/d1-repositories";
export const createManagement=()=>new ManageCafes(new D1ManagementRepository());
export const createAuthentication=()=>new AuthenticateAdministrator(new D1AuthenticationRepository());
