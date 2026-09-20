import path from "node:path";
import { randomUUID } from "node:crypto";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";
import { AdminActionError } from "./action-result";

const UPLOAD_PUBLIC_PREFIX = "/uploads";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** The storage abstraction the rest of the app already uses for media. */
const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads")
);

export function adminStorage(): LocalStorageProvider {
  return new LocalStorageProvider(
    UPLOAD_DIR,
    UPLOAD_PUBLIC_PREFIX
  );
}

/**
 * Validates and stores one uploaded image, returning its public URL.
 * The filename is generated rather than taken from the client, so a hostile
 * upload cannot steer the write path (LocalStorageProvider also rejects
 * traversal, but not trusting the input in the first place is cheaper).
 */
export async function saveUploadedImage(file: File, folder: string): Promise<string> {
  if (file.size === 0) throw new AdminActionError("invalidType");
  if (file.size > MAX_IMAGE_BYTES) throw new AdminActionError("tooLarge");

  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) throw new AdminActionError("invalidType");

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder}/${randomUUID()}.${extension}`;
  return adminStorage().put(key, buffer, file.type);
}

/** Best-effort cleanup of a file this app previously wrote under /uploads. */
export async function deleteStoredImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(`${UPLOAD_PUBLIC_PREFIX}/`)) return;
  const key = url.slice(UPLOAD_PUBLIC_PREFIX.length + 1);
  try {
    await adminStorage().delete(key);
  } catch {
    // A missing or already-removed file must not fail the surrounding action.
  }
}

/** True when the browser actually attached a file to an optional file input. */
export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
