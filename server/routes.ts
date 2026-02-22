
import type { Express } from "express";
import { createServer, type Server } from "http";
import { hashPassword, setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertOrderSchema, insertProductSchema, insertSlideSchema, ORDER_STATUS } from "@shared/schema";
import path from "path";
import { promises as fs } from "fs";
import { randomBytes } from "crypto";

function getTelegramConfig() {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKE ?? "").trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

async function sendTelegramText(text: string) {
  const cfg = getTelegramConfig();
  if (!cfg) return;

  const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cfg.chatId,
      text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram send failed (${res.status})`);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  await ensureAdminUser();

  app.get("/api/admin/setup-needed", async (_req, res) => {
    const admin = await storage.getAdminUser();
    res.json({ needed: !admin });
  });

  app.post("/api/admin/setup", async (req, res) => {
    const admin = await storage.getAdminUser();
    if (admin) {
      return res.status(400).json({ message: "Admin already set up" });
    }

    const input = z
      .object({
        username: z.string().min(2),
        password: z.string().min(6),
      })
      .parse(req.body);

    const existing = await storage.getUserByUsername(input.username);
    const hashed = await hashPassword(input.password);

    if (!existing) {
      await storage.createUser({
        username: input.username,
        password: hashed,
        role: "admin",
      });
      return res.status(201).json({ ok: true });
    }

    await storage.updateUser(existing.id, { password: hashed, role: "admin" });
    return res.status(201).json({ ok: true });
  });

  app.post("/api/uploads", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const input = z
      .object({
        files: z.array(
          z.object({
            dataUrl: z.string().min(1),
          }),
        ).min(1),
      })
      .parse(req.body);

    const maxBytes = 5 * 1024 * 1024;
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    const uploadsDir =
      process.env.UPLOADS_DIR?.trim() ||
      path.join(
        process.cwd(),
        process.env.NODE_ENV === "production" ? "dist/public/uploads" : "client/public/uploads",
      );
    await fs.mkdir(uploadsDir, { recursive: true });

    const urls: string[] = [];

    for (const file of input.files) {
      const match = /^data:([^;]+);base64,(.+)$/.exec(file.dataUrl);
      if (!match) {
        return res.status(400).json({ message: "Invalid image format" });
      }
      const mime = match[1];
      const ext = allowed[mime];
      if (!ext) {
        return res.status(400).json({ message: "Unsupported image type" });
      }

      const base64 = match[2];
      const buf = Buffer.from(base64, "base64");
      if (buf.byteLength > maxBytes) {
        return res.status(400).json({ message: "Image is too large" });
      }

      const name = `${randomBytes(16).toString("hex")}.${ext}`;
      const filePath = path.join(uploadsDir, name);
      await fs.writeFile(filePath, buf);
      urls.push(`/uploads/${name}`);
    }

    res.status(201).json({ urls });
  });

  // === PRODUCTS ROUTES ===
  app.get(api.products.list.path, async (req, res) => {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const products = await storage.getProducts(category, search);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    const product = await storage.getProduct(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  // Admin only routes for products
  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const product = insertProductSchema.parse(req.body);
      const newProduct = await storage.createProduct(product);
      res.status(201).json(newProduct);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    try {
      const updates = insertProductSchema.partial().parse(req.body);
      const updatedProduct = await storage.updateProduct(id, updates);
      res.json(updatedProduct);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    await storage.deleteProduct(id);
    res.status(204).send();
  });

  // === ORDERS ROUTES ===
  app.post(api.orders.create.path, async (req, res) => {
    try {
      const orderData = z
        .object({
          customerName: z.string().min(2),
          phone: z.string().min(5),
          wilaya: z.string().min(1),
          address: z.string().min(5),
          items: z
            .array(
              z.object({
                productId: z.number().int().positive(),
                quantity: z.number().int().min(1),
              }),
            )
            .min(1),
        })
        .parse(req.body);

      const order = await storage.createOrderFromCart(orderData);
      if (getTelegramConfig()) {
        const uniqueIds = Array.from(new Set(orderData.items.map((i) => i.productId)));
        const products = await Promise.all(uniqueIds.map((id) => storage.getProduct(id)));
        const nameById = new Map<number, string>();
        for (const p of products) {
          if (p) nameById.set(p.id, p.name);
        }
        const itemsLines = orderData.items.map((i) => {
          const name = nameById.get(i.productId) ?? `#${i.productId}`;
          return `- ${name} ×${i.quantity}`;
        });
        const lines = [
          "🛒 طلب جديد!",
          `#${order.id}`,
          `👤 الاسم: ${order.customerName}`,
          `📞 الهاتف: ${order.phone}`,
          `📍 الولاية: ${order.wilaya}`,
          `🏠 العنوان: ${order.address}`,
          "📦 المنتجات:",
          ...itemsLines,
          `💰 المبلغ: ${order.totalPrice} دج`,
        ];
        void sendTelegramText(lines.join("\n")).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Telegram notification failed: ${message}`);
        });
      }
      res.status(201).json(order);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        const message =
          e instanceof Error && e.message ? e.message : "Invalid order data";
        res.status(400).json({ message });
      }
    }
  });

  // === SLIDES ROUTES ===
  app.get(api.slides.list.path, async (_req, res) => {
    const list = await storage.getSlides();
    res.json(list);
  });

  app.post(api.slides.create.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = insertSlideSchema.parse(req.body);
      const created = await storage.createSlide(input);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        res.status(400).json({ message: "Invalid slide data" });
      }
    }
  });

  app.put(api.slides.update.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    try {
      const updates = insertSlideSchema.partial().parse(req.body);
      const updated = await storage.updateSlide(id, updates);
      res.json(updated);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        const message = e instanceof Error ? e.message : "Invalid slide data";
        res.status(message === "Slide not found" ? 404 : 400).json({ message });
      }
    }
  });

  app.delete(api.slides.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    await storage.deleteSlide(id);
    res.status(204).send();
  });

  // === SITE ROUTES ===
  app.get(api.site.getConfig.path, async (_req, res) => {
    const cfg = await storage.getSiteConfig();
    res.json({
      logoUrl: cfg?.logoUrl,
      homeCategoriesTitle: cfg?.homeCategoriesTitle,
      homeCategoriesTitleFr: cfg?.homeCategoriesTitleFr,
      homeCategoriesSubtitle: cfg?.homeCategoriesSubtitle,
      homeCategoriesSubtitleFr: cfg?.homeCategoriesSubtitleFr,
      announcementEnabled: cfg?.announcementEnabled,
      announcementSpeedSeconds: cfg?.announcementSpeedSeconds,
      announcementItems: cfg?.announcementItems,
      homeQuickLinks: cfg?.homeQuickLinks,
      lingerieHeroEnabled: cfg?.lingerieHeroEnabled,
      lingerieHeroImageUrl: cfg?.lingerieHeroImageUrl,
      lingerieHeroTitle: cfg?.lingerieHeroTitle,
      lingerieHeroButtonText: cfg?.lingerieHeroButtonText,
      lingerieHeroButtonLink: cfg?.lingerieHeroButtonLink,
      homeCategoryHighlights: cfg?.homeCategoryHighlights,
      checkoutWilayas: cfg?.checkoutWilayas,
      deliveryCompanies: cfg?.deliveryCompanies,
    });
  });

  app.put(api.site.setConfig.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = z
        .object({
          logoUrl: z.string().optional(),
          homeCategoriesTitle: z.string().optional(),
          homeCategoriesTitleFr: z.string().optional(),
          homeCategoriesSubtitle: z.string().optional(),
          homeCategoriesSubtitleFr: z.string().optional(),
          announcementEnabled: z.boolean().optional(),
          announcementSpeedSeconds: z.number().min(8).max(60).optional(),
          announcementItems: z
            .array(
              z.object({
                id: z.number().int().positive(),
                text: z.string().min(1),
                textFr: z.string().optional(),
                sortOrder: z.number().int().optional(),
              }),
            )
            .optional(),
          homeQuickLinks: z
            .array(
              z.object({
                id: z.number().int().positive(),
                title: z.string().min(1),
                titleFr: z.string().optional(),
                imageUrl: z.string().min(1),
                linkUrl: z.string().min(1),
                sortOrder: z.number().int().optional(),
              }),
            )
            .optional(),
          lingerieHeroEnabled: z.boolean().optional(),
          lingerieHeroImageUrl: z.string().optional(),
          lingerieHeroTitle: z.string().optional(),
          lingerieHeroButtonText: z.string().optional(),
          lingerieHeroButtonLink: z.string().optional(),
          homeCategoryHighlights: z
            .array(
              z.object({
                id: z.number().int().positive(),
                title: z.string().min(1),
                titleFr: z.string().optional(),
                imageUrl: z.string().min(1),
                linkUrl: z.string().min(1),
                sortOrder: z.number().int().optional(),
              }),
            )
            .optional(),
          checkoutWilayas: z
            .array(
              z.object({
                code: z.string().min(1),
                name: z.string().min(1),
                communes: z.array(z.string().min(1)).optional(),
              }),
            )
            .optional(),
          deliveryCompanies: z
            .array(
              z.object({
                id: z.number().int().positive(),
                name: z.string().min(1),
                priceHome: z.number().int().nonnegative(),
                priceOffice: z.number().int().nonnegative(),
                wilayas: z.array(z.string().min(1)),
              }),
            )
            .optional(),
        })
        .parse(req.body);
      await storage.setSiteConfig(input);
      res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid site config";
      res.status(400).json({ message });
    }
  });

  // === SHIPPING ROUTES ===
  app.get(api.shipping.configured.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const cfg = await storage.getShippingConfig();
    res.json({
      configured: Boolean(cfg?.apiUrl && cfg?.apiId && cfg?.apiToken),
    });
  });

  app.get(api.shipping.getConfig.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const envUrl = (process.env.SHIPPING_API_URL ?? "").trim();
    const envId = (process.env.SHIPPING_API_ID ?? "").trim();
    const envToken = (process.env.SHIPPING_API_TOKEN ?? "").trim();
    const envFromWilayaName = (process.env.SHIPPING_FROM_WILAYA_NAME ?? "").trim();
    const envDefaultCommune = (process.env.SHIPPING_DEFAULT_COMMUNE ?? "").trim();
    if (envUrl || envId || envToken) {
      return res.json({
        apiUrl: envUrl || undefined,
        apiId: envId || undefined,
        tokenPresent: Boolean(envToken),
        fromWilayaName: envFromWilayaName || undefined,
        defaultCommune: envDefaultCommune || undefined,
      });
    }

    const cfg = await storage.getShippingConfig();
    res.json({
      apiUrl: cfg?.apiUrl,
      apiId: cfg?.apiId,
      tokenPresent: Boolean(cfg?.apiToken),
      fromWilayaName: cfg?.fromWilayaName,
      defaultCommune: cfg?.defaultCommune,
    });
  });

  app.put(api.shipping.setConfig.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = z
        .object({
          apiUrl: z.string().min(1),
          apiId: z.string().min(1),
          apiToken: z.string().optional(),
          fromWilayaName: z.string().optional(),
          defaultCommune: z.string().optional(),
        })
        .parse(req.body);
      await storage.setShippingConfig(input);
      res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid shipping config";
      res.status(400).json({ message });
    }
  });

  app.post(api.shipping.dispatch.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const cfg = await storage.getShippingConfig();
    if (!cfg?.apiUrl || !cfg?.apiId || !cfg?.apiToken) {
      return res.status(400).json({ message: "Shipping API is not configured" });
    }

    const body = z
      .object({
        orderIds: z.array(z.number().int().positive()).optional(),
      })
      .optional()
      .parse(req.body);

    const orders = await storage.getOrders();
    const targetIds = body?.orderIds ? new Set(body.orderIds) : null;
    const targets = orders.filter((o) => {
      if (o.status !== ORDER_STATUS.PENDING) return false;
      if (targetIds && !targetIds.has(o.id)) return false;
      return true;
    });

    const apiUrlLower = cfg.apiUrl.toLowerCase();
    const isYalidine = apiUrlLower.includes("yalidine");
    const products = isYalidine ? await storage.getProducts() : [];
    const productNameById = new Map(products.map((p) => [p.id, p.name]));

    const results: Array<{ orderId: number; ok: boolean; message?: string }> = [];
    let sent = 0;
    let failed = 0;

    for (const order of targets) {
      try {
        const orderAny = order as any;
        const communeFromOrder = typeof orderAny.commune === "string" ? orderAny.commune.trim() : "";
        const derivedCommune = (() => {
          const address = typeof orderAny.address === "string" ? orderAny.address : "";
          const candidate = address.split(/[,\\-]/)[0]?.trim() ?? "";
          if (candidate.length >= 2 && candidate.length <= 50) return candidate;
          return "";
        })();
        const commune = isYalidine
          ? communeFromOrder || (cfg.defaultCommune ?? "")
          : communeFromOrder || derivedCommune || (cfg.defaultCommune ?? "");

        if (isYalidine && !commune) {
          failed += 1;
          results.push({
            orderId: order.id,
            ok: false,
            message: "Commune مفقودة. أضفها في الطلب ثم أعد الإرسال.",
          });
          continue;
        }

        const payload = isYalidine
          ? (() => {
            const fullName = typeof orderAny.customerName === "string" ? orderAny.customerName.trim() : "";
            const parts = fullName.split(/\s+/).filter(Boolean);
            const firstname = parts[0] || fullName || "Client";
            const familyname = parts.slice(1).join(" ") || firstname;

            const rawItems = Array.isArray(orderAny.items) ? orderAny.items : [];
            const productList = rawItems
              .map((it: any) => {
                const pid = Number(it?.productId);
                const qty = Number(it?.quantity);
                const name = productNameById.get(pid) || `Product ${pid || ""}`.trim();
                if (Number.isFinite(qty) && qty > 1) return `${name} x${qty}`;
                return name;
              })
              .filter(Boolean)
              .join(", ");

            const priceNum = Number(orderAny.totalPrice);
            const price = Number.isFinite(priceNum) ? Math.round(priceNum) : undefined;

            const toWilayaRaw = typeof orderAny.wilaya === "string" ? orderAny.wilaya : "";
            const toWilayaNormalized = normalizeWilayaName(toWilayaRaw);
            const toWilayaName = resolveYalidineWilayaName(toWilayaRaw);
            if (!toWilayaName) {
              const suffix = toWilayaNormalized ? ` (بعد التطبيع: ${toWilayaNormalized})` : "";
              throw new Error(`ولاية غير مدعومة في Yalidine: ${toWilayaRaw}${suffix}. مثال صحيح: Alger`);
            }

            const fromWilayaName =
              resolveYalidineWilayaName(cfg.fromWilayaName || "Alger") || "Alger";

            return [
              {
                order_id: String(orderAny.id),
                from_wilaya_name: fromWilayaName,
                firstname,
                familyname,
                contact_phone: orderAny.phone,
                address: orderAny.address,
                to_commune_name: commune,
                to_wilaya_name: toWilayaName,
                product_list: productList || "ElectroMart Order",
                price,
                freeshipping: false,
                is_stopdesk: false,
                has_exchange: false,
              },
            ];
          })()
          : {
            orderId: order.id,
            customerName: order.customerName,
            phone: order.phone,
            wilaya: order.wilaya,
            commune: commune || undefined,
            address: order.address,
            totalPrice: order.totalPrice,
            items: order.items,
          };

        const dispatchUrl = (() => {
          if (!isYalidine) return cfg.apiUrl;
          try {
            const u = new URL(cfg.apiUrl);
            const path = u.pathname || "/";
            const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
            if (normalized.endsWith("/parcels") || normalized.includes("/parcels/")) return u.toString();
            if (normalized === "" || normalized === "/" || normalized === "/v1") {
              u.pathname = "/v1/parcels";
              return u.toString();
            }
            if (normalized.includes("/v1")) {
              u.pathname = `${normalized}/parcels`;
              return u.toString();
            }
            u.pathname = "/v1/parcels";
            return u.toString();
          } catch {
            return cfg.apiUrl;
          }
        })();

        const response = await fetch(dispatchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiToken}`,
            "x-api-id": cfg.apiId,
            "x-api-token": cfg.apiToken,
          },
          body: JSON.stringify(payload),
        });

        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        const rawText = await response.text();

        if (!response.ok) {
          let details = rawText;
          if (contentType.includes("application/json")) {
            try {
              const parsed = JSON.parse(rawText) as Record<string, unknown>;
              const err = parsed.error;
              const candidate =
                (typeof parsed.message === "string" && parsed.message) ||
                (typeof parsed.detail === "string" && parsed.detail) ||
                (typeof err === "string" && err) ||
                (typeof err === "object" &&
                  err &&
                  ((typeof (err as any).message === "string" && (err as any).message) ||
                    (typeof (err as any).description === "string" && (err as any).description)));
              if (candidate) details = candidate;
            } catch {
              // ignore
            }
          }
          if (isYalidine && typeof details === "string" && details.includes("to_commune_name")) {
            details = `${details} — تأكد من ضبط Default Commune في إعدادات الشحن وكتابتها بنفس تهجئة Yalidine`;
          }
          const trimmed = (details || "").trim();
          const limited = trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
          failed += 1;
          results.push({
            orderId: order.id,
            ok: false,
            message: limited ? `${response.status}: ${limited}` : `Failed (${response.status})`,
          });
          continue;
        }

        if (isYalidine) {
          let parsed: unknown = null;
          try {
            parsed = JSON.parse(rawText) as unknown;
          } catch {
            failed += 1;
            const trimmed = (rawText || "").trim();
            const limited = trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
            results.push({
              orderId: order.id,
              ok: false,
              message: limited ? `استجابة غير متوقعة من Yalidine: ${limited}` : "استجابة غير متوقعة من Yalidine",
            });
            continue;
          }

          const orderKey = String(orderAny.id);
          const orderResult = (() => {
            if (Array.isArray(parsed)) {
              return (parsed as any[]).find((x) => x && String(x.order_id) === orderKey);
            }
            if (parsed && typeof parsed === "object") {
              return (parsed as any)[orderKey] ?? (parsed as any)[orderKey.trim?.() ?? orderKey];
            }
            return undefined;
          })();

          const success = Boolean(orderResult && (orderResult as any).success === true);
          if (!success) {
            failed += 1;
            const message =
              (orderResult &&
                ((typeof (orderResult as any).message === "string" && (orderResult as any).message) ||
                  (typeof (orderResult as any).error === "string" && (orderResult as any).error) ||
                  (typeof (orderResult as any).description === "string" && (orderResult as any).description))) ||
              "لم يتم إنشاء الشحنة في Yalidine";
            results.push({ orderId: order.id, ok: false, message });
            continue;
          }
        }

        sent += 1;
        results.push({ orderId: order.id, ok: true });
        await storage.updateOrderStatus(order.id, ORDER_STATUS.SHIPPED);
      } catch (e) {
        failed += 1;
        const message = e instanceof Error ? e.message : "Unknown error";
        results.push({ orderId: order.id, ok: false, message });
      }
    }

    res.json({
      attempted: targets.length,
      sent,
      failed,
      results,
    });
  });

  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    const statusSchema = z.enum(
      Object.values(ORDER_STATUS) as [string, ...string[]],
    );
    const { status } = z.object({ status: statusSchema }).parse(req.body);
    const updatedOrder = await storage.updateOrderStatus(id, status);
    res.json(updatedOrder);
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function ensureAdminUser() {
  const envUsername = (process.env.ADMIN_USERNAME ?? "").trim();
  const envPassword = (process.env.ADMIN_PASSWORD ?? "").trim();

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && (!envUsername || !envPassword)) return;

  const username = envUsername || (isProd ? "" : "admin");
  const password = envPassword || (isProd ? "" : "ElectroMart@2026!A9");
  if (!username || !password) return;

  const existing = await storage.getUserByUsername(username);
  const hashedPassword = await hashPassword(password);

  if (!existing) {
    await storage.createUser({ username, password: hashedPassword, role: "admin" });
    return;
  }

  await storage.updateUser(existing.id, { password: hashedPassword, role: "admin" });
}

const YALIDINE_WILAYAS = [
  "Adrar",
  "Chlef",
  "Laghouat",
  "Oum El Bouaghi",
  "Batna",
  "Bejaia",
  "Biskra",
  "Bechar",
  "Blida",
  "Bouira",
  "Tamanrasset",
  "Tebessa",
  "Tlemcen",
  "Tiaret",
  "Tizi Ouzou",
  "Alger",
  "Djelfa",
  "Jijel",
  "Setif",
  "Saida",
  "Skikda",
  "Sidi Bel Abbes",
  "Annaba",
  "Guelma",
  "Constantine",
  "Medea",
  "Mostaganem",
  "M'Sila",
  "Mascara",
  "Ouargla",
  "Oran",
  "El Bayadh",
  "Illizi",
  "Bordj Bou Arreridj",
  "Boumerdes",
  "El Tarf",
  "Tindouf",
  "Tissemsilt",
  "El Oued",
  "Khenchela",
  "Souk Ahras",
  "Tipaza",
  "Mila",
  "Ain Defla",
  "Naama",
  "Ain Temouchent",
  "Ghardaia",
  "Relizane",
  "Timimoun",
  "Bordj Badji Mokhtar",
  "Ouled Djellal",
  "Beni Abbes",
  "In Salah",
  "In Guezzam",
  "Touggourt",
  "Djanet",
  "El M'Ghair",
  "El Meniaa",
];

const YALIDINE_WILAYA_BY_LOWER = new Map(
  YALIDINE_WILAYAS.map((w) => [w.toLowerCase(), w] as const),
);

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeWilayaName(value: string) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const withoutIndex = raw.replace(/^\s*\d+\s*[-–—]\s*/, "");
  const cleaned = withoutIndex.replace(/\s+/g, " ").trim();
  const ascii = stripDiacritics(cleaned);
  const normalizedQuotes = ascii.replace(/[’`]/g, "'").trim();
  if (normalizedQuotes.toLowerCase() === "algiers") return "Alger";
  return normalizedQuotes;
}

function resolveYalidineWilayaName(value: string) {
  const normalized = normalizeWilayaName(value);
  if (!normalized) return null;
  return YALIDINE_WILAYA_BY_LOWER.get(normalized.toLowerCase()) ?? null;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    console.log("Seeding database...");

    // Seed Admin User (in a real app, use a script or registration)
    // Note: Password hashing is handled in auth.ts, but for seed we might need to handle it or just let registration handle it.
    // For now, we'll assume the admin is created via the UI or a separate script to ensure secure password hashing.
    // But we can seed products.

    const sampleProducts = [
      {
        name: "iPhone 15 Pro Max",
        description: "The ultimate iPhone with titanium design, A17 Pro chip, and our most powerful camera system yet.",
        category: "Smartphones",
        price: "250000",
        oldPrice: "270000",
        stock: 10,
        images: ["/logo.jpg"],
        specifications: { "Screen": "6.7 inch", "Storage": "256GB", "Color": "Natural Titanium" },
        isFeatured: true
      },
      {
        name: "MacBook Pro 14 M3",
        description: "Mind-blowing. Head-turning. With the M3 chip, MacBook Pro leaps forward.",
        category: "Laptops",
        price: "320000",
        oldPrice: "340000",
        stock: 5,
        images: ["/logo.jpg"],
        specifications: { "Processor": "M3 Pro", "RAM": "18GB", "SSD": "512GB" },
        isFeatured: true
      },
      {
        name: "Sony WH-1000XM5",
        description: "Industry-leading noise cancellation, exceptional sound quality.",
        category: "Headphones",
        price: "55000",
        oldPrice: "60000",
        stock: 20,
        images: ["/logo.jpg"],
        specifications: { "Battery": "30 hours", "Type": "Wireless Noise Cancelling" },
        isFeatured: false
      },
      {
        name: "PlayStation 5 Slim",
        description: "Play Like Never Before. The PS5 console unleashes new gaming possibilities.",
        category: "Gaming",
        price: "95000",
        oldPrice: "105000",
        stock: 8,
        images: ["/logo.jpg"],
        specifications: { "Storage": "1TB", "Edition": "Digital" },
        isFeatured: true
      }
    ];

    for (const p of sampleProducts) {
      await storage.createProduct(p);
    }
    console.log("Database seeded successfully!");
  }
}
