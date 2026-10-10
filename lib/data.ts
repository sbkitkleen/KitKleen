export const careLevels = [
  {
    id: "fresh",
    name: "KITKLEEN Fresh",
    subtitle: "Essential Care",
    benefits: [
      "Dust removal",
      "Odour removal",
      "Sanitise and Disinfect",
      "Air circulated drying",
    ],
  },
  {
    id: "deep",
    name: "KITKLEEN Deep",
    subtitle: "Deep Care",
    benefits: [
      "Dust removal",
      "Odour removal",
      "Sanitise and Disinfect",
      "Foam Cleaning",
      "Sweat residue removal",
      "Air circulated drying",
    ],
  },
  {
    id: "elite",
    name: "KITKLEEN Elite",
    subtitle: "Premium Pro Care",
    benefits: [
      "Dust removal",
      "Odour removal",
      "Sanitise and Disinfect",
      "Foam Cleaning",
      "Stain Removal",
      "Sweat buildup removal",
      "Leather conditioning",
      "Air circulated drying",
      "Polish finish",
    ],
  },
] as const;

export type CareLevelId = (typeof careLevels)[number]["id"];
export type GearPrices = Record<CareLevelId, number>;

type GearItem = {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  prices: GearPrices;
  benefits?: Partial<Record<CareLevelId, string>>;
};

const gear = [
  {
    id: "pads",
    name: "Cricket Pads",
    category: "Cricket Gear",
    icon: "◫",
    description: "Cricket pads",
    prices: { fresh: 99, deep: 149, elite: 199 },
    benefits: { fresh: "Dust removal", deep: "Dust removal", elite: "Dust removal" },
  },
  {
    id: "bike-helmet",
    name: "Bike Helmet",
    category: "Helmets",
    icon: "◉",
    description: "Bike helmet",
    prices: { fresh: 59, deep: 79, elite: 99 },
    benefits: { fresh: "Odour removal", deep: "Odour removal", elite: "Odour removal" },
  },
  {
    id: "sports-helmet",
    name: "Sports Helmet",
    category: "Helmets",
    icon: "◉",
    description: "Sports helmet",
    prices: { fresh: 49, deep: 69, elite: 89 },
    benefits: { fresh: "Sanitise and Disinfect", deep: "Sanitise and Disinfect", elite: "Sanitise and Disinfect" },
  },
  {
    id: "sports-gloves",
    name: "Sports Gloves",
    category: "Gloves",
    icon: "✦",
    description: "Sports gloves",
    prices: { fresh: 69, deep: 99, elite: 129 },
    benefits: { fresh: "Air circulated drying", deep: "Foam Cleaning", elite: "Foam Cleaning" },
  },
  {
    id: "keeper-gloves",
    name: "Keeper Gloves (with Inners)",
    category: "Gloves",
    icon: "✦",
    description: "Keeper gloves with inners",
    prices: { fresh: 99, deep: 129, elite: 159 },
    benefits: { deep: "Sweat residue removal", elite: "Stain Removal" },
  },
  {
    id: "thigh-pair",
    name: "Thigh Guard Pair",
    category: "Protective Gear",
    icon: "▱",
    description: "Thigh guard pair",
    prices: { fresh: 59, deep: 79, elite: 99 },
    benefits: { deep: "Air circulated drying", elite: "Sweat buildup removal" },
  },
  {
    id: "thigh-single",
    name: "Thigh Guard Single",
    category: "Protective Gear",
    icon: "▱",
    description: "Thigh guard single",
    prices: { fresh: 49, deep: 69, elite: 89 },
    benefits: { elite: "Leather conditioning" },
  },
  {
    id: "elbow",
    name: "Elbow Guard",
    category: "Protective Gear",
    icon: "◌",
    description: "Elbow guard",
    prices: { fresh: 39, deep: 59, elite: 79 },
    benefits: { elite: "Air circulated drying" },
  },
  {
    id: "chest",
    name: "Chest Guard",
    category: "Protective Gear",
    icon: "◇",
    description: "Chest guard",
    prices: { fresh: 49, deep: 69, elite: 89 },
    benefits: { elite: "Leather conditioning" },
  },
  {
    id: "shin",
    name: "Shin Guard",
    category: "Protective Gear",
    icon: "▥",
    description: "Shin guard",
    prices: { fresh: 39, deep: 59, elite: 79 },
    benefits: { elite: "Polish finish" },
  },
  {
    id: "sleeves",
    name: "Sleeves",
    category: "Apparel & Support",
    icon: "╱",
    description: "Sleeves",
    prices: { fresh: 39, deep: 59, elite: 79 },
  },
  {
    id: "supporters",
    name: "Supporters",
    category: "Apparel & Support",
    icon: "≈",
    description: "Supporters",
    prices: { fresh: 49, deep: 69, elite: 89 },
  },
  {
    id: "cricket-shoes-non-spike",
    name: "Cricket Shoes (Non-spike)",
    category: "Footwear",
    icon: "⌁",
    description: "Cricket shoes (non-spike)",
    prices: { fresh: 99, deep: 149, elite: 199 },
  },
  {
    id: "cricket-shoes-spike",
    name: "Cricket Shoes (Spike)",
    category: "Footwear",
    icon: "⌁",
    description: "Cricket shoes (spike)",
    prices: { fresh: 129, deep: 159, elite: 189 },
  },
  {
    id: "studded-boots-cleats",
    name: "Studded Boots (Cleats)",
    category: "Footwear",
    icon: "⌁",
    description: "Studded boots (cleats)",
    prices: { fresh: 99, deep: 149, elite: 199 },
  },
  {
    id: "studded-boots-spike",
    name: "Studded Boots (Spike)",
    category: "Footwear",
    icon: "⌁",
    description: "Studded boots (spike)",
    prices: { fresh: 129, deep: 159, elite: 189 },
  },
  {
    id: "track-field-spikes",
    name: "Track & Field Spikes",
    category: "Footwear",
    icon: "⌁",
    description: "Track & field spikes",
    prices: { fresh: 129, deep: 159, elite: 189 },
  },
  {
    id: "running-shoes",
    name: "Running Shoes",
    category: "Footwear",
    icon: "⌁",
    description: "Running shoes",
    prices: { fresh: 99, deep: 149, elite: 199 },
  },
  {
    id: "court-shoes",
    name: "Court Shoes",
    category: "Footwear",
    icon: "⌁",
    description: "Court shoes",
    prices: { fresh: 99, deep: 149, elite: 199 },
  },
  {
    id: "yoga-mat",
    name: "Yoga Mat",
    category: "Training & Recovery",
    icon: "▤",
    description: "Yoga mat",
    prices: { fresh: 69, deep: 99, elite: 129 },
  },
] as const satisfies readonly GearItem[];

export const services = gear;

export const bags = [
  {
    id: "bag-small",
    name: "Small",
    category: "Kit Bag",
    icon: "▣",
    description: "Kit Bag — Small",
    size: "Small",
    prices: { fresh: 99, deep: 129, elite: 159 },
  },
  {
    id: "bag-medium",
    name: "Medium",
    category: "Kit Bag",
    icon: "▣",
    description: "Kit Bag — Medium",
    size: "Medium",
    prices: { fresh: 129, deep: 159, elite: 199 },
  },
  {
    id: "bag-large",
    name: "Large",
    category: "Kit Bag",
    icon: "▣",
    description: "Kit Bag — Large",
    size: "Large",
    prices: { fresh: 159, deep: 199, elite: 239 },
  },
  {
    id: "bag-xl",
    name: "Extra Large",
    category: "Kit Bag",
    icon: "▣",
    description: "Kit Bag — Extra Large",
    size: "Extra Large",
    prices: { fresh: 199, deep: 239, elite: 269 },
  },
] as const satisfies readonly (GearItem & { size: string })[];

export const kitPackages = [
  {
    id: "batting-kit",
    name: "Cricket Kit",
    includes: [
      "Pair of pads (only batting)",
      "Pair of gloves (only batting)",
      "1 helmet",
      "Thigh guard pair",
      "Kit bag up to Large",
    ],
    originalPrices: { fresh: 435, deep: 595, elite: 755 } satisfies GearPrices,
    prices: { fresh: 299, deep: 399, elite: 549 } satisfies GearPrices,
  },
  {
    id: "extended-kit",
    name: "Wicket Keeper Batsman Kit",
    includes: [
      "Pair of pads (only batting)",
      "Pair of gloves (only batting)",
      "Pair of wicket-keeping gloves",
      "Pair of wicket-keeping pads",
      "1 helmet",
      "Thigh guard pair",
      "Kit bag up to Large",
    ],
    originalPrices: { fresh: 633, deep: 873, elite: 1113 } satisfies GearPrices,
    prices: { fresh: 449, deep: 599, elite: 749 } satisfies GearPrices,
  },
] as const;

export const packages = kitPackages.flatMap((kit) =>
  careLevels.map((careLevel) => ({
    id: `${kit.id}-${careLevel.id}`,
    kitId: kit.id,
    name: kit.name,
    careLevelId: careLevel.id,
    careLevelName: careLevel.name,
    price: kit.prices[careLevel.id],
    includes: kit.includes,
  }))
);

export const academyClubDiscountTiers = [
  { discount: "5%", eligibility: "Up to 5 kits" },
  { discount: "10%", eligibility: "More than 5 kits" },
] as const;

export const academyClubDiscountExplanation =
  "The applicable academy/club discount is available on every qualifying order above ₹299. Academy/club discounts are separate from squad-day discounts and cannot be combined with other promotional offers.";

export const academyClubDiscountFaqAnswer =
  "Academies and clubs receive a 5% discount on qualifying orders of up to 5 kits and a 10% discount on qualifying orders of more than 5 kits. The discount is available on every qualifying order above ₹299. Academy/club discounts cannot be combined with squad-day, referral, festival or other promotional offers.";

export const navItems = [
  ["Home", "/"],
  ["Services", "/services"],
  ["Gear Care", "/gear-care"],
  ["Subscriptions", "/subscriptions"],
  ["Offers", "/offers"],
  ["About Us", "/about"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
] as const;
