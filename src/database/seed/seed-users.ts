import { randomBytes, scryptSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { AccountRole, BookReadEntry, UserPreferences } from '../../users/dto/create-user.dto.js';

const SEED_FILE = fileURLToPath(new URL('./users.seed.json', import.meta.url));
const SEED_PASSWORD = 'VrijLezen123!';

interface UserSeed {
  email: string;
  name: string;
  accountRole: AccountRole;
  booksRead: BookReadEntry[];
  readerProfile: Record<string, unknown>;
  preferences: UserPreferences;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function seedUsers(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  const raw = await readFile(SEED_FILE, 'utf-8');
  const users: UserSeed[] = JSON.parse(raw);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const existing = await prisma.user.findMany({
    where: { email: { in: users.map((user) => user.email) } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((user) => user.email));

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash: hashPassword(SEED_PASSWORD) },
    });
  }

  const created = users.length - existingEmails.size;

  console.log(
    `[seed:postgres] ${users.length} gebruikers verwerkt — ${created} nieuw, ${users.length - created} bestonden al.`,
  );

  await prisma.$disconnect();
}

seedUsers().catch((error: unknown) => {
  console.error('[seed:postgres] Seeden mislukt:', error);
  process.exitCode = 1;
});
