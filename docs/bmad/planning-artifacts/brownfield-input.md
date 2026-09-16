# Wiggle Web 브라운필드 기획 입력 (BMAD PRD 시작점)

> 작성: 2026-08-30
> 목적: BMAD 기획 워크플로(`/bmad-prd` → `/bmad-ux` → `/bmad-architecture` → `/bmad-create-epics-and-stories`)가
> 백지에서 시작하지 않고, 이미 운영 중인 제품의 사실을 입력으로 받도록 한다.

## 1. 이 프로젝트는 그린필드가 아니다

`https://wiggleweb.vercel.app`에서 운영 중이며 실제 학급 E2E(학생 입장 → 작품 생성 →
3.4MB 업로드 → R2 회수 전수 일치)까지 통과한 제품이다. 기획을 "다시 정한다"의 의미는
**방향을 뒤엎는 것이 아니라, 흩어진 결정 목록을 왜/무엇을/어떤 순서로가 있는 PRD로 세우는 것**이다.

## 2. 읽어야 할 원본 (요약 말고 원문을 읽을 것)

| 파일 | 성격 | PRD에서의 역할 |
|---|---|---|
| `docs/product-decisions.md` | 사용자가 확정한 결정만 기록 | **제약. 재논의 금지 항목** |
| `docs/pending-decisions.md` | 아직 사용자 선택이 필요한 항목 | **PRD가 답해야 할 열린 질문** |
| `docs/current-state.md` | 구현·검증·배포 실제 상태 | 현재 스코프의 기준선 |
| `docs/ux-market-audit-2026-07.md` | 시장·UX 감사 | 문제 정의·경쟁 맥락 |
| `docs/architecture-mvp1.md` | 아키텍처(얇음, 49줄) | `/bmad-architecture`가 보강할 대상 |
| `docs/security-data-model.md` | 익명 학생 ID·데이터 모델 | 비기능 요구의 근거 |
| `docs/editor-roadmap.md` | 편집기 로드맵 | 에픽 후보 |
| `CLAUDE.md` | 제품 불변 원칙·개발 절차 | **협상 불가 원칙** |

## 3. 협상 불가 제약 (PRD가 위반하면 안 되는 것)

`CLAUDE.md`의 "제품 불변 원칙"이 정본이며 요지는 다음과 같다.

- 수업 코드·학급 QR은 입장 수단일 뿐 학생 작품 접근 권한이 아니다.
- 작품·과정 기록은 서버 발급 익명 학생 ID에 저장한다.
- 학생 이메일·실명·학교명·점수·순위·재능 진단을 만들지 않는다.
- AI 그리미는 그림을 대신 완성하거나 평가하지 않고, 아이가 호출했을 때만 개입한다.
- 점선·시범은 아이 원본 그림과 분리된 레이어이며 저장 이미지에 합성하지 않는다.
- 핵심 사용자는 초등 3학년 이상이며, 핵심 행동은 그림·음성·큰 터치 목표로도 이해돼야 한다.

## 4. PRD가 실제로 답해야 할 열린 질문

`docs/pending-decisions.md`에 원문이 있다. 최소한 다음은 PRD에서 결론이 나야 한다.

- P-001 학급 안에서 교사가 학생을 실제로 구분하는 운영 방식
- P-003 교사 확인 화면 이후의 운영 범위

## 5. 워크플로 진행 시 규칙

- 확정 결정(`docs/product-decisions.md`)과 충돌하는 요구사항을 제안하면 **먼저 사용자에게 충돌 사실을 알리고 확인받는다.**
- PRD에서 새로 확정된 결정은 같은 작업에서 `docs/product-decisions.md`에 반영한다.
- 해소된 미결정 항목은 `docs/pending-decisions.md`에서 제거한다.
- 문서 출력 언어는 한국어다(`_bmad/config.toml`의 `document_output_language = "Korean"`).
