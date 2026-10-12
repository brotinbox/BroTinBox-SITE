export type MacroType = 'protein' | 'carbs' | 'fat' | 'calories';

export type FreeFromCategory =
  | 'Gelatin-free'
  | 'Dairy-free'
  | 'Nut-free'
  | 'Gluten-free'
  | 'Egg-free'
  | 'Soy-free'
  | 'Low sugar'
  | 'Low salt'
  | 'Refined sugar-free'
  | 'Meat-free';

export type GoalType = 'fat-loss' | 'muscle-gain' | 'stay-fit' | 'elderly-care';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export type MealSlot = 'lunch' | 'dinner';

export type BoxItemType = 'main' | 'salad' | 'egg' | 'carb' | 'legume';

export interface BoxItem {
  type: BoxItemType;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

export interface BoxEggFreeVersion {
  description: string;
  extraLegumeName: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Box {
  id: string;
  slug: string;
  name: string;
  day: DayOfWeek;
  image: string;
  images?: string[];
  description: string;
  isVeg: boolean;
  containsEgg: boolean;
  tags: string[];
  allergens: string[];
  freeFrom: string[];
  price: number;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    weightG: number;
  };
  items: BoxItem[];
  benefits: string[];
  eggFreeVersion: BoxEggFreeVersion;
  suggestedSides?: string[];
  suggestedAddons?: string[];
  labVerifiedNote?: string;
}

export interface SideBox {
  id: string;
  slug: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  isVeg: boolean;
  tags: string[];
  description: string;
  image: string;
}

export interface AddonDrink {
  id: string;
  name: string;
  volume: string;
  calories: number;
  protein: number;
  carbs: number;
  sugar: string;
  sugarGrams: number;
  showSugarBadge?: boolean;
  price: number;
  tags: string[];
  description: string;
  image: string;
}

export interface ScheduleItem {
  day: DayOfWeek;
  boxId: string;
  boxSlug: string;
  boxName: string;
  price: number;
  calories: number;
  protein: number;
  isVeg: boolean;
  tag: string;
}

export interface DayBoxConfig {
  day: DayOfWeek;
  boxId: string;
  boxCount: 1 | 2; // 1 or 2 boxes for this day
  isEggFree: boolean; // Swap eggs for extra legume portion
  skipLegume?: boolean; // Swap option: skip legume
  doubleMain?: boolean; // Swap option: double main portion (+₹80)
  selectedSides: string[]; // array of side IDs
  selectedDrinks: string[]; // array of drink IDs
}

export interface DayPlan {
  isLocked?: boolean;
  isSkipped?: boolean;
  config: DayBoxConfig;
}

export type WeeklyMealPlan = Record<DayOfWeek, DayPlan>;

export interface PlanTier {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  mealsPerDay: 1 | 2;
  dailyProteinTarget: string;
  dailyCaloriesTarget: string;
  weeklyPrice: number;
  monthlyPrice: number;
  pricePerMealWeekly: number;
  pricePerMealMonthly: number;
  oneOffComparePrice: number;
  isPopular?: boolean;
  badge?: string;
  description: string;
  idealFor: string[];
  features: string[];
}

export interface DeliveryZone {
  pincode: string;
  area: string;
  isDeliverable: boolean;
  tier?: 'core' | 'phase2' | 'out-of-range';
  deliveryFee?: number;
  distanceKm?: number;
  avgDeliveryMinutes: number;
  slots: string[];
  description?: string;
  lat?: number;
  lng?: number;
}

export interface UserLocation {
  area: string;
  pincode: string;
  city: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  tier: 'core' | 'phase2' | 'out-of-range';
  deliveryFee: number;
  isDeliverable: boolean;
  formattedAddress?: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  /** Profile photo (from Google sign-in); initials are shown when absent. */
  avatarUrl?: string;
  goal: GoalType;
  gender: 'male' | 'female' | 'other';
  age: number;
  weightKg: number;
  targetWeightKg?: number;
  heightCm: number;
  activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active';
  dietType: 'veg' | 'non-veg' | 'eggetarian';
  allergies: string[];
  dislikedIngredients: string[];
  mealsPerDay: 1 | 2;
  selectedDays: DayOfWeek[];
  calculatedTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isOnboarded: boolean;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  tag: 'Home' | 'Work' | 'Other';
  flatNumber: string;
  street: string;
  landmark?: string;
  area: string;
  pincode: string;
  city: string;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'paused' | 'cancelled' | 'pending';
  billingCycle: 'weekly' | 'monthly';
  paymentMode: 'prepaid' | 'autopay';
  mealsPerDay: 1 | 2;
  currentWeekStart: string;
  nextBillingDate: string;
  pricePerCycle: number;
  pausedUntil?: string | null;
  cancelReason?: string;
  deliverySlotLunch?: string;
  deliverySlotDinner?: string;
  addressId: string;
}

export type OrderStatus = 'Preparing' | 'Packed' | 'Out for delivery' | 'Delivered';

export interface OrderItem {
  id: string;
  itemType: 'box' | 'side' | 'drink';
  name: string;
  day: DayOfWeek;
  slot: MealSlot;
  quantity: number;
  price: number;
  isEggFree?: boolean;
  isVeg: boolean;
  calories: number;
  protein: number;
  image?: string;
}

export interface Order {
  id: string;
  displayId: string;
  date: string;
  dayOfWeek: DayOfWeek;
  slot: MealSlot;
  status: OrderStatus;
  statusStep: number;
  items: OrderItem[];
  deliveryAddress: Address;
  deliveryAgent?: {
    name: string;
    phone: string;
  };
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  totalCalories: number;
  totalProtein: number;
  totalAmount: number;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  description: string;
  maxDiscount?: number;
}

export interface ProgressLog {
  id: string;
  date: string;
  weightKg: number;
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  waterLiters?: number;
  streakDays: number;
}

export interface Review {
  id: string;
  userName: string;
  area: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  goal: string;
  mealsDeliveredCount: number;
}

export interface AdminCookSheetItem {
  boxId: string;
  boxName: string;
  day: DayOfWeek;
  standardCount: number;
  eggFreeCount: number;
  doubleMainCount: number;
  skipLegumeCount: number;
  totalBoxes: number;
  sidesBreakdown: { sideName: string; count: number }[];
  drinksBreakdown: { drinkName: string; count: number }[];
  rawChickenKg?: number;
  rawPaneerKg?: number;
  rawFishKg?: number;
  rawSoyaKg?: number;
}

export interface AdminDeliveryItem {
  orderId: string;
  subscriberName: string;
  phone: string;
  area: string;
  pincode: string;
  slot: MealSlot;
  boxSummary: string;
  hasEggFree: boolean;
  sidesSummary?: string;
  drinksSummary?: string;
  status: OrderStatus;
}

export interface TrialOrderConfig {
  dateStr: string;
  dayName: string;
  diet: 'non-veg' | 'veg';
  mealsPerDay: 1 | 2;
  selectedSides: string[];
  selectedDrinks: string[];
  lunchSlot: string;
  dinnerSlot: string;
  price: number;
}

export interface WeeklyOrderConfig {
  weekStartDate: string;
  dietVariation: 'non-veg' | 'veg' | 'mixed';
  mealsPerDay: 1 | 2;
  skippedDays: string[];
  selectedSides: string[];
  selectedDrinks: string[];
  lunchSlot: string;
  dinnerSlot: string;
  price: number;
}

export interface MonthlyOrderConfig {
  startMonthDate: string;
  /** Exact delivery dates and diet per date, sent to the server at checkout. */
  schedule?: { date: string; diet: 'veg' | 'non-veg' }[];
  dietVariation: 'non-veg' | 'veg' | 'mixed';
  mealsPerDay: 1 | 2;
  skippedDays: string[];
  paymentMode: 'prepaid' | 'autopay';
  lunchSlot: string;
  dinnerSlot: string;
  price: number;
}

