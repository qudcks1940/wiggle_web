// 사용: node scripts/key-magenta.mjs docs/design-assets/animal-picker/codex-assets/rabbit.webp /tmp/rabbit.png 512
//  → sharp(out).webp({quality:88}) 로 public/entry-green/animals/rabbit.webp 를 만든다(2026-09-14).
// 평평한 자홍색(#FF00FF) 배경을 따내 투명 PNG로 만든다.
// 자홍색 정도 m = min(R,B) - G. 순수 자홍은 255, 흰 털·분홍 볼·주황·초록·회색은 0 이하라 확실히 갈린다.
// 털 가장자리처럼 섞인 픽셀은 m에 비례해 투명하게 하고, 남은 자홍 기운(스필)을 G 쪽으로 걷어낸다.
import sharp from "sharp";
const [input, output, sizeArg] = process.argv.slice(2);
const SIZE = Number(sizeArg || 0); // 0이면 원래 크기 그대로(장식처럼 정사각형이 아닌 그림)
const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const out = Buffer.alloc(W * H * 4);
const LO = 24, HI = 150; // m이 LO 이하는 불투명, HI 이상은 완전 투명
const K = [255, 0, 255];
let cleared = 0;
for (let i = 0, o = 0; i < W * H; i++, o += 4) {
  let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const m = Math.min(r, b) - g;
  let a = 1;
  if (m >= HI) { a = 0; cleared++; }
  else if (m > LO) a = 1 - (m - LO) / (HI - LO);
  if (a > 0 && a < 1) {
    // 섞인 가장자리: C = a·F + (1-a)·K 이므로 F = (C - (1-a)·K) / a 로 배경 몫을 빼낸다.
    r = (r - (1 - a) * K[0]) / a; g = (g - (1 - a) * K[1]) / a; b = (b - (1 - a) * K[2]) / a;
  }
  // 남은 옅은 자홍 기운(스필): G보다 튀어나온 R·B의 공통분을 걷어낸다.
  const spill = Math.min(r, b) - g;
  if (a > 0 && spill > 0) { r -= spill; b -= spill; }
  out[o] = Math.max(0, Math.min(255, Math.round(r)));
  out[o + 1] = Math.max(0, Math.min(255, Math.round(g)));
  out[o + 2] = Math.max(0, Math.min(255, Math.round(b)));
  out[o + 3] = Math.round(a * a * 255); // 반투명 가장자리를 조금 더 걷어 크림 카드 위 어두운 테를 줄인다
}
// 코덱스가 잡은 구도(여백·눈높이)를 그대로 둔다 — 잘라 다시 맞추면 귀 긴 토끼만 머리가 작아진다.
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(SIZE ? { width: SIZE, height: SIZE } : undefined).png().toFile(output);
console.log(JSON.stringify({ input: input.split("/").pop(), source: `${W}x${H}`, clearedPct: +(cleared / (W * H) * 100).toFixed(1) }));
