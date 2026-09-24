import React, { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Module-level cache — SVG source is fetched once per URL and reused
// across every instance of this component.
const svgCache = new Map<string, string>();


/**
 * Synchronously returns the cached SVG XML for a given URL, or null.
 * Safe to call from JS (not from worklets).
 */
export function getCachedSvgXml(url?: string | null): string | null {
  if (!url) return null;
  return svgCache.get(url) ?? null;
}

/**
 * Fire-and-forget prefetch. Populates the cache so the next render
 * hits the fast path (no fetch).
 */
export function prefetchSvg(url?: string | null): void {
  if (!url || !url.startsWith('http')) return;
  if (svgCache.has(url)) return;
  fetch(url)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('failed'))))
    .then((text) => svgCache.set(url, text))
    .catch(() => { /* ignore — component will retry on its own render */ });
}

/**
 * Applies per-part color overrides to an SVG string.
 * Targets elements that declare `data-part="<part>"` and also have a
 * `fill="…"` attribute. Safe to call with null/empty colors — returns
 * the SVG unchanged.
 */
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
  /** Raw SVG XML string, or an HTTP URL pointing to an .svg file. */
  svgSource?: string | null;
  /**
   * Fallback image source. Accepts anything <Image source={...}> accepts:
   *   - a number (result of require('...'))
   *   - { uri: 'https://...' }
   *   - a plain string URL (rare)
   */
  imageUrl?: any;
  /** Rendered size (width and height) in pixels. */
  size: number;
  /** Single-color tint — replaces the root <svg> fill. */
  color?: string | null;
  /** Multi-part tint — maps data-part names to hex colors. */
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

  // ── Resolve the SVG source into a string ──
  // Inline XML → use directly.
  // HTTP URL   → check cache, else fetch once and cache.
useEffect(() => {
  let cancelled = false;
  setFailed(false);
  setSvgString(null);

  const trySource = async (source: string): Promise<string | null> => {
    if (!source.startsWith('http')) return source;
    const cached = svgCache.get(source);
    if (cached) return cached;
    try {
      const r = await fetch(source, { headers: { Accept: 'image/svg+xml,text/plain,*/*' } });
      if (!r.ok) return null;
      const text = await r.text();
      // Validate it looks like SVG
      if (!text.trim().startsWith('<svg') && !text.includes('<svg')) return null;
      svgCache.set(source, text);
      return text;
    } catch {
      return null;
    }
  };

  const resolve = async () => {
    if (svgSource) {
      const primary = await trySource(svgSource);
      if (cancelled) return;
      if (primary) { setSvgString(primary); return; }
    }
    if (!cancelled) setFailed(true);
  };

  resolve();
  return () => { cancelled = true; };
}, [svgSource]);

  // ── Apply tints ──
  // Only recomputes when the SVG string or the color inputs change.
  // Never runs during a drag gesture (position lives in the parent).
  const tinted = useMemo(() => {
    if (!svgString) return null;

    // Single-color: override the root <svg> fill.
    if (color && !colors) {
      const re = /(<svg[^>]*\bfill=["'])([^"']*)(["'])/;
      if (re.test(svgString)) {
        return svgString.replace(re, `$1${color}$3`);
      }
      // No root fill attribute — inject one.
      return svgString.replace(/<svg([^>]*)>/, `<svg$1 fill="${color}">`);
    }

    // Multi-part: override specific data-part fills.
    if (colors) return applyColors(svgString, colors);

    return svgString;
  }, [svgString, color, colors]);

    // ── Render with fallback chain: SVG → PNG → empty spacer ──
  if (tinted && !failed) {
    return <SvgXml xml={tinted} width={size} height={size} />;
  }

  if (imageUrl) {
    // Normalize: strings → { uri }, everything else passed through.
    const src = typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl;
    return (
      <Image
        source={src}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    );
  }

  // Nothing usable — return an empty spacer so the parent layout doesn't break.
  return <View style={{ width: size, height: size }} />;
}