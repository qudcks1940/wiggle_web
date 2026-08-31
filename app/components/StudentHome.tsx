"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activeProfile, deactivateProfile, flushSaves, studentFetch } from "@/lib/client-session";
import { Logo } from "./Logo";
import { SpeakButton } from "./SpeakButton";
import { StudentMessageCenter, StudentTeacherMessage } from "./StudentMessageCenter";

type HomeArtwork = { id: string; title: string; learningMode: string; lessonSlug: string | null; status: string; currentStep: number; updatedAt: string };
type TodayEpisode = { arcId: string; arcTitle: string; arcVersion: number; episodeId: string; title: string; sceneText: string; sceneImage: string | null; episodeIndex: number; episodeCount: number };
type TodayEpisodeArtwork = { id: string; title: string; status: string; revision: number; updatedAt: string };
type HomeData = { student: { id: string; nickname: string; animal: string; classroomName: string }; artworks: HomeArtwork[]; artworkTotal: number; todayEpisode: TodayEpisode | null; todayEpisodeArtwork: TodayEpisodeArtwork | null; currentActivityArtwork: HomeArtwork | null; latestUnfinishedArtwork: HomeArtwork | null; messages: StudentTeacherMessage[]; currentActivityKey: string; currentActivityLabel: string };

export function StudentHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const loadInFlight = useRef(false);
  const flushInFlight = useRef(false);

  const flushInBackground = useCallback(() => {
    const profile = activeProfile();
    if (!profile || flushInFlight.current) return;
    flushInFlight.current = true;
    void flushSaves(profile.studentId)
      .then((flushed) => {
        if (flushed.conflicts.length) setError("다른 기기의 저장과 겹친 그림이 있어요. 그림을 열어 새 사본으로 보관해 주세요.");
      })
      .catch(() => undefined)
      .finally(() => { flushInFlight.current = false; });
  }, []);

  const load = useCallback(async () => {
    if (loadInFlight.current || document.visibilityState === "hidden") return;
    const profile = activeProfile();
    if (!profile) { location.replace("/join"); return; }
    loadInFlight.current = true;
    flushInBackground();
    try {
      const response = await studentFetch("/api/student");
      const next = await response.json() as HomeData & { error?: string };
      if (!response.ok) throw new Error(next.error);
      setData(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "기록을 불러오지 못했어요.");
    } finally { loadInFlight.current = false; }
  }, [flushInBackground]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 12_000);
    const online = () => void load();
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); window.removeEventListener("online", online); document.removeEventListener("visibilitychange", visible); };
  }, [load]);

  const [startingEpisode, setStartingEpisode] = useState(false);
  const unfinished = data?.latestUnfinishedArtwork;

  if (!data) return <main className="app-shell"><header className="app-header"><Logo /></header><div className="loading-card" role="status">{error || "내 그림을 찾고 있어요…"}</div></main>;

  // 레슨 카탈로그는 은퇴했다(Story 2.3). 수업이 닫혀 있으면 자유 그리기가 유일한 시작 경로다(AD-14).
  const teacherArtwork = data.currentActivityArtwork;
  const teacherDone = teacherArtwork?.status === "complete";
  const freeDrawPath = teacherArtwork && !teacherDone ? `/student/draw/${teacherArtwork.id}` : "/student/draw/new?mode=free";

  async function startTodayEpisode() {
    const episode = data?.todayEpisode;
    if (!episode || startingEpisode) return;
    // 이미 이 회차 작품이 있으면 바로 연다(재입장 — 빈 쪽 모드로 보내지 않는다).
    if (data?.todayEpisodeArtwork) { location.href = `/student/draw/${data.todayEpisodeArtwork.id}`; return; }
    setStartingEpisode(true);
    try {
      const response = await studentFetch("/api/artworks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ arcId: episode.arcId, episodeId: episode.episodeId, clientArtworkId: `artwork_${crypto.randomUUID().replaceAll("-", "")}` }),
      });
      const payload = await response.json().catch(() => ({})) as { artwork?: { id?: string }; error?: string };
      if (!response.ok || !payload.artwork?.id) throw new Error(payload.error ?? "그림을 만들 수 없어요.");
      location.href = `/student/draw/${payload.artwork.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "그림을 만들 수 없어요.");
      setStartingEpisode(false);
    }
  }

  async function leaveClass() {
    if (leaving) return;
    setLeaving(true);
    await deactivateProfile().catch(() => undefined);
    location.replace("/join");
  }

  return <main className="app-shell student-app student-home-redesign">
    <header className="app-header student-home-header">
      <Logo />
      <div className="student-identity"><span aria-hidden="true">{data.student.animal}</span><div><b>{data.student.nickname}</b><small>{data.student.classroomName}</small></div></div>
      <div className="student-header-actions"><StudentMessageCenter messages={data.messages} floating /><button className="small-button" onClick={() => void leaveClass()} disabled={leaving}>🐾 학생 바꾸기</button><button className="small-button finish-class-button" onClick={() => void leaveClass()} disabled={leaving}>🚪 수업 마치기</button></div>
    </header>
    {error && <p className="error-box" role="alert">{error}</p>}
    {data.todayEpisode ? <>
    <section className="student-home-intro">
      <div>
        <h1>{data.todayEpisode.arcTitle}</h1>
        <p>{data.todayEpisode.episodeIndex}번째 이야기 시간이에요.</p>
      </div>
      {/* 음성은 페이지당 1개(학생UI-7). 장면 문장은 확정 시나리오 문장이므로 그대로 읽는다. */}
      <SpeakButton text={`${data.todayEpisode.arcTitle}. ${data.todayEpisode.title}. ${data.todayEpisode.sceneText}`} />
    </section>

    <section className="today-episode-card" aria-labelledby="today-episode-title">
      {/* 장면 삽화(21항) — 비문해 아이의 1차 채널. 제작 전(null)에는 글·음성 2채널로 동작한다. */}
      {data.todayEpisode.sceneImage && <img className="today-episode-scene" src={data.todayEpisode.sceneImage} alt="" />}
      <p className="teacher-activity-pill">⭐ {data.todayEpisode.episodeIndex}회차</p>
      <h2 id="today-episode-title">{data.todayEpisode.title}</h2>
      <p className="today-episode-scene-text">{data.todayEpisode.sceneText}</p>
      <button className="button primary child-primary-action" onClick={() => void startTodayEpisode()} disabled={startingEpisode}>
        <span aria-hidden="true">▶️</span>
        {startingEpisode ? "여는 중…" : data.todayEpisodeArtwork ? (data.todayEpisodeArtwork.status === "complete" ? "내 그림 다시 보기" : "이어 그리기") : "그리기 시작"}
      </button>
    </section>
    </> : <>
    <section className="student-home-intro">
      <div>
        <h1>오늘은 무엇을 그릴까?</h1>
        <p>선생님이 고른 활동부터 시작해 봐요.</p>
      </div>
      <SpeakButton text="오늘은 무엇을 그릴까? 선생님이 고른 활동부터 시작해 봐요." />
    </section>

    <section className="today-episode-card" aria-labelledby="free-draw-title">
      <p className="teacher-activity-pill">🎨 자유롭게 그리기</p>
      <h2 id="free-draw-title">내 마음 그림</h2>
      <p className="today-episode-scene-text">그리고 싶은 것을 마음껏 그려요. 그리다 막히면 그리미를 불러요.</p>
      <a className="button primary child-primary-action" href={freeDrawPath}><span aria-hidden="true">▶️</span>{teacherArtwork && !teacherDone ? "이어 그리기" : "그리기 시작"}</a>
    </section>
    </>}

    <nav className="student-primary-menu student-tool-shelf" aria-label="내 그림 메뉴">
      <a className="student-menu-card resume" href={unfinished ? `/student/draw/${unfinished.id}` : "/student/draw/new?mode=free"}>
        <span aria-hidden="true">✏️</span><div><h2>이어 그리기</h2><p>{unfinished ? unfinished.title : "이어 그릴 그림 없음"}</p></div><b>{unfinished ? "열기" : "없음"}</b>
      </a>
      <a className="student-menu-card archive" href="/student/archive">
        <span aria-hidden="true">🖼️</span><div><h2>내 그림</h2><p>그린 그림 다시 보기</p></div><b>{data.artworkTotal}개</b>
      </a>
    </nav>

    <section className="storybook-home-entry" aria-labelledby="storybook-home-title">
      <div className="storybook-home-books" aria-hidden="true"><span>📘</span><span>📖</span><span>✏️</span></div>
      <div><p className="eyebrow">내 그림 다음 이야기</p><h2 id="storybook-home-title">나만의 그림책 만들기</h2><p>쪽 위에는 이야기를 쓰고, 그 아래에는 완성한 그림을 놓아 한 권으로 꾸며요.</p></div>
      <a className="button primary" href="/student/books">그림책 작업실 열기 →</a>
    </section>
  </main>;
}
