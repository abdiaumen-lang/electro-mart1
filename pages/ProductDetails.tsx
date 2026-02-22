import { useRoute } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ShoppingCart, Check, Shield, Truck, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { Footer } from "@/components/Footer";

export default function ProductDetails() {
  const [match, params] = useRoute("/product/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: product, isLoading, isError } = useProduct(id);
  const { addItem } = useCart();
  const { t, language } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading) return <DetailsSkeleton />;
  if (isError || !product) return <div className="text-center pt-40">{t("nav.no_results")}</div>;

  // Drizzle automatically parses JSON columns
  const images = (product.images as string[]) || [];
  const specs = (product.specifications as Record<string, string>) || {};

  const name = language === 'fr' && product.nameFr ? product.nameFr : product.name;
  const description = language === 'fr' && product.descriptionFr ? product.descriptionFr : product.description;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="container max-w-7xl mx-auto px-4 pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-3xl p-8 flex items-center justify-center border border-border/60 relative overflow-hidden">
              <img
                src={images[selectedImage] || "/logo.jpg"}
                alt={name}
                className="w-full h-full object-contain mix-blend-multiply"
              />
              {product.isFeatured && (
                <Badge className="absolute top-4 left-4 bg-primary px-3 py-1 text-sm">{t("product.featured")}</Badge>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    "w-20 h-20 rounded-xl bg-white p-2 border-2 transition-all flex-shrink-0",
                    selectedImage === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-8">
            <div>
              <div className="text-primary font-bold mb-2 uppercase tracking-wide text-sm">
                {t(`category.${product.category}`)}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight mb-4">
                {name}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-secondary/30 border border-border/60 space-y-6">
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold text-foreground">
                  {Number(product.price).toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{t("currency")}</span>
                </span>
                {product.oldPrice && (
                  <span className="text-xl text-muted-foreground line-through decoration-destructive decoration-2">
                    {Number(product.oldPrice).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="flex-1 h-14 text-lg rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  onClick={() => addItem(product)}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {t("product.add_to_cart")}
                </Button>

                {/* WhatsApp Order Button */}
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1 h-14 text-lg rounded-xl border border-border/60 hover:bg-background"
                  asChild
                >
                  <a
                    href={`https://wa.me/213555123456?text=${encodeURIComponent(`Hi, I'm interested in ${name}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Phone className="w-5 h-5 mr-2 text-green-500" />
                    {t("product.order_whatsapp")}
                  </a>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> {t("product.in_stock")}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> {t("product.warranty_1year")}
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> {t("product.express_delivery")}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">?</div> {t("product.support_24_7")}
                </div>
              </div>
            </div>

            {/* Specs */}
            {Object.keys(specs).length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4">{t("product.specifications")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-border/60 pb-2">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="min-h-screen pt-32 px-4 container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
