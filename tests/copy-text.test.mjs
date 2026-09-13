import assert from "node:assert/strict";
import test from "node:test";
import { copyNoticeText, copyText } from "../lib/copy-text.ts";

/** navigator·document를 갈아 끼워 각 맥락을 실제로 태워 본다. */
function withEnv({ clipboard, execCommand }, run) {
  const originalNavigator = globalThis.navigator;
  const originalDocument = globalThis.document;
  const appended = [];
  const doc = {
    createElement: () => ({
      style: {}, value: "", readOnly: false,
      setAttribute() {}, select() {}, setSelectionRange() {},
      remove() { appended.pop(); },
    }),
    body: { appendChild: (node) => appended.push(node) },
    execCommand: execCommand ?? (() => false),
  };
  Object.defineProperty(globalThis, "navigator", { value: clipboard ? { clipboard } : {}, configurable: true, writable: true });
  Object.defineProperty(globalThis, "document", { value: doc, configurable: true, writable: true });
  return Promise.resolve(run()).finally(() => {
    Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true, writable: true });
    Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true, writable: true });
    assert.equal(appended.length, 0, "폴백이 textarea를 화면에 남기면 안 된다");
  });
}

test("보안 맥락에서는 클립보드로 복사한다", async () => {
  let written = "";
  await withEnv({ clipboard: { writeText: async (text) => { written = text; } } }, async () => {
    assert.equal(await copyText("1234"), true);
  });
  assert.equal(written, "1234");
});

test("클립보드가 없는 비보안 맥락에서도 폴백으로 복사한다", async () => {
  // 교실 태블릿이 http://10.0.0.5:3000으로 열면 navigator.clipboard가 아예 없다.
  await withEnv({ clipboard: null, execCommand: () => true }, async () => {
    assert.equal(await copyText("1234"), true);
  });
});

test("클립보드가 거부해도 폴백을 한 번 더 시도한다", async () => {
  let tried = false;
  await withEnv({
    clipboard: { writeText: async () => { throw new Error("NotAllowedError"); } },
    execCommand: () => { tried = true; return true; },
  }, async () => {
    assert.equal(await copyText("1234"), true);
  });
  assert.equal(tried, true);
});

test("둘 다 실패하면 false를 돌려준다 — 부르는 쪽이 반드시 알리게", async () => {
  await withEnv({ clipboard: null, execCommand: () => false }, async () => {
    assert.equal(await copyText("1234"), false);
  });
});

test("빈 문자열은 복사하지 않는다", async () => {
  await withEnv({ clipboard: { writeText: async () => {} } }, async () => {
    assert.equal(await copyText(""), false);
  });
});

test("결과 문구는 성공과 실패를 구분해 알린다", () => {
  assert.equal(copyNoticeText(true, "수업 코드"), "수업 코드를 복사했어요.");
  assert.match(copyNoticeText(false, "수업 코드"), /직접 선택해 복사/);
});
