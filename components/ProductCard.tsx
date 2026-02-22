import { Product } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

function getProductDiscountPercent(product: Product): number {
  if (!product.oldPrice) return 0;
  const oldPrice = Number(product.oldPrice);
  const price = Number(product.price);
  if (!Number.isFinite(oldPrice) || !Number.isFinite(price)) return 0;
  if (oldPrice <= 0 || price <= 0) return 0;
  if (oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { t, language } = useLanguage();
  // Drizzle automatically parses JSON columns, so we just cast it
  const images = (product.images as string[]) || [];
  const mainImage = images[0] || "client/public/Red Modern Store Logo_20260220_065202_٠٠٠٠.png";

  const name = language === 'fr' && product.nameFr ? product.nameFr : product.name;
  const discountPercent = getProductDiscountPercent(product);

  return (
    <div className="group relative bg-background rounded-2xl overflow-hidden border border-border/60 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
      {/* Image Container */}
      <div className="aspect-square p-6 relative bg-white flex items-center justify-center overflow-hidden">
        {product.isFeatured && (
          <Badge className="absolute top-3 left-3 bg-primary hover:bg-primary z-10">
            {t("product.featured")}
          </Badge>
        )}
        {product.oldPrice && (
          <Badge variant="destructive" className="absolute top-3 right-3 z-10">
            {discountPercent > 0 ? `-${discountPercent}%` : t("product.sale")}
          </Badge>
        )}

        <Link href={`/product/${product.id}`}>
          <img
            src={mainImage}
            alt={name}
            className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
          />
        </Link>

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-white text-black hover:bg-white/90"
            onClick={() => addItem(product)}
            title={t("product.add_to_cart")}
          >
            <ShoppingCart className="w-5 h-5" />
          </Button>
          <Link href={`/product/${product.id}`}>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-white text-black hover:bg-white/90"
              title={t("product.view_details")}
            >
              <Eye className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-card border-t border-border/10">
        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
          {t(`category.${product.category}`)}
        </div>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-bold text-lg leading-tight mb-2 truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>

        <div className="flex items-end justify-between mt-3">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-sm text-muted-foreground line-through decoration-destructive decoration-2">
                {Number(product.oldPrice).toLocaleString()}
              </span>
            )}
            <span className="text-xl font-bold text-primary">
              {Number(product.price).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{t("currency")}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
