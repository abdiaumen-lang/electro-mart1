
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameFr: text("name_fr"),
  description: text("description").notNull(),
  descriptionFr: text("description_fr"),
  category: text("category").notNull(),
  price: decimal("price").notNull(),
  oldPrice: decimal("old_price"),
  stock: integer("stock").default(0).notNull(),
  images: jsonb("images").notNull(), // Array of image URLs
  specifications: jsonb("specifications"), // Key-value pairs
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  wilaya: text("wilaya").notNull(),
  address: text("address").notNull(),
  totalPrice: decimal("total_price").notNull(),
  status: text("status").default("Pending").notNull(), // Pending, Confirmed, Shipped, Delivered
  items: jsonb("items").notNull(), // Array of { productId, quantity, price }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const slides = pgTable("slides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleFr: text("title_fr"),
  subtitle: text("subtitle"),
  subtitleFr: text("subtitle_fr"),
  description: text("description"),
  descriptionFr: text("description_fr"),
  buttonText: text("button_text"),
  buttonTextFr: text("button_text_fr"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, status: true });
export const insertSlideSchema = createInsertSchema(slides).omit({ id: true, createdAt: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Slide = typeof slides.$inferSelect;
export type InsertSlide = z.infer<typeof insertSlideSchema>;

// API Types
export type LoginRequest = { username: string; password: string };
export type LoginResponse = User;

export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;

export type CreateOrderRequest = InsertOrder & { items: { productId: number; quantity: number }[] }; // Frontend sends items with IDs
export type UpdateOrderStatusRequest = { status: string };

export type CreateSlideRequest = InsertSlide;
export type UpdateSlideRequest = Partial<InsertSlide>;

export const ORDER_STATUS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
} as const;

export const CATEGORIES = [
  "Smartphones",
  "Laptops",
  "Headphones",
  "Gaming",
  "Accessories",
] as const;
