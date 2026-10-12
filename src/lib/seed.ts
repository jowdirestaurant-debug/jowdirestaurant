import { db } from "@/db";
import {
  categories,
  deliveryAggregators,
  governorates,
  itemSizes,
  menuItems,
  popups,
  promoCodes,
  regions,
  settings,
  staff,
} from "@/db/schema";
import { hashPassword } from "./auth";
import { ALL_PERMISSIONS, DEFAULT_SETTINGS } from "./types";

const IMG = {
  grill: "https://images.pexels.com/photos/17303312/pexels-photo-17303312.jpeg?auto=compress&cs=tinysrgb&w=1200",
  kebab: "https://images.pexels.com/photos/29935500/pexels-photo-29935500.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shish: "https://images.pexels.com/photos/15388082/pexels-photo-15388082.jpeg?auto=compress&cs=tinysrgb&w=1200",
  mixed: "https://images.pexels.com/photos/33469325/pexels-photo-33469325.jpeg?auto=compress&cs=tinysrgb&w=1200",
  mandi: "https://images.pexels.com/photos/36949137/pexels-photo-36949137.jpeg?auto=compress&cs=tinysrgb&w=1200",
  biryani: "https://images.pexels.com/photos/14731625/pexels-photo-14731625.jpeg?auto=compress&cs=tinysrgb&w=1200",
  feast: "https://images.pexels.com/photos/30119016/pexels-photo-30119016.jpeg?auto=compress&cs=tinysrgb&w=1200",
  hummus: "https://images.pexels.com/photos/11842138/pexels-photo-11842138.jpeg?auto=compress&cs=tinysrgb&w=1200",
  mezze: "https://images.pexels.com/photos/32080914/pexels-photo-32080914.jpeg?auto=compress&cs=tinysrgb&w=1200",
  mediterranean: "https://images.pexels.com/photos/34624141/pexels-photo-34624141.jpeg?auto=compress&cs=tinysrgb&w=1200",
  kunafa: "https://images.pexels.com/photos/37740840/pexels-photo-37740840.jpeg?auto=compress&cs=tinysrgb&w=1200",
  kunafa2: "https://images.pexels.com/photos/36691305/pexels-photo-36691305.jpeg?auto=compress&cs=tinysrgb&w=1200",
  baklava: "https://images.pexels.com/photos/15794034/pexels-photo-15794034.jpeg?auto=compress&cs=tinysrgb&w=1200",
  seafood: "https://images.pexels.com/photos/5041489/pexels-photo-5041489.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shrimp: "https://images.pexels.com/photos/39035466/pexels-photo-39035466.jpeg?auto=compress&cs=tinysrgb&w=1200",
  mint: "https://images.pexels.com/photos/18142599/pexels-photo-18142599.jpeg?auto=compress&cs=tinysrgb&w=1200",
  smoothie: "https://images.pexels.com/photos/17612826/pexels-photo-17612826.jpeg?auto=compress&cs=tinysrgb&w=1200",
  citrus: "https://images.pexels.com/photos/9259573/pexels-photo-9259573.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shawarma: "https://images.pexels.com/photos/5779364/pexels-photo-5779364.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shawarma2: "https://images.pexels.com/photos/5779423/pexels-photo-5779423.jpeg?auto=compress&cs=tinysrgb&w=1200",
  fattoush: "https://images.pexels.com/photos/4899790/pexels-photo-4899790.jpeg?auto=compress&cs=tinysrgb&w=1200",
  tabbouleh: "https://images.pexels.com/photos/15481524/pexels-photo-15481524.jpeg?auto=compress&cs=tinysrgb&w=1200",
  soup: "https://images.pexels.com/photos/28674710/pexels-photo-28674710.jpeg?auto=compress&cs=tinysrgb&w=1200",
  tomato: "https://images.pexels.com/photos/27588113/pexels-photo-27588113.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

let seeded = false;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const existing = await db.select({ id: staff.id }).from(staff).limit(1);
  if (existing.length) {
    seeded = true;
    return;
  }
  await seedAll();
  seeded = true;
}

async function seedAll() {
  const passwordHash = await hashPassword("Vsml3142@");
  await db.insert(staff).values({
    username: "moosameftah",
    email: "moosameftah",
    passwordHash,
    fullName: "Moosa Meftah",
    role: "super_admin",
    permissions: ALL_PERMISSIONS,
    isActive: true,
  });

  const govData = [
    { nameEn: "Capital Governorate", nameAr: "محافظة العاصمة", sortOrder: 1 },
    { nameEn: "Muharraq Governorate", nameAr: "محافظة المحرق", sortOrder: 2 },
    { nameEn: "Northern Governorate", nameAr: "المحافظة الشمالية", sortOrder: 3 },
    { nameEn: "Southern Governorate", nameAr: "المحافظة الجنوبية", sortOrder: 4 },
  ];
  const govRows = await db.insert(governorates).values(govData).returning();
  const byEn = Object.fromEntries(govRows.map((g) => [g.nameEn, g.id]));

  const regionSeed: Array<{ gov: string; nameEn: string; nameAr: string; fee: number; sort: number }> = [
    { gov: "Capital Governorate", nameEn: "Manama", nameAr: "المنامة", fee: 800, sort: 1 },
    { gov: "Capital Governorate", nameEn: "Juffair", nameAr: "الجفير", fee: 900, sort: 2 },
    { gov: "Capital Governorate", nameEn: "Adliya", nameAr: "العدلية", fee: 900, sort: 3 },
    { gov: "Capital Governorate", nameEn: "Seef", nameAr: "السيف", fee: 1000, sort: 4 },
    { gov: "Capital Governorate", nameEn: "Gudaibiya", nameAr: "القضيبية", fee: 800, sort: 5 },
    { gov: "Capital Governorate", nameEn: "Hoora", nameAr: "الحورة", fee: 800, sort: 6 },
    { gov: "Capital Governorate", nameEn: "Diplomatic Area", nameAr: "المنطقة الدبلوماسية", fee: 900, sort: 7 },
    { gov: "Muharraq Governorate", nameEn: "Muharraq City", nameAr: "مدينة المحرق", fee: 1200, sort: 1 },
    { gov: "Muharraq Governorate", nameEn: "Busaiteen", nameAr: "البسيتين", fee: 1200, sort: 2 },
    { gov: "Muharraq Governorate", nameEn: "Hidd", nameAr: "الحد", fee: 1400, sort: 3 },
    { gov: "Muharraq Governorate", nameEn: "Arad", nameAr: "عراد", fee: 1300, sort: 4 },
    { gov: "Muharraq Governorate", nameEn: "Galali", nameAr: "قلالي", fee: 1500, sort: 5 },
    { gov: "Muharraq Governorate", nameEn: "Amwaj Islands", nameAr: "جزر أمواج", fee: 1600, sort: 6 },
    { gov: "Northern Governorate", nameEn: "Hamad Town", nameAr: "مدينة حمد", fee: 1400, sort: 1 },
    { gov: "Northern Governorate", nameEn: "Budaiya", nameAr: "البديع", fee: 1300, sort: 2 },
    { gov: "Northern Governorate", nameEn: "Saar", nameAr: "سار", fee: 1300, sort: 3 },
    { gov: "Northern Governorate", nameEn: "Janabiyah", nameAr: "الجنبية", fee: 1400, sort: 4 },
    { gov: "Northern Governorate", nameEn: "Diraz", nameAr: "الدراز", fee: 1400, sort: 5 },
    { gov: "Northern Governorate", nameEn: "Barbar", nameAr: "باربار", fee: 1400, sort: 6 },
    { gov: "Southern Governorate", nameEn: "Riffa", nameAr: "الرفاع", fee: 1500, sort: 1 },
    { gov: "Southern Governorate", nameEn: "Isa Town", nameAr: "مدينة عيسى", fee: 1300, sort: 2 },
    { gov: "Southern Governorate", nameEn: "Awali", nameAr: "عوالي", fee: 1600, sort: 3 },
    { gov: "Southern Governorate", nameEn: "Zallaq", nameAr: "الزلاق", fee: 1800, sort: 4 },
    { gov: "Southern Governorate", nameEn: "Sitra", nameAr: "سترة", fee: 1400, sort: 5 },
    { gov: "Southern Governorate", nameEn: "East Riffa", nameAr: "الرفاع الشرقي", fee: 1500, sort: 6 },
  ];
  await db.insert(regions).values(
    regionSeed.map((r) => ({
      governorateId: byEn[r.gov],
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      deliveryFeeFils: r.fee,
      sortOrder: r.sort,
      isActive: true,
    })),
  );

  const catRows = await db
    .insert(categories)
    .values([
      { nameEn: "Appetizers", nameAr: "المقبلات", slug: "appetizers", image: IMG.mezze, sortOrder: 1 },
      { nameEn: "Soups & Salads", nameAr: "الشوربات والسلطات", slug: "soups-salads", image: IMG.fattoush, sortOrder: 2 },
      { nameEn: "Grills", nameAr: "المشاوي", slug: "grills", image: IMG.grill, sortOrder: 3 },
      { nameEn: "Arabic Specialties", nameAr: "الأطباق العربية", slug: "arabic", image: IMG.mandi, sortOrder: 4 },
      { nameEn: "Seafood", nameAr: "المأكولات البحرية", slug: "seafood", image: IMG.seafood, sortOrder: 5 },
      { nameEn: "Sandwiches", nameAr: "السندويشات", slug: "sandwiches", image: IMG.shawarma, sortOrder: 6 },
      { nameEn: "Desserts", nameAr: "الحلويات", slug: "desserts", image: IMG.kunafa, sortOrder: 7 },
      { nameEn: "Beverages", nameAr: "المشروبات", slug: "beverages", image: IMG.mint, sortOrder: 8 },
    ])
    .returning();

  const cat = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

  type ItemSeed = {
    slugCat: string;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    image: string;
    base: number;
    discount?: number;
    hasSizes?: boolean;
    sizes?: Array<{ nameEn: string; nameAr: string; price: number; discount?: number }>;
  };

  const items: ItemSeed[] = [
    {
      slugCat: "appetizers",
      nameEn: "Hummus",
      nameAr: "حمص",
      descriptionEn: "Creamed chickpeas, tahini, lemon and cold-pressed olive oil.",
      descriptionAr: "حمص مهروس مع طحينة وليمون وزيت زيتون بكر.",
      image: IMG.hummus,
      base: 1200,
      hasSizes: true,
      sizes: [
        { nameEn: "Small", nameAr: "صغير", price: 1200 },
        { nameEn: "Large", nameAr: "كبير", price: 1800 },
      ],
    },
    {
      slugCat: "appetizers",
      nameEn: "Mutabbal",
      nameAr: "متبل",
      descriptionEn: "Smoked aubergine with tahini and pomegranate.",
      descriptionAr: "باذنجان مدخن مع طحينة ورمان.",
      image: IMG.mediterranean,
      base: 1300,
      hasSizes: true,
      sizes: [
        { nameEn: "Small", nameAr: "صغير", price: 1300 },
        { nameEn: "Large", nameAr: "كبير", price: 1900 },
      ],
    },
    {
      slugCat: "appetizers",
      nameEn: "Mixed Mezze",
      nameAr: "مزّة مشكلة",
      descriptionEn: "Hummus, mutabbal, labneh, olives and warm pita.",
      descriptionAr: "حمص ومتبل ولبنة وزيتون مع خبز عربي دافئ.",
      image: IMG.mezze,
      base: 2800,
    },
    {
      slugCat: "appetizers",
      nameEn: "Kibbeh",
      nameAr: "كبة",
      descriptionEn: "Crisp bulgur shells filled with spiced lamb.",
      descriptionAr: "كبة مقلية محشوة بلحم غنم متبّل.",
      image: IMG.feast,
      base: 1600,
    },
    {
      slugCat: "soups-salads",
      nameEn: "Lentil Soup",
      nameAr: "شوربة عدس",
      descriptionEn: "Red lentil soup with cumin and lemon.",
      descriptionAr: "شوربة عدس أحمر مع كمون وليمون.",
      image: IMG.soup,
      base: 1100,
    },
    {
      slugCat: "soups-salads",
      nameEn: "Fattoush",
      nameAr: "فتوش",
      descriptionEn: "Garden vegetables, toasted bread and sumac vinaigrette.",
      descriptionAr: "خضار طازجة مع خبز محمص وصلصة سماق.",
      image: IMG.fattoush,
      base: 1500,
    },
    {
      slugCat: "soups-salads",
      nameEn: "Tabbouleh",
      nameAr: "تبولة",
      descriptionEn: "Parsley, mint, burghul, tomato and lemon.",
      descriptionAr: "بقدونس ونعنع وبرغل وطماطم وليمون.",
      image: IMG.tabbouleh,
      base: 1400,
    },
    {
      slugCat: "soups-salads",
      nameEn: "Arabic Salad",
      nameAr: "سلطة عربية",
      descriptionEn: "Cucumber, tomato, onion and olive oil.",
      descriptionAr: "خيار وطماطم وبصل وزيت زيتون.",
      image: IMG.tomato,
      base: 1200,
    },
    {
      slugCat: "grills",
      nameEn: "Mixed Grill",
      nameAr: "مشاوي مشكلة",
      descriptionEn: "Kofta, tawook, lamb chop and kebab over charcoal.",
      descriptionAr: "كفتة وتيكا وتشووك وريش غنم على الفحم.",
      image: IMG.grill,
      base: 4500,
      discount: 10,
      hasSizes: true,
      sizes: [
        { nameEn: "Half", nameAr: "النصف", price: 4500, discount: 10 },
        { nameEn: "Full", nameAr: "الكامل", price: 7500, discount: 10 },
        { nameEn: "Family", nameAr: "العائلي", price: 12000, discount: 10 },
      ],
    },
    {
      slugCat: "grills",
      nameEn: "Shish Tawook",
      nameAr: "شيش طاووق",
      descriptionEn: "Yogurt-marinated chicken skewers, grilled over coals.",
      descriptionAr: "أسياخ دجاج متبلة باللبن مشوية على الفحم.",
      image: IMG.shish,
      base: 3200,
      hasSizes: true,
      sizes: [
        { nameEn: "Half", nameAr: "النصف", price: 3200 },
        { nameEn: "Full", nameAr: "الكامل", price: 5500 },
      ],
    },
    {
      slugCat: "grills",
      nameEn: "Lamb Kofta",
      nameAr: "كفتة غنم",
      descriptionEn: "Hand-minced lamb with baharat, charcoal grilled.",
      descriptionAr: "كفتة غنم مفرومة يدوياً مع بهارات ومشوية على الفحم.",
      image: IMG.kebab,
      base: 3800,
    },
    {
      slugCat: "grills",
      nameEn: "Mixed Kebab",
      nameAr: "كباب مشكل",
      descriptionEn: "Lamb and chicken kebabs with grilled vegetables.",
      descriptionAr: "كباب غنم ودجاج مع خضار مشوية.",
      image: IMG.mixed,
      base: 4200,
    },
    {
      slugCat: "arabic",
      nameEn: "Lamb Mandi",
      nameAr: "مندي لحم",
      descriptionEn: "Slow-cooked lamb over smoked basmati, served with daqqous.",
      descriptionAr: "لحم غنم مطهو ببطء على أرز بسمتي مدخن مع دقوس.",
      image: IMG.mandi,
      base: 2500,
      hasSizes: true,
      sizes: [
        { nameEn: "Quarter", nameAr: "ربع", price: 2500 },
        { nameEn: "Half", nameAr: "النصف", price: 4000 },
        { nameEn: "Full", nameAr: "الكامل", price: 7000 },
      ],
    },
    {
      slugCat: "arabic",
      nameEn: "Chicken Mandi",
      nameAr: "مندي دجاج",
      descriptionEn: "Hanoor-style chicken mandi with nuts and raisins.",
      descriptionAr: "مندي دجاج على الطريقة الحضرمية مع مكسرات وزبيب.",
      image: IMG.biryani,
      base: 2000,
      hasSizes: true,
      sizes: [
        { nameEn: "Quarter", nameAr: "ربع", price: 2000 },
        { nameEn: "Half", nameAr: "النصف", price: 3200 },
        { nameEn: "Full", nameAr: "الكامل", price: 5500 },
      ],
    },
    {
      slugCat: "arabic",
      nameEn: "Lamb Haneeth",
      nameAr: "حنيذ لحم",
      descriptionEn: "Oven-sealed haneeth lamb, falling off the bone.",
      descriptionAr: "حنيذ لحم محكم الإغلاق ينهار عن العظم.",
      image: IMG.mandi,
      base: 4800,
    },
    {
      slugCat: "arabic",
      nameEn: "Chicken Machboos",
      nameAr: "مجبوس دجاج",
      descriptionEn: "Bahraini machboos with loomi, baharat and fried onions.",
      descriptionAr: "مجبوس بحريني باللومي والبهارات والبصل المقلي.",
      image: IMG.biryani,
      base: 2800,
    },
    {
      slugCat: "seafood",
      nameEn: "Grilled Hammour",
      nameAr: "هامور مشوي",
      descriptionEn: "Gulf hammour, charcoal grilled with lemon and herbs.",
      descriptionAr: "هامور الخليج مشوي على الفحم مع ليمون وأعشاب.",
      image: IMG.seafood,
      base: 6500,
    },
    {
      slugCat: "seafood",
      nameEn: "Shrimp Sayadiya",
      nameAr: "صيادية روبيان",
      descriptionEn: "Gulf shrimp over spiced fisher-style rice.",
      descriptionAr: "روبيان الخليج على أرز صيادية متبّل.",
      image: IMG.shrimp,
      base: 5200,
    },
    {
      slugCat: "seafood",
      nameEn: "Mixed Seafood Platter",
      nameAr: "طبق بحري مشكل",
      descriptionEn: "Hammour, shrimp and calamari with rice and salad.",
      descriptionAr: "هامور وروبيان وكلمار مع أرز وسلطة.",
      image: IMG.seafood,
      base: 8500,
      hasSizes: true,
      sizes: [
        { nameEn: "Full", nameAr: "الكامل", price: 8500 },
        { nameEn: "Family", nameAr: "العائلي", price: 14500 },
      ],
    },
    {
      slugCat: "sandwiches",
      nameEn: "Chicken Shawarma",
      nameAr: "شاورما دجاج",
      descriptionEn: "Spit-roasted chicken, toum, pickles and Arabic bread.",
      descriptionAr: "شاورما دجاج مع ثوم ومخلل وخبز عربي.",
      image: IMG.shawarma,
      base: 900,
      hasSizes: true,
      sizes: [
        { nameEn: "Small", nameAr: "صغير", price: 900 },
        { nameEn: "Medium", nameAr: "وسط", price: 1200 },
        { nameEn: "Large", nameAr: "كبير", price: 1600 },
      ],
    },
    {
      slugCat: "sandwiches",
      nameEn: "Meat Shawarma",
      nameAr: "شاورما لحم",
      descriptionEn: "Beef shawarma with tahini and salad.",
      descriptionAr: "شاورما لحم مع طحينة وسلطة.",
      image: IMG.shawarma2,
      base: 1100,
      hasSizes: true,
      sizes: [
        { nameEn: "Small", nameAr: "صغير", price: 1100 },
        { nameEn: "Medium", nameAr: "وسط", price: 1500 },
        { nameEn: "Large", nameAr: "كبير", price: 1900 },
      ],
    },
    {
      slugCat: "sandwiches",
      nameEn: "Falafel Sandwich",
      nameAr: "سندويش فلافل",
      descriptionEn: "Crisp falafel, tahini, tomato and mint.",
      descriptionAr: "فلافل مقرمشة مع طحينة وطماطم ونعنع.",
      image: IMG.shawarma,
      base: 800,
    },
    {
      slugCat: "desserts",
      nameEn: "Kunafa",
      nameAr: "كنافة",
      descriptionEn: "Crisp kunafa with cheese or cream and pistachio.",
      descriptionAr: "كنافة مقرمشة بالجبن أو القشطة والفستق.",
      image: IMG.kunafa,
      base: 1800,
    },
    {
      slugCat: "desserts",
      nameEn: "Baklava",
      nameAr: "بقلاوة",
      descriptionEn: "Layered pastry, nuts and orange-blossom syrup.",
      descriptionAr: "عجينة طبقات مع مكسرات وقطر زهر.",
      image: IMG.baklava,
      base: 1500,
    },
    {
      slugCat: "desserts",
      nameEn: "Um Ali",
      nameAr: "أم علي",
      descriptionEn: "Baked cream pastry with nuts and raisins.",
      descriptionAr: "أم علي بالقشطة والمكسرات والزبيب.",
      image: IMG.kunafa2,
      base: 1600,
    },
    {
      slugCat: "beverages",
      nameEn: "Fresh Orange Juice",
      nameAr: "عصير برتقال طازج",
      descriptionEn: "Pressed to order.",
      descriptionAr: "يُعصر عند الطلب.",
      image: IMG.citrus,
      base: 800,
      hasSizes: true,
      sizes: [
        { nameEn: "Small", nameAr: "صغير", price: 800 },
        { nameEn: "Medium", nameAr: "وسط", price: 1100 },
        { nameEn: "Large", nameAr: "كبير", price: 1400 },
      ],
    },
    {
      slugCat: "beverages",
      nameEn: "Mint Lemonade",
      nameAr: "ليمون بالنعناع",
      descriptionEn: "Fresh lemon, mint and a touch of sugar.",
      descriptionAr: "ليمون طازج ونعنع مع لمسة سكر.",
      image: IMG.mint,
      base: 900,
      hasSizes: true,
      sizes: [
        { nameEn: "Small", nameAr: "صغير", price: 900 },
        { nameEn: "Medium", nameAr: "وسط", price: 1200 },
        { nameEn: "Large", nameAr: "كبير", price: 1500 },
      ],
    },
    {
      slugCat: "beverages",
      nameEn: "Arabic Coffee",
      nameAr: "قهوة عربية",
      descriptionEn: "Cardamom qahwa served with dates.",
      descriptionAr: "قهوة هيل تُقدَّم مع تمر.",
      image: IMG.smoothie,
      base: 700,
    },
    {
      slugCat: "beverages",
      nameEn: "Soft Drink",
      nameAr: "مشروب غازي",
      descriptionEn: "Chilled selection of sodas.",
      descriptionAr: "مشروبات غازية مبرّدة.",
      image: IMG.citrus,
      base: 500,
    },
  ];

  for (const [index, item] of items.entries()) {
    const [row] = await db
      .insert(menuItems)
      .values({
        categoryId: cat[item.slugCat],
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        descriptionEn: item.descriptionEn,
        descriptionAr: item.descriptionAr,
        image: item.image,
        basePriceFils: item.base,
        discountPercent: item.discount || 0,
        hasSizes: Boolean(item.hasSizes),
        isAvailable: true,
        sortOrder: index + 1,
      })
      .returning();

    if (item.sizes?.length) {
      await db.insert(itemSizes).values(
        item.sizes.map((s, i) => ({
          itemId: row.id,
          nameEn: s.nameEn,
          nameAr: s.nameAr,
          priceFils: s.price,
          discountPercent: s.discount || 0,
          isAvailable: true,
          sortOrder: i + 1,
        })),
      );
    }
  }

  await db.insert(promoCodes).values([
    {
      code: "JOWDI10",
      descriptionEn: "10% off your tray",
      descriptionAr: "خصم 10٪ على طلبك",
      discountPercent: 10,
      minOrderFils: 3000,
      isActive: true,
    },
    {
      code: "WELCOME15",
      descriptionEn: "Welcome 15% off",
      descriptionAr: "ترحيب خصم 15٪",
      discountPercent: 15,
      minOrderFils: 5000,
      isActive: true,
    },
  ]);

  await db.insert(deliveryAggregators).values([
    { name: "Parcel", apiKey: "", apiUrl: "", isActive: true },
    { name: "Webey", apiKey: "", apiUrl: "", isActive: true },
  ]);

  await db.insert(popups).values({
    titleEn: "Welcome to Jowdi",
    titleAr: "أهلاً بكم في الجودي",
    bodyEn: "Dine-in, takeaway or delivery across Bahrain. Try Mixed Grill in Half, Full or Family size.",
    bodyAr: "محلي أو استلام أو توصيل في جميع أنحاء البحرين. جرّب المشاوي المشكلة بحجم النصف أو الكامل أو العائلي.",
    isActive: true,
    sortOrder: 1,
    ctaEn: "Browse the menu",
    ctaAr: "تصفح القائمة",
    ctaHref: "#menu",
  });

  await db.insert(settings).values({ key: "site", value: DEFAULT_SETTINGS });
}
