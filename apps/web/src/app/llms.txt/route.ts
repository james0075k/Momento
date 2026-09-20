import { getAllProducts, getCategories, getServices, getSettings } from "@/lib/catalog";
import { formatNpr, plainText } from "@/lib/format";
import { absoluteUrl, DELIVERY, SITE_NAME } from "@/lib/site";
import { OCCASIONS } from "@/config/occasions";
import { BLOG_POSTS } from "@/content/blog";

export const revalidate = 3600;

const oneLine = (text: string, max = 140) => plainText(text, max).replace(/\s+/g, " ");

/** llms.txt: a plain Markdown summary of the shop for AI assistants. See llmstxt.org. */
export async function GET() {
  const [settings, products, services, categories] = await Promise.all([
    getSettings(),
    getAllProducts(),
    getServices(),
    getCategories(),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const { insideValley, outsideValley, freeDeliveryThreshold } = settings.deliveryFees;

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is a Nepal-based store for photo books, framed prints, magnets and canvases, printed in Nepal. Customers choose a product on the website, send their photos on WhatsApp, and pay by eSewa, Khalti or bank transfer after the order is confirmed. All prices are in Nepali rupees (NPR).`,
    "",
    "## Products",
    "",
    ...(products.length > 0
      ? products.map((product) => {
          const from =
            product.variants.length > 0
              ? Math.min(...product.variants.map((variant) => variant.price))
              : product.basePrice;
          const category = categoryNames.get(product.categoryId);
          const detail = oneLine(product.shortDescription);
          return `- [${product.title}](${absoluteUrl(`/shop/${product.slug}`)}): ${category ? `${category}. ` : ""}From ${formatNpr(from)}.${detail ? ` ${detail}` : ""}`;
        })
      : [`- [Shop](${absoluteUrl("/shop")}): Photo books, frames, magnets and canvases.`]),
    "",
    "## Services",
    "",
    ...(services.length > 0
      ? services.map((service) =>
          `- [${service.title}](${absoluteUrl(`/services/${service.slug}`)}):${service.startingPrice !== undefined ? ` From ${formatNpr(service.startingPrice)}.` : ""} ${oneLine(service.description)}`.trimEnd(),
        )
      : [`- [Services](${absoluteUrl("/services")})`]),
    "",
    "## Delivery and payment",
    "",
    `- Delivery: ${DELIVERY.insideValley}; ${DELIVERY.outsideValley}.`,
    `- Delivery fees: ${formatNpr(insideValley)} inside Kathmandu Valley, ${formatNpr(outsideValley)} outside.${freeDeliveryThreshold !== undefined ? ` Free delivery on orders of ${formatNpr(freeDeliveryThreshold)} or more.` : ""}`,
    "- Payment: eSewa, Khalti or bank transfer, after the order is confirmed on WhatsApp. No online card payments.",
    "- Returns: misprinted or damaged items are reprinted free.",
    `- Track an order with its code and phone number: ${absoluteUrl("/track")}`,
    "",
    "## Contact",
    "",
    `- WhatsApp: +${settings.shopWhatsappNumber.replace(/[^0-9]/g, "")}`,
    `- Website: ${absoluteUrl("/")}`,
    "",
    "## Guides",
    "",
    `- [How ordering works](${absoluteUrl("/how-it-works")})`,
    `- [Frequently asked questions](${absoluteUrl("/faq")})`,
    ...OCCASIONS.map(
      (occasion) =>
        `- [${occasion.headline}](${absoluteUrl(`/occasions/${occasion.slug}`)}): ${oneLine(occasion.description, 200)}`,
    ),
    ...BLOG_POSTS.map((post) => `- [${post.title}](${absoluteUrl(`/blog/${post.slug}`)})`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
