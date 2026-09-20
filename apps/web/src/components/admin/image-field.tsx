"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  imageProblem,
  isCloudinaryUrl,
  uploadAdminImage,
  type AdminUploadFolder,
} from "@/lib/admin-upload";
import { inputClass } from "./ui";

const smallButton =
  "border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline-2 disabled:opacity-40";

/**
 * Images for a product, service or category: upload from the computer (straight to Cloudinary), or add a
 * Cloudinary link. Order is changed with earlier/later buttons, which work on a phone and from the keyboard;
 * the first image is the cover.
 */
export function ImageField({
  images,
  onChange,
  folder,
  max,
  label,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  folder: AdminUploadFolder;
  max: number;
  label: string;
}) {
  const inputId = useId();
  const linkId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const full = images.length >= max;

  const move = (index: number, by: number) => {
    const next = [...images];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMessage(undefined);
    let current = images;
    for (const file of Array.from(files)) {
      if (current.length >= max) {
        setMessage(`You can add up to ${max} ${max === 1 ? "image" : "images"}.`);
        break;
      }
      const problem = imageProblem(file);
      if (problem) {
        setMessage(problem);
        continue;
      }
      try {
        setProgress(0);
        const url = await uploadAdminImage(file, folder, setProgress);
        current = [...current, url];
        onChange(current);
      } catch (error) {
        setMessage(
          error instanceof ApiError && error.status === 503
            ? "Image uploads are not set up yet (Cloudinary). Add an image by link instead."
            : error instanceof ApiError
              ? error.message
              : "Upload failed. Try again.",
        );
      }
    }
    setProgress(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const addLink = () => {
    const value = link.trim();
    if (!isCloudinaryUrl(value)) {
      setMessage("Use an image link from Cloudinary (https://res.cloudinary.com/...).");
      return;
    }
    if (images.includes(value)) {
      setMessage("That image is already added.");
      return;
    }
    setMessage(undefined);
    onChange([...images, value]);
    setLink("");
  };

  return (
    <fieldset>
      <legend className="mb-2 font-medium">{label}</legend>
      {images.length > 0 && (
        <ul className="mb-3 grid gap-3 sm:grid-cols-2">
          {images.map((url, index) => (
            <li key={url} className="bg-surface flex gap-3 rounded-xl p-2">
              <span className="bg-muted relative block size-20 shrink-0 overflow-hidden rounded-lg">
                <Image src={url} alt="" fill sizes="5rem" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground mb-1 text-sm">
                  {index === 0 ? "Cover image" : `Image ${index + 1}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={smallButton}
                    disabled={index === 0}
                    aria-label={`Move image ${index + 1} earlier`}
                    onClick={() => move(index, -1)}
                  >
                    Earlier
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    disabled={index === images.length - 1}
                    aria-label={`Move image ${index + 1} later`}
                    onClick={() => move(index, 1)}
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() => onChange(images.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className={`${smallButton} cursor-pointer`}>
          {progress !== null
            ? `Uploading ${Math.round(progress * 100)}%`
            : "Upload from your computer"}
        </label>
        <input
          id={inputId}
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple={max > 1}
          disabled={full || progress !== null}
          onChange={(event) => void upload(event.target.files)}
          className="sr-only"
        />
        <span className="text-muted-foreground text-sm">
          {images.length} of {max} added
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <label htmlFor={linkId} className="sr-only">
          Cloudinary image link
        </label>
        <input
          id={linkId}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addLink();
            }
          }}
          disabled={full}
          placeholder="Or paste a Cloudinary image link"
          className={inputClass}
        />
        <button
          type="button"
          className={smallButton}
          disabled={full || !link.trim()}
          onClick={addLink}
        >
          Add link
        </button>
      </div>
      {message && (
        <p role="alert" className="text-brand mt-2 text-sm">
          {message}
        </p>
      )}
    </fieldset>
  );
}
