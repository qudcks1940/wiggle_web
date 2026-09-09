# 아크 팀 ↔ 책 팀 계약 (Story 3.4)

> 마지막 갱신: 2026-08-31
> 이 문서는 이야기 아크(수업·회차)를 만드는 아크 팀과, 동화책(책·쪽·편집기·넘겨보기)을
> 만드는 책 팀 사이의 데이터 계약이다. 정본 근거:
> `docs/bmad/planning-artifacts/architecture/architecture-wiggle-web-2026-08-30/ARCHITECTURE-SPINE.md`
> 의 AD-6·AD-10·AD-11.

## 계약의 전부 — 네 컬럼

아크 팀이 제공하는 것은 `artworks` 테이블의 다음 네 컬럼**뿐**이다.
아크 팀이 **쓰고**, 책 팀은 **읽기만** 한다.

| 컬럼 | 의미 | 보장 |
|---|---|---|
| `artworks.arc_id` | 이 그림이 속한 아크 (`lib/arc-content.ts`의 `arcId`) | 작품 **생성 시점에 고정**. 이후 어떤 쓰기도 바꾸지 않는다 |
| `artworks.episode_id` | 아크 안의 회차 (**순서 index가 아니라 안정 id**) | 생성 시점에 고정. 아크 버전이 올라도 같은 회차는 같은 id |
| `artworks.arc_version` | 생성 당시의 아크 콘텐츠 버전 | 회차 상수(`lib/arc-content.ts`)를 읽을 때는 **언제나 이 버전 기준**으로 읽는다 |
| `artworks.final_image_key` | 완성 PNG의 R2 키 | 완성 시 설정. **아크 팀은 이 키가 가리키는 객체를 지우지 않는다** (아래 참조) |

레거시 행(아크 도입 전 작품)은 세 아크 컬럼이 `NULL`이다.

## 유일성 보장

**`(student_id, arc_id, episode_id)`에 완성(`status = 'complete'`) 작품은 최대 하나다.**

- DB 부분 유니크 인덱스 `artworks_completed_episode_unique`로 강제된다
  (`WHERE status = 'complete' AND arc_id IS NOT NULL AND episode_id IS NOT NULL`).
- 따라서 책 팀은 "이 회차의 그림"을 조회할 때 **어느 그림을 쓸지 판단할 필요가 없다** —
  완성작을 그 세 컬럼으로 조회하면 0개 아니면 1개다.
- ⚠️ 레거시 `NULL` 행은 인덱스 대상 밖이다. **`IFNULL(arc_id, '')` 같은 정규화를 쓰지 마라** —
  모든 레거시 완성작이 한 슬롯에서 충돌하게 된다.

## 하지 않는 것 (양쪽 다)

- **귀속을 시각·순서로 추론하는 조회 금지.** `latest by updated_at` 류로 "이 회차의 그림"을
  찾지 않는다 — 귀속의 정본은 위 컬럼뿐이다.
- **회차 순서는 아크 상수가 정본이다.** 책 팀이 회차 순서를 재정의하지 않는다.
  순서·제목·장면 문장은 `lib/arc-content.ts`에서 `arc_version` 기준으로 읽는다.
- 아크 팀은 책·쪽 테이블을 만들지도 읽지도 않으며, `storybooks`·`storybook_assets`를
  건드리지 않는다.

## ⚠️ 가장 위험한 지점 — 완성 이미지 키 삭제

**아크 팀이 저장 경로에서 옛 `final_image_key` 객체를 지우면 책 팀의 쪽이 영구 백지가 된다.**

`storybook_assets.object_key`(그리고 책 팀이 만들 유사 참조)는 채택 당시 키의 **스냅샷**이다.
재완성으로 키가 바뀐 뒤 옛 객체를 지우면 그 스냅샷이 유령 참조가 된다.
이 사고는 **두 팀이 각자 테스트하면 절대 잡히지 않는다** — 아크 팀 테스트에는 책이 없고,
책 팀 테스트에는 키를 지우는 코드가 없다.

- 2026-08-31 기준 `PUT /api/artworks/[id]`는 옛 썸네일만 정리하고
  **옛 완성 키는 지우지 않는다.** 이 성질을 되돌리는 변경은 두 팀 합의 없이 금지.
- 옛 완성 키의 회수는 참조 여부를 아는 정리 작업(미구현, 별도 과제)의 몫이다.
- 완성 이미지 접근은 기존 `GET /api/artworks/[id]/image?variant=final` 프록시를 쓴다 —
  R2 키로 공개 URL을 만들지 않는다.

## 빈 쪽에 관한 한 가지 원칙 (팀이 달라도 적용)

빠진 회차(그 회차의 완성작이 없는 학생)는 **부재이지 실패가 아니다**.
책 팀이 빈 쪽을 어떻게 저장·표현하든, `completedCount`·`missingCount`·`progressRate` 류의
집계 필드를 학생·교사 응답에 새로 만들지 않는다(AD-15). 서버는 정렬 키를 주지 않는다.
