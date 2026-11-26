const env = import.meta.env || {};
const url = (env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
const privacyEmail = (env.VITE_FLOWORK_PRIVACY_EMAIL || '').trim();
const operatorName = (env.VITE_FLOWORK_OPERATOR || '').trim();
const localBackend = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(url);
const cloudBackend = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url);
export const config = {
  url, publishableKey, privacyEmail, operatorName,
  ready: Boolean((cloudBackend || (env.DEV && localBackend)) && /^sb_publishable_[\w-]+$/.test(publishableKey)
    && operatorName && /^[^\s<>"@?&#]+@[^\s<>"@?&#]+\.[^\s<>"@?&#]+$/.test(privacyEmail))
};
export const legalVersions = { terms: '2026-11-26.1', privacy: '2026-11-26.1' };
