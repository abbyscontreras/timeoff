import { AccrualImpact, ChargeCodeType, PayCadence, PayPeriodStatus, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const organization = await prisma.organization.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      subdomain: 'demo'
    }
  });

  const paySchedule = await prisma.paySchedule.create({
    data: {
      organizationId: organization.id,
      cadence: PayCadence.BiWeekly
    }
  });

  const user = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'admin@demo.local'
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Demo Admin',
      email: 'admin@demo.local',
      role: Role.Admin,
      payScheduleId: paySchedule.id,
      hireDate: new Date('2024-01-01')
    }
  });

  const payPeriod = await prisma.payPeriod.create({
    data: {
      organizationId: organization.id,
      cadence: PayCadence.BiWeekly,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-14'),
      status: PayPeriodStatus.Draft
    }
  });

  const defaultChargeCodes = [
    { codeKey: 'REGULAR_WORKED', displayName: 'Regular Worked', type: ChargeCodeType.Worked, isPaid: true, accrualImpact: AccrualImpact.neutral },
    { codeKey: 'PTO', displayName: 'PTO', type: ChargeCodeType.Used, isPaid: true, accrualImpact: AccrualImpact.subtracts },
    { codeKey: 'SICK_LEAVE', displayName: 'Sick Leave', type: ChargeCodeType.Used, isPaid: true, accrualImpact: AccrualImpact.subtracts },
    { codeKey: 'BANKED_COMP_TIME', displayName: 'Banked Comp Time', type: ChargeCodeType.Earned, isPaid: false, accrualImpact: AccrualImpact.adds }
  ];

  for (const code of defaultChargeCodes) {
    await prisma.chargeCode.upsert({
      where: { organizationId_codeKey: { organizationId: organization.id, codeKey: code.codeKey } },
      update: code,
      create: {
        organizationId: organization.id,
        ...code
      }
    });
  }

  const sampleHolidays = [
    { name: 'New Year\'s Day', date: new Date('2026-01-01'), year: 2026, isFloating: false },
    { name: 'Memorial Day', date: new Date('2026-05-25'), year: 2026, isFloating: false },
    { name: 'Independence Day', date: new Date('2026-07-04'), year: 2026, isFloating: false },
    { name: 'Labor Day', date: new Date('2026-09-07'), year: 2026, isFloating: false },
    { name: 'Thanksgiving', date: new Date('2026-11-26'), year: 2026, isFloating: false },
    { name: 'Christmas Day', date: new Date('2026-12-25'), year: 2026, isFloating: false }
  ];

  for (const holiday of sampleHolidays) {
    await prisma.holiday.upsert({
      where: {
        organizationId_name_date: {
          organizationId: organization.id,
          name: holiday.name,
          date: holiday.date
        }
      },
      update: holiday,
      create: {
        organizationId: organization.id,
        ...holiday
      }
    });
  }

  await prisma.timeEntry.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      payPeriodId: payPeriod.id,
      entryDate: new Date('2026-01-02'),
      chargeCodeId: (await prisma.chargeCode.findFirstOrThrow({ where: { organizationId: organization.id, codeKey: 'REGULAR_WORKED' } })).id,
      hoursLogged: 8,
      notes: 'Initial seeded entry'
    }
  });
}

seed()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
