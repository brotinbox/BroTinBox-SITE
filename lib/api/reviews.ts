import { unstable_cache } from "next/cache";
import { Review } from "@/types";
import { getSupabasePublic } from "@/lib/supabase/server";

/**
 * Approved customer reviews only (moderated in admin › Reviews; approval needs
 * the customer's consent, migration 0047). Cached under the "reviews" tag,
 * which the admin save action revalidates.
 */
export const getReviews = unstable_cache(
  async (): Promise<Review[]> => {
    const { data } = await getSupabasePublic()
      .from("reviews")
      .select("id, name, area, avatar_url, rating, comment, goal, meals_delivered, source, created_at")
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);
    return (data ?? []).map((r) => ({
      id: r.id,
      userName: r.name,
      area: r.area ?? "Coimbatore",
      avatar: r.avatar_url ?? "",
      rating: r.rating,
      date: r.created_at,
      comment: r.comment,
      goal: r.goal ?? "",
      mealsDeliveredCount: r.meals_delivered ?? 0,
      source: r.source,
    }));
  },
  ["reviews-approved"],
  { tags: ["reviews"], revalidate: 3600 },
);
