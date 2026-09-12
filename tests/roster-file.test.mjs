import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { detectDelimiter, gridToRosterText, looksLikeHeader, parseDelimited, parseXlsx, readRosterFile } from "../lib/roster-file.ts";
import { buildRosterTemplate, buildXlsx, crc32, ROSTER_TEMPLATE_ROWS } from "../lib/xlsx-write.ts";
import { parseRosterText } from "../lib/roster.ts";

/* 명단을 엑셀·CSV 파일로 추가하는 길(2026-09-12 사용자 요청).
 * 새 의존성 없이 .xlsx(zip+XML)와 CSV를 직접 읽는다. 시험 자료는 실제 엑셀 작성기
 * 두 가지(openpyxl·xlsxwriter)로 만든 진짜 파일이다 — 손으로 만든 흉내가 아니다.
 * 파일은 서버로 가지 않는다. 여기서 검증하는 것은 "표 → 입력칸 글자"까지이고,
 * 번호·이름 규칙은 기존 parseRosterText가 그대로 맡는다. */

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url));
function fileOf(name, bytes) {
  return { name, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
}

test("엑셀에서 번호와 이름을 읽고, 제목 줄은 건너뛴다", async () => {
  const read = await readRosterFile(fileOf("roster-numbered.xlsx", await fixture("roster-numbered.xlsx")));
  assert.equal(read.skippedHeader, true);
  assert.equal(read.numbered, true);
  assert.equal(read.rows, 4);
  assert.equal(read.text, "1 김민준\n2 이서연\n3 박지호\n4 최하윤");
  // 읽은 글자는 기존 명단 검증을 그대로 통과해야 한다 — 검증 경로는 하나다.
  const parsed = parseRosterText(read.text);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.entries, [
    { seatNumber: 1, realName: "김민준" },
    { seatNumber: 2, realName: "이서연" },
    { seatNumber: 3, realName: "박지호" },
    { seatNumber: 4, realName: "최하윤" },
  ]);
});

test("이름만 있는 엑셀은 1번부터 차례로 번호를 붙인다 (다른 작성기가 만든 파일도 읽는다)", async () => {
  const read = await readRosterFile(fileOf("roster-names-only.xlsx", await fixture("roster-names-only.xlsx")));
  assert.equal(read.skippedHeader, false);
  assert.equal(read.numbered, false);
  assert.equal(read.text, "1 정다은\n2 한지우\n3 오시윤");
  assert.deepEqual(parseRosterText(read.text).errors, []);
});

test("엑셀이 내보낸 CSV의 BOM·따옴표·쉼표가 든 이름을 그대로 읽는다", async () => {
  const read = await readRosterFile(fileOf("roster.csv", await fixture("roster.csv")));
  assert.equal(read.skippedHeader, true);
  // 이름 안의 쉼표와 따옴표가 살아 있어야 한다.
  assert.equal(read.text, '1 김, 민준\n2 이"서연\n3 박지호');
  assert.equal(parseRosterText(read.text).entries[0].realName, "김, 민준");
});

test("엑셀에서 복사해 붙인 탭 구분 글자도 같은 길로 읽는다", async () => {
  const read = await readRosterFile(fileOf("roster.tsv", await fixture("roster.tsv")));
  assert.equal(read.text, "1 김민준\n2 이서연");
  assert.equal(detectDelimiter("1\t김민준\n"), "\t");
  assert.equal(detectDelimiter("1,김민준\n"), ",");
  assert.equal(detectDelimiter("1;김민준\n"), ";");
});

test("확장자가 없거나 틀려도 zip 서명을 보고 엑셀로 읽는다", async () => {
  const bytes = await fixture("roster-numbered.xlsx");
  const read = await readRosterFile(fileOf("우리반명단", bytes));
  assert.equal(read.rows, 4);
  // 옛 .xls는 형식이 달라 읽지 못한다고 분명히 알린다.
  await assert.rejects(() => readRosterFile(fileOf("old.xls", Buffer.from("bogus"))), /OLD_XLS/);
});

test("제목 줄 판별은 낱말로 하고, 숫자로 시작하는 줄은 자료로 본다", () => {
  assert.equal(looksLikeHeader(["번호", "이름"]), true);
  assert.equal(looksLikeHeader(["No", "Name"]), true);
  assert.equal(looksLikeHeader(["1", "김민준"]), false);
  assert.equal(looksLikeHeader(["김민준"]), false);
});

test("빈 줄과 빈 칸은 버리고, 번호가 섞여 있으면 이름만 있는 표로 본다", () => {
  const grid = parseDelimited("1,김민준\n\n2,이서연\n,\n");
  assert.deepEqual(grid, [["1", "김민준"], ["2", "이서연"]]);
  const mixed = gridToRosterText([["1", "김민준"], ["이서연"]]);
  assert.equal(mixed.numbered, false);
  assert.equal(mixed.text, "1 김민준\n2 이서연");
});

test("시트가 여럿이면 첫 시트를 읽고, 압축이 아닌 zip이 아니면 거절한다", async () => {
  const grid = await parseXlsx(await fixture("roster-numbered.xlsx"));
  assert.equal(grid[0][0], "번호");
  await assert.rejects(() => parseXlsx(Buffer.from("not a zip at all")), /NOT_A_ZIP/);
});

test("교사 화면이 파일을 서버로 보내지 않고 그 자리에서 읽는다", async () => {
  const settings = await readFile(new URL("../app/components/TeacherRosterSettings.tsx", import.meta.url), "utf8");
  assert.match(settings, /import \{ readRosterFile \} from "@\/lib\/roster-file"/);
  assert.match(settings, /type="file" accept="\.xlsx,\.csv,\.tsv,\.txt/);
  assert.match(settings, /엑셀·CSV 파일 불러오기/);
  // 파일을 업로드하는 경로가 생기면 안 된다 — 실명이 든 파일이다.
  assert.doesNotMatch(settings, /FormData|fetch\([^)]*file/);
  // 읽은 결과는 입력칸을 채울 뿐이고, 저장은 교사가 확인한 뒤 기존 addStudents로 간다.
  assert.match(settings, /setRoster\(read\.text\)/);
  assert.match(settings, /onAction\("addStudents", \{ roster: parsed\.entries \}\)/);
});

test("내려받는 엑셀 양식은 우리가 읽는 규칙과 정확히 맞물린다", async () => {
  // 양식을 만들고 → 우리 읽기로 되읽어 → 기존 명단 검증까지 통과해야 한다.
  const bytes = buildRosterTemplate();
  const read = await readRosterFile(fileOf("위글-명단-양식.xlsx", Buffer.from(bytes)));
  assert.equal(read.skippedHeader, true, "첫 줄 제목은 건너뛴다");
  assert.equal(read.numbered, true);
  assert.equal(read.text, "1 김민준\n2 이서연\n3 박지호");
  assert.deepEqual(parseRosterText(read.text).errors, []);
  // 양식 첫 줄은 읽기가 제목으로 알아보는 낱말이어야 한다.
  assert.equal(looksLikeHeader(ROSTER_TEMPLATE_ROWS[0]), true);
});

test("만든 xlsx는 zip 규격을 지키고 특수문자도 깨지지 않는다", async () => {
  const bytes = buildXlsx([["번호", "이름"], ["1", '김 & "민준" <1반>']], "명단");
  // zip 끝 표지와 항목 다섯 개(콘텐츠 타입·관계·워크북·관계·시트).
  const tail = Buffer.from(bytes.subarray(bytes.length - 22));
  assert.equal(tail.readUInt32LE(0), 0x06054b50);
  assert.equal(tail.readUInt16LE(8), 5);
  const grid = await parseXlsx(bytes);
  assert.deepEqual(grid, [["번호", "이름"], ["1", '김 & "민준" <1반>']]);
  // CRC32는 알려진 값과 맞아야 한다 — 엑셀이 깨진 파일로 보고 거절하지 않게.
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("교사 화면에 양식 내려받기가 있고 파일을 그 자리에서 만든다", async () => {
  const settings = await readFile(new URL("../app/components/TeacherRosterSettings.tsx", import.meta.url), "utf8");
  assert.match(settings, /엑셀 양식 내려받기/);
  assert.match(settings, /buildRosterTemplate\(\)/);
  assert.match(settings, /link\.download = "위글-명단-양식\.xlsx"/);
  assert.match(settings, /URL\.revokeObjectURL\(url\)/);
});
