import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CATEGORIES } from "@shared/schema";
import { Loader2 } from "lucide-react";

import { useUser } from "@/hooks/use-auth";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  nameFr: z.string().optional(),
  description: z.string().min(10, "Description is required"),
  descriptionFr: z.string().optional(),
  category: z.enum(CATEGORIES),
  price: z.string().min(1, "Price is required"),
  oldPrice: z.string().optional(),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
  specifications: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

function parseSpecifications(value: string | undefined): Record<string, string> | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: Array<[string, string]> = [];

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key || !val) continue;
    entries.push([key, val]);
  }

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function stringifySpecifications(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const entries = Object.entries(value as Record<string, string>)
    .filter(([k, v]) => Boolean(k) && Boolean(v))
    .map(([k, v]) => `${k}: ${v}`);
  return entries.join("\n");
}

export default function AdminEditProduct() {
  const { toast } = useToast();
  const { data: user, isLoading: authLoading } = useUser();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/products/:id/edit");

  const productId = Number(params?.id);
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { mutateAsync: updateProduct, isPending } = useUpdateProduct();

  const [didInit, setDidInit] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nameFr: "",
      description: "",
      descriptionFr: "",
      category: CATEGORIES[0],
      price: "",
      oldPrice: "",
      stock: 0,
      specifications: "",
      isFeatured: false,
    },
  });

  useEffect(() => {
    setDidInit(false);
    setExistingImages([]);
    setSelectedFiles([]);
    setImageError(null);
  }, [productId]);

  useEffect(() => {
    if (!product || didInit) return;
    form.reset({
      name: product.name,
      nameFr: product.nameFr || "",
      description: product.description,
      descriptionFr: product.descriptionFr || "",
      category: product.category as any,
      price: String(product.price ?? ""),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      stock: Number(product.stock ?? 0),
      specifications: stringifySpecifications((product as any).specifications),
      isFeatured: Boolean((product as any).isFeatured),
    });
    setExistingImages(((product as any).images as string[]) || []);
    setDidInit(true);
  }, [product, didInit, form]);

  const previews = useMemo(() => {
    return selectedFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      for (const p of previews) {
        URL.revokeObjectURL(p.url);
      }
    };
  }, [previews]);

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    setLocation("/login");
    return null;
  }

  if (!Number.isFinite(productId)) {
    setLocation("/admin");
    return null;
  }

  if (productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!product) {
    setLocation("/admin");
    return null;
  }

  const uploadImages = async (files: File[]) => {
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });

    const dataUrls = [];
    for (const f of files) {
      dataUrls.push(await toDataUrl(f));
    }

    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ files: dataUrls.map((d) => ({ dataUrl: d })) }),
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Upload failed");
      } catch {
        throw new Error(text || "Upload failed");
      }
    }

    const body = (await res.json()) as { urls: string[] };
    return body.urls;
  };

  const onSubmit = async (values: FormValues) => {
    const totalImages = existingImages.length + selectedFiles.length;
    if (totalImages === 0) {
      setImageError("اختر صورة واحدة على الأقل");
      return;
    }

    setImageError(null);
    setUploadPending(true);
    try {
      const newUrls = selectedFiles.length ? await uploadImages(selectedFiles) : [];
      const images = [...existingImages, ...newUrls];
      const specs = parseSpecifications(values.specifications);
      const oldPrice = (values.oldPrice ?? "").trim();

      await updateProduct({
        id: productId,
        name: values.name,
        nameFr: values.nameFr,
        description: values.description,
        descriptionFr: values.descriptionFr,
        category: values.category,
        price: values.price,
        oldPrice: oldPrice ? oldPrice : undefined,
        stock: values.stock,
        images,
        specifications: specs,
        isFeatured: values.isFeatured,
      } as any);

      setLocation("/admin");
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل تعديل المنتج",
        variant: "destructive",
      });
    } finally {
      setUploadPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-display font-bold text-xl">
            Edit Product <span className="text-primary text-sm bg-primary/10 px-2 py-0.5 rounded-full ml-2">Admin</span>
          </div>
          <Link href="/admin">
            <Button variant="outline" className="border-border/60">
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-secondary/10 p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input className="h-12 bg-background border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (French)</FormLabel>
                    <FormControl>
                      <Input className="h-12 bg-background border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[120px] bg-background border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descriptionFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (French)</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[120px] bg-background border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-background border-border/60">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-12 bg-background border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (DZD)</FormLabel>
                      <FormControl>
                        <Input className="h-12 bg-background border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oldPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Old Price (optional)</FormLabel>
                      <FormControl>
                        <Input className="h-12 bg-background border-border/60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Images</FormLabel>
                <div className="rounded-xl border border-border/60 bg-background p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {existingImages.map((url) => (
                      <div key={url} className="relative overflow-hidden rounded-lg border border-border/60 bg-secondary/10">
                        <img src={url} alt={url} className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-xs rounded bg-background/80 border border-border/60 px-2 py-1"
                          onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {previews.map((p) => (
                      <div key={p.url} className="relative overflow-hidden rounded-lg border border-border/60 bg-secondary/10">
                        <img src={p.url} alt={p.file.name} className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-xs rounded bg-background/80 border border-border/60 px-2 py-1"
                          onClick={() => setSelectedFiles((prev) => prev.filter((f) => f !== p.file))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setSelectedFiles((prev) => [...prev, ...files]);
                        setImageError(null);
                      }}
                    />
                    {imageError && (
                      <div className="text-sm text-destructive mt-3">{imageError}</div>
                    )}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="specifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specifications (one per line: Key: Value)</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[110px] bg-background border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Featured</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isPending || uploadPending}
                className="h-12 bg-primary hover:bg-primary/90"
              >
                {uploadPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
