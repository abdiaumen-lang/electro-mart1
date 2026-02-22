import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { CATEGORIES, type Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight, Zap, ShieldCheck, Truck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSlider } from "@/components/HeroSlider";
import { Footer } from "@/components/Footer";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteConfig } from "@/hooks/use-orders";

export default function Home() {
  const { t, language } = useLanguage();
  const [location] = useLocation();
  const isProductsPage = location.startsWith("/products");
  const queryString = location.includes("?") ? location.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const categoryParam = params.get("category") || undefined;
  const searchParam = params.get("search") || undefined;

  const { data: products, isLoading } = useProducts(
    isProductsPage ? categoryParam : undefined,
    isProductsPage ? searchParam : undefined,
  );
  const { data: siteConfig } = useSiteConfig();
  const lingerieHeroEnabled = siteConfig?.lingerieHeroEnabled === true;
  const lingerieHeroImageUrl = siteConfig?.lingerieHeroImageUrl || "/logo.jpg";
  const lingerieHeroTitle = siteConfig?.lingerieHeroTitle || "Bienvenue chez lingerie dial";
  const lingerieHeroButtonText = siteConfig?.lingerieHeroButtonText || "Acheter maintenant";
  const lingerieHeroButtonLink = siteConfig?.lingerieHeroButtonLink || "/products";
  const featuredProducts = products?.filter(p => p.isFeatured).slice(0, 4) || [];
  const curated = products?.filter((p) => p.isFeatured) ?? [];
  const selectedProducts = (curated.length > 0 ? curated : products ?? []).slice(0, 10);

  const bestSellerProducts = (products ?? [])
    .slice()
    .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
    .slice(0, 10);

  const newArrivalsProducts = (products ?? [])
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.createdAt as unknown as string).getTime();
      const bTime = new Date(b.createdAt as unknown as string).getTime();
      return bTime - aTime;
    })
    .slice(0, 10);
  // const latestProducts = products?.slice(0, 8) || []; // Unused for now

  if (isProductsPage) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
        <Navbar />

        <main className="container max-w-7xl mx-auto px-4 pt-32 pb-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold font-display">{t("home.all_products")}</h1>
              <p className="text-muted-foreground">{t("home.browse_catalog")}</p>
            </div>

            {(categoryParam || searchParam) && (
              <Link href="/products">
                <Button variant="outline" className="border-border/60">
                  {t("home.clear_filters")}
                </Button>
              </Link>
            )}
          </div>

          {(categoryParam || searchParam) && (
            <div className="flex flex-wrap gap-2 mb-6 text-sm">
              {categoryParam && (
                <span className="px-3 py-1 rounded-full bg-secondary/40 border border-border/60">
                  {t("home.category")}: <span className="font-medium">{t(`category.${categoryParam}`)}</span>
                </span>
              )}
              {searchParam && (
                <span className="px-3 py-1 rounded-full bg-secondary/40 border border-border/60">
                  {t("home.search")}: <span className="font-medium">{searchParam}</span>
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-10 text-center">
              <h2 className="text-xl font-bold mb-2">{t("home.no_products")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("home.try_changing")}
              </p>
              <Link href="/products">
                <Button variant="outline" className="border-border/60">
                  {t("home.reset_filters")}
                </Button>
              </Link>
            </div>
          )}
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
      <Navbar />

      {lingerieHeroEnabled ? (
        <section className="pt-24">
          <div className="relative h-[80vh] min-h-[520px] w-full overflow-hidden">
            <img
              src={lingerieHeroImageUrl}
              alt={lingerieHeroTitle}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/70" />
            <div className="relative h-full">
              <div className="container max-w-7xl mx-auto px-4 h-full flex items-center justify-center text-center">
                <div className="max-w-3xl">
                  <h1 className="text-white font-display font-bold text-4xl sm:text-6xl tracking-tight drop-shadow">
                    {lingerieHeroTitle}
                  </h1>
                  <div className="mt-8 flex items-center justify-center">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full px-8 min-h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-black/20"
                    >
                      {lingerieHeroButtonLink.startsWith("/") ? (
                        <Link href={lingerieHeroButtonLink}>
                          <span>{lingerieHeroButtonText}</span>
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      ) : (
                        <a
                          href={lingerieHeroButtonLink}
                          target={lingerieHeroButtonLink.startsWith("http") ? "_blank" : undefined}
                          rel={lingerieHeroButtonLink.startsWith("http") ? "noreferrer" : undefined}
                        >
                          <span>{lingerieHeroButtonText}</span>
                          <ArrowRight className="h-5 w-5" />
                        </a>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="pt-28 pb-10">
          <div className="container max-w-7xl mx-auto px-4">
            <HeroSlider />
          </div>
        </section>
      )}

      {Array.isArray(siteConfig?.homeQuickLinks) && siteConfig.homeQuickLinks.length > 0 && (
        <section className="pb-10">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {siteConfig.homeQuickLinks
                .slice()
                .sort((a: any, b: any) => {
                  const ao = typeof a.sortOrder === "number" ? a.sortOrder : 0;
                  const bo = typeof b.sortOrder === "number" ? b.sortOrder : 0;
                  if (ao !== bo) return ao - bo;
                  return (a.id ?? 0) - (b.id ?? 0);
                })
                .slice(0, 3)
                .map((item: any) => {
                  const label = language === "fr" && item.titleFr ? item.titleFr : item.title;
                  const href = String(item.linkUrl || "");
                  const Chevron = language === "ar" ? ChevronLeft : ChevronRight;
                  const content = (
                    <div className="group flex items-center justify-between gap-4 rounded-3xl bg-foreground/95 text-background px-5 py-5 shadow-xl shadow-black/10 ring-1 ring-black/5 transition-all duration-300 hover:translate-y-[-2px]">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-16 w-16 rounded-2xl bg-background/10 border border-background/15 overflow-hidden grid place-items-center flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt={label}
                            className="h-full w-full object-contain p-2"
                            loading="lazy"
                          />
                        </div>
                        <div className="text-xl font-semibold truncate">{label}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-background/10 border border-background/15 grid place-items-center flex-shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
                        <Chevron className="h-5 w-5 text-background/90" />
                      </div>
                    </div>
                  );

                  if (href.startsWith("/")) {
                    return (
                      <Link key={item.id} href={href}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={item.id}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {content}
                    </a>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="py-12 border-y border-border/60 bg-secondary/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4 p-6 rounded-2xl bg-background border border-border/60">
              <div className="p-3 rounded-xl bg-primary/20 text-primary">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t("feature.fast_delivery")}</h3>
                <p className="text-muted-foreground text-sm">{t("feature.fast_delivery_desc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 rounded-2xl bg-background border border-border/60">
              <div className="p-3 rounded-xl bg-primary/20 text-primary">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t("feature.warranty")}</h3>
                <p className="text-muted-foreground text-sm">{t("feature.warranty_desc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 rounded-2xl bg-background border border-border/60">
              <div className="p-3 rounded-xl bg-primary/20 text-primary">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t("feature.payment")}</h3>
                <p className="text-muted-foreground text-sm">{t("feature.payment_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trends & Suggestions */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-background/70 via-secondary/20 to-background/50 p-6 sm:p-10 shadow-xl shadow-primary/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,122,0,0.14),transparent_58%)]" />
            <div className="relative">
              <Tabs defaultValue="selected" className="w-full">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold font-display">
                      {t("home.trends_title")}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {t("home.trends_subtitle")}
                    </p>
                  </div>

                  <TabsList className="h-auto rounded-full bg-background/35 backdrop-blur-md border border-border/60 p-1 self-start">
                    <TabsTrigger
                      value="selected"
                      className="rounded-full px-4 py-2 text-foreground/80 hover:text-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                    >
                      {t("home.tab_selected")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="best"
                      className="rounded-full px-4 py-2 text-foreground/80 hover:text-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                    >
                      {t("home.tab_best_sellers")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="new"
                      className="rounded-full px-4 py-2 text-foreground/80 hover:text-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                    >
                      {t("home.tab_new")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="selected" className="mt-8">
                  {isLoading ? (
                    <HorizontalSkeletonRow count={4} />
                  ) : (
                    <HorizontalProductsRow products={selectedProducts} />
                  )}
                </TabsContent>

                <TabsContent value="best" className="mt-8">
                  {isLoading ? (
                    <HorizontalSkeletonRow count={4} />
                  ) : (
                    <HorizontalProductsRow products={bestSellerProducts} />
                  )}
                </TabsContent>

                <TabsContent value="new" className="mt-8">
                  {isLoading ? (
                    <HorizontalSkeletonRow count={4} />
                  ) : (
                    <HorizontalProductsRow products={newArrivalsProducts} />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="py-16 bg-secondary/10">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Nos marques
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold font-display text-foreground">
              Que de beaux noms dans le secteur
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-stretch">
            <div className="brand-marquee rounded-3xl border-2 border-primary/40 bg-background/80 px-6 py-6 sm:px-10">
              <div className="brand-track">
                <div className="brand-group">
                  <span className="brand-item text-sm sm:text-base md:text-lg">DYSON</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">NINJA</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">SAMSUNG</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">LG</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">BOSE</span>
                </div>
                <div className="brand-group" aria-hidden="true">
                  <span className="brand-item text-sm sm:text-base md:text-lg">DYSON</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">NINJA</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">SAMSUNG</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">LG</span>
                  <span className="brand-item text-sm sm:text-base md:text-lg">BOSE</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 text-slate-50 px-6 py-8 sm:px-8 flex flex-col items-center justify-center shadow-lg">
              <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-4 text-center sm:text-left">
                  <div className="text-lg sm:text-xl font-semibold tracking-widest uppercase">
                    Dyson
                  </div>
                  <div className="text-lg sm:text-xl font-semibold tracking-widest uppercase">
                    Samsung
                  </div>
                  <div className="text-lg sm:text-xl font-semibold tracking-widest uppercase">
                    Bose
                  </div>
                </div>
                <div className="space-y-4 text-center sm:text-right">
                  <div className="text-lg sm:text-xl font-semibold tracking-widest uppercase">
                    Ninja
                  </div>
                  <div className="text-lg sm:text-xl font-semibold tracking-widest uppercase">
                    LG
                  </div>
                </div>
              </div>
              <div className="mt-6 w-full flex justify-center sm:justify-end">
                <Link
                  href="/products"
                  className="text-sm sm:text-base font-semibold text-orange-500 hover:text-orange-600 underline underline-offset-4"
                >
                  Toutes les marques
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-secondary/20 p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,122,0,0.16),transparent_60%)]" />
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

            <div className="relative">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-bold font-display">
                  {language === "fr"
                    ? siteConfig?.homeCategoriesTitleFr || t("home.top_categories_title")
                    : siteConfig?.homeCategoriesTitle || t("home.top_categories_title")}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {language === "fr"
                    ? siteConfig?.homeCategoriesSubtitleFr || t("home.top_categories_subtitle")
                    : siteConfig?.homeCategoriesSubtitle || t("home.top_categories_subtitle")}
                </p>
              </div>

              <div className="mt-10 flex gap-6 overflow-x-auto pb-6 -mx-2 px-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(siteConfig?.homeCategoryHighlights?.length ? siteConfig.homeCategoryHighlights : null)?.map((item: any, index: number) => {
                  const label = language === "fr" && item.titleFr ? item.titleFr : item.title;
                  const href = String(item.linkUrl || "");
                  const circleClass =
                    index % 4 === 0
                      ? "from-primary/25 to-secondary/20"
                      : index % 4 === 1
                        ? "from-secondary/25 to-primary/15"
                        : index % 4 === 2
                          ? "from-primary/15 to-primary/5"
                          : "from-secondary/20 to-secondary/5";

                  const content = (
                    <div className="flex flex-col items-center">
                      <div className={`relative grid place-items-center h-40 w-40 sm:h-44 sm:w-44 rounded-full bg-gradient-to-b ${circleClass} shadow-2xl shadow-black/10 border border-border/40 transition-transform duration-300 group-hover:scale-[1.02]`}>
                        <div className="absolute inset-0 rounded-full bg-background/10" />
                        <img
                          src={item.imageUrl}
                          alt={label}
                          className="relative h-24 w-24 sm:h-28 sm:w-28 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-4 text-center text-lg font-semibold text-foreground/90">
                        {label}
                      </div>
                    </div>
                  );

                  if (href.startsWith("/")) {
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className="group flex-none snap-start w-[180px] sm:w-[200px]"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={item.id}
                      href={href}
                      className="group flex-none snap-start w-[180px] sm:w-[200px]"
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {content}
                    </a>
                  );
                }) ??
                  CATEGORIES.map((cat, index) => (
                    <Link
                      key={cat}
                      href={`/products?category=${cat}`}
                      className="group flex-none snap-start w-[180px] sm:w-[200px]"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`relative grid place-items-center h-40 w-40 sm:h-44 sm:w-44 rounded-full bg-gradient-to-b ${index % 2 === 0 ? "from-primary/20 to-secondary/10" : "from-secondary/20 to-primary/10"} shadow-2xl shadow-black/10 border border-border/40 transition-transform duration-300 group-hover:scale-[1.02]`}>
                          <div className="text-5xl sm:text-6xl">
                            {cat === "Smartphones" && "📱"}
                            {cat === "Laptops" && "💻"}
                            {cat === "Headphones" && "🎧"}
                            {cat === "Gaming" && "🎮"}
                            {cat === "Accessories" && "🔌"}
                          </div>
                        </div>
                        <div className="mt-4 text-center text-lg font-semibold text-foreground/90">
                          {t(`category.${cat}`)}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-secondary/10">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold">{t("home.featured_products")}</h2>
            <Link href="/products">
              <Button variant="ghost" className="text-primary">{t("home.view_all")} {language === 'ar' ? <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> : <ArrowRight className="w-4 h-4 ml-2" />}</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <ProductSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function getDiscountPercent(product: Product): number {
  if (!product.oldPrice) return 0;
  const oldPrice = Number(product.oldPrice);
  const price = Number(product.price);
  if (!Number.isFinite(oldPrice) || !Number.isFinite(price)) return 0;
  if (oldPrice <= 0 || price <= 0) return 0;
  if (oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function HorizontalProductsRow({ products }: { products: Product[] }) {
  const { t } = useLanguage();

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background/60 p-10 text-center">
        <h3 className="text-lg font-bold">{t("home.suggestions_empty_title")}</h3>
        <p className="text-muted-foreground mt-2">{t("home.suggestions_empty_desc")}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex-none w-[260px] sm:w-[300px] snap-start"
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

function HorizontalSkeletonRow({ count }: { count: number }) {
  return (
    <div className="flex gap-5 overflow-x-hidden pb-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex-none w-[260px] sm:w-[300px]">
          <ProductSkeleton />
        </div>
      ))}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/60 h-[350px]">
      <Skeleton className="w-full h-[200px]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-2 flex justify-between">
          <Skeleton className="h-6 w-1/3" />
        </div>
      </div>
    </div>
  );
}
