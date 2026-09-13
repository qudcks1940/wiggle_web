import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ANIMAL_CHARACTERS, withGwaWa } from "../lib/animal-characters.ts";
import { NICKNAME_IDEAS } from "../lib/nickname-ideas.ts";

test("친구 이름은 서버가 붙이는 기본 별명과 같다 — 화면과 들어간 뒤 별명이 어긋나지 않는다", () => {
  const expected = [["🐰", "솔이", "토끼"], ["🐻", "보리", "곰"], ["🦊", "루루", "여우"], ["🐯", "호두", "호랑이"], ["🐼", "모모", "판다"],
    ["🐶", "두부", "강아지"], ["🐱", "나비", "고양이"], ["🐨", "코코", "코알라"], ["🦁", "해솔", "사자"], ["🐸", "초롱", "개구리"]];
  assert.deepEqual(ANIMAL_CHARACTERS.map((c) => [c.emoji, c.name, c.species]), expected);
  for (const character of ANIMAL_CHARACTERS) {
    assert.equal(character.name, NICKNAME_IDEAS[character.emoji][0], `${character.species}의 이름은 첫 별명 후보여야 함`);
    // 그림은 파일만 덮어쓰면 바뀐다 — 경로 규칙이 흔들리면 코덱스 그림을 넣어도 반영되지 않는다.
    assert.equal(character.image, `/entry-green/animals/${character.slug}.webp`);
  }
});

test("시작 버튼 조사는 받침에 따라 와/과", () => {
  assert.equal(withGwaWa("솔이"), "솔이와");
  assert.equal(withGwaWa("보리"), "보리와");
  assert.equal(withGwaWa("해솔"), "해솔과");
  assert.equal(withGwaWa("초롱"), "초롱과");
  assert.equal(withGwaWa("Momo"), "Momo와");
});

test("모든 친구 그림 파일이 제자리에 있다", async () => {
  for (const character of ANIMAL_CHARACTERS) {
    const file = await readFile(new URL(`../public${character.image}`, import.meta.url));
    assert.ok(file.length > 1000, `${character.image} 비어 있음`);
  }
});

test("친구 고르기 화면: 첫 입장 코드를 붙잡아 친구를 고른 뒤 제출한다", async () => {
  const join = await readFile(new URL("../app/components/JoinClient.tsx", import.meta.url), "utf8");
  // 반 확인이 다시 돌며 codeInput을 비워도 막히지 않도록, 첫 입장이 확인된 코드를 따로 붙잡는다.
  assert.match(join, /if \(data\.firstTime\) \{ claimCode\.current = code;/);
  assert.match(join, /void submit\(animal, claimCode\.current \|\| codeInput\)/);
  // 개발 모드 이중 실행에서 받아 둔 조각 코드를 null로 덮어쓰지 않는다.
  assert.match(join, /if \(fromHash\) pendingEntryCode\.current = fromHash;/);
  assert.match(join, /나랑 닮은 친구를 골라요/);
  assert.match(join, /withGwaWa\(chosen\.name\)\} 시작하기/);
  assert.match(join, /참여 코드 다시 누르기/);
});
