import { PhotoScene, type SceneName } from "./scenes";

export interface Cover {
  title: string;
  note: string;
  variant: "framed" | "full";
  scene: SceneName;
}

/**
 * A hardcover photo book seen from the front. "framed" puts a picture in a dark cover with the
 * title above it; "full" runs the picture to the edge with the title on the spine strip.
 */
export function BookCover({ cover }: { cover: Cover }) {
  return (
    <figure className="relative m-0 aspect-[4/3] w-full overflow-hidden rounded-l-sm rounded-r-lg shadow-[0_22px_34px_-18px_color-mix(in_srgb,var(--ink)_65%,transparent)]">
      {cover.variant === "framed" ? (
        <div className="bg-ink text-surface absolute inset-0 p-5 md:p-7">
          <p className="font-heading max-w-[62%] text-2xl font-semibold leading-tight md:text-3xl">
            {cover.title}
          </p>
          <p className="text-surface/80 mt-2 text-sm">{cover.note}</p>
          <div className="border-surface/30 absolute bottom-5 right-5 aspect-[4/5] w-[38%] overflow-hidden rounded-sm border md:bottom-7 md:right-7">
            <PhotoScene scene={cover.scene} />
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-y-0 left-0 w-[72%]">
            <PhotoScene scene={cover.scene} />
          </div>
          <div className="bg-ink text-surface absolute inset-y-0 right-0 flex w-[28%] items-center justify-center p-3">
            <p className="font-heading rotate-180 text-xl font-semibold leading-tight [writing-mode:vertical-rl] md:text-2xl">
              {cover.title}
            </p>
          </div>
        </>
      )}
      <span
        aria-hidden
        className="bg-linear-to-r from-ink/45 pointer-events-none absolute inset-y-0 left-0 w-4 to-transparent"
      />
      <figcaption className="sr-only">
        {cover.title}, {cover.note}
      </figcaption>
    </figure>
  );
}
