import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { LESSONS } from "../lib/lesson-content.ts";
import { GUIDED_LESSON_VARIANT_COUNT, guideMarksForVariant, guideVariantLabel } from "../lib/lesson-guide-variants.ts";

const lessonSlug = process.argv[2] ?? "friendly-dog";
const lesson = LESSONS.find((item) => item.slug === lessonSlug);
if (!lesson || lesson.mode !== "guided") throw new Error(`guided lesson not found: ${lessonSlug}`);

const panel = 460;
const margin = 42;
const drawingSize = panel - margin * 2;
const columns = 2;
const rows = Math.ceil(GUIDED_LESSON_VARIANT_COUNT / columns);
const width = panel * columns;
const height = panel * rows;

function point([x, y], offsetX, offsetY) {
  return `${offsetX + x * drawingSize} ${offsetY + y * drawingSize}`;
}

function markSvg(mark, offsetX, offsetY) {
  if (mark.kind === "line") {
    return `<polyline points="${mark.points.map((value) => point(value, offsetX, offsetY)).join(" ")}" />`;
  }
  if (mark.kind === "curve") {
    const [start, controlA, controlB, end] = mark.points;
    return `<path d="M ${point(start, offsetX, offsetY)} C ${point(controlA, offsetX, offsetY)}, ${point(controlB, offsetX, offsetY)}, ${point(end, offsetX, offsetY)}" />`;
  }
  if (mark.kind === "ellipse") {
    return `<ellipse cx="${offsetX + mark.x * drawingSize}" cy="${offsetY + mark.y * drawingSize}" rx="${mark.rx * drawingSize}" ry="${mark.ry * drawingSize}" />`;
  }
  return `<rect x="${offsetX + mark.x * drawingSize}" y="${offsetY + mark.y * drawingSize}" width="${mark.width * drawingSize}" height="${mark.height * drawingSize}" />`;
}

const panels = Array.from({ length: GUIDED_LESSON_VARIANT_COUNT }, (_, variant) => {
  const column = variant % columns;
  const row = Math.floor(variant / columns);
  const panelX = column * panel;
  const panelY = row * panel;
  const offsetX = panelX + margin;
  const offsetY = panelY + margin;
  const marks = guideMarksForVariant(lesson, variant);
  return `
    <g>
      <rect x="${panelX + 12}" y="${panelY + 12}" width="${panel - 24}" height="${panel - 24}" rx="24" fill="#fffdf8" stroke="#c9e5f3" stroke-width="3" />
      <text x="${panelX + 28}" y="${panelY + 42}" font-family="sans-serif" font-size="22" font-weight="700" fill="#12385a">${variant + 1}. ${guideVariantLabel(variant)}</text>
      <g fill="none" stroke="#173a59" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        ${marks.map((mark) => markSvg(mark, offsetX, offsetY)).join("\n")}
      </g>
    </g>`;
}).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#eef9ff" />
  ${panels}
</svg>`;

const outputDirectory = path.resolve(".data", "guide-audit");
await fs.mkdir(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, `${lessonSlug}.png`);
await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(outputPath);
