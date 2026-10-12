/**
 * BroTin Box Business Model & Unit Economics
 * Grounded in /public/Gramwise_30Day_Menu_and_Profit_Model - Scenarios.csv
 */

export const BUSINESS_MODEL = {
  name: 'BroTin Box',
  operatingDaysPerMonth: 26, // Mon to Sat (Sundays closed for sanitisation)
  operatingSchedule: 'Monday to Saturday',
  
  dietSplitAssumption: {
    veg: 0.30,     // 30%
    nonVeg: 0.70,  // 70%
  },

  planMixAssumption: {
    dailyTrial: 0.30, // 30% sold at trial price
    weekly: 0.40,     // 40% sold at weekly subscription price
    monthly: 0.30,    // 30% sold at monthly subscription price
  },

  pricingTargets: {
    weightedSellingPrice: {
      nonVeg: 292.00,
      veg: 262.00,
    },
    // Tiered selling prices calibrated to achieve exact weighted average:
    // (0.30 * trial + 0.40 * weekly + 0.30 * monthly)
    tiers: {
      trial: { nonVeg: 319, veg: 289 },
      weeklyPerMeal: { nonVeg: 289, veg: 259 },
      monthlyPerMeal: { nonVeg: 269, veg: 239 },
      secondMealDiscountPerMeal: 10,
    },
  },

  costs: {
    perBoxCostBeforeGateway: {
      nonVeg: 156.92, // Procurement, gas, packaging, electricity, wastage, delivery
      veg: 113.97,
    },
    selfDeliveryCostPerBox: 4.00,
    paymentGatewayFeeRate: 0.024, // ~2.4%

    fixedMonthly: {
      softwareDomainHosting: 2000, // Vercel, Supabase, domain, WhatsApp API
      marketingAndGymSamples: 8000, // Flyers, sample boxes, Instagram
      licenceRepairsMisc: 2000,    // FSSAI renewal, equipment upkeep
      totalBaseFixed: 12000,
    },

    wagesMonthly: {
      helperEach: 14000, // Kitchen helper
      riderEach: 16000,  // Delivery rider
    },
  },

  unitEconomics: {
    contributionPerBox: 132.17,
    breakEvenBoxesPerDaySolo: 3.5, // Software, marketing, misc only, no helpers
    breakEvenBoxesPerDayWithLabour: 4.3, // Including notional family labour
  },

  scenarios: [
    {
      id: 'A',
      boxesPerDay: 5,
      helpers: 0,
      riders: 0,
      boxesPerMonth: 130,
      revenueMonthly: 36790,
      variableCostMonthly: 18725,
      gatewayFeesMonthly: 883,
      contributionMonthly: 17182,
      fixedCostMonthly: 12000,
      netProfitMonthly: 5182,
      netMargin: 0.141,
    },
    {
      id: 'B',
      boxesPerDay: 10,
      helpers: 0,
      riders: 0,
      boxesPerMonth: 260,
      revenueMonthly: 73580,
      variableCostMonthly: 37450,
      gatewayFeesMonthly: 1766,
      contributionMonthly: 34365,
      fixedCostMonthly: 12000,
      netProfitMonthly: 22365,
      netMargin: 0.304,
    },
    {
      id: 'C',
      boxesPerDay: 20,
      helpers: 1,
      riders: 0,
      boxesPerMonth: 520,
      revenueMonthly: 147160,
      variableCostMonthly: 74899,
      gatewayFeesMonthly: 3532,
      contributionMonthly: 68729,
      fixedCostMonthly: 26000, // 12000 base + 14000 helper
      netProfitMonthly: 42729,
      netMargin: 0.290,
    },
    {
      id: 'D',
      boxesPerDay: 30,
      helpers: 2,
      riders: 1,
      boxesPerMonth: 780,
      revenueMonthly: 220740,
      variableCostMonthly: 112349,
      gatewayFeesMonthly: 5298,
      contributionMonthly: 103094,
      fixedCostMonthly: 56000, // 12000 base + 28000 helpers + 16000 rider
      netProfitMonthly: 47094,
      netMargin: 0.213,
    },
    {
      id: 'E',
      boxesPerDay: 50,
      helpers: 3,
      riders: 2,
      boxesPerMonth: 1300,
      revenueMonthly: 367900,
      variableCostMonthly: 187248,
      gatewayFeesMonthly: 8830,
      contributionMonthly: 171823,
      fixedCostMonthly: 86000, // 12000 base + 42000 helpers + 32000 riders
      netProfitMonthly: 85823,
      netMargin: 0.233,
    },
  ],
} as const;

export default BUSINESS_MODEL;
