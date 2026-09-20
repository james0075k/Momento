import type { FaqItem } from "@/lib/jsonld";

/** Question-style FAQ. Uses <details>, so every answer is in the HTML for crawlers and works without JavaScript. */
export function FaqList({ faqs, className }: { faqs: FaqItem[]; className?: string }) {
  return (
    <div className={className ?? "max-w-3xl space-y-3"}>
      {faqs.map((faq) => (
        <details key={faq.question} className="bg-surface group rounded-2xl px-5">
          <summary className="focus-visible:outline-ring flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-semibold focus-visible:outline-2">
            {faq.question}
            <span
              aria-hidden
              className="text-brand text-2xl leading-none transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="text-muted-foreground max-w-prose pb-5">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
