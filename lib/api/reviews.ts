import { Review } from "@/types";
import { getSupabasePublic } from "@/lib/supabase/server";

/** Approved customer reviews only (moderated in admin › Reviews). */
export async function getReviews(): Promise<Review[]> {
  const { data } = await getSupabasePublic()
    .from("reviews")
    .select("id, name, area, avatar_url, rating, comment, goal, meals_delivered, created_at")
    .eq("status", "approved")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? []).map((r) => ({
    id: r.id,
    userName: r.name,
    area: r.area ?? "Coimbatore",
    avatar: r.avatar_url ?? "/logo.png",
    rating: r.rating,
    date: r.created_at,
    comment: r.comment,
    goal: r.goal ?? "",
    mealsDeliveredCount: r.meals_delivered ?? 0,
  }));
}
