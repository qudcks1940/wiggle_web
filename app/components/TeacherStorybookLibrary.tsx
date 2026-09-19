"use client";
import { TeacherPdfImport } from "./TeacherPdfImport";

import { useCallback, useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import type { Rubric, BookFeedback } from "@/lib/book-rubric";
import { Logo } from "./Logo";
import { teacherRequest, postJson, downloadFeedback, saveBlob, jobLabel, type CompletedBook } from "./book-workflow-client";
import "./book-workflow.css";

type Job = { title: string; id: string; storybookId: string; revision: number; rubricVersion: string; status: string; error: string | null };
type Settings = { rubric: Rubric; version: string; prompt: string; filename: string; configured: boolean; jobs: Job[]; grade: number | null; classNumber: number | null };
type Progress = { kind: "request" | "feedback" | "download"; completed: number; total: number; detail: string };
function studentName(book: CompletedBook) { return book.seatNumber ? `${book.seatNumber}번 ${book.realName || book.nickname}` : `${book.animal} ${book.nickname}`; }
function FeedbackProgress({ progress }: { progress: Progress }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { setSeconds(0); const timer = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(timer); }, [progress.kind]);
  return <div className="feedback-progress" role="status" aria-live="polite" aria-atomic="true">
    <span className="feedback-spinner" aria-hidden="true" />
    <div><strong>{progress.kind === "request" ? "피드백 요청을 접수하고 있어요" : progress.kind === "feedback" ? "피드백을 만들고 있어요" : "피드백 PDF를 준비하고 있어요"}</strong>
      <p>{progress.detail}</p><span>{progress.total > 0 && <>{progress.completed} / {progress.total}권 {progress.kind === "download" ? "준비" : "처리"} · </>}<span aria-hidden="true">{seconds}초 경과</span></span>
      {progress.total > 0 && <progress max={progress.total} value={progress.completed} aria-label="처리한 그림책 수" />}
      <small>이 화면을 열어 두세요. 책의 쪽 수에 따라 시간이 걸릴 수 있어요.</small></div>
  </div>;
}
export function TeacherStorybookLibrary({ classroomId }: { classroomId: string }) {
  const [books, setBooks] = useState<CompletedBook[]>([]), [name, setName] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null), [selected, setSelected] = useState<string[]>([]);
  const [grade, setGrade] = useState(""), [classNumber, setClassNumber] = useState("");
  const [busy, setBusy] = useState(false), [running, setRunning] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [review, setReview] = useState<{ title: string; rubric: Rubric; feedback: BookFeedback } | null>(null);
  const stop = useRef(false), worker = useRef(false), operation = useRef(false), loadSequence = useRef(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stopRequested, setStopRequested] = useState(false);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const [library, config] = await Promise.all([
      teacherRequest<{ classroom: { displayName: string }; storybooks: CompletedBook[] }>(`/api/teacher/storybooks?classroomId=${classroomId}`),
      teacherRequest<Settings>(`/api/teacher/book-feedback?classroomId=${classroomId}`),
    ]);
    if (sequence === loadSequence.current) { setBooks(library.storybooks); setName(library.classroom.displayName); setSettings(config); }
    return config;
  }, [classroomId]);
  useEffect(() => { void load().then((s) => { setGrade(String(s.grade ?? "")); setClassNumber(String(s.classNumber ?? "")); }).catch((e) => setError(e.message)); return () => { stop.current = true; }; }, [load]);
  function latest(book: CompletedBook) { return settings?.jobs.find((j) => j.storybookId === book.id && j.revision === book.revision && j.rubricVersion === settings.version); }
  function completed(book: CompletedBook) { return settings?.jobs.find(j => j.storybookId === book.id && j.revision === book.revision && j.status === "complete"); }
  const serverProcessing = settings?.jobs.some(j => j.status === "processing") ?? false;
  useEffect(() => {
    if (!running && !serverProcessing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try { await load(); } catch { /* The worker reports failures; a transient status refresh must not stop it. */ }
      if (!cancelled) timer = setTimeout(refresh, 2000);
    }
    timer = setTimeout(refresh, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [running, serverProcessing, load]);
  async function action(fn: () => Promise<void>) {
    if (operation.current || worker.current) return;
    operation.current = true; setError(""); setNotice(""); setBusy(true);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "요청 실패"); }
    finally { operation.current = false; setBusy(false); setProgress(null); }
  }
  async function run(initial?: Settings) {
    if (worker.current) return;
    worker.current = true; stop.current = false; setStopRequested(false); setRunning(true); setError(""); setNotice("");
    let successes = 0, failures = 0;
    setProgress({ kind: "feedback", completed: 0, total: 0, detail: "대기 중인 책을 확인하고 있어요." });
    try {
      const config = initial ?? await load();
      const total = config.jobs.filter(j => ["queued", "waiting_key", "processing"].includes(j.status)).length;
      while (!stop.current) {
        setProgress({ kind: "feedback", completed: successes + failures, total: Math.max(total, successes + failures), detail: "책을 읽고 루브릭에 맞춰 피드백을 작성하고 있어요." });
        const result = await teacherRequest<{ done: boolean; waitingKey?: boolean; status?: string }>("/api/teacher/book-feedback/process", postJson({ classroomId }));
        const current = await load();
        if (result.done) {
          setNotice(result.waitingKey ? "요청을 저장했어요. AI 연결이 준비되면 ‘대기 작업 이어서 처리’를 눌러 주세요." : current.jobs.some(j => j.status === "processing") ? "서버에서 처리 중인 책이 있어요. 잠시 뒤 ‘새로 확인’을 눌러 주세요." : `피드백 처리 완료: 성공 ${successes}권, 실패 ${failures}권. 완성된 PDF는 아래 학생별 목록에서 받을 수 있어요.`);
          break;
        }
        if (result.status === "complete") successes++; else if (result.status === "failed") failures++;
      }
      if (stop.current) setNotice(`처리를 멈췄어요. 성공 ${successes}권, 실패 ${failures}권. 남은 책은 ‘대기 작업 이어서 처리’로 진행하세요.`);
    } catch (e) { setError(e instanceof Error ? e.message : "처리가 중단되었어요. 이어서 처리할 수 있어요."); }
    finally { worker.current = false; setRunning(false); setProgress(null); }
  }
  async function request(ids: string[]) {
    await action(async () => {
      setProgress({ kind: "request", completed: 0, total: ids.length, detail: `${ids.length}권의 피드백 요청을 보내고 있어요.` });
      await teacherRequest("/api/teacher/book-feedback", postJson({ classroomId, storybookIds: ids }));
      await run(await load());
    });
  }
  async function download(items: { book: CompletedBook; job: Job }[], archiveName = "그림책_피드백.zip") {
    if (!items.length) return;
    await action(async () => {
      const files: Record<string, Uint8Array> = {};
      for (const [index, { book, job }] of items.entries()) {
        setProgress({ kind: "download", completed: index, total: items.length, detail: `${studentName(book)} · ${book.title} PDF 준비 중` });
        const file = await downloadFeedback(job.id);
        let filename = file.filename, suffix = 2;
        while (files[filename]) filename = file.filename.replace(/\.pdf$/, `_${suffix++}.pdf`);
        files[filename] = file.bytes;
      }
      setProgress({ kind: "download", completed: items.length, total: items.length, detail: items.length === 1 ? "PDF 파일을 저장하고 있어요." : "PDF를 ZIP 파일로 묶고 있어요." });
      // Yield a paint before synchronous ZIP creation so the preparation state remains visible.
      await new Promise(resolve => setTimeout(resolve, 50));
      if (items.length === 1) { const [filename, bytes] = Object.entries(files)[0]; saveBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), filename); }
      else saveBlob(new Blob([new Uint8Array(zipSync(files))], { type: "application/zip" }), archiveName);
      setNotice(`${items.length}권의 피드백 파일 다운로드를 시작했어요. 브라우저 다운로드 목록을 확인해 주세요.`);
    });
  }
  function readyItems(list: CompletedBook[]) { return list.flatMap(book => { const job = completed(book); return job ? [{ book, job }] : []; }); }
  const groups = [...books.reduce((map, book) => {
    const group = map.get(book.studentId) ?? { id: book.studentId, name: studentName(book), seat: book.seatNumber, books: [] as CompletedBook[] };
    group.books.push(book); map.set(book.studentId, group); return map;
  }, new Map<string, { id: string; name: string; seat: number | null; books: CompletedBook[] }>()).values()].sort((a, b) => (a.seat ?? Infinity) - (b.seat ?? Infinity) || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
  const selectedReady = readyItems(books.filter(b => selected.includes(b.id)));
  const activeJob = settings?.jobs.find(j => j.status === "processing");
  const activeBook = books.find(b => b.id === activeJob?.storybookId);
  const observedProgress: Progress | null = progress ?? (activeJob ? { kind: "feedback", completed: 0, total: 0, detail: `${activeJob.title} — 서버에서 피드백을 처리하고 있어요.` } : null);
  const visibleProgress = observedProgress?.kind === "feedback" && activeJob ? { ...observedProgress, detail: `${activeBook ? studentName(activeBook) + " · " : ""}${activeJob.title} — 피드백 작성 중${stopRequested ? " (이 책을 마친 뒤 멈춰요)" : ""}` } : observedProgress;
  const disabled = busy || running;
  return <main className="book-desk">
    <header className="book-desk-header"><Logo /><a className="small-button" href={`/teacher/class/${classroomId}`}>← 수업실</a><a className="button secondary" href={`/teacher/class/${classroomId}/books/orders`}>그림책 주문 →</a></header>
    <section className="book-desk-hero"><div><p className="eyebrow">{name || "우리 반"} · 선생님의 책상</p><h1>완성한 이야기,<br />한 권마다 다르게 읽어요.</h1><p>책 전체의 글과 그림을 루브릭에 따라 살펴보고, 아이별 피드백을 PDF로 모아 보세요.</p></div><div className="book-desk-count"><b>{books.length}</b><span>완성 그림책</span></div></section>
    <TeacherPdfImport classroomId={classroomId} onImported={load} />
    <section className="book-panel rubric-panel"><div className="book-section-heading"><div><p className="eyebrow">01 · 평가 기준</p><h2>{settings?.rubric.title ?? "루브릭을 불러오는 중"}</h2><p>엑셀 파일을 교체하면 다음 요청부터 새 기준을 적용해요.</p></div><label className="button secondary">엑셀 파일 교체<input className="sr-only" type="file" accept=".xlsx" disabled={disabled} onChange={(e) => { const file = e.target.files?.[0]; if (file) void action(async () => { const form = new FormData(); form.append("classroomId", classroomId); form.append("file", file); await teacherRequest("/api/teacher/book-feedback", { method: "POST", body: form }); await load(); setNotice("새 루브릭을 적용했어요. 기존 결과는 이전 버전으로 보존됩니다."); }); e.target.value = ""; }} /></label></div>
      {settings && <><p className="book-muted">{settings.filename} · {settings.rubric.criteria.length}개 영역 · {settings.rubric.maximum}점 만점 · 버전 {settings.version.slice(0, 8)}</p><div className="rubric-tags">{settings.rubric.criteria.map((c, i) => <span key={c.id}>{i + 1}. {c.name}</span>)}</div><details><summary>전체 배점 기준과 AI 프롬프트 확인</summary>{settings.rubric.criteria.map((c) => <div key={c.id}><h3>{c.name}</h3>{c.levels.map((l) => <p key={l.score}><b>{l.score}점</b> {l.description}</p>)}</div>)}<h3>실제 전달되는 프롬프트</h3><pre className="book-prompt">{settings.prompt}</pre></details></>}
      <form className="book-identity" onSubmit={(e) => { e.preventDefault(); void action(async () => { await teacherRequest("/api/teacher/book-feedback", postJson({ classroomId, action: "identity", grade: Number(grade), classNumber: Number(classNumber) })); await load(); setNotice("학년·반을 저장했어요."); }); }}><label>학년<input required type="number" min="1" max="12" value={grade} onChange={(e) => setGrade(e.target.value)} /></label><label>반<input required type="number" min="1" max="99" value={classNumber} onChange={(e) => setClassNumber(e.target.value)} /></label><button className="small-button" disabled={disabled}>학년·반 저장</button><span>파일명: 학년_반_번호_이름_그림책이름.pdf<br /><a href={`/teacher/class/${classroomId}`}>번호·이름은 수업실 명단에서 수정</a></span></form>
    </section>
    <section className="book-panel"><div className="book-section-heading"><div><p className="eyebrow">02 · 피드백 만들기</p><h2>우리 반 책 모음</h2></div><button className="small-button" disabled={disabled} onClick={() => void action(async () => { await load(); })}>새로 확인</button></div>
      {!settings?.configured && <p className="book-notice">AI 키가 아직 연결되지 않았어요. 요청은 보관되며, 키를 넣으면 이어서 처리할 수 있어요.</p>}
      {error && <p className="error-box" role="alert">{error}</p>}{notice && <p className="book-notice" role="status">{notice}</p>}
      {visibleProgress && <FeedbackProgress progress={visibleProgress} />}
      <div className="book-toolbar"><label><input type="checkbox" checked={books.length > 0 && selected.length === books.length} onChange={(e) => setSelected(e.target.checked ? books.map((b) => b.id) : [])} /> 전체 선택</label><span>{selected.length}권 선택</span><button className="button primary" disabled={disabled || !selected.length || selected.length > 50} onClick={() => void request(selected)}>{progress?.kind === "request" ? "요청 접수 중…" : running ? "피드백 만드는 중…" : "선택한 책 피드백 만들기"}</button><button className="button secondary" disabled={disabled || !selectedReady.length || selectedReady.length !== selected.length} onClick={() => void download(selectedReady)}>{progress?.kind === "download" ? "PDF 준비 중…" : "선택한 피드백 PDF 받기"}</button>{running ? <button className="small-button" disabled={stopRequested} onClick={() => { stop.current = true; setStopRequested(true); setNotice("현재 책을 마친 뒤 멈춰요. 나머지 요청은 보관됩니다."); }}>{stopRequested ? "현재 책 완료 후 멈추는 중…" : "현재 책까지 처리"}</button> : <button className="small-button" disabled={busy} onClick={() => void run()}>대기 작업 이어서 처리</button>}</div>
      <p className="book-muted" role="status">{running ? "책별로 순서대로 처리 중입니다. 이 화면을 열어 두세요." : "한 번에 최대 50권. 화면을 닫아도 요청과 완성 결과가 남습니다. 돌아와서 이어서 처리하세요."}</p>
      {selected.length > selectedReady.length && <p className="book-muted">선택한 {selected.length}권 중 PDF {selectedReady.length}권 준비 완료. 선택한 책의 피드백이 모두 완성되면 한 번에 받을 수 있어요.</p>}
      {groups.map(group => <section className="book-student-group" key={group.id} aria-label={`${group.name} 그림책`}><div className="book-student-heading"><h3>{group.name}</h3><span>그림책 {group.books.length}권 · 피드백 PDF {readyItems(group.books).length}개</span></div><div className="book-library-grid">{group.books.map((book) => { const job = latest(book); const asset = book.cover.imageAssetId || book.cover.backgroundAssetId; return <article className="book-library-card" key={book.id}><label className="book-select"><input type="checkbox" aria-label={`${book.title} 선택`} checked={selected.includes(book.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, book.id] : s.filter((v) => v !== book.id))} /></label><a className="book-cover-art" style={{ background: book.cover.background }} href={`/teacher/class/${classroomId}/books/${book.id}`}>{asset && <img src={`/api/teacher/storybooks/${book.id}/assets/${asset}`} alt="" />}<span>{book.cover.text || book.title}</span></a><div className="book-card-copy"><p className="eyebrow">{book.seatNumber ? `${book.seatNumber}번 ${book.realName ?? ""}` : `${book.animal} ${book.nickname}`}</p><h3>{book.title}</h3><p>{book.pageCount}쪽 · {new Date(book.completedAt).toLocaleDateString("ko-KR")}</p><span className={`book-status status-${job?.status}`}>{jobLabel(job?.status)}</span>{job?.error && <p className="book-job-error">{job.error}</p>}</div><div className="book-card-buttons"><a className="small-button" href={`/teacher/class/${classroomId}/books/${book.id}/edit`}>그림책 수정</a><button className="small-button" disabled={disabled || job?.status === "complete" || job?.status === "processing"} onClick={() => void request([book.id])}>{job?.status === "processing" ? "피드백 만드는 중…" : job?.status === "failed" ? "다시 시도" : "피드백 만들기"}</button>{job?.status === "complete" && <><button className="small-button" onClick={() => void action(async () => setReview(await teacherRequest(`/api/teacher/book-feedback/${job.id}`)))}>피드백 읽기</button><button className="small-button" disabled={disabled} onClick={() => void download([{ book, job }])}>PDF 저장</button></>}</div></article>; })}</div></section>)}
      {!books.length && <div className="book-empty">완성한 그림책이 아직 없어요. 학생이 ‘완성하기’를 누르면 여기에서 확인할 수 있어요.</div>}
    </section>
    <section className="book-panel feedback-files" aria-label="학생별 피드백 PDF">
      <div className="book-section-heading"><div><p className="eyebrow">03 · 완성된 피드백</p><h2>학생별 피드백 PDF</h2><p>한 학생의 여러 그림책 피드백을 함께 모았어요. 책별 PDF 또는 학생별 묶음으로 받아 보세요.</p></div></div>
      {progress?.kind === "download" && <FeedbackProgress progress={progress} />}
      {error && <p className="error-box">{error}</p>}{notice && <p className="book-notice">{notice}</p>}
      {settings && (!settings.grade || !settings.classNumber) && <p className="book-notice">PDF를 받으려면 위 평가 기준에서 학년·반을 먼저 저장해 주세요.</p>}
      {!readyItems(books).length && <div className="book-empty">피드백이 완성되면 학생별 PDF가 여기에 나타나요.</div>}
      {groups.map(group => { const items = readyItems(group.books); return items.length ? <section className="feedback-student-files" key={group.id} aria-label={`${group.name} 피드백 파일`}>
        <div className="book-section-heading"><h3>{group.name} · PDF {items.length}개</h3><button className="small-button" disabled={disabled} onClick={() => void download(items, `${group.name.replace(/[\\/:*?"<>|]/g, "_")}_피드백.zip`)}>{progress?.kind === "download" ? "PDF 준비 중…" : items.length > 1 ? "이 학생 PDF 모두 받기 (ZIP)" : "이 학생 PDF 받기"}</button></div>
        {(!group.seat || !group.books[0].realName) && <p className="book-notice">PDF를 받으려면 <a href={`/teacher/class/${classroomId}?view=settings`}>수업실 명단</a>에서 학생 번호·이름을 먼저 등록해 주세요.</p>}
        <ul>{items.map(({ book, job }) => <li key={job.id}><div><strong>{book.title}</strong><p>PDF · {book.pageCount}쪽 그림책의 피드백{job.rubricVersion !== settings?.version ? " · 이전 평가 기준" : ""}</p></div><div className="feedback-file-actions"><button className="small-button" disabled={disabled} onClick={() => void action(async () => setReview(await teacherRequest(`/api/teacher/book-feedback/${job.id}`)))}>피드백 읽기</button><button className="small-button" disabled={disabled} onClick={() => void download([{ book, job }])}>{progress?.kind === "download" ? "PDF 준비 중…" : "PDF 받기"}</button></div></li>)}</ul>
      </section> : null; })}
    </section>
    {review && <section className="book-panel feedback-reading" aria-label="피드백 미리보기"><div className="book-section-heading"><h2>{review.title} · 피드백</h2><button className="small-button" onClick={() => setReview(null)}>닫기</button></div><p>AI 초안입니다. 학생에게 전달하기 전에 선생님이 확인해 주세요.</p>{review.feedback.criteria.map((c, i) => <div key={c.id}><h3>{review.rubric.criteria[i].name} · {c.score}점</h3><p>{c.feedback}</p></div>)}<p><b>다음에 해 볼 일</b> {review.feedback.summary}</p></section>}
  </main>;
}
