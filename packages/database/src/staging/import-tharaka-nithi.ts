import { prisma } from "../client";
import { importCounty } from "./import-county";

importCounty("tharaka-nithi")
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
