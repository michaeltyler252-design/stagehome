import { prisma } from "../client";
import { ROLLOUT_COUNTIES } from "./rollout-counties";
import {
  PROPERTY_CATEGORIES,
  UNIT_CATEGORIES,
  AMENITIES,
  UTILITIES,
  ROLES,
  PERMISSIONS,
  CANCELLATION_POLICIES,
} from "./lookup-data";

// Milestone 2 scope (per docs/operations/seed-strategy.md):
//   - Reference/taxonomy data only. No properties, universities, users,
//     bookings, or payments are created here — those are real business data
//     and belong in the staging-import pipeline (see src/staging/), never a
//     hard-coded seed file (Part B rule 4).
//   - Every upsert is keyed on a natural key so this script is safe to re-run
//     in any environment, including CI.

async function seedCounties() {
  for (const county of ROLLOUT_COUNTIES) {
    await prisma.county.upsert({
      where: { slug: county.slug },
      update: { rolloutPhase: county.rolloutPhase },
      create: {
        name: county.name,
        slug: county.slug,
        rolloutPhase: county.rolloutPhase,
        sourceStatus: "OFFICIAL_SOURCE",
        confidenceLevel: "HIGH",
        publicationStatus: "DRAFT",
        notes: "Seeded from Part C county rollout order. Not itself source-supplied business data.",
      },
    });
  }
  console.log(`Seeded ${ROLLOUT_COUNTIES.length} rollout counties.`);
}

async function seedPropertyCategories() {
  for (const cat of PROPERTY_CATEGORIES) {
    await prisma.propertyCategory.upsert({
      where: { key: cat.key },
      update: { name: cat.name },
      create: cat,
    });
  }
  console.log(`Seeded ${PROPERTY_CATEGORIES.length} property categories.`);
}

async function seedUnitCategories() {
  for (const cat of UNIT_CATEGORIES) {
    await prisma.unitCategory.upsert({
      where: { key: cat.key },
      update: { name: cat.name },
      create: cat,
    });
  }
  console.log(`Seeded ${UNIT_CATEGORIES.length} unit categories.`);
}

async function seedAmenities() {
  for (const amenity of AMENITIES) {
    await prisma.amenity.upsert({
      where: { key: amenity.key },
      update: { name: amenity.name },
      create: amenity,
    });
  }
  console.log(`Seeded ${AMENITIES.length} amenities.`);
}

async function seedUtilities() {
  for (const utility of UTILITIES) {
    await prisma.utility.upsert({
      where: { key: utility.key },
      update: { name: utility.name },
      create: utility,
    });
  }
  console.log(`Seeded ${UTILITIES.length} utilities.`);
}

async function seedRolesAndPermissions() {
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } })
    )
  );

  for (const roleName of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    // Milestone 2 grants Admin every permission; other roles are scoped
    // properly once Milestone 3 (Authentication and permissions) defines
    // each role's real responsibilities.
    if (roleName === "Admin") {
      for (const permission of permissionRecords) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }
  console.log(`Seeded ${ROLES.length} roles and ${PERMISSIONS.length} permissions.`);
}

async function seedCancellationPolicies() {
  for (const policy of CANCELLATION_POLICIES) {
    await prisma.cancellationPolicy.upsert({
      where: { key: policy.key },
      update: { name: policy.name },
      create: policy,
    });
  }
  console.log(`Seeded ${CANCELLATION_POLICIES.length} cancellation policy types.`);
}

export async function main() {
  console.log("Seeding lookup/taxonomy data (Milestone 2 scope)...");
  await seedCounties();
  await seedPropertyCategories();
  await seedUnitCategories();
  await seedAmenities();
  await seedUtilities();
  await seedRolesAndPermissions();
  await seedCancellationPolicies();
  console.log("Seed complete. No business data (properties/universities/users) was created — see docs/operations/seed-strategy.md.");
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
