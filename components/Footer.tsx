import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-secondary/30 border-t border-border/60 py-12">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold font-display mb-4">Electro<span className="text-primary">Mart</span></h3>
            <p className="text-muted-foreground max-w-sm">
              {t("footer.description")}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">{t("footer.links")}</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary">{t("home.all_products")}</Link></li>
              <li><Link href="/products?category=Gaming" className="hover:text-primary">{t("category.Gaming")}</Link></li>
              <li><Link href="/login" className="hover:text-primary">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>{t("footer.algiers")}</li>
              <li>+213 555 123 456</li>
              <li>support@electromart.dz</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60 mt-12 pt-8 text-center text-sm text-muted-foreground">
          © 2024 ElectroMart. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
