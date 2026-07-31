import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ValidationError } from "@/lib/api-utils";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Save a dependant photo supplied as a base64 data URL.
 * Writes to uploads/avatars (served via /api/uploads/avatars/[filename])
 * and returns the public URL. Throws ValidationError on bad input.
 */
export async function storeDependantAvatar(avatar: string, prefix: string): Promise<string> {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/.exec(avatar);
  if (!match) throw new ValidationError("Invalid photo — expected a base64 image");
  const ext = EXT_BY_MIME[match[1].toLowerCase()];
  if (!ext) throw new ValidationError("Unsupported image type — use JPG, PNG, WebP or GIF");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new ValidationError("Empty image file");
  if (buffer.length > MAX_BYTES) throw new ValidationError("Photo must be 2 MB or smaller");
  const uploadDir = path.join(process.cwd(), "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${prefix}-${Date.now()}.${ext}`;
  await writeFile(path.join(uploadDir, fileName), buffer);
  return `/api/uploads/avatars/${fileName}`;
}
