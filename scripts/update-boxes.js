const fs = require('fs');
const path = require('path');

const menu30DayPath = path.join(__dirname, '..', 'data', 'menu-30day.json');
const boxesPath = path.join(__dirname, '..', 'data', 'boxes.json');

const menuData = JSON.parse(fs.readFileSync(menu30DayPath, 'utf-8'));
const currentBoxes = JSON.parse(fs.readFileSync(boxesPath, 'utf-8'));

const dayBoxSlugs = [
  { day: 'Mon', id: 'box-mon', slug: 'power-chicken-box', dayNum: 1, isVeg: false },
  { day: 'Tue', id: 'box-tue', slug: 'paneer-balance-box', dayNum: 2, isVeg: true },
  { day: 'Wed', id: 'box-wed', slug: 'lean-fish-box', dayNum: 3, isVeg: false },
  { day: 'Thu', id: 'box-thu', slug: 'tikka-chicken-box', dayNum: 4, isVeg: false },
  { day: 'Fri', id: 'box-fri', slug: 'soya-strong-box', dayNum: 5, isVeg: false },
  { day: 'Sat', id: 'box-sat', slug: 'paneer-tikka-box', dayNum: 6, isVeg: false },
];

const updatedBoxes = dayBoxSlugs.map((cfg) => {
  const dayEntry = menuData.days.find((d) => d.day === cfg.dayNum);
  const src = cfg.isVeg ? dayEntry.veg : dayEntry.nonVeg;
  const oldBox = currentBoxes.find((b) => b.id === cfg.id) || {};

  const items = [
    {
      type: 'main',
      name: src.items.main.name,
      grams: src.items.main.grams,
      calories: src.items.main.calories,
      protein: src.items.main.protein,
      carbs: src.items.main.carbs,
      fat: src.items.main.fat,
      image: src.items.main.image,
    },
    {
      type: cfg.isVeg ? 'curd' : 'egg',
      name: src.items.proteinSide.name,
      grams: src.items.proteinSide.grams,
      calories: src.items.proteinSide.calories,
      protein: src.items.proteinSide.protein,
      carbs: src.items.proteinSide.carbs,
      fat: src.items.proteinSide.fat,
      image: src.items.proteinSide.image,
    },
    {
      type: 'legume',
      name: src.items.legume.name,
      grams: src.items.legume.grams,
      calories: src.items.legume.calories,
      protein: src.items.legume.protein,
      carbs: src.items.legume.carbs,
      fat: src.items.legume.fat,
      image: src.items.legume.image,
    },
    {
      type: 'salad',
      name: src.items.salad.name,
      grams: src.items.salad.grams,
      calories: src.items.salad.calories,
      protein: src.items.salad.protein,
      carbs: src.items.salad.carbs,
      fat: src.items.salad.fat,
      image: src.items.salad.image,
    },
    {
      type: 'carb',
      name: src.items.carb.name,
      grams: src.items.carb.grams,
      calories: src.items.carb.calories,
      protein: src.items.carb.protein,
      carbs: src.items.carb.carbs,
      fat: src.items.carb.fat,
      image: src.items.carb.image,
    },
  ];

  return {
    id: cfg.id,
    slug: cfg.slug,
    name: src.items.main.name + ' Box',
    day: cfg.day,
    image: oldBox.image || src.items.main.image,
    images: oldBox.images || [src.items.main.image],
    description: `${src.items.main.name} (${src.items.main.cookedState || src.items.main.grams + 'g'}), ${src.items.proteinSide.name}, ${src.items.legume.name}, ${src.items.salad.name}, and ${src.items.carb.name}.`,
    isVeg: cfg.isVeg,
    containsEgg: !cfg.isVeg,
    tags: cfg.isVeg
      ? ['High Protein', 'Vegetarian', 'BroTin Box Calibrated']
      : ['High Protein', cfg.dayNum === 6 ? 'Fish' : 'Chicken', 'BroTin Box Calibrated'],
    allergens: src.allergens,
    freeFrom: cfg.isVeg ? ['Meat-free', 'Refined sugar-free'] : ['Dairy-free', 'Refined sugar-free'],
    price: cfg.isVeg ? 289 : 319,
    totals: {
      calories: src.totals.calories,
      protein: src.totals.protein,
      carbs: src.totals.carbs,
      fat: src.totals.fat,
      weightG: src.totals.weightG,
    },
    items,
    benefits: [
      `${src.totals.protein}g complete protein for sustained muscle recovery`,
      `Calibrated macros: ${src.totals.calories} kcal with measured complex carbs and healthy fats`,
      `Zero added preservatives, cooked fresh each morning in Coimbatore`,
    ],
    eggFreeVersion: cfg.isVeg
      ? undefined
      : {
          description: `Replaces 2 boiled eggs with an extra portion of tender ${src.items.legume.name} (+80g)`,
          extraLegumeName: `Extra ${src.items.legume.name}`,
          price: 319,
          calories: src.totals.calories - 30,
          protein: src.totals.protein - 6,
          carbs: src.totals.carbs + 15,
          fat: src.totals.fat - 8,
        },
    suggestedSides: oldBox.suggestedSides || ['side-grilled-chicken'],
    suggestedAddons: oldBox.suggestedAddons || ['drink-beetroot'],
    labVerifiedNote: 'All macros calibrated to the BroTin Box 30-Day Master Menu. Digital kitchen weighed. Lab verification certificate pending batch release.',
  };
});

fs.writeFileSync(boxesPath, JSON.stringify(updatedBoxes, null, 2), 'utf-8');
console.log('Successfully updated data/boxes.json to match BroTin Box 30-day menu Cycle 1');
