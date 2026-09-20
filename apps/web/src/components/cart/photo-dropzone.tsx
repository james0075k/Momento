"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ApiError } from "@/lib/api";
import { ORDER_PHOTO_LIMIT, photoProblem, uploadOrderPhoto } from "@/lib/upload";
import { cn } from "@/lib/utils";

export interface PhotoItem {
  id: string;
  name: string;
  preview: string;
  progress: number;
  url?: string;
  error?: string;
}

const PARALLEL = 3;

/** Photos for a print order: added one by one, uploaded three at a time, straight to Cloudinary. */
export function usePhotoUploads() {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const queue = useRef<Array<{ id: string; file: File }>>([]);
  const running = useRef(0);
  const itemsRef = useRef<PhotoItem[]>([]);
  itemsRef.current = items;

  const patch = useCallback((id: string, change: Partial<PhotoItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const pump = useCallback(() => {
    while (running.current < PARALLEL && queue.current.length > 0) {
      const job = queue.current.shift();
      if (!job) return;
      running.current += 1;
      uploadOrderPhoto(job.file, (progress) => patch(job.id, { progress }))
        .then((url) => patch(job.id, { url, progress: 1 }))
        .catch((error: unknown) =>
          patch(job.id, {
            error: error instanceof ApiError ? error.message : `${job.file.name}: upload failed.`,
          }),
        )
        .finally(() => {
          running.current -= 1;
          pump();
        });
    }
  }, [patch]);

  const add = useCallback(
    (files: File[]) => {
      const room = ORDER_PHOTO_LIMIT - itemsRef.current.length;
      const rejected: string[] = [];
      const accepted: File[] = [];
      for (const file of files) {
        const problem = photoProblem(file);
        if (problem) rejected.push(problem);
        else if (accepted.length < room) accepted.push(file);
      }
      if (accepted.length < files.length - rejected.length) {
        rejected.push(`You can add up to ${ORDER_PHOTO_LIMIT} photos per order.`);
      }
      setProblems(rejected);
      if (accepted.length === 0) return;
      const added = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        name: file.name,
        preview: URL.createObjectURL(file),
        progress: 0,
      }));
      setItems((current) => [...current, ...added]);
      queue.current.push(...accepted.map((file, index) => ({ id: added[index]!.id, file })));
      pump();
    },
    [pump],
  );

  const remove = useCallback((id: string) => {
    queue.current = queue.current.filter((job) => job.id !== id);
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), []);

  return {
    items,
    problems,
    add,
    remove,
    urls: items.flatMap((item) => (item.url ? [item.url] : [])),
    uploading: items.some((item) => !item.url && !item.error),
    failed: items.some((item) => item.error),
  };
}

type Uploads = ReturnType<typeof usePhotoUploads>;

export function PhotoDropzone({ uploads }: { uploads: Uploads }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    uploads.add(Array.from(event.dataTransfer.files));
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          over ? "border-brand bg-brand/5" : "border-ink/20 bg-surface",
        )}
      >
        <ImagePlus aria-hidden className="text-muted-foreground mx-auto size-8" />
        <p className="mt-2 font-medium">Drag photos here</p>
        <p className="text-muted-foreground text-sm">
          JPG, PNG, WebP or HEIC, up to 10 MB each, {ORDER_PHOTO_LIMIT} photos at most.
        </p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="border-input bg-surface hover:bg-muted focus-visible:outline-ring mt-4 inline-flex min-h-11 items-center rounded-md border px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Choose photos
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,.heic"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose photos to upload"
          onChange={(event) => {
            uploads.add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {uploads.problems.length > 0 && (
        <ul role="alert" className="text-brand mt-3 space-y-1 text-sm">
          {uploads.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {uploads.items.length > 0 && (
        <>
          <p className="text-muted-foreground mt-4 text-sm" aria-live="polite">
            {uploads.urls.length} of {uploads.items.length} uploaded
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {uploads.items.map((item) => (
              <li key={item.id} className="relative">
                <div className="bg-tint relative aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={item.preview} alt={item.name} className="size-full object-cover" />
                  {!item.url && !item.error && (
                    <div className="bg-ink/50 text-surface absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs">
                      <Loader2
                        aria-hidden
                        className="size-5 animate-spin motion-reduce:animate-none"
                      />
                      {Math.round(item.progress * 100)}%
                    </div>
                  )}
                  {item.error && (
                    <div
                      role="alert"
                      className="bg-brand/85 text-surface absolute inset-0 flex items-center justify-center p-1 text-center text-xs"
                    >
                      Failed
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => uploads.remove(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="bg-ink text-surface focus-visible:outline-ring absolute -right-2 -top-2 inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2 [&>svg]:size-4"
                >
                  <X aria-hidden />
                </button>
                {item.error && <p className="text-brand mt-1 text-xs">{item.error}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
