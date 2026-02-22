import { useUser, useLogout } from "@/hooks/use-auth";
import {
  useDispatchOrdersToShipping,
  useOrders,
  useSetSiteConfig,
  useSetShippingConfig,
  useSiteConfig,
  useShippingConfig,
  useUpdateOrderStatus,
} from "@/hooks/use-orders";
import { useSlides, useCreateSlide, useUpdateSlide, useDeleteSlide } from "@/hooks/use-slides";
import { useProducts, useDeleteProduct, useUpdateProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, LogOut, Package, ShoppingBag, Pencil, Images, Shapes, Megaphone, LayoutGrid } from "lucide-react";
import { CATEGORIES, ORDER_STATUS } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";

export default function Admin() {
  const { data: user, isLoading: authLoading } = useUser();
  const [, setLocation] = useLocation();
  const { mutate: logout } = useLogout();

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!user || user.role !== "admin") {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-display font-bold text-xl">ElectroMart <span className="text-primary text-sm bg-primary/10 px-2 py-0.5 rounded-full ml-2">Admin</span></div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Logged in as {user.username}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="bg-secondary/30 border border-border/60">
            <TabsTrigger value="orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="slides">
              <Images className="w-4 h-4 mr-2" />
              Slider
            </TabsTrigger>
            <TabsTrigger value="home-categories">
              <Shapes className="w-4 h-4 mr-2" />
              Home Categories
            </TabsTrigger>
            <TabsTrigger value="announcement">
              <Megaphone className="w-4 h-4 mr-2" />
              Announcement Bar
            </TabsTrigger>
            <TabsTrigger value="home-links">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Home Links (3)
            </TabsTrigger>
            <TabsTrigger value="lingerie-hero">
              Lingerie Hero
            </TabsTrigger>
            <TabsTrigger value="checkout-config">
              Livraison & Checkout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTable />
          </TabsContent>

          <TabsContent value="products">
            <div className="flex justify-end mb-6">
              <Link href="/admin/products/new">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Product
                </Button>
              </Link>
            </div>
            <ProductsTable />
          </TabsContent>

          <TabsContent value="slides">
            <SlidesTable />
          </TabsContent>

          <TabsContent value="home-categories">
            <HomeCategoriesTable />
          </TabsContent>

          <TabsContent value="announcement">
            <AnnouncementBarAdmin />
          </TabsContent>

          <TabsContent value="home-links">
            <HomeQuickLinksAdmin />
          </TabsContent>

          <TabsContent value="lingerie-hero">
            <LingerieHeroAdmin />
          </TabsContent>

          <TabsContent value="checkout-config">
            <CheckoutConfigAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type HomeQuickLink = {
  id: number;
  title: string;
  titleFr?: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder?: number;
};

function HomeQuickLinksAdmin() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const { mutateAsync: saveSiteConfig, isPending: saving } = useSetSiteConfig();
  const { toast } = useToast();

  const [items, setItems] = useState<HomeQuickLink[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const defaultItems: HomeQuickLink[] = [
    { id: 1, title: "الأجهزة الكهرومنزلية الكبيرة", titleFr: "Gros électroménager", imageUrl: "/logo.jpg", linkUrl: "/products", sortOrder: 1 },
    { id: 2, title: "المطبخ والطبخ", titleFr: "Cuisine et cuisson", imageUrl: "/logo.jpg", linkUrl: "/products", sortOrder: 2 },
    { id: 3, title: "المنزل - صيانة - حديقة", titleFr: "Maison - Entretien - Jardin", imageUrl: "/logo.jpg", linkUrl: "/products", sortOrder: 3 },
  ];

  useEffect(() => {
    const cfg: any = siteConfig ?? {};
    if (Array.isArray(cfg.homeQuickLinks) && cfg.homeQuickLinks.length > 0) {
      setItems(cfg.homeQuickLinks);
      return;
    }
    setItems(defaultItems);
  }, [siteConfig]);

  const sorted = items
    .slice()
    .sort((a, b) => {
      const ao = typeof a.sortOrder === "number" ? a.sortOrder : 0;
      const bo = typeof b.sortOrder === "number" ? b.sortOrder : 0;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingId == null) {
      setTitleAr("");
      setTitleFr("");
      setLinkUrl("");
      setSortOrder("0");
      setImageUrl("");
      setImageFile(null);
      return;
    }
    const current = items.find((i) => i.id === editingId);
    if (!current) return;
    setTitleAr(current.title ?? "");
    setTitleFr(current.titleFr ?? "");
    setLinkUrl(current.linkUrl ?? "");
    setSortOrder(String(current.sortOrder ?? 0));
    setImageUrl(current.imageUrl ?? "");
    setImageFile(null);
  }, [dialogOpen, editingId, items]);

  const uploadImage = async (file: File) => {
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(f);
      });

    const dataUrl = await toDataUrl(file);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ files: [{ dataUrl }] }),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Upload failed");
      } catch {
        throw new Error(text || "Upload failed");
      }
    }

    const body = JSON.parse(text) as { urls: string[] };
    const first = body.urls?.[0];
    if (!first) throw new Error("Upload failed");
    return first;
  };

  const saveAll = async (nextItems: HomeQuickLink[]) => {
    const trimmed = nextItems.slice(0, 3);
    await saveSiteConfig({ homeQuickLinks: trimmed } as any);
  };

  const handleSaveSettings = async () => {
    try {
      await saveAll(items);
      toast({ title: "تم الحفظ", description: "تم حفظ الخانات" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الحفظ", variant: "destructive" });
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = titleAr.trim();
    const trimmedLink = linkUrl.trim();
    const trimmedTitleFr = titleFr.trim();

    if (!trimmedTitle) {
      toast({ title: "خطأ", description: "العنوان (عربي) مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedLink) {
      toast({ title: "خطأ", description: "الرابط مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedLink.startsWith("/") && !trimmedLink.startsWith("http")) {
      toast({ title: "خطأ", description: "الرابط لازم يبدأ بـ / أو http", variant: "destructive" });
      return;
    }
    if (!imageFile && !imageUrl.trim()) {
      toast({ title: "خطأ", description: "اختر صورة أو ضع رابط الصورة", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const nextItem: HomeQuickLink = {
        id: editingId ?? Date.now(),
        title: trimmedTitle,
        titleFr: trimmedTitleFr || undefined,
        imageUrl: finalImageUrl,
        linkUrl: trimmedLink,
        sortOrder: parseInt(sortOrder) || 0,
      };

      const nextItems =
        editingId == null ? [...items, nextItem] : items.map((i) => (i.id === editingId ? nextItem : i));

      await saveAll(nextItems);
      setItems(nextItems.slice(0, 3));
      setDialogOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الحفظ", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    const nextItems = items.filter((i) => i.id !== id);
    try {
      await saveAll(nextItems);
      setItems(nextItems);
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الحذف", variant: "destructive" });
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">ثلاث خانات (قائمة) في الصفحة الرئيسية</div>
          <Button variant="secondary" onClick={handleSaveSettings} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          العناصر: <span className="font-medium text-foreground">{sorted.length}</span> / 3
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setDialogOpen(true);
          }}
          disabled={saving || sorted.length >= 3}
        >
          <Plus className="w-4 h-4 mr-2" />
          إضافة عنصر
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId != null ? "تعديل عنصر" : "إضافة عنصر"}</DialogTitle>
            <DialogDescription>هذه الخانات تظهر تحت السلايدر في الصفحة الرئيسية.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>العنوان (عربي)</Label>
                <Input dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="مثال: الأجهزة الكهرومنزلية" />
              </div>
              <div className="grid gap-2">
                <Label>العنوان (فرنسي)</Label>
                <Input value={titleFr} onChange={(e) => setTitleFr(e.target.value)} placeholder="Ex: Gros électroménager" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>الرابط</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/products?category=Smartphones" />
            </div>

            <div className="grid gap-2">
              <Label>الترتيب</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>الصورة الصغيرة</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <Input placeholder="أو رابط الصورة" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              {(imageFile || imageUrl) && (
                <div className="mt-2 relative h-24 w-full rounded-lg overflow-hidden border border-border/60 bg-secondary/10">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving || uploading}>
                {saving || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-secondary/30">
              <TableHead>الترتيب</TableHead>
              <TableHead>الصورة</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>الرابط</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => (
              <TableRow key={item.id} className="border-border/60 hover:bg-secondary/30">
                <TableCell>{item.sortOrder ?? 0}</TableCell>
                <TableCell>
                  <div className="w-16 h-12 rounded overflow-hidden bg-background border border-border/60">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.linkUrl}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(item.id);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  لا توجد عناصر
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type CheckoutWilaya = {
  code: string;
  name: string;
  communes?: string[];
};

type DeliveryCompany = {
  id: number;
  name: string;
  priceHome: number;
  priceOffice: number;
  wilayas: string[];
};

function CheckoutConfigAdmin() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const { mutateAsync: saveSiteConfig, isPending: saving } = useSetSiteConfig();
  const { toast } = useToast();

  const [wilayas, setWilayas] = useState<CheckoutWilaya[]>([]);
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);

  const [wCode, setWCode] = useState("");
  const [wName, setWName] = useState("");
  const [wCommunesText, setWCommunesText] = useState("");
  const [editingWilayaCode, setEditingWilayaCode] = useState<string | null>(null);

  const [cId, setCId] = useState<number | null>(null);
  const [cName, setCName] = useState("");
  const [cPriceHome, setCPriceHome] = useState("");
  const [cPriceOffice, setCPriceOffice] = useState("");
  const [cWilayasText, setCWilayasText] = useState("");

  useEffect(() => {
    const cfg: any = siteConfig ?? {};
    setWilayas((cfg.checkoutWilayas ?? []) as CheckoutWilaya[]);
    setCompanies((cfg.deliveryCompanies ?? []) as DeliveryCompany[]);
  }, [siteConfig]);

  const handleAddOrUpdateWilaya = () => {
    const code = wCode.trim();
    const name = wName.trim();
    if (!code || !name) {
      toast({ title: "خطأ", description: "الكود والاسم مطلوبان", variant: "destructive" });
      return;
    }
    const communes = wCommunesText
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    setWilayas((prev) => {
      const existingIndex = prev.findIndex((w) => w.code === code);
      const next: CheckoutWilaya = { code, name, communes: communes.length ? communes : undefined };
      if (existingIndex === -1) {
        return [...prev, next].sort((a, b) => a.code.localeCompare(b.code));
      }
      const copy = prev.slice();
      copy[existingIndex] = next;
      return copy.sort((a, b) => a.code.localeCompare(b.code));
    });
    setWCode("");
    setWName("");
    setWCommunesText("");
    setEditingWilayaCode(null);
  };

  const handleEditWilaya = (w: CheckoutWilaya) => {
    setEditingWilayaCode(w.code);
    setWCode(w.code);
    setWName(w.name);
    setWCommunesText((w.communes ?? []).join(", "));
  };

  const handleDeleteWilaya = (code: string) => {
    setWilayas((prev) => prev.filter((w) => w.code !== code));
  };

  const handleEditCompany = (company: DeliveryCompany) => {
    setCId(company.id);
    setCName(company.name);
    setCPriceHome(String(company.priceHome));
    setCPriceOffice(String(company.priceOffice));
    setCWilayasText(company.wilayas.join(", "));
  };

  const handleDeleteCompany = (id: number) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddOrUpdateCompany = () => {
    const name = cName.trim();
    const priceHome = Number(cPriceHome || "0");
    const priceOffice = Number(cPriceOffice || "0");
    const wilayasCodes = cWilayasText
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (!name) {
      toast({ title: "خطأ", description: "اسم الشركة مطلوب", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(priceHome) || priceHome < 0 || !Number.isFinite(priceOffice) || priceOffice < 0) {
      toast({ title: "خطأ", description: "أسعار التوصيل غير صالحة", variant: "destructive" });
      return;
    }
    if (wilayasCodes.length === 0) {
      toast({ title: "خطأ", description: "على الأقل ولاية واحدة مطلوبة", variant: "destructive" });
      return;
    }

    setCompanies((prev) => {
      const id = cId ?? (prev.length ? Math.max(...prev.map((c) => c.id)) + 1 : 1);
      const existingIndex = prev.findIndex((c) => c.id === id);
      const next: DeliveryCompany = {
        id,
        name,
        priceHome,
        priceOffice,
        wilayas: wilayasCodes,
      };
      if (existingIndex === -1) {
        return [...prev, next].sort((a, b) => a.id - b.id);
      }
      const copy = prev.slice();
      copy[existingIndex] = next;
      return copy.sort((a, b) => a.id - b.id);
    });

    setCId(null);
    setCName("");
    setCPriceHome("");
    setCPriceOffice("");
    setCWilayasText("");
  };

  const handleSaveAll = async () => {
    try {
      await saveSiteConfig({
        checkoutWilayas: wilayas,
        deliveryCompanies: companies,
      } as any);
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات التوصيل والـ Checkout" });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل الحفظ",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          إدارة الولايات، البلديات وشركات التوصيل الخاصة بنموذج Checkout
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الكل"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-sm">الولايات والبلديات</h3>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>كود الولاية (مثال: 01, 16, 31)</Label>
              <Input value={wCode} onChange={(e) => setWCode(e.target.value)} placeholder="16" />
            </div>
            <div className="grid gap-2">
              <Label>اسم الولاية</Label>
              <Input value={wName} onChange={(e) => setWName(e.target.value)} placeholder="Alger" />
            </div>
            <div className="grid gap-2">
              <Label>البلديات (مفصولة بفواصل)</Label>
              <Input
                value={wCommunesText}
                onChange={(e) => setWCommunesText(e.target.value)}
                placeholder="Bab Ezzouar, Kouba, Hydra"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddOrUpdateWilaya}>
                {editingWilayaCode ? "تعديل الولاية" : "إضافة ولاية"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden bg-background/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>عدد البلديات</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wilayas.map((w) => (
                  <TableRow key={w.code} className="border-border/60">
                    <TableCell className="font-mono text-xs">{w.code}</TableCell>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.communes?.length ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEditWilaya(w)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteWilaya(w.code)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {wilayas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                      لم يتم إضافة أي ولاية بعد.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-sm">شركات التوصيل</h3>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>اسم الشركة</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Yalidine" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>سعر التوصيل للمنزل (DA)</Label>
                <Input
                  type="number"
                  value={cPriceHome}
                  onChange={(e) => setCPriceHome(e.target.value)}
                  placeholder="1100"
                />
              </div>
              <div className="grid gap-2">
                <Label>سعر التوصيل للمكتب (DA)</Label>
                <Input
                  type="number"
                  value={cPriceOffice}
                  onChange={(e) => setCPriceOffice(e.target.value)}
                  placeholder="800"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>الولايات المدعومة (أكواد مفصولة بفواصل)</Label>
              <Input
                value={cWilayasText}
                onChange={(e) => setCWilayasText(e.target.value)}
                placeholder="01, 16, 31"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddOrUpdateCompany}>
                {cId != null ? "تعديل الشركة" : "إضافة شركة"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden bg-background/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead>الاسم</TableHead>
                  <TableHead>منزل</TableHead>
                  <TableHead>مكتب</TableHead>
                  <TableHead>ولايات</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id} className="border-border/60">
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.priceHome} DA</TableCell>
                    <TableCell>{c.priceOffice} DA</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.wilayas.map((code) => (
                          <Badge key={code} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEditCompany(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCompany(c.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                      لم يتم إضافة أي شركة توصيل بعد.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

type AnnouncementItem = {
  id: number;
  text: string;
  textFr?: string;
  sortOrder?: number;
};

function AnnouncementBarAdmin() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const { mutateAsync: saveSiteConfig, isPending: saving } = useSetSiteConfig();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(true);
  const [speedSeconds, setSpeedSeconds] = useState("24");
  const [items, setItems] = useState<AnnouncementItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [textFr, setTextFr] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const defaultItems: AnnouncementItem[] = [
    { id: 1, text: "🚚 Electro Mart delivers to all 58 states in Algeria", textFr: "🚚 Electro Mart livre dans les 58 wilayas en Algérie", sortOrder: 1 },
    { id: 2, text: "⭐ Electro Mart offers the best European products", textFr: "⭐ Electro Mart propose les meilleurs produits européens", sortOrder: 2 },
    { id: 3, text: "🔥 Electro Mart provides the best offers and prices", textFr: "🔥 Electro Mart propose les meilleures offres et prix", sortOrder: 3 },
    { id: 4, text: "📞 Customer Service Phone Number: +213 XX XX XX XX", textFr: "📞 Service client : +213 XX XX XX XX", sortOrder: 4 },
    { id: 5, text: "💳 Payment on delivery available", textFr: "💳 Paiement à la livraison disponible", sortOrder: 5 },
    { id: 6, text: "🚀 Fast delivery service", textFr: "🚀 Livraison rapide", sortOrder: 6 },
  ];

  useEffect(() => {
    const cfg: any = siteConfig ?? {};
    setEnabled(cfg.announcementEnabled ?? true);
    setSpeedSeconds(String(typeof cfg.announcementSpeedSeconds === "number" ? cfg.announcementSpeedSeconds : 32));
    if (Array.isArray(cfg.announcementItems) && cfg.announcementItems.length > 0) {
      setItems(cfg.announcementItems);
    } else {
      setItems(defaultItems);
    }
  }, [siteConfig]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingId == null) {
      setText("");
      setTextFr("");
      setSortOrder("0");
      return;
    }
    const current = items.find((i) => i.id === editingId);
    if (!current) return;
    setText(current.text ?? "");
    setTextFr(current.textFr ?? "");
    setSortOrder(String(current.sortOrder ?? 0));
  }, [dialogOpen, editingId, items]);

  const sortedItems = items
    .slice()
    .sort((a, b) => {
      const ao = typeof a.sortOrder === "number" ? a.sortOrder : 0;
      const bo = typeof b.sortOrder === "number" ? b.sortOrder : 0;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });

  const saveAll = async (nextItems: AnnouncementItem[]) => {
    const speed = Math.max(8, Math.min(60, parseInt(speedSeconds) || 32));
    await saveSiteConfig({
      announcementEnabled: enabled,
      announcementSpeedSeconds: speed,
      announcementItems: nextItems,
    } as any);
  };

  const handleSaveSettings = async () => {
    try {
      await saveAll(items);
      toast({ title: "تم الحفظ", description: "تم حفظ شريط الإعلانات" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الحفظ", variant: "destructive" });
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      toast({ title: "خطأ", description: "نص الإعلان مطلوب", variant: "destructive" });
      return;
    }

    const nextItem: AnnouncementItem = {
      id: editingId ?? Date.now(),
      text: trimmed,
      textFr: textFr.trim() || undefined,
      sortOrder: parseInt(sortOrder) || 0,
    };

    const nextItems =
      editingId == null ? [...items, nextItem] : items.map((i) => (i.id === editingId ? nextItem : i));

    try {
      await saveAll(nextItems);
      setItems(nextItems);
      setDialogOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الحفظ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا الإعلان؟")) return;
    const nextItems = items.filter((i) => i.id !== id);
    try {
      await saveAll(nextItems);
      setItems(nextItems);
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الحذف", variant: "destructive" });
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">Electro Mart Announcement Bar</div>
          <Button variant="secondary" onClick={handleSaveSettings} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(Boolean(v))} />
            <div className="text-sm font-medium">تفعيل الشريط</div>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label>سرعة الحركة (ثانية)</Label>
            <Input
              type="number"
              min={8}
              max={60}
              value={speedSeconds}
              onChange={(e) => setSpeedSeconds(e.target.value)}
              placeholder="24"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          عناصر الشريط: <span className="font-medium text-foreground">{sortedItems.length}</span>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setDialogOpen(true);
          }}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-2" />
          إضافة نص
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId != null ? "تعديل النص" : "إضافة نص"}</DialogTitle>
            <DialogDescription>اكتب النص مع الإيموجي إذا أردت.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Label>النص (افتراضي / عربي أو إنجليزي)</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="🚚 ..." />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label>النص (فرنسي)</Label>
              <Input value={textFr} onChange={(e) => setTextFr(e.target.value)} placeholder="🚚 ..." />
            </div>
            <div className="grid gap-2">
              <Label>الترتيب</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-secondary/30">
              <TableHead>الترتيب</TableHead>
              <TableHead>النص</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id} className="border-border/60 hover:bg-secondary/30">
                <TableCell>{item.sortOrder ?? 0}</TableCell>
                <TableCell className="font-medium">{item.text}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(item.id);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  لا توجد عناصر. أضف أول نص ليظهر الشريط.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LingerieHeroAdmin() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const { mutateAsync: saveSiteConfig, isPending: saving } = useSetSiteConfig();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");

  useEffect(() => {
    const cfg: any = siteConfig ?? {};
    setEnabled(Boolean(cfg.lingerieHeroEnabled));
    setImageUrl(cfg.lingerieHeroImageUrl ?? "");
    setTitle(cfg.lingerieHeroTitle ?? "Bienvenue chez lingerie dial");
    setButtonText(cfg.lingerieHeroButtonText ?? "Acheter maintenant");
    setButtonLink(cfg.lingerieHeroButtonLink ?? "/products");
  }, [siteConfig]);

  const handleSave = async () => {
    const trimmedImage = imageUrl.trim();
    const trimmedTitle = title.trim();
    const trimmedButtonText = buttonText.trim();
    const trimmedButtonLink = buttonLink.trim();

    if (!trimmedTitle) {
      toast({ title: "خطأ", description: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedButtonText) {
      toast({ title: "خطأ", description: "نص الزر مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedButtonLink) {
      toast({ title: "خطأ", description: "رابط الزر مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedButtonLink.startsWith("/") && !trimmedButtonLink.startsWith("http")) {
      toast({
        title: "خطأ",
        description: "رابط الزر لازم يبدأ بـ / أو http",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveSiteConfig({
        lingerieHeroEnabled: enabled,
        lingerieHeroImageUrl: trimmedImage || undefined,
        lingerieHeroTitle: trimmedTitle,
        lingerieHeroButtonText: trimmedButtonText,
        lingerieHeroButtonLink: trimmedButtonLink,
      } as any);
      toast({ title: "تم الحفظ", description: "تم حفظ قسم الهيرو الخاص باللانجري" });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل الحفظ",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">إعدادات قسم الهيرو لموقع اللانجري</div>
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(Boolean(v))} />
            <div className="text-sm font-medium">تفعيل قسم الهيرو الخاص باللانجري</div>
          </div>

          <div className="grid gap-2">
            <Label>رابط صورة الخلفية</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/uploads/lingerie-hero.jpg أو رابط خارجي"
            />
            <p className="text-xs text-muted-foreground">
              يمكنك رفع الصورة من صفحة الملفات أو استخدام رابط مباشر.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>العنوان الرئيسي</Label>
            <Input
              dir="rtl"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bienvenue chez lingerie dial"
            />
          </div>

          <div className="grid gap-2">
            <Label>نص الزر</Label>
            <Input
              dir="rtl"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Acheter maintenant"
            />
          </div>

          <div className="grid gap-2">
            <Label>رابط الزر</Label>
            <Input
              value={buttonLink}
              onChange={(e) => setButtonLink(e.target.value)}
              placeholder="/products أو رابط صفحة مخصصة"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type HomeCategoryHighlight = {
  id: number;
  title: string;
  titleFr?: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder?: number;
};

function HomeCategoriesTable() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const { mutateAsync: saveSiteConfig, isPending: saving } = useSetSiteConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [sectionTitleAr, setSectionTitleAr] = useState("");
  const [sectionTitleFr, setSectionTitleFr] = useState("");
  const [sectionSubtitleAr, setSectionSubtitleAr] = useState("");
  const [sectionSubtitleFr, setSectionSubtitleFr] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const highlights = (siteConfig?.homeCategoryHighlights ?? []).slice().sort((a: any, b: any) => {
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : 0;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id - b.id;
  }) as HomeCategoryHighlight[];

  useEffect(() => {
    setSectionTitleAr((siteConfig as any)?.homeCategoriesTitle ?? "");
    setSectionTitleFr((siteConfig as any)?.homeCategoriesTitleFr ?? "");
    setSectionSubtitleAr((siteConfig as any)?.homeCategoriesSubtitle ?? "");
    setSectionSubtitleFr((siteConfig as any)?.homeCategoriesSubtitleFr ?? "");
  }, [
    (siteConfig as any)?.homeCategoriesSubtitle,
    (siteConfig as any)?.homeCategoriesSubtitleFr,
    (siteConfig as any)?.homeCategoriesTitle,
    (siteConfig as any)?.homeCategoriesTitleFr,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingId != null) {
      const current = highlights.find((h) => h.id === editingId);
      if (current) {
        setTitleAr(current.title ?? "");
        setTitleFr(current.titleFr ?? "");
        setLinkUrl(current.linkUrl ?? "");
        setSortOrder(String(current.sortOrder ?? 0));
        setImageUrl(current.imageUrl ?? "");
      }
    } else {
      setTitleAr("");
      setTitleFr("");
      setLinkUrl("");
      setSortOrder("0");
      setImageUrl("");
    }
    setImageFile(null);
  }, [editingId, highlights, isOpen]);

  const handleSaveSection = async () => {
    try {
      setSavingSection(true);
      await saveSiteConfig({
        logoUrl: siteConfig?.logoUrl,
        homeCategoryHighlights: highlights,
        homeCategoriesTitle: sectionTitleAr,
        homeCategoriesTitleFr: sectionTitleFr,
        homeCategoriesSubtitle: sectionSubtitleAr,
        homeCategoriesSubtitleFr: sectionSubtitleFr,
      } as any);
      toast({ title: "تم الحفظ", description: "تم حفظ عنوان القسم" });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل حفظ عنوان القسم",
        variant: "destructive",
      });
    } finally {
      setSavingSection(false);
    }
  };

  const uploadImage = async (file: File) => {
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(f);
      });

    const dataUrl = await toDataUrl(file);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ files: [{ dataUrl }] }),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Upload failed");
      } catch {
        throw new Error(text || "Upload failed");
      }
    }

    const body = JSON.parse(text) as { urls: string[] };
    const first = body.urls?.[0];
    if (!first) throw new Error("Upload failed");
    return first;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = titleAr.trim();
    const trimmedLink = linkUrl.trim();
    const trimmedTitleFr = titleFr.trim();

    if (!trimmedTitle) {
      toast({ title: "خطأ", description: "اسم الفئة (عربي) مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedLink) {
      toast({ title: "خطأ", description: "الرابط مطلوب", variant: "destructive" });
      return;
    }
    if (!trimmedLink.startsWith("/") && !trimmedLink.startsWith("http")) {
      toast({
        title: "خطأ",
        description: "الرابط لازم يبدأ بـ / أو http",
        variant: "destructive",
      });
      return;
    }
    if (!imageFile && !imageUrl.trim()) {
      toast({ title: "خطأ", description: "اختر صورة أو ضع رابط الصورة", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const nextItem: HomeCategoryHighlight = {
        id: editingId ?? Date.now(),
        title: trimmedTitle,
        titleFr: trimmedTitleFr || undefined,
        imageUrl: finalImageUrl,
        linkUrl: trimmedLink,
        sortOrder: parseInt(sortOrder) || 0,
      };

      const nextList = (() => {
        if (editingId == null) return [...highlights, nextItem];
        return highlights.map((h) => (h.id === editingId ? nextItem : h));
      })();

      await saveSiteConfig({
        logoUrl: siteConfig?.logoUrl,
        homeCategoryHighlights: nextList,
      });

      setIsOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل الحفظ",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    try {
      const nextList = highlights.filter((h) => h.id !== id);
      await saveSiteConfig({
        logoUrl: siteConfig?.logoUrl,
        homeCategoryHighlights: nextList,
      });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل الحذف",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">عنوان قسم “أفضل الفئات”</div>
          <Button
            variant="secondary"
            onClick={handleSaveSection}
            disabled={saving || savingSection}
          >
            {savingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ العنوان"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="grid gap-2">
            <Label>العنوان (عربي)</Label>
            <Input
              dir="rtl"
              value={sectionTitleAr}
              onChange={(e) => setSectionTitleAr(e.target.value)}
              placeholder="مثال: أفضل الفئات"
            />
          </div>
          <div className="grid gap-2">
            <Label>العنوان (فرنسي)</Label>
            <Input
              value={sectionTitleFr}
              onChange={(e) => setSectionTitleFr(e.target.value)}
              placeholder="Ex: Les tops catégories"
            />
          </div>
          <div className="grid gap-2">
            <Label>الوصف (عربي)</Label>
            <Input
              dir="rtl"
              value={sectionSubtitleAr}
              onChange={(e) => setSectionSubtitleAr(e.target.value)}
              placeholder="مثال: تستحق التجربة فعلاً"
            />
          </div>
          <div className="grid gap-2">
            <Label>الوصف (فرنسي)</Label>
            <Input
              value={sectionSubtitleFr}
              onChange={(e) => setSectionSubtitleFr(e.target.value)}
              placeholder="Ex: méritent largement le détour"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          عناصر التصنيفات في الصفحة الرئيسية: <span className="font-medium text-foreground">{highlights.length}</span>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setIsOpen(true);
          }}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-2" />
          إضافة عنصر
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId != null ? "تعديل عنصر" : "إضافة عنصر جديد"}</DialogTitle>
            <DialogDescription>هذا القسم يظهر في الصفحة الرئيسية ضمن “أفضل الفئات”.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>الاسم (عربي)</Label>
                <Input
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  dir="rtl"
                  placeholder="مثال: تلفزيون"
                />
              </div>
              <div className="grid gap-2">
                <Label>الاسم (فرنسي)</Label>
                <Input value={titleFr} onChange={(e) => setTitleFr(e.target.value)} placeholder="Ex: Téléviseur" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>الرابط</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/products?category=Smartphones" />
              <div className="text-xs text-muted-foreground">
                مثال: /products?category=Smartphones
              </div>
            </div>

            <div className="grid gap-2">
              <Label>الترتيب</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>الصورة</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <Input
                placeholder="أو رابط الصورة"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              {(imageFile || imageUrl) && (
                <div className="mt-2 relative h-32 w-full rounded-lg overflow-hidden border border-border/60 bg-secondary/10">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={uploading || saving}>
                {uploading || saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-secondary/30">
              <TableHead>الترتيب</TableHead>
              <TableHead>الصورة</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>الرابط</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {highlights.map((item) => (
              <TableRow key={item.id} className="border-border/60 hover:bg-secondary/30">
                <TableCell>{item.sortOrder ?? 0}</TableCell>
                <TableCell>
                  <div className="w-16 h-12 rounded overflow-hidden bg-background border border-border/60">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.linkUrl}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(item.id);
                        setIsOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {highlights.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  لا توجد عناصر. أضف أول عنصر ليظهر القسم في الصفحة الرئيسية.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SlidesTable() {
  const { data: slides, isLoading } = useSlides();
  const { mutateAsync: createSlide } = useCreateSlide();
  const { mutateAsync: updateSlide } = useUpdateSlide();
  const { mutateAsync: deleteSlide } = useDeleteSlide();
  const [isOpen, setIsOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [subtitleFr, setSubtitleFr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonTextFr, setButtonTextFr] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingSlide) {
        setTitle(editingSlide.title);
        setTitleFr(editingSlide.titleFr || "");
        setSubtitle(editingSlide.subtitle || "");
        setSubtitleFr(editingSlide.subtitleFr || "");
        setDescription(editingSlide.description || "");
        setDescriptionFr(editingSlide.descriptionFr || "");
        setButtonText(editingSlide.buttonText || "");
        setButtonTextFr(editingSlide.buttonTextFr || "");
        setLinkUrl(editingSlide.linkUrl);
        setSortOrder(String(editingSlide.sortOrder));
        setImageUrl(editingSlide.imageUrl);
      } else {
        setTitle("");
        setTitleFr("");
        setSubtitle("");
        setSubtitleFr("");
        setDescription("");
        setDescriptionFr("");
        setButtonText("");
        setButtonTextFr("");
        setLinkUrl("");
        setSortOrder("0");
        setImageUrl("");
      }
      setImageFile(null);
    }
  }, [isOpen, editingSlide]);

  const uploadImage = async (file: File) => {
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(f);
      });

    const dataUrl = await toDataUrl(file);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ files: [{ dataUrl }] }),
    });

    if (!res.ok) throw new Error("Upload failed");
    const body = await res.json();
    return body.urls[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      if (!finalImageUrl) {
        alert("Image is required");
        return;
      }

      const data = {
        title,
        titleFr,
        subtitle,
        subtitleFr,
        description,
        descriptionFr,
        buttonText,
        buttonTextFr,
        linkUrl,
        sortOrder: parseInt(sortOrder) || 0,
        imageUrl: finalImageUrl,
      };

      if (editingSlide) {
        await updateSlide({ id: editingSlide.id, ...data });
      } else {
        await createSlide(data);
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to save slide");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingSlide(null); setIsOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Slide
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Slide" : "Add New Slide"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Title (Arabic)</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required dir="rtl" />
              </div>
              <div className="grid gap-2">
                <Label>Title (French)</Label>
                <Input value={titleFr} onChange={e => setTitleFr(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Subtitle (Arabic)</Label>
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} dir="rtl" />
              </div>
              <div className="grid gap-2">
                <Label>Subtitle (French)</Label>
                <Input value={subtitleFr} onChange={e => setSubtitleFr(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Description (Arabic)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} dir="rtl" />
              </div>
              <div className="grid gap-2">
                <Label>Description (French)</Label>
                <Input value={descriptionFr} onChange={e => setDescriptionFr(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Button Text (Arabic)</Label>
                <Input value={buttonText} onChange={e => setButtonText(e.target.value)} dir="rtl" />
              </div>
              <div className="grid gap-2">
                <Label>Button Text (French)</Label>
                <Input value={buttonTextFr} onChange={e => setButtonTextFr(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Link URL</Label>
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={e => setImageFile(e.target.files?.[0] || null)}
              />
              {(imageFile || imageUrl) && (
                <div className="mt-2 relative h-32 w-full rounded-lg overflow-hidden border">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-secondary/30">
              <TableHead>Order</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slides?.map((slide) => (
              <TableRow key={slide.id} className="border-border/60 hover:bg-secondary/30">
                <TableCell>{slide.sortOrder}</TableCell>
                <TableCell>
                  <div className="w-16 h-10 rounded overflow-hidden">
                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                  </div>
                </TableCell>
                <TableCell>{slide.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{slide.linkUrl}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditingSlide(slide); setIsOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this slide?")) deleteSlide(slide.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {slides?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No slides found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrdersTable() {
  const { data: orders, isLoading, isError, error, refetch, isFetching } = useOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { mutate: dispatchOrders, isPending: dispatchPending } = useDispatchOrdersToShipping();
  const { data: shippingConfig, isError: shippingErrorState, error: shippingError } = useShippingConfig();
  const { mutate: saveShippingConfig, isPending: savingShippingConfig } = useSetShippingConfig();
  const { data: siteConfig } = useSiteConfig();
  const { mutateAsync: saveSiteConfig, isPending: savingSiteConfig } = useSetSiteConfig();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiId, setApiId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [fromWilayaName, setFromWilayaName] = useState("");
  const [defaultCommune, setDefaultCommune] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploadPending, setLogoUploadPending] = useState(false);

  const shippingConfigured = useMemo(() => {
    return Boolean(shippingConfig?.apiUrl && shippingConfig?.apiId && shippingConfig?.tokenPresent);
  }, [shippingConfig?.apiId, shippingConfig?.apiUrl, shippingConfig?.tokenPresent]);

  useEffect(() => {
    if (!isError) return;
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      setLocation("/login");
      return;
    }
    toast({
      title: "خطأ",
      description: "تعذر جلب الطلبات. حاول مرة أخرى.",
      variant: "destructive",
    });
  }, [error, isError, setLocation, toast]);

  useEffect(() => {
    if (!shippingErrorState) return;
    const message = shippingError instanceof Error ? shippingError.message : "Unknown error";
    if (message === "Unauthorized") {
      setLocation("/login");
    }
  }, [setLocation, shippingError, shippingErrorState]);

  useEffect(() => {
    if (!shippingDialogOpen) return;
    setApiUrl(shippingConfig?.apiUrl ?? "");
    setApiId(shippingConfig?.apiId ?? "");
    setApiToken("");
    setFromWilayaName(shippingConfig?.fromWilayaName ?? "");
    setDefaultCommune(shippingConfig?.defaultCommune ?? "");
  }, [shippingConfig?.apiId, shippingConfig?.apiUrl, shippingDialogOpen]);

  useEffect(() => {
    if (!siteDialogOpen) return;
    setLogoUrl(siteConfig?.logoUrl ?? "");
    setLogoFile(null);
  }, [siteConfig?.logoUrl, siteDialogOpen]);

  const uploadLogo = async (file: File) => {
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(f);
      });

    const dataUrl = await toDataUrl(file);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ files: [{ dataUrl }] }),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Upload failed");
      } catch {
        throw new Error(text || "Upload failed");
      }
    }

    const body = JSON.parse(text) as { urls: string[] };
    const first = body.urls?.[0];
    if (!first) throw new Error("Upload failed");
    return first;
  };

  const handleSaveLogo = async () => {
    try {
      let nextLogoUrl = logoUrl.trim();
      if (logoFile) {
        setLogoUploadPending(true);
        nextLogoUrl = await uploadLogo(logoFile);
        setLogoUrl(nextLogoUrl);
      }
      await saveSiteConfig({ logoUrl: nextLogoUrl || undefined });
      setSiteDialogOpen(false);
    } catch (e: any) {
      toast({
        title: "خطأ",
        description: e?.message || "فشل حفظ الشعار",
        variant: "destructive",
      });
    } finally {
      setLogoUploadPending(false);
    }
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (isError) {
    return (
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-6 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">تعذر جلب الطلبات</div>
        <Button
          variant="secondary"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "إعادة المحاولة"}
        </Button>
      </div>
    );
  }
  if (!orders) return null;

  const pendingCount = orders.filter((o) => o.status === ORDER_STATUS.PENDING).length;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border/60">
        <div className="text-sm text-muted-foreground">
          طلبات Pending: <span className="font-medium text-foreground">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">تغيير الشعار</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>شعار الموقع</DialogTitle>
                <DialogDescription>ارفع صورة أو ضع رابط الشعار</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="site-logo-url">Logo URL (اختياري)</Label>
                  <Input
                    id="site-logo-url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="/uploads/..."
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="site-logo-file">رفع شعار</Label>
                  <Input
                    id="site-logo-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 p-3 flex items-center justify-center">
                  <img
                    src={logoUrl.trim() || "/logo.png"}
                    alt="Logo Preview"
                    className="h-24 w-auto object-contain"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  disabled={savingSiteConfig || logoUploadPending}
                  onClick={handleSaveLogo}
                >
                  {savingSiteConfig || logoUploadPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">إعداد شركة التوصيل</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إعداد شركة التوصيل</DialogTitle>
                <DialogDescription>
                  {shippingConfig?.tokenPresent ? "التوكن محفوظ مسبقًا. اتركه فارغًا إذا لا تريد تغييره." : "التوكن غير محفوظ بعد."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shipping-api-url">API URL</Label>
                  <Input
                    id="shipping-api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://..."
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shipping-api-id">API ID</Label>
                  <Input
                    id="shipping-api-id"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shipping-api-token">API Token</Label>
                  <Input
                    id="shipping-api-token"
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder={shippingConfig?.tokenPresent ? "••••••••••••" : ""}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shipping-from-wilaya">From Wilaya (اختياري)</Label>
                  <Input
                    id="shipping-from-wilaya"
                    value={fromWilayaName}
                    onChange={(e) => setFromWilayaName(e.target.value)}
                    placeholder="Algiers"
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shipping-default-commune">Default Commune (اختياري)</Label>
                  <Input
                    id="shipping-default-commune"
                    value={defaultCommune}
                    onChange={(e) => setDefaultCommune(e.target.value)}
                    placeholder="Hydra"
                    autoComplete="off"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  disabled={savingShippingConfig}
                  onClick={() => {
                    const trimmedUrl = apiUrl.trim();
                    const trimmedId = apiId.trim();
                    const trimmedToken = apiToken.trim();
                    if (!trimmedUrl || !trimmedId) {
                      toast({
                        title: "خطأ",
                        description: "أدخل API URL و API ID",
                        variant: "destructive",
                      });
                      return;
                    }
                    saveShippingConfig(
                      {
                        apiUrl: trimmedUrl,
                        apiId: trimmedId,
                        apiToken: trimmedToken || undefined,
                        fromWilayaName: fromWilayaName.trim() || undefined,
                        defaultCommune: defaultCommune.trim() || undefined,
                      },
                      {
                        onSuccess: () => setShippingDialogOpen(false),
                      },
                    );
                  }}
                >
                  {savingShippingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            disabled={dispatchPending || pendingCount === 0 || !shippingConfigured}
            onClick={() => dispatchOrders(undefined)}
          >
            {dispatchPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال الطلبات لشركة التوصيل"}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-secondary/30">
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow className="border-border/60 hover:bg-secondary/30">
              <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                لا توجد طلبات بعد
              </TableCell>
            </TableRow>
          ) : null}
          {orders?.map((order) => (
            <TableRow key={order.id} className="border-border/60 hover:bg-secondary/30">
              <TableCell className="font-mono text-muted-foreground">#{order.id}</TableCell>
              <TableCell>
                <div className="font-medium">{order.customerName || "-"}</div>
                <div className="text-xs text-muted-foreground">{order.wilaya || "-"}</div>
              </TableCell>
              <TableCell>{order.phone || "-"}</TableCell>
              <TableCell className="font-bold">{Number(order.totalPrice).toLocaleString()} DZD</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(order.createdAt as any).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Select
                  defaultValue={order.status}
                  onValueChange={(val) => updateStatus({ id: order.id, status: val })}
                >
                  <SelectTrigger className="h-8 w-[130px] bg-background border-border/60">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusDotClass(order.status)}`} />
                      <span>{order.status}</span>
                    </div>
                    <SelectValue className="sr-only" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ORDER_STATUS).map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
                          <span>{status}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function statusDotClass(status: string) {
  if (status === ORDER_STATUS.CONFIRMED) return "bg-green-500";
  if (status === ORDER_STATUS.SHIPPED) return "bg-blue-500";
  if (status === ORDER_STATUS.DELIVERED) return "bg-emerald-500";
  return "bg-yellow-500";
}

function ProductsTable() {
  const { data: products, isLoading } = useProducts();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutateAsync: updateProduct, isPending: updatePending } = useUpdateProduct();
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editNameFr, setEditNameFr] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOldPrice, setEditOldPrice] = useState("");
  const [editStock, setEditStock] = useState(0);
  const [editCategory, setEditCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [editFeatured, setEditFeatured] = useState(false);

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEditName(product.name ?? "");
    setEditNameFr(product.nameFr ?? "");
    setEditPrice(String(product.price ?? ""));
    setEditOldPrice(product.oldPrice ? String(product.oldPrice) : "");
    setEditStock(Number(product.stock ?? 0));
    setEditCategory((product.category as (typeof CATEGORIES)[number]) ?? CATEGORIES[0]);
    setEditFeatured(Boolean(product.isFeatured));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    const trimmedOldPrice = editOldPrice.trim();
    await updateProduct({
      id: editingProduct.id,
      name: editName,
      nameFr: editNameFr || undefined,
      category: editCategory,
      price: editPrice,
      oldPrice: trimmedOldPrice ? trimmedOldPrice : undefined,
      stock: editStock,
      isFeatured: editFeatured,
    } as any);
    setEditOpen(false);
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-secondary/30">
            <TableHead>الصورة</TableHead>
            <TableHead>اسم المنتج</TableHead>
            <TableHead>الفئة</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>المخزون</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map((product) => (
            <TableRow key={product.id} className="border-border/60 hover:bg-secondary/30">
              <TableCell>
                {(() => {
                  const images = (product.images as string[]) || [];
                  const mainImage = images[0] || "/logo.jpg";
                  return (
                    <div className="w-10 h-10 rounded bg-white p-1">
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
              <TableCell>{Number(product.price).toLocaleString()}</TableCell>
              <TableCell>{product.stock}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(product)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this product?")) deleteProduct(product.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المنتج</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">اسم المنتج (عربي)</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name-fr">اسم المنتج (فرنسي)</Label>
              <Input
                id="edit-name-fr"
                value={editNameFr}
                onChange={(e) => setEditNameFr(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">سعر المنتج</Label>
                <Input
                  id="edit-price"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-old-price">السعر القديم للمنتج (اختياري)</Label>
                <Input
                  id="edit-old-price"
                  value={editOldPrice}
                  onChange={(e) => setEditOldPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-stock">مخزون المنتج</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label>فئة المنتج</Label>
                <Select value={editCategory} onValueChange={(val) => setEditCategory(val as (typeof CATEGORIES)[number])}>
                  <SelectTrigger className="h-10 bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={editFeatured} onCheckedChange={(v) => setEditFeatured(Boolean(v))} />
              <span>مميز</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={updatePending}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePending}>
              {updatePending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
