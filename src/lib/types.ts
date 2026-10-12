export type Lang = "ar" | "en";

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "benefitpay" | "card";
export type PaymentStatus = "pending" | "paid" | "failed" | "cash_on_arrival";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "dispatched"
  | "delivered"
  | "completed"
  | "cancelled";

export type StaffPermissions = {
  menu?: boolean;
  orders?: boolean;
  customers?: boolean;
  staff?: boolean;
  regions?: boolean;
  delivery?: boolean;
  promos?: boolean;
  popups?: boolean;
  settings?: boolean;
  themes?: boolean;
  bans?: boolean;
  payments?: boolean;
};

export type CustomerSession = {
  id: number;
  email: string;
  fullName: string;
  role: "customer";
  exp: number;
};

export type StaffSession = {
  id: number;
  username: string;
  fullName: string;
  role: "super_admin" | "staff";
  permissions: StaffPermissions;
  exp: number;
};

export type CartLine = {
  itemId: number;
  sizeId?: number | null;
  nameEn: string;
  nameAr: string;
  sizeNameEn?: string | null;
  sizeNameAr?: string | null;
  unitPriceFils: number;
  quantity: number;
  image?: string | null;
};

export type PublicSettings = {
  theme: string;
  restaurant: {
    nameEn: string;
    nameAr: string;
    logo: string;
    phone: string;
    email: string;
    addressEn: string;
    addressAr: string;
    whatsapp: string;
    instagram: string;
  };
  payments: {
    cashEnabled: boolean;
    benefitPayEnabled: boolean;
    benefitPayApiKey: string;
    benefitPayMerchantId: string;
    cardEnabled: boolean;
    cardProvider: string;
    cardPublicKey: string;
    cardSecretKey: string;
  };
  delivery: {
    sharedEnabled: boolean;
    restaurantSharePercent: number;
    customerSharePercent: number;
  };
  features: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
    guestCheckout: boolean;
  };
  menuDiscountPercent: number;
};

export const DEFAULT_SETTINGS: PublicSettings = {
  theme: "midnight-gold",
  restaurant: {
    nameEn: "Jowdi Restaurant",
    nameAr: "مطعم الجودي",
    logo: "/logo.png",
    phone: "+973 1700 0000",
    email: "yuki.t@example.com",
    addressEn: "Manama, Kingdom of Bahrain",
    addressAr: "المنامة، مملكة البحرين",
    whatsapp: "+97317000000",
    instagram: "jowdi.restaurant",
  },
  payments: {
    cashEnabled: true,
    benefitPayEnabled: false,
    benefitPayApiKey: "",
    benefitPayMerchantId: "",
    cardEnabled: false,
    cardProvider: "card",
    cardPublicKey: "",
    cardSecretKey: "",
  },
  delivery: {
    sharedEnabled: true,
    restaurantSharePercent: 50,
    customerSharePercent: 50,
  },
  features: {
    dineIn: true,
    takeaway: true,
    delivery: true,
    guestCheckout: true,
  },
  menuDiscountPercent: 0,
};

export const ALL_PERMISSIONS: StaffPermissions = {
  menu: true,
  orders: true,
  customers: true,
  staff: true,
  regions: true,
  delivery: true,
  promos: true,
  popups: true,
  settings: true,
  themes: true,
  bans: true,
  payments: true,
};
