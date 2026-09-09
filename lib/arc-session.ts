/**
 * 접속 맥락 판별 (AD-14) — 무의존 순수 모듈.
 *
 * 판별 신호는 학급 포인터(current_arc_id + current_episode_id)의 유효성 **하나뿐**이다.
 * admission_open·active·teacher_views·starts_at/ends_at를 근거로 쓰지 않는다.
 * 기본값은 교실이다: 포인터가 유효하면 오늘 회차, 없으면 자유 그리기 —
 * 교사가 아무것도 누르지 않아도 흐름이 막히지 않는다(FR-33).
 *
 * 요청당 한 번만 계산하고 응답 안에서 재사용한다 — 화면과 열기 경로가 각자 계산하지 않는다.
 */
import { arcById, type ArcEpisode } from "./arc-content";

export type TodayEpisode = {
  arcId: string;
  arcTitle: string;
  /** 작품 생성 시 함께 기록할 콘텐츠 버전 (AD-8 — 회차 상수 읽기는 언제나 이 버전으로). */
  arcVersion: number;
  episodeId: string;
  title: string;
  sceneText: string;
  sceneImage: string | null;
  /** sceneText 뒤에 이어지는 안내 문장. 씨앗 선 회차에만 있다. */
  prompts: string[];
  /** 1부터 시작하는 회차 번호 — 화면 표기용. 귀속에는 episodeId만 쓴다. */
  episodeIndex: number;
  episodeCount: number;
};

export function resolveTodayEpisode(
  currentArcId: string | null | undefined,
  currentEpisodeId: string | null | undefined,
): TodayEpisode | null {
  const arc = arcById(currentArcId);
  if (!arc) return null;
  const index = arc.episodes.findIndex((episode: ArcEpisode) => episode.episodeId === currentEpisodeId);
  if (index < 0) return null;
  const episode = arc.episodes[index];
  return {
    arcId: arc.arcId,
    arcTitle: arc.title,
    arcVersion: arc.version,
    episodeId: episode.episodeId,
    title: episode.title,
    sceneText: episode.sceneText,
    sceneImage: episode.sceneImage,
    prompts: episode.prompts ?? [],
    episodeIndex: index + 1,
    episodeCount: arc.episodes.length,
  };
}
