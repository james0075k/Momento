export const DEFAULT_ORDER_MESSAGE = "Hi Momento! I'd like to order photo prints.";

/** wa.me link with a prefilled message. `number` is digits with country code. */
export function whatsappLink(number: string, message: string = DEFAULT_ORDER_MESSAGE): string {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}
