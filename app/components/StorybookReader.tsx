"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { storybookAspectRatio, type StorybookDocument, type StorybookPage } from "@/lib/storybook-model";

export function StorybookReader({ title, document, initialPage, homeHref, onClose, onPageChange, renderPage }: {
  title: string; document: StorybookDocument; initialPage: number; homeHref: string;
  onClose: () => void; onPageChange: (index: number) => void; renderPage: (page: StorybookPage) => ReactNode;
}) {
  // Cover alone, then 2–3, 4–5 …; no synthetic page is inserted into the stored book.
  const [spread, setSpread] = useState(Math.ceil(initialPage / 2));
  const [turn, setTurn] = useState<{ from: number; direction: number } | null>(null);
  const turnLock = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dialog = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const last = Math.ceil((document.pages.length - 1) / 2);
  const firstIndex = spread === 0 ? 0 : spread * 2 - 1;
  function navigate(direction: number) {
    const next = spread + direction;
    if (next < 0 || next > last || turnLock.current) return;
    turnLock.current = true; setTurn({ from: spread, direction }); setSpread(next);
    onPageChange(next === 0 ? 0 : next * 2 - 1);
    timer.current = setTimeout(() => { setTurn(null); turnLock.current = false; }, 520);
  }
  useEffect(() => {
    const previous = window.document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => { clearTimeout(timer.current); previous?.focus(); };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "ArrowRight") { event.preventDefault(); navigate(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1); }
      if (event.key === "Tab") {
        const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') ?? [])];
        const first = items[0], end = items.at(-1);
        if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); end?.focus(); }
        if (!event.shiftKey && window.document.activeElement === end) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  });
  const pageView = (index: number, extra = "") => {
    const page = document.pages[index];
    return <div className={`storybook-stage preview reader-page format-${document.format} ${extra}`} style={{ background: page?.background ?? "#faf8f1" }}>
      {page && <div className="storybook-stage-content">{renderPage(page)}</div>}
      {page && <span className="reader-page-number">{index + 1}</span>}
    </div>;
  };
  const turningIndex = turn ? turn.direction > 0 ? turn.from === 0 ? 0 : turn.from * 2 : turn.from * 2 - 1 : 0;
  return <div ref={dialog} className="storybook-preview storybook-reader" role="dialog" aria-modal="true" aria-label="그림책 미리보기">
    <header><b>{title || "제목을 지어 주세요"}</b><div><a className="small-button" href={homeHref}>첫 화면으로</a><button ref={closeButton} type="button" className="small-button" onClick={onClose}>편집으로 돌아가기</button></div></header>
    <div className="reader-scene" style={{ "--page-ratio": storybookAspectRatio(document.format) } as CSSProperties}>
      <button className="reader-arrow" type="button" aria-label="이전 쪽" disabled={spread === 0} onClick={() => navigate(-1)}>‹</button>
      <div className={`reader-spread${spread === 0 ? " is-cover" : ""}`} onPointerDown={event => { swipe.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerCancel={() => { swipe.current = null; }} onPointerUp={event => { const start = swipe.current; swipe.current = null; if (start && Math.abs(event.clientX - start.x) > 45 && Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y) * 1.5) navigate(event.clientX < start.x ? 1 : -1); }}>
        {spread !== 0 && pageView(firstIndex, "reader-left")}
        {pageView(spread === 0 ? 0 : firstIndex + 1, "reader-right")}
        {turn && <div key={`${turn.from}-${turn.direction}`} aria-hidden="true" className={`reader-turn ${turn.direction > 0 ? "turn-forward" : "turn-back"}`}>{pageView(turningIndex)}</div>}
      </div>
      <button className="reader-arrow" type="button" aria-label="다음 쪽" disabled={spread === last} onClick={() => navigate(1)}>›</button>
    </div>
    <footer aria-live="polite">{spread === 0 ? "겉표지 · 1" : `${firstIndex + 1}${firstIndex + 1 < document.pages.length ? `–${firstIndex + 2}` : ""}`} / {document.pages.length}쪽 <small>화살표 또는 손가락으로 책장을 넘겨요</small></footer>
  </div>;
}
