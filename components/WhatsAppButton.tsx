import { FaWhatsapp } from "react-icons/fa";
import { useLanguage } from "@/hooks/use-language";

export function WhatsAppButton() {
  const { t } = useLanguage();
  // Replace with actual phone number if provided, or use a placeholder
  const phoneNumber = "+213770061612";
  const message = encodeURIComponent(t("whatsapp.message"));
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 animate-in fade-in zoom-in"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp className="w-8 h-8" />
    </a>
  );
}
