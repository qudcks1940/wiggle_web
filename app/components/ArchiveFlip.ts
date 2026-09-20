/* 내 그림 보관함의 페이지 넘김 상태 기계 (2026-09-20 GPT 인계 MOTION-SPEC.md).
 *
 * 화면과 떼어 둔 이유: "어느 그림으로 갈지"는 규칙이고, "어떻게 도는지"만 CSS다.
 * 목록 클릭·이전/다음·스와이프·키보드가 모두 이 한 곳으로 들어와야 입력마다 다른 버그가 안 생긴다. */

export const FLIP_MS = 400;
export const FLIP_EASING = "cubic-bezier(.22,.61,.36,1)";

export type FlipDirection = "next" | "prev";
export type FlipPhase = "idle" | "preparing" | "turning";

/** 목록에서 고른 순서와 이동 방향으로 실제로 갈 칸을 정한다. 순환하지 않는다. */
export function stepIndex(current: number, direction: FlipDirection, count: number) {
  if (count <= 1) return current;
  const next = direction === "next" ? current + 1 : current - 1;
  if (next < 0 || next >= count) return current;
  return next;
}

/** 목록이 바뀌어 고른 그림이 사라져도 빈 화면이 되지 않게 붙잡아 준다. */
export function settleIndex(ids: string[], selectedId: string) {
  const found = ids.indexOf(selectedId);
  if (found >= 0) return found;
  return ids.length ? 0 : -1;
}

/** 한 손가락 가로 스와이프만 한 장 넘김으로 친다.
 *  세로 스크롤과 두 손가락 확대를 뺏지 않으려고 가로가 세로보다 1.5배 이상일 때만 센다. */
export function swipeDirection(dx: number, dy: number): FlipDirection | null {
  if (Math.abs(dx) < 48) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "prev";
}

/** 넘김 뒤 스크린 리더에 한 번만 읽어 줄 문구. 경과 시간처럼 계속 바뀌는 값은 넣지 않는다. */
export function flipAnnouncement(index: number, count: number, title: string) {
  return `${count}장 중 ${index + 1}번째 그림, ${title}`;
}
