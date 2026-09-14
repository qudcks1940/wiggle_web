// 도구 막대(B안)의 세워진 도구 그림을 만든다(2026-09-14).
// 원본: docs/design-assets/studio-tool-dock/tools/<id>.webp(무손실) — 코덱스가 자홍(#FF00FF) 배경 위에 그리고,
// 지금 색으로 칠할 끝·띠를 초록(#00FF00)으로 칠했다. 이미지 생성이 색을 정확히 지키지 않아 "정도"로 가른다.
//   자홍 정도 m = min(R,B) - G  → 배경(투명)
//   초록 정도 g = G - max(R,B)  → 칠하기 틀(<id>-tint.webp, 알파만 의미). 바탕 그림에서는 옅은 회색으로 바꾼다.
// 사용: node scripts/build-dock-tools.mjs
import sharp from "sharp";

const SRC = "docs/design-assets/studio-tool-dock/tools";
const OUT = "public/drawing-tools/dock";
const ramp = (v, lo, hi) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

async function build(id, { crop, size, tint }) {
  const { data, info } = await sharp(`${SRC}/${id}.webp`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const base = Buffer.alloc(W * H * 4); const mask = Buffer.alloc(W * H * 4);
  for (let i = 0, o = 0; i < W * H; i++, o += 4) {
    let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const alpha = 1 - ramp(Math.min(r, b) - g, 24, 150);
    const greenness = tint ? ramp(g - Math.max(r, b), 40, 160) : 0;
    if (alpha > 0 && alpha < 1) { // 자홍과 섞인 가장자리: 배경 몫을 빼낸다
      r = (r - (1 - alpha) * 255) / alpha; g = (g - (1 - alpha) * 0) / alpha; b = (b - (1 - alpha) * 255) / alpha;
    }
    const spill = Math.min(r, b) - g; if (spill > 0) { r -= spill; b -= spill; }
    // 초록 자리는 옅은 회색(칠하기 틀이 조금 비껴도 초록이 비치지 않게)
    const gray = 232;
    r = r * (1 - greenness) + gray * greenness; g = Math.min(g, 255) * (1 - greenness) + gray * greenness; b = b * (1 - greenness) + gray * greenness;
    base[o] = Math.max(0, Math.min(255, Math.round(r))); base[o + 1] = Math.max(0, Math.min(255, Math.round(g))); base[o + 2] = Math.max(0, Math.min(255, Math.round(b)));
    base[o + 3] = Math.round(alpha * 255);
    mask[o] = mask[o + 1] = mask[o + 2] = 255; mask[o + 3] = Math.round(greenness * alpha * 255);
  }
  const shape = { raw: { width: W, height: H, channels: 4 } };
  const out = (buf) => sharp(buf, shape).extract(crop).resize(size.width, size.height).webp({ quality: 90, alphaQuality: 100 });
  await out(base).toFile(`${OUT}/${id}.webp`);
  if (tint) await out(mask).toFile(`${OUT}/${id}-tint.webp`);
  console.log(id, "ok");
}

// 붓·지우개: 가운데 폭 절반(512px)을 세로 전체로 잘라 1:3 비율(112×336)로 — 몸통 폭이 같은 배율로 맞는다.
const tool = { crop: { left: 256, top: 0, width: 512, height: 1536 }, size: { width: 112, height: 336 } };
for (const id of ["pencil", "crayon", "marker", "watercolor"]) await build(id, { ...tool, tint: true });
await build("eraser", { ...tool, tint: false });
// 대칭(나비): 그림 전체를 정사각으로
await build("mirror", { crop: { left: 0, top: 256, width: 1024, height: 1024 }, size: { width: 160, height: 160 }, tint: false });
