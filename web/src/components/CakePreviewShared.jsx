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
  if (decorations.length === 0) {
    if (emptyState) return emptyState;
    return (
      <div
        style={{
          width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f5f0ea', borderRadius: 8, border: '1px solid #ddd',
          color: '#A6A29A', fontSize: '0.8rem',
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

        const imageUrl =
          typeof getFullImageUrl === 'function' ? getFullImageUrl(dec.image_url) : null;
        const fallbackUrl =
          typeof getFallbackUrl === 'function' ? getFallbackUrl(dec.element_name) : null;

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
            }}
          >
            <SvgDecorationWeb
              svgSource={dec.svg_source}
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