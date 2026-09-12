"use client";

import { QrCode } from "./QrCode";

export type PrintStudent = { id: string; seatNumber: number | null; realName: string | null; nickname: string; entryCode: string | null };

/* 인쇄용 코드표(2026-09-12). 종전에는 `window.open`으로 새 창을 띄웠는데, `noopener`를 준
 * window.open은 규격상 null을 돌려주므로 팝업이 허용돼 있어도 항상 실패했다. 그래서 이 시트를
 * 화면 안에 그리고 `@media print`가 이것만 남기도록 했다 — 브라우저 인쇄를 그대로 쓴다.
 *
 * 두 장으로 나눈다.
 *  1) 선생님 보관용 명단: 번호·이름·참여 코드 한 표.
 *  2) 아이에게 나눠 줄 쪽지: 잘라서 주면 그 종이 하나로 입장이 끝난다(반 QR + 수업 코드 + 내 코드).
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
              <QrCode value={joinUrl} label={`${classroomName} 입장 QR`} variant="personal" />
              <small>QR을 찍어요</small>
            </div>
            <dl>
              <div><dt>수업 코드</dt><dd className="roster-print-code">{classCode}</dd></div>
              <div><dt>내 참여 코드</dt><dd className="roster-print-code roster-print-code-big">{student.entryCode ?? "—"}</dd></div>
            </dl>
          </div>
          <p className="roster-print-slip-foot">QR을 찍고 내 참여 코드 네 자리를 누르면 도화지가 열려요.</p>
        </article>)}
      </div>
    </section>
  </div>;
}
