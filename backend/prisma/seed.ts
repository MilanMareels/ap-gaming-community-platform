import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed default nav links if none exist
  const count = await prisma.navLink.count();
  if (count > 0) {
    console.log('NavLink table already has data, skipping seed.');
    return;
  }

  const defaultLinks = [
    { label: 'Home', href: '/', position: 0 },
    { label: 'Events', href: '/events', position: 1 },
    { label: 'Roster', href: '/roster', position: 2 },
    { label: 'Schedule', href: '/schedule', position: 3 },
    { label: 'Info', href: '/info', position: 4 },
    { label: 'Reserveer', href: '/reservations', position: 5, isCta: true },
  ];

  for (const link of defaultLinks) {
    await prisma.navLink.create({
      data: {
        label: link.label,
        href: link.href,
        position: link.position,
        visibility: 'public',
        isCta: link.isCta ?? false,
        openInNewTab: false,
        isProtected: true,
      },
    });
  }

  console.log(`Seeded ${defaultLinks.length} default nav links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
