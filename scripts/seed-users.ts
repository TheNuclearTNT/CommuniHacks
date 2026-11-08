import { getDb, seedBaseUsers } from '@/lib/db';
import { seedDemoIncidentsIfEmpty } from '@/lib/db/demo-seed';
import { SEED_USERS } from '@/lib/mock/connan';

async function main() {
  const db = await getDb();
  await seedBaseUsers(db);
  await seedDemoIncidentsIfEmpty(db);
  console.log(`Seeded ${SEED_USERS.length} fictional Langs Line users:`);
  for (const u of SEED_USERS) {
    console.log(`  - ${u.id.padEnd(10)} | ${u.role.padEnd(16)} | ${u.name} (${u.site})`);
  }
}

if (require.main === module || process.argv[1]?.endsWith('seed-users.ts')) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed users:', err);
      process.exit(1);
    });
}

export { SEED_USERS, seedBaseUsers };
