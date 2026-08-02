/**
 * Client-side image normalisation for user photos / avatars.
 *
 * Converts any uploaded photo to a clean 2" × 2" (passport-style) square:
 *  - center-crops to the largest square in the middle of the image
 *  - resizes to 300×300 px (2" at 150 DPI)
 *  - encodes as JPEG (white background fills transparent PNGs)
 *
 * This guarantees every avatar renders as a perfect square instead of
 * preserving the camera photo's irregular length/width.
 */

export const AVATAR_SIZE_PX = 300;

export async function fileToSquareImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not read the image"));
      image.src = url;
    });

    const size = Math.min(img.width, img.height);
    const sx = (img.width - size) / 2;
    const sy = (img.height - size) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE_PX;
    canvas.height = AVATAR_SIZE_PX;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing not supported on this device");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
    ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image"))),
        "image/jpeg",
        0.92
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Build a square, resized copy of `file` ready for upload (JPEG). */
export async function fileToSquareUpload(file: File): Promise<File> {
  const blob = await fileToSquareImage(file);
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
