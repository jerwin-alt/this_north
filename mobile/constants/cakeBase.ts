export type CakeShape = 'round' | 'square';

export interface TierFrostings {
  [tierIndex: number]: {
    side?: string | null;
    top?: string | null;
  };
}

export interface CakeConfig {
  shape: CakeShape;
  sizeInches?: number;
  tierCount?: number;
  tierFrostings?: TierFrostings;   // ← NEW
}

export interface TierGeometry {
  cx: number;
  cyTop: number;
  rx: number;
  ry: number;
  wallH: number;
}

/**
 * Returns per-tier geometry for a cake.
 * Tier index 0 = bottom tier (largest), index tierCount-1 = top tier (smallest).
 * Square shape with tierCount > 1 falls back to round geometry.
 */
export function getTierGeometries(shape: CakeShape, tierCount: number): TierGeometry[] {
  // Square tiers use round geometry in Phase 2a
  if (tierCount === 1) {
    if (shape === 'square') {
      // Reuse the single-tier square geometry via a special marker:
      // The caller (buildCakeSvg) special-cases this.
      return [{ cx: 200, cyTop: 175, rx: 150, ry: 90, wallH: 80 }];
    }
    return [{ cx: 200, cyTop: 175, rx: 150, ry: 90, wallH: 80 }];
  }

  if (tierCount === 2) {
    return [
      { cx: 200, cyTop: 230, rx: 145, ry: 85, wallH: 75 },  // tier 1 (bottom)
      { cx: 200, cyTop: 140, rx: 95,  ry: 55, wallH: 90 },  // tier 2 (top)
    ];
  }

  // 3 tiers
  return [
    { cx: 200, cyTop: 250, rx: 140, ry: 80, wallH: 60 },  // tier 1
    { cx: 200, cyTop: 180, rx: 105, ry: 60, wallH: 70 },  // tier 2
    { cx: 200, cyTop: 110, rx: 70,  ry: 40, wallH: 70 },  // tier 3 (top)
  ];
}

/** Builds the wall path for a single tier. */
function tierWallPath(g: TierGeometry): string {
  const { cx, cyTop, rx, ry, wallH } = g;
  return `M ${cx - rx} ${cyTop} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cyTop} L ${cx + rx} ${cyTop + wallH} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cyTop + wallH} Z`;
}

/** Single-tier square cake SVG (unchanged from Phase 1). */
function buildSingleSquareSvg(): string {
  const left = 50, right = 350, top = 85, bottom = 265, r = 24, wallH = 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="sq_top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F2EDE4"/>
    </linearGradient>
    <linearGradient id="sq_side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8DFC8"/>
      <stop offset="100%" stop-color="#C9BCA0"/>
    </linearGradient>
  </defs>
  <path d="M ${left} ${top + r} Q ${left} ${top} ${left + r} ${top} L ${right - r} ${top} Q ${right} ${top} ${right} ${top + r} L ${right} ${bottom + wallH - r} Q ${right} ${bottom + wallH} ${right - r} ${bottom + wallH} L ${left + r} ${bottom + wallH} Q ${left} ${bottom + wallH} ${left} ${bottom + wallH - r} Z" fill="url(#sq_side)" stroke="#A89878" stroke-width="1.5"/>
  <rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${r}" ry="${r}" fill="url(#sq_top)" stroke="#C9BCA0" stroke-width="1.5"/>
</svg>`;
}

/**
 * Builds the base cake SVG.
 * For tierCount = 1, respects the shape.
 * For tierCount > 1, always uses round tier geometry (Phase 2a limitation).
 */
export function buildCakeSvg({
  shape,
  tierCount = 1,
  tierFrostings = {},
}: CakeConfig): string {
  // Single-tier square — icing support for single square
  if (tierCount === 1 && shape === 'square') {
    const left = 50, right = 350, top = 85, bottom = 265, r = 24, wallH = 80;
    const f = tierFrostings[0] || {};
    const wallFill = f.side || 'url(#sq_side)';
    const topFill  = f.top  || 'url(#sq_top)';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="sq_top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F2EDE4"/>
    </linearGradient>
    <linearGradient id="sq_side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8DFC8"/>
      <stop offset="100%" stop-color="#C9BCA0"/>
    </linearGradient>
  </defs>
  <path d="M ${left} ${top + r} Q ${left} ${top} ${left + r} ${top} L ${right - r} ${top} Q ${right} ${top} ${right} ${top + r} L ${right} ${bottom + wallH - r} Q ${right} ${bottom + wallH} ${right - r} ${bottom + wallH} L ${left + r} ${bottom + wallH} Q ${left} ${bottom + wallH} ${left} ${bottom + wallH - r} Z"
        fill="${wallFill}" stroke="#A89878" stroke-width="1.5"/>
  <rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${r}" ry="${r}"
        fill="${topFill}" stroke="#C9BCA0" stroke-width="1.5"/>
</svg>`;
  }

  // Round — supports any tierCount with per-tier icing colors
  const geometries = getTierGeometries(shape, tierCount);
  const gradId = tierCount === 1 ? 'rd' : 'mt';

  const defs = `
  <defs>
    <radialGradient id="${gradId}_top" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F2EDE4"/>
    </radialGradient>
    <linearGradient id="${gradId}_side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8DFC8"/>
      <stop offset="100%" stop-color="#C9BCA0"/>
    </linearGradient>
  </defs>`;

  // Draw bottom tier → top tier. Each tier's wall covers the previous tier's
  // top ellipse's front — this is what produces correct tier occlusion.
  let body = '';
  geometries.forEach((g, i) => {
    const f = tierFrostings[i] || {};
    const wallFill = f.side || `url(#${gradId}_side)`;
    const topFill  = f.top  || `url(#${gradId}_top)`;

    body += `
  <!-- Tier ${i + 1} wall -->
  <path d="${tierWallPath(g)}" fill="${wallFill}" stroke="#A89878" stroke-width="1.5"/>
  <!-- Tier ${i + 1} top -->
  <ellipse cx="${g.cx}" cy="${g.cyTop}" rx="${g.rx}" ry="${g.ry}"
           fill="${topFill}" stroke="#C9BCA0" stroke-width="1.5"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${defs}${body}
</svg>`;
}

/* ── Icing builders (existing + tier-aware) ── */

export function getIcingPosition(elementName: string): 'top' | 'side' {
  const lower = (elementName || '').toLowerCase();
  if (lower.includes('side')) return 'side';
  return 'top';
}

export function getIcingColorFromName(elementName: string): string {
  const lower = (elementName || '').toLowerCase();
  if (lower.includes('chocolate'))  return '#5C3524';
  if (lower.includes('strawberry')) return '#F4A6B8';
  if (lower.includes('vanilla'))    return '#FDF6E3';
  return '#F4A6B8';
}

/**
 * Builds icing for a specific tier.
 * tierIndex: 0 = bottom tier, tierCount-1 = top tier.
 */
export function buildIcingSvg({
  shape,
  position,
  color,
  tierIndex = 0,
  tierCount = 1,
}: {
  shape: CakeShape;
  position: 'top' | 'side';
  color: string;
  tierIndex?: number;
  tierCount?: number;
}): string {
  const strokeColor = 'rgba(0,0,0,0.18)';

  // Square single-tier icing (unchanged)
  if (shape === 'square' && tierCount === 1) {
    const left = 50, right = 350, top = 85, bottom = 265, r = 24, wallH = 80;
    if (position === 'top') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${r}" ry="${r}" fill="${color}" stroke="${strokeColor}" stroke-width="2"/>
</svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <path d="M ${left} ${top + r} Q ${left} ${top} ${left + r} ${top} L ${right - r} ${top} Q ${right} ${top} ${right} ${top + r} L ${right} ${bottom + wallH - r} Q ${right} ${bottom + wallH} ${right - r} ${bottom + wallH} L ${left + r} ${bottom + wallH} Q ${left} ${bottom + wallH} ${left} ${bottom + wallH - r} Z" fill="${color}" stroke="${strokeColor}" stroke-width="2"/>
</svg>`;
  }

  // Round (any tier count)
  const geometries = getTierGeometries(shape, tierCount);
  const safeTierIndex = Math.max(0, Math.min(tierIndex, geometries.length - 1));
  const g = geometries[safeTierIndex];

  if (position === 'top') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <ellipse cx="${g.cx}" cy="${g.cyTop}" rx="${g.rx}" ry="${g.ry}" fill="${color}" stroke="${strokeColor}" stroke-width="2"/>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <path d="${tierWallPath(g)}" fill="${color}" stroke="${strokeColor}" stroke-width="2"/>
</svg>`;
}

/* ── Legacy export ── */
export const CAKE_BASE_XML = buildCakeSvg({ shape: 'round', tierCount: 1 });