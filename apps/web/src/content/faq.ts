import type { Settings } from "@momento/shared";
import { formatNpr } from "@/lib/format";
import type { FaqItem } from "@/lib/jsonld";
import { DELIVERY } from "@/lib/site";

export const HOW_IT_WORKS_STEPS = [
  {
    title: "Choose your keepsake",
    text: "Pick a photo book, frame, magnet or canvas and the size you want.",
  },
  {
    title: "Send your photos",
    text: "Share them on WhatsApp. We check quality, and you approve the layout.",
  },
  {
    title: "We print and deliver",
    text: "Pay by eSewa, Khalti or bank once we confirm. Your order arrives at your door.",
  },
] as const;

/** Site-wide questions, written the way people ask them so answer engines can quote them. */
export function siteFaqs(settings: Settings): FaqItem[] {
  const { insideValley, outsideValley, freeDeliveryThreshold } = settings.deliveryFees;
  const free =
    freeDeliveryThreshold !== undefined
      ? ` Orders of ${formatNpr(freeDeliveryThreshold)} or more get free delivery.`
      : "";
  return [
    {
      question: "How do I order from Momento?",
      answer:
        "Choose a product, add it to your cart and check out with your name, phone number and address. Your order is saved with a unique code and opens WhatsApp with a ready-made message. Send it, share your photos, and we confirm the details and price with you.",
    },
    {
      question: "How long does delivery take?",
      answer: `We deliver ${DELIVERY.insideValley} and ${DELIVERY.outsideValley}. We confirm the exact date on WhatsApp when you approve your layout.`,
    },
    {
      question: "How much does delivery cost?",
      answer: `Delivery inside Kathmandu Valley costs ${formatNpr(insideValley)} and outside the valley ${formatNpr(outsideValley)}.${free}`,
    },
    {
      question: "How do I pay?",
      answer:
        "You pay after we confirm your order, by eSewa, Khalti or bank transfer. We do not take card payments online. Once we see your payment we mark your order as paid and start printing.",
    },
    {
      question: "Can I track my order?",
      answer:
        "Yes. Use the order code from your confirmation and the phone number you ordered with on the track your order page. It shows each stage from received to delivered.",
    },
    {
      question: "What if my print is damaged or wrong?",
      answer:
        "Message us on WhatsApp with a photo. If a print is misprinted or arrives damaged, we reprint it free.",
    },
    {
      question: "How should I send my photos?",
      answer:
        "Send them on WhatsApp as documents, not as photo messages, so they keep their original quality. You can also upload them when you check out. We check every photo and tell you if one is too small to print well.",
    },
    {
      question: "Do you print photos for weddings and festivals?",
      answer:
        "Yes. Weddings, Dashain, Tihar, baby and travel keepsakes are some of our most popular orders. See our occasion pages for ideas and tell us your date so we can plan around it.",
    },
  ];
}
