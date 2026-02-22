import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Language = "fr" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<Language, string>> = {
  // Hero Badges
  "hero.badge1_small": { fr: "Premium", ar: "ممتاز" },
  "hero.badge1_large": { fr: "Qualité Assurée", ar: "جودة مضمونة" },
  "hero.badge2_small": { fr: "Sécurisé", ar: "آمن" },
  "hero.badge2_large": { fr: "Garantie Officielle", ar: "ضمان رسمي" },
  "hero.shop_now": { fr: "Acheter maintenant", ar: "تسوق الآن" },
  "hero.trust_delivery": { fr: "Livraison dans 58 wilayas", ar: "توصيل إلى 58 ولاية" },
  "hero.trust_cod": { fr: "Paiement à la livraison", ar: "الدفع عند الاستلام" },
  "hero.trust_fast": { fr: "Livraison rapide", ar: "توصيل سريع" },
  "hero.trust_original": { fr: "Produits originaux", ar: "منتجات أصلية" },

  // Navbar
  "nav.home": { fr: "Accueil", ar: "الرئيسية" },
  "nav.all_products": { fr: "Tous les produits", ar: "جميع المنتجات" },
  "nav.smartphones": { fr: "Smartphones", ar: "هواتف ذكية" },
  "nav.laptops": { fr: "Ordinateurs portables", ar: "لابتوبات" },
  "nav.dashboard": { fr: "Tableau de bord", ar: "لوحة التحكم" },
  "nav.login": { fr: "Connexion", ar: "تسجيل الدخول" },
  "nav.register": { fr: "Connexion", ar: "تسجيل" }, // Short version for mobile
  "nav.account": { fr: "Compte", ar: "حسابي" },
  "nav.cart": { fr: "Panier", ar: "السلة" },
  "nav.menu": { fr: "Menu", ar: "القائمة" },
  "nav.search_placeholder": { fr: "Rechercher...", ar: "بحث عن منتج..." },
  "nav.search_placeholder_desktop": { fr: "Rechercher des produits...", ar: "ابحث عن المنتجات..." },
  "nav.language": { fr: "Langue", ar: "اللغة" },
  "nav.no_results": { fr: "Aucun résultat", ar: "لا توجد نتائج" },
  "nav.try_another": { fr: "Essayez un autre mot-clé", ar: "جرب البحث بكلمة أخرى" },
  "nav.view_all": { fr: "Voir tous les résultats", ar: "عرض جميع النتائج" },

  // General
  "currency": { fr: "DZD", ar: "د.ج" },

  // Categories
  "category.Smartphones": { fr: "Smartphones", ar: "هواتف ذكية" },
  "category.Laptops": { fr: "Ordinateurs portables", ar: "لابتوبات" },
  "category.Headphones": { fr: "Écouteurs", ar: "سماعات" },
  "category.Gaming": { fr: "Gaming", ar: "ألعاب" },
  "category.Accessories": { fr: "Accessoires", ar: "إكسسوارات" },

  // Home
  "home.all_products": { fr: "Tous les produits", ar: "جميع المنتجات" },
  "home.browse_catalog": { fr: "Parcourez notre catalogue complet", ar: "تصفح الكتالوج الكامل" },
  "home.clear_filters": { fr: "Effacer les filtres", ar: "مسح الفلاتر" },
  "home.category": { fr: "Catégorie", ar: "الفئة" },
  "home.search": { fr: "Recherche", ar: "بحث" },
  "home.no_products": { fr: "Aucun produit trouvé", ar: "لم يتم العثور على منتجات" },
  "home.try_changing": { fr: "Essayez de changer la catégorie ou le terme de recherche.", ar: "حاول تغيير الفئة أو مصطلح البحث." },
  "home.reset_filters": { fr: "Réinitialiser les filtres", ar: "إعادة تعيين الفلاتر" },
  "home.shop_by_category": { fr: "Acheter par catégorie", ar: "تسوق حسب الفئة" },
  "home.featured_products": { fr: "Produits en vedette", ar: "منتجات مميزة" },
  "home.view_all": { fr: "Voir tout", ar: "عرض الكل" },
  "home.trends_title": { fr: "Tendances & suggestions", ar: "الترندات والاقتراحات" },
  "home.trends_subtitle": { fr: "Nouvelles passions en vue", ar: "اقتراحات مختارة تناسبك" },
  "home.tab_selected": { fr: "Sélectionnés pour vous", ar: "مختارات لك" },
  "home.tab_best_sellers": { fr: "Meilleures ventes", ar: "الأكثر مبيعًا" },
  "home.tab_new": { fr: "Nouveautés", ar: "الجديد" },
  "home.suggestions_empty_title": { fr: "Aucun produit à afficher", ar: "لا توجد منتجات للعرض" },
  "home.suggestions_empty_desc": { fr: "Ajoutez des produits ou activez les produits en vedette.", ar: "أضف منتجات أو فعّل منتجات مميزة." },
  "home.top_categories_title": { fr: "Les tops catégories", ar: "أفضل الفئات" },
  "home.top_categories_subtitle": { fr: "méritent largement le détour", ar: "تستحق التجربة فعلاً" },

  // Features
  "feature.fast_delivery": { fr: "Livraison Rapide", ar: "توصيل سريع" },
  "feature.fast_delivery_desc": { fr: "Sous 48 heures dans 58 Wilayas", ar: "خلال 48 ساعة عبر 58 ولاية" },
  "feature.warranty": { fr: "Garantie Officielle", ar: "ضمان رسمي" },
  "feature.warranty_desc": { fr: "Garantie de 12 mois sur tous les produits", ar: "ضمان لمدة 12 شهرًا على جميع المنتجات" },
  "feature.payment": { fr: "Paiement à la livraison", ar: "الدفع عند الاستلام" },
  "feature.payment_desc": { fr: "Inspectez votre article avant de payer", ar: "افحص منتجك قبل الدفع" },

  // Product Card
  "product.sale": { fr: "Promo", ar: "تخفيض" },
  "product.featured": { fr: "En vedette", ar: "مميز" },
  "product.new": { fr: "Nouveau", ar: "جديد" },
  "product.add_to_cart": { fr: "Ajouter au panier", ar: "أضف إلى السلة" },
  "product.view_details": { fr: "Voir les détails", ar: "عرض التفاصيل" },

  // Product Details
  "product.in_stock": { fr: "En stock", ar: "متوفر" },
  "product.warranty_1year": { fr: "Garantie 1 an", ar: "ضمان لمدة سنة" },
  "product.express_delivery": { fr: "Livraison Express", ar: "توصيل سريع" },
  "product.support_24_7": { fr: "Support 24/7", ar: "دعم فني 24/7" },
  "product.specifications": { fr: "Spécifications", ar: "المواصفات" },
  "product.order_whatsapp": { fr: "Commander via WhatsApp", ar: "اطلب عبر واتساب" },

  // Footer
  "footer.description": { fr: "La première destination pour l'électronique haut de gamme en Algérie. Qualité, rapidité et confiance sont nos valeurs fondamentales.", ar: "الوجهة الأولى للإلكترونيات الراقية في الجزائر. الجودة والسرعة والثقة هي قيمنا الأساسية." },
  "footer.links": { fr: "Liens", ar: "روابط" },
  "footer.contact": { fr: "Contact", ar: "اتصل بنا" },
  "footer.rights": { fr: "Tous droits réservés.", ar: "جميع الحقوق محفوظة." },
  "footer.algiers": { fr: "Alger, Algérie", ar: "الجزائر العاصمة، الجزائر" },

  // Cart
  "cart.title": { fr: "Votre Panier", ar: "سلة المشتريات" },
  "cart.empty": { fr: "Votre panier est vide", ar: "سلة المشتريات فارغة" },
  "cart.empty_desc": { fr: "Il semble que vous n'ayez rien ajouté pour le moment.", ar: "يبدو أنك لم تضف أي شيء بعد." },
  "cart.continue_shopping": { fr: "Continuer vos achats", ar: "مواصلة التسوق" },
  "cart.subtotal": { fr: "Sous-total", ar: "المجموع الفرعي" },
  "cart.total": { fr: "Total", ar: "الإجمالي" },
  "cart.checkout": { fr: "Commander", ar: "إتمام الطلب" },

  // Checkout
  "checkout.title": { fr: "Validation de la commande", ar: "إتمام الطلب" },
  "checkout.delivery_info": { fr: "Informations de livraison", ar: "معلومات التوصيل" },
  "checkout.success_title": { fr: "Commande confirmée !", ar: "تم تأكيد الطلب!" },
  "checkout.success_desc": { fr: "Merci pour votre achat. Nous vous appellerons bientôt pour confirmer la livraison.", ar: "شكراً لشرائك. سنتصل بك قريباً لتأكيد تفاصيل التوصيل." },
  "checkout.back_home": { fr: "Retour à l'accueil", ar: "العودة للرئيسية" },
  "checkout.name": { fr: "Nom complet", ar: "الاسم الكامل" },
  "checkout.phone": { fr: "Numéro de téléphone", ar: "رقم الهاتف" },
  "checkout.wilaya": { fr: "Wilaya", ar: "الولاية" },
  "checkout.select_wilaya": { fr: "Sélectionnez votre wilaya", ar: "اختر ولايتك" },
  "checkout.address": { fr: "Adresse complète", ar: "العنوان الكامل" },
  "checkout.order_summary": { fr: "Résumé de la commande", ar: "ملخص الطلب" },
  "checkout.place_order": { fr: "Confirmer la commande", ar: "تأكيد الطلب" },
  "checkout.processing": { fr: "Traitement...", ar: "جاري المعالجة..." },
  "checkout.delivery": { fr: "Livraison", ar: "التوصيل" },
  "checkout.error_name": { fr: "Le nom est requis", ar: "الاسم مطلوب" },
  "checkout.error_phone": { fr: "Un numéro de téléphone valide est requis", ar: "رقم هاتف صحيح مطلوب" },
  "checkout.error_wilaya": { fr: "Veuillez sélectionner une wilaya", ar: "يرجى اختيار الولاية" },
  "checkout.error_address": { fr: "L'adresse complète est requise", ar: "العنوان الكامل مطلوب" },

  // Login
  "login.admin_login": { fr: "Connexion Admin", ar: "دخول المشرف" },
  "login.first_run": { fr: "Si c'est la première exécution : Cliquez sur Configuration Admin et définissez le nom d'utilisateur et le mot de passe", ar: "إذا كان هذا أول تشغيل: اضغط إعداد الأدمن وحدد اسم المستخدم وكلمة المرور" },
  "login.setup_admin": { fr: "Configuration Admin", ar: "إعداد الأدمن" },
  "login.then_login": { fr: "Puis connectez-vous", ar: "ثم سجّل دخولك" },
  "login.username": { fr: "Nom d'utilisateur", ar: "اسم المستخدم" },
  "login.password": { fr: "Mot de passe", ar: "كلمة المرور" },
  "login.sign_in": { fr: "Se connecter", ar: "تسجيل الدخول" },
  "login.setup_failed": { fr: "Échec de la configuration", ar: "فشل الإعداد" },

  // WhatsApp
  "whatsapp.message": { fr: "Bonjour, j'ai une question sur vos produits.", ar: "مرحباً، لدي استفسار بخصوص منتجاتكم." },

  // Not Found
  "not_found.title": { fr: "Page non trouvée", ar: "الصفحة غير موجودة" },
  "not_found.desc": { fr: "Désolé, la page que vous recherchez n'existe pas.", ar: "عذراً، الصفحة التي تبحث عنها غير موجودة." },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to French as requested
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    // Check if user has a saved preference
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang && (savedLang === "fr" || savedLang === "ar")) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  };

  // Initialize document attributes on mount
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  const value = {
    language,
    setLanguage,
    t,
    dir: (language === "ar" ? "rtl" : "ltr") as "ltr" | "rtl",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
