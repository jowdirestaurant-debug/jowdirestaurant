export type ThemeDef = {
  id: string;
  nameEn: string;
  nameAr: string;
  group: "dark" | "light";
  preview: string[];
};

export const THEMES: ThemeDef[] = [
  { id: "midnight-gold", nameEn: "Midnight Gold", nameAr: "ذهب منتصف الليل", group: "dark", preview: ["#0a0a0a", "#c4a574", "#f5f0e8"] },
  { id: "desert-sand", nameEn: "Desert Sand", nameAr: "رمال الصحراء", group: "light", preview: ["#f4e9d8", "#b85c38", "#2c1810"] },
  { id: "royal-emerald", nameEn: "Royal Emerald", nameAr: "الزمرد الملكي", group: "dark", preview: ["#07140f", "#d4af37", "#e8f5e9"] },
  { id: "ocean-navy", nameEn: "Ocean Navy", nameAr: "كحلي المحيط", group: "dark", preview: ["#061525", "#3ec6c9", "#eaf6ff"] },
  { id: "crimson-spice", nameEn: "Crimson Spice", nameAr: "توابل قرمزية", group: "dark", preview: ["#1a0808", "#e24a3b", "#fff1e6"] },
  { id: "olive-grove", nameEn: "Olive Grove", nameAr: "بستان الزيتون", group: "dark", preview: ["#12140c", "#c5b358", "#f3f0e0"] },
  { id: "pearl-ivory", nameEn: "Pearl Ivory", nameAr: "عاج لؤلؤي", group: "light", preview: ["#faf7f0", "#b08d57", "#1c1917"] },
  { id: "copper-ember", nameEn: "Copper Ember", nameAr: "جمر نحاسي", group: "dark", preview: ["#140c08", "#d07a45", "#fff4e8"] },
  { id: "midnight-sapphire", nameEn: "Midnight Sapphire", nameAr: "ياقوت منتصف الليل", group: "dark", preview: ["#070b18", "#8fb3ff", "#f0f4ff"] },
  { id: "rose-gold", nameEn: "Rose Gold", nameAr: "ذهبي وردي", group: "dark", preview: ["#161012", "#e0a892", "#fff5f0"] },
  { id: "forest-moss", nameEn: "Forest Moss", nameAr: "طحلب الغابة", group: "dark", preview: ["#0c140e", "#9cbf7a", "#eef6e8"] },
  { id: "saffron-night", nameEn: "Saffron Night", nameAr: "ليل الزعفران", group: "dark", preview: ["#120e08", "#e0a100", "#fff8e7"] },
  { id: "charcoal-silver", nameEn: "Charcoal Silver", nameAr: "فحمي فضي", group: "dark", preview: ["#111214", "#c9cdd3", "#f5f6f8"] },
  { id: "burgundy-wine", nameEn: "Burgundy Wine", nameAr: "نبيذ بورغندي", group: "dark", preview: ["#16080c", "#d4a017", "#fdecee"] },
  { id: "teal-oasis", nameEn: "Teal Oasis", nameAr: "واحة التيل", group: "dark", preview: ["#071614", "#2ec4b6", "#e8fffb"] },
  { id: "amber-glow", nameEn: "Amber Glow", nameAr: "توهج العنبر", group: "dark", preview: ["#140f08", "#f0b429", "#fff6e5"] },
  { id: "ivory-classic", nameEn: "Ivory Classic", nameAr: "عاج كلاسيكي", group: "light", preview: ["#f7f1e5", "#1e3a5f", "#122033"] },
  { id: "navy-gold", nameEn: "Navy Gold", nameAr: "كحلي ذهبي", group: "dark", preview: ["#0b1220", "#d4b872", "#f4efe4"] },
  { id: "terracotta-sun", nameEn: "Terracotta Sun", nameAr: "شمس التيراكوتا", group: "light", preview: ["#f8eee6", "#c45c26", "#2b140c"] },
  { id: "graphite-rose", nameEn: "Graphite Rose", nameAr: "جرافيت وردي", group: "dark", preview: ["#141416", "#d989a0", "#fff0f4"] },
];

export function isThemeId(id: string): boolean {
  return THEMES.some((t) => t.id === id);
}
