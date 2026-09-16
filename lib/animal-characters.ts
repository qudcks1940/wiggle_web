import { NICKNAME_IDEAS } from "@/lib/nickname-ideas";

/**
 * 첫 입장 때 고르는 동물 친구 20종 (2026-09-13 사용자 시안 10종, 2026-09-14 사용자 지시로 20종). 화면은 10종씩 쪽을 넘긴다.
 *
 * 친구 이름은 여기 적지 않는다 — 서버가 붙이는 기본 별명(NICKNAME_IDEAS의 첫 후보)을 그대로 읽는다.
 * 그래야 화면의 "솔이와 시작하기"와 들어간 뒤의 별명이 어긋나지 않는다.
 *
 * 그림은 `/entry-green/animals/<slug>.webp`에 둔다. 파일만 같은 이름으로 덮어쓰면 코드 수정 없이
 * 바뀐다(고해상도 그림 요청서: docs/design-assets/animal-picker/REQUEST-CODEX.md).
 */
const BASE = [
  { emoji: "🐰", species: "토끼", slug: "rabbit" },
  { emoji: "🐻", species: "곰", slug: "bear" },
  { emoji: "🦊", species: "여우", slug: "fox" },
  { emoji: "🐯", species: "호랑이", slug: "tiger" },
  { emoji: "🐼", species: "판다", slug: "panda" },
  { emoji: "🐶", species: "강아지", slug: "dog" },
  { emoji: "🐱", species: "고양이", slug: "cat" },
  { emoji: "🐨", species: "코알라", slug: "koala" },
  { emoji: "🦁", species: "사자", slug: "lion" },
  { emoji: "🐸", species: "개구리", slug: "frog" },
  { emoji: "🐧", species: "펭귄", slug: "penguin" },
  { emoji: "🐹", species: "햄스터", slug: "hamster" },
  { emoji: "🐷", species: "돼지", slug: "pig" },
  { emoji: "🐵", species: "원숭이", slug: "monkey" },
  { emoji: "🐮", species: "송아지", slug: "cow" },
  { emoji: "🐑", species: "양", slug: "sheep" },
  { emoji: "🦒", species: "기린", slug: "giraffe" },
  { emoji: "🐘", species: "코끼리", slug: "elephant" },
  { emoji: "🦉", species: "부엉이", slug: "owl" },
  { emoji: "🦦", species: "수달", slug: "otter" },
] as const;

export type AnimalCharacter = { emoji: string; species: string; slug: string; name: string; image: string };

export const ANIMAL_CHARACTERS: readonly AnimalCharacter[] = BASE.map((animal) => ({
  ...animal,
  name: NICKNAME_IDEAS[animal.emoji]?.[0] ?? animal.species,
  image: `/entry-green/animals/${animal.slug}.webp`,
}));

/** "솔이와" / "해솔과": 마지막 글자에 받침이 있으면 "과", 없으면 "와". 한글이 아니면 "와". */
export function withGwaWa(name: string): string {
  const last = name.trim().at(-1) ?? "";
  const code = last.charCodeAt(0) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${name}${hasFinal ? "과" : "와"}`;
}
