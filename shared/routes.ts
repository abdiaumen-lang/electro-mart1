
import { z } from 'zod';
import { insertUserSchema, insertProductSchema, insertOrderSchema, insertSlideSchema, products, orders, slides, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  orders: {
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: insertOrderSchema,
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  slides: {
    list: {
      method: 'GET' as const,
      path: '/api/slides' as const,
      responses: {
        200: z.array(z.custom<typeof slides.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/slides' as const,
      input: insertSlideSchema,
      responses: {
        201: z.custom<typeof slides.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/slides/:id' as const,
      input: insertSlideSchema.partial(),
      responses: {
        200: z.custom<typeof slides.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/slides/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  site: {
    getConfig: {
      method: 'GET' as const,
      path: '/api/site/config' as const,
      responses: {
        200: z.object({
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
        }),
      },
    },
    setConfig: {
      method: 'PUT' as const,
      path: '/api/site/config' as const,
      input: z.object({
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
      }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  shipping: {
    configured: {
      method: 'GET' as const,
      path: '/api/shipping/configured' as const,
      responses: {
        200: z.object({ configured: z.boolean() }),
      },
    },
    getConfig: {
      method: 'GET' as const,
      path: '/api/shipping/config' as const,
      responses: {
        200: z.object({
          apiUrl: z.string().optional(),
          apiId: z.string().optional(),
          tokenPresent: z.boolean(),
          fromWilayaName: z.string().optional(),
          defaultCommune: z.string().optional(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    setConfig: {
      method: 'PUT' as const,
      path: '/api/shipping/config' as const,
      input: z.object({
        apiUrl: z.string().min(1),
        apiId: z.string().min(1),
        apiToken: z.string().optional(),
        fromWilayaName: z.string().optional(),
        defaultCommune: z.string().optional(),
      }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    dispatch: {
      method: 'POST' as const,
      path: '/api/shipping/dispatch' as const,
      input: z
        .object({
          orderIds: z.array(z.number().int().positive()).optional(),
        })
        .optional(),
      responses: {
        200: z.object({
          attempted: z.number().int().nonnegative(),
          sent: z.number().int().nonnegative(),
          failed: z.number().int().nonnegative(),
          results: z.array(
            z.object({
              orderId: z.number().int().positive(),
              ok: z.boolean(),
              message: z.string().optional(),
            }),
          ),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
