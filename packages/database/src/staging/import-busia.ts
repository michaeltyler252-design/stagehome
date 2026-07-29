import { prisma } from "../client";
import { importCounty } from "./import-county";

importCounty("busia")
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
