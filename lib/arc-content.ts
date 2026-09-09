/**
 * 이야기 아크 콘텐츠 정본 (AD-8).
 *
 * 아크·회차 정의는 이 코드 상수가 정본이고, DB에는 아크 id와 콘텐츠 버전만 기록한다.
 * - 회차는 순서 index가 아니라 안정적인 `episodeId`로 가리킨다.
 *   버전을 올릴 때 기존 episodeId를 재사용하거나 삭제하지 않는다(추가·재배열은 허용).
 * - 이미 시작된 작품은 생성 시점의 `arcVersion`을 따른다 — 회차 상수 읽기는
 *   언제나 그 작품의 버전으로 한다(현재 버전으로 읽는 경로를 만들지 않는다).
 * - 콘텐츠를 고치면 반드시 `version`을 올린다. 잊으면 CI가 잡도록
 *   `arcChecksum()`과 저장된 `contentChecksum`을 대조하는 테스트가 있다(AD-8).
 *
 * 회차 형상은 { episodeId, title, sceneText, sceneImage } 뿐이다 (Story 2.1).
 * 기존 Lesson의 steps·guide·observationWords는 이번 범위에 없다 — 점선·단계 안내를
 * 아크 회차에 더하는 것은 별도 제품 결정이다.
 */

export type ArcEpisode = {
  /** 안정 식별자. 버전이 올라도 같은 회차는 같은 id를 유지한다. */
  episodeId: string;
  /** 아이 화면에 보이는 회차 제목. 짧고 쉬운 한국어. */
  title: string;
  /**
   * 오늘 그릴 장면을 알려주는 한 문장. 이 문장이 곧 지시문이므로
   * 음성으로도 읽힌다(확정 시나리오 문장 — AI가 바꾸지 않는다).
   */
  sceneText: string;
  /**
   * 장면 삽화 경로 (public/ 기준). 비문해 아이의 1차 채널 (product-decisions 21항).
   * 삽화 제작 전에는 null — 카드가 글·음성 2채널로 동작하되, 현장 투입 전 채워야 한다.
   */
  sceneImage: string | null;
};

export type Arc = {
  arcId: string;
  /** 콘텐츠 버전. 회차 문안·구성을 고치면 반드시 올린다. */
  version: number;
  /**
   * `version`을 올린 시점의 `arcChecksum(arc)` 값.
   * 콘텐츠만 고치고 버전을 안 올리면 테스트가 이 값과의 불일치로 실패한다.
   */
  contentChecksum: string;
  title: string;
  episodes: ArcEpisode[];
};

/** 회차 수는 아크마다 다를 수 있다 — 5로 고정하지 않는다 (FR-1). */
export const ARCS: Arc[] = [
  {
    arcId: "bicycle-story",
    version: 1,
    contentChecksum: "89dd637c", // version 1의 arcChecksum 결과
    title: "자전거 이야기",
    episodes: [
      {
        episodeId: "bicycle-begin",
        title: "동그라미에서 자전거로",
        sceneText: "동그라미를 그리고, 그 동그라미로 자전거를 만들어 봐요.",
        sceneImage: null,
      },
      {
        episodeId: "bicycle-ride",
        title: "달리는 자전거",
        sceneText: "내가 만든 자전거가 신나게 달리는 모습을 그려 봐요.",
        sceneImage: null,
      },
    ],
  },
];

/**
 * 버전 올림 누락을 잡기 위한 결정적 체크섬 (FNV-1a 32비트).
 * 회차 배열의 내용(id·문안·삽화 경로)만 본다 — version·contentChecksum 자신은 제외.
 */
export function arcChecksum(arc: Pick<Arc, "title" | "episodes">): string {
  const material = JSON.stringify([arc.title, arc.episodes.map((e) => [e.episodeId, e.title, e.sceneText, e.sceneImage])]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function arcById(arcId: string | null | undefined): Arc | undefined {
  return ARCS.find((arc) => arc.arcId === arcId);
}

/**
 * 회차 조회는 언제나 명시된 버전으로 한다 (AD-8).
 * 현재 상수에 그 버전이 없으면(과거 버전) — v1 단계에서는 버전이 하나뿐이므로
 * 현재 정의에서 episodeId만 맞으면 돌려준다. episodeId는 버전 간 불변이 규약이다.
 */
export function episodeById(arcId: string | null | undefined, episodeId: string | null | undefined): ArcEpisode | undefined {
  return arcById(arcId)?.episodes.find((episode) => episode.episodeId === episodeId);
}

/** 학급 포인터 검증용 — 알 수 없는 조합은 400으로 거부하고 기본값으로 대체하지 않는다 (Story 2.1). */
export function isValidArcEpisode(arcId: string, episodeId: string): boolean {
  return Boolean(episodeById(arcId, episodeId));
}
