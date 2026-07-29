import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Restricts a route to users holding at least one of the given role names.
 * Role names must match a seeded `roles.name` row (Tenant, Owner, Manager,
 * Accountant, Receptionist, Maintenance, Analyst, Admin — Part K).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
