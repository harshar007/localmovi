const { initDatabase, prisma } = require('./dist-server/server/db.js');

async function test() {
  await initDatabase();
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Verified SQLite tables in DB:');
  tables.forEach(t => console.log(' -', t.name));
  process.exit(0);
}

test().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
