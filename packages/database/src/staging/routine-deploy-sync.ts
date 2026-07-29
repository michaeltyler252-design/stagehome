// Safe to run on every deploy: syncs the schema and seeds idempotent,
// non-business lookup data + blog content. Deliberately does NOT include
// the dev-only university/property auto-promotion+verification logic
// (see bootstrap-production-data.ts) — that bypasses real human review
// and must only ever run as a deliberate one-time action, never as part
// of routine deploys.

import { execSync } from "node:child_process";
import { prisma } from "../client";
import { main as seedLookupData } from "../seed/index";
import { main as seedBlogPosts } from "./seed-blog-posts";

async function main() {
  console.log("=== [1/3] Syncing database schema ===");
  execSync("prisma db push --skip-generate", { stdio: "inherit", cwd: __dirname + "/../.." });

  console.log("=== [2/3] Seeding lookup/taxonomy data ===");
  await seedLookupData();

  console.log("=== [3/3] Publishing blog content ===");
  await seedBlogPosts();

  console.log("=== Routine sync complete ===");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
