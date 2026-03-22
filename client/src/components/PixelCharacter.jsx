import React, { useMemo } from 'react';

// ── Pixel grid definitions ────────────────────────────────────────────────
// 0 = transparent, 1 = suit, 2 = visor, 3 = dark suit (shadow), 4 = backpack
const BASE_GRID = [
  [0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0],
  [0,1,2,2,2,2,1,0],
  [0,1,2,2,2,2,1,0],
  [0,1,1,1,1,1,1,0],
  [4,1,1,1,1,1,1,0],
  [4,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0],
  [0,3,1,1,1,1,3,0],
  [0,3,3,0,0,3,3,0],
  [0,3,3,0,0,3,3,0],
  [0,3,3,0,0,3,3,0],
];

// ── Hat/accessory overlays ────────────────────────────────────────────────
// Each hat is an array of { row, col, color } pixel overrides
const HATS = {
  none: [],
  crown: [
    { r:0, c:1, col:'#f5c518' }, { r:0, c:3, col:'#f5c518' }, { r:0, c:5, col:'#f5c518' },
    { r:-1, c:1, col:'#f5c518' }, { r:-1, c:2, col:'#f5c518' }, { r:-1, c:3, col:'#f5c518' },
    { r:-1, c:4, col:'#f5c518' }, { r:-1, c:5, col:'#f5c518' },
    { r:-1, c:1, col:'#f5c518' },
    { r:-2, c:1, col:'#f5c518' }, { r:-2, c:3, col:'#e04040' }, { r:-2, c:5, col:'#f5c518' },
  ],
  wizard: [
    { r:-1, c:2, col:'#7b3fb0' }, { r:-1, c:3, col:'#7b3fb0' }, { r:-1, c:4, col:'#7b3fb0' },
    { r:-2, c:3, col:'#7b3fb0' }, { r:-2, c:4, col:'#7b3fb0' },
    { r:-3, c:3, col:'#7b3fb0' },
    { r:-4, c:3, col:'#f5c518' }, // star
  ],
  headphones: [
    { r:0, c:1, col:'#2c2c2c' }, { r:1, c:1, col:'#2c2c2c' }, { r:2, c:1, col:'#2c2c2c' },
    { r:0, c:6, col:'#2c2c2c' }, { r:1, c:6, col:'#2c2c2c' }, { r:2, c:6, col:'#2c2c2c' },
    { r:-1, c:1, col:'#2c2c2c' }, { r:-1, c:2, col:'#2c2c2c' }, { r:-1, c:3, col:'#2c2c2c' },
    { r:-1, c:4, col:'#2c2c2c' }, { r:-1, c:5, col:'#2c2c2c' }, { r:-1, c:6, col:'#2c2c2c' },
  ],
  cowboy: [
    { r:-1, c:0, col:'#8B6914' }, { r:-1, c:1, col:'#8B6914' }, { r:-1, c:2, col:'#8B6914' },
    { r:-1, c:3, col:'#8B6914' }, { r:-1, c:4, col:'#8B6914' }, { r:-1, c:5, col:'#8B6914' },
    { r:-1, c:6, col:'#8B6914' }, { r:-1, c:7, col:'#8B6914' },
    { r:-2, c:2, col:'#8B6914' }, { r:-2, c:3, col:'#8B6914' }, { r:-2, c:4, col:'#8B6914' }, { r:-2, c:5, col:'#8B6914' },
    { r:-3, c:3, col:'#8B6914' }, { r:-3, c:4, col:'#8B6914' },
  ],
  halo: [
    { r:-1, c:2, col:'#f5e05a' }, { r:-1, c:3, col:'#f5e05a' },
    { r:-1, c:4, col:'#f5e05a' }, { r:-1, c:5, col:'#f5e05a' },
    { r:-2, c:1, col:'#f5e05a' }, { r:-2, c:6, col:'#f5e05a' },
  ],
};

// ── Walking animation frames ──────────────────────────────────────────────
// Offsets applied to leg rows (rows 10-12) for walking feel
const WALK_FRAMES = [
  { l: 0, r: 0 },
  { l: -1, r: 1 },
  { l: 0, r: 0 },
  { l: 1, r: -1 },
];

export const SUIT_COLORS = [
  { id: 'red',     hex: '#e74c3c' },
  { id: 'blue',    hex: '#3498db' },
  { id: 'green',   hex: '#2ecc71' },
  { id: 'yellow',  hex: '#f1c40f' },
  { id: 'purple',  hex: '#9b59b6' },
  { id: 'orange',  hex: '#e67e22' },
  { id: 'cyan',    hex: '#1abc9c' },
  { id: 'pink',    hex: '#e91e8c' },
  { id: 'white',   hex: '#ecf0f1' },
  { id: 'lime',    hex: '#8bc34a' },
  { id: 'brown',   hex: '#795548' },
  { id: 'maroon',  hex: '#880e4f' },
];

export const VISOR_COLORS = [
  { id: 'white',  hex: '#cce8ff' },
  { id: 'gold',   hex: '#ffe680' },
  { id: 'red',    hex: '#ff8080' },
  { id: 'cyan',   hex: '#80ffee' },
  { id: 'purple', hex: '#d4a0ff' },
];

export const HAT_OPTIONS = [
  { id: 'none',       label: '—'  },
  { id: 'crown',      label: '👑' },
  { id: 'wizard',     label: '🧙' },
  { id: 'headphones', label: '🎧' },
  { id: 'cowboy',     label: '🤠' },
  { id: 'halo',       label: '😇' },
];

export const DEFAULT_CHARACTER = {
  suitColor:  '#e74c3c',
  visorColor: '#cce8ff',
  hat:        'none',
};

// ── Main component ────────────────────────────────────────────────────────
export default function PixelCharacter({
  suitColor  = '#e74c3c',
  visorColor = '#cce8ff',
  hat        = 'none',
  size       = 32,          // pixel size of one cell
  animate    = false,       // walking animation
  frame      = 0,           // 0-3, controlled externally for sync
  style      = {},
}) {
  const px = size;          // one pixel = px × px square
  const cols = 8;
  const rows = BASE_GRID.length;

  // Shadow = slightly darker suit
  const dark = useMemo(() => {
    const m = suitColor.match(/^#([0-9a-f]{6})$/i);
    if (!m) return '#222';
    let r = parseInt(m[1].slice(0,2), 16);
    let g = parseInt(m[1].slice(2,4), 16);
    let b = parseInt(m[1].slice(4,6), 16);
    r = Math.max(0, r - 50);
    g = Math.max(0, g - 50);
    b = Math.max(0, b - 50);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }, [suitColor]);

  const hatPixels = HATS[hat] || [];

  // Build a color lookup for hat pixels: key = `${r},${c}` → hex
  const hatMap = useMemo(() => {
    const m = {};
    hatPixels.forEach(({ r, c, col }) => { m[`${r},${c}`] = col; });
    return m;
  }, [hat]);

  // Walking frame offsets for left/right leg columns
  const wf = animate ? WALK_FRAMES[frame % 4] : WALK_FRAMES[0];

  // Determine extra hat rows needed (negative row indices)
  const minHatRow = hatPixels.length ? Math.min(...hatPixels.map(h => h.r)) : 0;
  const hatRowOffset = Math.abs(Math.min(0, minHatRow)); // how many rows to add on top
  const totalRows = rows + hatRowOffset;
  const svgWidth  = cols * px;
  const svgHeight = totalRows * px;

  function getColor(rowVal) {
    if (rowVal === 0) return 'transparent';
    if (rowVal === 1) return suitColor;
    if (rowVal === 2) return visorColor;
    if (rowVal === 3) return dark;
    if (rowVal === 4) return dark;
    return 'transparent';
  }

  // Build all rectangles
  const rects = [];

  // Hat pixels (above base, negative row indices)
  hatPixels.forEach(({ r, c, col }) => {
    const svgRow = r + hatRowOffset; // offset so min row becomes 0
    if (svgRow < 0 || c < 0 || c >= cols) return;
    rects.push(
      <rect
        key={`hat-${r}-${c}`}
        x={c * px} y={svgRow * px}
        width={px} height={px}
        fill={col}
        shapeRendering="crispEdges"
      />
    );
  });

  // Base grid
  BASE_GRID.forEach((rowArr, ri) => {
    rowArr.forEach((cell, ci) => {
      if (cell === 0) return;

      // Check if hat overrides this cell
      const hatKey = `${ri - hatRowOffset},${ci}`;
      const hatColor = hatMap[hatKey];

      const svgRow = ri + hatRowOffset;
      const color = hatColor || getColor(cell);

      rects.push(
        <rect
          key={`${ri}-${ci}`}
          x={ci * px} y={svgRow * px}
          width={px} height={px}
          fill={color}
          shapeRendering="crispEdges"
        />
      );
    });
  });

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
    >
      {rects}
    </svg>
  );
}
