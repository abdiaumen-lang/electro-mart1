import { Navbar } from "@/components/Navbar";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder, useSiteConfig } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { useLanguage } from "@/hooks/use-language";

const checkoutSchema = z.object({
  lastName: z.string().min(2, "Le nom est requis"),
  firstName: z.string().min(2, "Le prénom est requis"),
  phone: z.string().min(8, "Numéro invalide"),
  wilayaCode: z.string().min(1, "Sélectionnez une wilaya"),
  commune: z.string().min(1, "Commune requise"),
  address: z.string().min(5, "Adresse requise"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

type DeliveryCompany = {
  id: number;
  name: string;
  priceHome: number;
  priceOffice: number;
  wilayas: string[];
};

const FALLBACK_WILAYAS = [
  "Adrar",
  "Chlef",
  "Laghouat",
  "Oum El Bouaghi",
  "Batna",
  "Béjaïa",
  "Biskra",
  "Béchar",
  "Blida",
  "Bouira",
  "Tamanrasset",
  "Tébessa",
  "Tlemcen",
  "Tiaret",
  "Tizi Ouzou",
  "Algiers",
  "Djelfa",
  "Jijel",
  "Sétif",
  "Saïda",
  "Skikda",
  "Sidi Bel Abbès",
  "Annaba",
  "Guelma",
  "Constantine",
  "Médéa",
  "Mostaganem",
  "M'Sila",
  "Mascara",
  "Ouargla",
  "Oran",
  "El Bayadh",
  "Illizi",
  "Bordj Bou Arreridj",
  "Boumerdès",
  "El Tarf",
  "Tindouf",
  "Tissemsilt",
  "El Oued",
  "Khenchela",
  "Souk Ahras",
  "Tipaza",
  "Mila",
  "Aïn Defla",
  "Naâma",
  "Aïn Témouchent",
  "Ghardaïa",
  "Relizane",
  "Timimoun",
  "Bordj Badji Mokhtar",
  "Ouled Djellal",
  "Béni Abbès",
  "In Salah",
  "In Guezzam",
  "Touggourt",
  "Djanet",
  "El M'Ghair",
  "El Meniaa",
].map((name, index) => ({
  code: String(index + 1).padStart(2, "0"),
  name,
}));

const DEFAULT_DELIVERY_COMPANIES: DeliveryCompany[] = [
  {
    id: 1,
    name: "Yalidine",
    priceHome: 1100,
    priceOffice: 800,
    wilayas: FALLBACK_WILAYAS.map((w) => w.code),
  },
  {
    id: 2,
    name: "ZR Express",
    priceHome: 1200,
    priceOffice: 900,
    wilayas: FALLBACK_WILAYAS.map((w) => w.code),
  },
];

const normalizeWilayaCode = (code: string) => code.trim().replace(/^0+/, "") || "0";

export default function Checkout() {
  const { items, total, clearCart, updateQuantity } = useCart();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { data: siteConfig } = useSiteConfig();
  const [success, setSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const checkoutWilayas =
    ((siteConfig as any)?.checkoutWilayas as Array<{
      code: string;
      name: string;
      communes?: string[];
    }>) ?? [];

  const deliveryCompaniesFromConfig =
    ((siteConfig as any)?.deliveryCompanies as DeliveryCompany[] | undefined) ?? [];

  const deliveryCompanies: DeliveryCompany[] =
    deliveryCompaniesFromConfig.length > 0 ? deliveryCompaniesFromConfig : DEFAULT_DELIVERY_COMPANIES;

  const allWilayas: Array<{ code: string; name: string; communes?: string[] }> =
    checkoutWilayas.length > 0 ? checkoutWilayas : FALLBACK_WILAYAS;

  const [deliveryType, setDeliveryType] = useState<"home" | "office" | "">("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      phone: "",
      wilayaCode: "",
      commune: "",
      address: "",
    },
  });

  const selectedWilayaCode = form.watch("wilayaCode");

  const selectedWilaya = useMemo(
    () => allWilayas.find((w) => w.code === selectedWilayaCode),
    [allWilayas, selectedWilayaCode],
  );

  const communesForSelected: string[] = selectedWilaya?.communes ?? [];

  const availableCompanies = useMemo(() => {
    if (!deliveryType || !selectedWilayaCode) return [];
    const normalizedSelected = normalizeWilayaCode(selectedWilayaCode);
    return deliveryCompanies.filter((c) =>
      c.wilayas.some((w) => normalizeWilayaCode(w) === normalizedSelected),
    );
  }, [deliveryCompanies, deliveryType, selectedWilayaCode]);

  const selectedCompany = useMemo(
    () => availableCompanies.find((c) => c.id === selectedCompanyId) ?? null,
    [availableCompanies, selectedCompanyId],
  );

  const deliveryPrice = useMemo(() => {
    if (!deliveryType || !selectedCompany) return 0;
    if (deliveryType === "home") return selectedCompany.priceHome;
    return selectedCompany.priceOffice;
  }, [deliveryType, selectedCompany]);

  const grandTotal = useMemo(() => total() + deliveryPrice, [total, deliveryPrice]);

  const onSubmit = (data: CheckoutForm) => {
    if (!deliveryType) {
      alert("اختر نوع التوصيل (منزل أو مكتب)");
      return;
    }
    if (!selectedCompany) {
      alert("اختر شركة التوصيل");
      return;
    }

    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const wilayaName = selectedWilaya?.name ?? data.wilayaCode;
    const fullPhone = `+213 ${data.phone.trim()}`;
    const composedAddress = `${data.commune}, ${data.address}`;

    const orderData = {
      customerName: fullName,
      phone: fullPhone,
      wilaya: wilayaName,
      address: composedAddress,
      items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
    };

    // @ts-ignore
    createOrder(orderData, {
      onSuccess: () => {
        setSuccess(true);
        clearCart();
        setTimeout(() => setLocation("/"), 5000);
      },
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-bold font-display mb-4">{t("checkout.success_title")}</h1>
        <p className="text-muted-foreground text-lg max-w-md mb-8">
          {t("checkout.success_desc")}
        </p>
        <Button onClick={() => setLocation("/")}>{t("checkout.back_home")}</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">{t("cart.empty")}</h2>
        <Button onClick={() => setLocation("/products")}>{t("cart.continue_shopping")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-10">
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md md:max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-base md:text-lg font-semibold">Formulaire de demande</h2>
              <button
                onClick={() => setLocation("/products")}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-4 md:p-6 space-y-6">
              <section className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-white p-1 flex-shrink-0">
                  <img
                    src={(() => {
                      const first = items[0];
                      if (!first) return "/logo.jpg";
                      const raw = first.images as unknown;
                      if (Array.isArray(raw)) return raw[0] || "/logo.jpg";
                      if (typeof raw === "string") {
                        const trimmed = raw.trim();
                        if (trimmed.startsWith("[")) {
                          try {
                            const parsed = JSON.parse(trimmed);
                            if (Array.isArray(parsed)) return parsed[0] || "/logo.jpg";
                          } catch {
                          }
                        }
                        return trimmed || "/logo.jpg";
                      }
                      return "/logo.jpg";
                    })()}
                    alt={items[0]?.name || "Product"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm md:text-base">
                    {items.length === 1 ? items[0].name : "Panier de produits"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {items.length === 1
                      ? `Quantité: ${items[0].quantity}`
                      : `${items.length} produits`}
                  </div>
                  <div className="text-sm font-semibold mt-1">
                    {total().toLocaleString()} {t("currency")}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Veuillez saisir vos informations</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom</FormLabel>
                            <FormControl>
                              <Input placeholder="le nom" className="h-11" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom</FormLabel>
                            <FormControl>
                              <Input placeholder="le prénom" className="h-11" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 px-3 h-11 rounded-lg border bg-muted text-sm">
                                <span className="text-lg">🇩🇿</span>
                                <span className="font-medium">+213</span>
                              </div>
                              <Input
                                placeholder="05 55 ..."
                                className="h-11 flex-1"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="wilayaCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wilaya</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedCompanyId(null);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Sélectionner la wilaya" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              {allWilayas.map((w) => (
                                <SelectItem key={w.code} value={w.code}>
                                  {w.code} - {w.name}
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
                      name="commune"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commune</FormLabel>
                          {communesForSelected.length > 0 ? (
                            <>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Sélectionner la commune" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[260px]">
                                  {communesForSelected.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </>
                          ) : (
                            <>
                              <FormControl>
                                <Input
                                  placeholder="Commune"
                                  className="h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse de livraison</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Adresse complète (rue, immeuble, repère...)"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <div className="text-sm font-semibold">Livraison</div>
                      <RadioGroup
                        value={deliveryType}
                        onValueChange={(v) => {
                          setDeliveryType(v as "home" | "office");
                          setSelectedCompanyId(null);
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 cursor-pointer">
                          <RadioGroupItem value="office" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Livraison au bureau</span>
                            <span className="text-xs text-muted-foreground">Récupération au bureau de la société</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 cursor-pointer">
                          <RadioGroupItem value="home" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Livraison à domicile</span>
                            <span className="text-xs text-muted-foreground">Livraison à votre adresse</span>
                          </div>
                        </label>
                      </RadioGroup>
                    </div>

                    {deliveryType && (
                      <div className="space-y-2">
                        <Label>Société de livraison</Label>
                        {selectedWilayaCode ? (
                          availableCompanies.length > 0 ? (
                            <Select
                              value={selectedCompanyId ? String(selectedCompanyId) : undefined}
                              onValueChange={(value) => setSelectedCompanyId(Number(value))}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Choisir société" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCompanies.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}{" "}
                                    {deliveryType === "home"
                                      ? `(${c.priceHome} DA domicile)`
                                      : `(${c.priceOffice} DA bureau)`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-xs text-red-500">
                              Pas de livraison disponible pour cette wilaya.
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Sélectionnez d&apos;abord la wilaya.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Prix du produit</span>
                        <span>
                          {total().toLocaleString()} {t("currency")}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Prix de livraison</span>
                        <span>
                          {deliveryPrice > 0
                            ? `${deliveryPrice.toLocaleString()} ${t("currency")}`
                            : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-bold pt-1">
                        <span>Total</span>
                        <span>
                          {grandTotal.toLocaleString()} {t("currency")}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold rounded-xl bg-black hover:bg-black/90 text-white"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Traitement en cours...
                        </>
                      ) : (
                        <>Acheter maintenant · {grandTotal.toLocaleString()} {t("currency")}</>
                      )}
                    </Button>
                  </form>
                </Form>
              </section>

              <section className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("checkout.order_summary")}</span>
                  <span className="text-xs text-muted-foreground">
                    Paiement à la livraison
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white p-1 flex-shrink-0">
                        <img
                          src={(() => {
                            const raw = item.images as unknown;
                            if (Array.isArray(raw)) return raw[0] || "/logo.jpg";
                            if (typeof raw === "string") {
                              const trimmed = raw.trim();
                              if (trimmed.startsWith("[")) {
                                try {
                                  const parsed = JSON.parse(trimmed);
                                  if (Array.isArray(parsed)) return parsed[0] || "/logo.jpg";
                                } catch {
                                }
                              }
                              return trimmed || "/logo.jpg";
                            }
                            return "/logo.jpg";
                          })()}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {Number(item.price).toLocaleString()} {t("currency")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <div className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
