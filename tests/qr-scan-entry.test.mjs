import assert from "node:assert/strict";
import test from "node:test";
import { entryPathFor, entryQrUrl, parseEntryQr, readEntryHash } from "../lib/qr-entry.ts";

test("반 QR은 수업 코드만, 아이별 QR은 참여 코드를 주소 조각에 담는다", () => {
  assert.equal(entryQrUrl("https://wiggleweb.vercel.app", "4341", null), "https://wiggleweb.vercel.app/join/4341");
  assert.equal(entryQrUrl("https://wiggleweb.vercel.app/", "4341", "0912"), "https://wiggleweb.vercel.app/join/4341#entry=0912");
  // 참여 코드는 쿼리가 아니라 조각이어야 한다 — 조각은 서버로 가지 않아 접속 로그에 남지 않는다.
  assert.doesNotMatch(entryQrUrl("https://x.test", "4341", "0912"), /\?entry=/);
  // 아직 발급 안 된 자리는 반 QR로 떨어진다.
  assert.equal(entryQrUrl("https://x.test", "4341", ""), "https://x.test/join/4341");
  assert.equal(entryQrUrl("https://x.test", "4341", "12"), "https://x.test/join/4341");
});

test("찍은 QR에서 네 자리 숫자 둘만 꺼낸다", () => {
  assert.deepEqual(parseEntryQr("https://wiggleweb.vercel.app/join/4341"), { classCode: "4341", entryCode: null });
  assert.deepEqual(parseEntryQr("https://wiggleweb.vercel.app/join/4341#entry=0912"), { classCode: "4341", entryCode: "0912" });
  // 운영에서 인쇄한 쪽지를 로컬에서 찍어도 같은 결과 — 스캔한 주소를 따라가지 않고 숫자만 꺼낸다.
  assert.deepEqual(parseEntryQr("http://localhost:3301/join/4341/#entry=0912"), { classCode: "4341", entryCode: "0912" });
  assert.deepEqual(parseEntryQr("  https://x.test/join/4341  "), { classCode: "4341", entryCode: null });
});

test("형식이 조금이라도 다르면 추측하지 않고 거절한다", () => {
  for (const bad of [
    "", "4341", "hello", "https://x.test/", "https://x.test/join", "https://x.test/join/434", "https://x.test/join/43411",
    "https://x.test/join/abcd", "https://x.test/join/4341/extra", "https://x.test/teacher/4341",
    "javascript:alert(1)//join/4341", "ftp://x.test/join/4341", "data:text/html,/join/4341",
    `https://x.test/join/4341#${"a".repeat(400)}`,
  ]) {
    assert.equal(parseEntryQr(bad), null, `거절해야 함: ${bad.slice(0, 60)}`);
  }
  // 조각의 참여 코드가 형식에 안 맞으면 반만 인정한다(참여 코드를 지어내지 않는다).
  assert.deepEqual(parseEntryQr("https://x.test/join/4341#entry=12"), { classCode: "4341", entryCode: null });
  assert.deepEqual(parseEntryQr("https://x.test/join/4341#entry=09a2"), { classCode: "4341", entryCode: null });
  // 쿼리로 들어온 참여 코드는 받지 않는다 — 인쇄물이 조각 형식만 만든다.
  assert.deepEqual(parseEntryQr("https://x.test/join/4341?entry=0912"), { classCode: "4341", entryCode: null });
});

test("조각 읽기와 이동 주소", () => {
  assert.equal(readEntryHash("#entry=0912"), "0912");
  assert.equal(readEntryHash("entry=0912"), "0912");
  assert.equal(readEntryHash("#entry=0912&x=1"), "0912");
  assert.equal(readEntryHash("#other=1"), null);
  assert.equal(readEntryHash(""), null);
  assert.equal(entryPathFor({ classCode: "4341", entryCode: "0912" }), "/join/4341#entry=0912");
  assert.equal(entryPathFor({ classCode: "4341", entryCode: null }), "/join/4341");
});

// 인쇄 → 촬영 → 해석 전체를 실제로 태운다. 쪽지 QR을 같은 라이브러리(qrcode)로 그리고,
// 스캐너와 같은 디코더(jsqr)로 풀어, 입장 규칙(parseEntryQr)이 원래 코드를 되찾는지 본다.
test("쪽지에 인쇄한 아이별 QR을 찍으면 원래 반·참여 코드를 되찾는다", async () => {
  const QRCode = (await import("qrcode")).default;
  const jsQR = (await import("jsqr")).default;
  const sharp = (await import("sharp")).default;
  for (const [classCode, entryCode] of [["4341", "0912"], ["7319", "0001"], ["1000", null]]) {
    const url = entryQrUrl("https://wiggleweb.vercel.app", classCode, entryCode);
    const png = await QRCode.toBuffer(url, { margin: 2, scale: 6 });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const found = jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: "dontInvert" });
    assert.ok(found, `디코더가 QR을 읽어야 함: ${url}`);
    assert.equal(found.data, url);
    assert.deepEqual(parseEntryQr(found.data), { classCode, entryCode });
  }
});

test("입장 화면은 조각을 네트워크 전에 지우고, 두 화면 모두 QR 찍기가 있다", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const [join, landing, print, teacher, scanner] = await Promise.all([
    read("../app/components/JoinClient.tsx"), read("../app/components/LandingCodeForm.tsx"),
    read("../app/components/TeacherRosterPrint.tsx"), read("../app/components/TeacherApp.tsx"), read("../app/components/QrScanner.tsx"),
  ]);
  // 조각은 읽자마자 지우고, 그다음에 반 확인(checkEntry)을 부른다.
  const effect = join.slice(join.indexOf("const fromHash = readEntryHash"), join.indexOf("void checkEntry();"));
  assert.match(effect, /history\.replaceState\(history\.state, "", location\.pathname \+ location\.search\)/);
  // QR로 채운 직후 상태가 반영되지 않았으므로 코드를 인자로 넘긴다.
  assert.match(join, /async function submit\(chosenAnimal = "", code = codeInput\)/);
  assert.match(join, /entryCode: code,/);
  assert.match(join, /내 쪽지 QR로 찍기/);
  assert.match(landing, /QR로 찍기/);
  // 스캐너는 찍은 주소를 따라가지 않는다 — 두 화면 모두 parseEntryQr을 거친다.
  assert.match(join, /parseEntryQr\(text\)/);
  assert.match(landing, /parseEntryQr\(text\)/);
  assert.doesNotMatch(scanner, /location\.(href|assign|replace)/);
  // 쪽지는 아이별 QR, 선생님 화면(전자칠판)의 큰 QR은 반 QR 그대로다 — 한 아이 코드를 반 전체에 띄우면 안 된다.
  assert.match(print, /entryQrUrl\(new URL\(joinUrl\)\.origin, classCode, student\.entryCode\)/);
  assert.doesNotMatch(teacher, /entryQrUrl|#entry=/);
});
