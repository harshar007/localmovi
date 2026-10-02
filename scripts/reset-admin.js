const { prisma, initDatabase } = require('../dist-server/server/db.js');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  await initDatabase();

  const newUsername = process.argv[2] || 'admin';
  const newPassword = process.argv[3] || 'admin123';

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const user = await prisma.user.upsert({
    where: { username: newUsername },
    update: {
      passwordHash,
      role: 'admin',
    },
    create: {
      username: newUsername,
      passwordHash,
      role: 'admin',
    },
  });

  console.log(`\n========================================`);
  console.log(`  Admin credentials updated successfully:`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Password: ${newPassword}`);
  console.log(`========================================\n`);

  process.exit(0);
}

resetAdmin().catch((err) => {
  console.error('Failed to reset admin:', err);
  process.exit(1);
});
