/**
 * 클립보드 복사 한 경로.
 *
 * `navigator.clipboard`는 보안 맥락(HTTPS·localhost)에서만 존재한다. 교사가 교실
 * 태블릿에서 내부 주소(`http://10.0.0.5:3000`)로 열면 아예 없어서, `navigator.clipboard?.`
 * 처럼 옵셔널 체이닝으로 부르면 아무 일도 없이 조용히 끝난다 — 눌러도 반응이 없다는
 * 2026-09-13 사용자 신고의 원인이다.
 *
 * 그래서 두 가지를 한다.
 * 1. 보안 맥락이 아니면 옛 `execCommand("copy")`로 한 번 더 시도한다. 폐기 예정
 *    API지만 비보안 맥락에서도 동작해 교실 태블릿을 실제로 살린다.
 * 2. 성공·실패를 boolean으로 돌려준다. 부르는 쪽이 반드시 결과를 화면에 알리게 한다.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한 거부나 포커스 없음. 아래 폴백으로 넘어간다.
  }
  return legacyCopy(text);
}

/** 비보안 맥락 폴백. 화면에 보이지 않는 textarea를 잠깐 두고 선택해 복사한다. */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  // readOnly로 두면 iOS에서 키보드가 뜨지 않는다. 화면 밖으로 밀어 레이아웃도 건드리지 않는다.
  area.readOnly = true;
  area.setAttribute("aria-hidden", "true");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** 복사 결과를 아이·교사가 읽을 수 있는 한 문장으로 바꾼다. 문구가 갈라지지 않게 여기서만 만든다. */
export function copyNoticeText(ok: boolean, label: string): string {
  return ok ? `${label}를 복사했어요.` : `자동 복사가 되지 않아요. ${label}를 직접 선택해 복사해 주세요.`;
}
