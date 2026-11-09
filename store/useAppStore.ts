import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  DayOfWeek,
  MealSlot,
  UserProfile,
  PlanTier,
  Address,
  Coupon,
  Box,
  SideBox,
  AddonDrink,
  DayBoxConfig,
  TrialOrderConfig,
  WeeklyOrderConfig,
  MonthlyOrderConfig,
  UserLocation,
} from '@/types';
import boxesData from '@/data/boxes.json';
import sidesData from '@/data/sides.json';
import addonsData from '@/data/addons.json';
import plansData from '@/data/plans.json';

const defaultLocation: UserLocation = {
  area: 'Kuniyamuthur',
  pincode: '641008',
  city: 'Coimbatore',
  lat: 10.9575,
  lng: 76.9530,
  distanceKm: 0.0,
  tier: 'core',
  deliveryFee: 0,
  isDeliverable: true,
  formattedAddress: 'Kuniyamuthur, 641008, Coimbatore',
};

// Signed-out placeholder. Real values come from Supabase via <AuthSync />.
export const emptyProfile: UserProfile = {
  id: '',
  phone: '',
  fullName: '',
  email: undefined,
  goal: 'stay-fit',
  gender: 'other',
  age: 0,
  weightKg: 0,
  heightCm: 0,
  activityLevel: 'moderately-active',
  dietType: 'non-veg',
  allergies: [],
  dislikedIngredients: [],
  mealsPerDay: 1,
  selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  calculatedTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  isOnboarded: false,
};

const initialDayConfigs: Record<DayOfWeek, DayBoxConfig> = {
  Mon: { day: 'Mon', boxId: 'box-mon', boxCount: 1, isEggFree: false, skipLegume: false, doubleMain: false, selectedSides: [], selectedDrinks: [] },
  Tue: { day: 'Tue', boxId: 'box-tue', boxCount: 1, isEggFree: false, skipLegume: false, doubleMain: false, selectedSides: [], selectedDrinks: [] },
  Wed: { day: 'Wed', boxId: 'box-wed', boxCount: 1, isEggFree: false, skipLegume: false, doubleMain: false, selectedSides: [], selectedDrinks: [] },
  Thu: { day: 'Thu', boxId: 'box-thu', boxCount: 1, isEggFree: false, skipLegume: false, doubleMain: false, selectedSides: [], selectedDrinks: [] },
  Fri: { day: 'Fri', boxId: 'box-fri', boxCount: 1, isEggFree: false, skipLegume: false, doubleMain: false, selectedSides: [], selectedDrinks: [] },
  Sat: { day: 'Sat', boxId: 'box-sat', boxCount: 1, isEggFree: false, skipLegume: false, doubleMain: false, selectedSides: [], selectedDrinks: [] },
};

/** The box plan in the cart (one at a time). The server re-prices everything. */
export type CartPlan = {
  type: 'trial' | 'weekly' | 'monthly';
  /** "Weekly plan · Non-veg" */
  title: string;
  mealsPerDay: 1 | 2;
  /** Full box or Lite box. Missing on carts saved before Lite existed = full. */
  boxSize?: 'regular' | 'lite';
  /** Delivery run for 1-meal plans (2-meal plans get both). */
  slot: 'lunch' | 'dinner';
  days: { date: string; diet: 'veg' | 'non_veg' }[];
  preferences: { isEggFree: boolean; skipLegume: boolean; dietVariation?: string };
  /** Client estimate for the cart bar until the server quote arrives. */
  estimate: number;
};

/** A side or juice in the cart: `qty` rides with one box on every delivery day. */
export type CartAddon = { id: string; qty: number; name: string; price: number; image?: string; type: 'side' | 'drink' };

export const MAX_ADDON_QTY = 5;

// Old front-end side ids ("side-grilled-chicken") → DB slugs, so one item never appears twice.
const SIDE_SLUG = new Map((sidesData as { id: string; slug: string }[]).map((s) => [s.id, s.slug]));
export const addonKey = (id: string) => SIDE_SLUG.get(id) ?? id;

/** What the sign-in popup should do; every field is optional. */
export type SignInRequest = {
  /** Where to land after sign-in. Default: stay on the current page (home/login → dashboard). */
  returnTo?: string;
  /** Prefill this number (10 digits) … */
  phone?: string;
  /** … and send the code straight away. */
  autoSend?: boolean;
  /** Mid-order: called after sign-in instead of navigating. */
  onSignedIn?: () => void;
  /** Lead context saved with the number (what they were ordering). */
  context?: { flow?: string; summary?: string; area?: string; pincode?: string };
  /** Heading shown in the popup. */
  title?: string;
};

interface AppState {
  // Auth & Profile
  isLoggedIn: boolean;
  user: UserProfile;
  setUser: (profile: Partial<UserProfile>) => void;
  /** Set by <AuthSync /> from the Supabase session; null profile = signed out. */
  authReady: boolean;
  setAuthProfile: (profile: UserProfile | null) => void;
  logout: () => void;

  // New Box & Schedule Rotation State
  mealsPerDay: 1 | 2;
  setMealsPerDay: (count: 1 | 2) => void;
  selectedDays: DayOfWeek[];
  setSelectedDays: (days: DayOfWeek[]) => void;
  toggleDay: (day: DayOfWeek) => void;
  dayConfigs: Record<DayOfWeek, DayBoxConfig>;
  setDayConfig: (day: DayOfWeek, updates: Partial<DayBoxConfig>) => void;
  toggleDayEggFree: (day: DayOfWeek) => void;
  toggleDaySkipLegume: (day: DayOfWeek) => void;
  toggleDayDoubleMain: (day: DayOfWeek) => void;
  toggleSideForDay: (day: DayOfWeek, sideId: string) => void;
  toggleDrinkForDay: (day: DayOfWeek, drinkId: string) => void;
  setDayBoxCount: (day: DayOfWeek, count: 1 | 2) => void;

  // Bundles
  hasWeeklyJuiceBundle: boolean;
  setWeeklyJuiceBundle: (enabled: boolean) => void;
  hasWeeklySideBundle: boolean;
  setWeeklySideBundle: (enabled: boolean) => void;

  // Subscription Tier & Billing
  selectedTier: PlanTier;
  setSelectedTier: (tier: PlanTier) => void;
  billingCycle: 'weekly' | 'monthly';
  setBillingCycle: (cycle: 'weekly' | 'monthly') => void;
  paymentMode: 'prepaid' | 'autopay';
  setPaymentMode: (mode: 'prepaid' | 'autopay') => void;

  // Checkout & Delivery Details
  deliverySlotLunch: string;
  deliverySlotDinner: string;
  setDeliverySlotLunch: (slot: string) => void;
  setDeliverySlotDinner: (slot: string) => void;
  addresses: Address[];
  selectedAddressId: string;
  addAddress: (address: Address) => void;
  setSelectedAddressId: (id: string) => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (coupon: Coupon | null) => void;

  // Delivery location: the pincode the visitor typed in (no GPS). Persisted.
  currentLocation: UserLocation;
  /** True once the visitor has entered or picked a pincode themselves. */
  locationConfirmed: boolean;
  setCurrentLocation: (location: UserLocation) => void;
  /** Pincode popup: opens on first visit, or from the header picker. Not persisted. */
  isLocationPromptOpen: boolean;
  setLocationPromptOpen: (open: boolean) => void;

  // Navigation drawer state
  isNavDrawerOpen: boolean;
  setNavDrawerOpen: (open: boolean) => void;

  // Mobile Auth Sidebar / Login Drawer state
  isAuthDrawerOpen: boolean;
  setAuthDrawerOpen: (open: boolean) => void;
  /** Sign-in popup (signed-out visitors). Not persisted. */
  signIn: SignInRequest | null;
  openSignIn: (req?: SignInRequest) => void;
  closeSignIn: () => void;

  // Meal Details Bottom Sheet / Modal state (hides bottom nav when open)
  isDetailsModalOpen: boolean;
  setDetailsModalOpen: (open: boolean) => void;


  // Rotating 5-Item Box Checkout State
  activeCheckoutType: 'trial' | 'weekly' | 'monthly' | 'custom' | 'plan';
  setActiveCheckoutType: (type: 'trial' | 'weekly' | 'monthly' | 'custom' | 'plan') => void;
  trialOrder: TrialOrderConfig | null;
  setTrialOrder: (order: TrialOrderConfig | null) => void;
  weeklyOrder: WeeklyOrderConfig | null;
  setWeeklyOrder: (order: WeeklyOrderConfig | null) => void;
  monthlyOrder: MonthlyOrderConfig | null;
  setMonthlyOrder: (order: MonthlyOrderConfig | null) => void;

  // Cart: one box plan + sides & juices. Persisted.
  cartPlan: CartPlan | null;
  cartAddons: CartAddon[];
  setCartPlan: (plan: CartPlan | null) => void;
  /** Adds one (or bumps the qty). */
  addCartAddon: (addon: Omit<CartAddon, 'qty'>) => void;
  /** qty 0 removes it. */
  setCartAddonQty: (id: string, qty: number) => void;
  clearCart: () => void;

  // Computed Calculation Helpers
  getPlanMealCount: () => number;
  getPlanBasePrice: () => number;
  getPlanTotalWeeklyPrice: () => number;
  getSingleDaySurcharge: () => number;
  getDailyBox: (day: DayOfWeek) => Box;
  getDailyTotals: (day: DayOfWeek) => { calories: number; protein: number; carbs: number; fat: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      authReady: false,
      user: emptyProfile,
      setUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
      setAuthProfile: (profile) =>
        set(profile
          ? { isLoggedIn: true, authReady: true, user: profile }
          : { isLoggedIn: false, authReady: true, user: emptyProfile, addresses: [], selectedAddressId: '' }),
      logout: () => set({ isLoggedIn: false, user: emptyProfile, addresses: [], selectedAddressId: '' }),

      isNavDrawerOpen: false,
      setNavDrawerOpen: (open: boolean) => set({ isNavDrawerOpen: open }),

      isAuthDrawerOpen: false,
      // Signed-out visitors get the sign-in popup; the drawer is the signed-in account menu.
      setAuthDrawerOpen: (open: boolean) =>
        set((state) => (open && !state.isLoggedIn ? { signIn: {} } : { isAuthDrawerOpen: open })),

      signIn: null,
      // Leads keep the visitor's pincode even when the caller didn't pass one.
      openSignIn: (req = {}) =>
        set((state) => {
          if (!state.locationConfirmed || req.context?.pincode) return { signIn: req };
          const { area, pincode } = state.currentLocation;
          return { signIn: { ...req, context: { ...req.context, area: area || undefined, pincode } } };
        }),
      closeSignIn: () => set({ signIn: null }),

      isDetailsModalOpen: false,
      setDetailsModalOpen: (open: boolean) => set({ isDetailsModalOpen: open }),

      mealsPerDay: 1,
      setMealsPerDay: (count) =>
        set((state) => {
          const updated = { ...state.dayConfigs };
          (Object.keys(updated) as DayOfWeek[]).forEach((d) => {
            updated[d] = { ...updated[d], boxCount: count };
          });
          return { mealsPerDay: count, dayConfigs: updated };
        }),

      selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      setSelectedDays: (days) => set({ selectedDays: days }),
      toggleDay: (day) =>
        set((state) => {
          const exists = state.selectedDays.includes(day);
          const next = exists
            ? state.selectedDays.filter((d) => d !== day)
            : [...state.selectedDays, day];
          return { selectedDays: next.length === 0 ? [day] : next };
        }),

      dayConfigs: initialDayConfigs,
      setDayConfig: (day, updates) =>
        set((state) => ({
          dayConfigs: {
            ...state.dayConfigs,
            [day]: {
              ...state.dayConfigs[day],
              ...updates,
            },
          },
        })),

      toggleDayEggFree: (day) =>
        set((state) => ({
          dayConfigs: {
            ...state.dayConfigs,
            [day]: {
              ...state.dayConfigs[day],
              isEggFree: !state.dayConfigs[day]?.isEggFree,
            },
          },
        })),

      toggleDaySkipLegume: (day) =>
        set((state) => ({
          dayConfigs: {
            ...state.dayConfigs,
            [day]: {
              ...state.dayConfigs[day],
              skipLegume: !state.dayConfigs[day]?.skipLegume,
            },
          },
        })),

      toggleDayDoubleMain: (day) =>
        set((state) => ({
          dayConfigs: {
            ...state.dayConfigs,
            [day]: {
              ...state.dayConfigs[day],
              doubleMain: !state.dayConfigs[day]?.doubleMain,
            },
          },
        })),

      toggleSideForDay: (day, sideId) =>
        set((state) => {
          const current = state.dayConfigs[day]?.selectedSides || [];
          const next = current.includes(sideId)
            ? current.filter((id) => id !== sideId)
            : [...current, sideId];
          return {
            dayConfigs: {
              ...state.dayConfigs,
              [day]: {
                ...state.dayConfigs[day],
                selectedSides: next,
              },
            },
          };
        }),

      toggleDrinkForDay: (day, drinkId) =>
        set((state) => {
          const current = state.dayConfigs[day]?.selectedDrinks || [];
          const next = current.includes(drinkId)
            ? current.filter((id) => id !== drinkId)
            : [...current, drinkId];
          return {
            dayConfigs: {
              ...state.dayConfigs,
              [day]: {
                ...state.dayConfigs[day],
                selectedDrinks: next,
              },
            },
          };
        }),

      setDayBoxCount: (day, count) =>
        set((state) => ({
          dayConfigs: {
            ...state.dayConfigs,
            [day]: {
              ...state.dayConfigs[day],
              boxCount: count,
            },
          },
        })),

      hasWeeklyJuiceBundle: false,
      setWeeklyJuiceBundle: (enabled) => set({ hasWeeklyJuiceBundle: enabled }),
      hasWeeklySideBundle: false,
      setWeeklySideBundle: (enabled) => set({ hasWeeklySideBundle: enabled }),

      selectedTier: plansData[0] as PlanTier,
      setSelectedTier: (tier) =>
        set((state) => {
          const updated = { ...state.dayConfigs };
          (Object.keys(updated) as DayOfWeek[]).forEach((d) => {
            updated[d] = { ...updated[d], boxCount: tier.mealsPerDay };
          });
          return { selectedTier: tier, mealsPerDay: tier.mealsPerDay, dayConfigs: updated };
        }),

      billingCycle: 'weekly',
      setBillingCycle: (cycle) => set({ billingCycle: cycle }),
      paymentMode: 'prepaid',
      setPaymentMode: (mode) => set({ paymentMode: mode }),

      deliverySlotLunch: "7:00 AM - 9:00 AM",
      deliverySlotDinner: "7:00 PM - 9:00 PM",
      setDeliverySlotLunch: (slot) => set({ deliverySlotLunch: slot }),
      setDeliverySlotDinner: (slot) => set({ deliverySlotDinner: slot }),

      addresses: [],
      selectedAddressId: '',
      addAddress: (address) =>
        set((state) => ({ addresses: [...state.addresses, address] })),
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),

      appliedCoupon: null,
      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),

      currentLocation: defaultLocation,
      locationConfirmed: false,
      setCurrentLocation: (loc) => set({ currentLocation: loc, locationConfirmed: true }),
      isLocationPromptOpen: false,
      setLocationPromptOpen: (open) => set({ isLocationPromptOpen: open }),

      // Rotating 5-Item Box Checkout State
      activeCheckoutType: 'trial',
      setActiveCheckoutType: (type) => set({ activeCheckoutType: type }),
      trialOrder: null,
      setTrialOrder: (order) => set({ trialOrder: order, activeCheckoutType: 'trial' }),
      weeklyOrder: null,
      setWeeklyOrder: (order) => set({ weeklyOrder: order, activeCheckoutType: 'weekly' }),
      monthlyOrder: null,
      setMonthlyOrder: (order) => set({ monthlyOrder: order, activeCheckoutType: 'monthly' }),

      cartPlan: null,
      cartAddons: [],
      setCartPlan: (plan) => set({ cartPlan: plan }),
      addCartAddon: (addon) =>
        set((state) => {
          const id = addonKey(addon.id);
          const existing = state.cartAddons.find((a) => a.id === id);
          return {
            cartAddons: existing
              ? state.cartAddons.map((a) => (a.id === id ? { ...a, qty: Math.min(a.qty + 1, MAX_ADDON_QTY) } : a))
              : [...state.cartAddons, { ...addon, id, qty: 1 }].slice(0, 10),
          };
        }),
      setCartAddonQty: (id, qty) =>
        set((state) => ({
          cartAddons: qty <= 0
            ? state.cartAddons.filter((a) => a.id !== id)
            : state.cartAddons.map((a) => (a.id === id ? { ...a, qty: Math.min(qty, MAX_ADDON_QTY) } : a)),
        })),
      clearCart: () => set({ cartPlan: null, cartAddons: [] }),

      getPlanMealCount: () => {
        const { selectedDays, dayConfigs } = get();
        let total = 0;
        selectedDays.forEach((d) => {
          const cfg = dayConfigs[d];
          total += cfg ? cfg.boxCount : 1;
        });
        return total;
      },

      getSingleDaySurcharge: () => {
        const { selectedDays } = get();
        return selectedDays.length === 1 ? 30 : 0;
      },

      getDailyBox: (day: DayOfWeek) => {
        const boxes = boxesData as Box[];
        return boxes.find((b) => b.day === day) || boxes[0];
      },

      getPlanBasePrice: () => {
        const { selectedDays, dayConfigs } = get();
        const boxes = boxesData as Box[];
        const sides = sidesData as SideBox[];
        const addons = addonsData as AddonDrink[];

        let sum = 0;
        selectedDays.forEach((day) => {
          const cfg = dayConfigs[day];
          const box = boxes.find((b) => b.day === day) || boxes[0];
          const count = cfg ? cfg.boxCount : 1;
          sum += box.price * count;

          if (cfg?.doubleMain) {
            sum += 80 * count;
          }

          if (cfg?.selectedSides) {
            cfg.selectedSides.forEach((sideId) => {
              const s = sides.find((item) => item.id === sideId);
              if (s) sum += s.price;
            });
          }

          if (cfg?.selectedDrinks) {
            cfg.selectedDrinks.forEach((drinkId) => {
              const d = addons.find((item) => item.id === drinkId);
              if (d) sum += d.price;
            });
          }
        });
        return sum;
      },

      getPlanTotalWeeklyPrice: () => {
        const {
          selectedDays,
          dayConfigs,
          billingCycle,
          hasWeeklyJuiceBundle,
          hasWeeklySideBundle,
          getSingleDaySurcharge,
        } = get();
        const boxes = boxesData as Box[];
        const sides = sidesData as SideBox[];
        const addons = addonsData as AddonDrink[];

        let boxSubtotal = 0;
        let extrasSubtotal = 0;

        selectedDays.forEach((day) => {
          const cfg = dayConfigs[day];
          const box = boxes.find((b) => b.day === day) || boxes[0];
          const count = cfg ? cfg.boxCount : 1;
          boxSubtotal += box.price * count;

          if (cfg?.doubleMain) {
            extrasSubtotal += 80 * count;
          }

          if (cfg?.selectedSides) {
            cfg.selectedSides.forEach((sideId) => {
              const s = sides.find((item) => item.id === sideId);
              if (s) extrasSubtotal += s.price;
            });
          }

          if (cfg?.selectedDrinks) {
            cfg.selectedDrinks.forEach((drinkId) => {
              const d = addons.find((item) => item.id === drinkId);
              if (d) extrasSubtotal += d.price;
            });
          }
        });

        // Weekly discount of 9% if 6 days, or monthly 10%
        let discountRate = 0;
        if (billingCycle === 'monthly') {
          discountRate = 0.10;
        } else if (selectedDays.length >= 6) {
          discountRate = 0.09;
        }

        const discountedBoxTotal = Math.round(boxSubtotal * (1 - discountRate));
        let total = discountedBoxTotal + extrasSubtotal + getSingleDaySurcharge();

        if (hasWeeklyJuiceBundle) {
          total += 299;
        }
        if (hasWeeklySideBundle) {
          total += 999;
        }

        return total;
      },

      getDailyTotals: (day: DayOfWeek) => {
        const { dayConfigs, getDailyBox } = get();
        const cfg = dayConfigs[day];
        const box = getDailyBox(day);
        const sides = sidesData as SideBox[];
        const addons = addonsData as AddonDrink[];

        const isEggFree = cfg?.isEggFree || false;
        const boxCount = cfg?.boxCount || 1;
        const doubleMain = cfg?.doubleMain || false;

        let calories = isEggFree ? box.eggFreeVersion.calories : box.totals.calories;
        let protein = isEggFree ? box.eggFreeVersion.protein : box.totals.protein;
        let carbs = isEggFree ? box.eggFreeVersion.carbs : box.totals.carbs;
        let fat = isEggFree ? box.eggFreeVersion.fat : box.totals.fat;

        if (doubleMain) {
          calories += 180;
          protein += 24;
          fat += 6;
          carbs += 2;
        }

        calories *= boxCount;
        protein *= boxCount;
        carbs *= boxCount;
        fat *= boxCount;

        if (cfg?.selectedSides) {
          cfg.selectedSides.forEach((sideId) => {
            const s = sides.find((item) => item.id === sideId);
            if (s) {
              calories += s.calories;
              protein += s.protein;
              carbs += s.carbs;
              fat += s.fat;
            }
          });
        }

        if (cfg?.selectedDrinks) {
          cfg.selectedDrinks.forEach((drinkId) => {
            const d = addons.find((item) => item.id === drinkId);
            if (d) {
              calories += d.calories;
              protein += d.protein;
              carbs += d.carbs;
            }
          });
        }

        return { calories, protein, carbs, fat };
      },
    }),
    {
      name: 'brotinbox-v2', // v2: drops the old demo user saved by earlier builds
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        mealsPerDay: state.mealsPerDay,
        selectedDays: state.selectedDays,
        dayConfigs: state.dayConfigs,
        hasWeeklyJuiceBundle: state.hasWeeklyJuiceBundle,
        hasWeeklySideBundle: state.hasWeeklySideBundle,
        selectedTier: state.selectedTier,
        billingCycle: state.billingCycle,
        paymentMode: state.paymentMode,
        activeCheckoutType: state.activeCheckoutType,
        trialOrder: state.trialOrder,
        weeklyOrder: state.weeklyOrder,
        monthlyOrder: state.monthlyOrder,
        cartPlan: state.cartPlan,
        cartAddons: state.cartAddons,
        currentLocation: state.currentLocation,
        locationConfirmed: state.locationConfirmed,
      }),
    }
  )
);
