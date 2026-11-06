import type { PublicStore, Store } from "./types";

/**
 * Audit P1-1: the public RSC payload used to contain every column of
 * `stores`, including `owner_user_id`, `verified_at`, `is_seed` and
 * `created_at`. Those are internal fields with no public UI, so strip them
 * at the page boundary before handing a store to any client component or
 * JSON-LD builder. Employer/admin pages keep using the full `Store`.
 */
export function toPublicStore(store: Store): PublicStore {
  return {
    id: store.id,
    name_zh: store.name_zh,
    name_es: store.name_es,
    city: store.city,
    district: store.district,
    address: store.address,
    category: store.category,
    cover_image: store.cover_image,
    photos: store.photos,
    verification_status: store.verification_status,
    rating_avg: store.rating_avg,
    rating_count: store.rating_count,
  };
}

/**
 * Historical seed rows pointed at `/seed/*.jpg` files that were never
 * committed. Even after `db:clean-images` fixes the database, keep a
 * read-time guard so a stale row can never emit another 404 request.
 */
export function sanitizePublicStore(store: Store): PublicStore {
  const publicStore = toPublicStore(store);
  return {
    ...publicStore,
    district: publicStore.district.trim(),
    cover_image: publicStore.cover_image.startsWith("/seed/")
      ? ""
      : publicStore.cover_image,
    photos: publicStore.photos.filter((photo) => !photo.startsWith("/seed/")),
  };
}

/**
 * Detect obvious seed/test rows so they never reach the public index
 * (sitemap) or get promoted (store pages). Shared by lib/seo/sitemap.ts and the
 * store-detail metadata so the rule lives in exactly one place. Catches
 * `name_zh` like "百元店1", any "test/testing" substring, and 示例/测试.
 */
export function looksLikeTestStore(store: {
  name_zh: string;
  name_es: string;
  address: string;
}): boolean {
  const text = `${store.name_zh} ${store.name_es} ${store.address}`;
  return /\btest(?:ing)?\b|示例|测试|^百元店\s*\d+\s*$/i.test(
    `${text} ${store.name_zh.trim()}`
  );
}
