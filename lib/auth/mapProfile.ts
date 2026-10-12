import type { Address, UserProfile } from '@/types';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type AddressRow = Database['public']['Tables']['addresses']['Row'];

function ageFrom(dob: string | null): number {
  if (!dob) return 0;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return Math.max(0, age);
}

/** DB profile row → the UserProfile shape the existing UI components use. */
export function toUserProfile(p: ProfileRow): UserProfile {
  return {
    id: p.id,
    phone: p.phone ?? '',
    fullName: p.full_name ?? '',
    email: p.email ?? undefined,
    avatarUrl: p.avatar_url ?? undefined,
    goal: (p.goal as UserProfile['goal']) ?? 'stay-fit',
    gender: (p.gender as UserProfile['gender']) ?? 'other',
    age: ageFrom(p.date_of_birth),
    weightKg: Number(p.weight_kg ?? 0),
    targetWeightKg: p.target_weight_kg != null ? Number(p.target_weight_kg) : undefined,
    heightCm: Number(p.height_cm ?? 0),
    activityLevel: (p.activity_level as UserProfile['activityLevel']) ?? 'moderately-active',
    dietType: (p.diet_type as UserProfile['dietType']) ?? 'non-veg',
    allergies: p.allergies ?? [],
    dislikedIngredients: p.disliked_ingredients ?? [],
    mealsPerDay: 1,
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    calculatedTargets: {
      calories: p.target_calories ?? 0,
      protein: p.target_protein ?? 0,
      carbs: p.target_carbs ?? 0,
      fat: p.target_fat ?? 0,
    },
    isOnboarded: p.is_onboarded,
  };
}

export function toAddress(a: AddressRow): Address {
  return {
    id: a.id,
    name: a.recipient_name,
    phone: a.phone,
    tag: a.label as Address['tag'],
    flatNumber: a.flat,
    street: a.street,
    landmark: a.landmark ?? undefined,
    area: a.area,
    pincode: a.pincode,
    city: a.city,
    deliveryInstructions: a.instructions ?? undefined,
    isDefault: a.is_default,
  };
}
