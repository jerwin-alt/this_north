// web/src/utils/cakeSvgBuilder.js
// Mirrors mobile/constants/cakeBase.ts so web previews render the same cake shape,
// tier structure, and per-tier icing colors as the mobile app.

const DEFAULT_WALL = 'url(#wall_grad)';
const DEFAULT_TOP  = 'url(#top_grad)';

/** Per-tier geometry. Index 0 = bottom tier. */
export function getTierGeometries(shape, tierCount) {
  if (tierCount === 1) {
    return [{ cx: 200, cyTop: 175, rx: 150, ry: 90, wallH: 80 }];
  }
  if (tierCount === 2) {
    return [
      { cx: 200, cyTop: 230, rx: 145, ry: 85, wallH: 75 }, // bottom
      { cx: 200, cyTop: 140, rx: 95,  ry: 55, wallH: 90 }, // top
    ];
  }
  return [
    { cx: 200, cyTop: 250, rx: 140, ry: 80, wallH: 60 }, // tier 1
    { cx: 200, cyTop: 180, rx: 105, ry: 60, wallH: 70 }, // tier 2
    { cx: 200, cyTop: 110, rx: 70,  ry: 40, wallH: 70 }, // tier 3
  ];
}

function tierWallPath(g) {
  const { cx, cyTop, rx, ry, wallH } = g;
  return `M ${cx - rx} ${cyTop} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cyTop} L ${cx + rx} ${cyTop + wallH} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cyTop + wallH} Z`;
}

function buildSingleSquareSvg(tierFrostings = {}) {
  const left = 50, right = 350, top = 85, bottom = 265, r = 24, wallH = 80;
  const f = tierFrostings[0] || {};
  const wallFill = f.side || DEFAULT_WALL;
  const topFill  = f.top  || DEFAULT_TOP;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="top_grad" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F2EDE4"/>
    </radialGradient>
    <linearGradient id="wall_grad" x1="0" y1="0" x2="0" y2="1">
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

/**
 * Build a base cake SVG with icing colors baked in.
 * @param {Object} opts
 * @param {'round'|'square'} opts.shape
 * @param {number} opts.tierCount 1..3
 * @param {Object} opts.tierFrostings { [tierIndex]: { side?: '#hex', top?: '#hex' } }
 */
export function buildCakeSvg({ shape = 'round', tierCount = 1, tierFrostings = {} } = {}) {
  if (tierCount === 1 && shape === 'square') {
    return buildSingleSquareSvg(tierFrostings);
  }

  const geometries = getTierGeometries(shape, tierCount);

  const defs = `
  <defs>
    <radialGradient id="top_grad" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F2EDE4"/>
    </radialGradient>
    <linearGradient id="wall_grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8DFC8"/>
      <stop offset="100%" stop-color="#C9BCA0"/>
    </linearGradient>
  </defs>`;

  let body = '';
  geometries.forEach((g, i) => {
    const f = tierFrostings[i] || {};
    const wallFill = f.side || DEFAULT_WALL;
    const topFill  = f.top  || DEFAULT_TOP;
    body += `
  <path d="${tierWallPath(g)}" fill="${wallFill}" stroke="#A89878" stroke-width="1.5"/>
  <ellipse cx="${g.cx}" cy="${g.cyTop}" rx="${g.rx}" ry="${g.ry}" fill="${topFill}" stroke="#C9BCA0" stroke-width="1.5"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${defs}${body}
</svg>`;
}

export function getIcingPosition(name) {
  const lower = (name || '').toLowerCase();
  return lower.includes('side') ? 'side' : 'top';
}

export function getIcingColorFromName(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('chocolate'))  return '#5C3524';
  if (lower.includes('strawberry')) return '#F4A6B8';
  if (lower.includes('vanilla'))    return '#FDF6E3';
  return '#F4A6B8';
}

/**
 * Convert a design's decorations array into a per-tier icing color map.
 * Icing entries are identified by element_type === 'icing'.
 */
export function buildTierFrostingsMap(decorations) {
  const map = {};
  (decorations || []).forEach((dec) => {
    if ((dec.element_type || '').toLowerCase() !== 'icing') return;
    const tierIdx = dec.tier_index ?? 0;
    const pos = getIcingPosition(dec.element_name || '');
    const color = getIcingColorFromName(dec.element_name || '');
    if (!map[tierIdx]) map[tierIdx] = {};
    map[tierIdx][pos] = color;
  });
  return map;
}