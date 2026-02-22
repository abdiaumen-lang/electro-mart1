import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

import { useLanguage } from "@/hooks/use-language";

export function CartSheet() {
  const { isOpen, toggleCart, items, updateQuantity, removeItem, total } = useCart();
  const { t } = useLanguage();

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l border-border/50">
        <SheetHeader className="px-6 py-6 border-b border-border/50">
          <SheetTitle className="text-2xl font-display font-bold">{t("cart.title")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <ShoppingCartIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">{t("cart.empty")}</h3>
              <p className="text-muted-foreground">{t("cart.empty_desc")}</p>
              <Button onClick={toggleCart} variant="outline" className="mt-4">
                {t("cart.continue_shopping")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-white p-2 border border-border/50 flex-shrink-0">
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
                            } catch { }
                          }
                          return trimmed || "/logo.jpg";
                        }
                        return "/logo.jpg";
                      })()}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold line-clamp-1">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-primary">
                        {Number(item.price).toLocaleString()} <span className="text-xs">{t("currency")}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-background rounded-md transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-background rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="self-start text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <div className="p-6 bg-secondary/20 border-t border-border/50 space-y-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("cart.subtotal")}</span>
              <span>{total().toLocaleString()} {t("currency")}</span>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between text-xl font-bold">
              <span>{t("cart.total")}</span>
              <span className="text-primary">{total().toLocaleString()} {t("currency")}</span>
            </div>
            <Link href="/checkout" onClick={toggleCart}>
              <Button className="w-full h-12 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                {t("cart.checkout")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
