import { createServiceClient } from "@/lib/supabase/server";
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
 * Uploads to Supabase Storage (public "avatars" bucket) and returns
 * the public URL. Throws ValidationError on bad input.
 */
export async function storeDependantAvatar(avatar: string, prefix: string): Promise<string> {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/.exec(avatar);
  if (!match) throw new ValidationError("Invalid photo — expected a base64 image");
  const ext = EXT_BY_MIME[match[1].toLowerCase()];
  if (!ext) throw new ValidationError("Unsupported image type — use JPG, PNG, WebP or GIF");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new ValidationError("Empty image file");
  if (buffer.length > MAX_BYTES) throw new ValidationError("Photo must be 2 MB or smaller");

  const fileName = `${prefix}-${Date.now()}.${ext}`;
  const admin = createServiceClient();
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(fileName, buffer, {
      upsert: true,
      contentType: match[1].toLowerCase(),
    });

  if (uploadError) {
    throw new ValidationError(`Failed to save photo: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(fileName);
  return publicUrl;
}
