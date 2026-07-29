import { prisma } from "../client";
import { importCounty } from "./import-county";

// Thin, backward-compatible entry point — the real logic now lives in
// import-county.ts (generalised during Kiambu's Milestone 1) so it isn't
// copy-pasted for every subsequent county.
importCounty("nairobi")
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
