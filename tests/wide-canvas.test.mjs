import assert from "node:assert/strict";
import test from "node:test";
import { clampDocumentHeight, DEFAULT_DOCUMENT_HEIGHT, DOCUMENT_HEIGHT_STEP, DOCUMENT_MAX_HEIGHT, DOCUMENT_MIN_HEIGHT, DOCUMENT_SIZE, documentHeight, emptyDocument, isDocumentHeight, validateDrawDocument } from "../lib/drawing-model.ts";

/* 가로 도화지의 안전 계약.
 * 좌표는 x·y 모두 0~1로 정규화돼 있어, 같은 문서라도 세로가 달라지면 다르게 그려진다.
 * 그래서 세로는 문서에 함께 저장하고, `height`가 없는 기존 작품은 반드시 정사각으로 남아야 한다.
 * 이 규칙이 깨지면 아이가 이미 저장한 그림이 조용히 찌그러진다. */

const stroke = (id) => ({
  opId: `op_${id}`,
  clientOpId: `client_${id}`,
  type: "stroke",
  at: "2026-09-07T00:00:00.000Z",
  tool: "pencil",
  color: "#1B3A57",
  width: 16,
  points: [{ x: 0.2, y: 0.2, pressure: 0.5 }, { x: 0.8, y: 0.8, pressure: 0.5 }],
  smoothed: true,
});

const document = (extra) => ({ schemaVersion: 1, rendererVersion: 1, size: DOCUMENT_SIZE, ops: [stroke("wide12345678")], ...extra });

test("height가 없는 기존 문서는 정사각으로 남고, 검증을 지나도 height가 붙지 않는다", () => {
  const legacy = validateDrawDocument(document());
  assert.ok(legacy, "기존 모양의 문서는 그대로 통과해야 한다");
  assert.equal(legacy.height, undefined, "없던 height를 붙이면 저장된 그림의 비율이 바뀐다");
  assert.equal(documentHeight(legacy), DOCUMENT_SIZE);
});

test("가로 도화지의 height는 검증을 지나도 보존된다", () => {
  const wide = validateDrawDocument(document({ height: 768 }));
  assert.ok(wide, "허용된 세로는 통과해야 한다");
  // validate는 문서를 다시 만들어 돌려준다. 여기서 height를 빠뜨리면 저장된 가로 도화지가 정사각이 된다.
  assert.equal(wide.height, 768);
  assert.equal(documentHeight(wide), 768);
});

test("범위 밖이거나 단위가 맞지 않는 세로는 거절한다", () => {
  // 아무 값이나 받으면 저장된 그림의 비율을 마음대로 바꿀 수 있고, 극단적 비율은 썸네일을 깨뜨린다.
  for (const height of [DOCUMENT_MIN_HEIGHT - 16, DOCUMENT_MAX_HEIGHT + 16, 0, -768, "768", null, 768.5, 777]) {
    assert.equal(validateDrawDocument(document({ height })), null, `height ${height}는 거절해야 한다`);
  }
  for (const height of [DOCUMENT_MIN_HEIGHT, 640, 768, DOCUMENT_MAX_HEIGHT]) {
    assert.ok(validateDrawDocument(document({ height })), `height ${height}는 통과해야 한다`);
  }
});

test("화면에서 잰 비율은 저장 가능한 값으로 맞춰진다", () => {
  // 도화지는 화면을 채워야 하므로 세로를 화면에서 재는데, 그 값이 그대로 저장되면 안 된다.
  for (const raw of [10, 0, -50, 5000, Number.NaN, Number.POSITIVE_INFINITY]) {
    const value = clampDocumentHeight(raw);
    assert.ok(isDocumentHeight(value), `clamp 결과는 항상 저장 가능해야 한다: ${raw} -> ${value}`);
    assert.ok(validateDrawDocument(document({ height: value })), `clamp 결과는 서버 검증도 통과해야 한다: ${value}`);
  }
  assert.equal(clampDocumentHeight(DOCUMENT_MIN_HEIGHT - 100), DOCUMENT_MIN_HEIGHT);
  assert.equal(clampDocumentHeight(DOCUMENT_MAX_HEIGHT + 100), DOCUMENT_MAX_HEIGHT);
  // 16의 배수로 맞춰 값이 무한히 늘어나지 않게 한다.
  assert.equal(clampDocumentHeight(700) % DOCUMENT_HEIGHT_STEP, 0);
});

test("새 문서는 가로 도화지이고, 그 값은 저장 가능하다", () => {
  const fresh = emptyDocument();
  assert.equal(fresh.height, DEFAULT_DOCUMENT_HEIGHT);
  assert.ok(isDocumentHeight(DEFAULT_DOCUMENT_HEIGHT));
  assert.ok(DEFAULT_DOCUMENT_HEIGHT < DOCUMENT_SIZE, "가로가 더 긴 도화지여야 한다");
  assert.ok(validateDrawDocument(fresh), "새 문서는 서버 검증을 통과해야 한다");
});

test("문서 가로는 1024로 고정이다 — 굵기·글자 크기가 이 단위로 저장돼 있다", () => {
  assert.equal(DOCUMENT_SIZE, 1024);
  assert.equal(validateDrawDocument(document({ size: 768 })), null);
});
