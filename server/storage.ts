
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";
import { promises as fs } from "fs";
import {
  users, products, orders, slides,
  type User, type InsertUser,
  type Product, type InsertProduct, type UpdateProductRequest,
  type Order, type InsertOrder, type UpdateOrderStatusRequest,
  type Slide, type InsertSlide, type UpdateSlideRequest
} from "@shared/schema";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import memorystore from "memorystore";
import * as schema from "@shared/schema";

const PostgresSessionStore = connectPg(session);
const MemorySessionStore = memorystore(session);

export interface IStorage {
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getAdminUser(): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Pick<InsertUser, "password" | "role">>): Promise<User>;

  // Shipping
  getShippingConfig(): Promise<{
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  } | null>;
  setShippingConfig(input: {
    apiUrl: string;
    apiId: string;
    apiToken?: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  }): Promise<void>;

  // Site
  getSiteConfig(): Promise<{
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null>;
  setSiteConfig(input: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  }): Promise<void>;

  // Slides
  getSlides(): Promise<Slide[]>;
  createSlide(input: InsertSlide): Promise<Slide>;
  updateSlide(id: number, updates: UpdateSlideRequest): Promise<Slide>;
  deleteSlide(id: number): Promise<void>;

  // Products
  getProducts(category?: string, search?: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  decrementProductStock(productId: number, quantity: number): Promise<boolean>;
  createOrderFromCart(input: {
    customerName: string;
    phone: string;
    wilaya: string;
    address: string;
    items: Array<{ productId: number; quantity: number }>;
  }): Promise<Order>;
  getOrders(): Promise<Order[]>; // For admin
  getOrder(id: number): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order>;

  // Seed
  seedDefaultData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private db: ReturnType<typeof drizzle>;
  private siteConfigPath: string;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool, { schema });

    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });

    this.siteConfigPath =
      (process.env.SITE_CONFIG_FILE ?? "").trim() ||
      path.join(process.cwd(), "data", "site-config.json");
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAdminUser(): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.role, "admin"));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<Pick<InsertUser, "password" | "role">>,
  ): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getShippingConfig(): Promise<{
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  } | null> {
    const apiUrl = (process.env.SHIPPING_API_URL ?? "").trim();
    const apiId = (process.env.SHIPPING_API_ID ?? "").trim();
    const apiToken = (process.env.SHIPPING_API_TOKEN ?? "").trim();
    const fromWilayaName = (process.env.SHIPPING_FROM_WILAYA_NAME ?? "").trim();
    const defaultCommune = (process.env.SHIPPING_DEFAULT_COMMUNE ?? "").trim();
    if (!apiUrl && !apiId && !apiToken) return null;
    return {
      apiUrl,
      apiId,
      apiToken,
      fromWilayaName: fromWilayaName || undefined,
      defaultCommune: defaultCommune || undefined,
    };
  }

  async setShippingConfig(_input: {
    apiUrl: string;
    apiId: string;
    apiToken?: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  }): Promise<void> {
    throw new Error("Shipping config must be set via environment variables");
  }

  private async readSiteConfigFile(): Promise<{
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null> {
    try {
      await fs.mkdir(path.dirname(this.siteConfigPath), { recursive: true });
      const raw = await fs.readFile(this.siteConfigPath, "utf8");
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (err: any) {
      if (err?.code === "ENOENT") return null;
      throw err;
    }
  }

  private async writeSiteConfigFile(input: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null): Promise<void> {
    await fs.mkdir(path.dirname(this.siteConfigPath), { recursive: true });
    if (!input) {
      await fs.writeFile(this.siteConfigPath, JSON.stringify({}, null, 2), "utf8");
      return;
    }
    await fs.writeFile(this.siteConfigPath, JSON.stringify(input, null, 2), "utf8");
  }

  async getSiteConfig(): Promise<{
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null> {
    const envLogoUrl = (process.env.SITE_LOGO_URL ?? "").trim();
    const fileCfg = await this.readSiteConfigFile();
    const merged = {
      ...(fileCfg ?? {}),
      ...(envLogoUrl ? { logoUrl: envLogoUrl } : {}),
    };

    if (
      !merged.logoUrl &&
      !merged.homeCategoriesTitle &&
      !merged.homeCategoriesTitleFr &&
      !merged.homeCategoriesSubtitle &&
      !merged.homeCategoriesSubtitleFr &&
      merged.announcementEnabled !== true &&
      !merged.announcementSpeedSeconds &&
      (!merged.announcementItems || merged.announcementItems.length === 0) &&
      (!merged.homeQuickLinks || merged.homeQuickLinks.length === 0) &&
      merged.lingerieHeroEnabled !== true &&
      !merged.lingerieHeroImageUrl &&
      !merged.lingerieHeroTitle &&
      !merged.lingerieHeroButtonText &&
      !merged.lingerieHeroButtonLink &&
      (!merged.homeCategoryHighlights || merged.homeCategoryHighlights.length === 0) &&
      (!merged.checkoutWilayas || merged.checkoutWilayas.length === 0) &&
      (!merged.deliveryCompanies || merged.deliveryCompanies.length === 0)
    ) {
      return null;
    }
    return merged;
  }

  async setSiteConfig(input: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  }): Promise<void> {
    const nextLogoUrl = (input.logoUrl ?? "").trim();
    const nextHighlights = Array.isArray(input.homeCategoryHighlights)
      ? input.homeCategoryHighlights
      : undefined;
    const nextQuickLinks = Array.isArray(input.homeQuickLinks) ? input.homeQuickLinks : undefined;
    const nextHomeCategoriesTitle = (input.homeCategoriesTitle ?? "").trim();
    const nextHomeCategoriesTitleFr = (input.homeCategoriesTitleFr ?? "").trim();
    const nextHomeCategoriesSubtitle = (input.homeCategoriesSubtitle ?? "").trim();
    const nextHomeCategoriesSubtitleFr = (input.homeCategoriesSubtitleFr ?? "").trim();
    const nextAnnouncementEnabled =
      input.announcementEnabled !== undefined ? Boolean(input.announcementEnabled) : undefined;
    const nextAnnouncementSpeedSeconds =
      input.announcementSpeedSeconds !== undefined ? Number(input.announcementSpeedSeconds) : undefined;
    const nextAnnouncementItems = Array.isArray(input.announcementItems)
      ? input.announcementItems
      : undefined;
    const nextLingerieHeroEnabled =
      input.lingerieHeroEnabled !== undefined ? Boolean(input.lingerieHeroEnabled) : undefined;
    const nextLingerieHeroImageUrl = (input.lingerieHeroImageUrl ?? "").trim();
    const nextLingerieHeroTitle = (input.lingerieHeroTitle ?? "").trim();
    const nextLingerieHeroButtonText = (input.lingerieHeroButtonText ?? "").trim();
    const nextLingerieHeroButtonLink = (input.lingerieHeroButtonLink ?? "").trim();
    const nextCheckoutWilayas = Array.isArray(input.checkoutWilayas)
      ? input.checkoutWilayas
      : undefined;
    const nextDeliveryCompanies = Array.isArray(input.deliveryCompanies)
      ? input.deliveryCompanies
      : undefined;

    const existing = (await this.readSiteConfigFile()) ?? {};
    const next = {
      ...existing,
      ...(input.logoUrl !== undefined ? { logoUrl: nextLogoUrl || undefined } : {}),
      ...(input.homeCategoriesTitle !== undefined ? { homeCategoriesTitle: nextHomeCategoriesTitle || undefined } : {}),
      ...(input.homeCategoriesTitleFr !== undefined ? { homeCategoriesTitleFr: nextHomeCategoriesTitleFr || undefined } : {}),
      ...(input.homeCategoriesSubtitle !== undefined ? { homeCategoriesSubtitle: nextHomeCategoriesSubtitle || undefined } : {}),
      ...(input.homeCategoriesSubtitleFr !== undefined ? { homeCategoriesSubtitleFr: nextHomeCategoriesSubtitleFr || undefined } : {}),
      ...(input.announcementEnabled !== undefined ? { announcementEnabled: nextAnnouncementEnabled } : {}),
      ...(input.announcementSpeedSeconds !== undefined ? { announcementSpeedSeconds: nextAnnouncementSpeedSeconds } : {}),
      ...(nextAnnouncementItems !== undefined ? { announcementItems: nextAnnouncementItems } : {}),
      ...(nextQuickLinks !== undefined ? { homeQuickLinks: nextQuickLinks } : {}),
      ...(input.lingerieHeroEnabled !== undefined ? { lingerieHeroEnabled: nextLingerieHeroEnabled } : {}),
      ...(input.lingerieHeroImageUrl !== undefined ? { lingerieHeroImageUrl: nextLingerieHeroImageUrl || undefined } : {}),
      ...(input.lingerieHeroTitle !== undefined ? { lingerieHeroTitle: nextLingerieHeroTitle || undefined } : {}),
      ...(input.lingerieHeroButtonText !== undefined ? { lingerieHeroButtonText: nextLingerieHeroButtonText || undefined } : {}),
      ...(input.lingerieHeroButtonLink !== undefined ? { lingerieHeroButtonLink: nextLingerieHeroButtonLink || undefined } : {}),
      ...(nextHighlights !== undefined ? { homeCategoryHighlights: nextHighlights } : {}),
      ...(nextCheckoutWilayas !== undefined ? { checkoutWilayas: nextCheckoutWilayas } : {}),
      ...(nextDeliveryCompanies !== undefined ? { deliveryCompanies: nextDeliveryCompanies } : {}),
    };

    if (
      !next.logoUrl &&
      !next.homeCategoriesTitle &&
      !next.homeCategoriesTitleFr &&
      !next.homeCategoriesSubtitle &&
      !next.homeCategoriesSubtitleFr &&
      next.announcementEnabled !== true &&
      !next.announcementSpeedSeconds &&
      (!next.announcementItems || next.announcementItems.length === 0) &&
      (!next.homeQuickLinks || next.homeQuickLinks.length === 0) &&
      next.lingerieHeroEnabled !== true &&
      !next.lingerieHeroImageUrl &&
      !next.lingerieHeroTitle &&
      !next.lingerieHeroButtonText &&
      !next.lingerieHeroButtonLink &&
      (!next.homeCategoryHighlights || next.homeCategoryHighlights.length === 0) &&
      (!next.checkoutWilayas || next.checkoutWilayas.length === 0) &&
      (!next.deliveryCompanies || next.deliveryCompanies.length === 0)
    ) {
      await this.writeSiteConfigFile(null);
      return;
    }
    await this.writeSiteConfigFile(next);
  }

  async getSlides(): Promise<Slide[]> {
    return await this.db
      .select()
      .from(slides)
      .orderBy(slides.sortOrder, desc(slides.createdAt));
  }

  async createSlide(input: InsertSlide): Promise<Slide> {
    const [created] = await this.db.insert(slides).values(input).returning();
    return created;
  }

  async updateSlide(id: number, updates: UpdateSlideRequest): Promise<Slide> {
    const [updated] = await this.db
      .update(slides)
      .set(updates)
      .where(eq(slides.id, id))
      .returning();
    if (!updated) throw new Error("Slide not found");
    return updated;
  }

  async deleteSlide(id: number): Promise<void> {
    await this.db.delete(slides).where(eq(slides.id, id));
  }

  // Products
  async getProducts(category?: string, search?: string): Promise<Product[]> {
    let query = this.db.select().from(products);

    if (category) {
      query = query.where(eq(products.category, category)) as any;
    }

    // Simple search implementation could be added here if needed using ilike

    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await this.db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const [updatedProduct] = await this.db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await this.db.insert(orders).values(order).returning();
    return newOrder;
  }

  async decrementProductStock(productId: number, quantity: number): Promise<boolean> {
    const [updated] = await this.db
      .update(products)
      .set({ stock: sql`${products.stock} - ${quantity}` })
      .where(and(eq(products.id, productId), gte(products.stock, quantity)))
      .returning({ id: products.id });
    return Boolean(updated);
  }

  async createOrderFromCart(input: {
    customerName: string;
    phone: string;
    wilaya: string;
    address: string;
    items: Array<{ productId: number; quantity: number }>;
  }): Promise<Order> {
    const deliveryFee = 500;
    return await this.db.transaction(async (tx) => {
      const ids = Array.from(new Set(input.items.map((i) => i.productId)));
      const rows = ids.length
        ? await tx.select().from(products).where(inArray(products.id, ids))
        : [];
      const byId = new Map(rows.map((p) => [p.id, p]));

      const orderItems: Array<{ productId: number; quantity: number; price: string }> = [];
      let subtotal = 0;

      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        const priceNum = Number(product.price);
        if (!Number.isFinite(priceNum)) {
          throw new Error(`Invalid price for product: ${item.productId}`);
        }
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          throw new Error("Invalid quantity");
        }

        const [updated] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${qty}` })
          .where(and(eq(products.id, item.productId), gte(products.stock, qty)))
          .returning({ id: products.id });
        if (!updated) {
          throw new Error(`Insufficient stock: ${item.productId}`);
        }

        subtotal += priceNum * qty;
        orderItems.push({ productId: item.productId, quantity: qty, price: String(product.price) });
      }

      const totalPrice = String(subtotal + deliveryFee);
      const [newOrder] = await tx
        .insert(orders)
        .values({
          customerName: input.customerName,
          phone: input.phone,
          wilaya: input.wilaya,
          address: input.address,
          totalPrice,
          items: orderItems as any,
        })
        .returning();

      return newOrder;
    });
  }

  async getOrders(): Promise<Order[]> {
    return await this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updatedOrder] = await this.db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async seedDefaultData(): Promise<void> {
    const existingSlides = await this.getSlides();
    if (existingSlides.length === 0) {
      await this.createSlide({
        title: "أحدث الهواتف الذكية",
        titleFr: "Derniers Smartphones",
        subtitle: "عروض حصرية ومميزة",
        subtitleFr: "Offres Exclusives",
        description: "اكتشف تشكيلة واسعة من الهواتف الذكية بأفضل الأسعار والمواصفات",
        descriptionFr: "Découvrez notre large gamme de smartphones aux meilleurs prix",
        buttonText: "تسوق الآن",
        buttonTextFr: "Acheter Maintenant",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1920&q=80",
        linkUrl: "/products?category=Smartphones",
        sortOrder: 1,
      });
      await this.createSlide({
        title: "أقوى أجهزة الكمبيوتر",
        titleFr: "Ordinateurs Puissants",
        subtitle: "أداء لا يضاهى",
        subtitleFr: "Performance Inégalée",
        description: "أجهزة لابتوب وكمبيوتر مكتبي تناسب جميع احتياجاتك العملية والترفيهية",
        descriptionFr: "Laptops et desktops pour tous vos besoins",
        buttonText: "اكتشف المزيد",
        buttonTextFr: "Découvrir Plus",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1920&q=80",
        linkUrl: "/products?category=Laptops",
        sortOrder: 2,
      });
    } else {
      // Update existing slides with French content if missing
      for (const slide of existingSlides) {
        if (!slide.titleFr) {
          let updates: UpdateSlideRequest = {};
          if (slide.title.includes("الهواتف") || slide.imageUrl.includes("photo-1511707171634")) {
            updates = {
              titleFr: "Derniers Smartphones",
              subtitleFr: "Offres Exclusives",
              descriptionFr: "Découvrez notre large gamme de smartphones aux meilleurs prix",
              buttonTextFr: "Acheter Maintenant"
            };
          } else if (slide.title.includes("الكمبيوتر") || slide.imageUrl.includes("photo-1517336714731")) {
            updates = {
              titleFr: "Ordinateurs Puissants",
              subtitleFr: "Performance Inégalée",
              descriptionFr: "Laptops et desktops pour tous vos besoins",
              buttonTextFr: "Découvrir Plus"
            };
          }

          if (Object.keys(updates).length > 0) {
            try {
              await this.updateSlide(slide.id, updates);
            } catch (e) {
              console.error(`Failed to update slide ${slide.id} with French content`, e);
            }
          }
        }
      }
    }

    const existingProducts = await this.getProducts();
    if (existingProducts.length === 0) {
      await this.createProduct({
        name: "iPhone 15 Pro Max",
        nameFr: "iPhone 15 Pro Max",
        description: "The latest iPhone with titanium design and A17 Pro chip.",
        descriptionFr: "Le dernier iPhone avec design en titane et puce A17 Pro.",
        category: "Smartphones",
        price: "150000",
        stock: 10,
        images: ["https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=800&q=80"],
        specifications: { "Brand": "Apple", "Storage": "256GB" },
        isFeatured: true,
      });
      await this.createProduct({
        name: "MacBook Pro M3",
        nameFr: "MacBook Pro M3",
        description: "Mind-blowing performance with the M3 chip.",
        descriptionFr: "Performance époustouflante avec la puce M3.",
        category: "Laptops",
        price: "350000",
        stock: 5,
        images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"],
        specifications: { "Brand": "Apple", "Processor": "M3 Pro" },
        isFeatured: true,
      });
    } else {
      // Update existing products with French content if missing
      for (const product of existingProducts) {
        if (!product.nameFr) {
          let updates: UpdateProductRequest = {};
          if (product.name.includes("iPhone")) {
            updates = {
              nameFr: product.name,
              descriptionFr: "Le dernier iPhone avec design en titane et puce A17 Pro."
            };
          } else if (product.name.includes("MacBook")) {
            updates = {
              nameFr: product.name,
              descriptionFr: "Performance époustouflante avec la puce M3."
            };
          } else {
            // Generic fallback or auto-translation simulation
            updates = {
              nameFr: product.name,
              descriptionFr: product.description // Fallback to English/Arabic description
            };
          }

          if (Object.keys(updates).length > 0) {
            try {
              await this.updateProduct(product.id, updates);
            } catch (e) {
              console.error(`Failed to update product ${product.id} with French content`, e);
            }
          }
        }
      }
    }
  }
}

class MemoryStorage implements IStorage {
  sessionStore: session.Store;

  private users: User[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];
  private slides: Slide[] = [];
  private shippingConfig: {
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  } | null = null;
  private siteConfig: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null = null;

  private nextUserId = 1;
  private nextProductId = 1;
  private nextOrderId = 1;
  private nextSlideId = 1;

  constructor() {
    this.sessionStore = new MemorySessionStore({
      checkPeriod: 24 * 60 * 60 * 1000,
    });
  }

  async getShippingConfig(): Promise<{
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  } | null> {
    return this.shippingConfig;
  }

  async setShippingConfig(input: {
    apiUrl: string;
    apiId: string;
    apiToken?: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  }): Promise<void> {
    const apiToken = (input.apiToken ?? "").trim();
    const next = {
      apiUrl: input.apiUrl,
      apiId: input.apiId,
      apiToken: apiToken || (this.shippingConfig?.apiToken ?? ""),
      fromWilayaName: input.fromWilayaName?.trim() || this.shippingConfig?.fromWilayaName,
      defaultCommune: input.defaultCommune?.trim() || this.shippingConfig?.defaultCommune,
    };
    if (!next.apiUrl && !next.apiId && !next.apiToken) {
      this.shippingConfig = null;
      return;
    }
    this.shippingConfig = next;
  }

  async getSiteConfig(): Promise<{
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null> {
    return this.siteConfig;
  }

  async setSiteConfig(input: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  }): Promise<void> {
    const nextLogoUrl = (input.logoUrl ?? "").trim();
    const nextHighlights = Array.isArray(input.homeCategoryHighlights)
      ? input.homeCategoryHighlights
      : undefined;
    const nextQuickLinks = Array.isArray(input.homeQuickLinks) ? input.homeQuickLinks : undefined;
    const nextHomeCategoriesTitle = (input.homeCategoriesTitle ?? "").trim();
    const nextHomeCategoriesTitleFr = (input.homeCategoriesTitleFr ?? "").trim();
    const nextHomeCategoriesSubtitle = (input.homeCategoriesSubtitle ?? "").trim();
    const nextHomeCategoriesSubtitleFr = (input.homeCategoriesSubtitleFr ?? "").trim();
    const nextAnnouncementEnabled =
      input.announcementEnabled !== undefined ? Boolean(input.announcementEnabled) : undefined;
    const nextAnnouncementSpeedSeconds =
      input.announcementSpeedSeconds !== undefined ? Number(input.announcementSpeedSeconds) : undefined;
    const nextAnnouncementItems = Array.isArray(input.announcementItems)
      ? input.announcementItems
      : undefined;
    const nextLingerieHeroEnabled =
      input.lingerieHeroEnabled !== undefined ? Boolean(input.lingerieHeroEnabled) : undefined;
    const nextLingerieHeroImageUrl = (input.lingerieHeroImageUrl ?? "").trim();
    const nextLingerieHeroTitle = (input.lingerieHeroTitle ?? "").trim();
    const nextLingerieHeroButtonText = (input.lingerieHeroButtonText ?? "").trim();
    const nextLingerieHeroButtonLink = (input.lingerieHeroButtonLink ?? "").trim();
    const nextCheckoutWilayas = Array.isArray(input.checkoutWilayas)
      ? input.checkoutWilayas
      : undefined;
    const nextDeliveryCompanies = Array.isArray(input.deliveryCompanies)
      ? input.deliveryCompanies
      : undefined;

    const existing = this.siteConfig ?? {};
    const next = {
      ...existing,
      ...(input.logoUrl !== undefined ? { logoUrl: nextLogoUrl || undefined } : {}),
      ...(input.homeCategoriesTitle !== undefined ? { homeCategoriesTitle: nextHomeCategoriesTitle || undefined } : {}),
      ...(input.homeCategoriesTitleFr !== undefined ? { homeCategoriesTitleFr: nextHomeCategoriesTitleFr || undefined } : {}),
      ...(input.homeCategoriesSubtitle !== undefined ? { homeCategoriesSubtitle: nextHomeCategoriesSubtitle || undefined } : {}),
      ...(input.homeCategoriesSubtitleFr !== undefined ? { homeCategoriesSubtitleFr: nextHomeCategoriesSubtitleFr || undefined } : {}),
      ...(input.announcementEnabled !== undefined ? { announcementEnabled: nextAnnouncementEnabled } : {}),
      ...(input.announcementSpeedSeconds !== undefined ? { announcementSpeedSeconds: nextAnnouncementSpeedSeconds } : {}),
      ...(nextAnnouncementItems !== undefined ? { announcementItems: nextAnnouncementItems } : {}),
      ...(nextQuickLinks !== undefined ? { homeQuickLinks: nextQuickLinks } : {}),
      ...(input.lingerieHeroEnabled !== undefined ? { lingerieHeroEnabled: nextLingerieHeroEnabled } : {}),
      ...(input.lingerieHeroImageUrl !== undefined ? { lingerieHeroImageUrl: nextLingerieHeroImageUrl || undefined } : {}),
      ...(input.lingerieHeroTitle !== undefined ? { lingerieHeroTitle: nextLingerieHeroTitle || undefined } : {}),
      ...(input.lingerieHeroButtonText !== undefined ? { lingerieHeroButtonText: nextLingerieHeroButtonText || undefined } : {}),
      ...(input.lingerieHeroButtonLink !== undefined ? { lingerieHeroButtonLink: nextLingerieHeroButtonLink || undefined } : {}),
      ...(nextHighlights !== undefined ? { homeCategoryHighlights: nextHighlights } : {}),
      ...(nextCheckoutWilayas !== undefined ? { checkoutWilayas: nextCheckoutWilayas } : {}),
      ...(nextDeliveryCompanies !== undefined ? { deliveryCompanies: nextDeliveryCompanies } : {}),
    };

    if (
      !next.logoUrl &&
      !next.homeCategoriesTitle &&
      !next.homeCategoriesTitleFr &&
      !next.homeCategoriesSubtitle &&
      !next.homeCategoriesSubtitleFr &&
      next.announcementEnabled !== true &&
      !next.announcementSpeedSeconds &&
      (!next.announcementItems || next.announcementItems.length === 0) &&
      (!next.homeQuickLinks || next.homeQuickLinks.length === 0) &&
      next.lingerieHeroEnabled !== true &&
      !next.lingerieHeroImageUrl &&
      !next.lingerieHeroTitle &&
      !next.lingerieHeroButtonText &&
      !next.lingerieHeroButtonLink &&
      (!next.homeCategoryHighlights || next.homeCategoryHighlights.length === 0) &&
      (!next.checkoutWilayas || next.checkoutWilayas.length === 0) &&
      (!next.deliveryCompanies || next.deliveryCompanies.length === 0)
    ) {
      this.siteConfig = null;
      return;
    }
    this.siteConfig = next;
  }

  async getSlides(): Promise<Slide[]> {
    return [...this.slides].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async createSlide(input: InsertSlide): Promise<Slide> {
    const created: Slide = {
      id: this.nextSlideId++,
      title: input.title,
      titleFr: input.titleFr ?? null,
      subtitle: input.subtitle ?? null,
      subtitleFr: input.subtitleFr ?? null,
      description: input.description ?? null,
      descriptionFr: input.descriptionFr ?? null,
      buttonText: input.buttonText ?? null,
      buttonTextFr: input.buttonTextFr ?? null,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl,
      sortOrder: input.sortOrder ?? 0,
      createdAt: new Date(),
    };
    this.slides.push(created);
    return created;
  }

  async updateSlide(id: number, updates: UpdateSlideRequest): Promise<Slide> {
    const existing = this.slides.find((s) => s.id === id);
    if (!existing) {
      throw new Error("Slide not found");
    }
    const updated: Slide = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
    } as Slide;
    this.slides = this.slides.map((s) => (s.id === id ? updated : s));
    return updated;
  }

  async deleteSlide(id: number): Promise<void> {
    this.slides = this.slides.filter((s) => s.id !== id);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async getAdminUser(): Promise<User | undefined> {
    return this.users.find((u) => u.role === "admin");
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.nextUserId++,
      username: user.username,
      password: user.password,
      role: user.role ?? "user",
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(
    id: number,
    updates: Partial<Pick<InsertUser, "password" | "role">>,
  ): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) {
      throw new Error("User not found");
    }
    const updated: User = {
      ...existing,
      ...updates,
    } as User;

    this.users = this.users.map((u) => (u.id === id ? updated : u));
    return updated;
  }

  async seedDefaultData(): Promise<void> {
    const existingSlides = await this.getSlides();
    if (existingSlides.length === 0) {
      await this.createSlide({
        title: "أحدث الهواتف الذكية",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1920&q=80",
        linkUrl: "/products?category=Smartphones",
        sortOrder: 1,
      });
      await this.createSlide({
        title: "أقوى أجهزة الكمبيوتر",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1920&q=80",
        linkUrl: "/products?category=Laptops",
        sortOrder: 2,
      });
    }

    const existingProducts = await this.getProducts();
    if (existingProducts.length === 0) {
      await this.createProduct({
        name: "iPhone 15 Pro Max",
        description: "The latest iPhone with titanium design and A17 Pro chip.",
        category: "Smartphones",
        price: "150000",
        stock: 10,
        images: ["https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=800&q=80"],
        specifications: { "Brand": "Apple", "Storage": "256GB" },
        isFeatured: true,
      });
      await this.createProduct({
        name: "MacBook Pro M3",
        description: "Mind-blowing performance with the M3 chip.",
        category: "Laptops",
        price: "350000",
        stock: 5,
        images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"],
        specifications: { "Brand": "Apple", "Processor": "M3 Pro" },
        isFeatured: true,
      });
    }
  }

  async getProducts(category?: string, search?: string): Promise<Product[]> {
    let result = [...this.products];
    if (category) {
      result = result.filter((p) => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    return result.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.find((p) => p.id === id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const newProduct: Product = {
      id: this.nextProductId++,
      name: product.name,
      nameFr: product.nameFr ?? null,
      description: product.description,
      descriptionFr: product.descriptionFr ?? null,
      category: product.category,
      price: product.price,
      oldPrice: product.oldPrice ?? null,
      stock: product.stock ?? 0,
      images: product.images,
      specifications: product.specifications ?? null,
      isFeatured: product.isFeatured ?? false,
      createdAt: new Date(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const existing = await this.getProduct(id);
    if (!existing) {
      throw new Error("Product not found");
    }

    const updated: Product = {
      ...existing,
      ...updates,
    } as Product;

    this.products = this.products.map((p) => (p.id === id ? updated : p));
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = {
      id: this.nextOrderId++,
      customerName: order.customerName,
      phone: order.phone,
      wilaya: order.wilaya,
      address: order.address,
      totalPrice: order.totalPrice,
      status: "Pending",
      items: order.items,
      createdAt: new Date(),
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async decrementProductStock(productId: number, quantity: number): Promise<boolean> {
    const existing = await this.getProduct(productId);
    if (!existing) return false;
    const current = Number(existing.stock ?? 0);
    if (!Number.isFinite(current) || current < quantity) return false;
    await this.updateProduct(productId, { stock: current - quantity });
    return true;
  }

  async createOrderFromCart(input: {
    customerName: string;
    phone: string;
    wilaya: string;
    address: string;
    items: Array<{ productId: number; quantity: number }>;
  }): Promise<Order> {
    const deliveryFee = 500;
    const orderItems: Array<{ productId: number; quantity: number; price: string }> = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = await this.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      const priceNum = Number(product.price);
      const qty = Number(item.quantity);
      if (!Number.isFinite(priceNum) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Invalid order data");
      }
      if (Number(product.stock ?? 0) < qty) {
        throw new Error(`Insufficient stock: ${item.productId}`);
      }
    }

    for (const item of input.items) {
      const product = await this.getProduct(item.productId);
      const qty = Number(item.quantity);
      const ok = await this.decrementProductStock(item.productId, qty);
      if (!ok) {
        throw new Error(`Insufficient stock: ${item.productId}`);
      }
      const priceNum = Number((product as any).price);
      subtotal += priceNum * qty;
      orderItems.push({ productId: item.productId, quantity: qty, price: String((product as any).price) });
    }

    const totalPrice = String(subtotal + deliveryFee);
    return await this.createOrder({
      customerName: input.customerName,
      phone: input.phone,
      wilaya: input.wilaya,
      address: input.address,
      totalPrice,
      items: orderItems as any,
    } as any);
  }

  async getOrders(): Promise<Order[]> {
    return [...this.orders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find((o) => o.id === id);
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const existing = await this.getOrder(id);
    if (!existing) {
      throw new Error("Order not found");
    }
    const updated: Order = { ...existing, status };
    this.orders = this.orders.map((o) => (o.id === id ? updated : o));
    return updated;
  }
}

type PersistedStorageFile = {
  nextUserId: number;
  nextProductId: number;
  nextOrderId: number;
  nextSlideId: number;
  users: Array<Omit<User, "createdAt"> & { createdAt: string }>;
  products: Array<Omit<Product, "createdAt"> & { createdAt: string }>;
  orders: Array<Omit<Order, "createdAt"> & { createdAt: string }>;
  slides: Array<Omit<Slide, "createdAt"> & { createdAt: string }>;
  shippingConfig?: {
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  };
  siteConfig?: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  };
};

class FileStorage implements IStorage {
  sessionStore: session.Store;

  private users: User[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];
  private slides: Slide[] = [];
  private shippingConfig: {
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  } | null = null;
  private siteConfig: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null = null;

  private nextUserId = 1;
  private nextProductId = 1;
  private nextOrderId = 1;
  private nextSlideId = 1;

  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();
  private filePath: string;

  constructor() {
    this.sessionStore = new MemorySessionStore({
      checkPeriod: 24 * 60 * 60 * 1000,
    });

    const p =
      (process.env.STORAGE_FILE ?? "").trim() ||
      path.join(process.cwd(), "data", "electromart.json");
    this.filePath = p;
  }

  private async ensureLoaded() {
    if (this.loaded) return;
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = (async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      try {
        const raw = await fs.readFile(this.filePath, "utf8");
        const parsed = JSON.parse(raw) as PersistedStorageFile;
        this.nextUserId = parsed.nextUserId || 1;
        this.nextProductId = parsed.nextProductId || 1;
        this.nextOrderId = parsed.nextOrderId || 1;
        this.nextSlideId = parsed.nextSlideId || 1;
        this.users = (parsed.users || []).map((u) => ({
          ...u,
          createdAt: new Date(u.createdAt),
        })) as User[];
        this.products = (parsed.products || []).map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        })) as Product[];
        this.orders = (parsed.orders || []).map((o) => ({
          ...o,
          createdAt: new Date(o.createdAt),
        })) as Order[];
        this.slides = (parsed.slides || []).map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        })) as Slide[];
        this.shippingConfig = parsed.shippingConfig ?? null;
        this.siteConfig = parsed.siteConfig ?? null;
      } catch (err: any) {
        if (err?.code !== "ENOENT") {
          throw err;
        }
        await this.queueSave();
      }
      this.loaded = true;
    })();
    await this.loadPromise;
  }

  private toPersisted(): PersistedStorageFile {
    return {
      nextUserId: this.nextUserId,
      nextProductId: this.nextProductId,
      nextOrderId: this.nextOrderId,
      nextSlideId: this.nextSlideId,
      users: this.users.map((u) => ({ ...(u as any), createdAt: u.createdAt.toISOString() })),
      products: this.products.map((p) => ({ ...(p as any), createdAt: p.createdAt.toISOString() })),
      orders: this.orders.map((o) => ({ ...(o as any), createdAt: o.createdAt.toISOString() })),
      slides: this.slides.map((s) => ({ ...(s as any), createdAt: (s.createdAt as any).toISOString() })),
      shippingConfig: this.shippingConfig ?? undefined,
      siteConfig: this.siteConfig ?? undefined,
    };
  }

  private async queueSave() {
    this.saveQueue = this.saveQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(this.toPersisted()), "utf8");
    });
    await this.saveQueue;
  }

  async getShippingConfig(): Promise<{
    apiUrl: string;
    apiId: string;
    apiToken: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  } | null> {
    await this.ensureLoaded();
    return this.shippingConfig;
  }

  async setShippingConfig(input: {
    apiUrl: string;
    apiId: string;
    apiToken?: string;
    fromWilayaName?: string;
    defaultCommune?: string;
  }): Promise<void> {
    await this.ensureLoaded();
    const apiToken = (input.apiToken ?? "").trim();
    const existingToken = this.shippingConfig?.apiToken ?? "";
    const nextToken = apiToken || existingToken;
    this.shippingConfig = {
      apiUrl: input.apiUrl,
      apiId: input.apiId,
      apiToken: nextToken,
      fromWilayaName: input.fromWilayaName?.trim() || this.shippingConfig?.fromWilayaName,
      defaultCommune: input.defaultCommune?.trim() || this.shippingConfig?.defaultCommune,
    };
    await this.queueSave();
  }

  async getSiteConfig(): Promise<{
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  } | null> {
    await this.ensureLoaded();
    return this.siteConfig;
  }

  async setSiteConfig(input: {
    logoUrl?: string;
    homeCategoriesTitle?: string;
    homeCategoriesTitleFr?: string;
    homeCategoriesSubtitle?: string;
    homeCategoriesSubtitleFr?: string;
    announcementEnabled?: boolean;
    announcementSpeedSeconds?: number;
    announcementItems?: Array<{
      id: number;
      text: string;
      textFr?: string;
      sortOrder?: number;
    }>;
    homeQuickLinks?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    lingerieHeroEnabled?: boolean;
    lingerieHeroImageUrl?: string;
    lingerieHeroTitle?: string;
    lingerieHeroButtonText?: string;
    lingerieHeroButtonLink?: string;
    homeCategoryHighlights?: Array<{
      id: number;
      title: string;
      titleFr?: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder?: number;
    }>;
    checkoutWilayas?: Array<{
      code: string;
      name: string;
      communes?: string[];
    }>;
    deliveryCompanies?: Array<{
      id: number;
      name: string;
      priceHome: number;
      priceOffice: number;
      wilayas: string[];
    }>;
  }): Promise<void> {
    await this.ensureLoaded();
    const nextLogoUrl = (input.logoUrl ?? "").trim();
    const nextHighlights = Array.isArray(input.homeCategoryHighlights)
      ? input.homeCategoryHighlights
      : undefined;
    const nextQuickLinks = Array.isArray(input.homeQuickLinks) ? input.homeQuickLinks : undefined;
    const nextHomeCategoriesTitle = (input.homeCategoriesTitle ?? "").trim();
    const nextHomeCategoriesTitleFr = (input.homeCategoriesTitleFr ?? "").trim();
    const nextHomeCategoriesSubtitle = (input.homeCategoriesSubtitle ?? "").trim();
    const nextHomeCategoriesSubtitleFr = (input.homeCategoriesSubtitleFr ?? "").trim();
    const nextAnnouncementEnabled =
      input.announcementEnabled !== undefined ? Boolean(input.announcementEnabled) : undefined;
    const nextAnnouncementSpeedSeconds =
      input.announcementSpeedSeconds !== undefined ? Number(input.announcementSpeedSeconds) : undefined;
    const nextAnnouncementItems = Array.isArray(input.announcementItems)
      ? input.announcementItems
      : undefined;
    const nextLingerieHeroEnabled =
      input.lingerieHeroEnabled !== undefined ? Boolean(input.lingerieHeroEnabled) : undefined;
    const nextLingerieHeroImageUrl = (input.lingerieHeroImageUrl ?? "").trim();
    const nextLingerieHeroTitle = (input.lingerieHeroTitle ?? "").trim();
    const nextLingerieHeroButtonText = (input.lingerieHeroButtonText ?? "").trim();
    const nextLingerieHeroButtonLink = (input.lingerieHeroButtonLink ?? "").trim();
    const nextCheckoutWilayas = Array.isArray(input.checkoutWilayas)
      ? input.checkoutWilayas
      : undefined;
    const nextDeliveryCompanies = Array.isArray(input.deliveryCompanies)
      ? input.deliveryCompanies
      : undefined;

    const existing = this.siteConfig ?? {};
    const next = {
      ...existing,
      ...(input.logoUrl !== undefined ? { logoUrl: nextLogoUrl || undefined } : {}),
      ...(input.homeCategoriesTitle !== undefined ? { homeCategoriesTitle: nextHomeCategoriesTitle || undefined } : {}),
      ...(input.homeCategoriesTitleFr !== undefined ? { homeCategoriesTitleFr: nextHomeCategoriesTitleFr || undefined } : {}),
      ...(input.homeCategoriesSubtitle !== undefined ? { homeCategoriesSubtitle: nextHomeCategoriesSubtitle || undefined } : {}),
      ...(input.homeCategoriesSubtitleFr !== undefined ? { homeCategoriesSubtitleFr: nextHomeCategoriesSubtitleFr || undefined } : {}),
      ...(input.announcementEnabled !== undefined ? { announcementEnabled: nextAnnouncementEnabled } : {}),
      ...(input.announcementSpeedSeconds !== undefined ? { announcementSpeedSeconds: nextAnnouncementSpeedSeconds } : {}),
      ...(nextAnnouncementItems !== undefined ? { announcementItems: nextAnnouncementItems } : {}),
      ...(nextQuickLinks !== undefined ? { homeQuickLinks: nextQuickLinks } : {}),
      ...(input.lingerieHeroEnabled !== undefined ? { lingerieHeroEnabled: nextLingerieHeroEnabled } : {}),
      ...(input.lingerieHeroImageUrl !== undefined ? { lingerieHeroImageUrl: nextLingerieHeroImageUrl || undefined } : {}),
      ...(input.lingerieHeroTitle !== undefined ? { lingerieHeroTitle: nextLingerieHeroTitle || undefined } : {}),
      ...(input.lingerieHeroButtonText !== undefined ? { lingerieHeroButtonText: nextLingerieHeroButtonText || undefined } : {}),
      ...(input.lingerieHeroButtonLink !== undefined ? { lingerieHeroButtonLink: nextLingerieHeroButtonLink || undefined } : {}),
      ...(nextHighlights !== undefined ? { homeCategoryHighlights: nextHighlights } : {}),
      ...(nextCheckoutWilayas !== undefined ? { checkoutWilayas: nextCheckoutWilayas } : {}),
      ...(nextDeliveryCompanies !== undefined ? { deliveryCompanies: nextDeliveryCompanies } : {}),
    };

    if (
      !next.logoUrl &&
      !next.homeCategoriesTitle &&
      !next.homeCategoriesTitleFr &&
      !next.homeCategoriesSubtitle &&
      !next.homeCategoriesSubtitleFr &&
      next.announcementEnabled !== true &&
      !next.announcementSpeedSeconds &&
      (!next.announcementItems || next.announcementItems.length === 0) &&
      (!next.homeQuickLinks || next.homeQuickLinks.length === 0) &&
      next.lingerieHeroEnabled !== true &&
      !next.lingerieHeroImageUrl &&
      !next.lingerieHeroTitle &&
      !next.lingerieHeroButtonText &&
      !next.lingerieHeroButtonLink &&
      (!next.homeCategoryHighlights || next.homeCategoryHighlights.length === 0) &&
      (!next.checkoutWilayas || next.checkoutWilayas.length === 0) &&
      (!next.deliveryCompanies || next.deliveryCompanies.length === 0)
    ) {
      this.siteConfig = null;
      await this.queueSave();
      return;
    }
    this.siteConfig = next;
    await this.queueSave();
  }

  async getSlides(): Promise<Slide[]> {
    await this.ensureLoaded();
    return [...this.slides].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async createSlide(input: InsertSlide): Promise<Slide> {
    await this.ensureLoaded();
    const created: Slide = {
      id: this.nextSlideId++,
      title: input.title,
      titleFr: input.titleFr ?? null,
      subtitle: input.subtitle ?? null,
      subtitleFr: input.subtitleFr ?? null,
      description: input.description ?? null,
      descriptionFr: input.descriptionFr ?? null,
      buttonText: input.buttonText ?? null,
      buttonTextFr: input.buttonTextFr ?? null,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl,
      sortOrder: input.sortOrder ?? 0,
      createdAt: new Date(),
    };
    this.slides.push(created);
    await this.queueSave();
    return created;
  }

  async updateSlide(id: number, updates: UpdateSlideRequest): Promise<Slide> {
    await this.ensureLoaded();
    const existing = this.slides.find((s) => s.id === id);
    if (!existing) {
      throw new Error("Slide not found");
    }
    const updated: Slide = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
    } as Slide;
    this.slides = this.slides.map((s) => (s.id === id ? updated : s));
    await this.queueSave();
    return updated;
  }

  async deleteSlide(id: number): Promise<void> {
    await this.ensureLoaded();
    this.slides = this.slides.filter((s) => s.id !== id);
    await this.queueSave();
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.ensureLoaded();
    return this.users.find((u) => u.id === id);
  }

  async getAdminUser(): Promise<User | undefined> {
    await this.ensureLoaded();
    return this.users.find((u) => u.role === "admin");
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureLoaded();
    return this.users.find((u) => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.ensureLoaded();
    const newUser: User = {
      id: this.nextUserId++,
      username: user.username,
      password: user.password,
      role: user.role ?? "user",
      createdAt: new Date(),
    };
    this.users.push(newUser);
    await this.queueSave();
    return newUser;
  }

  async updateUser(
    id: number,
    updates: Partial<Pick<InsertUser, "password" | "role">>,
  ): Promise<User> {
    await this.ensureLoaded();
    const existing = await this.getUser(id);
    if (!existing) {
      throw new Error("User not found");
    }
    const updated: User = {
      ...existing,
      ...updates,
    } as User;
    this.users = this.users.map((u) => (u.id === id ? updated : u));
    await this.queueSave();
    return updated;
  }

  async getProducts(category?: string, search?: string): Promise<Product[]> {
    await this.ensureLoaded();
    let result = [...this.products];
    if (category) {
      result = result.filter((p) => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    await this.ensureLoaded();
    return this.products.find((p) => p.id === id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    await this.ensureLoaded();
    const newProduct: Product = {
      id: this.nextProductId++,
      name: product.name,
      nameFr: product.nameFr ?? null,
      description: product.description,
      descriptionFr: product.descriptionFr ?? null,
      category: product.category,
      price: product.price,
      oldPrice: product.oldPrice ?? null,
      stock: product.stock ?? 0,
      images: product.images,
      specifications: product.specifications ?? null,
      isFeatured: product.isFeatured ?? false,
      createdAt: new Date(),
    };
    this.products.push(newProduct);
    await this.queueSave();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    await this.ensureLoaded();
    const existing = await this.getProduct(id);
    if (!existing) {
      throw new Error("Product not found");
    }
    const updated: Product = {
      ...existing,
      ...updates,
    } as Product;
    this.products = this.products.map((p) => (p.id === id ? updated : p));
    await this.queueSave();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.ensureLoaded();
    this.products = this.products.filter((p) => p.id !== id);
    await this.queueSave();
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    await this.ensureLoaded();
    const newOrder: Order = {
      id: this.nextOrderId++,
      customerName: order.customerName,
      phone: order.phone,
      wilaya: order.wilaya,
      address: order.address,
      totalPrice: order.totalPrice,
      status: "Pending",
      items: order.items,
      createdAt: new Date(),
    };
    this.orders.push(newOrder);
    await this.queueSave();
    return newOrder;
  }

  async decrementProductStock(productId: number, quantity: number): Promise<boolean> {
    await this.ensureLoaded();
    const existing = await this.getProduct(productId);
    if (!existing) return false;
    const current = Number(existing.stock ?? 0);
    if (!Number.isFinite(current) || current < quantity) return false;
    await this.updateProduct(productId, { stock: current - quantity });
    return true;
  }

  async createOrderFromCart(input: {
    customerName: string;
    phone: string;
    wilaya: string;
    address: string;
    items: Array<{ productId: number; quantity: number }>;
  }): Promise<Order> {
    await this.ensureLoaded();
    const deliveryFee = 500;
    const orderItems: Array<{ productId: number; quantity: number; price: string }> = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = await this.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      const priceNum = Number(product.price);
      const qty = Number(item.quantity);
      if (!Number.isFinite(priceNum) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Invalid order data");
      }
      if (Number(product.stock ?? 0) < qty) {
        throw new Error(`Insufficient stock: ${item.productId}`);
      }
    }

    for (const item of input.items) {
      const product = await this.getProduct(item.productId);
      const qty = Number(item.quantity);
      const ok = await this.decrementProductStock(item.productId, qty);
      if (!ok) {
        throw new Error(`Insufficient stock: ${item.productId}`);
      }
      const priceNum = Number((product as any).price);
      subtotal += priceNum * qty;
      orderItems.push({ productId: item.productId, quantity: qty, price: String((product as any).price) });
    }

    const totalPrice = String(subtotal + deliveryFee);
    return await this.createOrder({
      customerName: input.customerName,
      phone: input.phone,
      wilaya: input.wilaya,
      address: input.address,
      totalPrice,
      items: orderItems as any,
    } as any);
  }

  async getOrders(): Promise<Order[]> {
    await this.ensureLoaded();
    return [...this.orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    await this.ensureLoaded();
    return this.orders.find((o) => o.id === id);
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    await this.ensureLoaded();
    const existing = await this.getOrder(id);
    if (!existing) {
      throw new Error("Order not found");
    }
    const updated: Order = { ...existing, status };
    this.orders = this.orders.map((o) => (o.id === id ? updated : o));
    await this.queueSave();
    return updated;
  }

  async seedDefaultData(): Promise<void> {
    const existingSlides = await this.getSlides();
    if (existingSlides.length === 0) {
      await this.createSlide({
        title: "أحدث الإلكترونيات بأسعار مميزة",
        subtitle: "جودة وضمان",
        description: "أفضل المنتجات الإلكترونية الأصلية بضمان شامل",
        buttonText: "تصفح المنتجات",
        imageUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1920&q=80",
        linkUrl: "/products",
        sortOrder: 1,
      });
      await this.createSlide({
        title: "توصيل سريع لجميع الولايات",
        subtitle: "خدمة توصيل متميزة",
        description: "يصلك طلبك أينما كنت في أسرع وقت ممكن",
        buttonText: "اطلب الآن",
        imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=80",
        linkUrl: "/products?category=Laptops",
        sortOrder: 2,
      });
    }
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new FileStorage();
