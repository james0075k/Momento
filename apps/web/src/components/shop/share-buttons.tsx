"use client";

import { Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useFeature } from "@/components/features/features-provider";
import { cn } from "@/lib/utils";

const button =
  "border-ink/15 bg-surface text-ink hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium focus-visible:outline-2";

/**
 * Share a page on WhatsApp or Facebook, or copy its link. Plain links only, so no third-party script
 * loads and the security policy stays as it is. Renders nothing while the `share` flag is off.
 */
export function ShareButtons({
  url,
  title,
  className,
}: {
  /** Absolute URL of the page being shared. */
  url: string;
  title: string;
  className?: string;
}) {
  const enabled = useFeature("share");
  if (!enabled) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link. Copy it from the address bar instead.");
    }
  };

  return (
    <div
      role="group"
      aria-label="Share this page"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span className="text-muted-foreground mr-1 inline-flex items-center gap-1 text-sm">
        <Share2 aria-hidden className="size-4" />
        Share
      </span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        <MessageCircle aria-hidden className="size-4" />
        WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        Facebook
      </a>
      <button type="button" onClick={copy} className={button}>
        <Link2 aria-hidden className="size-4" />
        Copy link
      </button>
    </div>
  );
}
