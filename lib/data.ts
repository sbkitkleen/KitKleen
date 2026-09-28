export const services = [
  {
    "id": "pads",
    "name": "Cricket Pads",
    "price": 99,
    "category": "Cricket",
    "icon": "\u25eb",
    "description": "Pads, straps and hard-to-reach seams."
  },
  {
    "id": "bike-helmet",
    "name": "Bike Helmet",
    "price": 99,
    "category": "Helmet",
    "icon": "\u25c9",
    "description": "Freshen the shell and interior padding."
  },
  {
    "id": "sports-helmet",
    "name": "Sports Helmet",
    "price": 90,
    "category": "Helmet",
    "icon": "\u25c9",
    "description": "Care for sports helmet liners and shells."
  },
  {
    "id": "sports-gloves",
    "name": "Sports Gloves",
    "price": 99,
    "category": "Gloves",
    "icon": "\u2726",
    "description": "Clean palms and ventilate the lining."
  },
  {
    "id": "thigh-pair",
    "name": "Thigh Guard \u2014 Pair",
    "price": 50,
    "category": "Protection",
    "icon": "\u25b1",
    "description": "Pair of guards, refreshed with care."
  },
  {
    "id": "thigh-single",
    "name": "Thigh Guard \u2014 Single",
    "price": 35,
    "category": "Protection",
    "icon": "\u25b1",
    "description": "Single guard, refreshed with care."
  },
  {
    "id": "elbow",
    "name": "Elbow Guard",
    "price": 30,
    "category": "Protection",
    "icon": "\u25cc",
    "description": "Material-conscious care for protection."
  },
  {
    "id": "chest",
    "name": "Chest Guard",
    "price": 50,
    "category": "Protection",
    "icon": "\u25c7",
    "description": "A careful clean for protective layers."
  },
  {
    "id": "shin",
    "name": "Shin Guard",
    "price": 50,
    "category": "Protection",
    "icon": "\u25a5",
    "description": "Refresh guards between training sessions."
  },
  {
    "id": "shoes",
    "name": "Shoes",
    "price": 99,
    "category": "Footwear",
    "icon": "\u2301",
    "description": "Lift dirt and odour from sports shoes."
  },
  {
    "id": "keeper-gloves",
    "name": "Keeper Gloves + Inners",
    "price": 120,
    "category": "Gloves",
    "icon": "\u2726",
    "description": "Keeper gloves cleaned with inner gloves."
  },
  {
    "id": "sleeves",
    "name": "Sleeves",
    "price": 30,
    "category": "Apparel",
    "icon": "\u2215",
    "description": "A fresh start for your match-day sleeves."
  },
  {
    "id": "supporters",
    "name": "Supporters",
    "price": 50,
    "category": "Apparel",
    "icon": "\u2248",
    "description": "Clean, comfortable support gear."
  }
] as const;
export const bags = [
  {
    "id": "bag-small",
    "name": "Kit Bag \u2014 Small",
    "price": 99,
    "description": "Clean out kit-day dust and odour."
  },
  {
    "id": "bag-medium",
    "name": "Kit Bag \u2014 Medium",
    "price": 129,
    "description": "Care for everyday training kit."
  },
  {
    "id": "bag-large",
    "name": "Kit Bag \u2014 Large",
    "price": 159,
    "description": "Room for a full match-day setup."
  },
  {
    "id": "bag-xl",
    "name": "Kit Bag \u2014 Extra Large",
    "price": 199,
    "description": "Deep care for your largest gear bag."
  }
] as const;
export const packages = [
  {
    "id": "deep-clean",
    "name": "Full Kit Deep Clean",
    "price": 399,
    "tag": "DEEP CLEAN",
    "description": "A complete clean for the kit you rely on.",
    "includes": ["Dirt removal", "Stain removal", "Odour removal"]
  },
  {
    "id": "pro-care",
    "name": "Full Kit Pro Care+",
    "price": 599,
    "tag": "PRO CARE+",
    "description": "Deep cleaning with added restoration care.",
    "includes": ["Dirt removal", "Stain removal", "Odour removal", "Minor repair and care", "Leather conditioner", "Fragrance"]
  }
] as const;

export const navItems = [
  ["Home","/"],
  ["Services","/services"],
  ["Pricing","/pricing"],
  ["Subscriptions","/subscriptions"],
  ["Offers","/offers"],
  ["About Us","/about"],
  ["FAQ","/faq"],
  ["Contact","/contact"],
] as const;
