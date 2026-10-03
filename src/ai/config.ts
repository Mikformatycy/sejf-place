/**
 * Google Gemini, called straight from the phone (no server). Key and model come from
 * .env.local (EXPO_PUBLIC_GEMINI_API_KEY / EXPO_PUBLIC_GEMINI_MODEL) and are built into the app.
 * Note: the free tier lets Google use the text to improve its products, and a key inside
 * the app can be extracted from it. Good enough for a demo, not for real users.
 */
export const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash';
/** Used once when the main model is overloaded (503) or out of free quota (429). */
export const GEMINI_FALLBACK_MODEL = process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

export const aiReady = GEMINI_KEY.length > 0;
