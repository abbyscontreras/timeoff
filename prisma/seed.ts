import { PrismaClient, AccrualImpact, Cadence, ChargeCategory, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: { id: 'default-org', name: 'Default Organization' }
  });

  const schedule = await prisma.paySchedule.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Biweekly' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Biweekly',
      cadence: Cadence.BI_WEEKLY,
      anchorDate: new Date('2026-01-01')
    }
  });

  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@timeoff.local' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'System Admin',
      email: 'admin@timeoff.local',
      role: UserRole.ADMIN,
      hireDate: new Date('2020-01-01'),
      payScheduleId: schedule.id
    }
  });

  const codes = [
    { codeKey: 'REGULAR', displayName: 'Regular Worked Time', category: ChargeCategory.WORKED, isPaid: true, accrualImpact: AccrualImpact.NEUTRAL },
    { codeKey: 'PTO', displayName: 'Paid Time Off', category: ChargeCategory.USED, isPaid: true, accrualImpact: AccrualImpact.SUBTRACTS },
    { codeKey: 'SICK', displayName: 'Sick Leave', category: ChargeCategory.USED, isPaid: true, accrualImpact: AccrualImpact.SUBTRACTS },
    { codeKey: 'COMP', displayName: 'Banked / Comp Time', category: ChargeCategory.EARNED, isPaid: false, accrualImpact: AccrualImpact.ADDS },
    { codeKey: 'TRAINING', displayName: 'Paid Training', category: ChargeCategory.WORKED, isPaid: true, accrualImpact: AccrualImpact.NEUTRAL },
    { codeKey: 'FLOATING_HOLIDAY', displayName: 'Floating Holiday', category: ChargeCategory.USED, isPaid: true, accrualImpact: AccrualImpact.SUBTRACTS },
    { codeKey: 'JURY_DUTY', displayName: 'Jury Duty', category: ChargeCategory.WORKED, isPaid: true, accrualImpact: AccrualImpact.NEUTRAL },
    { codeKey: 'BEREAVEMENT', displayName: 'Bereavement', category: ChargeCategory.USED, isPaid: true, accrualImpact: AccrualImpact.SUBTRACTS }
  ];

  for (const code of codes) {
    await prisma.chargeCode.upsert({
      where: { organizationId_codeKey: { organizationId: org.id, codeKey: code.codeKey } },
      update: code,
      create: { organizationId: org.id, ...code }
    });
  }

  const holidays = [
    ['New Year\'s Day', '2026-01-01'],
    ['Memorial Day', '2026-05-25'],
    ['Independence Day', '2026-07-04'],
    ['Labor Day', '2026-09-07'],
    ['Thanksgiving', '2026-11-26'],
    ['Christmas Day', '2026-12-25']
  ] as const;

  for (const [name, date] of holidays) {
    await prisma.holiday.upsert({
      where: { organizationId_name_date: { organizationId: org.id, name, date: new Date(date) } },
      update: {},
      create: {
        organizationId: org.id,
        name,
        date: new Date(date),
        year: 2026,
        isFloating: false
      }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
