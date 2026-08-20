"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activeProfile, studentFetch } from "@/lib/client-session";
import { STORYBOOK_FORMATS, type StorybookFormat } from "@/lib/storybook-model";
import { Logo } from "./Logo";

type LibraryBook = { id: string; title: string; pageCount: number; status: "draft" | "complete"; updatedAt: string };

export function StorybookLibrary() {
  const [books, setBooks] = useState<LibraryBook[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<StorybookFormat | "">("");
  const creatingRef = useRef(false);

  const create = useCallback(async (format: StorybookFormat) => {
    if (creatingRef.current) return;
    if (!activeProfile()) {
      const next = `/student/books?create=${format}`;
      location.href = `/join?next=${encodeURIComponent(next)}`;
      return;
    }
    creatingRef.current = true;
    setCreating(format); setError("");
    try {
      const response = await studentFetch("/api/storybooks", { method: "POST", body: JSON.stringify({ format }) });
      const data = await response.json() as { storybook?: { id: string }; error?: string };
      if (!response.ok || !data.storybook) throw new Error(data.error ?? "그림책을 만들지 못했어요.");
      location.href = `/student/books/${data.storybook.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "그림책을 만들지 못했어요.");
      setCreating(""); creatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!activeProfile()) {
      setBooks([]);
      setError("먼저 그림 비밀번호로 내 프로필을 열어 주세요. 그림책 모양을 누르면 로그인 화면으로 이동해요.");
      return;
    }
    void studentFetch("/api/storybooks").then(async (response) => {
      const data = await response.json() as { storybooks?: LibraryBook[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "그림책을 불러오지 못했어요.");
      setBooks(data.storybooks ?? []);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "그림책을 불러오지 못했어요."));
    const requestedFormat = new URLSearchParams(location.search).get("create") as StorybookFormat | null;
    if (requestedFormat && STORYBOOK_FORMATS.includes(requestedFormat)) {
      history.replaceState(history.state, "", "/student/books");
      void create(requestedFormat);
    }
  }, [create]);

  return <main className="app-shell storybook-library">
    <header className="app-header"><Logo /><a className="small-button" href="/student">← 처음 화면</a></header>
    <section className="storybook-library-hero"><div><p className="eyebrow">내가 직접 꾸미는 작업실</p><h1>나만의 그림책 만들기</h1><p>내 그림과 새 이미지를 가져와 글을 쓰고, 손잡이로 크기와 각도를 마음껏 바꿔 봐요.</p></div><span aria-hidden="true">📖✨</span></section>
    {error && <p className="error-box" role="alert">{error}</p>}
    <section className="storybook-new-book"><h2>새 그림책</h2><div className="storybook-format-options">
      <button type="button" disabled={Boolean(creating)} onClick={() => void create("landscape")}><i className="format-landscape" /><b>가로 그림책</b><small>이야기책 추천</small></button>
      <button type="button" disabled={Boolean(creating)} onClick={() => void create("portrait")}><i className="format-portrait" /><b>세로 그림책</b><small>휴대폰처럼 길게</small></button>
      <button type="button" disabled={Boolean(creating)} onClick={() => void create("square")}><i className="format-square" /><b>정사각 그림책</b><small>그림을 크게</small></button>
    </div>{creating && <p role="status">새 도화지를 준비하는 중…</p>}</section>
    <section className="storybook-my-books"><h2>내 그림책</h2>{books === null ? <div className="loading-card">그림책을 펼치는 중…</div> : books.length ? <div className="storybook-book-grid">{books.map((book) => <a href={`/student/books/${book.id}`} key={book.id}><span aria-hidden="true">{book.status === "complete" ? "📕" : "📘"}</span><div><small>{book.pageCount}쪽 · {book.status === "complete" ? "완성" : "편집 중"}</small><h3>{book.title}</h3><time dateTime={book.updatedAt}>{new Date(book.updatedAt).toLocaleDateString("ko-KR")}</time></div><b>열기 →</b></a>)}</div> : <div className="empty-state">아직 그림책이 없어요. 위에서 첫 그림책을 만들어 봐요.</div>}</section>
  </main>;
}
