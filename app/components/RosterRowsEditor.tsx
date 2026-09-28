"use client";

import { useState } from "react";
import { Download, Plus, Upload, X } from "lucide-react";
import { MAX_REAL_NAME_LENGTH, MAX_SEAT_NUMBER, parseRosterRows, RosterRow, rosterTextToRows } from "@/lib/roster";
import { readRosterFile } from "@/lib/roster-file";
import { buildRosterTemplate } from "@/lib/xlsx-write";
import "./TeacherRosterSettings.css";

/* 번호 칸과 이름 칸으로 명단을 적는 편집기.
 *
 * 학급을 만들 때와 만든 뒤에 학생을 더할 때가 서로 다른 입력이면 선생님이 두 번 배운다.
 * 그래서 두 화면이 이 한 컴포넌트를 함께 쓴다(2026-09-23 사용자 요청) —
 * 종전에는 학급 만들기만 "한 줄에 번호 이름" 텍스트 상자를 썼다.
 *
 * 붙여 넣기와 번호 자동 채움이 여기 있는 이유: 25명을 넣는 선생님이 번호를 손으로 다시 세지 않게 하려는 것이다. */

export function blankRows(start: number, count = 5): RosterRow[] {
  return Array.from({ length: count }, (_, index) => ({ seat: String(Math.min(MAX_SEAT_NUMBER, start + index)), name: "" }));
}

/** 비어 있는 번호 칸을 앞 줄 다음 번호로 채운다. 이름만 있는 표를 붙여 넣어도 번호가 생긴다. */
export function withSeats(list: RosterRow[], start: number): RosterRow[] {
  let seat = start;
  return list.map((row) => {
    const value = Number(row.seat);
    if (row.seat.trim() && Number.isInteger(value) && value > 0) { seat = value + 1; return row; }
    const filled = { ...row, seat: String(Math.min(MAX_SEAT_NUMBER, seat)) };
    seat += 1;
    return filled;
  });
}

export function seatAfter(list: RosterRow[], fallback: number) {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const value = Number(list[index].seat);
    if (list[index].seat.trim() && Number.isInteger(value) && value > 0) return Math.min(MAX_SEAT_NUMBER, value + 1);
  }
  return fallback;
}

/* 파일 불러오기 + 번호·이름 칸을 함께 묶은 것. 학급을 만들 때와 만든 뒤에 학생을 더할 때가
 * 같은 입력이어야 하므로 두 화면이 이것을 쓴다(2026-09-28 사용자 요청 — 만들기 쪽에 엑셀
 * 불러오기가 없었다). 알림은 여기서 들고 있다가 교사가 칸을 건드리면 스스로 지운다.
 *
 * 파일은 서버로 보내지 않는다. 실명이 든 파일이라 교사 브라우저 안에서만 읽고,
 * 교사가 칸에서 확인한 뒤 저장한다. */
export function RosterEditor({ rows, setRows, firstSeat, onError, label }: {
  rows: RosterRow[];
  setRows: (update: (current: RosterRow[]) => RosterRow[]) => void;
  firstSeat: number;
  /** 파일을 읽지 못했을 때 바깥 화면의 오류 자리에 띄운다. */
  onError: (message: string) => void;
  label?: string;
}) {
  const [notice, setNotice] = useState("");

  async function importFile(file: File | undefined) {
    if (!file) return;
    onError(""); setNotice("");
    try {
      const read = await readRosterFile(file);
      if (!read.rows) { onError(`${file.name}에서 읽을 줄을 찾지 못했어요. 번호와 이름이 있는 표인지 확인해 주세요.`); return; }
      const imported = withSeats(rosterTextToRows(read.text), firstSeat);
      setRows(() => [...imported, ...blankRows(seatAfter(imported, firstSeat), 1)]);
      const parts = [`${file.name}에서 ${read.rows}명을 읽었어요.`];
      if (read.skippedHeader) parts.push("첫 줄은 제목으로 보고 건너뛰었어요.");
      if (!read.numbered) parts.push("번호가 없어서 1번부터 차례로 붙였어요.");
      parts.push("저장 전에 확인해 주세요.");
      setNotice(parts.join(" "));
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      onError(code === "OLD_XLS"
        ? "옛 엑셀(.xls)은 읽지 못해요. 엑셀에서 .xlsx나 CSV로 저장해 주세요."
        : `${file.name}을(를) 읽지 못했어요. 엑셀(.xlsx)이나 CSV 파일인지 확인해 주세요.`);
    }
  }

  /* 양식도 브라우저 안에서 만든다. 서버에 정적 파일을 두면 양식과 읽기 규칙이 따로 논다. */
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([buildRosterTemplate() as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url; link.download = "위글-명단-양식.xlsx";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice("양식을 내려받았어요. 번호와 이름을 채운 뒤 다시 불러오면 돼요.");
  }

  return <>
    <div className="trs-import">
      <label className="trs-import-button">
        <Upload size={18} />엑셀·CSV 파일 불러오기
        <input type="file" accept=".xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void importFile(file); }} />
      </label>
      <small>엑셀에서 표를 복사해 이름 칸에 붙여 넣어도 돼요.</small>
      <button type="button" className="trs-template-button" onClick={downloadTemplate}><Download size={15} />엑셀 양식 내려받기</button>
    </div>
    {notice && <p className="trs-import-notice" role="status">{notice}</p>}
    <RosterRowsEditor rows={rows} setRows={setRows} firstSeat={firstSeat} onEdit={() => setNotice("")} label={label} />
  </>;
}

export function RosterRowsEditor({ rows, setRows, firstSeat, onEdit, label = "학생 번호와 이름" }: {
  rows: RosterRow[];
  setRows: (update: (current: RosterRow[]) => RosterRow[]) => void;
  /** 이어 붙이는 학급이면 마지막 번호 다음부터 시작한다. 선생님이 번호를 다시 세지 않는다. */
  firstSeat: number;
  /** 줄을 건드릴 때 바깥에서 지울 안내가 있으면 준다(예: 파일 불러오기 알림). */
  onEdit?: () => void;
  label?: string;
}) {
  const parsed = parseRosterRows(rows);

  function editRow(index: number, patch: Partial<RosterRow>) {
    onEdit?.();
    setRows((current) => {
      const next = current.map((row, at) => (at === index ? { ...row, ...patch } : row));
      // 마지막 줄을 쓰기 시작하면 다음 줄을 미리 연다. 25명을 넣으며 `한 명 더`를 25번 누르지 않는다.
      const last = next[next.length - 1];
      if (index === next.length - 1 && last.name.trim()) next.push(...blankRows(seatAfter(next, firstSeat), 1));
      return next;
    });
  }

  /** 엑셀에서 복사한 표를 이름 칸에 붙여 넣으면 그 줄부터 칸으로 펼친다. */
  function pasteRows(index: number, text: string) {
    const pasted = rosterTextToRows(text);
    if (pasted.length < 2) return false;
    onEdit?.();
    setRows((current) => {
      const head = current.slice(0, index);
      const filled = withSeats(pasted, seatAfter(head, firstSeat));
      return [...head, ...filled, ...blankRows(seatAfter(filled, firstSeat), 1)];
    });
    return true;
  }

  return <>
    <div className="trs-rows" role="group" aria-label={label}>
      <div className="trs-rows-head" aria-hidden="true"><span>번호</span><span>이름</span><span /></div>
      {rows.map((row, index) => <div className="trs-row" key={index}>
        <input className="trs-row-seat" type="number" inputMode="numeric" min={1} max={MAX_SEAT_NUMBER} aria-label={`${index + 1}번째 학생 번호`} value={row.seat} onChange={(event) => editRow(index, { seat: event.target.value })} />
        <input className="trs-row-name" maxLength={MAX_REAL_NAME_LENGTH} aria-label={`${index + 1}번째 학생 이름`} value={row.name} spellCheck={false}
          onChange={(event) => editRow(index, { name: event.target.value })}
          onPaste={(event) => { const text = event.clipboardData.getData("text"); if (pasteRows(index, text)) event.preventDefault(); }} />
        <button type="button" className="trs-row-remove" aria-label={`${index + 1}번째 줄 지우기`} disabled={rows.length < 2} onClick={() => { onEdit?.(); setRows((current) => current.filter((_, at) => at !== index)); }}><X size={16} /></button>
      </div>)}
    </div>
    <div className="trs-rows-foot">
      <button type="button" className="trs-row-add" onClick={() => { onEdit?.(); setRows((current) => [...current, ...blankRows(seatAfter(current, firstSeat), 1)]); }}><Plus size={15} />학생 한 명 더</button>
      <small>{parsed.entries.length > 0 ? `${parsed.entries.length}명 확인` : "번호와 이름을 칸에 적어 주세요."}</small>
    </div>
    {parsed.errors.length > 0 && <ul className="tcw-error">{parsed.errors.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>}
  </>;
}
