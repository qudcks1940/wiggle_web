export const STORYBOOK_SCHEMA_VERSION = 1;
export const MAX_STORYBOOK_PAGES = 24;
export const MAX_STORYBOOK_ELEMENTS_PER_PAGE = 50;
export const MAX_STORYBOOK_DOCUMENT_BYTES = 250_000;
export const MAX_STORYBOOK_TEXT_GRAPHEMES = 800;

export const STORYBOOK_FORMATS = ["landscape", "portrait", "square"] as const;
export type StorybookFormat = (typeof STORYBOOK_FORMATS)[number];
export type StorybookTextAlign = "left" | "center" | "right";
export type StorybookCrop = { x: number; y: number; width: number; height: number };

export const DEFAULT_STORYBOOK_TEXT = "여기에 이야기를 써 보세요";
export const STORYBOOK_TEXT_BOX = { x: 0.06, y: 0.04, width: 0.88, height: 0.16 } as const;
export const STORYBOOK_IMAGE_AREA = { x: 0.04, y: 0.24, width: 0.92, height: 0.72 } as const;

export type StorybookElement = {
  id: string;
  type: "image" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  locked: boolean;
  assetId?: string;
  aspectRatio?: number;
  crop?: StorybookCrop;
  text?: string;
  fontSize?: number;
  color?: string;
  align?: StorybookTextAlign;
};

export type StorybookPage = {
  id: string;
  background: string;
  backgroundAssetId?: string;
  elements: StorybookElement[];
};

export type StorybookDocument = {
  schemaVersion: 1;
  format: StorybookFormat;
  pages: StorybookPage[];
};

const ID_PATTERN = /^(?:page|element|asset)_[a-zA-Z0-9_-]{8,64}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function finiteBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function nearly(value: number, expected: number) {
  return Math.abs(value - expected) <= 0.001;
}

function graphemes(value: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(value)].length;
  }
  return Array.from(value).length;
}

function cleanStoryText(value: string) {
  return value.normalize("NFC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "");
}

function serializedBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function validateElement(value: unknown): StorybookElement | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const element = value as Partial<StorybookElement>;
  if (!element.id || !ID_PATTERN.test(element.id) || !["image", "text"].includes(element.type ?? "")) return null;
  if (!finiteBetween(element.x, 0, 1) || !finiteBetween(element.y, 0, 1)) return null;
  if (!finiteBetween(element.width, 0.04, 1) || !finiteBetween(element.height, 0.04, 1)) return null;
  if (element.x + element.width > 1.001 || element.y + element.height > 1.001) return null;
  const zIndex = element.zIndex;
  if (!finiteBetween(element.rotation, -180, 180) || typeof zIndex !== "number" || !Number.isInteger(zIndex) || zIndex < 0 || zIndex > 10_000) return null;
  if (!finiteBetween(element.opacity, 0.05, 1) || typeof element.locked !== "boolean") return null;

  const normalized: StorybookElement = {
    id: element.id,
    type: element.type as StorybookElement["type"],
    x: round(element.x),
    y: round(element.y),
    width: round(element.width),
    height: round(element.height),
    rotation: round(element.rotation),
    zIndex,
    opacity: round(element.opacity),
    locked: element.locked,
  };

  if (element.type === "image") {
    if (!element.assetId || !ID_PATTERN.test(element.assetId)) return null;
    const areaRight = STORYBOOK_IMAGE_AREA.x + STORYBOOK_IMAGE_AREA.width;
    const areaBottom = STORYBOOK_IMAGE_AREA.y + STORYBOOK_IMAGE_AREA.height;
    if (element.x < STORYBOOK_IMAGE_AREA.x - 0.001 || element.y < STORYBOOK_IMAGE_AREA.y - 0.001) return null;
    if (element.x + element.width > areaRight + 0.001 || element.y + element.height > areaBottom + 0.001) return null;
    if (element.aspectRatio !== undefined && !finiteBetween(element.aspectRatio, 0.1, 10)) return null;
    normalized.assetId = element.assetId;
    if (element.aspectRatio !== undefined) normalized.aspectRatio = round(element.aspectRatio);
    if (element.crop !== undefined) {
      if (!element.crop || typeof element.crop !== "object" || Array.isArray(element.crop)) return null;
      const crop = element.crop as Partial<StorybookCrop>;
      if (!finiteBetween(crop.x, 0, 1) || !finiteBetween(crop.y, 0, 1)) return null;
      if (!finiteBetween(crop.width, 0.01, 1) || !finiteBetween(crop.height, 0.01, 1)) return null;
      if (crop.x + crop.width > 1.001 || crop.y + crop.height > 1.001) return null;
      normalized.crop = { x: round(crop.x), y: round(crop.y), width: round(crop.width), height: round(crop.height) };
    }
    return normalized;
  }

  if (typeof element.text !== "string") return null;
  const text = cleanStoryText(element.text);
  if (text !== element.text || graphemes(text) > MAX_STORYBOOK_TEXT_GRAPHEMES) return null;
  if (!finiteBetween(element.fontSize, 0.018, 0.12) || !element.color || !COLOR_PATTERN.test(element.color)) return null;
  if (element.align !== "center" || element.rotation !== 0 || element.opacity !== 1 || element.locked !== true) return null;
  if (!nearly(element.x, STORYBOOK_TEXT_BOX.x) || !nearly(element.y, STORYBOOK_TEXT_BOX.y) || !nearly(element.width, STORYBOOK_TEXT_BOX.width) || !nearly(element.height, STORYBOOK_TEXT_BOX.height)) return null;
  normalized.text = text;
  normalized.fontSize = round(element.fontSize);
  normalized.color = element.color.toUpperCase();
  normalized.align = element.align;
  return normalized;
}

export function validateStorybookDocument(value: unknown): StorybookDocument | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const document = value as Partial<StorybookDocument>;
  if (document.schemaVersion !== STORYBOOK_SCHEMA_VERSION || !STORYBOOK_FORMATS.includes(document.format as StorybookFormat)) return null;
  if (!Array.isArray(document.pages) || document.pages.length < 1 || document.pages.length > MAX_STORYBOOK_PAGES) return null;

  const pageIds = new Set<string>();
  const elementIds = new Set<string>();
  const pages: StorybookPage[] = [];
  for (const raw of document.pages) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const page = raw as Partial<StorybookPage>;
    if (!page.id || !ID_PATTERN.test(page.id) || pageIds.has(page.id)) return null;
    if (!page.background || !COLOR_PATTERN.test(page.background)) return null;
    if (page.backgroundAssetId !== undefined && (!page.backgroundAssetId || !ID_PATTERN.test(page.backgroundAssetId))) return null;
    if (!Array.isArray(page.elements) || page.elements.length > MAX_STORYBOOK_ELEMENTS_PER_PAGE) return null;
    pageIds.add(page.id);
    const elements: StorybookElement[] = [];
    for (const rawElement of page.elements) {
      const element = validateElement(rawElement);
      if (!element || elementIds.has(element.id)) return null;
      elementIds.add(element.id);
      elements.push(element);
    }
    if (elements.filter((element) => element.type === "text").length !== 1) return null;
    pages.push({ id: page.id, background: page.background.toUpperCase(), ...(page.backgroundAssetId ? { backgroundAssetId: page.backgroundAssetId } : {}), elements });
  }

  const normalized: StorybookDocument = { schemaVersion: 1, format: document.format as StorybookFormat, pages };
  return serializedBytes(normalized) <= MAX_STORYBOOK_DOCUMENT_BYTES ? normalized : null;
}

export function createStorybookTextElement(id = "element_startertext0001"): StorybookElement {
  return {
    id,
    type: "text",
    text: DEFAULT_STORYBOOK_TEXT,
    ...STORYBOOK_TEXT_BOX,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: true,
    fontSize: 0.045,
    color: "#24324A",
    align: "center",
  };
}

export function emptyStorybookDocument(format: StorybookFormat = "landscape", pageId = "page_starter0001", textElementId = "element_startertext0001"): StorybookDocument {
  return { schemaVersion: 1, format, pages: [{ id: pageId, background: "#FFFFFF", elements: [createStorybookTextElement(textElementId)] }] };
}
