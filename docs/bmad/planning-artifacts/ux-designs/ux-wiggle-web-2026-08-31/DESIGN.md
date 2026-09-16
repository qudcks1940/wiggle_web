---
name: Wiggle Web
type: design-spine
status: final
created: 2026-08-31
updated: 2026-08-31
description: 위글(Wiggle Web) "햇살 초록" 디자인 시스템 — 흰 도화지가 언제나 주인공인, 성별 중립 초록·노랑 시스템 (ref-04-sunshine.png 추출, design-system-3.html 채택본의 성문화)
colors:
  page-ground: '#F2F5EE'
  paper: '#FFFFFF'
  green-field: '#3C772E'
  field-shade: '#2E5F23'
  pale-field: '#E4EFDC'
  action-yellow: '#F6C84B'
  action-yellow-press: '#E0AF2E'
  ink: '#16220F'
  ink-muted: '#5A6B52'
  ink-on-field: '#FFFFFF'
  on-field-secondary: '#DFF5C4'
  border: '#D8DFD1'
  border-strong: '#B6C2AC'
  undrawn-fill: '#EDEFE9'
  undrawn-dash: '#8FA383'
  doodle-lime: '#9FDC5C'
  doodle-lime-on-field: '#C9F58E'
  doodle-yellow: '#F6C84B'
  doodle-pink: '#F3B3C4'
  doodle-violet: '#C0AEE0'
  teacher-anchor: '#2E5F23'
  teacher-surface: '#FFFFFF'
  teacher-rule: '#E4E7E0'
typography:
  font-stack:
    fontFamily: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif'
  display:
    fontSize: 44px
    fontWeight: '900'
    letterSpacing: '-0.03em'
    lineHeight: '1.14'
  h1:
    fontSize: 30px
    fontWeight: '800'
    letterSpacing: '-0.02em'
    lineHeight: '1.22'
  h2:
    fontSize: 21px
    fontWeight: '800'
    letterSpacing: '-0.015em'
    lineHeight: '1.3'
  body-l:
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body:
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.65'
  small:
    fontSize: 13.5px
    fontWeight: '500'
    lineHeight: '1.5'
  label:
    fontSize: 12px
    fontWeight: '800'
    letterSpacing: '0.06em'
rounded:
  xs: 6px
  sm: 10px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 44px
  '9': 56px
  gutter: 20px
  wrap-max: 1180px
  wrap-side: 32px
  section-gap: 56px
  doodle-clearance: 40px
  touch-min: 44px
  touch-primary: 56px
  touch-hero: 68px
components:
  button-primary:
    background: '{colors.action-yellow}'
    text: '{colors.ink}'
    radius: '{rounded.full}'
    min-height: '{spacing.touch-primary}'
    hero-height: '{spacing.touch-hero}'
    shadow: '0 3px 0 {colors.action-yellow-press}'
    pressed: 'translateY(2px), 그림자 0 1px 0 {colors.action-yellow-press}'
    font: '800 19px {typography.font-stack.fontFamily}'
  button-teacher:
    background: '{colors.teacher-anchor}'
    text: '#FFFFFF'
    radius: '{rounded.sm}'
    min-height: 46px
    shadow: 'none'
    font: '700 15px {typography.font-stack.fontFamily}'
  episode-card:
    surface: '{colors.paper}'
    border: '1px solid {colors.border}'
    radius: '{rounded.xl}'
    shadow: '0 6px 0 rgba(22,34,15,0.06)'
    badge-background: '{colors.green-field}'
    badge-text: '{colors.ink-on-field}'
    badge-radius: '{rounded.full}'
  storybook-page-strip:
    ground: '{colors.page-ground}'
    sheet-surface: '{colors.paper}'
    sheet-border: '1px solid {colors.border-strong}'
    sheet-radius: '{rounded.sm}'
    sheet-shadow: '0 3px 0 rgba(22,34,15,0.08)'
    sheet-size: '132px × 96px'
    undrawn-fill: '{colors.undrawn-fill}'
    undrawn-border: '2px dashed {colors.undrawn-dash}'
    undrawn-shadow: 'none'
  drawing-shell:
    field: '{colors.green-field}'
    field-radius: '{rounded.lg}'
    paper: '{colors.paper}'
    paper-radius: '{rounded.sm}'
    paper-shadow: '0 10px 0 rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)'
    title-text: '{colors.ink-on-field}'
    subtitle-text: '{colors.on-field-secondary}'
    tool-size: 52px
    tool-background: 'rgba(255,255,255,0.14)'
    tool-border: '1.5px solid rgba(255,255,255,0.34)'
    tool-selected: '흰 배경 + {colors.action-yellow} 3px 외곽 링 + "선택" 텍스트 라벨'
  grimi-bubble:
    surface: '{colors.paper}'
    border: '2px solid {colors.ink}'
    radius: '{rounded.lg}'
    shadow: '0 4px 0 rgba(22,34,15,0.10)'
    say-font: '700 19px {typography.font-stack.fontFamily}'
    chip-min-height: 48px
    chip-border: '2px solid {colors.ink}'
    chip-radius: '{rounded.full}'
    chip-selected: '{colors.action-yellow} 채움 + 안쪽 2px 흰 링 + 체크 아이콘'
    character-slot: '112px × 132px'
  doodle:
    stroke: '3px~4px, 둥근 끝, 단색'
    palette: '{colors.doodle-lime} · {colors.doodle-yellow} · {colors.doodle-pink} · {colors.doodle-violet}'
    lime-on-field: '{colors.doodle-lime-on-field}'
    max-per-screen: 3
    clearance-from-artwork: '{spacing.doodle-clearance}'
---

## Brand & Style

위글의 시각 언어는 **"햇살 초록"** — 흰 바탕과 진한 잎초록 색면이 교대하고, 노랑 하나가 행동을 가리키고, 손그림 낙서와 찢어진 종이 가장자리가 온기를 만드는 시스템이다. `imports/ref-04-sunshine.png`에서 색·형태·리듬을 실측 추출했고, 채택본은 `mockups/design-system.html`이다.

이 시스템이 지키는 자세:

- **도화지가 주인공이다.** 아이가 그린 흰 도화지({colors.paper})가 모든 화면의 유일한 히어로다. UI는 종이처럼 납작하고 조용해서, 진짜 그림만이 화면의 "질감"이 된다.
- **성별 중립.** 남아·여아가 함께 쓴다. 파랑을 1차 색으로 쓰지 않고(이전 시스템 #1AB8E8의 폐기 사유), 분홍은 낙서 네 색 중 하나일 뿐이다. 초록+노랑은 어느 성별로도 코드화되지 않는 조합이라 이 시스템의 중심이다.
- **사진 없음, 일러스트만.** ref-04는 아동 사진을 많이 쓰지만 위글은 절대 쓰지 않는다. 사진이 있던 자리는 전부 AI 생성 캐릭터·일러스트·아이 그림이 대신한다. 학생 실명·사진을 만들지 않는 제품 원칙과 직결된다.
- **아이 우선, 교사는 어른 말투.** 아이 화면이 시스템의 기본형이고, 교사 화면은 같은 팔레트에서 채도를 뺀 "어른 레지스터"다(Components 참고). 두 화면을 나란히 두면 즉시 다른 대상용으로 읽혀야 한다.
- **활기는 캐릭터에서 온다.** ref-03(Study.Pilot)에서 가져온 것은 캐릭터가 화면을 채우는 에너지이지 진한 파랑 배경이 아니다. 그리미 캐릭터 아트가 들어오기 전까지 이 시스템의 최종 온도는 판정할 수 없다(알려진 공백).
- 점수·순위·진도율·재능 진단을 표현하는 시각 요소는 이 시스템에 존재하지 않는다. 별 낙서조차 "완료 표시"이지 점수가 아니다.

이 문서는 **모습(look)의 정본**이다. 상호작용 패턴(도구 동작, 저장 흐름, 그리미 대화 순서 등)은 ref-04에 존재하지 않아 전부 추론이며, 그 정본화는 EXPERIENCE.md가 맡는다.

## Colors

대비비는 WCAG 상대휘도 기준으로 계산했다(본문 4.5:1, 큰 텍스트 3:1). 실기기 실측은 아직 없다.

- **지면 {colors.page-ground}** — 앱 셸 배경. 흰색보다 아주 살짝 초록 기운. 존재 이유는 단 하나, 도화지의 흰색을 살리는 최소한의 차이다. 잉크 대비 15.02:1. *아닌 것:* 페이지 바탕을 순흰색({colors.paper})으로 두는 것 — 그러면 도화지 경계가 사라진다.
- **도화지/카드 {colors.paper}** — 아이 그림 표면과 카드 표면. **이 흰색은 오직 "내용"에만 쓴다.** 잉크 대비 16.54:1.
- **초록 필드 {colors.green-field}** — ref-04 실측 추출값. 도화지를 액자처럼 감싸는 색면이자 그리기 화면의 바탕. 흰 글자 5.43:1. *아닌 것:* 장식 — 이 색의 역할은 여백을 지워 도화지를 세우는 것이다. 작은 흰 썸네일 목록의 바탕(액자 규칙 참고).
- **필드 그늘/교사 앵커 {colors.field-shade}** — 초록 필드의 어두운 단, 그리고 교사 화면에서 채도를 가진 **유일한** 색({colors.teacher-anchor}, 같은 값). 흰 배경 위 7.56:1.
- **연한 필드 {colors.pale-field}** — 교사 배지, 저에너지 구획. 초록의 조용한 버전. 잉크 13.92:1.
- **행동 노랑 {colors.action-yellow}** — 1차 행동 전용. 화면당 노랑 버튼은 **하나**. 노랑 위 글자는 항상 잉크({colors.ink}, 10.46:1). **흰 글자 절대 금지 — 1.6:1로 읽히지 않는다.** 눌림은 {colors.action-yellow-press}. *아닌 것:* 경고·강조 배경.
- **잉크 {colors.ink}** — 제목·본문. 순검정 대신 초록 기운 도는 먹색이라 초록 필드와 한 가족으로 읽힌다.
- **흐린 잉크 {colors.ink-muted}** — 캡션·보조 설명. 흰 배경 5.74:1. 14px 미만에서 쓰지 않는다.
- **필드 위 글자 {colors.ink-on-field} / {colors.on-field-secondary}** — 초록 필드 위 1·2위계 텍스트. 라임 화이트({colors.on-field-secondary})는 필드 위 4.65:1.
- **경계선 {colors.border} / 강조 {colors.border-strong}** — 카드·구획선, 도화지 테두리. 비텍스트 대비 3:1 미만이므로 **정보 전달에 쓰지 않는다.**
- **아직 안 그린 쪽 {colors.undrawn-fill} + {colors.undrawn-dash} 점선** — 빠진 회차. **경고가 아니라 중립적 부재다.** 그냥 비어 있는 종이. *아닌 것:* 빨강·주황·느낌표·독촉의 색. 잉크 대비 14.27:1.
- **낙서 네 색 {colors.doodle-lime} · {colors.doodle-yellow} · {colors.doodle-pink} · {colors.doodle-violet}** — 라임/노랑/분홍/연보라. **장식 전용 — 글자·상태·의미에 쓰지 않는다.** 초록 필드 위에서는 라임을 {colors.doodle-lime-on-field}로 올린다. 분홍은 단독으로 면을 채우지 않는다.
- **교사 표면 {colors.teacher-surface} / 교사 괘선 {colors.teacher-rule}** — 교사 화면의 흰 표면과 중립 괘선. 채도 있는 색은 {colors.teacher-anchor} 하나뿐이다.

**의미론 금지 규칙:** 이 시스템에 빨강/초록 판정 의미론이 없다. 초록은 "정답·완료"가 아니라 장소(필드)이고, 어떤 색도 "틀림·경고·미제출"을 뜻하지 않는다.

**알려진 위험(크레용 충돌):** 아이 크레용 팔레트에 UI와 같은 초록·노랑이 들어 있어, 아이가 화면 가득 초록을 칠하면 도화지와 필드가 섞일 수 있다. 현재는 도화지의 짙은 오프셋 그림자로 버티지만, 확실한 해법은 크레용 색을 UI 색에서 완전히 분리하는 것이며 아직 미해결이다.

## Typography

전 역할이 하나의 한국어 우선 시스템 폰트 스택({typography.font-stack.fontFamily})을 쓴다. 웹폰트는 싣지 않는다(공용 태블릿 첫 로딩 비용 — 미결정 사항으로 보류).

**대문자 없는 강세.** ref-04의 강세는 전부 UPPERCASE지만 한국어에는 대문자가 없다. 같은 무게감을 **굵기(800~900) + 큰 크기 + 좁은 자간(-0.015~-0.03em) + 좁은 행간(1.14~1.3)** 의 조합으로 만든다. 영문 대문자를 억지로 섞지 않는다.

램프:

- **디스플레이** {typography.display.fontSize} / {typography.display.fontWeight} / {typography.display.letterSpacing} — 화면당 최대 1회.
- **헤딩1** {typography.h1.fontSize} / {typography.h1.fontWeight}, **헤딩2** {typography.h2.fontSize} / {typography.h2.fontWeight}.
- **본문L** {typography.body-l.fontSize} / {typography.body-l.fontWeight} — 아이 화면의 기본 본문. **아이 화면에서 본문은 18px 아래로 내려가지 않는다.**
- **본문** {typography.body.fontSize} / {typography.body.fontWeight} — 교사 화면 기본 본문.
- **스몰** {typography.small.fontSize} — 교사 화면 보조 정보 전용. 아이 화면에서는 캡션에만 제한적으로.
- **라벨** {typography.label.fontSize} / 자간 {typography.label.letterSpacing} — 구획 태그.

**Windows 굵기 강등 전략(필수 인지).** Pretendard가 없는 환경에서 iPadOS는 Apple SD Gothic Neo(굵기 다양)로, Windows는 맑은 고딕(Regular/Bold 2단계뿐)으로 떨어진다. **맑은 고딕에는 900이 없어 900·800이 모두 700으로 보인다.** 따라서 위계를 굵기에만 걸지 않고 항상 크기·자간·행간에 이중으로 건다 — 900이 700으로 강등돼도 디스플레이(44px, -0.03em)와 헤딩1(30px)의 위계는 크기 차이만으로 성립해야 한다. ref-04의 육중한 헤딩 질감이 그 환경에서 재현되지 않는 것은 수용된 한계다.

## Layout & Spacing

간격 스케일은 4px 배수({spacing.1}~{spacing.9})다. 콘텐츠 최대폭 {spacing.wrap-max}, 좌우 여백 {spacing.wrap-side}, 큰 구획 사이 {spacing.section-gap}, 카드·요소 사이 기본 {spacing.gutter}. 아이 화면은 공용 태블릿 가로 화면이 기준이며, 최소 검증 뷰포트는 320×568 / 390×844 / 844×390이다(실측은 아직 없음 — 알려진 공백).

터치 목표: 모든 인터랙티브 요소 **최소 {spacing.touch-min} × {spacing.touch-min}**, 아이 화면 일반 행동 {spacing.touch-primary}, 1차 행동 {spacing.touch-hero}.

### 액자(額子) 규칙 — 도화지를 세우는 법

이 시스템의 구조적 핵심. 아이 그림도 흰 종이이고 페이지도 밝기 때문에, 흰 바탕 위에서는 도화지의 네 변이 사라져 그림이 "페이지에 흩어진 요소"로 읽힌다. 채택본의 A/B 나란히 비교(B3)로 실증된 해법:

1. **단일 도화지(그리기 화면):** 도화지 한 장은 {colors.green-field} 필드 위에 올려 액자처럼 세운다. 필드의 역할은 장식이 아니라 **여백을 지우는 것**이므로, 필드 위에는 낙서를 넣지 않는다.
2. **흰 썸네일 목록(동화책 쪽 띠):** 작은 흰 썸네일 여러 개를 초록 필드 위에 늘어놓으면 색종이처럼 흩어져 소란스러워진다(색종이 실패). **목록은 절대 초록 필드 위에 두지 않는다.** 대신 {colors.page-ground} 지면 위에 1px {colors.border-strong} 테두리 + 단단한 오프셋 그림자로 각 장을 분리한다.

즉 **액자 전략은 단일 그림 전용**이고, 목록에는 지면+그림자 규칙이 적용된다. 이 둘을 섞지 않는다.

## Elevation & Depth

UI 표면은 전부 **종이처럼 납작하다**. 부드러운 블러 그림자는 쓰지 않는다 — 진짜 그림이 유일한 질감이어야 하기 때문이다. 세 단계뿐이다:

- **평면(기본):** 그림자 없음, 1px {colors.border} 선만. **교사 화면은 전부 이 단계다.**
- **종이 그림자:** `0 3~6px 0`의 **블러 없는 불투명 오프셋**(rgba(22,34,15,0.06~0.10)). 아이 화면 카드·썸네일. 그리기 화면 도화지는 필드 위에서 `0 10px 0 rgba(0,0,0,0.14)`로 가장 두껍다.
- **버튼 두께:** {components.button-primary.shadow}. 누르면 2px 내려가고 그림자가 1px로 줄어든다 — 저학년에게 "눌렸다"를 촉각적으로 전한다.

## Shapes

모서리 반경은 여섯 단계({rounded.xs} · {rounded.sm} · {rounded.md} · {rounded.lg} · {rounded.xl} · {rounded.full})이며 대상별로 고정된다:

- **{rounded.xs}·{rounded.sm} = 교사 화면.** 각지고 정보 밀도가 높은 어른의 형태.
- **{rounded.md}~{rounded.xl} = 아이 화면** 카드·구획.
- **{rounded.full} = 모든 버튼·칩·배지** (교사 버튼만 예외로 {rounded.sm}).
- **도화지는 아이 화면에서도 {rounded.sm} 고정** — 종이는 둥글지 않다.

**종이 회전:** 장식 카드·빈 썸네일에만 ±1.5°~2.5°. ref-04는 5°까지 기울이지만 위글에서 **아이 그림이 들어가는 면은 절대 기울이지 않는다(0°).**

**찢어진 종이 가장자리(인라인 SVG):** {colors.green-field} → 흰 면 전환에만 쓴다. 한 화면 최대 2회. **아이 그림 위나 도화지 가장자리에는 절대 쓰지 않는다** — 그림이 찢긴 것처럼 보인다.

## Components

### button-primary — 노랑 알약 버튼
{components.button-primary.background} 채움 + {components.button-primary.text} 글자(흰 글자 금지), {rounded.full} 알약형, 최소 높이 {spacing.touch-primary}(1차 행동은 {spacing.touch-hero}), 두께 그림자 {components.button-primary.shadow}. 화면당 하나. 보조 행동은 투명 배경 + 2px {colors.border-strong} 테두리의 고스트 버튼.

### button-teacher — 교사 버튼
{colors.teacher-anchor} 채움 + 흰 글자, {rounded.sm} 각진 형태, 높이 46px, 그림자 없음. 아이 버튼과 나란히 두면 즉시 어른용으로 읽혀야 한다.

### episode-card — 오늘 회차 카드

장면 삽화(`sceneImage`)가 카드 상단을 차지한다 — 비문해 아이의 1차 채널. 삽화 배경은 {colors.pale-field}, 액자 없이 카드에 밀착.
{colors.paper} 표면, {rounded.xl}, 1px {colors.border}, 그림자 {components.episode-card.shadow}. 회차 배지는 {colors.green-field} 알약 + 흰 글자. 아크명은 {colors.ink-muted} 보조 텍스트. 낙서는 카드 **밖** 배경에만.

### storybook-page-strip — 동화책 쪽 띠
{colors.page-ground} 지면 위 가로 스크롤 띠(액자 규칙 2항). 각 장: {components.storybook-page-strip.sheet-size}, {colors.paper} 표면, 1px {colors.border-strong}, {rounded.sm}, 그림자 {components.storybook-page-strip.sheet-shadow}. **아직 안 그린 쪽:** 같은 크기·같은 자리에서 {colors.undrawn-fill} 채움 + 2px {colors.undrawn-dash} 점선, 그림자 없음. 구분은 색만으로 하지 않는다 — 점선 테두리 + "아직 안 그린 쪽" 문구 + 플러스 아이콘, 세 겹. 근처에 낙서를 놓지 않는다(놀림처럼 읽힌다).

### drawing-shell — 그리기 화면의 액자
{colors.green-field} 필드({rounded.lg}) 위에 도화지 {colors.paper}({rounded.sm}) 한 장을 {components.drawing-shell.paper-shadow}로 올린다(액자 규칙 1항). 제목은 {colors.ink-on-field}, 장면 안내는 {colors.on-field-secondary}. 도구는 52px, 필드 안에 반투명(rgba(255,255,255,0.14))으로 눌러 앉혀 그림보다 뒤로 보낸다. **도구 선택 상태는 색만으로 표시하지 않는다** — 흰 배경 + {colors.action-yellow} 3px 링 + "선택" 텍스트, 세 겹. 그리미 호출 버튼은 노랑 알약 하나. 도화지 위·주변 {spacing.doodle-clearance} 이내 낙서 0개.

### grimi-bubble — 그리미 말풍선 (틀리는 해석자)
{colors.paper} 말풍선 + 2px {colors.ink} 외곽선 + {rounded.lg} + 꼬리, 그림자 {components.grimi-bubble.shadow}. 발화는 19px/700. 응답 칩은 최소 높이 48px 알약, 2px {colors.ink} 테두리. **선택된 칩은 색만으로 표시하지 않는다** — {colors.action-yellow} 채움 + 안쪽 흰 링 + 체크 아이콘. 캐릭터 슬롯은 {components.grimi-bubble.character-slot}, AI 생성 일러스트 전용(아이 사진은 어떤 경우에도 금지, 상업 이용 라이선스 확인 필요). 캐릭터는 회차가 바뀌어도 같은 캐릭터로 재현돼야 하며 최소 3표정(궁금한 얼굴·갸웃하는 얼굴·알겠다는 얼굴)이 필요하다 — **일관 재현은 최대 미해결 위험**이고, 완화책(정면 1종 + 말풍선으로 감정 표현)은 회피이지 시스템이 아니다.

### doodle — 낙서 어휘
다섯 개뿐, 늘리지 않는다: **물결**(라임 — "위글" 그 자체, 로고·구분·빈 여백), **별**(노랑 — 완료·저장 표시, 점수 아님), **무지개**(분홍·노랑·연보라 — 동화책 표지·회차 완결 화면에만), **반짝임**(그리미 반응 시, 최대 2개), **화살표**(라임 — 다음 행동 안내, 아이 화면 한정). 전부 선 3~4px, 둥근 끝, 단색, 인라인 SVG. 규칙: 초록 필드 위·빈 여백·카드 밖 배경·헤딩 옆 한 개만 가능. **금지: 도화지 위·주변 {spacing.doodle-clearance} 이내, 썸네일 위, 안 그린 쪽 근처, 교사 화면 전체.** 한 화면 최대 {components.doodle.max-per-screen}개 — 구현 시 배경 레이어 컴포넌트 하나로 묶어 개수를 하드 제한할 것(사람 규칙만으로는 지켜지지 않는다). 낙서가 아이 그림보다 진하거나 크면 지운다.

### 교사 레지스터 — 같은 가족, 다른 말투
교사 화면의 델타를 명시한다: 채도 있는 색은 {colors.teacher-anchor} **하나**(+연한 배지 {colors.pale-field})뿐이고, **낙서 0개**, 모서리 {rounded.xs}~{rounded.sm}, 본문 {typography.body.fontSize} 이하로 조밀한 행, 그림자 없음, 괘선은 {colors.teacher-rule}. **학급 그리드(학생 목록)에** 두지 않는 것: 진도 %, 제출 수, 순위, 정렬 버튼, 미제출 강조, 실명·이메일·학교명(동물 이모지 + 별명만, 입장 순 고정). 단 **학생 개인 상세의 기존 작품 수 표기는 유지 자산**(FR-31)이며 이 금지의 대상이 아니다.

> **상호작용은 여기 없다.** 도구 스트립의 동작, 저장·복구 흐름, 그리미 호출·응답 순서, 빈 상태 전이는 ref-04(랜딩 페이지)에 존재하지 않아 채택본에서도 전부 추론이었다. 이 문서는 모습만 정본화하며, 행동의 정본은 EXPERIENCE.md다.

### past-drawing-drawer (지난 그림 서랍)

그리기 화면 왼쪽 가장자리에서 미끄러져 나오는 참조 패널. 동작 정본은 EXPERIENCE.md.

- 닫힘: 도구 마대 옆 44×44 이상 버튼({colors.paper} 바탕, {colors.border-strong} 테두리, 책 넘김 아이콘).
- 열림: 화면 폭의 최대 40%(태블릿 가로) / 전폭 하단 시트(휴대전화 세로). 바탕 {colors.page-ground},
  지난 회차 그림은 {colors.paper} 액자로 1장씩, {rounded.md}, 오프셋 그림자 — 쪽 띠와 같은 문법.
- 열림 상태에서도 도화지는 가려진 부분 외 그대로 유지 — 오버레이 딤 없음(그림이 주인공).
- 서랍 안 그림에는 어떤 조작 어포던스도 두지 않는다(보기 전용) — 크레용 아이콘·편집 힌트 금지.

## Do's and Don'ts

| 해야 한다 | 하지 않는다 |
|---|---|
| 아이 그림(도화지)이 모든 화면의 주인공 — UI는 납작한 종이 | UI 장식이 아이 그림과 경쟁하거나 더 진하게 보이는 것 |
| 사람 표현은 일러스트·AI 생성 캐릭터만 | **아동 사진은 어떤 경우에도 사용 금지** |
| 초록+노랑 중심의 성별 중립 팔레트 | 파랑을 1차 색으로 쓰는 것, 분홍 단독 면 채움 — "남아 파랑/여아 분홍" 표류 금지 |
| 노랑 버튼 글자는 항상 {colors.ink} | 노랑 위 흰 글자(1.6:1 — 읽히지 않는다) |
| 안 그린 쪽은 중립 회색-초록 점선의 빈 종이 | 빨강·주황·느낌표 등 경고·독촉 의미론, 빨강/초록 판정 의미론 일체 |
| 선택·상태는 항상 세 겹(형태+아이콘+문구)으로 표시 | 색만으로 선택·상태를 구분하는 것 |
| 모든 터치 목표 ≥ {spacing.touch-min} × {spacing.touch-min}, 1차 행동 {spacing.touch-hero} | 44px 미만의 터치 목표 |
| 단일 도화지는 {colors.green-field} 액자 위에, 흰 썸네일 목록은 {colors.page-ground} 지면 위에 | 흰 썸네일 목록을 초록 필드 위에 늘어놓는 것(색종이 실패) |
| 블러 없는 단단한 오프셋 그림자 | 부드러운 블러 그림자, 그라데이션 |
| 위계는 굵기+크기+자간에 이중으로 | 900 굵기 하나에만 위계를 거는 것(맑은 고딕에서 무너짐) |
| 낙서는 장식 전용, 화면당 최대 3개, 도화지에서 {spacing.doodle-clearance} 이상 이격 | 그리기 화면 캔버스 주변·아이와 캔버스 사이에 낙서를 두는 것, 교사 화면의 낙서 |
| **크레용 충돌 경계:** 캔버스 인접 영역에서 UI의 초록·노랑 면 사용을 최소화하고 도화지 그림자로 경계를 유지 | 아이 크레용의 초록·노랑과 비슷한 색 블록을 캔버스 바로 옆에 붙이는 것 |
| 찢어진 가장자리는 필드→흰 면 전환에만, 화면당 최대 2회 | 아이 그림·도화지 가장자리에 찢어진 경계를 대는 것 |
