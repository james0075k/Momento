import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SceneName = "himal" | "tihar" | "wedding" | "dashain" | "baby" | "travel";

const FLAG_FILLS = ["fill-brand", "fill-surface", "fill-success", "fill-accent", "fill-ink"];
const FLAGS: Array<[number, number]> = [
  [15, 23.5],
  [30, 25.7],
  [50, 26.5],
  [70, 24.9],
  [85, 22.1],
];
const GARLAND: Array<[number, number]> = [
  [9, 33],
  [23, 38],
  [36, 41],
  [50, 42.5],
  [64, 41],
  [77, 38],
  [91, 33],
];
const TRAVEL_FLAGS: Array<[number, number, string]> = [
  [16, 55, "fill-brand"],
  [30, 43.5, "fill-surface"],
  [70, 43.5, "fill-success"],
  [84, 55, "fill-brand"],
];

/** Flat, token-coloured illustrations of Nepali moments, drawn in a 100 x 125 box. */
const scenes: Record<SceneName, ReactNode> = {
  himal: (
    <>
      <rect width="100" height="125" className="fill-accent/25" />
      <circle cx="70" cy="40" r="12" className="fill-accent" />
      <polygon points="0,96 26,56 46,82 66,46 100,90 100,125 0,125" className="fill-ink/55" />
      <polygon points="0,112 30,78 56,106 80,72 100,100 100,125 0,125" className="fill-ink" />
      <polygon points="26,56 20,65 26,63 31,67" className="fill-surface" />
      <polygon points="66,46 60,56 66,54 72,58" className="fill-surface" />
      <path d="M0 20 Q50 34 100 18" fill="none" strokeWidth="0.8" className="stroke-ink" />
      {FLAGS.map(([x, y], i) => (
        <rect key={x} x={x - 4} y={y} width="8" height="9" className={FLAG_FILLS[i]} />
      ))}
    </>
  ),
  tihar: (
    <>
      <rect width="100" height="125" className="fill-ink" />
      {GARLAND.map(([x, y], i) => (
        <circle key={x} cx={x} cy={y} r="5.5" className={i % 2 ? "fill-brand" : "fill-accent"} />
      ))}
      <circle cx="16" cy="10" r="1.2" className="fill-surface" />
      <circle cx="82" cy="14" r="1.2" className="fill-surface" />
      <circle cx="60" cy="7" r="1" className="fill-surface" />
      <path d="M26 100 Q42 120 58 100Z" className="fill-brand" />
      <path d="M42 82 Q48 92 42 101 Q36 92 42 82Z" className="fill-accent" />
      <g transform="translate(34 12) scale(.8)">
        <path d="M26 100 Q42 120 58 100Z" className="fill-brand" />
        <path d="M42 82 Q48 92 42 101 Q36 92 42 82Z" className="fill-accent" />
      </g>
    </>
  ),
  wedding: (
    <>
      <rect width="100" height="125" className="fill-brand" />
      <rect y="112" width="100" height="13" className="fill-ink" />
      <path
        d="M22 112 V66 A28 28 0 0 1 78 66 V112"
        fill="none"
        strokeWidth="4"
        className="stroke-surface"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={30 + i * 10}
          cy={i === 2 ? 34 : i % 2 ? 41 : 46}
          r="3"
          className="fill-accent"
        />
      ))}
      <circle cx="43" cy="88" r="9" fill="none" strokeWidth="3" className="stroke-accent" />
      <circle cx="57" cy="88" r="9" fill="none" strokeWidth="3" className="stroke-surface" />
    </>
  ),
  dashain: (
    <>
      <rect width="100" height="125" className="fill-accent/25" />
      <path d="M0 105 Q40 88 100 106 V125 H0Z" className="fill-success" />
      <polygon points="35,14 52,36 35,64 18,36" className="fill-brand" />
      <path d="M35 14 V64 M18 36 H52" strokeWidth="0.8" className="stroke-surface" fill="none" />
      <path d="M35 64 q-8 10 2 16 q9 6 0 14" fill="none" strokeWidth="1.2" className="stroke-ink" />
      <polygon points="74,46 85,60 74,78 63,60" className="fill-ink" />
      <path d="M74 46 V78 M63 60 H85" strokeWidth="0.7" className="stroke-accent" fill="none" />
      <path d="M74 78 q6 8 -1 13 q-6 5 1 11" fill="none" strokeWidth="1" className="stroke-ink" />
    </>
  ),
  baby: (
    <>
      <rect width="100" height="125" className="fill-success/20" />
      <path d="M50 18 A17 17 0 1 0 64 46 A14 14 0 1 1 50 18Z" className="fill-accent" />
      <circle cx="74" cy="24" r="1.6" className="fill-surface" />
      <circle cx="24" cy="30" r="1.2" className="fill-surface" />
      <circle cx="80" cy="50" r="1.2" className="fill-surface" />
      <rect x="14" y="72" width="72" height="42" rx="10" className="fill-surface" />
      <rect x="14" y="88" width="72" height="6" className="fill-brand/35" />
      <rect x="14" y="99" width="72" height="6" className="fill-accent/45" />
      <circle cx="50" cy="72" r="12" className="fill-ink" />
    </>
  ),
  travel: (
    <>
      <rect width="100" height="125" className="fill-accent/25" />
      <rect y="108" width="100" height="17" className="fill-ink" />
      <path d="M50 30 L5 66 M50 30 L95 66" fill="none" strokeWidth="0.8" className="stroke-ink" />
      {TRAVEL_FLAGS.map(([x, y, fill]) => (
        <rect key={x} x={x - 3.5} y={y} width="7" height="8" className={fill} />
      ))}
      <rect x="20" y="98" width="60" height="10" className="fill-surface" />
      <rect x="26" y="90" width="48" height="8" className="fill-surface/85" />
      <path d="M30 90 A20 20 0 0 1 70 90Z" className="fill-surface" />
      <rect x="42" y="60" width="16" height="12" className="fill-accent" />
      <circle cx="46" cy="66" r="1.6" className="fill-ink" />
      <circle cx="54" cy="66" r="1.6" className="fill-ink" />
      <polygon points="50,30 56,60 44,60" className="fill-accent" />
    </>
  ),
};

interface PhotoSceneProps {
  scene: SceneName;
  /** Omit for decorative use. */
  label?: string;
  className?: string;
}

export function PhotoScene({ scene, label, className }: PhotoSceneProps) {
  return (
    <svg
      viewBox="0 0 100 125"
      preserveAspectRatio="xMidYMid slice"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block h-full w-full", className)}
    >
      {scenes[scene]}
    </svg>
  );
}

interface PrintProps {
  scene: SceneName;
  label?: string;
  tape?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A photo print: white border, a wider foot, and an optional strip of tape. */
export function Print({ scene, label, tape = true, className, style }: PrintProps) {
  return (
    <figure
      className={cn(
        "bg-surface relative m-0 p-[5%] pb-[10%] shadow-[0_14px_28px_-14px_color-mix(in_srgb,var(--ink)_55%,transparent)]",
        className,
      )}
      style={style}
    >
      {tape && (
        <span
          aria-hidden
          className="bg-accent/60 absolute -top-2 left-1/2 h-4 w-[26%] -translate-x-1/2 -rotate-3"
        />
      )}
      <div className="aspect-[4/5] w-full overflow-hidden">
        <PhotoScene scene={scene} label={label} />
      </div>
    </figure>
  );
}
