import {
  Clock,
  MapPin,
  MessageCircle,
  Printer,
  ScanSearch,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ITEMS: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Clock, text: "2 to 3 day delivery in Kathmandu Valley" },
  { icon: ScanSearch, text: "Print-quality check on every photo" },
  { icon: Printer, text: "Free reprint promise" },
  { icon: Wallet, text: "Pay by eSewa, Khalti or bank" },
  { icon: MessageCircle, text: "Order and support on WhatsApp" },
  { icon: MapPin, text: "Made in Nepal" },
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-12 pr-12">
      {ITEMS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3 whitespace-nowrap">
          <Icon aria-hidden className="text-brand size-6" strokeWidth={1.5} />
          <span className="text-base font-medium">{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The trust strip under the hero. It has no background of its own, so it takes on whatever
 * section it sits in. Two identical rows slide left by exactly one row, which loops seamlessly.
 */
export function TrustMarquee() {
  return (
    <div className="text-ink w-full overflow-hidden py-6">
      <div className="marquee-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
