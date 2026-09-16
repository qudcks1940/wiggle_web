export type StudentEntryResponse = {
  error?: string;
  code?: "NO_ROSTER" | "ENTRY_CODE";
  classroomName?: string;
  hasProfiles?: boolean;
  /* 선생님이 명단을 만든 학급인지. 명단 내용(번호·이름·코드 목록)은 서버가 절대 주지 않는다. */
  hasRoster?: boolean;
  /* 참여 코드는 맞지만 아직 아무도 들어오지 않은 자리 — 동물을 고르면 자리가 채워진다. */
  firstTime?: boolean;
  student?: { id: string; nickname: string; animal: string; classroomName: string };
  deviceToken?: string;
  expiresAt?: string;
};

export class StudentEntryResponseError extends Error {}

export type EntryErrorKind = "code" | "general";

// 아이가 스스로 복구할 행동을 고르기 위한 실패 분류:
// code → 수업 코드나 참여 코드가 틀림(선생님 불러요), 그 밖은 일반 오류(다시 해 보기).
export function classifyEntryError(status: number): EntryErrorKind {
  return status === 404 ? "code" : "general";
}

export async function readStudentEntryResponse(response: Response): Promise<StudentEntryResponse> {
  try {
    const value = JSON.parse(await response.text()) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid response shape");
    return value as StudentEntryResponse;
  } catch {
    throw new StudentEntryResponseError(
      response.ok
        ? "입장 응답을 확인하지 못했어요. 잠시 뒤 다시 해 주세요."
        : "입장 서버가 잠시 응답하지 않아요. 잠시 뒤 다시 해 주세요.",
    );
  }
}
