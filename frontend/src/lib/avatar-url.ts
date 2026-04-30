import { quintApi } from "@/lib/api";
import { mxcToMediaPath } from "@/lib/mxc-media";

/** Resolves user.avatarUrl for <img> / Avatar (HTTP(S), data URLs, or Matrix MXC). */
export function getAvatarSrc(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("data:image/")) return url;
  const mxc = mxcToMediaPath(url);
  if (mxc) return mxc;
  return undefined;
}

export const MAX_AVATAR_DIMENSION = 512;
const JPEG_QUALITY = 0.88;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Pixel crop rect from react-easy-crop (`croppedAreaPixels`). */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crop a square region from the image and encode as JPEG at a fixed output size
 * (no stretching — the crop selection defines the content).
 */
export async function getCroppedSquareJpegDataUrl(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize: number = MAX_AVATAR_DIMENSION,
): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * Upload a JPEG data-URL as the user's profile avatar.
 *
 * Sends the base64 payload to the Quint API, which uploads it to Matrix media,
 * sets the user's `avatar_url`, and pushes `rooms_update` to every DM partner so
 * their chat lists refresh with the new picture.
 */
export async function uploadProfileAvatar(
  jpegDataUrl: string,
): Promise<{ avatarUrl: string | null }> {
  return quintApi.post<{ avatarUrl: string | null }>(
    "/v1/profile/me/avatar",
    { avatar: jpegDataUrl },
  );
}

/** Clear the user's Matrix avatar. */
export async function clearProfileAvatar(): Promise<void> {
  await quintApi.post("/v1/profile/me/avatar", { avatar: null });
}

/** Resize image file to a JPEG data URL for client-side avatar storage. */
export function resizeImageFileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const max = MAX_AVATAR_DIMENSION;
      if (width > max || height > max) {
        if (width >= height) {
          height = Math.round((height * max) / width);
          width = max;
        } else {
          width = Math.round((width * max) / height);
          height = max;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };
    img.src = objectUrl;
  });
}
