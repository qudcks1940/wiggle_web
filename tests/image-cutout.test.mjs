import assert from "node:assert/strict";
import test from "node:test";
import { containedCropPlacement, opaqueBounds, removeConnectedColor, removeEdgeBackground } from "../lib/image-cutout.ts";

function image(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) data.set(pixel(x, y), (y * width + x) * 4);
  return { width, height, data };
}

test("가장자리와 이어진 단색 배경만 지우고 캐릭터 경계를 남긴다", () => {
  const value = image(5, 5, (x, y) => x >= 1 && x <= 3 && y >= 1 && y <= 3 ? [220, 40, 70, 255] : [250, 250, 250, 255]);
  assert.equal(removeEdgeBackground(value, 12), 16);
  assert.deepEqual(opaqueBounds(value), { x: 1, y: 1, width: 3, height: 3 });
});

test("네 모서리 색을 보간해 그라데이션 배경도 자동 제거한다", () => {
  const value = image(7, 5, (x, y) => {
    if (x >= 2 && x <= 4 && y >= 1 && y <= 3) return [35, 70, 210, 255];
    const t = x / 6; return [Math.round(230 + 20 * t), Math.round(245 - 25 * t), Math.round(255 - 45 * t), 255];
  });
  assert.equal(removeEdgeBackground(value, 18), 26);
  assert.deepEqual(opaqueBounds(value, 1), { x: 1, y: 0, width: 5, height: 5 });
});

test("누른 색과 연결된 영역만 지우고 떨어진 같은 색은 보존한다", () => {
  const value = image(5, 5, (x, y) => x === 0 || x === 4 || y === 0 || y === 4 || (x === 2 && y === 2) ? [255, 255, 255, 255] : [20, 90, 190, 255]);
  const removed = removeConnectedColor(value, 0, 0, 5);
  assert.equal(removed, 16);
  assert.equal(value.data[(2 * 5 + 2) * 4 + 3], 255);
});

test("완전히 지운 그림은 내보낼 경계가 없다", () => {
  const value = image(2, 2, () => [0, 0, 0, 0]);
  assert.equal(opaqueBounds(value, 4), null);
});

test("잘라낸 캐릭터가 원본 그림 안에서 보이던 크기와 위치를 유지한다", () => {
  const placement = containedCropPlacement(
    { x: .1, y: .1, width: .6, height: .55 },
    4 / 3,
    4 / 3,
    { x: .3, y: .2, width: .4, height: .6 },
  );
  assert.ok(Math.abs(placement.x - .29) < 1e-9);
  assert.ok(Math.abs(placement.y - .21) < 1e-9);
  assert.ok(Math.abs(placement.width - .22) < 1e-9);
  assert.ok(Math.abs(placement.height - .33) < 1e-9);
});
