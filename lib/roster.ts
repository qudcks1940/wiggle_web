/* 교사가 입력하는 학급 명단 파싱.
 *
 * 화면은 번호 칸과 이름 칸을 따로 받는다(2026-09-20 사용자 결정) — 한 칸에 몰아 적으면
 * 어디까지가 번호인지 선생님이 매번 확인해야 했다. 그래서 `parseRosterRows`가 저장 직전의
 * 검증 경로다. `parseRosterText`는 남는다: 엑셀·CSV 파일과 표 붙여넣기가 "번호 이름" 줄로
 * 들어오고, 그것을 `rosterTextToRows`로 칸에 펼친다.
 * 줄 글자의 구분자는 공백·점·쉼표·탭을 모두 받는다.
 *
 * 이 함수들은 화면 안내용이다. 서버(`app/api/teacher/route.ts`)가 같은 규칙을 다시 검증하므로
 * 여기를 통과했다고 저장이 보장되지는 않는다. */
export const MAX_SEAT_NUMBER = 99;
export const MAX_REAL_NAME_LENGTH = 20;

export type RosterEntry = { seatNumber: number; realName: string };
export type RosterRow = { seat: string; name: string };

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

/** 번호 칸과 이름 칸을 그대로 검증한다. 둘 다 빈 칸은 아직 안 쓴 줄이므로 건너뛴다. */
export function parseRosterRows(rows: RosterRow[]): { entries: RosterEntry[]; errors: string[] } {
  const entries: RosterEntry[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();
  rows.forEach((row, index) => {
    const seat = row.seat.trim();
    const realName = row.name.trim().slice(0, MAX_REAL_NAME_LENGTH);
    // 이름이 비면 아직 쓰지 않은 줄이다. 화면이 번호를 미리 채워 두므로, 번호만 보고
    // 빈 줄을 오류로 세면 다이얼로그를 열자마자 빨간 글씨가 뜬다.
    if (!realName) return;
    // 이름을 적고 번호를 지우는 일은 흔하다. 비었는지와 잘못 적혔는지를 나눠 말한다.
    if (!seat) { errors.push(`${index + 1}번째 줄의 번호가 비어 있어요.`); return; }
    if (!/^\d{1,3}$/.test(seat)) { errors.push(`${index + 1}번째 줄의 번호는 숫자로 적어 주세요.`); return; }
    const seatNumber = Number(seat);
    if (seatNumber < 1 || seatNumber > MAX_SEAT_NUMBER) { errors.push(`${index + 1}번째 줄의 번호는 1~${MAX_SEAT_NUMBER}이어야 해요.`); return; }
    if (seen.has(seatNumber)) { errors.push(`${seatNumber}번이 두 번 있어요.`); return; }
    seen.add(seatNumber);
    entries.push({ seatNumber, realName });
  });
  return { entries, errors };
}

/**
 * 파일·붙여넣기로 들어온 "번호 이름" 글자를 칸으로 펼친다.
 * 읽지 못한 줄도 버리지 않고 이름 칸에 그대로 남긴다 — 교사가 화면에서 고치는 편이
 * "읽지 못했어요"만 보여 주고 글자를 잃는 것보다 낫다.
 */
export function rosterTextToRows(text: string): RosterRow[] {
  return text.split("\n").map((rawLine) => rawLine.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^(\d{1,3})\s*[.,\t]?\s*(.*)$/);
    return match ? { seat: match[1], name: match[2].trim() } : { seat: "", name: line };
  });
}
