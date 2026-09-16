"use client";
import { TeacherPdfImport } from "./TeacherPdfImport";

import { useCallback, useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import type { Rubric, BookFeedback } from "@/lib/book-rubric";
import { Logo } from "./Logo";
import { teacherRequest, postJson, downloadFeedback, saveBlob, jobLabel, type CompletedBook } from "./book-workflow-client";
import "./book-workflow.css";

type Job = { id: string; storybookId: string; revision: number; rubricVersion: string; status: string; error: string | null };
type Settings = { rubric: Rubric; version: string; prompt: string; filename: string; configured: boolean; jobs: Job[]; grade: number | null; classNumber: number | null };
export function TeacherStorybookLibrary({ classroomId }: { classroomId: string }) {
  const [books, setBooks] = useState<CompletedBook[]>([]), [name, setName] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null), [selected, setSelected] = useState<string[]>([]);
  const [grade, setGrade] = useState(""), [classNumber, setClassNumber] = useState("");
  const [busy, setBusy] = useState(false), [running, setRunning] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [review, setReview] = useState<{ title: string; rubric: Rubric; feedback: BookFeedback } | null>(null);
  const stop = useRef(false);
  const load = useCallback(async () => {
    const [library, config] = await Promise.all([
      teacherRequest<{ classroom: { displayName: string }; storybooks: CompletedBook[] }>(`/api/teacher/storybooks?classroomId=${classroomId}`),
      teacherRequest<Settings>(`/api/teacher/book-feedback?classroomId=${classroomId}`),
    ]);
    setBooks(library.storybooks); setName(library.classroom.displayName); setSettings(config);
    return config;
  }, [classroomId]);
  useEffect(() => { void load().then((s) => { setGrade(String(s.grade ?? "")); setClassNumber(String(s.classNumber ?? "")); }).catch((e) => setError(e.message)); return () => { stop.current = true; }; }, [load]);
  function latest(book: CompletedBook) { return settings?.jobs.find((j) => j.storybookId === book.id && j.revision === book.revision && j.rubricVersion === settings.version); }
  async function action(fn: () => Promise<void>) { setError(""); setNotice(""); setBusy(true); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "요청 실패"); } finally { setBusy(false); } }
  async function run() {
    stop.current = false; setRunning(true); setError("");
    try {
      while (!stop.current) {
        const result = await teacherRequest<{ done: boolean; waitingKey?: boolean }>("/api/teacher/book-feedback/process", postJson({ classroomId }));
        await load();
        if (result.done) { if (result.waitingKey) setNotice("요청을 저장했어요. 서버에 OPENAI_API_KEY를 넣은 뒤 ‘대기 작업 이어서 처리’를 눌러 주세요."); break; }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "처리가 중단되었어요. 이어서 처리할 수 있어요."); }
    finally { setRunning(false); }
  }
  async function request(ids: string[]) {
    setBusy(true); setError("");
    try { await teacherRequest("/api/teacher/book-feedback", postJson({ classroomId, storybookIds: ids })); await load(); await run(); }
    catch (e) { setError(e instanceof Error ? e.message : "접수 실패"); } finally { setBusy(false); }
  }
  async function download(ids: string[]) {
    await action(async () => {
      const files: Record<string, Uint8Array> = {};
      for (const id of ids) {
        const book = books.find((b) => b.id === id)!, job = latest(book);
        if (!job || job.status !== "complete") throw new Error(`${book.title}: 현재 루브릭의 피드백을 먼저 완성해 주세요.`);
        const file = await downloadFeedback(job.id);
        let filename = file.filename, index = 2;
        while (files[filename]) filename = file.filename.replace(/\.pdf$/, `_${index++}.pdf`);
        files[filename] = file.bytes;
      }
      if (ids.length === 1) { const [filename, bytes] = Object.entries(files)[0]; saveBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), filename); }
      else saveBlob(new Blob([new Uint8Array(zipSync(files))], { type: "application/zip" }), "그림책_피드백.zip");
      setNotice(`${ids.length}권의 피드백 파일을 저장했어요.`);
    });
  }
  const disabled = busy || running;
  return <main className="book-desk">
    <header className="book-desk-header"><Logo /><a className="small-button" href={`/teacher/class/${classroomId}`}>← 수업실</a><a className="button secondary" href={`/teacher/class/${classroomId}/books/orders`}>그림책 주문 →</a></header>
    <section className="book-desk-hero"><div><p className="eyebrow">{name || "우리 반"} · 선생님의 책상</p><h1>완성한 이야기,<br />한 권마다 다르게 읽어요.</h1><p>책 전체의 글과 그림을 루브릭에 따라 살펴보고, 아이별 피드백을 PDF로 모아 보세요.</p></div><div className="book-desk-count"><b>{books.length}</b><span>완성 그림책</span></div></section>
    {error && <p className="error-box" role="alert">{error}</p>}{notice && <p className="book-notice" role="status">{notice}</p>}
    <TeacherPdfImport classroomId={classroomId} onImported={load} />
    <section className="book-panel rubric-panel"><div className="book-section-heading"><div><p className="eyebrow">01 · 평가 기준</p><h2>{settings?.rubric.title ?? "루브릭을 불러오는 중"}</h2><p>엑셀 파일을 교체하면 다음 요청부터 새 기준을 적용해요.</p></div><label className="button secondary">엑셀 파일 교체<input className="sr-only" type="file" accept=".xlsx" disabled={disabled} onChange={(e) => { const file = e.target.files?.[0]; if (file) void action(async () => { const form = new FormData(); form.append("classroomId", classroomId); form.append("file", file); await teacherRequest("/api/teacher/book-feedback", { method: "POST", body: form }); await load(); setNotice("새 루브릭을 적용했어요. 기존 결과는 이전 버전으로 보존됩니다."); }); e.target.value = ""; }} /></label></div>
      {settings && <><p className="book-muted">{settings.filename} · {settings.rubric.criteria.length}개 영역 · {settings.rubric.maximum}점 만점 · 버전 {settings.version.slice(0, 8)}</p><div className="rubric-tags">{settings.rubric.criteria.map((c, i) => <span key={c.id}>{i + 1}. {c.name}</span>)}</div><details><summary>전체 배점 기준과 AI 프롬프트 확인</summary>{settings.rubric.criteria.map((c) => <div key={c.id}><h3>{c.name}</h3>{c.levels.map((l) => <p key={l.score}><b>{l.score}점</b> {l.description}</p>)}</div>)}<h3>실제 전달되는 프롬프트</h3><pre className="book-prompt">{settings.prompt}</pre></details></>}
      <form className="book-identity" onSubmit={(e) => { e.preventDefault(); void action(async () => { await teacherRequest("/api/teacher/book-feedback", postJson({ classroomId, action: "identity", grade: Number(grade), classNumber: Number(classNumber) })); await load(); setNotice("학년·반을 저장했어요."); }); }}><label>학년<input required type="number" min="1" max="12" value={grade} onChange={(e) => setGrade(e.target.value)} /></label><label>반<input required type="number" min="1" max="99" value={classNumber} onChange={(e) => setClassNumber(e.target.value)} /></label><button className="small-button" disabled={disabled}>학년·반 저장</button><span>파일명: 학년_반_번호_이름_그림책이름.pdf<br /><a href={`/teacher/class/${classroomId}`}>번호·이름은 수업실 명단에서 수정</a></span></form>
    </section>
    <section className="book-panel"><div className="book-section-heading"><div><p className="eyebrow">02 · 피드백 만들기</p><h2>우리 반 책 모음</h2></div><button className="small-button" disabled={disabled} onClick={() => void action(async () => { await load(); })}>새로 확인</button></div>
      {!settings?.configured && <p className="book-notice">AI 키가 아직 연결되지 않았어요. 요청은 보관되며, 키를 넣으면 이어서 처리할 수 있어요.</p>}
      <div className="book-toolbar"><label><input type="checkbox" checked={books.length > 0 && selected.length === books.length} onChange={(e) => setSelected(e.target.checked ? books.map((b) => b.id) : [])} /> 전체 선택</label><span>{selected.length}권 선택</span><button className="button primary" disabled={disabled || !selected.length || selected.length > 50} onClick={() => void request(selected)}>선택한 책 피드백 만들기</button><button className="button secondary" disabled={disabled || !selected.length} onClick={() => void download(selected)}>선택한 피드백 PDF 받기</button>{running ? <button className="small-button" onClick={() => { stop.current = true; setNotice("현재 책을 마친 뒤 멈춰요. 나머지 요청은 보관됩니다."); }}>현재 책까지 처리</button> : <button className="small-button" disabled={busy} onClick={() => void run()}>대기 작업 이어서 처리</button>}</div>
      <p className="book-muted" role="status">{running ? "책별로 순서대로 처리 중입니다. 이 화면을 열어 두세요." : "한 번에 최대 50권. 화면을 닫아도 요청과 완성 결과가 남습니다. 돌아와서 이어서 처리하세요."}</p>
      <div className="book-library-grid">{books.map((book) => { const job = latest(book); const asset = book.cover.imageAssetId || book.cover.backgroundAssetId; return <article className="book-library-card" key={book.id}><label className="book-select"><input type="checkbox" aria-label={`${book.title} 선택`} checked={selected.includes(book.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, book.id] : s.filter((v) => v !== book.id))} /></label><a className="book-cover-art" style={{ background: book.cover.background }} href={`/teacher/class/${classroomId}/books/${book.id}`}>{asset && <img src={`/api/teacher/storybooks/${book.id}/assets/${asset}`} alt="" />}<span>{book.cover.text || book.title}</span></a><div className="book-card-copy"><p className="eyebrow">{book.seatNumber ? `${book.seatNumber}번 ${book.realName ?? ""}` : `${book.animal} ${book.nickname}`}</p><h3>{book.title}</h3><p>{book.pageCount}쪽 · {new Date(book.completedAt).toLocaleDateString("ko-KR")}</p><span className={`book-status status-${job?.status}`}>{jobLabel(job?.status)}</span>{job?.error && <p className="book-job-error">{job.error}</p>}</div><div className="book-card-buttons"><a className="small-button" href={`/teacher/class/${classroomId}/books/${book.id}/edit`}>그림책 수정</a><button className="small-button" disabled={disabled || job?.status === "complete"} onClick={() => void request([book.id])}>{job?.status === "failed" ? "다시 시도" : "피드백 만들기"}</button>{job?.status === "complete" && <><button className="small-button" onClick={() => void action(async () => setReview(await teacherRequest(`/api/teacher/book-feedback/${job.id}`)))}>피드백 읽기</button><button className="small-button" disabled={disabled} onClick={() => void download([book.id])}>PDF 저장</button></>}</div></article>; })}</div>
      {!books.length && <div className="book-empty">완성한 그림책이 아직 없어요. 학생이 ‘완성하기’를 누르면 여기에서 확인할 수 있어요.</div>}
    </section>
    {review && <section className="book-panel feedback-reading" aria-label="피드백 미리보기"><div className="book-section-heading"><h2>{review.title} · 피드백</h2><button className="small-button" onClick={() => setReview(null)}>닫기</button></div><p>AI 초안입니다. 학생에게 전달하기 전에 선생님이 확인해 주세요.</p>{review.feedback.criteria.map((c, i) => <div key={c.id}><h3>{review.rubric.criteria[i].name} · {c.score}점</h3><p>{c.feedback}</p></div>)}<p><b>다음에 해 볼 일</b> {review.feedback.summary}</p></section>}
  </main>;
}
