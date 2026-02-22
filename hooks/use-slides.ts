import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { insertSlideSchema } from "@shared/schema";

// Types derived from schema
export type Slide = z.infer<typeof api.slides.list.responses[200]>[number];
export type CreateSlideInput = z.infer<typeof api.slides.create.input>;
export type UpdateSlideInput = z.infer<typeof api.slides.update.input>;

export function useSlides() {
  return useQuery({
    queryKey: [api.slides.list.path],
    queryFn: async () => {
      const res = await fetch(api.slides.list.path);
      if (!res.ok) throw new Error("Failed to fetch slides");
      return api.slides.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSlide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSlideInput) => {
      const res = await fetch(api.slides.create.path, {
        method: api.slides.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create slide");
      }
      return api.slides.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.slides.list.path] });
      toast({ title: "Success", description: "Slide created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSlide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateSlideInput) => {
      const url = buildUrl(api.slides.update.path, { id });
      const res = await fetch(url, {
        method: api.slides.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to update slide");
      }
      return api.slides.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.slides.list.path] });
      toast({ title: "Success", description: "Slide updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 404) throw new Error("Slide not found");
        throw new Error("Failed to delete slide");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.slides.list.path] });
      toast({ title: "Success", description: "Slide deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
