/**
 * 입장 QR 규칙 한곳.
 *
 * QR은 두 종류다(2026-09-13 사용자 결정).
 * - 반 QR: `<origin>/join/<수업 코드>` — 선생님 화면·전자칠판에 띄운다. 반만 정한다.
 * - 아이별 QR: `<origin>/join/<수업 코드>#entry=<참여 코드>` — 잘라 나눠 주는 쪽지에만 인쇄한다.
 *   찍으면 키패드 없이 바로 자기 도화지로 들어간다.
 *
 * 참여 코드를 쿼리(`?entry=`)가 아니라 주소 조각(`#entry=`)에 담는 이유:
 * 조각은 브라우저가 서버로 보내지 않아 접속 로그·Referer에 남지 않는다. 입장 화면은 읽자마자
 * `history.replaceState`로 조각을 지워 주소창·방문 기록에도 남기지 않는다.
 *
 * 태블릿 기본 카메라로 찍어도 같은 주소가 열리므로 앱 안 스캐너와 결과가 같다.
 */

const CODE = /^\d{4}$/;

export type EntryQr = { classCode: string; entryCode: string | null };

/** 아이별 쪽지 QR 주소. 참여 코드가 없는 자리(아직 미발급)는 반 QR로 떨어진다. */
export function entryQrUrl(origin: string, classCode: string, entryCode: string | null | undefined): string {
  const base = `${origin.replace(/\/+$/, "")}/join/${classCode}`;
  return entryCode && CODE.test(entryCode) ? `${base}#entry=${entryCode}` : base;
}

/**
 * 찍은 QR 글자에서 수업 코드와 (있으면) 참여 코드를 꺼낸다.
 *
 * 스캔한 주소를 그대로 따라가지 않는다 — 네 자리 숫자 둘만 꺼내 우리 주소로 다시 만든다.
 * 그래서 다른 도메인의 QR이나 운영에서 인쇄한 쪽지를 로컬에서 찍어도 안전하고 결과가 같다.
 * 형식이 조금이라도 다르면 null이다(추측해서 고치지 않는다).
 */
export function parseEntryQr(text: string): EntryQr | null {
  const raw = String(text ?? "").trim();
  if (!raw || raw.length > 300) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const match = url.pathname.match(/^\/join\/(\d{4})\/?$/);
  if (!match) return null;
  const classCode = match[1];
  const entryCode = readEntryHash(url.hash);
  return { classCode, entryCode };
}

/** `#entry=1234` 조각에서 참여 코드만 꺼낸다. 다른 값이 섞이면 무시한다. */
export function readEntryHash(hash: string): string | null {
  const value = new URLSearchParams(String(hash ?? "").replace(/^#/, "")).get("entry");
  return value && CODE.test(value) ? value : null;
}

/** 스캔 결과로 갈 우리 주소. 참여 코드는 다시 조각에 담는다. */
export function entryPathFor(qr: EntryQr): string {
  return qr.entryCode ? `/join/${qr.classCode}#entry=${qr.entryCode}` : `/join/${qr.classCode}`;
}
