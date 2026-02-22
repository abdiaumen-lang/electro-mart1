import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, User, Search, X, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { useUser } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useSiteConfig } from "@/hooks/use-orders";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { items, toggleCart } = useCart();
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { language: lang, setLanguage: setLang, t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { data: siteConfig } = useSiteConfig();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Live Search Query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search-products", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: search.trim().length > 0
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".search-container")) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderSearchResults = () => {
    if (!search.trim() || !isSearchFocused) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 ring-1 ring-black/5">
        {isSearching ? (
          <div className="p-6 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="flex flex-col">
            {searchResults.map((product: any) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="flex items-center gap-4 p-3 hover:bg-secondary/50 transition-all duration-200 border-b last:border-0 border-border/50 group"
                onClick={() => {
                  setSearch("");
                  setIsSearchFocused(false);
                }}
              >
                <div className="w-12 h-12 rounded-lg bg-white border border-border/50 overflow-hidden flex-shrink-0 shadow-sm">
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors ${lang === "ar" ? "text-right" : "text-left"}`}>
                    {product.name}
                  </span>
                  <span className={`text-xs text-muted-foreground truncate ${lang === "ar" ? "text-right" : "text-left"}`}>
                    {product.category}
                  </span>
                </div>
                <div className="text-primary font-bold text-sm whitespace-nowrap bg-primary/5 px-2 py-1 rounded-md">
                  {product.price.toLocaleString()} DZD
                </div>
              </Link>
            ))}
            <div
              className="p-3 text-center bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors text-xs font-bold text-primary flex items-center justify-center gap-2"
              onClick={(e) => {
                if (search.trim()) {
                  setLocation(`/products?search=${encodeURIComponent(search)}`);
                }
                setIsSearchFocused(false);
              }}
            >
              <Search className="w-3 h-3" />
              {t("nav.view_all")}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center gap-3 text-muted-foreground bg-secondary/10">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
              <Search className="w-6 h-6 opacity-40" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-foreground">
                {t("nav.no_results")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("nav.try_another")}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false); // Hide on scroll down
      } else {
        setIsVisible(true); // Show on scroll up
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/products?search=${encodeURIComponent(search)}`);
      setIsSearchFocused(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <AnnouncementBar siteConfig={siteConfig} lang={lang} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ================= DESKTOP LAYOUT (md:flex) ================= */}
        <div className="hidden md:flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 group cursor-pointer select-none">
            <span className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 text-primary font-black text-xl tracking-tight shadow-lg shadow-primary/10 transition-transform duration-300 group-hover:scale-105">
              e
            </span>
            <span className="font-display text-2xl font-black tracking-tight leading-none">
              <span className="text-foreground">Electro</span>
              <span className="text-primary">Mart</span>
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative group search-container">
              <Input
                value={search}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("nav.search_placeholder_desktop")}
                dir={lang === "ar" ? "rtl" : "ltr"}
                className={`bg-secondary/50 border-transparent focus:border-primary/50 focus:bg-secondary rounded-full transition-all font-medium ${lang === "ar" ? "text-right pr-12 pl-4" : "text-left pl-12 pr-4"}`}
              />
              <Search className={`absolute ${lang === "ar" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors`} />
              {renderSearchResults()}
            </form>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-4">
            {/* Language Switcher (Desktop) */}
            <div className="flex items-center gap-2 mr-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div className="flex text-xs font-medium border rounded-md overflow-hidden">
                <button
                  onClick={() => setLang("ar")}
                  className={`px-2 py-1 transition-colors ${lang === "ar" ? "bg-primary text-white" : "bg-transparent text-muted-foreground hover:bg-secondary"}`}
                >
                  AR
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={() => setLang("fr")}
                  className={`px-2 py-1 transition-colors ${lang === "fr" ? "bg-primary text-white" : "bg-transparent text-muted-foreground hover:bg-secondary"}`}
                >
                  FR
                </button>
              </div>
            </div>

            {user ? (
              <Link href="/admin">
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{t("nav.dashboard")}</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="icon"
              className="relative rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-colors"
              onClick={toggleCart}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-primary/20 animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ================= MOBILE LAYOUT (md:hidden) ================= */}
        <div className="md:hidden flex flex-col gap-3 py-3">
          {/* Row 1: Logo + User/Cart Actions */}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 select-none">
              <span className="grid place-items-center h-10 w-10 rounded-2xl bg-primary/10 border border-primary/30 text-primary font-black text-lg tracking-tight shadow-md shadow-primary/10">
                e
              </span>
              <span className="font-display text-xl font-black tracking-tight leading-none">
                <span className="text-foreground">Electro</span>
                <span className="text-primary">Mart</span>
              </span>
            </Link>

            {/* Top Right Actions */}
            <div className="flex items-center gap-5">
              {/* User Action */}
              <Link href={user ? "/admin" : "/login"} className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors">
                <User className="w-6 h-6" />
                <span className="text-[11px] font-bold tracking-wide">{user ? t("nav.account") : t("nav.register")}</span>
              </Link>

              {/* Cart Action */}
              <div onClick={toggleCart} className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors relative">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold tracking-wide">{t("nav.cart")}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Menu + Search */}
          <div className="flex items-center gap-3">
            {/* Menu Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <div className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary cursor-pointer min-w-[40px]">
                  <Menu className="w-6 h-6" />
                  <span className="text-[11px] font-bold tracking-wide">{t("nav.menu")}</span>
                </div>
              </SheetTrigger>
              <SheetContent side={lang === "ar" ? "right" : "left"} className="w-[300px]">
                <div className="flex flex-col h-full">
                  <div className="flex flex-col gap-6 mt-10 flex-1">
                    <Link href="/" className={`text-lg font-medium hover:text-primary transition-colors ${lang === "ar" ? "text-right" : "text-left"}`}>{t("nav.home")}</Link>
                    <Link href="/products" className={`text-lg font-medium hover:text-primary transition-colors ${lang === "ar" ? "text-right" : "text-left"}`}>{t("nav.all_products")}</Link>
                    <Link href="/products?category=Smartphones" className={`text-lg font-medium hover:text-primary transition-colors ${lang === "ar" ? "text-right" : "text-left"}`}>{t("nav.smartphones")}</Link>
                    <Link href="/products?category=Laptops" className={`text-lg font-medium hover:text-primary transition-colors ${lang === "ar" ? "text-right" : "text-left"}`}>{t("nav.laptops")}</Link>
                    <div className="h-px bg-border" />
                    {user ? (
                      <Link href="/admin" className={`text-lg font-medium text-primary ${lang === "ar" ? "text-right" : "text-left"}`}>{t("nav.dashboard")}</Link>
                    ) : (
                      <Link href="/login" className={`text-lg font-medium hover:text-primary transition-colors ${lang === "ar" ? "text-right" : "text-left"}`}>{t("nav.login")}</Link>
                    )}
                  </div>

                  {/* Language Switcher in Mobile Menu */}
                  <div className="mt-auto border-t pt-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-5 h-5" />
                        <span className="font-medium">{t("nav.language")}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={lang === "ar" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLang("ar")}
                          className="text-xs h-8"
                        >
                          العربية
                        </Button>
                        <Button
                          variant={lang === "fr" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLang("fr")}
                          className="text-xs h-8"
                        >
                          Français
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 relative search-container">
              <Input
                value={search}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("nav.search_placeholder")}
                dir={lang === "ar" ? "rtl" : "ltr"}
                className={`w-full bg-secondary/50 border-transparent focus:border-primary/50 focus:bg-white rounded-full ${lang === "ar" ? "pl-4 pr-10 text-right placeholder:text-right" : "pl-10 pr-4 text-left placeholder:text-left"} h-10 transition-all font-medium`}
              />
              <Search className={`absolute ${lang === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4`} />
              {renderSearchResults()}
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}

function AnnouncementBar({
  siteConfig,
  lang,
}: {
  siteConfig: any;
  lang: "ar" | "fr";
}) {
  const enabled = siteConfig?.announcementEnabled ?? true;
  const speedSeconds =
    typeof siteConfig?.announcementSpeedSeconds === "number"
      ? siteConfig.announcementSpeedSeconds
      : 32;

  const defaultItems = [
    { id: 1, text: "🚚 Electro Mart delivers to all 58 states in Algeria", textFr: "🚚 Electro Mart livre dans les 58 wilayas en Algérie", sortOrder: 1 },
    { id: 2, text: "⭐ Electro Mart offers the best European products", textFr: "⭐ Electro Mart propose les meilleurs produits européens", sortOrder: 2 },
    { id: 3, text: "🔥 Electro Mart provides the best offers and prices", textFr: "🔥 Electro Mart propose les meilleures offres et prix", sortOrder: 3 },
    { id: 4, text: "📞 Customer Service Phone Number: +213 XX XX XX XX", textFr: "📞 Service client : +213 XX XX XX XX", sortOrder: 4 },
    { id: 5, text: "💳 Payment on delivery available", textFr: "💳 Paiement à la livraison disponible", sortOrder: 5 },
    { id: 6, text: "🚀 Fast delivery service", textFr: "🚀 Livraison rapide", sortOrder: 6 },
  ];

  const rawItems = Array.isArray(siteConfig?.announcementItems) && siteConfig.announcementItems.length > 0
    ? siteConfig.announcementItems
    : defaultItems;

  const items = rawItems
    .slice()
    .sort((a: any, b: any) => {
      const ao = typeof a.sortOrder === "number" ? a.sortOrder : 0;
      const bo = typeof b.sortOrder === "number" ? b.sortOrder : 0;
      if (ao !== bo) return ao - bo;
      return (a.id ?? 0) - (b.id ?? 0);
    })
    .map((it: any) => {
      const primary = String(it?.text ?? "");
      const secondary = String(it?.textFr ?? "");
      const value = lang === "fr" ? (secondary || primary) : (primary || secondary);
      return { id: it.id ?? Math.random(), value };
    })
    .filter((it: any) => it.value.trim().length > 0);

  if (!enabled || items.length === 0) return null;

  return (
    <div
      className="announcement-bar"
      style={{ ["--announcement-duration" as any]: `${Math.max(8, Math.min(60, speedSeconds))}s` }}
    >
      <div className="announcement-sheen" aria-hidden="true" />
      <div className="announcement-track">
        <div className="announcement-group">
          {items.map((it: any, idx: number) => (
            <span key={it.id} className="inline-flex items-center gap-3">
              <span className="announcement-item">{it.value}</span>
              {idx !== items.length - 1 && <span className="announcement-sep" />}
            </span>
          ))}
        </div>
        <div className="announcement-group" aria-hidden="true">
          {items.map((it: any, idx: number) => (
            <span key={`dup-${it.id}`} className="inline-flex items-center gap-3">
              <span className="announcement-item">{it.value}</span>
              {idx !== items.length - 1 && <span className="announcement-sep" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
