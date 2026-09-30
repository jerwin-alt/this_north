// web/src/components/CakePreviewShared.jsx
import React from 'react';
import SvgDecorationWeb from './SvgDecorationWeb';
import { buildCakeSvg, buildTierFrostingsMap } from '../utils/cakeSvgBuilder';

const CANVAS_SIZE = 400;

export default function CakePreviewShared({
  design,
  size = 100,
  emptyState = null,
  getFullImageUrl,
  getFallbackUrl,
}) {
  const decorations = design?.decorations_with_elements || [];
  const shape = design?.cake_size?.shape || 'round';
  const tierCount = design?.tiers ?? 1;

  const tierFrostings = buildTierFrostingsMap(decorations);
  const cakeXml = buildCakeSvg({ shape, tierCount, tierFrostings });

  const nonIcing = decorations.filter(
    (d) => (d.element_type || '').toLowerCase() !== 'icing'
  );

  // Empty state passed by the caller (e.g. "No decorations" or a 🎂 tile)
  // Walk-in custom cake with a reference image but no SVG decorations
  if (decorations.length === 0) {
    // Prefer the accessor output (`/storage/reference_images/...`),
    // fall back to the raw DB value if the accessor isn't available.
    const refImage = design?.reference_image_url || design?.reference_image;

    if (refImage) {
      // Resolve relative → absolute using the caller's helper.
      // If the caller didn't provide one, try a sensible default.
      const API_ORIGIN =
        (typeof window !== 'undefined' && window.__API_ORIGIN__) ||
        'http://localhost:8000';

      const refSrc = (() => {
        if (refImage.startsWith('http://') || refImage.startsWith('https://')) {
          return refImage;
        }
        if (typeof getFullImageUrl === 'function') {
          return getFullImageUrl(refImage);
        }
        return `${API_ORIGIN}${refImage.startsWith('/') ? '' : '/'}${refImage}`;
      })();

      return (
        <div
          style={{
            width: size,
            height: size,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 8,
            background: '#f5f0ea',
            border: '1px solid #ddd',
          }}
        >
          <img
            src={refSrc}
            alt="Custom cake reference"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML =
                '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#A6A29A;font-size:0.75rem;padding:8px;text-align:center">Reference image unavailable</div>';
            }}
          />
        </div>
      );
    }

    if (emptyState) return emptyState;
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f0ea',
          borderRadius: 8,
          border: '1px solid #ddd',
          color: '#A6A29A',
          fontSize: '0.8rem',
        }}
      >
        No decorations
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        background: '#f5f0ea',
        border: '1px solid #ddd',
      }}
    >
      {/* Base cake + icing colors baked in — correct tier z-order */}
      <div
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: cakeXml }}
      />

      {/* Non-icing decorations positioned by (x, y) */}
    {nonIcing.map((dec, idx) => {
        const scaleFactor = dec.scale ?? 1;
        const decSize = (40 / CANVAS_SIZE) * size * scaleFactor;
        const x = (dec.x / CANVAS_SIZE) * size;
        const y = (dec.y / CANVAS_SIZE) * size;
        const rotation = Number(dec.rotation) || 0;   // ← ADD THIS LINE

        const imageUrl =
            typeof getFullImageUrl === 'function' ? getFullImageUrl(dec.image_url) : null;
        const fallbackUrl =
            typeof getFallbackUrl === 'function' ? getFallbackUrl(dec.element_name) : null;

        const svgSourceResolved =
            dec.svg_source && typeof getFullImageUrl === 'function'
            ? getFullImageUrl(dec.svg_source)
            : dec.svg_source;

        return (
            <div
            key={idx}
            style={{
                position: 'absolute',
                left: x - decSize / 2,
                top: y - decSize / 2,
                width: decSize,
                height: decSize,
                pointerEvents: 'none',
                transform: `rotate(${rotation}deg)`,   // ← ADD THIS LINE
            }}
            >
            <SvgDecorationWeb
                svgSource={svgSourceResolved}
                imageUrl={imageUrl}
                fallbackUrl={fallbackUrl}
                size={decSize}
                color={dec.color}
                colors={dec.colors}
            />
            </div>
        );
        })}
    </div>
  );
}