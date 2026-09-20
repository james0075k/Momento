import Link from "next/link";
import { Fragment } from "react";
import type { BlogBlock } from "@/content/blog";

const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

/** Turns [text](/path) in blog copy into internal links. Anything else is plain text, escaped by React. */
export function InlineText({ text }: { text: string }) {
  const parts: Array<string | { label: string; href: string }> = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ label: match[1] ?? "", href: match[2] ?? "/" });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <Link key={index} href={part.href} className="text-brand underline">
            {part.label}
          </Link>
        ),
      )}
    </>
  );
}

export function BlogBody({ blocks }: { blocks: readonly BlogBlock[] }) {
  return (
    <div className="max-w-prose space-y-5 text-lg leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={index} className="pt-4 text-2xl font-semibold md:text-3xl">
                {block.text}
              </h2>
            );
          case "p":
            return (
              <p key={index}>
                <InlineText text={block.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={index} className="ml-5 list-disc space-y-2">
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="ml-5 list-decimal space-y-2">
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
