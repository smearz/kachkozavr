import PrismaPackage from "@prisma/client";

const PrismaClientCtor = (PrismaPackage as { PrismaClient?: new () => unknown }).PrismaClient;

if (!PrismaClientCtor) {
  throw new Error(
    "PrismaClient is not available. Run `pnpm --filter @kachkozavr/api prisma:generate` before starting API."
  );
}

export const prisma = new PrismaClientCtor() as {
  user: any;
};
