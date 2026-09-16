/* 엑셀(.xlsx) 만들기 (2026-09-12) — 명단 양식을 내려받게 하려고 쓴다.
 *
 * 읽기(`roster-file.ts`)와 마찬가지로 새 의존성을 두지 않는다. xlsx는 zip + XML이고,
 * 우리가 쓰는 것은 글자 몇 줄짜리 표 하나뿐이라 **압축하지 않은(stored) zip**으로 충분하다.
 * 압축을 안 하면 CRC32만 있으면 되고, 엑셀·넘버스·구글 시트 모두 그대로 연다.
 *
 * 날짜는 1980-01-01로 고정한다 — 같은 입력이면 같은 바이트가 나와야 시험이 안정적이다. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

type Entry = { name: string; bytes: Uint8Array };

/** 압축하지 않는 zip. 작은 양식 한 장이라 크기보다 단순함이 낫다. */
function zipStored(entries: Entry[]) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.bytes);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);        // 필요한 버전
    view.setUint16(6, 0, true);         // 플래그
    view.setUint16(8, 0, true);         // 압축 방식 0 = stored
    view.setUint16(10, 0, true);        // 시각
    view.setUint16(12, 33, true);       // 날짜 1980-01-01
    view.setUint32(14, crc, true);
    view.setUint32(18, entry.bytes.length, true);
    view.setUint32(22, entry.bytes.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    local.set(name, 30);
    chunks.push(local, entry.bytes);

    const middle = new Uint8Array(46 + name.length);
    const centralView = new DataView(middle.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 33, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.bytes.length, true);
    centralView.setUint32(24, entry.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    middle.set(name, 46);
    central.push(middle);
    offset += local.length + entry.bytes.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const all = [...chunks, ...central, end];
  const total = all.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of all) { out.set(part, at); at += part.length; }
  return out;
}

function columnName(index: number) {
  let name = ""; let value = index + 1;
  while (value > 0) { const rest = (value - 1) % 26; name = String.fromCharCode(65 + rest) + name; value = Math.floor((value - 1) / 26); }
  return name;
}

/**
 * 표 한 장짜리 .xlsx를 만든다. 값은 모두 inlineStr로 넣는다 —
 * 공유 문자열 표를 따로 두지 않아도 되고, 번호가 문자로 들어가도 우리 읽기가 그대로 받는다.
 */
export function buildXlsx(rows: string[][], sheetName = "명단") {
  const encoder = new TextEncoder();
  const sheetRows = rows.map((cells, rowIndex) => {
    const body = cells.map((value, columnIndex) =>
      `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`).join("");
    return `<row r="${rowIndex + 1}">${body}</row>`;
  }).join("");
  const files: Entry[] = [
    { name: "[Content_Types].xml", bytes: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`) },
    { name: "_rels/.rels", bytes: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", bytes: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", bytes: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`) },
    { name: "xl/worksheets/sheet1.xml", bytes: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`) },
  ];
  return zipStored(files);
}

/** 교사에게 주는 명단 양식. 첫 줄은 제목, 그 아래는 지우고 쓰는 보기다. */
export const ROSTER_TEMPLATE_ROWS: string[][] = [
  ["번호", "이름"],
  ["1", "김민준"],
  ["2", "이서연"],
  ["3", "박지호"],
];

export function buildRosterTemplate() {
  return buildXlsx(ROSTER_TEMPLATE_ROWS, "명단");
}
