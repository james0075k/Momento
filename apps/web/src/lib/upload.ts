import { ORDER_PHOTO_LIMIT } from "@momento/shared";
import { ApiError, apiRequest } from "./api";

export { ORDER_PHOTO_LIMIT };
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPE = /^image\/(jpeg|png|webp|heic)$/;
const ACCEPTED_NAME = /\.(jpe?g|png|webp|heic)$/i;

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  allowedFormats: string;
}

/** Returns a message when the file cannot be uploaded, otherwise null. */
export function photoProblem(file: File): string | null {
  if (!ACCEPTED_TYPE.test(file.type) && !ACCEPTED_NAME.test(file.name)) {
    return `${file.name}: use a JPG, PNG, WebP or HEIC photo.`;
  }
  if (file.size > MAX_PHOTO_BYTES) return `${file.name}: photos must be under 10 MB.`;
  return null;
}

/** Uploads straight from the browser to Cloudinary with a one-time signature from our API. */
export async function uploadOrderPhoto(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<string> {
  const sig = await apiRequest<Signature>("/uploads/order-signature", { method: "POST", body: {} });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("allowed_formats", sig.allowedFormats);
  form.append("signature", sig.signature);

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
