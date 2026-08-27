import type { CSSProperties } from "react";
import type { Lesson } from "@/lib/lesson-content";
import { guideVariantLabel, guideVariantPresentation } from "@/lib/lesson-guide-variants";

const GUIDED_FINISHED_SPRITE = "/lessons/guided-finished-sprite.webp";
const GUIDED_FINISHED_CUTOUTS: Partial<Record<string, string>> = {
  "curious-cat": "/lessons/guided/curious-cat-v2.png",
};

export function LessonFinishedIllustration({ lesson, guideVariant = 0, className = "" }: { lesson: Lesson; guideVariant?: number; className?: string }) {
  const cutout = GUIDED_FINISHED_CUTOUTS[lesson.slug];
  const presentation = guideVariantPresentation(guideVariant);
  const bicycleMirror = lesson.slug === "delivery-bike";
  const mirrored = bicycleMirror !== presentation.mirrored;
  const transform = `scaleX(${mirrored ? -1 : 1}) rotate(${presentation.rotation}deg) scale(${presentation.scale})`;
  if (cutout) {
    return <img
      className={`lesson-finished-illustration transparent-cutout ${className}`.trim()}
      src={cutout}
      alt={`${lesson.title} ${guideVariantLabel(guideVariant)} 색칠 완성 예시`}
      loading="eager"
      decoding="async"
      style={{ transform }}
    />;
  }

  const column = Math.max(0, Math.min(4, (lesson.order - 1) % 5));
  const row = lesson.order > 5 ? 1 : 0;
  const style = {
    backgroundImage: `url(${GUIDED_FINISHED_SPRITE})`,
    backgroundPosition: `${column * 25}% ${row * 100}%`,
    // 자전거 원본 스프라이트의 시점 보정과 작품별 가이드 변형을 한 번에 적용한다.
    transform,
  } as CSSProperties;

  return <div
    className={`lesson-finished-illustration ${className}`.trim()}
    role="img"
    aria-label={`${lesson.title} ${guideVariantLabel(guideVariant)} 색칠 완성 예시`}
    style={style}
  />;
}
