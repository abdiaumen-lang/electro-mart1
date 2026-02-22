import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useSlides } from "@/hooks/use-slides";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowRight, MessageCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";

function isInternalLink(href: string) {
  return href.startsWith("/");
}

export function HeroSlider() {
  const { data: slides, isLoading } = useSlides();
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const normalized = useMemo(() => {
    return (slides ?? []).filter((s) => s.imageUrl);
  }, [slides]);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => {
      if (normalized.length === 0) return 0;
      return (prev + 1) % normalized.length;
    });
  }, [normalized.length]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => {
      if (normalized.length === 0) return 0;
      return (prev - 1 + normalized.length) % normalized.length;
    });
  }, [normalized.length]);

  useEffect(() => {
    if (normalized.length <= 1) return;
    const id = window.setInterval(nextSlide, 7000);
    return () => window.clearInterval(id);
  }, [nextSlide, normalized.length]);

  if (isLoading) {
    return (
      <section className="w-full">
        <div className="relative w-full overflow-hidden rounded-[20px] border border-border/60 bg-white shadow-lg">
          <Skeleton className="h-[350px] md:h-[500px] w-full" />
        </div>
      </section>
    );
  }

  if (normalized.length === 0) return null;

  const currentSlide = normalized[activeIndex];
  const baseTitle = currentSlide.title || "Electro Mart";
  const baseSubtitle = currentSlide.subtitle || "Meilleurs produits électroménagers en Algérie";
  const title = language === "fr" ? currentSlide.titleFr || baseTitle : baseTitle;
  const subtitle = language === "fr" ? currentSlide.subtitleFr || baseSubtitle : baseSubtitle;
  const buttonTextBase = currentSlide.buttonText || "Voir Produits";
  const buttonText = language === "fr" ? currentSlide.buttonTextFr || buttonTextBase : buttonTextBase;
  const href = currentSlide.linkUrl || "/products";
  const isInternal = Boolean(href && isInternalLink(href));

  const whatsappText = "WhatsApp";
  const whatsappHref = "https://wa.me/213000000000";

  return (
    <section className="w-full">
      <div className="relative w-full overflow-hidden rounded-[20px] border border-border/60 bg-background shadow-lg min-h-[360px] sm:min-h-[420px] md:min-h-[520px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0"
          >
            <img
              src={currentSlide.imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/40" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full flex items-center">
          <div className="w-full px-6 sm:px-10 py-10">
            <div className="max-w-xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="mt-3 text-sm sm:text-base md:text-lg text-slate-700 max-w-md">
                {subtitle}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center sm:items-stretch gap-3">
                {href && (
                  isInternal ? (
                    <Link href={href}>
                      <Button className="rounded-full px-6 h-11 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white">
                        {buttonText}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <a href={href} target="_blank" rel="noreferrer">
                      <Button className="rounded-full px-6 h-11 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white">
                        {buttonText}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  )
                )}
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <Button
                    variant="outline"
                    className="rounded-full px-6 h-11 text-sm sm:text-base border-orange-500 text-orange-500 bg-white/90 hover:bg-orange-50"
                  >
                    {whatsappText}
                    <MessageCircle className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {normalized.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <button
                type="button"
                onClick={prevSlide}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 text-slate-700 shadow-sm border border-slate-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                type="button"
                onClick={nextSlide}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 text-slate-700 shadow-sm border border-slate-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {normalized.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 rounded-full transition-all ${idx === activeIndex ? "w-8 bg-orange-500" : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
