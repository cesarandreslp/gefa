import { prisma } from '@/lib/prisma';

export async function calculateBusinessDeadline(startDate: Date, businessDaysToAdd: number): Promise<Date> {
  // Extract only dates, setting time to 00:00:00 to keep checks consistent
  
  // Clone to avoid mutation
  const currentDate = new Date(startDate);

  // Fetch all active holidays from the database
  const holidays = await prisma.nonBusinessDay.findMany({
    where: { isActive: true },
    select: { date: true }
  });

  // Convert to set of strings for rapid O(1) checking
  const holidaySet = new Set(
    holidays.map(h => {
      const d = h.date;
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    })
  );

  let addedDays = 0;
  
  while (addedDays < businessDaysToAdd) {
    // Add 1 calendar day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);

    // Filter weekends
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday

    if (isWeekend) continue;

    // Filter holidays
    const checkDateStr = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
    if (holidaySet.has(checkDateStr)) continue;

    // It's a valid business day!
    addedDays++;
  }

  return currentDate;
}
