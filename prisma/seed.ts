import { PrismaClient } from "@prisma/client";
import { mkdir, access, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "seed");

async function downloadImage(unsplashId: string, filename: string): Promise<string> {
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    await access(filePath);
    return `/uploads/seed/${filename}`;
  } catch {
    // not cached yet, fall through to download
  }
  const url = `https://images.unsplash.com/photo-${unsplashId}?w=1200&q=80&fm=jpg&fit=crop&crop=entropy`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(filePath, buffer);
  return `/uploads/seed/${filename}`;
}

// ---------- Admin roles & first admin user ----------

async function seedAdmin() {
  const roles = [
    { key: "super_admin", nameEn: "Super Admin", nameFa: "مدیر ارشد", permissions: ["*"] },
    {
      key: "store_manager",
      nameEn: "Store Manager",
      nameFa: "مدیر فروشگاه",
      permissions: ["products.manage", "categories.manage", "inventory.manage", "orders.manage", "coupons.manage"],
    },
    {
      key: "content_manager",
      nameEn: "Content Manager",
      nameFa: "مدیر محتوا",
      permissions: ["pages.manage", "homepage.manage", "blog.manage", "media.manage", "seo.manage", "menus.manage"],
    },
    {
      key: "order_manager",
      nameEn: "Order Manager",
      nameFa: "مدیر سفارش‌ها",
      permissions: ["orders.manage", "customers.view", "customers.manage"],
    },
    { key: "editor", nameEn: "Editor", nameFa: "ویرایشگر", permissions: ["content.manage", "blog.manage"] },
  ];

  for (const role of roles) {
    await prisma.adminRole.upsert({
      where: { key: role.key },
      create: role,
      update: { nameEn: role.nameEn, nameFa: role.nameFa, permissions: role.permissions },
    });
  }

  const superAdminRole = await prisma.adminRole.findUniqueOrThrow({ where: { key: "super_admin" } });
  const passwordHash = await hashPassword("AdminPass123!");
  await prisma.adminUser.upsert({
    where: { email: "owner@mahcandle.test" },
    create: {
      email: "owner@mahcandle.test",
      passwordHash,
      name: "Store Owner",
      roleId: superAdminRole.id,
    },
    update: { passwordHash, roleId: superAdminRole.id, isActive: true },
  });

  console.log("Seeded admin roles + owner@mahcandle.test / AdminPass123!");
}

// ---------- Customers ----------

const customerSeed = [
  { email: "sara.ahmadi@example.com", firstName: "Sara", lastName: "Ahmadi", phone: "09121112233" },
  { email: "kian.moradi@example.com", firstName: "Kian", lastName: "Moradi", phone: "09122223344" },
  { email: "niloofar.hosseini@example.com", firstName: "Niloofar", lastName: "Hosseini", phone: "09123334455" },
  { email: "arman.karimi@example.com", firstName: "Arman", lastName: "Karimi", phone: "09124445566" },
  { email: "yasaman.rezaei@example.com", firstName: "Yasaman", lastName: "Rezaei", phone: "09125556677" },
  { email: "pouya.nasiri@example.com", firstName: "Pouya", lastName: "Nasiri", phone: "09126667788" },
];

async function seedCustomers() {
  const passwordHash = await hashPassword("CustomerPass123!");
  const customers = [];
  for (const c of customerSeed) {
    const customer = await prisma.customer.upsert({
      where: { email: c.email },
      create: { ...c, passwordHash },
      update: { passwordHash },
    });
    customers.push(customer);
  }
  console.log(`Seeded ${customers.length} customers (password: CustomerPass123!)`);
  return customers;
}

// ---------- Categories ----------

interface CategorySeed {
  key: string;
  slugEn: string;
  slugFa: string;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  imageId: string;
  parentKey: string | null;
}

const categorySeeds: CategorySeed[] = [
  {
    key: "jar",
    slugEn: "jar-candles",
    slugFa: "شمع-جار",
    nameEn: "Jar Candles",
    nameFa: "شمع‌های جار",
    descriptionEn: "Hand-poured jar candles in reusable glass vessels.",
    descriptionFa: "شمع‌های جار دست‌ساز در ظروف شیشه‌ای قابل استفاده مجدد.",
    imageId: "1528351655744-27cc30462816",
    parentKey: null,
  },
  {
    key: "pillar",
    slugEn: "pillar-candles",
    slugFa: "شمع-استوانه-ای",
    nameEn: "Pillar Candles",
    nameFa: "شمع‌های استوانه‌ای",
    descriptionEn: "Freestanding pillar candles for a classic, elegant glow.",
    descriptionFa: "شمع‌های استوانه‌ای مستقل برای نوری کلاسیک و شیک.",
    imageId: "1613068431228-8cb6a1e92573",
    parentKey: null,
  },
  {
    key: "votive",
    slugEn: "votive-candles",
    slugFa: "شمع-نذری",
    nameEn: "Votive Candles",
    nameFa: "شمع‌های کوچک",
    descriptionEn: "Small votive candles, perfect for layering light around a room.",
    descriptionFa: "شمع‌های کوچک، مناسب برای پخش نور در فضای اتاق.",
    imageId: "1605651202774-7d573fd3f12d",
    parentKey: null,
  },
  {
    key: "scented",
    slugEn: "scented-candles",
    slugFa: "شمع-معطر",
    nameEn: "Scented Candles",
    nameFa: "شمع‌های معطر",
    descriptionEn: "Our full range of fragrance-forward candles.",
    descriptionFa: "مجموعه کامل شمع‌های معطر ما.",
    imageId: "1572726729207-a78d6feb18d7",
    parentKey: null,
  },
  {
    key: "luxury",
    slugEn: "luxury-candles",
    slugFa: "شمع-لوکس",
    nameEn: "Luxury Candles",
    nameFa: "شمع‌های لوکس",
    descriptionEn: "Premium candles with rare fragrance blends and longer burn times.",
    descriptionFa: "شمع‌های پریمیوم با ترکیبات رایحه‌ای کمیاب و زمان سوختن بیشتر.",
    imageId: "1787074634411-e9ef151ab422",
    parentKey: null,
  },
  {
    key: "gift",
    slugEn: "gift-sets",
    slugFa: "ست-هدیه",
    nameEn: "Gift Sets",
    nameFa: "ست‌های هدیه",
    descriptionEn: "Curated candle sets, beautifully packaged for gifting.",
    descriptionFa: "ست‌های منتخب شمع، با بسته‌بندی زیبا برای هدیه دادن.",
    imageId: "1786912281267-cb6284cd2efa",
    parentKey: null,
  },
  {
    key: "seasonal",
    slugEn: "seasonal-candles",
    slugFa: "شمع-فصلی",
    nameEn: "Seasonal Candles",
    nameFa: "شمع‌های فصلی",
    descriptionEn: "Limited seasonal fragrances.",
    descriptionFa: "رایحه‌های فصلی محدود.",
    imageId: "1601922046210-41e129a3e64a",
    parentKey: null,
  },
  {
    key: "winter",
    slugEn: "winter",
    slugFa: "زمستانی",
    nameEn: "Winter",
    nameFa: "زمستانی",
    descriptionEn: "Warm, spiced fragrances for the cold months.",
    descriptionFa: "رایحه‌های گرم و ادویه‌ای برای ماه‌های سرد سال.",
    imageId: "1643122941450-b97c7d6ed673",
    parentKey: "seasonal",
  },
  {
    key: "autumn",
    slugEn: "autumn",
    slugFa: "پاییزی",
    nameEn: "Autumn",
    nameFa: "پاییزی",
    descriptionEn: "Cozy orchard and spice notes for autumn evenings.",
    descriptionFa: "نت‌های گرم میوه و ادویه برای عصرهای پاییزی.",
    imageId: "1595055258834-8290e4181590",
    parentKey: "seasonal",
  },
];

async function seedCategories() {
  const idByKey = new Map<string, string>();

  for (const c of categorySeeds.filter((c) => c.parentKey === null)) {
    const image = await downloadImage(c.imageId, `category-${c.key}.jpg`);
    const category = await prisma.category.upsert({
      where: { slugEn: c.slugEn },
      create: {
        slugEn: c.slugEn,
        slugFa: c.slugFa,
        nameEn: c.nameEn,
        nameFa: c.nameFa,
        descriptionEn: c.descriptionEn,
        descriptionFa: c.descriptionFa,
        image,
      },
      update: { nameEn: c.nameEn, nameFa: c.nameFa, descriptionEn: c.descriptionEn, descriptionFa: c.descriptionFa, image },
    });
    idByKey.set(c.key, category.id);
  }

  for (const c of categorySeeds.filter((c) => c.parentKey !== null)) {
    const image = await downloadImage(c.imageId, `category-${c.key}.jpg`);
    const parentId = idByKey.get(c.parentKey!) ?? null;
    const category = await prisma.category.upsert({
      where: { slugEn: c.slugEn },
      create: {
        slugEn: c.slugEn,
        slugFa: c.slugFa,
        nameEn: c.nameEn,
        nameFa: c.nameFa,
        descriptionEn: c.descriptionEn,
        descriptionFa: c.descriptionFa,
        image,
        parentId,
      },
      update: {
        nameEn: c.nameEn,
        nameFa: c.nameFa,
        descriptionEn: c.descriptionEn,
        descriptionFa: c.descriptionFa,
        image,
        parentId,
      },
    });
    idByKey.set(c.key, category.id);
  }

  console.log(`Seeded ${categorySeeds.length} categories`);
  return idByKey;
}

// ---------- Fragrance families ----------

const fragranceFamilySeeds = [
  { key: "floral", slugEn: "floral", slugFa: "گلی", nameEn: "Floral", nameFa: "گلی" },
  { key: "fruity", slugEn: "fruity", slugFa: "میوه-ای", nameEn: "Fruity", nameFa: "میوه‌ای" },
  { key: "fresh", slugEn: "fresh-clean", slugFa: "تازه-و-پاک", nameEn: "Fresh & Clean", nameFa: "تازه و پاک" },
  { key: "woody", slugEn: "woody", slugFa: "چوبی", nameEn: "Woody", nameFa: "چوبی" },
  { key: "vanilla", slugEn: "vanilla", slugFa: "وانیلی", nameEn: "Vanilla", nameFa: "وانیلی" },
  { key: "citrus", slugEn: "citrus", slugFa: "مرکبات", nameEn: "Citrus", nameFa: "مرکبات" },
  { key: "spicy", slugEn: "sweet-spicy", slugFa: "شیرین-و-ادویه-ای", nameEn: "Sweet & Spicy", nameFa: "شیرین و ادویه‌ای" },
];

async function seedFragranceFamilies() {
  const idByKey = new Map<string, string>();
  for (const f of fragranceFamilySeeds) {
    const family = await prisma.fragranceFamily.upsert({
      where: { slugEn: f.slugEn },
      create: { slugEn: f.slugEn, slugFa: f.slugFa, nameEn: f.nameEn, nameFa: f.nameFa },
      update: { nameEn: f.nameEn, nameFa: f.nameFa },
    });
    idByKey.set(f.key, family.id);
  }
  console.log(`Seeded ${fragranceFamilySeeds.length} fragrance families`);
  return idByKey;
}

// ---------- Tags ----------

async function seedTags() {
  const tagSeeds = [
    { slug: "gift-idea", nameEn: "Gift Idea", nameFa: "ایده هدیه" },
    { slug: "vegan-wax", nameEn: "Vegan Wax", nameFa: "موم گیاهی" },
    { slug: "hand-poured", nameEn: "Hand-Poured", nameFa: "دست‌ساز" },
  ];
  for (const t of tagSeeds) {
    await prisma.tag.upsert({ where: { slug: t.slug }, create: t, update: { nameEn: t.nameEn, nameFa: t.nameFa } });
  }
  console.log(`Seeded ${tagSeeds.length} tags`);
}

// ---------- Products ----------

interface ProductSeed {
  sku: string;
  nameEn: string;
  nameFa: string;
  shortDescriptionEn: string;
  shortDescriptionFa: string;
  descriptionEn: string;
  descriptionFa: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  categoryKeys: string[];
  fragranceKey: string;
  fragranceNotesEn: string;
  fragranceNotesFa: string;
  waxType: string;
  wickType: string;
  burnTimeMinutes: number;
  weight: number;
  color: string;
  size: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  imageIds: string[];
  hasVariants?: boolean;
}

const careInstructionsEn =
  "Trim the wick to 5mm before each burn. Burn for no more than 4 hours at a time and keep the wax pool free of debris.";
const careInstructionsFa = "قبل از هر بار روشن کردن، فتیله را به ۵ میلی‌متر کوتاه کنید. هر بار بیش از ۴ ساعت روشن نگذارید.";
const safetyInstructionsEn = "Never leave a burning candle unattended. Keep away from children, pets, and flammable materials.";
const safetyInstructionsFa = "هرگز شمع روشن را بدون مراقبت رها نکنید. از دسترس کودکان، حیوانات خانگی و مواد قابل اشتعال دور نگه دارید.";
const ingredientsEn = "Natural soy wax blend, cotton wick, premium fragrance and essential oils.";
const ingredientsFa = "ترکیب موم سویای طبیعی، فتیله پنبه‌ای، روغن‌های رایحه‌ای و اسانس درجه یک.";

const productSeeds: ProductSeed[] = [
  {
    sku: "MAH-AMB-001",
    nameEn: "Amber Noir",
    nameFa: "کهربای شب",
    shortDescriptionEn: "Warm amber and smoked woods in a hand-poured jar.",
    shortDescriptionFa: "کهربای گرم و چوب دودی در جاری دست‌ساز.",
    descriptionEn:
      "Amber Noir opens with warm amber resin and settles into smoked cedar and a whisper of leather — a rich, grounding scent for long evenings.",
    descriptionFa: "کهربای شب با رزین کهربای گرم آغاز می‌شود و به سدر دودی و لمسی از چرم می‌رسد؛ رایحه‌ای غنی برای عصرهای طولانی.",
    price: 420000,
    stockQuantity: 24,
    categoryKeys: ["jar", "luxury"],
    fragranceKey: "woody",
    fragranceNotesEn: "Amber, smoked cedar, leather",
    fragranceNotesFa: "کهربا، سدر دودی، چرم",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 3000,
    weight: 220,
    color: "Amber",
    size: "Medium (220g)",
    isFeatured: true,
    isBestSeller: true,
    imageIds: ["1528351655744-27cc30462816", "1640095889747-2090ee12fa7d"],
    hasVariants: true,
  },
  {
    sku: "MAH-VAN-002",
    nameEn: "Vanilla Bean Bliss",
    nameFa: "وانیل رؤیایی",
    shortDescriptionEn: "Creamy Madagascar vanilla with a touch of warm caramel.",
    shortDescriptionFa: "وانیل ماداگاسکار خامه‌ای با لمسی از کارامل گرم.",
    descriptionEn: "A comforting blend of real vanilla bean and warm caramel, rounded out with a soft musk base note.",
    descriptionFa: "ترکیبی دلنشین از دانه وانیل واقعی و کارامل گرم، با پایه‌ای نرم از مشک.",
    price: 320000,
    salePrice: 280000,
    stockQuantity: 30,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "vanilla",
    fragranceNotesEn: "Vanilla bean, caramel, musk",
    fragranceNotesFa: "دانه وانیل، کارامل، مشک",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Cream",
    size: "Medium (200g)",
    isBestSeller: true,
    imageIds: ["1537948756265-406a522f1a45", "1601479604588-68d9e6d386b5"],
  },
  {
    sku: "MAH-CIT-003",
    nameEn: "Citrus Grove",
    nameFa: "باغ مرکبات",
    shortDescriptionEn: "Bright bergamot and sweet orange over a green tea base.",
    shortDescriptionFa: "برگاموت روشن و پرتقال شیرین روی پایه چای سبز.",
    descriptionEn: "A sunny, energizing blend of bergamot and sweet orange, softened by green tea leaves.",
    descriptionFa: "ترکیبی سرزنده و آفتابی از برگاموت و پرتقال شیرین که با برگ چای سبز ملایم شده است.",
    price: 290000,
    stockQuantity: 22,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "citrus",
    fragranceNotesEn: "Bergamot, sweet orange, green tea",
    fragranceNotesFa: "برگاموت، پرتقال شیرین، چای سبز",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2200,
    weight: 200,
    color: "Yellow",
    size: "Medium (200g)",
    isNewArrival: true,
    imageIds: ["1476900164809-ff19b8ae5968", "1572726729207-a78d6feb18d7"],
  },
  {
    sku: "MAH-SAN-004",
    nameEn: "Midnight Sandalwood",
    nameFa: "صندل نیمه‌شب",
    shortDescriptionEn: "Creamy sandalwood, dark musk, and a hint of oud.",
    shortDescriptionFa: "صندل خامه‌ای، مشک تیره و لمسی از عود.",
    descriptionEn: "An opulent, slow-burning blend of creamy sandalwood, dark musk, and a whisper of oud for quiet evenings.",
    descriptionFa: "ترکیبی مجلل و کندسوز از صندل خامه‌ای، مشک تیره و لمسی از عود، مناسب عصرهای آرام.",
    price: 850000,
    stockQuantity: 15,
    categoryKeys: ["luxury"],
    fragranceKey: "woody",
    fragranceNotesEn: "Sandalwood, dark musk, oud",
    fragranceNotesFa: "صندل، مشک تیره، عود",
    waxType: "Coconut-soy wax blend",
    wickType: "Wood wick",
    burnTimeMinutes: 4200,
    weight: 320,
    color: "Deep brown",
    size: "Large (320g)",
    isFeatured: true,
    imageIds: ["1572203176799-40836603681d", "1787074634411-e9ef151ab422"],
  },
  {
    sku: "MAH-ROS-005",
    nameEn: "Rose Garden",
    nameFa: "باغ رز",
    shortDescriptionEn: "Fresh-cut roses with a soft peony heart.",
    shortDescriptionFa: "رز تازه‌چیده با قلبی نرم از گل صد تومانی.",
    descriptionEn: "True-to-bloom rose petals layered over a soft peony heart and a trace of green stems.",
    descriptionFa: "گلبرگ‌های رز واقعی روی قلبی نرم از گل صد تومانی و ردی از ساقه‌های سبز.",
    price: 340000,
    stockQuantity: 18,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "floral",
    fragranceNotesEn: "Rose petals, peony, green stems",
    fragranceNotesFa: "گلبرگ رز، صد تومانی، ساقه سبز",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Blush pink",
    size: "Medium (200g)",
    imageIds: ["1561212856-44e9bae482aa", "1570823635306-250abb06d4b3"],
  },
  {
    sku: "MAH-OCE-006",
    nameEn: "Ocean Mist",
    nameFa: "مه دریا",
    shortDescriptionEn: "Sea salt, driftwood, and a breath of ozone.",
    shortDescriptionFa: "نمک دریا، چوب ساحلی و نفسی از اقیانوس.",
    descriptionEn: "The calm of a foggy coastline — sea salt and driftwood softened by a clean ozonic breeze.",
    descriptionFa: "آرامش ساحلی مه‌آلود؛ نمک دریا و چوب ساحلی که با نسیمی پاک و اقیانوسی نرم شده‌اند.",
    price: 310000,
    stockQuantity: 26,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "fresh",
    fragranceNotesEn: "Sea salt, driftwood, ozone",
    fragranceNotesFa: "نمک دریا، چوب ساحلی، اقیانوس",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Sea blue",
    size: "Medium (200g)",
    isBestSeller: true,
    imageIds: ["1601479604588-68d9e6d386b5", "1613068431228-8cb6a1e92573"],
  },
  {
    sku: "MAH-CIN-007",
    nameEn: "Cinnamon Spice",
    nameFa: "دارچین تند",
    shortDescriptionEn: "Warm cinnamon bark with clove and a touch of orange peel.",
    shortDescriptionFa: "پوست دارچین گرم با میخک و لمسی از پوست پرتقال.",
    descriptionEn: "A cozy winter blend of cinnamon bark, clove bud, and candied orange peel.",
    descriptionFa: "ترکیبی گرم زمستانی از پوست دارچین، غنچه میخک و پوست پرتقال کاندی‌شده.",
    price: 260000,
    stockQuantity: 20,
    categoryKeys: ["winter", "seasonal"],
    fragranceKey: "spicy",
    fragranceNotesEn: "Cinnamon bark, clove, orange peel",
    fragranceNotesFa: "پوست دارچین، میخک، پوست پرتقال",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2000,
    weight: 180,
    color: "Terracotta",
    size: "Small (180g)",
    isNewArrival: true,
    imageIds: ["1643122941450-b97c7d6ed673", "1554057009-6798cb3d4a04"],
  },
  {
    sku: "MAH-PUM-008",
    nameEn: "Pumpkin Harvest",
    nameFa: "برداشت کدو تنبل",
    shortDescriptionEn: "Roasted pumpkin, brown sugar, and warm nutmeg.",
    shortDescriptionFa: "کدو تنبل بو داده، شکر قهوه‌ای و جوز هندی گرم.",
    descriptionEn: "The scent of an autumn kitchen — roasted pumpkin, brown sugar, and a dusting of nutmeg.",
    descriptionFa: "رایحه آشپزخانه پاییزی؛ کدو تنبل بو داده، شکر قهوه‌ای و اندکی جوز هندی.",
    price: 270000,
    stockQuantity: 20,
    categoryKeys: ["autumn", "seasonal"],
    fragranceKey: "spicy",
    fragranceNotesEn: "Roasted pumpkin, brown sugar, nutmeg",
    fragranceNotesFa: "کدو تنبل بو داده، شکر قهوه‌ای، جوز هندی",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2000,
    weight: 180,
    color: "Burnt orange",
    size: "Small (180g)",
    isNewArrival: true,
    imageIds: ["1595055258834-8290e4181590", "1595055301976-21a16cf33e67"],
  },
  {
    sku: "MAH-FIG-009",
    nameEn: "Fig & Cedar",
    nameFa: "انجیر و سدر",
    shortDescriptionEn: "Ripe fig, milky sap, and dry cedar wood.",
    shortDescriptionFa: "انجیر رسیده، شیره شیری و چوب خشک سدر.",
    descriptionEn: "Ripe fig and its milky green sap resting on a bed of dry cedar wood — quietly luxurious.",
    descriptionFa: "انجیر رسیده و شیره سبز شیری آن روی بستری از چوب خشک سدر؛ لوکسی آرام.",
    price: 780000,
    stockQuantity: 3,
    lowStockThreshold: 5,
    categoryKeys: ["luxury"],
    fragranceKey: "woody",
    fragranceNotesEn: "Fig, green sap, cedar wood",
    fragranceNotesFa: "انجیر، شیره سبز، چوب سدر",
    waxType: "Coconut-soy wax blend",
    wickType: "Wood wick",
    burnTimeMinutes: 4000,
    weight: 300,
    color: "Deep green",
    size: "Large (300g)",
    imageIds: ["1786912281267-cb6284cd2efa", "1777107857537-61ebcd60bf73"],
  },
  {
    sku: "MAH-LAV-010",
    nameEn: "Lavender Fields",
    nameFa: "مزارع اسطوخودوس",
    shortDescriptionEn: "French lavender with a calming herbal base.",
    shortDescriptionFa: "اسطوخودوس فرانسوی با پایه‌ای آرامش‌بخش از گیاهان.",
    descriptionEn: "True French lavender over a soft herbal base — the scent of a summer field at dusk.",
    descriptionFa: "اسطوخودوس اصیل فرانسوی روی پایه‌ای نرم از گیاهان؛ رایحه مزرعه‌ای تابستانی در غروب.",
    price: 300000,
    stockQuantity: 28,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "floral",
    fragranceNotesEn: "Lavender, chamomile, soft musk",
    fragranceNotesFa: "اسطوخودوس، بابونه، مشک ملایم",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Lavender purple",
    size: "Medium (200g)",
    isBestSeller: true,
    imageIds: ["1570823635306-250abb06d4b3", "1561212856-44e9bae482aa"],
  },
  {
    sku: "MAH-WTJ-011",
    nameEn: "White Tea & Jasmine",
    nameFa: "چای سفید و یاس",
    shortDescriptionEn: "Delicate white tea with night-blooming jasmine.",
    shortDescriptionFa: "چای سفید ظریف با یاس شب‌بو.",
    descriptionEn: "Delicate white tea leaves layered with night-blooming jasmine for a quiet, elegant scent.",
    descriptionFa: "برگ‌های ظریف چای سفید همراه با یاس شب‌بو برای رایحه‌ای آرام و شیک.",
    price: 330000,
    salePrice: 299000,
    stockQuantity: 16,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "floral",
    fragranceNotesEn: "White tea, jasmine, white musk",
    fragranceNotesFa: "چای سفید، یاس، مشک سفید",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Ivory",
    size: "Medium (200g)",
    imageIds: ["1596568840418-5f4db2029de0", "1667988152051-c689a7905701"],
  },
  {
    sku: "MAH-COC-012",
    nameEn: "Coconut Lime",
    nameFa: "نارگیل و لیمو",
    shortDescriptionEn: "Creamy coconut milk with zesty lime peel.",
    shortDescriptionFa: "شیر نارگیل خامه‌ای با پوست تند لیمو.",
    descriptionEn: "A tropical escape — creamy coconut milk brightened with zesty lime peel.",
    descriptionFa: "فراری استوایی؛ شیر نارگیل خامه‌ای که با پوست تند لیمو روشن شده است.",
    price: 280000,
    stockQuantity: 24,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "fruity",
    fragranceNotesEn: "Coconut milk, lime peel, vanilla",
    fragranceNotesFa: "شیر نارگیل، پوست لیمو، وانیل",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2200,
    weight: 200,
    color: "White",
    size: "Medium (200g)",
    isNewArrival: true,
    imageIds: ["1662462753990-bea51b4713cd", "1643122966676-29e8597257f7"],
  },
  {
    sku: "MAH-HON-013",
    nameEn: "Golden Honeycomb",
    nameFa: "لانه زنبور طلایی",
    shortDescriptionEn: "Warm honey and beeswax over soft vanilla.",
    shortDescriptionFa: "عسل گرم و موم زنبور روی وانیل نرم.",
    descriptionEn: "Golden honey and natural beeswax resting on a soft vanilla base.",
    descriptionFa: "عسل طلایی و موم طبیعی زنبور روی پایه‌ای نرم از وانیل.",
    price: 250000,
    stockQuantity: 20,
    categoryKeys: ["pillar"],
    fragranceKey: "vanilla",
    fragranceNotesEn: "Honey, beeswax, vanilla",
    fragranceNotesFa: "عسل، موم زنبور، وانیل",
    waxType: "Beeswax blend",
    wickType: "Cotton",
    burnTimeMinutes: 3600,
    weight: 260,
    color: "Golden",
    size: "Medium (260g)",
    imageIds: ["1603218678692-3967d7523bb0", "1617041261380-15cf80c39f26"],
  },
  {
    sku: "MAH-VET-014",
    nameEn: "Smoked Vetiver",
    nameFa: "وتیور دودی",
    shortDescriptionEn: "Earthy vetiver root with smoked birch and black pepper.",
    shortDescriptionFa: "ریشه خاکی وتیور با توس دودی و فلفل سیاه.",
    descriptionEn: "Earthy vetiver root, smoked birch, and a crack of black pepper — a bold, grounding scent.",
    descriptionFa: "ریشه خاکی وتیور، توس دودی و اندکی فلفل سیاه؛ رایحه‌ای جسور و آرامش‌بخش.",
    price: 890000,
    stockQuantity: 12,
    categoryKeys: ["luxury"],
    fragranceKey: "woody",
    fragranceNotesEn: "Vetiver, smoked birch, black pepper",
    fragranceNotesFa: "وتیور، توس دودی، فلفل سیاه",
    waxType: "Coconut-soy wax blend",
    wickType: "Wood wick",
    burnTimeMinutes: 4200,
    weight: 320,
    color: "Charcoal",
    size: "Large (320g)",
    isFeatured: true,
    imageIds: ["1659440508882-9202c080e573", "1714228499605-367154d9bdb2"],
    hasVariants: true,
  },
  {
    sku: "MAH-PEO-015",
    nameEn: "Peony Blush",
    nameFa: "صد تومانی صورتی",
    shortDescriptionEn: "Soft peony petals with a hint of blush rose.",
    shortDescriptionFa: "گلبرگ‌های نرم صد تومانی با لمسی از رز صورتی.",
    descriptionEn: "Soft, romantic peony petals paired with a blush of rose and a touch of powder.",
    descriptionFa: "گلبرگ‌های نرم و رمانتیک صد تومانی همراه با رز صورتی و لمسی از پودر.",
    price: 310000,
    stockQuantity: 19,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "floral",
    fragranceNotesEn: "Peony, blush rose, powder",
    fragranceNotesFa: "صد تومانی، رز صورتی، پودر",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Blush pink",
    size: "Medium (200g)",
    imageIds: ["1720788810349-7e51a042404a", "1720788810305-85fe22e6c3a2"],
  },
  {
    sku: "MAH-LIN-016",
    nameEn: "Fresh Linen",
    nameFa: "کتان تازه",
    shortDescriptionEn: "Crisp cotton and sun-dried linen.",
    shortDescriptionFa: "پنبه تمیز و کتان خشک‌شده در آفتاب.",
    descriptionEn: "The scent of line-dried linen on a breezy afternoon — crisp cotton and fresh air.",
    descriptionFa: "رایحه کتانی که در باد بعدازظهر خشک شده؛ پنبه‌ای تمیز و هوایی تازه.",
    price: 180000,
    stockQuantity: 35,
    categoryKeys: ["votive"],
    fragranceKey: "fresh",
    fragranceNotesEn: "Cotton, linen, fresh air",
    fragranceNotesFa: "پنبه، کتان، هوای تازه",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 900,
    weight: 60,
    color: "White",
    size: "Votive (60g)",
    imageIds: ["1605651202774-7d573fd3f12d", "1612293905607-b003de9e54fb"],
  },
  {
    sku: "MAH-BLF-017",
    nameEn: "Black Fig",
    nameFa: "انجیر سیاه",
    shortDescriptionEn: "Dark fig with blackcurrant and a woody base.",
    shortDescriptionFa: "انجیر تیره با کشمش سیاه و پایه‌ای چوبی.",
    descriptionEn: "Dark, juicy fig layered with blackcurrant over a warm woody base.",
    descriptionFa: "انجیر تیره و آبدار همراه با کشمش سیاه روی پایه‌ای گرم و چوبی.",
    price: 760000,
    salePrice: 690000,
    stockQuantity: 10,
    categoryKeys: ["luxury"],
    fragranceKey: "fruity",
    fragranceNotesEn: "Fig, blackcurrant, warm wood",
    fragranceNotesFa: "انجیر، کشمش سیاه، چوب گرم",
    waxType: "Coconut-soy wax blend",
    wickType: "Wood wick",
    burnTimeMinutes: 4000,
    weight: 300,
    color: "Deep purple",
    size: "Large (300g)",
    imageIds: ["1777107857537-61ebcd60bf73", "1762000801074-5311c802686d"],
  },
  {
    sku: "MAH-WBR-018",
    nameEn: "Wild Berry",
    nameFa: "توت وحشی",
    shortDescriptionEn: "Blackberry, raspberry, and a touch of mint leaf.",
    shortDescriptionFa: "تمشک سیاه، تمشک قرمز و لمسی از برگ نعنا.",
    descriptionEn: "A juicy tangle of blackberry and raspberry, brightened with a single mint leaf.",
    descriptionFa: "درهم‌تنیدگی آبدار تمشک سیاه و قرمز که با یک برگ نعنا روشن شده است.",
    price: 295000,
    stockQuantity: 21,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "fruity",
    fragranceNotesEn: "Blackberry, raspberry, mint",
    fragranceNotesFa: "تمشک سیاه، تمشک قرمز، نعنا",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2200,
    weight: 200,
    color: "Berry red",
    size: "Medium (200g)",
    imageIds: ["1643716991951-285e23e35961", "1602952706017-f3cc19eb98af"],
  },
  {
    sku: "MAH-SLT-019",
    nameEn: "Sea Salt & Sage",
    nameFa: "نمک دریا و مریم‌گلی",
    shortDescriptionEn: "Mineral sea salt with earthy sage and driftwood.",
    shortDescriptionFa: "نمک معدنی دریا با مریم‌گلی خاکی و چوب ساحلی.",
    descriptionEn: "Mineral sea salt paired with earthy sage and sun-bleached driftwood.",
    descriptionFa: "نمک معدنی دریا همراه با مریم‌گلی خاکی و چوب ساحلی سفیدشده در آفتاب.",
    price: 315000,
    stockQuantity: 25,
    categoryKeys: ["jar", "scented"],
    fragranceKey: "fresh",
    fragranceNotesEn: "Sea salt, sage, driftwood",
    fragranceNotesFa: "نمک دریا، مریم‌گلی، چوب ساحلی",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 200,
    color: "Sage green",
    size: "Medium (200g)",
    isBestSeller: true,
    imageIds: ["1667988152051-c689a7905701", "1596568840418-5f4db2029de0"],
  },
  {
    sku: "MAH-CAR-020",
    nameEn: "Cardamom & Clove",
    nameFa: "هل و میخک",
    shortDescriptionEn: "Warm cardamom pods with clove and dried orange.",
    shortDescriptionFa: "دانه‌های گرم هل با میخک و پرتقال خشک.",
    descriptionEn: "Warm cardamom pods steeped with clove and dried orange for a fireside evening.",
    descriptionFa: "دانه‌های گرم هل همراه با میخک و پرتقال خشک، مناسب عصری کنار شومینه.",
    price: 265000,
    stockQuantity: 18,
    categoryKeys: ["winter", "seasonal"],
    fragranceKey: "spicy",
    fragranceNotesEn: "Cardamom, clove, dried orange",
    fragranceNotesFa: "هل، میخک، پرتقال خشک",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2000,
    weight: 180,
    color: "Amber",
    size: "Small (180g)",
    imageIds: ["1554057009-6798cb3d4a04", "1643122941450-b97c7d6ed673"],
  },
  {
    sku: "MAH-ORC-021",
    nameEn: "Autumn Orchard",
    nameFa: "باغ میوه پاییزی",
    shortDescriptionEn: "Crisp apple and ripe pear with a cinnamon dusting.",
    shortDescriptionFa: "سیب تازه و گلابی رسیده با اندکی دارچین.",
    descriptionEn: "Crisp orchard apple and ripe pear, dusted with warm cinnamon.",
    descriptionFa: "سیب تازه باغ و گلابی رسیده، با کمی دارچین گرم.",
    price: 275000,
    stockQuantity: 19,
    categoryKeys: ["autumn", "seasonal"],
    fragranceKey: "fruity",
    fragranceNotesEn: "Apple, pear, cinnamon",
    fragranceNotesFa: "سیب، گلابی، دارچین",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2000,
    weight: 180,
    color: "Rust orange",
    size: "Small (180g)",
    imageIds: ["1595055301976-21a16cf33e67", "1595055258834-8290e4181590"],
  },
  {
    sku: "MAH-GFT-022",
    nameEn: "Trio of Serenity Gift Set",
    nameFa: "ست هدیه سه‌گانه آرامش",
    shortDescriptionEn: "Three travel-size candles: Lavender, Vanilla, and Ocean Mist.",
    shortDescriptionFa: "سه شمع کوچک: اسطوخودوس، وانیل و مه دریا.",
    descriptionEn: "A gift box of three travel-size candles — Lavender Fields, Vanilla Bean Bliss, and Ocean Mist — beautifully boxed.",
    descriptionFa: "جعبه هدیه‌ای شامل سه شمع کوچک؛ مزارع اسطوخودوس، وانیل رؤیایی و مه دریا، در بسته‌بندی زیبا.",
    price: 950000,
    stockQuantity: 14,
    categoryKeys: ["gift"],
    fragranceKey: "floral",
    fragranceNotesEn: "Lavender, vanilla, sea salt",
    fragranceNotesFa: "اسطوخودوس، وانیل، نمک دریا",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 1800,
    weight: 300,
    color: "Mixed",
    size: "Set of 3 (100g each)",
    isFeatured: true,
    imageIds: ["1786912281267-cb6284cd2efa", "1777107857721-36ccec3c77a0"],
  },
  {
    sku: "MAH-GFT-023",
    nameEn: "Fireside Duo Gift Set",
    nameFa: "ست هدیه دوتایی کنار آتش",
    shortDescriptionEn: "Amber Noir and Cardamom & Clove, boxed together.",
    shortDescriptionFa: "کهربای شب و هل و میخک، در یک بسته.",
    descriptionEn: "Two full-size candles — Amber Noir and Cardamom & Clove — packaged together for cozy nights in.",
    descriptionFa: "دو شمع کامل؛ کهربای شب و هل و میخک، برای شب‌های دنج در کنار هم بسته‌بندی شده‌اند.",
    price: 620000,
    stockQuantity: 11,
    categoryKeys: ["gift"],
    fragranceKey: "spicy",
    fragranceNotesEn: "Amber, cardamom, clove",
    fragranceNotesFa: "کهربا، هل، میخک",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 2400,
    weight: 400,
    color: "Mixed",
    size: "Set of 2 (200g each)",
    imageIds: ["1777107857537-61ebcd60bf73", "1760804876257-f073f77f2bcf"],
  },
  {
    sku: "MAH-VOT-024",
    nameEn: "Petit Votive Trio",
    nameFa: "سه‌تایی شمع کوچک",
    shortDescriptionEn: "Three petite Peony Blush votives in a gift box.",
    shortDescriptionFa: "سه شمع کوچک صد تومانی صورتی در جعبه هدیه.",
    descriptionEn: "Three petite Peony Blush votives, perfect as a small gift or a quick refresh of your space.",
    descriptionFa: "سه شمع کوچک صد تومانی صورتی؛ مناسب برای هدیه‌ای کوچک یا تازه کردن فضای خانه.",
    price: 210000,
    stockQuantity: 0,
    categoryKeys: ["votive", "gift"],
    fragranceKey: "floral",
    fragranceNotesEn: "Peony, blush rose",
    fragranceNotesFa: "صد تومانی، رز صورتی",
    waxType: "Soy wax blend",
    wickType: "Cotton",
    burnTimeMinutes: 900,
    weight: 180,
    color: "Blush pink",
    size: "Set of 3 votives (60g each)",
    imageIds: ["1720788810305-85fe22e6c3a2", "1605651202774-7d573fd3f12d"],
  },
];

const variantSizes = [
  { key: "small", en: "Small", fa: "کوچک", priceFactor: 0.7, weightFactor: 0.6 },
  { key: "medium", en: "Medium", fa: "متوسط", priceFactor: 1, weightFactor: 1 },
  { key: "large", en: "Large", fa: "بزرگ", priceFactor: 1.6, weightFactor: 1.8 },
];

async function seedProducts(categoryIds: Map<string, string>, fragranceIds: Map<string, string>) {
  const productIds: string[] = [];

  for (const p of productSeeds) {
    const fragranceFamilyId = fragranceIds.get(p.fragranceKey) ?? null;

    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        slugEn: p.sku.toLowerCase(),
        slugFa: `${p.sku.toLowerCase()}-fa`,
        sku: p.sku,
        nameEn: p.nameEn,
        nameFa: p.nameFa,
        shortDescriptionEn: p.shortDescriptionEn,
        shortDescriptionFa: p.shortDescriptionFa,
        descriptionEn: p.descriptionEn,
        descriptionFa: p.descriptionFa,
        status: "PUBLISHED",
        hasVariants: Boolean(p.hasVariants),
        price: p.price,
        salePrice: p.salePrice ?? null,
        stockQuantity: p.hasVariants ? 0 : p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold ?? 5,
        weight: p.weight,
        waxType: p.waxType,
        wickType: p.wickType,
        burnTimeMinutes: p.burnTimeMinutes,
        fragranceFamilyId,
        fragranceNotesEn: p.fragranceNotesEn,
        fragranceNotesFa: p.fragranceNotesFa,
        color: p.color,
        size: p.size,
        ingredientsEn: ingredientsEn,
        ingredientsFa: ingredientsFa,
        careInstructionsEn,
        careInstructionsFa,
        safetyInstructionsEn,
        safetyInstructionsFa,
        seoTitleEn: `${p.nameEn} | MAH Candle Co.`,
        seoTitleFa: `${p.nameFa} | مه کندل`,
        seoDescriptionEn: p.shortDescriptionEn,
        seoDescriptionFa: p.shortDescriptionFa,
        isFeatured: Boolean(p.isFeatured),
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
        publishedAt: new Date(),
      },
      update: {
        nameEn: p.nameEn,
        nameFa: p.nameFa,
        shortDescriptionEn: p.shortDescriptionEn,
        shortDescriptionFa: p.shortDescriptionFa,
        descriptionEn: p.descriptionEn,
        descriptionFa: p.descriptionFa,
        price: p.price,
        salePrice: p.salePrice ?? null,
        fragranceFamilyId,
        isFeatured: Boolean(p.isFeatured),
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
      },
    });
    productIds.push(product.id);

    // categories
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    for (const key of p.categoryKeys) {
      const categoryId = categoryIds.get(key);
      if (categoryId) {
        await prisma.productCategory.create({ data: { productId: product.id, categoryId } });
      }
    }

    // images
    const existingImages = await prisma.productImage.count({ where: { productId: product.id } });
    if (existingImages === 0) {
      let sortOrder = 0;
      for (const imageId of p.imageIds) {
        const url = await downloadImage(imageId, `${p.sku.toLowerCase()}-${sortOrder}.jpg`);
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url,
            altEn: p.nameEn,
            altFa: p.nameFa,
            sortOrder,
            isPrimary: sortOrder === 0,
          },
        });
        sortOrder += 1;
      }
    }

    // variants
    if (p.hasVariants) {
      const existingVariants = await prisma.productVariant.count({ where: { productId: product.id } });
      if (existingVariants === 0) {
        for (const variant of variantSizes) {
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `${p.sku}-${variant.key.toUpperCase()}`,
              nameEn: `${p.nameEn} - ${variant.en}`,
              nameFa: `${p.nameFa} - ${variant.fa}`,
              size: variant.en,
              price: Math.round((p.price * variant.priceFactor) / 1000) * 1000,
              stockQuantity: Math.round(p.stockQuantity / 3),
              weight: Math.round(p.weight * variant.weightFactor),
            },
          });
        }
      }

      // Product.stockQuantity is a display fallback for variant products (real stock lives on
      // each ProductVariant) — keep it synced to the sum so listing/search "in stock" badges,
      // which read the aggregate field, aren't wrong for products that do have variant stock.
      const variantStockSum = await prisma.productVariant.aggregate({
        where: { productId: product.id },
        _sum: { stockQuantity: true },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: variantStockSum._sum.stockQuantity ?? 0 },
      });
    }
  }

  console.log(`Seeded ${productSeeds.length} products`);
  return productIds;
}

// ---------- Reviews ----------

const reviewBodies = [
  {
    en: "This is genuinely one of the best candles I've owned — the scent fills the room without being overpowering.",
    fa: "این واقعاً یکی از بهترین شمع‌هایی است که داشته‌ام؛ رایحه فضا را پر می‌کند بدون اینکه آزاردهنده باشد.",
    rating: 5,
  },
  {
    en: "Lovely fragrance and it burns evenly. Will definitely order again.",
    fa: "رایحه دلنشین و سوختن یکنواخت. حتماً دوباره سفارش می‌دهم.",
    rating: 5,
  },
  {
    en: "Nice scent, a bit lighter than I expected but still a great candle.",
    fa: "رایحه خوبی دارد، کمی سبک‌تر از انتظارم بود ولی همچنان شمع خوبی است.",
    rating: 4,
  },
  {
    en: "The packaging was beautiful and the candle throws scent really well.",
    fa: "بسته‌بندی زیبا بود و رایحه شمع خیلی خوب پخش می‌شود.",
    rating: 5,
  },
  {
    en: "Good quality candle, burns cleanly with no soot.",
    fa: "کیفیت خوبی دارد و بدون دوده می‌سوزد.",
    rating: 4,
  },
];

async function seedReviews(productIds: string[], customers: { id: string }[]) {
  let count = 0;
  for (const productId of productIds) {
    const existing = await prisma.review.count({ where: { productId } });
    if (existing > 0) continue;

    const numReviews = 2 + Math.floor(Math.random() * 3); // 2-4 reviews
    const shuffled = [...reviewBodies].sort(() => Math.random() - 0.5).slice(0, numReviews);
    let ratingSum = 0;

    for (let i = 0; i < shuffled.length; i++) {
      const review = shuffled[i]!;
      const customer = customers[i % customers.length]!;
      await prisma.review.create({
        data: {
          productId,
          customerId: customer.id,
          rating: review.rating,
          body: review.en,
          locale: "en",
          status: "APPROVED",
          isFeatured: i === 0,
        },
      });
      ratingSum += review.rating;
      count += 1;
    }

    const average = Math.round((ratingSum / shuffled.length) * 10) / 10;
    await prisma.product.update({
      where: { id: productId },
      data: { averageRating: average, reviewCount: shuffled.length },
    });
  }
  console.log(`Seeded ${count} reviews`);
}

// ---------- Coupons ----------

async function seedCoupons() {
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    create: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      appliedTo: "ALL",
      isActive: true,
    },
    update: { isActive: true },
  });

  await prisma.coupon.upsert({
    where: { code: "SAVE50K" },
    create: {
      code: "SAVE50K",
      type: "FIXED",
      value: 50000,
      appliedTo: "ALL",
      minOrderAmount: 500000,
      isActive: true,
    },
    update: { isActive: true },
  });

  console.log("Seeded coupons: WELCOME10, SAVE50K");
}

// ---------- Newsletter ----------

async function seedNewsletter() {
  await prisma.newsletterSubscriber.upsert({
    where: { email: "subscriber@example.com" },
    create: { email: "subscriber@example.com" },
    update: {},
  });
}

// ---------- Homepage sections ----------

async function seedHomepageSections() {
  const heroImage = await downloadImage("1720788810349-7e51a042404a", "hero-main.jpg");
  const promoImage = await downloadImage("1762000801074-5311c802686d", "promo-banner.jpg");

  const sections = [
    {
      type: "HERO" as const,
      titleEn: "A Glow in the Mist",
      titleFa: "نوری در دل مه",
      subtitleEn: "Hand-poured candles made with clean-burning wax and real fragrance oils.",
      subtitleFa: "شمع‌های دست‌ساز با موم پاک‌سوز و روغن‌های رایحه‌ای اصیل.",
      ctaLabelEn: "Shop All Candles",
      ctaLabelFa: "مشاهده همه شمع‌ها",
      ctaLink: "/candles",
      secondaryCtaLabelEn: "Best Sellers",
      secondaryCtaLabelFa: "پرفروش‌ترین‌ها",
      secondaryCtaLink: "/candles?bestSeller=1",
      badgeEn: "New Season",
      badgeFa: "فصل جدید",
      imageUrl: heroImage,
      sortOrder: 0,
    },
    {
      type: "FEATURED_CATEGORIES" as const,
      titleEn: "Shop by Category",
      titleFa: "خرید بر اساس دسته‌بندی",
      sortOrder: 1,
    },
    {
      type: "BEST_SELLERS" as const,
      titleEn: "Best Sellers",
      titleFa: "پرفروش‌ترین‌ها",
      sortOrder: 2,
    },
    {
      type: "NEW_ARRIVALS" as const,
      titleEn: "New Arrivals",
      titleFa: "جدیدترین‌ها",
      sortOrder: 3,
    },
    {
      type: "SHOP_BY_FRAGRANCE" as const,
      titleEn: "Shop by Fragrance",
      titleFa: "خرید بر اساس رایحه",
      sortOrder: 4,
    },
    {
      type: "PROMO_BANNER" as const,
      titleEn: "Free Shipping Over 2,000,000 Toman",
      titleFa: "ارسال رایگان برای سفارش‌های بالای ۲,۰۰۰,۰۰۰ تومان",
      descriptionEn: "Shop our full collection and enjoy free shipping on qualifying orders.",
      descriptionFa: "از مجموعه کامل ما خرید کنید و از ارسال رایگان بهره‌مند شوید.",
      ctaLabelEn: "Shop Now",
      ctaLabelFa: "همین حالا خرید کنید",
      ctaLink: "/candles",
      imageUrl: promoImage,
      sortOrder: 5,
    },
    {
      type: "ABOUT" as const,
      titleEn: "Our Story",
      titleFa: "داستان ما",
      descriptionEn:
        "MAH Candle Co. (مه کندل) hand-pours every candle in small batches, using clean-burning wax and real fragrance oils — a glow in the mist for every room.",
      descriptionFa: "مه کندل هر شمع را در دسته‌های کوچک و با دست می‌سازد؛ با موم پاک‌سوز و روغن‌های رایحه‌ای اصیل، نوری در دل مه برای هر فضا.",
      sortOrder: 6,
    },
    {
      type: "NEWSLETTER" as const,
      titleEn: "Stay in the Glow",
      titleFa: "در جریان مه کندل بمانید",
      sortOrder: 7,
    },
  ];

  for (const section of sections) {
    const existing = await prisma.homepageSection.findFirst({ where: { type: section.type } });
    if (existing) {
      await prisma.homepageSection.update({ where: { id: existing.id }, data: section });
    } else {
      await prisma.homepageSection.create({ data: { ...section, isEnabled: true } });
    }
  }

  console.log(`Seeded ${sections.length} homepage sections`);
}

async function main() {
  console.log("Seeding MAH Candle Co. (مه کندل)...");
  await seedAdmin();
  const customers = await seedCustomers();
  const categoryIds = await seedCategories();
  const fragranceIds = await seedFragranceFamilies();
  await seedTags();
  const productIds = await seedProducts(categoryIds, fragranceIds);
  await seedReviews(productIds, customers);
  await seedCoupons();
  await seedNewsletter();
  await seedHomepageSections();
  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
