import { ApiError } from "./api";
import { adminRequest } from "./admin-api";

export type AdminUploadFolder = "products" | "services" | "categories" | "reviews" | "site";

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  allowedFormats?: string;
}

const ACCEPTED = /^image\/(jpeg|png|webp|gif|avif)$/;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Where images may come from: our own Cloudinary account (the shop only shows images from there). */
export const CLOUDINARY_URL = /^https:\/\/res\.cloudinary\.com\/[^/\s]+\/image\/upload\/\S+$/;

export const isCloudinaryUrl = (value: string): boolean =>
  CLOUDINARY_URL.test(value.trim()) && value.trim().length <= 500;

export function imageProblem(file: File): string | null {
  if (!ACCEPTED.test(file.type)) return `${file.name}: use a JPG, PNG, WebP, GIF or AVIF image.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: images must be under 10 MB.`;
  return null;
}

/** Uploads straight from the browser to Cloudinary with a one-time signature from the API. */
export async function uploadAdminImage(
  file: File,
  folder: AdminUploadFolder,
  onProgress: (fraction: number) => void,
): Promise<string> {
  const sig = await adminRequest<Signature>("/uploads/signature", { body: { folder } });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);
  if (sig.allowedFormats) form.append("allowed_formats", sig.allowedFormats);

  return new Promise<string>((resolve, reject) => {
    const failed = (status: number) =>
      reject(new ApiError(`${file.name}: upload failed. Try again.`, status));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => failed(0);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { secure_url?: string };
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body.secure_url);
        else failed(xhr.status);
      } catch {
        failed(xhr.status);
      }
    };
    xhr.send(form);
  });
}
