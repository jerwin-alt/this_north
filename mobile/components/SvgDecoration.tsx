import React, { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Same base URL used everywhere else in the app
const API_BASE_URL = 'https://thisnorth-production-backend.up.railway.app';

// Module-level cache — SVG fetched once per URL, reused everywhere
const svgCache = new Map<string, string>();

/**
 * Returns true if the string looks like actual inline SVG XML,
 * as opposed to a URL or path.
 */
function looksLikeSvgXml(s: string | null | undefined): boolean {
  if (!s) return false;
  const trimmed = s.trim();
  return (
    trimmed.startsWith('<svg') ||
    trimmed.startsWith('<?xml') ||
    trimmed.includes('<svg')
  );
}

/**
 * Converts any path/URL into a full HTTPS URL.
 *  - Full URLs pass through unchanged
 *  - Relative paths like "/storage/x.svg" get the API host prepended
 */
function resolveToFullUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function getCachedSvgXml(url?: string | null): string | null {
  if (!url) return null;
  return svgCache.get(url) ?? null;
}

export function prefetchSvg(url?: string | null): void {
  if (!url) return;
  const fullUrl = looksLikeSvgXml(url) ? null : resolveToFullUrl(url);
  if (!fullUrl) return;
  if (svgCache.has(fullUrl)) return;
  fetch(fullUrl)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('failed'))))
    .then((text) => {
      if (looksLikeSvgXml(text)) svgCache.set(fullUrl, text);
    })
    .catch(() => {});
}

function applyColors(
  svg: string,
  colors: Record<string, string> | null | undefined
): string {
  if (!colors) return svg;
  let out = svg;
  for (const [part, hex] of Object.entries(colors)) {
    const re = new RegExp(
      `(<[^>]*\\bdata-part=["']${part}["'][^>]*\\bfill=["'])([^"']*)(["'])`,
      'g'
    );
    out = out.replace(re, `$1${hex}$3`);
  }
  return out;
}

export type SvgDecorationProps = {
  svgSource?: string | null;
  imageUrl?: any;
  size: number;
  color?: string | null;
  colors?: Record<string, string> | null;
};

export default function SvgDecoration({
  svgSource,
  imageUrl,
  size,
  color,
  colors,
}: SvgDecorationProps) {
  const [svgString, setSvgString] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSvgString(null);

    const resolve = async () => {
      if (!svgSource) {
        if (!cancelled) setFailed(true);
        return;
      }

      // ── Case 1: Inline SVG XML string ──
      if (looksLikeSvgXml(svgSource)) {
        if (!cancelled) setSvgString(svgSource);
        return;
      }

      // ── Case 2 or 3: URL or relative path → fetch ──
      const url = resolveToFullUrl(svgSource);

      const cached = svgCache.get(url);
      if (cached) {
        if (!cancelled) setSvgString(cached);
        return;
      }

      try {
        const r = await fetch(url, {
          headers: { Accept: 'image/svg+xml,text/plain,*/*' },
        });
        if (!r.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const text = await r.text();
        if (!looksLikeSvgXml(text)) {
          // Server returned something that isn't SVG (404 HTML page, etc.)
          if (!cancelled) setFailed(true);
          return;
        }
        svgCache.set(url, text);
        if (!cancelled) setSvgString(text);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [svgSource]);

  const tinted = useMemo(() => {
    if (!svgString) return null;
    if (!looksLikeSvgXml(svgString)) return null;

    if (color && !colors) {
      const re = /(<svg[^>]*\bfill=["'])([^"']*)(["'])/;
      if (re.test(svgString)) return svgString.replace(re, `$1${color}$3`);
      return svgString.replace(/<svg([^>]*)>/, `<svg$1 fill="${color}">`);
    }
    if (colors) return applyColors(svgString, colors);
    return svgString;
  }, [svgString, color, colors]);

  // Success path: render the SVG
  if (tinted && !failed) {
    return <SvgXml xml={tinted} width={size} height={size} />;
  }

  // Fallback: show PNG / JPG image if provided
  if (imageUrl) {
    const src = typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl;
    return (
      <Image
        source={src}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    );
  }

  // Nothing to show — empty spacer
  return <View style={{ width: size, height: size }} />;
}