import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
  { key: 'events.manage', description: 'Manage events (CRUD)' },
  { key: 'events.registrations.view', description: 'View event registrations' },
  { key: 'reservations.manage', description: 'Manage reservations' },
  { key: 'reservations.noshows.manage', description: 'Manage no-shows' },
  { key: 'roster.manage', description: 'Manage teams/roster' },
  { key: 'timetable.manage', description: 'Manage timetable' },
  { key: 'users.manage', description: 'Manage users' },
  { key: 'users.roles.manage', description: 'Assign/remove roles from users' },
  { key: 'navigation.manage', description: 'Manage navigation links' },
  { key: 'settings.manage', description: 'Manage settings' },
  { key: 'brackets.manage', description: 'Manage brackets/tournaments' },
  { key: 'time-trials.manage', description: 'Manage time trials' },
  { key: 'point-trials.manage', description: 'Manage point trials' },
  { key: 'roles.manage', description: 'Manage roles and permissions' },
];

async function seedPermissionsAndRoles() {
  // Upsert all permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: { key: perm.key, description: perm.description },
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions.`);

  // Upsert the Admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full access to all features',
      isSystem: true,
    },
  });

  // Assign all permissions to Admin role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log(`Admin role now has ${allPermissions.length} permissions.`);

  // Migrate existing AdminUser records to UserRole
  const adminUsers = await prisma.adminUser.findMany();
  let migrated = 0;
  for (const au of adminUsers) {
    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: au.userId, roleId: adminRole.id } },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: { userId: au.userId, roleId: adminRole.id },
      });
      migrated++;
    }
  }
  if (migrated > 0) {
    console.log(`Migrated ${migrated} admin user(s) to Admin role.`);
  }
}

async function seedNavLinks() {
  const count = await prisma.navLink.count();
  if (count > 0) {
    console.log('NavLink table already has data, skipping nav link seed.');
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

async function main() {
  await seedPermissionsAndRoles();
  await seedNavLinks();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
