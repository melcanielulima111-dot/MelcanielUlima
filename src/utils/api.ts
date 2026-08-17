/**
 * Calféx — API Endpoint Utility
 * Automatically adapts API requests to:
 * 1. Relative endpoints for Netlify (with Netlify Functions) or self-hosted Node/Express.
 * 2. Dedicated backend servers when VITE_API_URL is specified (e.g. on Render, Railway, Fly.io, VPS).
 */
export function getApiUrl(endpoint: string): string {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${path}` : path;
}
