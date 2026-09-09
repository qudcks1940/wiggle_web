"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRightLeft, FileText, QrCode, Send, X } from "lucide-react";
import { Logo } from "./Logo";
import { useModalDialog } from "./useModalDialog";
import type { ClassroomData, WorkspaceArtwork } from "./TeacherApp";
import { TeacherWorkArchive } from "./TeacherWorkArchive";
import { TeacherRosterSettings } from "./TeacherRosterSettings";

export function WorkspaceDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useModalDialog(ref, onClose);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);
  return <div className="tcw-dialog-backdrop"><div ref={ref} className="tcw-dialog" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}><header><h2 id={id}>{title}</h2><button type="button" aria-label={`${title} 닫기`} onClick={onClose}><X size={20} /></button></header>{children}</div></div>;
}

type Tab = "today" | "archive" | "settings";
const tabs: [Tab, string][] = [["today", "오늘 수업"], ["archive", "작품 · 그림책"], ["settings", "명단 · 설정"]];
function currentTab(): Tab { const value = new URLSearchParams(location.search).get("view"); return value === "archive" || value === "settings" ? value : "today"; }

export type WorkspaceProps = {
  data: ClassroomData;
  lastUpdated: string;
  loadError: string;
  onRetry: () => void;
  onOpenArtwork: (studentId: string, artwork?: WorkspaceArtwork) => void;
  onEpisode: () => void;
  onMessage: () => void;
  onQr: (opener: HTMLButtonElement) => void;
  onAction: (action: string, rest?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  onArchive: (studentId: string) => void;
  onRestore: (studentId: string) => void;
  onDeleteClassroom: () => void;
  busyStudentId: string;
  deletingClassroom: boolean;
};

export function TeacherWorkspace(props: WorkspaceProps) {
  const { data, lastUpdated, loadError, onRetry, onOpenArtwork, onEpisode, onMessage, onQr } = props;
  const [tab, setTab] = useState<Tab>("today");
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => { const update = () => setTab(currentTab()); update(); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update); }, []);
  function selectTab(next: Tab) { setTab(next); const url = new URL(location.href); if (next === "today") url.searchParams.delete("view"); else url.searchParams.set("view", next); history.pushState(null, "", url); }
  const room = data.classroom;
  const students = [...data.students].sort((a, b) => (a.seatNumber ?? 1000) - (b.seatNumber ?? 1000) || a.nickname.localeCompare(b.nickname, "ko"));
  return <>
    <header className="tcw-header"><Logo /><a className="tcw-back" href="/teacher"><ArrowLeft size={20} /><span>학급 목록</span></a><h1>{room.displayName}</h1><div className="tcw-header-actions"><button type="button" onClick={(event) => onQr(event.currentTarget)}><QrCode size={19} />입장 안내</button><button type="button" className="tcw-primary" onClick={onMessage}><Send size={18} />전체 메시지</button></div></header>
    <nav className="tcw-tabs" aria-label="학급 메뉴">{tabs.map(([key, label]) => <a key={key} href={key === "today" ? `?` : `?view=${key}`} aria-current={tab === key ? "page" : undefined} onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); selectTab(key); }}>{label}</a>)}</nav>
    {loadError && <div className="tcw-error" role="alert">새로 확인하지 못했어요. 마지막으로 받은 내용을 표시하고 있어요. <span>{loadError}</span><button onClick={onRetry}>다시 확인</button></div>}
    {tab === "today" && <section className="tcw-today" aria-label="오늘 수업">
      <div className="tcw-session"><div><h2>{room.arc ? `${room.arc.title} · ${room.arc.episodeIndex ?? ""}회차` : "자유 그리기"}</h2><p>{room.arc?.episodeTitle ?? "회차를 열면 해당 회차의 그림을 모아 볼 수 있어요."}</p></div><div className="tcw-session-actions"><button type="button" onClick={onEpisode}><ArrowRightLeft size={18} />회차 변경</button><button type="button" onClick={() => setGuideOpen(true)}><FileText size={18} />수업 안내</button></div></div>
      <div className="tcw-section-title"><h2>학생 그림 <small>{students.length}명</small></h2>{data.monitorScope === "latest" && <span>학생별 최근 그림</span>}</div>
      {students.length ? <div className="tcw-student-grid">{students.map((student) => { const artwork = student.sessionArtwork; return <article key={student.id}><button type="button" className="tcw-artwork" onClick={() => onOpenArtwork(student.id)} aria-label={`${student.seatNumber ? `${student.seatNumber}번 ` : ""}${student.realName ?? student.nickname} 그림 자세히 보기`}>{artwork?.thumbnail ? <img src={artwork.thumbnail} alt={`${student.realName ?? student.nickname}의 ${artwork.title}`} /> : <span>{artwork ? "그림이 저장되면 여기에 보여요" : "아직 저장된 그림이 없어요"}</span>}</button><div className="tcw-student-caption"><b>{student.seatNumber !== null && <span>{String(student.seatNumber).padStart(2, "0")} </span>}{student.realName ?? student.nickname}</b><span className={`tcw-status ${artwork?.status === "complete" ? "is-complete" : ""}`}>{artwork?.status === "complete" ? "완성" : artwork ? "그리는 중" : "시작 전"}</span></div></article>; })}</div> : <div className="tcw-empty"><h3>아직 등록된 학생이 없어요</h3><p>명단을 등록한 뒤 입장 안내를 보여 주세요.</p><button onClick={() => selectTab("settings")}>명단 등록하기</button></div>}
      {lastUpdated && <p className="tcw-updated">{lastUpdated} 업데이트 · 6초마다 확인</p>}
    </section>}
    {tab === "archive" && <TeacherWorkArchive classroomId={room.id} students={students} onOpenArtwork={onOpenArtwork} />}
    {tab === "settings" && <TeacherRosterSettings {...props} />}
    {guideOpen && <WorkspaceDialog title="수업 안내" onClose={() => setGuideOpen(false)}><div className="tcw-guide"><h3>{room.arc?.episodeTitle ?? "자유 그리기"}</h3><p>씨앗 5분 · 그리기 20분 · 이야기 한 줄 5분 · 친구 그림 보기와 토론 10분</p>{room.arc?.discussion?.length ? <><h3>함께 나눌 질문</h3><ol>{room.arc.discussion.map((question) => <li key={question}>{question}</li>)}</ol></> : <p>오늘의 회차를 열면 이야기와 토론 질문을 확인할 수 있어요.</p>}<p>학생 그림을 누르면 크게 보거나 짧은 도움말을 보낼 수 있어요.</p></div></WorkspaceDialog>}
  </>;
}
