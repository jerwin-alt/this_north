// web/src/components/SvgDecorationWeb.jsx
import React, { useEffect, useMemo, useState } from 'react';

const svgCache = new Map();

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

function forceSvgFill(svg) {
  return svg.replace(/<svg([^>]*)>/, (_, attrs) => {
    const cleaned = attrs
      .replace(/\swidth=["'][^"']*["']/g, '')
      .replace(/\sheight=["'][^"']*["']/g, '');
    return `<svg${cleaned} width="100%" height="100%">`;
  });
}

// ─── Inner component that uses hooks — only rendered when tint is needed ───
function TintedSvg({ svgSource, size, color, colors, onFail }) {
  const [svgString, setSvgString] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (!svgSource) { setSvgString(null); return; }

    if (!svgSource.startsWith('http')) { setSvgString(svgSource); return; }

    const cached = svgCache.get(svgSource);
    if (cached) { setSvgString(cached); return; }

    fetch(svgSource)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('svg fetch failed'))))
      .then((text) => {
        if (cancelled) return;
        svgCache.set(svgSource, text);
        setSvgString(text);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, [svgSource]);

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

  useEffect(() => {
    if (failed && onFail) onFail();
  }, [failed, onFail]);

  if (!tinted || failed) return null;

  return (
    <div
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: tinted }}
    />
  );
}

// ─── Public component: no hooks, just picks the right strategy ───
export default function SvgDecorationWeb({
  svgSource,
  imageUrl,
  fallbackUrl,
  size,
  color,
  colors,
}) {
  const [tintFailed, setTintFailed] = useState(false);

  // Fallback chain (in order):
  //   1. If SVG is present and no tint needed → <img> (no CORS)
  //   2. If SVG is present and tint needed → fetch + inline (needs CORS)
  //   3. imageUrl (backend PNG)
  //   4. fallbackUrl (local asset)
  //   5. empty spacer

  if (svgSource && !tintFailed) {
    const needsTint = !!(color || colors);

    if (!needsTint) {
      // Pure <img> path — cross-origin safe
      return (
        <img
          src={svgSource}
          alt=""
          style={{ width: size, height: size, objectFit: 'contain' }}
          onError={() => setTintFailed(true)}
        />
      );
    }

    // Fetch + inline path (works only if CORS is set up)
    return (
      <TintedSvg
        svgSource={svgSource}
        size={size}
        color={color}
        colors={colors}
        onFail={() => setTintFailed(true)}
      />
    );
  }

  // PNG fallbacks
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain' }}
        onError={() => { /* silently fail */ }}
      />
    );
  }

  if (fallbackUrl) {
    return (
      <img
        src={fallbackUrl}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  return <div style={{ width: size, height: size }} />;
}