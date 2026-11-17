/**
 * Cloudflare Pages Function: /api/video-proxy
 * Streaming proxy alias supporting HTTP Range (206 Partial Content) with CORS headers.
 * Enables video scrubbing and canvas frame extraction without CORS tainting.
 */

export { onRequestGet, onRequestOptions } from './admin/video-proxy';
