// Inline SVG string used by the cake customization canvas.
// Keep in sync with mobile/assets/images/cake-base.svg (the design source of truth).
export const CAKE_BASE_XML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="top" cx="50%" cy="45%" r="60%">
      <stop offset="0%"  stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F2EDE4"/>
    </radialGradient>
    <linearGradient id="side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#F7F2E8"/>
      <stop offset="100%" stop-color="#E2DCCF"/>
    </linearGradient>
  </defs>
  <ellipse cx="200" cy="255" rx="150" ry="90" fill="url(#side)"/>
  <ellipse cx="200" cy="175" rx="150" ry="90" fill="url(#top)" stroke="#D9D2C3" stroke-width="1.5"/>
  <ellipse cx="200" cy="165" rx="120" ry="65" fill="url(#top)" opacity="0.6"/>
</svg>
`.trim();