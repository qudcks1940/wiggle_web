/* 교사가 입력하는 학급 명단 파싱.
 * 한 줄에 한 명씩 "번호 이름"으로 받는다. 15명을 칸 15개로 나누면 입력이 느리고,
 * 선생님이 이미 갖고 있는 명부를 그대로 붙여 넣기도 어렵다.
 * 구분자는 공백·점·쉼표·탭을 모두 받는다.
 *
 * 이 함수는 화면 안내용이다. 서버(`app/api/teacher/route.ts`)가 같은 규칙을 다시 검증하므로
 * 여기를 통과했다고 저장이 보장되지는 않는다. */
export const MAX_SEAT_NUMBER = 99;
export const MAX_REAL_NAME_LENGTH = 20;

export type RosterEntry = { seatNumber: number; realName: string };

export function parseRosterText(text: string): { entries: RosterEntry[]; errors: string[] } {
  const entries: RosterEntry[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();
  text.split("\n").forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const match = line.match(/^(\d{1,3})\s*[.,\t]?\s*(.+)$/);
    if (!match) { errors.push(`${index + 1}번째 줄을 읽지 못했어요: "${line}"`); return; }
    const seatNumber = Number(match[1]);
    const realName = match[2].trim().slice(0, MAX_REAL_NAME_LENGTH);
    if (seatNumber < 1 || seatNumber > MAX_SEAT_NUMBER) { errors.push(`${index + 1}번째 줄의 번호는 1~${MAX_SEAT_NUMBER}이어야 해요.`); return; }
    if (!realName) { errors.push(`${seatNumber}번 이름이 비어 있어요.`); return; }
    if (seen.has(seatNumber)) { errors.push(`${seatNumber}번이 두 번 있어요.`); return; }
    seen.add(seatNumber);
    entries.push({ seatNumber, realName });
  });
  return { entries, errors };
}
