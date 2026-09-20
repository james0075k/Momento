import sanitizeHtml from "sanitize-html";
import { cn } from "@/lib/utils";

/** Product descriptions are rich text written in the admin. Only these tags survive. */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "a",
    ],
    allowedAttributes: { a: ["href", "title", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "[&_a]:text-brand max-w-prose space-y-4 text-lg leading-relaxed [&_a]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: cleanHtml(html) }}
    />
  );
}
