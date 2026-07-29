import { prisma } from "../client";

// PRODUCTION-READINESS FIX (found during final packaging audit): a fresh
// deployment seeds the "Admin" Role row (with every Permission attached —
// see seed/index.ts's seedRolesAndPermissions()), but every user who
// registers through the normal auth flow always gets the "Tenant" role
// (see AuthService.register()/loginWithOtp()). Nothing anywhere — no seed,
// no script, no endpoint — ever grants a real user the Admin role. Without
// this script, nobody could ever reach /admin/verification, the university
// verification queue, or the blog admin endpoints on a fresh deployment,
// because there would be no way to become an Admin at all.
//
// This is deliberately a standalone CLI script run directly against the
// database by whoever controls it — NOT an API endpoint. An HTTP endpoint
// that could grant Admin would be a critical self-escalation vulnerability
// (any authenticated user could promote themselves). Requiring direct
// database/deploy access to run this mirrors how most production systems
// bootstrap their first administrator.
//
// Usage:
//   pnpm --filter @student-housing/database grant-admin-role -- user@example.com
//
// The user must already exist (register through the normal sign-up flow
// first). This only ever attaches the existing, already-seeded "Admin"
// role — it never creates permissions, invents a user, or bypasses
// authentication.

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error(
      "Usage: pnpm --filter @student-housing/database grant-admin-role <email>"
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `No user found with email "${email}". They must register through the normal sign-up flow first.`
    );
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  if (!adminRole) {
    throw new Error(
      'No "Admin" role found. Run `pnpm --filter @student-housing/database prisma:seed` first — ' +
        "it seeds the Admin role with every permission."
    );
  }

  await prisma.userRole.upsert({
    where: { userId_roleId_organisationId: { userId: user.id, roleId: adminRole.id, organisationId: null } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "user.grant_admin_role",
      entityType: "user",
      entityId: user.id,
      metadataJson: { grantedVia: "grant-admin-role CLI script" },
    },
  });

  console.log(`Granted the Admin role to ${email}. They must sign out and back in for a fresh token.`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err.message ?? err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
