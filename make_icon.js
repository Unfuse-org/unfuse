const fs = require('fs');
const path = require('path');

// Read the original octopus logo
const originalLogoBase64 = fs.readFileSync('/Users/lichi/Downloads/logo.png').toString('base64');

// Standard Apple macOS App Icon Squircle SVG (1024x1024 canvas with 824x824 squircle)
const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft Drop Shadow for macOS Dock -->
    <filter id="dockShadow" x="50" y="70" width="924" height="924" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <clipPath id="squircleClip">
      <rect x="100" y="100" width="824" height="824" rx="185" ry="185" />
    </clipPath>
  </defs>
  
  <!-- Base Shadow & Squircle -->
  <rect x="100" y="100" width="824" height="824" rx="185" ry="185" fill="#141416" filter="url(#dockShadow)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  
  <!-- Inner Subtle Border -->
  <rect x="102" y="102" width="820" height="820" rx="183" ry="183" fill="#141416" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>

  <!-- Centered Octopus Sprite -->
  <g clip-path="url(#squircleClip)">
    <image href="data:image/png;base64,${originalLogoBase64}" x="212" y="212" width="600" height="600" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>`;

fs.writeFileSync('/Users/lichi/unit01pro/packages/desktop/icon_source.svg', svg);
console.log('Generated Apple Squircle SVG!');
