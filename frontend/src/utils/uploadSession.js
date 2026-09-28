// Backend's upload-images route accepts an upload_session id matching
// [A-Za-z0-9_-]{1,64}. crypto.randomUUID() satisfies that directly (36 hex
// chars + hyphens), with a manual fallback for older browsers that lack it.
// Shared by any photo-upload flow that batches images under a single
// upload_session so the listing's photo array is written exactly once
// (New Listing's initial upload, My Listings' "add more photos").
export function genUploadSession() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
  } catch {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
