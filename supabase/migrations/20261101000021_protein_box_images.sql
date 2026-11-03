-- Protein box photos moved to R2 (scripts/build-box-images.mjs). Matches data/menu-30day.json.
update public.menu_items i set image_url = v.image_url
from (values
  ('NVM1', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/nvm1-6c9673195a.webp'),
  ('NVM2', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/nvm2-8fa393d506.webp'),
  ('NVM3', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/nvm3-cb8487a057.webp'),
  ('NVM4', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/nvm4-21388bdef9.webp'),
  ('NVM5', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/nvm5-c1b1ce4fda.webp'),
  ('NVM6', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/nvm6-8d87b4b931.webp'),
  ('VM1', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm1-d6acadca3c.webp'),
  ('VM2', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm2-deccdb805e.webp'),
  ('VM3', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm3-60224cd956.webp'),
  ('VM4', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm4-996fba763e.webp'),
  ('VM5', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm5-d68f1ef279.webp'),
  ('VM6', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm6-54a5a52d75.webp'),
  ('VM7', 'https://pub-1b9c6ce71cb94cd0b8806abae4db0eb0.r2.dev/protein-boxes/vm7-bcf605e1d4.webp')
) v(code, image_url)
where i.code = v.code;
