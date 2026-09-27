"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject, type PointerEvent } from "react";

/** A persistent scrollbar: tablet browsers hide their native scrollbars when idle. */
export function StorybookToolbar({ children, viewportRef }: { children: ReactNode; viewportRef: RefObject<HTMLDivElement | null> }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ pointerId: number; offset: number } | null>(null);
  const [scroll, setScroll] = useState({ left: 0, width: 1, total: 1 });
  const sync = useCallback(() => {
    const viewport = viewportRef.current;
    if (viewport) setScroll({ left: viewport.scrollLeft, width: viewport.clientWidth, total: viewport.scrollWidth });
  }, [viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    observer.observe(content);
    sync();
    return () => observer.disconnect();
  }, [sync, viewportRef]);

  const max = Math.max(0, scroll.total - scroll.width);
  const thumbWidth = Math.min(100, Math.max(8, scroll.width / scroll.total * 100));
  const thumbLeft = max ? Math.max(0, Math.min(1, scroll.left / max)) * (100 - thumbWidth) : 0;
  function moveThumb(event: PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    const thumb = thumbRef.current;
    const drag = dragRef.current;
    if (!viewport || !thumb || !drag || drag.pointerId !== event.pointerId) return;
    const track = event.currentTarget.getBoundingClientRect();
    const travel = track.width - thumb.getBoundingClientRect().width;
    if (travel > 0) viewport.scrollLeft = Math.max(0, Math.min(1, (event.clientX - track.left - drag.offset) / travel)) * max;
  }

  return <div className="storybook-toolbar-shell">
    <div ref={viewportRef} id="storybook-toolbar" className="storybook-toolbar" role="group" tabIndex={0} aria-label="그림책 도구 · 좌우로 스크롤" onScroll={sync}>
      <div ref={contentRef} className="storybook-toolbar-content">{children}</div>
    </div>
    <div className="storybook-toolbar-scrollbar" role="scrollbar" tabIndex={max ? 0 : -1}
      aria-label="그림책 도구 가로 스크롤" aria-controls="storybook-toolbar" aria-orientation="horizontal"
      aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(Math.max(0, Math.min(max, scroll.left)))} aria-disabled={!max}
      onPointerDown={event => {
        if (!max || event.button !== 0) return;
        const thumb = thumbRef.current!.getBoundingClientRect();
        dragRef.current = { pointerId: event.pointerId, offset: event.clientX >= thumb.left && event.clientX <= thumb.right ? event.clientX - thumb.left : thumb.width / 2 };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus({ preventScroll: true });
        moveThumb(event);
      }}
      onPointerMove={moveThumb}
      onPointerUp={event => { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }}
      onPointerCancel={() => { dragRef.current = null; }}
      onLostPointerCapture={() => { dragRef.current = null; }}
      onKeyDown={event => {
        const viewport = viewportRef.current;
        if (!viewport || !max) return;
        const target = { ArrowLeft: scroll.left - 60, ArrowRight: scroll.left + 60, PageUp: scroll.left - scroll.width, PageDown: scroll.left + scroll.width, Home: 0, End: max }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        viewport.scrollLeft = target;
      }}>
      <span className="storybook-toolbar-scroll-track" aria-hidden="true" />
      <span ref={thumbRef} className="storybook-toolbar-scroll-thumb" aria-hidden="true" style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }} />
    </div>
  </div>;
}
