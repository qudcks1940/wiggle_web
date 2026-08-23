"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { studentFetch } from "@/lib/client-session";
import { STORYBOOK_FORMATS, type StorybookFormat } from "@/lib/storybook-model";
import { Logo } from "./Logo";

type DetailArtwork = { id: string; title: string; topic: string; learningMode: string; lessonSlug: string | null; intent: string; status: string; updatedAt: string; completedAt: string | null };
type Reflection = { favoritePart?: string; favoriteReason?: string; spokenDescription?: string; storyText?: string; nextSuggestion?: string } | null;
const FORMAT_COPY: Record<StorybookFormat, { iconClass: string; title: string; description: string }> = {
  landscape: { iconClass: "format-landscape", title: "가로 그림책", description: "넓은 장면을 담아요" },
  portrait: { iconClass: "format-portrait", title: "세로 그림책", description: "길게 이야기를 펼쳐요" },
  square: { iconClass: "format-square", title: "정사각 그림책", description: "그림을 크게 보여 줘요" },
};

export function ArtworkDetail() {
  const params = useParams<{ id: string }>();
  const [artwork, setArtwork] = useState<DetailArtwork | null>(null);
  const [reflection, setReflection] = useState<Reflection>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [makingBook, setMakingBook] = useState(false);
  const [formatPickerOpen, setFormatPickerOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    void (async () => {
      try {
        const response = await studentFetch(`/api/artworks/${encodeURIComponent(params.id)}?summary=1`, { signal: controller.signal });
        const data = await response.json() as { artwork?: DetailArtwork; reflection?: Reflection; error?: string };
        if (!response.ok || !data.artwork) throw new Error(data.error ?? "그림을 찾지 못했어요.");
        if (data.artwork.status !== "complete") { location.replace(`/student/draw/${data.artwork.id}`); return; }
        setArtwork(data.artwork); setReflection(data.reflection ?? null);
        const imageResponse = await studentFetch(`/api/artworks/${encodeURIComponent(params.id)}/image?variant=final`, { signal: controller.signal });
        if (!imageResponse.ok) throw new Error("완성 그림을 불러오지 못했어요.");
        const blob = await imageResponse.blob();
        objectUrl = URL.createObjectURL(blob); setImageUrl(objectUrl);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "그림을 불러오지 못했어요.");
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [params.id]);

  async function drawAgain() {
    if (!artwork || creating || makingBook) return;
    setCreating(true); setError("");
    try {
      const response = await studentFetch("/api/artworks", { method: "POST", body: JSON.stringify({
        clientArtworkId: `artwork_${crypto.randomUUID().replaceAll("-", "")}`,
        learningMode: artwork.learningMode, lessonSlug: artwork.lessonSlug, title: artwork.title, topic: artwork.topic,
        intent: `${artwork.topic}을(를) 새로운 생각으로 다시 그려 보고 싶어요.`,
      }) });
      const data = await response.json() as { artwork?: { id: string }; error?: string };
      if (!response.ok || !data.artwork) throw new Error(data.error ?? "새 그림을 만들지 못했어요.");
      location.href = `/student/draw/${data.artwork.id}`;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "새 그림을 만들지 못했어요."); setCreating(false); }
  }

  async function makeStorybook(format: StorybookFormat) {
    if (!artwork || creating || makingBook) return;
    setMakingBook(true); setError("");
    try {
      const response = await studentFetch("/api/storybooks", { method: "POST", body: JSON.stringify({
        format, artworkId: artwork.id, title: `${artwork.title} 그림책`,
      }) });
      const data = await response.json() as { storybook?: { id: string }; error?: string };
      if (!response.ok || !data.storybook) throw new Error(data.error ?? "그림책을 만들지 못했어요.");
      window.location.assign(`/student/books/${data.storybook.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "그림책을 만들지 못했어요."); setMakingBook(false); }
  }

  return <main className="app-shell artwork-detail-page"><header className="app-header"><Logo /><a className="small-button" href="/student/archive">← 내 그림</a></header>
    {!artwork && !error && <div className="loading-card">완성한 그림을 펼치는 중…</div>}{error && <p className="error-box" role="alert">{error}</p>}
    {artwork && <article className="artwork-detail-card"><div className="artwork-detail-copy"><p className="eyebrow">🌟 완성한 작품</p><h1>{artwork.title}</h1><p>{artwork.intent}</p><p className="artwork-readonly-note">🔒 읽기 전용 · 완성한 그림은 그대로 안전하게 보관돼요.</p><time dateTime={artwork.completedAt ?? artwork.updatedAt}>{new Date(artwork.completedAt ?? artwork.updatedAt).toLocaleDateString("ko-KR")}</time></div>
      <div className="artwork-detail-image">{imageUrl ? <img src={imageUrl} alt={`${artwork.title} 완성 그림`} /> : <span>그림을 불러오는 중…</span>}</div>
      {reflection && <section className="artwork-reflection"><h2>내가 남긴 생각</h2>{reflection.favoritePart && <p><b>마음에 드는 곳</b><span>{reflection.favoritePart}</span></p>}{reflection.favoriteReason && <p><b>마음에 드는 이유</b><span>{reflection.favoriteReason}</span></p>}{reflection.storyText && <p><b>이야기</b><span>{reflection.storyText}</span></p>}{reflection.nextSuggestion && <p><b>다음에는</b><span>{reflection.nextSuggestion}</span></p>}</section>}
      <div className="artwork-detail-actions"><a className="button secondary" href="/student/archive">다른 그림 보기</a><button type="button" className="button secondary" disabled={creating || makingBook} onClick={drawAgain}>{creating ? "새 도화지 준비 중…" : "🎨 새 그림으로 다시 그리기"}</button><button type="button" className="button primary" disabled={creating || makingBook} onClick={() => setFormatPickerOpen(true)}>{makingBook ? "그림책 준비 중…" : "📖 이 그림으로 그림책 만들기"}</button></div></article>}
    {formatPickerOpen && artwork && <div className="storybook-modal-backdrop" role="presentation" onMouseDown={() => { if (!makingBook) setFormatPickerOpen(false); }}><section className="storybook-format-dialog" role="dialog" aria-modal="true" aria-labelledby="storybook-format-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">먼저 책 모양을 골라요</p><h2 id="storybook-format-title">어떤 모양의 그림책을 만들까요?</h2><p>선택한 모양으로 첫 페이지를 만든 뒤 편집기를 열어요.</p></div><button type="button" className="small-button" disabled={makingBook} onClick={() => setFormatPickerOpen(false)}>닫기</button></header><div className="storybook-format-options">{STORYBOOK_FORMATS.map((format) => { const copy = FORMAT_COPY[format]; return <button type="button" key={format} disabled={makingBook} onClick={() => void makeStorybook(format)}><i className={copy.iconClass} /><b>{copy.title}</b><small>{copy.description}</small></button>; })}</div>{makingBook && <p role="status">선택한 모양으로 그림책을 준비하는 중…</p>}</section></div>}
  </main>;
}
