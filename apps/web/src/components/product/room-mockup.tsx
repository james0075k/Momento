import Image from "next/image";
import { PhotoScene } from "@/components/home/scenes";
import { sizeScale } from "@/lib/variants";

interface RoomMockupProps {
  image?: string;
  title: string;
  /** The chosen size label, e.g. "A4". Bigger sizes hang bigger on the wall. */
  size?: string;
}

/**
 * The product on a living-room wall. The frame keeps one layout size and scales with `transform`,
 * so switching size animates smoothly and never shifts the page.
 */
export function RoomMockup({ image, title, size }: RoomMockupProps) {
  const scale = 0.5 + 0.5 * (size ? sizeScale(size) : 0.5);
  return (
    <figure className="m-0">
      <div className="bg-tint relative aspect-[4/3] overflow-hidden rounded-3xl">
        {/* Floor and skirting */}
        <div aria-hidden className="bg-ink/10 absolute inset-x-0 bottom-0 h-[22%]" />
        <div aria-hidden className="bg-ink/15 absolute inset-x-0 bottom-[22%] h-1" />
        {/* Sofa */}
        <div aria-hidden className="absolute bottom-[14%] left-1/2 w-[64%] -translate-x-1/2">
          <div className="bg-ink/25 mx-auto h-[4.5rem] w-[92%] rounded-t-3xl md:h-24" />
          <div className="bg-ink/35 -mt-2 h-9 w-full rounded-2xl md:h-12" />
        </div>
        {/* Lamp */}
        <div aria-hidden className="absolute bottom-[22%] right-[8%] flex flex-col items-center">
          <div className="bg-accent/70 h-9 w-11 rounded-t-full" />
          <div className="bg-ink/30 h-16 w-1 md:h-24" />
        </div>
        {/* The frame, hung from a fixed point */}
        <div
          className="absolute left-1/2 top-[9%] w-[34%] transition-transform duration-500"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: "50% 0" }}
        >
          <div className="bg-ink relative aspect-[4/5] w-full p-1.5 shadow-[0_14px_22px_-10px_color-mix(in_srgb,var(--ink)_55%,transparent)] md:p-2">
            <div className="bg-surface relative h-full w-full overflow-hidden p-1.5 md:p-2.5">
              <div className="relative h-full w-full overflow-hidden">
                {image ? (
                  <Image src={image} alt="" fill sizes="20rem" className="object-cover" />
                ) : (
                  <PhotoScene scene="himal" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-3 text-sm">
        {size ? `${title} at ${size}, shown on a wall.` : `${title} on a wall.`} Sizes are
        approximate.
      </figcaption>
    </figure>
  );
}
