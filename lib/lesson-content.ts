/**
 * 레슨 카탈로그의 잔해 (Story 2.3에서 축소).
 *
 * 테스트 진행용 활동 30개(4단계 기능 훈련 사다리)는 2026-08-30 제품 결정으로 은퇴했다 —
 * 커리큘럼은 은퇴했다(2026-09-12) — 수업은 빈 도화지에서 선생님이 진행한다.
 *
 * 남긴 것과 이유:
 * - 타입(Lesson·GuideMark·LessonStep·LessonMode): DrawingStudio의 레슨 기계가 참조한다.
 *   그 기계는 전부 lesson?. 가드 뒤라 카탈로그가 비면 자연히 자유 그리기로 동작한다.
 * - lessonBySlug: 레거시 lesson_slug 작품이 열릴 때 undefined를 돌려 자유 모드로 흐르게 한다.
 * - 활동 키: 이제 `free` 하나뿐이다. 예전 normalizeActivityKey의 `?? DEFAULT_ACTIVITY_KEY`
 *   폴백은 모르는 키를 조용히 특정 레슨으로 바꿔 읽는 함정이었다 — 지금 기본값은
 *   중립적인 자유 그리기이므로 같은 함정이 아니다(알 수 없는 키 = free로 읽되 400을 내지 않는다.
 *   기존 학급 행이 깨지지 않아야 하고, 처리 방식은 이 한 곳에만 있다).
 */
export type LessonMode = "practice" | "guided" | "observe";
export type GuideMark =
  | { step: number; kind: "line"; points: Array<[number, number]> }
  | { step: number; kind: "ellipse"; x: number; y: number; rx: number; ry: number }
  | { step: number; kind: "rect"; x: number; y: number; width: number; height: number }
  | { step: number; kind: "curve"; points: [[number, number], [number, number], [number, number], [number, number]] };
export type LessonStep = { instruction: string; choices?: string[]; activity?: "color" | "free" };
export type Lesson = {
  slug: string;
  stage: 1 | 2 | 3;
  order: number;
  mode: LessonMode;
  title: string;
  topic: string;
  emoji: string;
  description: string;
  referenceImage?: string;
  observationWords?: string[];
  steps: LessonStep[];
  guide: GuideMark[];
  finalFree: boolean;
};

/** 카탈로그는 비었다 — 레슨은 더 이상 만들 수 없고, 레거시 작품 조회만 undefined로 답한다. */
export const LESSONS: Lesson[] = [];

export const FREE_ACTIVITY_KEY = "free";
export const DEFAULT_ACTIVITY_KEY = FREE_ACTIVITY_KEY;
export const ACTIVITY_KEYS = new Set([FREE_ACTIVITY_KEY]);

export function lessonBySlug(slug: string | null | undefined): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug);
}

/** 알 수 없는 키(레거시 한글 라벨·은퇴한 lesson:<slug>)는 전부 free로 읽는다. 오류를 내지 않는다. */
export function normalizeActivityKey(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  return ACTIVITY_KEYS.has(raw) ? raw : FREE_ACTIVITY_KEY;
}

export function activityLabel(value: string | null | undefined) {
  void normalizeActivityKey(value);
  return "AI 가이드 자유 창작";
}

export function isActivityKey(value: string) {
  return ACTIVITY_KEYS.has(value);
}
