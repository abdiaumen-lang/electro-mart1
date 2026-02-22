import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type CreateOrderInput = z.infer<typeof api.orders.create.input>;
type UpdateStatusInput = z.infer<typeof api.orders.updateStatus.input>;
type DispatchOrdersInput = z.infer<typeof api.shipping.dispatch.input>;
type ShippingConfigResponse = z.infer<typeof api.shipping.getConfig.responses[200]>;
type SetShippingConfigInput = z.infer<typeof api.shipping.setConfig.input>;
type SiteConfigResponse = z.infer<typeof api.site.getConfig.responses[200]>;
type SetSiteConfigInput = z.infer<typeof api.site.setConfig.input>;
type Slide = z.infer<typeof api.slides.list.responses[200]>[number];
type CreateSlideInput = z.infer<typeof api.slides.create.input>;
type UpdateSlideInput = z.infer<typeof api.slides.update.input>;

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed to fetch orders (${res.status})`);
        } catch {
          throw new Error(text || `Failed to fetch orders (${res.status})`);
        }
      }
      return api.orders.list.responses[200].parse(JSON.parse(text));
    },
    retry: false,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create order");
      }
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate if we were tracking orders, though for public users this might just clear cart
      toast({ title: "Order Placed!", description: "We will contact you shortly." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number } & UpdateStatusInput) => {
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.orders.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update status");
      return api.orders.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({ title: "Success", description: "Order status updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDispatchOrdersToShipping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input?: DispatchOrdersInput) => {
      const res = await fetch(api.shipping.dispatch.path, {
        method: api.shipping.dispatch.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input ?? {}),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.shipping.dispatch.responses[200].parse(JSON.parse(text));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      const failures = data.results.filter((r) => !r.ok);
      if (data.failed > 0) {
        const title = data.sent > 0 ? "تم الإرسال مع أخطاء" : "فشل الإرسال";
        const first = failures[0];
        const details = first ? ` — #${first.orderId}: ${first.message || "فشل غير معروف"}` : "";
        const description = `تم إرسال ${data.sent} وفشل ${data.failed}${details}`;
        toast({
          title,
          variant: data.sent === 0 ? "destructive" : "default",
          description,
        });
        return;
      }

      toast({
        title: "تم الإرسال",
        description: `تم إرسال ${data.sent}`,
      });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });
}

export function useShippingConfig() {
  return useQuery({
    queryKey: [api.shipping.getConfig.path],
    queryFn: async () => {
      const res = await fetch(api.shipping.getConfig.path, { credentials: "include" });
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.shipping.getConfig.responses[200].parse(JSON.parse(text)) as ShippingConfigResponse;
    },
    retry: false,
  });
}

export function useSetShippingConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SetShippingConfigInput) => {
      const res = await fetch(api.shipping.setConfig.path, {
        method: api.shipping.setConfig.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.shipping.setConfig.responses[200].parse(JSON.parse(text));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipping.getConfig.path] });
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات شركة التوصيل" });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });
}

export function useSiteConfig() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.site.getConfig.path],
    queryFn: async () => {
      const res = await fetch(api.site.getConfig.path, { cache: "no-store" });
      if (res.status === 304) {
        const cached = queryClient.getQueryData([api.site.getConfig.path]);
        if (cached) return cached as SiteConfigResponse;

        const retryRes = await fetch(`${api.site.getConfig.path}?ts=${Date.now()}`, { cache: "no-store" });
        const retryText = await retryRes.text();
        if (!retryRes.ok) {
          throw new Error(retryText || `Failed (${retryRes.status})`);
        }
        return api.site.getConfig.responses[200].parse(JSON.parse(retryText)) as SiteConfigResponse;
      }
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.site.getConfig.responses[200].parse(JSON.parse(text)) as SiteConfigResponse;
    },
    retry: false,
  });
}

export function useSetSiteConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SetSiteConfigInput) => {
      const res = await fetch(api.site.setConfig.path, {
        method: api.site.setConfig.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.site.setConfig.responses[200].parse(JSON.parse(text));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.site.getConfig.path] });
      toast({ title: "تم الحفظ", description: "تم حفظ شعار الموقع" });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });
}

export function useSlides() {
  return useQuery({
    queryKey: [api.slides.list.path],
    queryFn: async () => {
      const res = await fetch(api.slides.list.path);
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.slides.list.responses[200].parse(JSON.parse(text)) as Slide[];
    },
    retry: false,
  });
}

export function useCreateSlide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSlideInput) => {
      const res = await fetch(api.slides.create.path, {
        method: api.slides.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.slides.create.responses[201].parse(JSON.parse(text)) as Slide;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.slides.list.path] });
      toast({ title: "تمت الإضافة", description: "تم إضافة السلايد" });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSlide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateSlideInput }) => {
      const url = buildUrl(api.slides.update.path, { id });
      const res = await fetch(url, {
        method: api.slides.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
      return api.slides.update.responses[200].parse(JSON.parse(text)) as Slide;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.slides.list.path] });
      toast({ title: "تم التعديل", description: "تم تعديل السلايد" });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSlide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.slides.delete.path, { id });
      const res = await fetch(url, {
        method: api.slides.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message || `Failed (${res.status})`);
        } catch {
          throw new Error(text || `Failed (${res.status})`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.slides.list.path] });
      toast({ title: "تم الحذف", description: "تم حذف السلايد" });
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });
}
