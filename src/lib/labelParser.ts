interface ParsedLabel {
  brand: string | null;
  colorway: string | null;
  model: string | null;
  styleCode: string | null;
}

const KNOWN_BRANDS: { keywords: string[]; name: string }[] = [
  { keywords: ["NIKE", "NIKE,INC"], name: "Nike" },
  { keywords: ["JORDAN", "AIR JORDAN"], name: "Jordan" },
  { keywords: ["ADIDAS"], name: "Adidas" },
  { keywords: ["NEW BALANCE"], name: "New Balance" },
  { keywords: ["CONVERSE"], name: "Converse" },
  { keywords: ["PUMA"], name: "Puma" },
  { keywords: ["REEBOK"], name: "Reebok" },
  { keywords: ["VANS"], name: "Vans" },
  { keywords: ["ASICS"], name: "Asics" },
  { keywords: ["SAUCONY"], name: "Saucony" },
  { keywords: ["UNDER ARMOUR"], name: "Under Armour" },
  { keywords: ["YEEZY"], name: "Yeezy" },
  { keywords: ["HOKA"], name: "Hoka" },
  { keywords: ["ON RUNNING", "ON CLOUD"], name: "On" },
  { keywords: ["SALOMON"], name: "Salomon" },
  { keywords: ["TIMBERLAND"], name: "Timberland" },
  { keywords: ["DR. MARTENS", "DR MARTENS"], name: "Dr. Martens" },
  { keywords: ["BIRKENSTOCK"], name: "Birkenstock" },
  { keywords: ["CROCS"], name: "Crocs" },
  { keywords: ["FILA"], name: "Fila" },
  { keywords: ["DIADORA"], name: "Diadora" },
  { keywords: ["MIZUNO"], name: "Mizuno" },
  { keywords: ["BROOKS"], name: "Brooks" },
  { keywords: ["LI-NING", "LI NING"], name: "Li-Ning" },
  { keywords: ["ANTA"], name: "Anta" },
];

// Well-known model name patterns that can appear on product pages
const MODEL_PATTERNS: { brand: string; re: RegExp }[] = [
  { brand: "Nike", re: /\b(Air (?:Force 1|Max \d+|Jordan \d+|Huarache|Vapormax|Zoom)[^\n,]*)/i },
  { brand: "Nike", re: /\b(Dunk (?:Low|High|Mid)[^\n,]*)/i },
  { brand: "Nike", re: /\b(Blazer (?:Low|Mid|High)[^\n,]*)/i },
  { brand: "Jordan", re: /\b(Air Jordan \d+[^\n,]*)/i },
  { brand: "Jordan", re: /\b(Jordan \d+[^\n,]*)/i },
  { brand: "Adidas", re: /\b(Yeezy (?:Boost|Slide|Foam)[^\n,]*)/i },
  { brand: "Adidas", re: /\b(Ultra ?Boost[^\n,]*)/i },
  { brand: "Adidas", re: /\b(NMD[^\n,]*)/i },
  { brand: "Adidas", re: /\b(Stan Smith[^\n,]*)/i },
  { brand: "Adidas", re: /\b(Superstar[^\n,]*)/i },
  { brand: "Adidas", re: /\b(Samba[^\n,]*)/i },
  { brand: "Adidas", re: /\b(Gazelle[^\n,]*)/i },
  { brand: "New Balance", re: /\b((?:990|992|993|550|574|2002R|530|327|9060)[^\n,]*)/i },
  { brand: "Converse", re: /\b(Chuck Taylor[^\n,]*)/i },
  { brand: "Converse", re: /\b(Chuck 70[^\n,]*)/i },
  { brand: "Asics", re: /\b(Gel[- ](?:Lyte|Kayano|1130|NYC)[^\n,]*)/i },
];

// Nike/Jordan style codes: "DM4044 108", "CW2288-111", "DD1391-100"
const NIKE_STYLE_RE = /\b([A-Z]{2}\d{4})\s*[-\s]?\s*(\d{3})\b/;
// Adidas article numbers: "FY2903", "GW1229", "HP5565"
const ADIDAS_STYLE_RE = /\b([A-Z]{2}\d{4,5})\b/;
// New Balance style codes: "M990GL5", "WL574EG"
const NB_STYLE_RE = /\b([MW][A-Z]?\d{3,4}[A-Z]{1,3}\d?)\b/;

// Colorway pattern: words separated by /
const COLORWAY_RE = /\b([A-Z][A-Z\s]*(?:\/[A-Z][A-Z\s]*){1,})\b/;

// Screenshot noise: clock times, battery, navigation, URLs, prices, etc.
const NOISE_PATTERNS = [
  /^\d{1,2}:\d{2}$/, // clock time like "11:26"
  /^\d{1,3}%$/, // battery percentage
  /^(https?:\/\/|www\.)/i,
  /^(home|back|search|menu|share|save|cart|bag|buy now|add to|sign in|log in)$/i,
  /^[@#]/, // social handles/hashtags
  /^\$[\d,.]+$/, // standalone price
  /^¥[\d,.]+$/, // CNY price
  /^€[\d,.]+$/, // EUR price
  /^£[\d,.]+$/, // GBP price
  /^\d+\s*(reviews?|ratings?|sold|left|available)$/i,
  /^(free shipping|free delivery|ships free)/i,
  /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/, // dates
];

function cleanOcrText(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l || l.length < 2) return false;
      if (NOISE_PATTERNS.some((p) => p.test(l))) return false;
      if (/^\d+$/.test(l) && l.length <= 4) return false;
      return true;
    })
    .join("\n");
}

function detectBrand(text: string): string | null {
  const upper = text.toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    for (const kw of brand.keywords) {
      if (upper.includes(kw)) return brand.name;
    }
  }
  return null;
}

function extractStyleCode(text: string, brand: string | null): string | null {
  const upper = text.toUpperCase();

  const nikeMatch = upper.match(NIKE_STYLE_RE);
  if (nikeMatch) return `${nikeMatch[1]}-${nikeMatch[2]}`;

  if (brand === "New Balance") {
    const nbMatch = upper.match(NB_STYLE_RE);
    if (nbMatch) return nbMatch[1];
  }

  const adidasMatch = upper.match(ADIDAS_STYLE_RE);
  if (adidasMatch) return adidasMatch[1];

  return null;
}

function extractColorway(text: string): string | null {
  const upper = text.toUpperCase();
  const match = upper.match(COLORWAY_RE);
  if (!match) return null;

  const raw = match[1].trim();
  return raw
    .split("/")
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join("/");
}

function extractModelFromPatterns(text: string, brand: string | null): string | null {
  for (const mp of MODEL_PATTERNS) {
    if (brand && mp.brand !== brand) continue;
    const match = text.match(mp.re);
    if (match) {
      return match[1]
        .trim()
        .replace(/\s{2,}/g, " ")
        .replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
  }
  // If no brand filter matched, try all patterns
  if (brand) {
    for (const mp of MODEL_PATTERNS) {
      const match = text.match(mp.re);
      if (match) {
        return match[1]
          .trim()
          .replace(/\s{2,}/g, " ")
          .replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      }
    }
  }
  return null;
}

const COLOR_WORDS = new Set([
  "BLACK", "WHITE", "RED", "BLUE", "GREEN", "GREY", "GRAY", "BROWN", "ORANGE",
  "YELLOW", "PINK", "PURPLE", "NAVY", "CREAM", "BEIGE", "TAN", "GOLD", "SILVER",
  "ANTHRACITE", "OBSIDIAN", "SAIL", "BONE", "VOLT", "INFRARED", "BRED",
  "NOIR", "BLANC", "ROUGE", "BLEU", "VERT", "GRIS", "MARRON",
]);

function looksLikeColorway(line: string): boolean {
  const parts = line.toUpperCase().split(/[/\-,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const colorCount = parts.filter((p) => COLOR_WORDS.has(p)).length;
  return colorCount >= 2 || colorCount / parts.length >= 0.5;
}

function titleCase(str: string): string {
  return str.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function extractModel(
  text: string,
  brand: string | null,
  styleCode: string | null,
  colorway: string | null
): string | null {
  // Try known model patterns first (works well for screenshots)
  const patternModel = extractModelFromPatterns(text, brand);
  if (patternModel) return patternModel;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const skipPatterns = [
    /^\d+$/,
    /^(US|UK|EUR|CM|BR|MM)\s/i,
    /^(MADE IN|FABRIQUE|FABRICADO|HECHO)/i,
    /BARCODE/i,
    ...NOISE_PATTERNS,
  ];

  const brandUpper = brand?.toUpperCase() ?? "";
  const styleUpper = styleCode?.toUpperCase().replace("-", " ") ?? "";
  const colorUpper = colorway?.toUpperCase() ?? "";

  // Pass 1: check if brand name appears on a line with extra text (e.g. "NIKE REACT SFB CARBON LOW")
  if (brandUpper) {
    for (const line of lines) {
      const lineUpper = line.toUpperCase().trim();
      if (lineUpper.startsWith(brandUpper + " ") && lineUpper.length > brandUpper.length + 2) {
        const modelPart = line.trim().substring(brandUpper.length).trim();
        if (modelPart.length >= 2 && !looksLikeColorway(modelPart)) {
          return titleCase(modelPart);
        }
      }
    }
  }

  // Pass 2: find lines after the brand that look like model names
  let foundBrand = false;
  for (const line of lines) {
    const lineUpper = line.toUpperCase().trim();

    if (!foundBrand) {
      if (brandUpper && lineUpper.includes(brandUpper)) foundBrand = true;
      continue;
    }

    if (!lineUpper || lineUpper.length < 2) continue;
    if (skipPatterns.some((p) => p.test(lineUpper))) continue;
    if (brandUpper && lineUpper === brandUpper) continue;
    if (styleUpper && lineUpper.includes(styleUpper)) continue;
    if (colorUpper && lineUpper === colorUpper) continue;
    if (looksLikeColorway(lineUpper)) continue;

    const isModelCandidate =
      lineUpper.length >= 2 &&
      lineUpper.length <= 50 &&
      !/^[0-9\s.,]+$/.test(lineUpper);

    if (isModelCandidate) {
      return titleCase(line);
    }
  }
  return null;
}

export function parseLabel(ocrText: string): ParsedLabel {
  const cleaned = cleanOcrText(ocrText);
  const textToUse = cleaned || ocrText;

  const brand = detectBrand(textToUse);
  const styleCode = extractStyleCode(textToUse, brand);
  const colorway = extractColorway(textToUse);
  const model = extractModel(textToUse, brand, styleCode, colorway);

  return { brand, colorway, model, styleCode };
}
