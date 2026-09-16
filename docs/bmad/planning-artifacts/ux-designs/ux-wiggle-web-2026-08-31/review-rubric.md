# Spine Pair Review — Wiggle Web

검증일: 2026-08-31 · 대상: `DESIGN.md`(291줄) + `EXPERIENCE.md`(180줄) · 기준: design-md-spec.md, 예시 스파인 2종, epics.md(2.1/2.2/2.4/3.1/3.2), prd.md(UJ-1/2/3), .memlog.md(24항목)

## Overall verdict

**적합 — 조건부 통과.** 토큰 계층(참조 76건 전부 해석, 색 23종 전부 hex, 하중 조합 대비비 명기), 정본 분리(EXPERIENCE에 시각값 재기재 0건), 출처 인용(FR·AD·NFR·Story·캔버스 결정·학생UI 전수 해석)은 하류 소스 추출에 그대로 쓸 수 있는 수준이다. 그러나 **주요 2건** — ① 지난 그림 서랍의 시각 정본이 어디에도 없는데 종결 체크는 FR-6을 "닫힘"으로 선언(문서 내 모순), ② 재입장 실패(그림 비밀번호 불일치·중복 프로필) 상태 부재 — 는 story-dev가 도달하는 순간 스스로 발명해야 하는 구멍이다. 이 2건을 닫으면 계약으로 성립한다.

## 1. 흐름 커버리지 (EXPERIENCE.md)

**판정: 강함(strong)에 근접 — 경미 3건.**

여정 4개 모두 실명 주인공(지호·서연·박선생님·하늘이), 번호 매긴 단계, 굵게 표시한 클라이맥스를 갖췄다. UJ-1→Flow 1, UJ-2→Flow 2+4, Story 2.1/3.2→Flow 3, Story 2.2→Flow 1·2, Story 3.1→Flow 1의 4단계, Story 2.4의 수업 닫힘 홈→IA에 [ASSUMPTION]으로 정직하게 열어 둠. 실패 경로는 Flow 1(오프라인·409), Flow 2(음성 미출력), Flow 4(빈 쪽 경계)에 있다.

- **경미** UJ-3(동화책 완성 뒤 넘겨보기)의 흐름도, 미커버 처분 문장도 없다 (EXPERIENCE.md Key Flows·종결 체크 — FR-9만 "책 팀 소관"으로 처분하고 FR-24는 무언급). epics.md에서 FR-24가 "다른 팀"이므로 흐름 부재 자체는 옳으나, 스파인만 읽는 소비자는 누락인지 위임인지 알 수 없다. *Fix:* 종결 체크에 "UJ-3/FR-24 책 넘겨보기 — 책 팀 소관, 이 스파인이 닫지 않는다" 한 줄.
- **경미** Flow 3(교사)에만 실패 경로가 없다 — 다음 회차 열기 요청 실패(오프라인·400) 시 조종석이 무엇을 보여주는지 미정 (EXPERIENCE.md Flow 3). *Fix:* 실패 한 줄(요청 실패 시 이전 상태 유지 + 재시도).
- **경미** Flow 1의 클라이맥스(7~8단계, 틀리는 해석자 교정)가 보류 범위(FR-19~21) 위에 서 있다. IA의 완료 흐름 행에는 "(보류: FR-19~21)"이 있으나 흐름 본문에는 표기가 없어, 흐름만 읽는 소비자가 이번 범위로 오독할 수 있다 (EXPERIENCE.md Flow 1 vs IA). *Fix:* 흐름 6단계에 (보류 범위) 괄호 표기.

## 2. 토큰 완전성 (DESIGN.md)

**판정: 강함(strong).**

frontmatter 토큰 127개(colors 23 · typography 25 · rounded 6 · spacing 17 · components 56). 기계 검증 결과: **색 23종 전부 6자리 hex, `{path.to.token}` 참조 DESIGN 64종(총 169회) 전부 frontmatter에 해석, 미해석 0건.** 스펙의 타입 규칙(typography 하위 필드, rounded.full=9999px, spacing 스케일+명명 토큰) 준수. 대비비는 하중 조합 전부에 수치로 명기 — 노랑 위 잉크 10.46:1(흰 글자 1.6:1 금지 명문화), 필드 위 흰 글자 5.43:1, on-field-secondary 4.65:1, ink-muted 5.74:1 등 — 그리고 장식 전용(낙서)·비정보 전용(border) 예외를 명시적으로 선언했다.

- **경미** frontmatter 컴포넌트 값에 한국어 산문 혼입 — `button-primary.pressed`, `drawing-shell.tool-selected`, `grimi-bubble.chip-selected` (DESIGN.md:99·137·147). 값이자 규칙 문장이라 기계 추출기는 통째로 문자열로 삼킬 수밖에 없다. *Fix:* 산문 규칙은 본문 Components 절로 내리고 frontmatter에는 값만 남기거나, 현 상태를 수용하고 넘어가도 하류 피해는 작다.
- **경미** 눌린 상태 배경 `action-yellow-press` 위 잉크 대비 미기재 (DESIGN.md Colors). 계산상 통과가 유력하나 명기 원칙에서 이 조합만 빠졌다. *Fix:* 수치 한 개 추가.

## 3. 컴포넌트 커버리지 (양쪽)

**판정: 얇음(thin) — 주요 1건이 계약 구멍.**

교차 대조: DESIGN Components 8절(button-primary·button-teacher·episode-card·storybook-page-strip·drawing-shell·grimi-bubble·doodle·교사 레지스터) × EXPERIENCE Component Patterns 6행. 겹치는 4종(회차 카드·쪽 띠·그리미·조종석/타일의 레지스터 참조)은 시각·행동 양쪽 모두 실규칙이다. 이름 대응(한글 표시명 ↔ 토큰명)은 EXPERIENCE의 "시각 정본" 열로 기계 해석 가능하다.

- **주요** **지난 그림 서랍의 시각 정본이 어디에도 없다.** EXPERIENCE 행동 행은 "시각·애니메이션 사양은 DESIGN.md 소관(현재 미정)"이라 자인하는데(EXPERIENCE.md Component Patterns), DESIGN.md에는 서랍 컴포넌트가 frontmatter에도 본문에도 존재하지 않고, 그런데 종결 체크는 "FR-6 — **닫힘** — Story 3.1의 '시각적 구분' [UX 미정] 포함 종결"이라 선언한다(EXPERIENCE.md 종결 체크). 문서 내 모순이며, Story 3.1을 잡는 story-dev는 "오늘 그림과 시각적으로 구분된다"(epics.md:690)를 스스로 발명해야 한다. *Fix:* DESIGN Components에 `drawer` 절(패널 표면·구분 처리·열림 상태의 도화지 축소 규칙) 추가 후 종결 체크 유지 — 또는 종결 체크를 "절반 닫힘(행동만)"으로 정정.
- **보통** 수업 조종석의 시각 사양이 없다 — 교사 레지스터의 일반 델타와 button-teacher만 있고, "문장으로 읽는다"(Story 2.1 AC)를 배달할 조종석 해부(문장 영역·컨트롤 배열·현재 상태 표기)가 없다 (DESIGN.md Components vs EXPERIENCE.md Component Patterns). M-1이 재는 표면이라 하류 재량이 크면 위험하다. *Fix:* 교사 레지스터 절에 조종석 소절 3~4줄.
- **보통** 그리기 화면의 노랑 배분 미결 — "화면당 노랑 버튼 하나"(DESIGN.md:181·250)이고 "그리미 호출 버튼은 노랑 알약 하나"(DESIGN.md:262)인데, 같은 화면의 **완료 행동**의 시각은 어디에도 없다. 완료가 고스트인지, 완료가 노랑이고 그리미가 다른 형태인지 하류가 정해야 한다 (Flow 1의 5~6단계는 두 행동을 모두 사용). *Fix:* drawing-shell 절에 완료 행동의 형태 한 줄.
- **경미** 학생 타일은 전용 시각 행 없이 교사 레지스터 산문에 흡수("동물 이모지 + 별명만"), button-primary·doodle·drawing-shell의 행동 규칙은 Component Patterns 밖(Interaction Primitives·그리미 존재 규칙)에 분산. 실규칙이 존재하므로 결손은 아니나 표 단위 추출기는 놓친다. *Fix:* 선택 — 현행 유지 가능.

## 4. 상태 커버리지 (EXPERIENCE.md)

**판정: 적정(adequate) — 주요 1건.**

State Patterns 8행이 로딩·포인터 NULL·빈 상태·오프라인·409·오류·세션 만료(2시간 — `app/api/student/route.ts:11` 실코드와 일치)·그리미 실패를 덮고, 각 행이 문구 자세(결손·독촉 금지)까지 지정한다. 학생 홈 열림/닫힘, 서랍·보관함·쪽 띠 빈 상태, 그리기 화면의 저장 계열은 완비.

- **주요** **재입장 실패 상태가 없다** — 그림 비밀번호 3개 불일치, 동물+별명 중복 프로필 경고 (EXPERIENCE.md State Patterns·Key Flows 전체 부재). 재입장은 1급 흐름(UJ-1 1단계, FR-27/28)이고, 금지 어휘("틀렸어요" 개념 자체가 없다)가 이 화면의 실패 문구를 자명하지 않게 만들며, 기존 `app/components/JoinClient.tsx:149`에 중복 프로필 경고 실동작이 이미 있어 정본화 대상이 실재한다. *Fix:* State Patterns에 2행 — 비밀번호 불일치(잘못 아닌 어긋남 톤 + 다시 고르기 하나), 중복 프로필(이어가기/새로 만들기 분기).
- **경미** 교사 학급 목록의 빈 상태(첫 로그인, 학급 0개 → 생성 유도)가 없다 (EXPERIENCE.md State Patterns — 빈 상태 행의 표면 열거가 학생 표면뿐). *Fix:* 표면 열거에 학급 목록 추가.
- **경미** 대문의 수업 코드 오입력은 일반 "오류" 행이 덮는다고 볼 수 있으나 명시가 없다. *Fix:* 선택.

## 5. 시각 레퍼런스 커버리지

**판정: 적정(adequate).**

전수 목록 — `.working/`: color-themes-1.html(기각 1차), color-themes-2.html(기각 2차), **design-system-3.html(채택본)** · `imports/`: ref-01-learnify.png, ref-02-edulearn.png, ref-03-studypilot.png, ref-04-sunshine.png. 채택본은 DESIGN.md Brand & Style(159행)에서 경로로 인라인 링크되고, ref-04도 같은 곳에서 링크된다. **스파인 우선 조항은 EXPERIENCE.md 머리말(11행)에 정확히 1회** — "두 문서는 목업·와이어프레임·import보다 우선한다."

- **보통** EXPERIENCE.md가 채택 목업을 한 번도 링크하지 않는다 — 예시 스파인의 IA "→ Composition reference: … Spine wins on conflict" 패턴 부재. 행동 스파인만 든 소비자는 화면 구도의 실물을 찾을 수 없다. *Fix:* IA 하단에 `→ 구도 참조: .working/design-system-3.html (스파인 우선)` 한 줄.
- **경미** 고아 파일: color-themes-1/2.html(기각 이력 — memlog에만 기록), ref-01/ref-02.png(스파인 미참조 — 초기 탐색 유산). ref-03은 이름("ref-03(Study.Pilot)")만 언급되고 경로가 없다 (DESIGN.md:167). *Fix:* 기각작 2종은 고아로 수용 가능(이력 보존 목적이 memlog에 있음); ref-03에 경로 부여.
- **경미** memlog(26행)가 예고한 "Finalize에서 mockups/ 승격"이 미실행 — `mockups/` 디렉터리가 없다. status: draft와는 일관되나, 승격 전까지 `.working/` 링크가 정본 경로다. *Fix:* Finalize 시 링크 경로 갱신을 잊지 말 것.

## 6. 비대·과잉명세

**판정: 강함(strong).**

합계 471줄로 예시 대비 규모는 크지만 제품 복잡도(2사용자군·비문해 접근성·팀 경계) 대비 정당하다. 시각값의 EXPERIENCE 재기재 0건, 양 문서 간 중복 서술은 상호 위임 문장(서로 "저쪽이 정본" 지시)뿐. 수치는 발명이 아니라 실측이다 — 12초 폴링은 `app/components/StudentHome.tsx:51`(12_000ms), 2시간 세션은 `app/api/student/route.ts:11`과 일치. 낙서 어휘를 "다섯 개뿐, 늘리지 않는다"로 폐쇄한 것, 그리미 캐릭터 일관 재현을 "최대 미해결 위험"으로 자인한 것 모두 과잉이 아니라 계약 규율이다.

- **경미** DESIGN.md doodle 절의 "구현 시 배경 레이어 컴포넌트 하나로 묶어 개수를 하드 제한할 것"(268행)은 구현 지시로 아키텍처 월경이나, "사람 규칙만으로는 지켜지지 않는다"는 근거가 붙은 집행 장치라 용인. *Fix:* 불요.

## 7. 상속 규율

**판정: 적정(adequate).**

인용 전수 검증 — FR-2a/2b·FR-4~34·NFR-1/2/3/7(epics.md Requirements Inventory), AD-7/11/14/15/16/17(AD-16은 ARCHITECTURE-SPINE.md:216에 실재), Story 2.1/2.2/2.4/3.1/3.2/3.3, P-004(epics.md:225), M-1(prd.md:439), 캔버스 결정 1·2·5·6·7·8(product-decisions.md 「캔버스와 입력」 1~8항), 학생UI-3/6/7(product-decisions.md 「학생 UI」 3·6·7항), 「폐기된 결정 — 재설계 금지 조항」(product-decisions.md:187) — **전부 해석된다.** EXPERIENCE의 토큰 참조 12종(총 16회)도 전부 DESIGN frontmatter에 이름으로 해석. 컴포넌트 토큰명은 양 문서 전 절에서 동일.

- **보통** EXPERIENCE.md frontmatter에 `sources:` 목록이 없다 — 예시 스파인은 PRD 경로를 기계 가독으로 든다. 본문 인라인 인용은 촘촘하나 소스 추출기는 frontmatter만 읽을 수 있다. *Fix:* `sources:`에 prd.md·epics.md·product-decisions.md·ARCHITECTURE-SPINE.md 4줄.
- **경미** UJ 번호를 축자로 인용하지 않는다 — Flow 1=UJ-1, Flow 4=UJ-2 대응이 주인공 이름으로만 암시된다. *Fix:* 흐름 제목에 (UJ-1) 병기.

## 8. 형태 적합

**판정: 강함(strong).**

DESIGN.md는 정본 8절(Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts)을 순서대로 전부 갖췄고, Layout 하위의 「액자 규칙」은 하위 절이라 순서 규칙을 깨지 않는다. EXPERIENCE.md는 기본 절(Foundation·IA·Voice and Tone·Component Patterns·State Patterns·Interaction Primitives·Accessibility Floor·Key Flows) 완비, Inspiration & Anti-patterns 생략(허용 — 기각 이력은 memlog가 보존). 발명 절 2개는 자리값을 한다: 「그리미 존재 규칙」은 제품 불변 원칙(호출 시에만 개입)의 화면 정본으로 어느 기본 절에도 못 들어가는 하중 규칙이고, 「[UX 미정] 종결 체크」는 epics.md의 `[UX 미정]` 마커를 명시적으로 닫는 계약 대사표다 — 단 그 표의 FR-6 행이 3절의 주요 결함과 모순되므로, 표의 신뢰는 그 수정에 걸려 있다.

## Mechanical notes

- 토큰 기계 검증: frontmatter 127개(colors 23·typography 25·rounded 6·spacing 17·components 56), 색 23종 전부 `#RRGGBB`, 참조 해석 DESIGN 64종(169회)/EXPERIENCE 12종(16회) — **미해석 0건** (자체 파서로 검증).
- 실코드 대조: 12초 폴링 = `StudentHome.tsx:51`, 세션 2시간 = `app/api/student/route.ts:11`, 중복 프로필 경고 실동작 = `JoinClient.tsx:149`, 주사위 별명 = `JoinClient.tsx:216` — 스파인의 수치·사실 주장에 발명 없음.
- 인용 대조: AD-16 정의 위치 `architecture/architecture-wiggle-web-2026-08-30/ARCHITECTURE-SPINE.md:216`(epics.md Additional Requirements에는 AD-16이 없어 아키텍처 스파인까지 가야 해석된다 — sources: 부재가 아픈 이유).
- FR-24(책 넘겨보기)·FR-8/9(빈 쪽 저장·표현)·FR-10 계열(집에서 채우기)은 epics.md에서 각각 다른 팀·보류 — UJ-3 미커버는 범위상 옳고 처분 문장만 빠졌다.
- memlog 27·31행의 자기 보고(토큰 127개·참조 64건 전부 해석·여정 4개·[ASSUMPTION] 5곳)는 실측과 일치.

**심각도 합계: 주요 2 · 보통 4 · 경미 11.**
