"use client";

import { useEffect, useRef, useState } from "react";
import { activeProfile, flushSaves, studentFetch } from "@/lib/client-session";
import { Logo } from "./Logo";
import { WaitMongri } from "./WaitMongri";

type UnfinishedArtwork = { id: string } | null;

/* 커리큘럼이 사라지고(2026-09-12 사용자 결정) 수업은 빈 도화지에서 선생님이 진행한다.
 * 그래서 학생 홈(오늘 회차 카드·선반)은 없앴고, 이 화면은 들어온 아이를 도화지로 보내는
 * 짧은 중간 다리다. 그리다 만 그림이 있으면 그것을 열고(태블릿 재부팅·기기 바꿈 대응),
 * 없으면 새 도화지를 편다. 기다리는 동안은 그리기 화면과 같은 몽그리 화면을 보여 준다
 * (2026-09-20 사용자: 글자만 있던 옛 화면이 먼저 스쳐 지나갔다). */
export function StudentEntry() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const opened = useRef(false);

  async function open() {
    if (opened.current) return;
    const profile = activeProfile();
    if (!profile) { location.replace("/join"); return; }
    opened.current = true;
    setBusy(true); setError("");
    // 기기에 남은 저장분을 먼저 올려 둔다. 실패해도 도화지는 연다 — 큐는 그대로 남는다.
    void flushSaves(profile.studentId).catch(() => undefined);
    try {
      const response = await studentFetch("/api/student");
      const data = await response.json() as { latestUnfinishedArtwork?: UnfinishedArtwork; error?: string };
      if (!response.ok) throw new Error(data.error);
      const unfinished = data.latestUnfinishedArtwork;
      location.replace(unfinished ? `/student/draw/${unfinished.id}` : "/student/draw/new?mode=free");
    } catch (cause) {
      opened.current = false;
      setError(cause instanceof Error && cause.message ? cause.message : "도화지를 펴지 못했어요. 다시 해 볼까요?");
      setBusy(false);
    }
  }

  // open은 한 번만 돈다(opened ref). 다시 걸면 매 렌더마다 도화지를 새로 연다.
  useEffect(() => { void open(); }, []);

  // 기다리는 동안은 대기 화면 하나(WaitMongri)만 쓴다. 다시 해 보기 단추가 필요한 실패 때만 안내 화면을 연다.
  if (!error) return <WaitMongri line="도화지를 펴고 있어요" />;
  return <main className="app-shell student-app">
    <header className="app-header"><Logo /></header>
    <div className="entry-error-block">
      <div className="error-box child-error" role="alert"><span className="child-error-icon" aria-hidden="true">⚠️</span><p>{error}</p></div>
      <button type="button" className="button primary full child-primary-action" disabled={busy} onClick={() => void open()}>
        <span aria-hidden="true">🔄</span>{busy ? "여는 중…" : "다시 해 보기"}
      </button>
      <a className="text-button" href="/join">처음으로</a>
    </div>
  </main>;
}
