import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '..', 'public', 'avatars');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 16 High-Style, Full-Hair 3D Memoji Avatars
const avatars = [
  {
    id: "avatar-1",
    name: "Purple Cap & Beard",
    skin: { light: "#C48A60", mid: "#A36A42", dark: "#7E4B28" },
    hair: { main: "#1A1412", highlight: "#362620" },
    style: "cap-purple-hair",
    facialHair: "beard",
    glasses: "rect",
  },
  {
    id: "avatar-2",
    name: "Sporty Green Cap",
    skin: { light: "#E8B28B", mid: "#CA8A5A", dark: "#A36336" },
    hair: { main: "#1E1815", highlight: "#3D322B" },
    style: "cap-green-curls",
    facialHair: "stubble",
  },
  {
    id: "avatar-3",
    name: "Chic Wavy Bob & Specs",
    skin: { light: "#EABAA0", mid: "#CB8B69", dark: "#A3623D" },
    hair: { main: "#1F1A18", highlight: "#3F3530" },
    style: "wavy-bob",
    glasses: "rect",
    earrings: true,
  },
  {
    id: "avatar-4",
    name: "Textured Crop Scholar",
    skin: { light: "#F2C7A8", mid: "#D69F78", dark: "#B3744A" },
    hair: { main: "#231F20", highlight: "#443E40" },
    style: "textured-crop",
    glasses: "round",
  },
  {
    id: "avatar-5",
    name: "Voluminous Curls",
    skin: { light: "#F5C7A9", mid: "#D89E78", dark: "#B0714B" },
    hair: { main: "#5C2415", highlight: "#853720" },
    style: "long-waves",
    earrings: true,
  },
  {
    id: "avatar-6",
    name: "Voluminous Afro",
    skin: { light: "#9C6644", mid: "#7F4E2D", dark: "#5A3319" },
    hair: { main: "#181312", highlight: "#312623" },
    style: "afro",
    facialHair: "beard",
  },
  {
    id: "avatar-7",
    name: "Dapper Quiff",
    skin: { light: "#ECC09E", mid: "#CB946E", dark: "#A36B45" },
    hair: { main: "#2C1D18", highlight: "#52362C" },
    style: "quiff",
    facialHair: "stubble",
  },
  {
    id: "avatar-8",
    name: "Blue Beanie & Long Locks",
    skin: { light: "#EABAA0", mid: "#C88E6E", dark: "#9F6544" },
    hair: { main: "#1E1815", highlight: "#3B2E28" },
    style: "beanie-hair",
    facialHair: "stubble",
  },
  {
    id: "avatar-9",
    name: "Violet Sleek Bob",
    skin: { light: "#FCE1D0", mid: "#E2B299", dark: "#BE866A" },
    hair: { main: "#581C87", highlight: "#7E22CE" },
    style: "sleek-bob",
    earrings: true,
  },
  {
    id: "avatar-10",
    name: "Curtain Bangs",
    skin: { light: "#F7D5C2", mid: "#DCAB92", dark: "#BA8267" },
    hair: { main: "#3B2016", highlight: "#613626" },
    style: "curtain-bangs",
    earrings: true,
  },
  {
    id: "avatar-11",
    name: "High Curly Bun",
    skin: { light: "#A66D46", mid: "#824D28", dark: "#5E3314" },
    hair: { main: "#141110", highlight: "#2B2422" },
    style: "top-bun",
    earrings: true,
  },
  {
    id: "avatar-12",
    name: "Slicked Back Volume",
    skin: { light: "#EABEA2", mid: "#C99573", dark: "#A36B48" },
    hair: { main: "#1C1917", highlight: "#38322E" },
    style: "slick-back",
    facialHair: "stubble",
  },
  {
    id: "avatar-13",
    name: "Golden Waves",
    skin: { light: "#FDE6D2", mid: "#E4BFA3", dark: "#C39474" },
    hair: { main: "#B45309", highlight: "#D97706" },
    style: "long-waves",
    earrings: true,
  },
  {
    id: "avatar-14",
    name: "Backward Red Cap & Hair",
    skin: { light: "#E5B08C", mid: "#C4885F", dark: "#9F6339" },
    hair: { main: "#201A18", highlight: "#3F3330" },
    style: "cap-red-hair",
    facialHair: "beard",
  },
  {
    id: "avatar-15",
    name: "Crown Braids",
    skin: { light: "#8D5634", mid: "#6D3B1C", dark: "#4D260F" },
    hair: { main: "#110D0C", highlight: "#2E2420" },
    style: "braids",
    earrings: true,
  },
  {
    id: "avatar-16",
    name: "Electric Blue Crop",
    skin: { light: "#ECC09E", mid: "#CA8E64", dark: "#A36336" },
    hair: { main: "#1D4ED8", highlight: "#3B82F6" },
    style: "quiff",
    glasses: "rect",
  },
];

function generateSvg(av) {
  const gid = `sk-${av.id}`;
  const hid = `hr-${av.id}`;
  const shid = `sh-${av.id}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <!-- 3D Skin Radial Gradient (Highlight top-left, depth bottom-right) -->
    <radialGradient id="${gid}" cx="44%" cy="40%" r="56%" fx="38%" fy="32%">
      <stop offset="0%" stop-color="${av.skin.light}" />
      <stop offset="65%" stop-color="${av.skin.mid}" />
      <stop offset="100%" stop-color="${av.skin.dark}" />
    </radialGradient>

    <!-- 3D Hair Shading -->
    <linearGradient id="${hid}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${av.hair.highlight}" />
      <stop offset="100%" stop-color="${av.hair.main}" />
    </linearGradient>

    <!-- 3D Depth Shadow Filter -->
    <filter id="${shid}" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-opacity="0.22" />
    </filter>
  </defs>

  <!-- ================= HAIR BACK LAYER (Mass behind head) ================= -->
  ${av.style === 'long-waves' ? `
    <!-- Thick flowing hair behind shoulders & neck -->
    <path d="M16 35 C12 60, 10 88, 26 98 C32 88, 34 76, 32 60 C32 40, 24 35, 16 35 Z" fill="url(#${hid})" />
    <path d="M84 35 C88 60, 90 88, 74 98 C68 88, 66 76, 68 60 C68 40, 76 35, 84 35 Z" fill="url(#${hid})" />
  ` : ''}
  ${av.style === 'wavy-bob' || av.style === 'sleek-bob' ? `
    <!-- Full Bob Hair Back & Sides -->
    <path d="M18 36 C13 55, 14 78, 28 85 C32 75, 33 62, 33 48 Z" fill="url(#${hid})" />
    <path d="M82 36 C87 55, 86 78, 72 85 C68 75, 67 62, 67 48 Z" fill="url(#${hid})" />
  ` : ''}
  ${av.style === 'curtain-bangs' ? `
    <path d="M19 38 C14 58, 16 80, 29 86 C32 75, 34 62, 33 48 Z" fill="url(#${hid})" />
    <path d="M81 38 C86 58, 84 80, 71 86 C68 75, 66 62, 67 48 Z" fill="url(#${hid})" />
  ` : ''}
  ${av.style === 'afro' ? `
    <!-- Massive Volumetric Afro surrounding the entire head -->
    <circle cx="50" cy="40" r="38" fill="url(#${hid})" filter="url(#${shid})" />
    <!-- Texture curl bumps -->
    <circle cx="20" cy="30" r="10" fill="url(#${hid})" />
    <circle cx="80" cy="30" r="10" fill="url(#${hid})" />
    <circle cx="28" cy="16" r="12" fill="url(#${hid})" />
    <circle cx="72" cy="16" r="12" fill="url(#${hid})" />
    <circle cx="50" cy="11" r="13" fill="url(#${hid})" />
  ` : ''}
  ${av.style === 'top-bun' ? `
    <!-- Big top bun puff -->
    <circle cx="50" cy="14" r="15" fill="url(#${hid})" filter="url(#${shid})" />
  ` : ''}

  <!-- ================= NECK & EARS ================= -->
  <path d="M41 72 L41 94 C41 97, 59 97, 59 94 L59 72 Z" fill="${av.skin.dark}" />
  <path d="M42 72 C46 79, 54 79, 58 72 Z" fill="${av.skin.dark}" opacity="0.6" />

  <!-- Left Ear -->
  <ellipse cx="23" cy="53" rx="5.5" ry="8" fill="${av.skin.mid}" />
  <ellipse cx="24" cy="53" rx="3.5" ry="5.5" fill="${av.skin.dark}" />
  <!-- Right Ear -->
  <ellipse cx="77" cy="53" rx="5.5" ry="8" fill="${av.skin.mid}" />
  <ellipse cx="76" cy="53" rx="3.5" ry="5.5" fill="${av.skin.dark}" />
  ${av.earrings ? `
    <circle cx="23" cy="59" r="2.2" fill="#FBBF24" stroke="#D97706" stroke-width="0.6" />
    <circle cx="77" cy="59" r="2.2" fill="#FBBF24" stroke="#D97706" stroke-width="0.6" />
  ` : ''}

  <!-- ================= HEAD BASE ================= -->
  <path d="M26 44 C26 22, 74 22, 74 44 C74 66, 66 82, 50 82 C34 82, 26 66, 26 44 Z" fill="url(#${gid})" filter="url(#${shid})" />

  <!-- Cheeks Blush -->
  <ellipse cx="34" cy="58" rx="6" ry="4" fill="#EF4444" opacity="0.14" />
  <ellipse cx="66" cy="58" rx="6" ry="4" fill="#EF4444" opacity="0.14" />

  <!-- Eyebrows -->
  <path d="M33 43 Q40 38 46 41" stroke="${av.hair.main}" stroke-width="2.8" stroke-linecap="round" fill="none" />
  <path d="M54 41 Q60 38 67 43" stroke="${av.hair.main}" stroke-width="2.8" stroke-linecap="round" fill="none" />

  <!-- 3D Big Glossy Eyes -->
  <g>
    <!-- Left Eye -->
    <ellipse cx="40" cy="49" rx="4.8" ry="5.4" fill="#18181B" />
    <circle cx="41.5" cy="47.5" r="1.8" fill="#FFFFFF" />
    <circle cx="39" cy="50.8" r="0.9" fill="#FFFFFF" opacity="0.75" />
    <!-- Right Eye -->
    <ellipse cx="60" cy="49" rx="4.8" ry="5.4" fill="#18181B" />
    <circle cx="61.5" cy="47.5" r="1.8" fill="#FFFFFF" />
    <circle cx="59" cy="50.8" r="0.9" fill="#FFFFFF" opacity="0.75" />
  </g>

  <!-- 3D Nose -->
  <g>
    <path d="M49 46 L49 57 Q49 60 52 60" stroke="${av.skin.dark}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.7" />
    <ellipse cx="50" cy="59.5" rx="3.5" ry="1.6" fill="${av.skin.dark}" opacity="0.45" />
    <circle cx="49" cy="58" r="0.8" fill="#FFFFFF" opacity="0.25" />
  </g>

  <!-- 3D Smile -->
  <g>
    <path d="M42 67 Q50 75 58 67" stroke="${av.skin.dark}" stroke-width="2.6" stroke-linecap="round" fill="none" />
    <path d="M45 67.5 Q50 72.5 55 67.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.85" />
  </g>

  <!-- Facial Hair -->
  ${av.facialHair === 'beard' ? `
    <path d="M29 52 C29 76, 39 83, 50 83 C61 83, 71 76, 71 52 C71 58, 64 64, 58 64 C56 64, 54 62, 50 62 C46 62, 44 64, 42 64 C36 64, 29 58, 29 52 Z" fill="${av.hair.main}" opacity="0.94" />
    <path d="M40 64 Q50 61 60 64 Q50 66 40 64 Z" fill="${av.hair.main}" />
  ` : ''}
  ${av.facialHair === 'stubble' ? `
    <path d="M30 56 C32 76, 42 81, 50 81 C58 81, 68 76, 70 56 C68 67, 60 74, 50 74 C40 74, 32 67, 30 56 Z" fill="${av.hair.main}" opacity="0.22" />
  ` : ''}

  <!-- Glasses -->
  ${av.glasses === 'round' ? `
    <circle cx="39" cy="49" r="8.5" fill="none" stroke="#18181B" stroke-width="2.2" />
    <circle cx="61" cy="49" r="8.5" fill="none" stroke="#18181B" stroke-width="2.2" />
    <path d="M47.5 49 L52.5 49" stroke="#18181B" stroke-width="2.2" />
    <path d="M34 45 L41 45" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.6" />
    <path d="M56 45 L63 45" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.6" />
  ` : ''}
  ${av.glasses === 'rect' ? `
    <rect x="30" y="42" width="17" height="13" rx="3.5" fill="none" stroke="#18181B" stroke-width="2.4" />
    <rect x="53" y="42" width="17" height="13" rx="3.5" fill="none" stroke="#18181B" stroke-width="2.4" />
    <path d="M47 47 L53 47" stroke="#18181B" stroke-width="2.4" />
    <path d="M33 44 L40 44" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.5" />
    <path d="M56 44 L63 44" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.5" />
  ` : ''}

  <!-- ================= HAIR FRONT & TOP LAYER (100% Full Hair Coverage) ================= -->
  
  ${av.style === 'textured-crop' ? `
    <!-- Thick Modern Crop covering full top, temples and forehead fringe -->
    <path d="M22 42 C20 20, 30 10, 50 10 C70 10, 80 20, 78 42 C78 45, 75 38, 72 34 C64 28, 56 34, 48 30 C40 34, 32 30, 26 36 C24 38, 22 45, 22 42 Z" fill="url(#${hid})" filter="url(#${shid})" />
    <!-- Bangs texture strands -->
    <path d="M32 32 L36 36 M44 30 L48 34 M56 31 L60 35 M66 33 L70 37" stroke="${av.hair.highlight}" stroke-width="2" stroke-linecap="round" opacity="0.5" />
  ` : ''}

  ${av.style === 'quiff' ? `
    <!-- Full Voluminous Combed-Up Quiff -->
    <path d="M22 40 C20 18, 30 7, 52 7 C72 7, 80 18, 78 40 C77 34, 73 28, 65 24 C55 18, 42 22, 34 26 C28 30, 24 35, 22 40 Z" fill="url(#${hid})" filter="url(#${shid})" />
    <!-- Volume swirl on top -->
    <path d="M35 18 C45 12, 62 13, 70 20" stroke="${av.hair.highlight}" stroke-width="3" stroke-linecap="round" fill="none" />
  ` : ''}

  ${av.style === 'slick-back' ? `
    <!-- Glossy Slicked Back Hair with full crown volume -->
    <path d="M23 40 C21 17, 32 9, 50 9 C68 9, 79 17, 77 40 C76 34, 70 26, 50 25 C30 26, 24 34, 23 40 Z" fill="url(#${hid})" filter="url(#${shid})" />
    <path d="M32 20 C42 16, 58 16, 68 20" stroke="${av.hair.highlight}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.6" />
  ` : ''}

  ${av.style === 'long-waves' ? `
    <!-- Full Thick Hair on top & Framing Cheekbones -->
    <path d="M20 40 C18 16, 32 8, 50 8 C68 8, 82 16, 80 40 C80 48, 77 56, 74 65 C70 54, 72 38, 64 26 C56 16, 44 16, 36 26 C28 38, 30 54, 26 65 C23 56, 20 48, 20 40 Z" fill="url(#${hid})" filter="url(#${shid})" />
  ` : ''}

  ${av.style === 'wavy-bob' ? `
    <!-- Wavy Bob Front & Side Volume -->
    <path d="M20 42 C18 18, 32 10, 50 10 C68 10, 82 18, 80 42 C80 55, 78 68, 72 74 C68 62, 70 42, 60 30 C52 20, 40 22, 34 32 C28 42, 30 62, 26 74 C21 68, 20 55, 20 42 Z" fill="url(#${hid})" filter="url(#${shid})" />
  ` : ''}

  ${av.style === 'sleek-bob' ? `
    <!-- Chic Sleek Bob with Fringe -->
    <path d="M20 42 C18 17, 32 9, 50 9 C68 9, 82 17, 80 42 C80 58, 76 72, 71 75 C68 62, 69 45, 68 34 C58 34, 42 34, 32 34 C31 45, 32 62, 29 75 C24 72, 20 58, 20 42 Z" fill="url(#${hid})" filter="url(#${shid})" />
  ` : ''}

  ${av.style === 'curtain-bangs' ? `
    <!-- Elegant Curtain Bangs Parted in Middle -->
    <path d="M21 40 C18 17, 32 9, 50 9 C68 9, 82 17, 79 40 C78 55, 76 68, 71 74 C68 60, 69 45, 65 32 C58 24, 52 26, 50 34 C48 26, 42 24, 35 32 C31 45, 32 60, 29 74 C24 68, 22 55, 21 40 Z" fill="url(#${hid})" filter="url(#${shid})" />
  ` : ''}

  ${av.style === 'top-bun' ? `
    <!-- Hair pulled up into topknot with loose curls -->
    <path d="M23 42 C21 22, 32 16, 50 16 C68 16, 79 22, 77 42 C76 34, 68 28, 50 28 C32 28, 24 34, 23 42 Z" fill="url(#${hid})" filter="url(#${shid})" />
    <!-- Loose curly tendrils -->
    <path d="M24 45 C22 52, 24 58, 23 64" stroke="${av.hair.main}" stroke-width="2.2" stroke-linecap="round" fill="none" />
    <path d="M76 45 C78 52, 76 58, 77 64" stroke="${av.hair.main}" stroke-width="2.2" stroke-linecap="round" fill="none" />
  ` : ''}

  ${av.style === 'cap-purple-hair' ? `
    <!-- Hair Spilling Out Below Purple Cap -->
    <path d="M22 45 C20 55, 22 65, 26 70 C28 62, 28 50, 26 44 Z" fill="url(#${hid})" />
    <path d="M78 45 C80 55, 78 65, 74 70 C72 62, 72 50, 74 44 Z" fill="url(#${hid})" />
    <!-- 3D Purple Cap -->
    <path d="M23 38 C23 15, 77 15, 77 38 C77 41, 23 41, 23 38 Z" fill="#7C3AED" filter="url(#${shid})" />
    <!-- 3D Curved Visor -->
    <path d="M18 38 C18 34, 82 34, 82 38 C82 44, 18 44, 18 38 Z" fill="#6D28D9" />
    <path d="M22 39 C32 37, 68 37, 78 39" stroke="#C4B5FD" stroke-width="1.2" stroke-linecap="round" opacity="0.75" />
    <ellipse cx="50" cy="18" rx="3.5" ry="1.8" fill="#5B21B6" />
  ` : ''}

  ${av.style === 'cap-green-curls' ? `
    <!-- Curls Spilling Out Sides of Green Cap -->
    <path d="M21 44 C19 55, 21 66, 27 70 C28 62, 28 50, 26 44 Z" fill="url(#${hid})" />
    <path d="M79 44 C81 55, 79 66, 73 70 C72 62, 72 50, 74 44 Z" fill="url(#${hid})" />
    <path d="M38 41 C42 43, 46 41, 50 43" stroke="${av.hair.main}" stroke-width="3" stroke-linecap="round" fill="none" />
    <!-- 3D Sporty Green Cap -->
    <path d="M23 38 C23 15, 77 15, 77 38 C77 41, 23 41, 23 38 Z" fill="#10B981" filter="url(#${shid})" />
    <!-- 3D Curved Visor -->
    <path d="M18 38 C18 34, 82 34, 82 38 C82 44, 18 44, 18 38 Z" fill="#059669" />
    <path d="M22 39 C32 37, 68 37, 78 39" stroke="#A7F3D0" stroke-width="1.2" stroke-linecap="round" opacity="0.8" />
    <ellipse cx="50" cy="18" rx="3.5" ry="1.8" fill="#047857" />
  ` : ''}

  ${av.style === 'cap-red-hair' ? `
    <!-- Thick Hair with Backward Red Cap -->
    <path d="M22 42 C18 55, 20 68, 28 72 C30 62, 30 50, 28 42 Z" fill="url(#${hid})" />
    <path d="M78 42 C82 55, 80 68, 72 72 C70 62, 70 50, 72 42 Z" fill="url(#${hid})" />
    <path d="M32 38 C42 36, 58 36, 68 38" stroke="${av.hair.main}" stroke-width="4" stroke-linecap="round" fill="none" />
    <!-- Backward Red Cap Dome -->
    <path d="M23 37 C23 16, 77 16, 77 37 C77 41, 23 41, 23 37 Z" fill="#EF4444" filter="url(#${shid})" />
    <!-- Backward Strap / Visor -->
    <path d="M22 37 C22 33, 78 33, 78 37 C78 41, 22 41, 22 37 Z" fill="#DC2626" />
    <ellipse cx="50" cy="18" rx="3.5" ry="1.8" fill="#B91C1C" />
  ` : ''}

  ${av.style === 'beanie-hair' ? `
    <!-- Thick Hair locks coming out from Beanie -->
    <path d="M21 44 C18 56, 19 72, 28 78 C30 68, 31 54, 29 44 Z" fill="url(#${hid})" />
    <path d="M79 44 C82 56, 81 72, 72 78 C70 68, 69 54, 71 44 Z" fill="url(#${hid})" />
    <path d="M34 40 C42 38, 58 38, 66 40" stroke="${av.hair.main}" stroke-width="3" stroke-linecap="round" fill="none" />
    <!-- 3D Royal Blue Beanie -->
    <path d="M22 37 C22 12, 78 12, 78 37 C78 41, 22 41, 22 37 Z" fill="#3B82F6" filter="url(#${shid})" />
    <rect x="20" y="34" width="60" height="9" rx="4.5" fill="#2563EB" />
  ` : ''}

  ${av.style === 'braids' ? `
    <!-- Neat Crown Braids with Golden Rings -->
    <path d="M23 40 C21 18, 32 10, 50 10 C68 10, 79 18, 77 40 C76 34, 68 28, 50 28 C32 28, 24 34, 23 40 Z" fill="url(#${hid})" filter="url(#${shid})" />
    <circle cx="34" cy="24" r="3.2" fill="#F59E0B" />
    <circle cx="44" cy="20" r="3.2" fill="#F59E0B" />
    <circle cx="56" cy="20" r="3.2" fill="#F59E0B" />
    <circle cx="66" cy="24" r="3.2" fill="#F59E0B" />
    <!-- Hanging Braids -->
    <path d="M22 44 L20 68 M26 46 L25 72 M78 44 L80 68 M74 46 L75 72" stroke="${av.hair.main}" stroke-width="2.6" stroke-linecap="round" />
  ` : ''}
</svg>`;
}

avatars.forEach((av) => {
  const filePath = path.join(outDir, `${av.id}.svg`);
  fs.writeFileSync(filePath, generateSvg(av), 'utf-8');
});

console.log(`Generated ${avatars.length} high-style, FULL-HAIR 3D Memojis successfully!`);
