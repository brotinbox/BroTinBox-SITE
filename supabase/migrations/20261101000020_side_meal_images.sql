-- Side meal photos moved from Unsplash to R2 (scripts/build-side-images.mjs). Matches data/sides.json.
update public.addons a set image_url = v.image_url
from (values
  ('grilled-chicken-with-salad', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/side-meals/grilled-chicken-with-salad-5c08006ba6.webp'),
  ('chicken-salad', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/side-meals/chicken-salad-93f49ba125.webp'),
  ('chicken-post-workout-meal', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/side-meals/chicken-post-workout-meal-51988bb2ca.webp'),
  ('grilled-paneer-with-salad', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/side-meals/grilled-paneer-with-salad-798dc1dec3.webp'),
  ('paneer-salad', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/side-meals/paneer-salad-2d984910e7.webp'),
  ('paneer-post-workout-meal', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/side-meals/paneer-post-workout-meal-445a416e8b.webp')
) v(slug, image_url)
where a.slug = v.slug and a.type = 'side';
