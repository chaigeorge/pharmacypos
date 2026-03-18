const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default settings
  const settings = [
    { key: 'pharmacy_name', value: 'My Pharmacy' },
    { key: 'currency', value: 'TZS' },
    { key: 'currency_symbol', value: 'TSh' },
    { key: 'tax_enabled', value: 'false' },
    { key: 'tax_rate', value: '0' },
    { key: 'low_stock_threshold', value: '10' },
    { key: 'expiry_alert_days', value: '30' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  // Create superadmin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@pharmacy.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@pharmacy.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
      phone: '+255700000000',
    },
  });

  // Create a manager
  const managerPassword = await bcrypt.hash('manager123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@pharmacy.com' },
    update: {},
    create: {
      name: 'John Manager',
      email: 'manager@pharmacy.com',
      password: managerPassword,
      role: 'MANAGER',
      phone: '+255711111111',
    },
  });

  // Create a pharmacist
  const pharmacistPassword = await bcrypt.hash('pharmacist123', 10);
  await prisma.user.upsert({
    where: { email: 'pharmacist@pharmacy.com' },
    update: {},
    create: {
      name: 'Jane Pharmacist',
      email: 'pharmacist@pharmacy.com',
      password: pharmacistPassword,
      role: 'PHARMACIST',
      phone: '+255722222222',
    },
  });

  // Create categories
  const categories = [
    'Antibiotics', 'Analgesics', 'Antifungals', 'Antivirals',
    'Vitamins & Supplements', 'Antihypertensives', 'Antidiabetics',
    'Antihistamines', 'Gastrointestinal', 'Dermatology', 'Other'
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create a sample supplier
  await prisma.supplier.upsert({
    where: { id: 'sample-supplier-001' },
    update: {},
    create: {
      id: 'sample-supplier-001',
      name: 'Tanzania Medical Supplies',
      phone: '+255733000000',
      email: 'supply@tms.co.tz',
      address: 'Dar es Salaam, Tanzania',
    },
  });

  console.log('Seeding completed!');
  console.log('');
  console.log('Default accounts:');
  console.log('  Superadmin: admin@pharmacy.com / admin123');
  console.log('  Manager:    manager@pharmacy.com / manager123');
  console.log('  Pharmacist: pharmacist@pharmacy.com / pharmacist123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
