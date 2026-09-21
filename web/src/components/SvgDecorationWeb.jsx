// web/src/components/SvgDecorationWeb.jsx
import React, { useEffect, useMemo, useState } from 'react';

// Module-level cache — SVG source is fetched once per URL.
const svgCache = new Map();

/**
 * Applies per-part color overrides to an SVG string.
 * Targets elements that declare data-part="<part>" AND have fill="…".
 * Safe to call with null/undefined — returns the SVG unchanged.
 */
function applyColors(svg, colors) {
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

/**
 * Forces the root <svg> to fill its parent by stripping any hard-coded
 * width/height and setting 100%/100%.
 */
function forceSvgFill(svg) {
  return svg.replace(/<svg([^>]*)>/, (_, attrs) => {
    const cleaned = attrs
      .replace(/\swidth=["'][^"']*["']/g, '')
      .replace(/\sheight=["'][^"']*["']/g, '');
    return `<svg${cleaned} width="100%" height="100%">`;
  });
}

export default function SvgDecorationWeb({
  svgSource,
  imageUrl,       // Primary image URL (backend)
  fallbackUrl,    // Fallback image URL (local asset or CDN)
  size,
  color,
  colors,
}) {
  const [svgString, setSvgString] = useState(null);
  const [svgFailed, setSvgFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  // ── Resolve SVG source ──
  useEffect(() => {
    let cancelled = false;
    setSvgFailed(false);

    if (!svgSource) {
      setSvgString(null);
      return;
    }

    if (!svgSource.startsWith('http')) {
      setSvgString(svgSource);
      return;
    }

    const cached = svgCache.get(svgSource);
    if (cached) {
      setSvgString(cached);
      return;
    }

    fetch(svgSource)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('svg fetch failed'))))
      .then((text) => {
        if (cancelled) return;
        svgCache.set(svgSource, text);
        setSvgString(text);
      })
      .catch(() => {
        if (!cancelled) setSvgFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [svgSource]);

  // ── Reset image source when imageUrl or fallbackUrl changes ──
  useEffect(() => {
    setCurrentSrc(imageUrl || fallbackUrl || null);
    setImgFailed(false);
  }, [imageUrl, fallbackUrl]);

  // ── Apply tints ──
  const tinted = useMemo(() => {
    if (!svgString) return null;

    if (color && !colors) {
      const re = /(<svg[^>]*\bfill=["'])([^"']*)(["'])/;
      const filled = re.test(svgString)
        ? svgString.replace(re, `$1${color}$3`)
        : svgString.replace(/<svg([^>]*)>/, `<svg$1 fill="${color}">`);
      return forceSvgFill(filled);
    }

    if (colors) return forceSvgFill(applyColors(svgString, colors));
    return forceSvgFill(svgString);
  }, [svgString, color, colors]);

  // ── Render SVG if available ──
  if (tinted && !svgFailed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        dangerouslySetInnerHTML={{ __html: tinted }}
      />
    );
  }

  // ── Render image with onError → fallback ──
  if (currentSrc && !imgFailed) {
    return (
      <img
        src={currentSrc}
        onError={() => {
          // Primary failed — try the fallback if we haven't yet.
          if (fallbackUrl && currentSrc !== fallbackUrl) {
            setCurrentSrc(fallbackUrl);
          } else {
            setImgFailed(true);
          }
        }}
        style={{ width: size, height: size, objectFit: 'contain' }}
        alt=""
      />
    );
  }

  // ── Nothing left ──
  return <div style={{ width: size, height: size }} />;
}