// Client-side amortization schedule calculator.
// Mirrors the backend generateSchedule() methods exactly so the preview
// matches what disbursement will produce.

export interface ScheduleRow {
  installmentNumber: number;
  dueDate: Date;
  principalPortion: number;
  profitPortion: number;
  totalAmount: number;
  balanceAfter: number;
}

export interface SchedulePreviewInput {
  costPrice: number;
  profitRate: number;       // annual %
  tenureMonths: number;
  repaymentMethod: string;  // emi | declining_balance | bullet | balloon
  repaymentFrequency: string; // monthly | quarterly
  startDate: Date;          // application date or today
}

const m2 = (v: number) => Math.round(v * 100) / 100;

export function generatePreviewSchedule(input: SchedulePreviewInput): ScheduleRow[] {
  const { costPrice, profitRate, tenureMonths, repaymentMethod, repaymentFrequency, startDate } = input;

  const periodsPerYear = repaymentFrequency === 'quarterly' ? 4 : 12;
  const totalPeriods = repaymentFrequency === 'quarterly' ? Math.ceil(tenureMonths / 3) : tenureMonths;
  const monthsPerPeriod = repaymentFrequency === 'quarterly' ? 3 : 1;

  // Total profit (flat) — same formula used for emi / bullet / balloon
  const profitAmount = m2(costPrice * (profitRate / 100) * (tenureMonths / 12));
  const totalFacilityAmount = m2(costPrice + profitAmount);

  const addMonths = (date: Date, months: number): Date => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  switch (repaymentMethod) {
    case 'declining_balance':
      return generateDeclining(costPrice, profitRate, totalPeriods, monthsPerPeriod, periodsPerYear, totalFacilityAmount, startDate, addMonths);
    case 'bullet':
      return generateBullet(costPrice, profitAmount, totalPeriods, monthsPerPeriod, totalFacilityAmount, startDate, addMonths);
    case 'balloon':
      return generateBalloon(costPrice, profitAmount, totalPeriods, monthsPerPeriod, totalFacilityAmount, startDate, addMonths);
    default: // emi
      return generateEMI(totalFacilityAmount, profitAmount, costPrice, totalPeriods, monthsPerPeriod, startDate, addMonths);
  }
}

function generateEMI(
  totalFacilityAmount: number,
  totalProfit: number,
  _costPrice: number,
  totalPeriods: number,
  monthsPerPeriod: number,
  startDate: Date,
  addMonths: (d: Date, m: number) => Date,
): ScheduleRow[] {
  const installment = m2(totalFacilityAmount / totalPeriods);
  const profitPerPeriod = m2(totalProfit / totalPeriods);
  const principalPerPeriod = m2(installment - profitPerPeriod);
  let balance = totalFacilityAmount;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= totalPeriods; i++) {
    const isLast = i === totalPeriods;
    const thisPrincipal = isLast ? m2(balance - profitPerPeriod) : principalPerPeriod;
    const thisProfit = isLast ? m2(balance - thisPrincipal) : profitPerPeriod;
    const thisTotal = m2(thisPrincipal + thisProfit);
    balance = isLast ? 0 : m2(balance - thisTotal);
    rows.push({
      installmentNumber: i,
      dueDate: addMonths(startDate, i * monthsPerPeriod),
      principalPortion: thisPrincipal,
      profitPortion: thisProfit,
      totalAmount: thisTotal,
      balanceAfter: balance,
    });
  }
  return rows;
}

function generateDeclining(
  costPrice: number,
  profitRate: number,
  totalPeriods: number,
  monthsPerPeriod: number,
  periodsPerYear: number,
  totalFacilityAmount: number,
  startDate: Date,
  addMonths: (d: Date, m: number) => Date,
): ScheduleRow[] {
  const annualRate = profitRate / 100;
  const periodicRate = annualRate / periodsPerYear;
  const principalPerPeriod = m2(costPrice / totalPeriods);
  let remainingPrincipal = costPrice;
  let balance = totalFacilityAmount;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= totalPeriods; i++) {
    const isLast = i === totalPeriods;
    const thisPrincipal = isLast ? remainingPrincipal : principalPerPeriod;
    const thisProfit = m2(remainingPrincipal * periodicRate);
    const thisTotal = m2(thisPrincipal + thisProfit);
    remainingPrincipal = m2(remainingPrincipal - thisPrincipal);
    balance = isLast ? 0 : m2(balance - thisTotal);
    rows.push({
      installmentNumber: i,
      dueDate: addMonths(startDate, i * monthsPerPeriod),
      principalPortion: thisPrincipal,
      profitPortion: thisProfit,
      totalAmount: thisTotal,
      balanceAfter: balance,
    });
  }
  return rows;
}

function generateBullet(
  costPrice: number,
  totalProfit: number,
  totalPeriods: number,
  monthsPerPeriod: number,
  totalFacilityAmount: number,
  startDate: Date,
  addMonths: (d: Date, m: number) => Date,
): ScheduleRow[] {
  const profitPerPeriod = m2(totalProfit / totalPeriods);
  let balance = totalFacilityAmount;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= totalPeriods; i++) {
    const isLast = i === totalPeriods;
    const thisPrincipal = isLast ? costPrice : 0;
    const thisTotal = m2(thisPrincipal + profitPerPeriod);
    balance = isLast ? 0 : m2(balance - thisTotal);
    rows.push({
      installmentNumber: i,
      dueDate: addMonths(startDate, i * monthsPerPeriod),
      principalPortion: thisPrincipal,
      profitPortion: profitPerPeriod,
      totalAmount: thisTotal,
      balanceAfter: balance,
    });
  }
  return rows;
}

function generateBalloon(
  costPrice: number,
  totalProfit: number,
  totalPeriods: number,
  monthsPerPeriod: number,
  totalFacilityAmount: number,
  startDate: Date,
  addMonths: (d: Date, m: number) => Date,
): ScheduleRow[] {
  const balloonAmount = m2(costPrice * 0.5);
  const regularPrincipal = m2((costPrice - balloonAmount) / (totalPeriods - 1));
  const profitPerPeriod = m2(totalProfit / totalPeriods);
  let balance = totalFacilityAmount;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= totalPeriods; i++) {
    const isLast = i === totalPeriods;
    const thisPrincipal = isLast ? balloonAmount : regularPrincipal;
    const thisTotal = m2(thisPrincipal + profitPerPeriod);
    balance = isLast ? 0 : m2(balance - thisTotal);
    rows.push({
      installmentNumber: i,
      dueDate: addMonths(startDate, i * monthsPerPeriod),
      principalPortion: thisPrincipal,
      profitPortion: profitPerPeriod,
      totalAmount: thisTotal,
      balanceAfter: balance,
    });
  }
  return rows;
}
