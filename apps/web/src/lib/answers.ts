import type { Product, Service } from "@momento/shared";
import { formatNpr, plainText } from "./format";
import { DELIVERY } from "./site";

export const ANSWER_MIN_WORDS = 40;
export const ANSWER_MAX_WORDS = 60;

export const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** Adds sentences while they fit, so the answer lands in the 40 to 60 word window answer engines quote. */
function fit(sentences: string[], fallback: string): string {
  const kept: string[] = [];
  for (const sentence of sentences) {
    if (countWords([...kept, sentence].join(" ")) > ANSWER_MAX_WORDS) break;
    kept.push(sentence);
  }
  const text = kept.join(" ");
  return countWords(text) >= ANSWER_MIN_WORDS ? text : fallback;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

/** A direct 40 to 60 word answer for the top of a product page, built from its own data. */
export function productAnswer(product: Product, categoryName?: string): string {
  const prices = product.variants.map((variant) => variant.price);
  const from = prices.length > 0 ? Math.min(...prices) : product.basePrice;
  const kind = (categoryName ?? "keepsake").toLowerCase();
  const sizes = new Set(product.variants.map((variant) => variant.size));
  const teaser = plainText(product.shortDescription, 110).replace(/[.…]+$/, "");
  const intro = `${product.title} is ${article(kind)} ${kind} made in Nepal by Momento, from ${formatNpr(from)}.`;
  const sentences = [
    intro,
    teaser ? `${teaser}.` : "",
    sizes.size > 1 ? `It comes in ${sizes.size} sizes, so you can pick the one that fits.` : "",
    `Send your photos on WhatsApp, approve the layout, and we print and deliver: ${DELIVERY.insideValley}, ${DELIVERY.outsideValley}.`,
    "Pay by eSewa, Khalti or bank transfer once we confirm your order.",
  ].filter(Boolean);
  return fit(
    sentences,
    `${intro} Send your photos on WhatsApp, approve the layout, and we print and deliver: ${DELIVERY.insideValley}, ${DELIVERY.outsideValley}. Pay by eSewa, Khalti or bank transfer once we confirm your order, and we reprint free if anything arrives damaged.`,
  );
}

/** The same kind of answer for a service page. */
export function serviceAnswer(service: Service): string {
  const teaser = plainText(service.description, 130).replace(/[.…]+$/, "");
  const intro =
    service.startingPrice !== undefined
      ? `${service.title} at Momento starts from ${formatNpr(service.startingPrice)}.`
      : `${service.title} is a Momento service, priced by quote.`;
  const sentences = [
    intro,
    teaser ? `${teaser}.` : "",
    "Message us on WhatsApp with what you need and your photos, and we reply with an exact price and a delivery date.",
    `We deliver ${DELIVERY.insideValley} and ${DELIVERY.outsideValley}.`,
    "Pay by eSewa, Khalti or bank transfer once we confirm your order.",
  ].filter(Boolean);
  return fit(
    sentences,
    `${intro} Message us on WhatsApp with what you need and your photos, and we reply with an exact price and a delivery date. We deliver ${DELIVERY.insideValley} and ${DELIVERY.outsideValley}. Pay by eSewa, Khalti or bank transfer once we confirm your order, and we reprint free if anything arrives damaged.`,
  );
}
