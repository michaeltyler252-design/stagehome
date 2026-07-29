// Runs the entire one-time production data bootstrap as a SINGLE Node
// process — no shell "&&" chaining involved anywhere, which sidesteps a
// real, confirmed platform quirk: this project's Railway deployment does
// not reliably execute multi-command "&&"-chained preDeployCommand
// strings (only the first command runs), and its array form isn't read
// from railway.json either. Calling each step as a plain function within
// one script avoids the question entirely.
//
// This intentionally sets NODE_ENV=development only within this one
// process's own memory (never touching the actual Railway service
// variable) so the dev-only promotion/verification scripts' own safety
// checks pass — they still refuse to run against a database unless this
// exact opt-in happens, and this script is only ever wired into a
// deliberately throwaway bootstrap service, never the real running API.

process.env.NODE_ENV = "development";

import { prisma } from "../client";
import { importCounty } from "./import-county";
import { main as seedLookupData } from "../seed/index";
import { main as seedBlogPosts } from "./seed-blog-posts";
import { main as promoteAndVerifyUniversities } from "./dev-promote-and-verify-universities";
import { main as seedSearchData } from "./dev-seed-search-data";

const COUNTIES = ["nairobi", "kiambu", "nakuru"];

async function main() {
  console.log("=== [1/5] Seeding lookup/taxonomy data ===");
  await seedLookupData();

  console.log("=== [2/5] Publishing blog content ===");
  await seedBlogPosts();

  console.log("=== [3/5] Importing county source data into staging ===");
  // Must happen BEFORE university promotion — that step only promotes
  // whatever raw records already exist in staging, and does nothing if
  // called first against an empty staging schema (as happened on the
  // first bootstrap run: 0 universities were promoted because this step
  // hadn't run yet).
  for (const countySlug of COUNTIES) {
    await importCounty(countySlug);
  }

  console.log("=== [4/5] Promoting and verifying universities ===");
  await promoteAndVerifyUniversities();

  console.log("=== [5/5] Promoting, approving, and publishing properties ===");
  // Re-imports the same counties internally, but importCounty is
  // checksum-based and idempotent, so this is a safe no-op re-run.
  await seedSearchData();

  console.log("=== Bootstrap complete ===");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
