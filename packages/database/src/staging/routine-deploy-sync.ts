// Safe to run on every deploy: syncs the schema, seeds idempotent
// non-business lookup data, blog content, and the complete CUE-accredited
// Kenyan universities dataset (real, government-sourced data — see
// import-all-kenyan-universities.ts for why this is safe to include here,
// unlike property/university staging auto-promotion). Deliberately does
// NOT include the dev-only staging auto-promotion+verification logic
// (see bootstrap-production-data.ts) — that bypasses real human review
// of source-supplied listings and must only ever run as a deliberate
// one-time action, never as part of routine deploys.

import { execSync } from "node:child_process";
import { prisma } from "../client";
import { main as seedLookupData } from "../seed/index";
import { main as seedBlogPosts } from "./seed-blog-posts";
import { main as importKenyanUniversities } from "./import-all-kenyan-universities";

async function main() {
  console.log("=== [1/4] Syncing database schema ===");
  execSync("prisma db push --skip-generate", { stdio: "inherit", cwd: __dirname + "/../.." });

  console.log("=== [2/4] Seeding lookup/taxonomy data ===");
  await seedLookupData();

  console.log("=== [3/4] Publishing blog content ===");
  await seedBlogPosts();

  console.log("=== [4/4] Syncing the complete CUE-accredited Kenyan universities dataset ===");
  await importKenyanUniversities();

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
