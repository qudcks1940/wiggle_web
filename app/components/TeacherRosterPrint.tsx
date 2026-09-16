"use client";

import { entryQrUrl } from "@/lib/qr-entry";
import { QrCode } from "./QrCode";

export type PrintStudent = { id: string; seatNumber: number | null; realName: string | null; nickname: string; entryCode: string | null };

/* 인쇄용 코드표(2026-09-12). 종전에는 `window.open`으로 새 창을 띄웠는데, `noopener`를 준
 * window.open은 규격상 null을 돌려주므로 팝업이 허용돼 있어도 항상 실패했다. 그래서 이 시트를
 * 화면 안에 그리고 `@media print`가 이것만 남기도록 했다 — 브라우저 인쇄를 그대로 쓴다.
 *
 * 두 장으로 나눈다.
 *  1) 선생님 보관용 명단: 번호·이름·참여 코드 한 표.
 *  2) 아이에게 나눠 줄 쪽지: 잘라서 주면 그 종이 하나로 입장이 끝난다(아이별 QR + 수업 코드 + 내 코드).
 *     QR은 2026-09-13부터 아이마다 다르다 — 반 주소 뒤 조각(`#entry=`)에 그 아이 참여 코드를 담아
 *     찍으면 키패드 없이 바로 들어간다. 코드를 새로 뽑으면 옛 QR도 함께 죽는다(같은 코드를 담으므로).
 * 실명이 있으므로 교사 화면에서만 열리고, 나눠 주기 전에 자르라는 안내를 표에 함께 인쇄한다. */
export function TeacherRosterPrint({ classroomName, classCode, joinUrl, students }: {
  classroomName: string;
  classCode: string;
  joinUrl: string;
  students: PrintStudent[];
}) {
  const rows = [...students].sort((a, b) => (a.seatNumber ?? 1000) - (b.seatNumber ?? 1000));
  const nameOf = (student: PrintStudent) => student.realName ?? student.nickname;
  return <div className="roster-print" aria-label={`${classroomName} 참여 코드표 미리보기`}>
    <section className="roster-print-sheet roster-print-list">
      <header>
        <h3>{classroomName} 참여 코드표</h3>
        <p>수업 코드 <b>{classCode}</b> · 학생 {rows.length}명</p>
      </header>
      <p className="roster-print-note">이 장은 <b>선생님 보관용</b>입니다. 이름이 적혀 있으니 아이들에게는 다음 장의 쪽지를 잘라서 나눠 주세요.</p>
      <table>
        <thead><tr><th>번호</th><th>이름</th><th>참여 코드</th></tr></thead>
        <tbody>{rows.map((student) => <tr key={student.id}>
          <td>{student.seatNumber ?? "—"}</td>
          <td>{nameOf(student)}</td>
          <td className="roster-print-code">{student.entryCode ?? "—"}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="roster-print-sheet roster-print-slips">
      <header>
        <h3>잘라서 나눠 주는 쪽지</h3>
        <p>점선을 따라 자른 뒤 아이에게 한 장씩 주세요. 쪽지 한 장이면 들어올 수 있어요.</p>
      </header>
      <div className="roster-print-slip-grid">
        {rows.map((student) => <article className="roster-print-slip" key={student.id}>
          <div className="roster-print-slip-head">
            <b>{classroomName}</b>
            <span>{student.seatNumber ?? "—"}번 {nameOf(student)}</span>
          </div>
          <div className="roster-print-slip-body">
            <div className="roster-print-slip-qr">
              {/* 쪽지 QR은 그 아이 참여 코드를 담는다. 옆에 같은 코드가 글자로 이미 적혀 있어
                  종이 한 장이 입장 수단이라는 점은 종전과 같다(학생 입장 5항). */}
              <QrCode value={entryQrUrl(new URL(joinUrl).origin, classCode, student.entryCode)} label={`${nameOf(student)} 입장 QR`} variant="personal" />
              <small>{student.entryCode ? "찍으면 바로 들어가요" : "QR을 찍어요"}</small>
            </div>
            <dl>
              <div><dt>수업 코드</dt><dd className="roster-print-code">{classCode}</dd></div>
              <div><dt>내 참여 코드</dt><dd className="roster-print-code roster-print-code-big">{student.entryCode ?? "—"}</dd></div>
            </dl>
          </div>
          {/* 참여 코드가 있는 쪽지는 아이별 QR이라 찍기만 하면 들어간다. 코드가 아직 없는 자리는
              반 QR이므로 종전 안내를 그대로 둔다. */}
          <p className="roster-print-slip-foot">{student.entryCode ? "QR을 찍으면 바로 도화지가 열려요. 찍기 어려우면 참여 코드 네 자리를 눌러요." : "QR을 찍고 내 참여 코드 네 자리를 누르면 도화지가 열려요."}</p>
        </article>)}
      </div>
    </section>
  </div>;
}
