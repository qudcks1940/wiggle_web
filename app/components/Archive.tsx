"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deactivateProfile, studentFetch } from "@/lib/client-session";
import { Logo } from "./Logo";

type ArchiveArtwork = { id: string; title: string; learningMode: string; lessonSlug: string | null; status: string; hasImage: number | boolean; updatedAt: string; completedAt: string | null };

function ArtworkPreview({ artwork }: { artwork: ArchiveArtwork }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!artwork.hasImage) return;
    const controller = new AbortController();
    let objectUrl = "";
    studentFetch(`/api/artworks/${encodeURIComponent(artwork.id)}/image`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("preview unavailable");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("invalid preview");
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [artwork.hasImage, artwork.id]);

  if (imageUrl) return <img src={imageUrl} alt={`${artwork.title} 그림 미리보기`} />;
  return <span aria-label={failed ? "그림 미리보기를 불러오지 못했어요" : "그림 미리보기를 불러오는 중"}>{artwork.status === "complete" ? "🌟" : "✏️"}</span>;
}


export function Archive() {
  const [data, setData] = useState<{ student: { nickname: string; animal: string }; artworks: ArchiveArtwork[] } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  const loadArchive = useCallback(async (offset = 0, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true); setError("");
    try {
      const response = await studentFetch(`/api/student?artworkOffset=${offset}`);
      const value = await response.json() as { student: { nickname: string; animal: string }; artworks: ArchiveArtwork[]; artworkHasMore?: boolean; artworkNextOffset?: number; error?: string };
      if (!response.ok) {
        if (response.status === 401) location.replace("/join");
        else throw new Error(value.error ?? "그림을 불러오지 못했어요.");
        return;
      }
      setData((current) => {
        if (!append || !current) return { student: value.student, artworks: value.artworks };
        const known = new Set(current.artworks.map((item) => item.id));
        return { student: value.student, artworks: [...current.artworks, ...value.artworks.filter((item) => !known.has(item.id))] };
      });
      setHasMore(Boolean(value.artworkHasMore));
      setNextOffset(value.artworkNextOffset ?? offset + value.artworks.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "그림을 불러오지 못했어요.");
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const [leaving, setLeaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => { void loadArchive(); }, [loadArchive]);
  async function leaveClass() {
    if (leaving) return;
    setLeaving(true);
    await deactivateProfile().catch(() => undefined);
    location.replace("/join");
  }

  const artworks = data?.artworks ?? [];
  // 고른 것이 없거나 목록에서 사라졌으면 가장 최근 그림을 편다.
  const selected = artworks.find((artwork) => artwork.id === selectedId) ?? artworks[0] ?? null;
  const drawing = selected?.status !== "complete";

  /* 학생 홈이 없어져(2026-09-12) 이 화면이 도화지 밖의 유일한 자리다 —
   * 새 그림·그림책·수업 마치기를 여기서 연다.
   * 2026-09-20 사용자 시안대로 펼친 책으로 바꿨다: 왼쪽은 그림 목록, 오른쪽은 고른 그림 한 장.
   * 책 껍데기는 이미 있는 `.teacher-activity-book`·`.book-page` 모양을 그대로 쓴다(교사 전용이 아니라
   * 저장소의 공통 「펼친 책」 모양이다). 새 껍데기를 만들면 같은 그림이 두 벌이 된다. */
  return <main className="app-shell archive-page archive-book-page">
    <header className="app-header"><Logo /><nav className="archive-actions" aria-label="내 그림 메뉴">
      <a className="small-button" href="/student/books"><span aria-hidden="true">📖</span>그림책</a>
      <button type="button" className="small-button archive-finish" onClick={() => void leaveClass()} disabled={leaving}><span aria-hidden="true">📕</span>{leaving ? "나가는 중…" : "수업 마치기"}</button>
    </nav></header>
    {error && <p className="error-box" role="alert">{error}</p>}
    <div className="teacher-activity-book archive-book">
      <section className="book-page book-copy-page archive-book-list" aria-label="내 그림 목록">
        <h1>{data ? `${data.student.nickname}의 그림 모음` : "내 그림 모음"}</h1>
        {artworks.length ? <>
          <ul>
            {artworks.map((artwork) => (
              <li key={artwork.id}>
                <button type="button" aria-current={selected?.id === artwork.id ? "true" : undefined} onClick={() => setSelectedId(artwork.id)}>
                  <span className="archive-book-thumb"><ArtworkPreview artwork={artwork} /></span>
                  <span className="archive-book-meta">
                    <b>{artwork.title}</b>
                    <time dateTime={artwork.completedAt ?? artwork.updatedAt}>{new Date(artwork.completedAt ?? artwork.updatedAt).toLocaleDateString("ko-KR")}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hasMore && <button type="button" className="button secondary archive-more-button" disabled={loadingMore} onClick={() => void loadArchive(nextOffset, true)}>{loadingMore ? "이전 그림 불러오는 중…" : "이전 그림 더 보기"}</button>}
        </> : <p className="archive-book-empty">아직 그림이 없어요. 새 그림을 시작해 봐요.</p>}
        {/* 시안에는 없지만, 이 화면 말고는 새 그림을 시작할 자리가 없어 남겼다. */}
        <a className="button primary child-primary-action archive-new" href="/student/draw/new?mode=free"><span aria-hidden="true">🎨</span>새 그림</a>
      </section>
      <div className="book-binding" aria-hidden="true"><i /><i /><i /></div>
      <section className="book-page book-visual-page archive-book-view" aria-label="고른 그림">
        {selected ? <>
          <div className="archive-book-head">
            <h2>{selected.title}</h2>
            <p className="archive-book-status"><span aria-hidden="true">{drawing ? "✏️" : "🌟"}</span>{drawing ? "그리는 중" : "완성"}</p>
          </div>
          <div className="archive-book-paper"><ArtworkPreview artwork={selected} /></div>
          <a className="button primary child-primary-action archive-book-open" href={drawing ? `/student/draw/${selected.id}` : `/student/archive/${selected.id}`}>
            <span aria-hidden="true">{drawing ? "✏️" : "👀"}</span>{drawing ? "이어 그리기" : "다시 보기"}
          </a>
        </> : <p className="archive-book-empty">왼쪽에서 그림을 고르면 여기에 크게 보여요.</p>}
      </section>
    </div>
  </main>;
}
