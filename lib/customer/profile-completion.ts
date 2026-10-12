import { calculateMacros } from '@/lib/macro-calculator';
import type { Database } from '@/types/database';
import type { GoalType } from '@/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type ActivityLevel = 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active';

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age > 0 ? age : null;
}

/**
 * Onboarding only asks for goal and diet; everything else is optional and
 * collected later. This scores how much we know so the dashboard can nudge
 * the customer to fill the rest in.
 */
export function profileCompletion(p: ProfileRow, hasAddress: boolean) {
  const items = [
    { key: 'name', label: 'Name', done: !!p.full_name?.trim() },
    { key: 'phone', label: 'Mobile', done: !!p.phone },
    { key: 'goal', label: 'Goal', done: !!p.goal },
    { key: 'diet', label: 'Diet', done: !!p.diet_type },
    { key: 'gender', label: 'Gender', done: !!p.gender },
    { key: 'age', label: 'Age', done: !!p.date_of_birth },
    { key: 'height', label: 'Height', done: p.height_cm != null },
    { key: 'weight', label: 'Weight', done: p.weight_kg != null },
    { key: 'activity', label: 'Activity level', done: !!p.activity_level },
    { key: 'address', label: 'Delivery address', done: hasAddress },
  ];
  const done = items.filter((i) => i.done).length;
  return {
    percent: Math.round((done / items.length) * 100),
    missing: items.filter((i) => !i.done).map((i) => i.label),
  };
}

/**
 * Targets need height, weight and age. Gender and activity fall back to
 * neutral defaults so a partly filled profile still gets a useful estimate.
 */
export function targetsFor(v: {
  goal: string | null; gender: string | null; age: number | null;
  heightCm: number | null; weightKg: number | null; activityLevel: string | null;
}) {
  if (!v.age || !v.heightCm || !v.weightKg) return null;
  const c = calculateMacros({
    goal: (v.goal ?? 'stay-fit') as GoalType,
    gender: (v.gender ?? 'other') as 'male' | 'female' | 'other',
    age: v.age,
    heightCm: v.heightCm,
    weightKg: v.weightKg,
    activityLevel: (v.activityLevel ?? 'lightly-active') as ActivityLevel,
  });
  return { target_calories: c.targetCalories, target_protein: c.proteinG, target_carbs: c.carbsG, target_fat: c.fatG };
}
