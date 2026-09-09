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

/* 씨앗 선 좌표 도우미. 기본 도화지는 1024×640(가로 1.6:1)이라 원의 세로 반지름은 1.6배로 잡아야 둥글게 보인다. */
const ASPECT = 1024 / 640;
const round = (value: number) => Math.round(value * 1000) / 1000;
const circle = (cx: number, cy: number, r: number, from = 0, to = Math.PI * 2, segments = 24): SeedLine =>
  Array.from({ length: segments + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / segments;
    return [round(cx + Math.cos(angle) * r), round(cy + Math.sin(angle) * r * ASPECT)] as [number, number];
  });


type SeedStory = {
  arcId: string;
  title: string;
  seed: SeedLine[];
  /** 1회차: 씨앗을 무언가로 만들기 */
  first: { title: string; sceneText: string; prompts: string[]; discussion: string[] };
  /** 2~5회차: 지난 그림을 이어 그리기 — [제목, 장면 문장, 힌트 안내들, 토론 질문들] */
  story: Array<{ title: string; sceneText: string; prompts: string[]; discussion: string[] }>;
};

const STORY_IDS = ["seed", "who", "event", "where", "end"] as const;

function seedStoryArcs(): Arc[] {
  const stories: SeedStory[] = [
    {
      arcId: "circle-story", title: "동그라미 이야기",
      seed: [circle(0.5, 0.5, 0.12)],
      first: { title: "동그라미가 있어", sceneText: "동그라미가 있어. 뭐가 될까?", prompts: ["먹는 것? 굴러가는 것? 얼굴?", "고른 것을 크게 그려 봐.", "이름을 붙여 줘."], discussion: ["같은 동그라미인데 뭐가 됐어?", "제일 뜻밖인 건 뭐야?", "왜 그렇게 봤는지 물어보자."] },
      story: [
        { title: "누가 쓰고 있을까", sceneText: "지난 그림의 그것을 누가 쓰고 있을까?", prompts: ["먹는 사람? 타는 사람? 안고 있는 친구?", "그 사람 얼굴 표정도 그려 봐.", "어디에 있는지도 그려 줘."], discussion: ["누가 나왔어?", "그 사람은 기분이 어때 보여?", "친구 그림에서 다른 사람을 찾아보자."] },
        { title: "무슨 일이 생겼을까", sceneText: "그 사람에게 무슨 일이 생겼을까?", prompts: ["떨어뜨렸어? 잃어버렸어? 더 생겼어?", "놀란 얼굴? 웃는 얼굴?", "옆에 누가 왔을까?"], discussion: ["무슨 일이 생겼어?", "왜 그런 일이 생겼을까?", "너라면 어떻게 했을 것 같아?"] },
        { title: "어디로 갔을까", sceneText: "그래서 어디로 갔을까?", prompts: ["집? 학교? 바다? 하늘?", "가는 길에 뭐가 보여?", "누구랑 같이 가?"], discussion: ["어디로 갔어?", "가는 길에 뭘 봤어?", "제일 멀리 간 친구는 누구야?"] },
        { title: "이야기의 끝", sceneText: "이야기의 끝은 어떻게 될까?", prompts: ["다시 만났어? 새로 생겼어? 잔치를 했어?", "제일 좋아하는 장면으로 그려 봐.", "책 제목을 붙여 줘."], discussion: ["끝은 어떻게 됐어?", "처음 동그라미가 마지막에도 있어?", "다음 이야기가 있다면 뭐가 될까?"] },
      ],
    },
    {
      arcId: "curve-story", title: "구불구불 이야기",
      seed: [[[0.3, 0.55], [0.4, 0.42], [0.5, 0.5], [0.6, 0.6], [0.7, 0.48]]],
      first: { title: "구불구불한 선이야", sceneText: "구불구불한 선이야. 뭐가 될까?", prompts: ["강? 뱀? 국수? 길?", "고른 것을 크게 그려 봐.", "이름을 붙여 줘."], discussion: ["같은 선인데 뭐가 됐어?", "선을 뒤집어 본 친구 있어?", "제일 뜻밖인 건 뭐야?"] },
      story: [
        { title: "누가 찾아왔을까", sceneText: "지난 그림의 그것에 누가 찾아왔을까?", prompts: ["동물? 아이? 로봇?", "왜 찾아왔는지 표정으로 보여 줘.", "무엇을 들고 왔을까?"], discussion: ["누가 찾아왔어?", "왜 찾아왔을까?", "친구 그림에는 누가 왔어?"] },
        { title: "같이 뭘 했을까", sceneText: "둘이 같이 무엇을 했을까?", prompts: ["놀았어? 여행했어? 요리했어?", "둘이 하는 모습을 그려 봐.", "주변에 뭐가 있을까?"], discussion: ["둘이 뭘 했어?", "재미있었을까, 힘들었을까?", "너라면 뭘 하고 싶어?"] },
        { title: "문제가 생겼어", sceneText: "그런데 문제가 생겼어. 무슨 문제일까?", prompts: ["비가 와? 길을 잃었어? 싸웠어?", "곤란한 얼굴을 그려 봐.", "누가 도와줄까?"], discussion: ["무슨 문제야?", "어떻게 해결할 수 있을까?", "친구 그림의 문제는 뭐야?"] },
        { title: "이야기의 끝", sceneText: "문제는 어떻게 풀렸을까?", prompts: ["힘을 합쳤어? 새 친구가 왔어? 집에 갔어?", "제일 좋아하는 장면으로 그려 봐.", "책 제목을 붙여 줘."], discussion: ["어떻게 풀렸어?", "처음 선이 마지막에도 있어?", "다음 이야기가 있다면 뭐가 될까?"] },
      ],
    },
    {
      arcId: "zigzag-story", title: "뾰족뾰족 이야기",
      seed: [[[0.3, 0.6], [0.42, 0.4], [0.54, 0.6], [0.66, 0.4]]],
      first: { title: "뾰족뾰족한 선이야", sceneText: "뾰족뾰족한 선이야. 뭐가 될까?", prompts: ["산? 번개? 악어 입? 왕관?", "도화지를 돌려서도 봐.", "이름을 붙여 줘."], discussion: ["같은 선인데 뭐가 됐어?", "도화지를 돌린 친구 있어?", "제일 뜻밖인 건 뭐야?"] },
      story: [
        { title: "누가 살고 있을까", sceneText: "지난 그림의 그곳에 누가 살고 있을까?", prompts: ["동물? 괴물? 우리 가족?", "집이나 둥지를 그려 봐.", "무엇을 먹고 살까?"], discussion: ["누가 살고 있어?", "왜 거기 살까?", "친구 그림에는 누가 살아?"] },
        { title: "손님이 왔어", sceneText: "어느 날 손님이 왔어. 누구일까?", prompts: ["친구? 낯선 사람? 비행기?", "손님이 뭘 가져왔을까?", "만나는 순간을 그려 봐."], discussion: ["누가 왔어?", "반가웠을까, 놀랐을까?", "손님이 가져온 건 뭐야?"] },
        { title: "모험을 떠나", sceneText: "둘은 모험을 떠났어. 어디로 갈까?", prompts: ["산 너머? 바다? 우주?", "타고 가는 것을 그려 봐.", "길에서 뭘 만났을까?"], discussion: ["어디로 갔어?", "길에서 뭘 만났어?", "제일 신나는 장면은 누구 거야?"] },
        { title: "이야기의 끝", sceneText: "모험의 끝은 어떻게 될까?", prompts: ["보물을 찾았어? 집으로 돌아왔어?", "제일 좋아하는 장면으로 그려 봐.", "책 제목을 붙여 줘."], discussion: ["끝은 어떻게 됐어?", "처음 선이 마지막에도 있어?", "다음 이야기가 있다면 뭐가 될까?"] },
      ],
    },
    {
      arcId: "cross-story", title: "만난 선 이야기",
      seed: [[[0.35, 0.35], [0.65, 0.65]], [[0.65, 0.35], [0.35, 0.65]]],
      first: { title: "선 두 개가 만났어", sceneText: "선 두 개가 만났어. 뭐가 될까?", prompts: ["풍차? 나비? 가위? 별?", "고른 것을 크게 그려 봐.", "이름을 붙여 줘."], discussion: ["같은 선인데 뭐가 됐어?", "만난 자리를 어디로 봤어?", "제일 뜻밖인 건 뭐야?"] },
      story: [
        { title: "누구 것일까", sceneText: "지난 그림의 그것은 누구 것일까?", prompts: ["아이? 할머니? 강아지?", "주인이 쓰는 모습을 그려 봐.", "어디에 두고 쓸까?"], discussion: ["누구 거야?", "어떻게 쓰고 있어?", "친구 그림의 주인은 누구야?"] },
        { title: "잃어버렸어", sceneText: "그런데 잃어버렸어. 어디에 있을까?", prompts: ["나무 위? 물속? 가방 속?", "찾는 얼굴을 그려 봐.", "누가 같이 찾아 줄까?"], discussion: ["어디서 잃어버렸어?", "어떻게 찾을 수 있을까?", "친구는 어디서 찾았어?"] },
        { title: "찾았다", sceneText: "드디어 찾았어! 어떤 모습일까?", prompts: ["그대로야? 달라졌어? 커졌어?", "기쁜 얼굴을 그려 봐.", "찾은 곳을 그려 줘."], discussion: ["찾았을 때 어땠어?", "뭐가 달라졌어?", "제일 놀라운 장면은 누구 거야?"] },
        { title: "이야기의 끝", sceneText: "이야기의 끝은 어떻게 될까?", prompts: ["잔치? 선물? 새 친구?", "제일 좋아하는 장면으로 그려 봐.", "책 제목을 붙여 줘."], discussion: ["끝은 어떻게 됐어?", "처음 선이 마지막에도 있어?", "다음 이야기가 있다면 뭐가 될까?"] },
      ],
    },
  ];
  return stories.map((story) => ({
    arcId: story.arcId,
    version: 1,
    contentChecksum: SEED_STORY_CHECKSUMS[story.arcId] ?? "",
    title: story.title,
    episodes: [
      { episodeId: `${story.arcId}-${STORY_IDS[0]}`, title: story.first.title, sceneText: story.first.sceneText, sceneImage: null, seed: story.seed, prompts: story.first.prompts, discussion: story.first.discussion },
      ...story.story.map((episode, index) => ({
        episodeId: `${story.arcId}-${STORY_IDS[index + 1]}`, title: episode.title, sceneText: episode.sceneText, sceneImage: null, prompts: episode.prompts, discussion: episode.discussion,
      })),
    ],
  }));
}

/** version 1의 arcChecksum 결과. 문안을 고치면 version과 함께 갱신한다(테스트가 잡는다). */
const SEED_STORY_CHECKSUMS: Record<string, string> = {
  "circle-story": "723f853b",
  "curve-story": "6f34468c",
  "zigzag-story": "d2342901",
  "cross-story": "454c95d0",
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
  // 씨앗 이야기 아크 4개 (docs/curriculum-seed-plan.md, 2026-09-09 사용자 결정):
  // 1회차만 씨앗 선을 주고, 2회차부터는 아이 자신의 지난 그림이 다음 회차의 씨앗이다.
  // 2회차 이후 안내는 힌트가 있는 문장(1~2학년이 덜 막히도록). 5회차가 모이면 동화책 한 권이 된다.
  // 회차 수는 5로 두되 교사는 언제든 멈추거나 더 열 수 있다(product-decisions 8-1).
  ...seedStoryArcs(),
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
