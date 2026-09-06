"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "./Logo";

type BookSummary = {
  id: string;
  title: string;
  studentId: string;
  nickname: string;
  animal: string;
  completedAt: string;
  pageCount: number;
  format: "landscape" | "portrait" | "square";
  cover: { background: string; backgroundAssetId: string | null; imageAssetId: string | null; text: string };
  feedbackStatus: string | null;
  feedbackRequestedAt: string | null;
};

type LibraryPayload = { classroom?: { id: string; displayName: string }; storybooks?: BookSummary[]; error?: string };

async function teacherFetch(input: RequestInfo | URL, init?: RequestInit) {
  let response = await fetch(input, { cache: "no-store", ...init });
  if (response.status === 401 && location.hostname === "localhost") {
    await fetch("/api/teacher", { cache: "no-store" });
    response = await fetch(input, { cache: "no-store", ...init });
  }
  return response;
}

function feedbackLabel(status: string | null) {
  if (status === "waiting_rubric") return "루브릭 대기";
  if (status === "queued") return "피드백 대기";
  if (status === "processing") return "피드백 작성 중";
  if (status === "complete") return "피드백 완료";
  if (status === "failed") return "다시 요청 필요";
  return "아직 요청 안 함";
}

function BookCover({ book }: { book: BookSummary }) {
  const assetId = book.cover.imageAssetId ?? book.cover.backgroundAssetId;
  return <div className={`teacher-book-cover format-${book.format}`} style={{ background: book.cover.background }}>
    {assetId && <img src={`/api/teacher/storybooks/${book.id}/assets/${assetId}`} alt="" />}
    <span>{book.cover.text || book.title}</span>
  </div>;
}

export function TeacherStorybookLibrary({ classroomId }: { classroomId: string }) {
  const [classroomName, setClassroomName] = useState("");
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await teacherFetch(`/api/teacher/storybooks?classroomId=${encodeURIComponent(classroomId)}`);
      const data = await response.json() as LibraryPayload;
      if (!response.ok) throw new Error(data.error ?? "그림책 목록을 불러오지 못했어요.");
      setClassroomName(data.classroom?.displayName ?? "우리 반");
      setBooks(data.storybooks ?? []);
      setSelected((current) => new Set([...current].filter((id) => (data.storybooks ?? []).some((book) => book.id === id))));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "그림책 목록을 불러오지 못했어요."); }
  }, [classroomId]);

  useEffect(() => { void load(); }, [load]);

  const selectedIds = useMemo(() => [...selected], [selected]);
  const allSelected = Boolean(books?.length) && books!.every((book) => selected.has(book.id));

  function toggle(bookId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(bookId)) next.delete(bookId); else next.add(bookId);
      return next;
    });
  }

  async function requestFeedback(storybookIds: string[]) {
    if (!storybookIds.length || requesting) return;
    setRequesting(true); setError(""); setNotice("");
    try {
      const response = await teacherFetch("/api/teacher/storybooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classroomId, storybookIds }),
      });
      const data = await response.json() as { requested?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "피드백 요청을 접수하지 못했어요.");
      setNotice(`${data.requested ?? storybookIds.length}권을 피드백 요청 목록에 담았어요. 루브릭을 등록하면 순서대로 작성돼요.`);
      setSelected(new Set());
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "피드백 요청을 접수하지 못했어요."); }
    finally { setRequesting(false); }
  }

  return <main className="teacher-storybook-shell">
    <header className="teacher-storybook-header"><Logo /><a className="small-button" href={`/teacher/class/${classroomId}`}>← 수업실</a><div><p className="eyebrow">{classroomName || "우리 반"}</p><h1>완성 그림책</h1></div><button type="button" className="small-button" onClick={() => void load()}>새로 확인</button></header>
    <section className="teacher-storybook-hero"><div><span aria-hidden="true">📚</span><div><h2>아이들이 완성한 책을 한곳에서 봐요</h2><p>학생의 동물·별명과 완성 시각을 확인하고, 책을 넘겨 보거나 PDF로 저장할 수 있어요.</p></div></div><strong>{books?.length ?? 0}<small>권 완성</small></strong></section>
    {error && <p className="error-box" role="alert">{error}</p>}
    {notice && <p className="teacher-storybook-notice" role="status">✓ {notice}</p>}
    <section className="teacher-storybook-actions" aria-label="그림책 선택 작업">
      <label><input type="checkbox" checked={allSelected} disabled={!books?.length} onChange={() => setSelected(allSelected ? new Set() : new Set((books ?? []).map((book) => book.id)))} /> 전체 선택</label>
      <span>{selected.size}권 선택</span>
      <button type="button" className="button primary" disabled={!selected.size || requesting} onClick={() => void requestFeedback(selectedIds)}>{requesting ? "접수 중…" : "선택한 그림책 피드백 요청"}</button>
    </section>
    {books === null ? <div className="loading-card">완성 그림책을 모으는 중…</div> : books.length ? <section className="teacher-storybook-grid">
      {books.map((book) => <article className={selected.has(book.id) ? "selected" : ""} key={book.id}>
        <label className="teacher-book-checkbox"><input type="checkbox" checked={selected.has(book.id)} onChange={() => toggle(book.id)} /><span className="sr-only">{book.title} 선택</span></label>
        <BookCover book={book} />
        <div className="teacher-book-copy"><p className="eyebrow">{book.animal} {book.nickname}</p><h2>{book.title}</h2><p>{book.pageCount}쪽 · {new Date(book.completedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })} 완성</p><span className={`feedback-status ${book.feedbackStatus ?? "none"}`}>{feedbackLabel(book.feedbackStatus)}</span></div>
        <div className="teacher-book-actions"><a className="button secondary" href={`/teacher/class/${classroomId}/books/${book.id}`}>책 보기 · PDF</a><button type="button" className="button ghost" disabled={requesting || book.feedbackStatus === "complete"} onClick={() => void requestFeedback([book.id])}>피드백 요청</button></div>
      </article>)}
    </section> : <div className="teacher-storybook-empty"><span>📖</span><h2>아직 완성된 그림책이 없어요</h2><p>학생이 그림책 작업실에서 ‘완성하기’를 누르면 여기에 자동으로 나타나요.</p></div>}
    <aside className="teacher-rubric-note"><b>루브릭은 아직 연결 전이에요.</b><p>지금 접수한 요청은 안전하게 ‘루브릭 대기’로 저장됩니다. 나중에 루브릭을 등록하면 원본 책을 바꾸지 않고 초등학생용 피드백을 생성하도록 연결할 수 있어요.</p></aside>
  </main>;
}
