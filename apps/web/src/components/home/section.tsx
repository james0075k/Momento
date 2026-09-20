import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

interface SectionProps {
  id?: string;
  labelledBy?: string;
  tone?: "paper" | "muted" | "ink" | "plain";
  className?: string;
  /** Extra classes for the outer section, e.g. to trim its padding. */
  sectionClassName?: string;
  /** Decoration behind the content, e.g. colour glows for glass panels to blur. */
  backdrop?: ReactNode;
  children: ReactNode;
}

const tones = {
  paper: "bg-paper text-ink",
  muted: "bg-wash text-ink",
  /** No background of its own, so a wrapper can carry one across several sections. */
  plain: "text-ink",
  ink: "bg-ink text-surface",
};

export function Section({
  id,
  labelledBy,
  tone = "paper",
  className,
  sectionClassName,
  backdrop,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "scroll-mt-16 py-16 md:py-24",
        tones[tone],
        backdrop && "relative isolate overflow-hidden",
        sectionClassName,
      )}
    >
      {backdrop}
      <div className={cn("mx-auto w-full max-w-6xl px-4 md:px-8", className)}>{children}</div>
    </section>
  );
}

interface HeadingProps {
  id: string;
  title: string;
  subtitle?: string;
  onInk?: boolean;
  className?: string;
  /** Light the title up word by word as it scrolls into view. */
  reveal?: boolean;
}

const headingClass = "text-3xl leading-[1.1] font-semibold tracking-tight md:text-5xl";

export function SectionHeading({ id, title, subtitle, onInk, className, reveal }: HeadingProps) {
  return (
    <div className={cn("mb-10 max-w-2xl md:mb-14", className)}>
      {reveal ? (
        <ScrollReveal id={id} text={title} className={headingClass} />
      ) : (
        <h2 id={id} className={headingClass}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={cn("mt-4 text-lg", onInk ? "text-surface/80" : "text-muted-foreground")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
