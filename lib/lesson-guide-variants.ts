import type { GuideMark, Lesson } from "@/lib/lesson-content";
import { FRIENDLY_DOG_GUIDES } from "@/lib/friendly-dog-guides";

export const GUIDED_LESSON_VARIANT_COUNT = 4;

const CUTE_CHARACTER_SLUGS = new Set([
  "friendly-dog",
  "curious-cat",
  "bouncy-rabbit",
  "little-fish",
  "smiling-flower",
  "ice-cream-cone",
  "moon-rocket",
  "happy-dinosaur",
]);

export const GUIDE_VARIANT_LABELS = ["방긋 정면", "반대쪽 인사", "왼쪽 갸웃", "오른쪽 갸웃"] as const;

function clampUnit(value: number) {
  return Math.max(0.025, Math.min(0.975, Number(value.toFixed(4))));
}

function normalizedVariant(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0
    ? number % GUIDED_LESSON_VARIANT_COUNT
    : 0;
}

function rotateAround(point: [number, number], pivot: [number, number], degrees: number): [number, number] {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const offsetX = point[0] - pivot[0];
  const offsetY = point[1] - pivot[1];
  return [pivot[0] + offsetX * cosine - offsetY * sine, pivot[1] + offsetX * sine + offsetY * cosine];
}

function transformPoint(slug: string, variantValue: number, step: number, point: [number, number]): [number, number] {
  const variant = normalizedVariant(variantValue);
  let [x, y] = point;

  // 동물·캐릭터는 머리를 조금 더 크고 몸을 짧게 만들어, 아이가 점선을
  // 그대로 따라도 참고 그림과 같은 꼬마 캐릭터 비율이 남도록 한다.
  if (CUTE_CHARACTER_SLUGS.has(slug)) {
    const headWeight = Math.max(0, Math.min(1, (0.58 - y) / 0.5));
    const bodyWeight = Math.max(0, Math.min(1, (y - 0.46) / 0.42));
    x = 0.5 + (x - 0.5) * (1 + headWeight * 0.075 - bodyWeight * 0.065);
    y -= bodyWeight * 0.032;

    // 같은 밑그림을 통째로 기울이는 데 그치지 않고, 얼굴 단계(1~3)와
    // 몸·소품 단계(4~5)의 중심과 비율을 따로 움직여 서로 다른 자세가 된다.
    if (variant === 1 && step <= 3) {
      x = 0.5 + (x - 0.5) * 1.045;
      y = 0.32 + (y - 0.32) * 1.025;
    }
    if (variant === 2) {
      if (step <= 3) [x, y] = rotateAround([x, y], [0.5, 0.32], -5);
      else x = 0.5 + (x - 0.5) * 0.955 + 0.012;
    }
    if (variant === 3) {
      if (step <= 3) [x, y] = rotateAround([x, y], [0.5, 0.32], 5);
      else x = 0.5 + (x - 0.5) * 0.93 - 0.014;
    }
  }

  if (variant === 1 || variant === 3) x = 1 - x;
  if (variant === 2) {
    x -= (0.7 - y) * 0.052;
    y = 0.5 + (y - 0.5) * 0.97;
  }
  if (variant === 3) {
    x += (0.7 - y) * 0.052;
    y = 0.5 + (y - 0.5) * 0.94;
  }

  return [clampUnit(x), clampUnit(y)];
}

function transformMark(slug: string, variant: number, mark: GuideMark): GuideMark {
  if (mark.kind === "line" || mark.kind === "curve") {
    return { ...mark, points: mark.points.map((point) => transformPoint(slug, variant, mark.step, point)) } as GuideMark;
  }
  if (mark.kind === "ellipse") {
    const center = transformPoint(slug, variant, mark.step, [mark.x, mark.y]);
    const left = transformPoint(slug, variant, mark.step, [mark.x - mark.rx, mark.y]);
    const right = transformPoint(slug, variant, mark.step, [mark.x + mark.rx, mark.y]);
    const top = transformPoint(slug, variant, mark.step, [mark.x, mark.y - mark.ry]);
    const bottom = transformPoint(slug, variant, mark.step, [mark.x, mark.y + mark.ry]);
    return {
      ...mark,
      x: center[0],
      y: center[1],
      rx: Math.max(0.008, Number((Math.abs(right[0] - left[0]) / 2).toFixed(4))),
      ry: Math.max(0.008, Number((Math.abs(bottom[1] - top[1]) / 2).toFixed(4))),
    };
  }

  const corners = [
    transformPoint(slug, variant, mark.step, [mark.x, mark.y]),
    transformPoint(slug, variant, mark.step, [mark.x + mark.width, mark.y]),
    transformPoint(slug, variant, mark.step, [mark.x + mark.width, mark.y + mark.height]),
    transformPoint(slug, variant, mark.step, [mark.x, mark.y + mark.height]),
  ];
  return { step: mark.step, kind: "line", points: [...corners, corners[0]] };
}

export function guideVariantIndex(value: unknown) {
  return normalizedVariant(value);
}

export function guideVariantLabel(value: unknown) {
  return GUIDE_VARIANT_LABELS[normalizedVariant(value)];
}

export function guideMarksForVariant(lesson: Lesson, value: unknown) {
  if (lesson.mode !== "guided") return lesson.guide;
  const variant = normalizedVariant(value);
  if (lesson.slug === "friendly-dog") return FRIENDLY_DOG_GUIDES[variant];
  return lesson.guide.map((mark) => transformMark(lesson.slug, variant, mark));
}

export function guideVariantPresentation(value: unknown) {
  const variant = normalizedVariant(value);
  if (variant === 1) return { mirrored: true, rotation: 0, scale: 0.98 };
  if (variant === 2) return { mirrored: false, rotation: -3, scale: 0.97 };
  if (variant === 3) return { mirrored: true, rotation: 3, scale: 0.95 };
  return { mirrored: false, rotation: 0, scale: 1 };
}
