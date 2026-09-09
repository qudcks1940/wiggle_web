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
 * 회차 기본 형상은 { episodeId, title, sceneText, sceneImage } 다 (Story 2.1).
 * 씨앗 선 커리큘럼(2026-09-09, docs/curriculum-seed-plan.md)은 여기에 선택 항목 셋을 더한다:
 * - `seed`: 도화지에 미리 그어 두는 씨앗 선(정규화 좌표 폴리라인). 점선 힌트가 아니라
 *   아이가 지울 수 있는 보통의 획이며, 작품 생성 시 문서에 심는다.
 * - `prompts`: 장면 문장(sceneText) 다음에 이어지는 안내 문장. 아이 화면에 함께 보인다.
 * - `discussion`: 교실에서 말로 하는 토론 질문. 교사 화면에만 보인다(앱 안 토론은 만들지 않는다).
 */

export type SeedLine = Array<[number, number]>;

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
  /** 씨앗 선. 도화지 정규화 좌표(0~1). 없으면 빈 도화지로 시작한다. */
  seed?: SeedLine[];
  /** sceneText 뒤에 이어지는 안내 문장(질문형, 짧게). 아이 화면에 함께 보이고 음성으로 읽힌다. */
  prompts?: string[];
  /** 교실 토론 질문. 교사 화면 전용. */
  discussion?: string[];
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

/* 씨앗 선 좌표 도우미. 기본 도화지는 1024×640(가로 1.6:1)이라 세로 반지름은 1.6배로 잡아야 둥글게 보인다. */
const ASPECT = 1024 / 640;
const round = (value: number) => Math.round(value * 1000) / 1000;
const circle = (cx: number, cy: number, r: number, from = 0, to = Math.PI * 2, segments = 24): SeedLine =>
  Array.from({ length: segments + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / segments;
    return [round(cx + Math.cos(angle) * r), round(cy + Math.sin(angle) * r * ASPECT)] as [number, number];
  });
const spiral = (cx: number, cy: number, r: number, turns: number, segments = 40): SeedLine =>
  Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const angle = t * turns * Math.PI * 2;
    return [round(cx + Math.cos(angle) * r * t), round(cy + Math.sin(angle) * r * t * ASPECT)] as [number, number];
  });

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
  {
    // 씨앗 선 12회 — docs/curriculum-seed-plan.md. 앞 회차(1~4)는 주제를 주고 5회부터 연다.
    // 축: 1~3 많이 떠올리기, 4~6 다르게 보기, 7~9 남과 다르게, 10~11 더 자세히, 12 반 전시.
    arcId: "seed-lines",
    version: 1,
    contentChecksum: "b037a9d7", // version 1의 arcChecksum 결과
    title: "이 선으로 뭘 만들까?",
    episodes: [
      {
        episodeId: "seed-line-animal",
        title: "선 하나, 동물",
        sceneText: "선이 하나 있어. 어떤 동물이 될까?",
        sceneImage: null,
        seed: [[[0.5, 0.25], [0.5, 0.62]]],
        prompts: ["같은 선이 다른 동물도 될 수 있을까?", "하나 더, 아까와 다른 동물로 만들어 봐.", "내 동물에게 이름과 이야기를 붙여 줘."],
        discussion: ["같은 선인데 뭐가 됐어?", "제일 뜻밖인 동물은 누구야?", "그 친구는 선을 어디로 봤을까?"],
      },
      {
        episodeId: "seed-curve-food",
        title: "구불구불 선, 먹는 것",
        sceneText: "구불구불한 선이야. 무슨 음식이 될까?",
        sceneImage: null,
        seed: [[[0.3, 0.55], [0.4, 0.42], [0.5, 0.5], [0.6, 0.6], [0.7, 0.48]]],
        prompts: ["뒤집어 보면 다른 음식도 보여?", "또 하나, 다른 음식으로 만들어 봐.", "누가 먹는지 그려 줘."],
        discussion: ["뜻밖인 음식은 뭐야?", "선을 뒤집은 친구 있어?", "왜 그렇게 봤는지 물어보자."],
      },
      {
        episodeId: "seed-circle-home",
        title: "동그라미, 우리 집 물건",
        sceneText: "동그라미가 있어. 우리 집 어디에 있을까?",
        sceneImage: null,
        seed: [circle(0.5, 0.5, 0.12)],
        prompts: ["다른 방에도 동그라미가 있을까?", "하나 더, 아주 작은 것으로 만들어 봐.", "그 물건이 있는 방을 그려 줘."],
        discussion: ["동그라미가 어디에 숨었어?", "같은 물건을 만든 친구가 있어?", "아무도 안 만든 물건은 뭐야?"],
      },
      {
        episodeId: "seed-zigzag-outside",
        title: "뾰족뾰족 선, 밖에서 본 것",
        sceneText: "뾰족뾰족한 선이야. 밖에서 본 것 중 뭐가 될까?",
        sceneImage: null,
        seed: [[[0.3, 0.6], [0.42, 0.4], [0.54, 0.6], [0.66, 0.4]]],
        prompts: ["도화지를 돌려서 봐. 다른 게 보여?", "또 돌려서 하나 더.", "그 장소에 나를 그려 줘."],
        discussion: ["도화지를 돌리면 뭐로 보여?", "위로 본 친구와 옆으로 본 친구가 어떻게 달라?", "셋 다 다른 친구 있어?"],
      },
      {
        episodeId: "seed-half-circle",
        title: "반원",
        sceneText: "반원이 있어. 뭐가 될까?",
        sceneImage: null,
        seed: [circle(0.5, 0.55, 0.15, Math.PI, Math.PI * 2, 16)],
        prompts: ["뒤집으면 뭐가 될까?", "반원을 두 개로 나누면?", "내 그림에 날씨를 더해 줘."],
        discussion: ["뒤집으면 달라지는 게 뭐야?", "반원을 잘라 쓴 친구 있어?", "제일 큰 것과 제일 작은 것을 찾아보자."],
      },
      {
        episodeId: "seed-cross",
        title: "만난 선 두 개",
        sceneText: "선 두 개가 만났어. 뭐가 될까?",
        sceneImage: null,
        seed: [[[0.35, 0.35], [0.65, 0.65]], [[0.65, 0.35], [0.35, 0.65]]],
        prompts: ["만난 자리를 가운데가 아니라 끝으로 보면?", "하나 더, 움직이는 것으로.", "어디로 가는지 그려 줘."],
        discussion: ["친구는 어디를 앞으로 봤어?", "움직이는 것으로 만든 친구는 뭘 만들었어?", "두 선을 따로 쓴 친구 있어?"],
      },
      {
        episodeId: "seed-ears",
        title: "귀 두 개?",
        sceneText: "귀처럼 보이지? 귀가 아닌 것으로도 만들어 봐.",
        sceneImage: null,
        seed: [[[0.42, 0.42], [0.45, 0.28], [0.5, 0.42]], [[0.5, 0.42], [0.55, 0.28], [0.58, 0.42]]],
        prompts: ["친구들 그림을 봤지? 아무도 안 만든 것으로.", "하나 더, 사람이 아닌 것으로.", "그것이 사는 곳을 그려 줘."],
        discussion: ["아무도 안 만든 건 뭐야?", "귀로 본 친구와 아닌 친구가 몇 명이야?", "어떻게 그 생각이 났어?"],
      },
      {
        episodeId: "seed-wheel",
        title: "바퀴 하나와 선",
        sceneText: "바퀴 하나와 선이 있어. 뭐가 될까?",
        sceneImage: null,
        seed: [circle(0.4, 0.65, 0.08, 0, Math.PI * 2, 20), [[0.48, 0.65], [0.75, 0.65]]],
        prompts: ["바퀴가 아닌 것으로 보면?", "친구들 그림에 없는 것으로 하나 더.", "누가 타는지 그려 줘."],
        discussion: ["왜 그렇게 봤는지 물어보자.", "바퀴를 바퀴로 안 쓴 친구 있어?", "제일 빠른 것과 제일 느린 것은?"],
      },
      {
        episodeId: "seed-three",
        title: "씨앗 세 개",
        sceneText: "씨앗이 셋이야. 하나씩 무언가로 만들어 봐.",
        sceneImage: null,
        seed: [[[0.25, 0.3], [0.25, 0.55]], [[0.45, 0.6], [0.55, 0.5], [0.65, 0.6]], circle(0.75, 0.3, 0.05, 0, Math.PI * 2, 16)],
        prompts: ["셋을 한 장면으로 이을 수 있을까?", "친구들과 다른 이야기로.", "제목을 붙여 줘."],
        discussion: ["셋을 하나로 이은 친구 있어?", "따로따로 만든 친구 그림은 뭐가 좋아?", "제목만 듣고 그림을 맞혀 보자."],
      },
      {
        episodeId: "seed-spiral-photo",
        title: "사진 속 나선",
        sceneText: "사진을 봐. 이 선이 사진 어디에 있어?",
        sceneImage: "/lessons/observe/snail-closeup.webp",
        seed: [spiral(0.5, 0.5, 0.14, 2)],
        prompts: ["사진에 없는 것을 더해 봐.", "나선을 달팽이가 아닌 것으로 하나 더.", "배경까지 채워 줘."],
        discussion: ["사진에 없는 걸 뭘 더했어?", "사진과 제일 다른 그림은 누구 거야?", "나선이 달팽이가 아닌 친구 있어?"],
      },
      {
        episodeId: "seed-choose-again",
        title: "다시 고른 씨앗",
        sceneText: "지금까지 씨앗 중 하나를 골라. 그때 못 만든 것으로 만들어 봐.",
        sceneImage: null,
        // 아이가 고르는 회차라 씨앗을 미리 심지 않는다. 11회 선택 화면은 별도 구현 항목이다(계획서).
        prompts: ["색을 세 가지 이상 써 봐.", "이야기를 두 줄로 써 줘."],
        discussion: ["처음과 뭐가 달라졌어?", "왜 그 씨앗을 골랐어?", "색이 이야기와 어울려?"],
      },
      {
        episodeId: "seed-wave-exhibit",
        title: "우리 반 같은 선",
        sceneText: "우리 반 모두 같은 선이야. 뭐가 될까?",
        sceneImage: null,
        seed: [[[0.2, 0.6], [0.35, 0.45], [0.5, 0.6], [0.65, 0.45], [0.8, 0.6]]],
        prompts: ["친구와 다르게 만들어 봐.", "완성해 줘. 벽에 붙일 거야.", "제목과 이름표를 써 줘."],
        discussion: ["우리 반 그림을 한꺼번에 보면 뭐가 보여?", "같은 선이 몇 가지가 됐어?", "다음 씨앗은 뭐로 할까?"],
      },
    ],
  },
];

/**
 * 버전 올림 누락을 잡기 위한 결정적 체크섬 (FNV-1a 32비트).
 * 회차 배열의 내용(id·문안·삽화 경로, 있으면 씨앗·안내·토론)만 본다 — version·contentChecksum 자신은 제외.
 * 선택 항목은 있을 때만 재료에 넣어, 항목이 없는 기존 아크의 체크섬이 바뀌지 않게 한다.
 */
export function arcChecksum(arc: Pick<Arc, "title" | "episodes">): string {
  const material = JSON.stringify([
    arc.title,
    arc.episodes.map((e) => [
      e.episodeId, e.title, e.sceneText, e.sceneImage,
      ...(e.seed ? [e.seed] : []), ...(e.prompts ? [e.prompts] : []), ...(e.discussion ? [e.discussion] : []),
    ]),
  ]);
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
