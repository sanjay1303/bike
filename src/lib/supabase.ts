import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "biketrack";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    _client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return _client;
}

export function isSupabaseStorageEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Uploads a buffer directly to Supabase public storage and returns the permanent public URL.
 */
export async function uploadToSupabaseStorage(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  try {
    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return null;
    }

    const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err: any) {
    console.error("uploadToSupabaseStorage exception:", err);
    return null;
  }
}
