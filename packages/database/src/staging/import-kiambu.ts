import { prisma } from "../client";
import { importCounty } from "./import-county";

importCounty("kiambu")
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
