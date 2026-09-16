/* 명단 파일 읽기 (2026-09-12) — 엑셀(.xlsx)과 CSV·TSV를 파일에서 바로 읽는다.
 *
 * 새 의존성을 두지 않는다. .xlsx는 zip + XML일 뿐이고, 브라우저와 Node 모두
 * `DecompressionStream("deflate-raw")`를 갖고 있어서 그것만으로 풀 수 있다.
 * 여기서 하는 일은 "표를 문자열 격자로 만드는 것"까지이고, 번호·이름 검증은
 * 기존 `parseRosterText`가 그대로 맡는다 — 검증 경로를 둘로 늘리지 않는다.
 *
 * 파일은 서버로 보내지 않는다. 학생 실명이 든 파일이라 교사 브라우저 안에서만 읽고,
 * 화면의 입력칸을 채운 뒤 교사가 확인하고 저장한다. */

export type Grid = string[][];

const HEADER_WORDS = ["번호", "번", "이름", "성명", "학생", "no", "no.", "num", "number", "name", "student"];

/** CSV·TSV 구분자 추정. 첫 줄에서 가장 많이 나온 것을 쓴다(따옴표 밖만 센다). */
export function detectDelimiter(text: string): string {
  const line = text.split(/\r?\n/).find((value) => value.trim().length > 0) ?? "";
  const counts = [",", "\t", ";", "|"].map((delimiter) => {
    let count = 0; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') { quoted = !quoted; continue; }
      if (!quoted && char === delimiter) count += 1;
    }
    return { delimiter, count };
  });
  const best = counts.reduce((a, b) => (b.count > a.count ? b : a));
  return best.count > 0 ? best.delimiter : "\t";
}

/** 따옴표와 줄바꿈을 지키는 최소 CSV 파서. 엑셀이 내보낸 CSV의 `""` 이스케이프를 따른다. */
export function parseDelimited(text: string, delimiter = detectDelimiter(text)): Grid {
  const clean = text.replace(/^﻿/, "");
  const rows: Grid = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"') {
        if (clean[index + 1] === '"') { cell += '"'; index += 1; } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === delimiter) { row.push(cell); cell = ""; continue; }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell); rows.push(row);
  return rows.map((cells) => cells.map((value) => value.trim())).filter((cells) => cells.some(Boolean));
}

// ── .xlsx ───────────────────────────────────────────────────────────────────
// zip 안에서 우리가 읽는 것은 공유 문자열과 첫 시트 둘뿐이다.

function view(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

async function inflate(bytes: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error("UNSUPPORTED_COMPRESSION");
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** zip 중앙 디렉터리를 읽어 이름 → 바이트로 푼다. 작은 파일만 다루므로 zip64는 보지 않는다. */
async function unzip(bytes: Uint8Array, wanted: (name: string) => boolean) {
  const data = view(bytes);
  let end = -1;
  for (let index = bytes.length - 22; index >= 0 && index > bytes.length - 66_000; index -= 1) {
    if (data.getUint32(index, true) === 0x06054b50) { end = index; break; }
  }
  if (end < 0) throw new Error("NOT_A_ZIP");
  const count = data.getUint16(end + 10, true);
  let offset = data.getUint32(end + 16, true);
  const out = new Map<string, Uint8Array>();
  for (let entry = 0; entry < count; entry += 1) {
    if (data.getUint32(offset, true) !== 0x02014b50) break;
    const method = data.getUint16(offset + 10, true);
    const compressedSize = data.getUint32(offset + 20, true);
    const nameLength = data.getUint16(offset + 28, true);
    const extraLength = data.getUint16(offset + 30, true);
    const commentLength = data.getUint16(offset + 32, true);
    const localOffset = data.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (!wanted(name)) continue;
    // 지역 헤더의 이름·부가 길이는 중앙 디렉터리와 다를 수 있어 여기서 다시 읽는다.
    const localNameLength = data.getUint16(localOffset + 26, true);
    const localExtraLength = data.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    out.set(name, await inflate(bytes.subarray(start, start + compressedSize), method));
  }
  return out;
}

function decodeXmlText(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** `<si>` 하나의 글자. 서식이 섞여 `<r><t>`로 쪼개진 것도 이어 붙인다. */
function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXmlText(part[1])).join(""));
}

function columnIndex(reference: string) {
  const letters = reference.replace(/\d+/g, "");
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.toUpperCase().charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

function sheetGrid(xml: string, strings: string[]): Grid {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const cells: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = cell[1]; const body = cell[2] ?? "";
      const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1];
      const type = /\bt="([^"]+)"/.exec(attributes)?.[1] ?? "n";
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      let value = "";
      if (type === "s") value = strings[Number(raw)] ?? "";
      else if (type === "inlineStr") value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXmlText(part[1])).join("");
      else if (type === "str") value = decodeXmlText(raw);
      else value = decodeXmlText(raw);
      const at = reference ? columnIndex(reference) : cells.length;
      while (cells.length < at) cells.push("");
      cells[at] = value.trim();
    }
    return cells;
  }).filter((cells) => cells.some(Boolean));
}

export async function parseXlsx(bytes: Uint8Array): Promise<Grid> {
  const files = await unzip(bytes, (name) => name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const decoder = new TextDecoder();
  const sharedFile = files.get("xl/sharedStrings.xml");
  const strings = sharedFile ? sharedStrings(decoder.decode(sharedFile)) : [];
  // 시트가 여럿이면 첫 시트(sheet1.xml, 없으면 이름순 첫 번째)를 쓴다.
  const sheetName = [...files.keys()].filter((name) => name.startsWith("xl/worksheets/"))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))[0];
  if (!sheetName) throw new Error("NO_SHEET");
  return sheetGrid(decoder.decode(files.get(sheetName)!), strings);
}

// ── 격자 → 명단 입력칸 글자 ────────────────────────────────────────────────

export function looksLikeHeader(cells: string[]) {
  const words = cells.filter(Boolean).map((value) => value.toLowerCase().replace(/\s+/g, ""));
  if (!words.length) return false;
  // 숫자로 시작하는 줄은 이미 자료다(1행이 "1 김민준"인 파일).
  if (/^\d+$/.test(words[0])) return false;
  return words.some((word) => HEADER_WORDS.includes(word));
}

/**
 * 표를 `parseRosterText`가 읽는 "번호 이름" 줄로 바꾼다.
 * - 번호가 있는 표(첫 칸이 숫자)는 그대로 쓴다.
 * - 이름만 있는 표는 1번부터 차례로 번호를 붙인다 — 교사가 화면에서 고칠 수 있다.
 */
export function gridToRosterText(grid: Grid): { text: string; rows: number; numbered: boolean; skippedHeader: boolean } {
  const rows = grid.map((cells) => cells.map((value) => value.trim())).filter((cells) => cells.some(Boolean));
  const skippedHeader = rows.length > 0 && looksLikeHeader(rows[0]);
  const body = skippedHeader ? rows.slice(1) : rows;
  const numbered = body.every((cells) => /^\d{1,3}$/.test(cells[0] ?? ""));
  const lines = body.map((cells, index) => {
    if (numbered) {
      const seat = cells[0];
      const name = cells.slice(1).find(Boolean) ?? "";
      return `${seat} ${name}`.trim();
    }
    // 번호를 우리가 붙이는 표라도 앞 칸에 숫자가 남아 있을 수 있다(일부만 번호가 적힌 파일).
    // 그 숫자를 이름으로 잡지 않도록, 숫자만 있는 칸은 건너뛰고 첫 글자 칸을 이름으로 쓴다.
    const name = cells.find((value) => value && !/^\d{1,3}$/.test(value)) ?? cells.find(Boolean) ?? "";
    return `${index + 1} ${name}`.trim();
  }).filter(Boolean);
  return { text: lines.join("\n"), rows: lines.length, numbered, skippedHeader };
}

/** 파일 하나를 읽어 입력칸에 넣을 글자로 바꾼다. 확장자로 엑셀과 글자 파일을 가른다. */
export async function readRosterFile(file: { name: string; arrayBuffer: () => Promise<ArrayBuffer> }) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (/\.xlsx$/i.test(file.name) || isZip) return gridToRosterText(await parseXlsx(bytes));
  if (/\.xls$/i.test(file.name)) throw new Error("OLD_XLS");
  return gridToRosterText(parseDelimited(new TextDecoder().decode(bytes)));
}
