# Wiggle 전시관 대문 에셋

준비일: 2026-09-06 · 기준 시안: `selected-reference.png`

사용자가 선택한 5번 전시관 시안을 사이트에서 조합할 수 있도록 만든 개별 에셋이다.
실제 대문 라우트는 아직 연결하지 않았다. 파일을 두 번 클릭해 `preview.html`을 열면
개별 파일과 액자 조합을 확인할 수 있다.

## 확인하고 반영한 문서

- `docs/product-decisions.md`: 그림책형 학생 화면, 학생 이메일·실명 없는 입장,
  AI는 대신 그리지 않는 보조 역할, 점수·순위·재능 진단·창의력 향상 약속 금지.
- `docs/current-state.md`: 기존 구현·반응형·44px 터치 목표와 에셋 준비 상태.
- `docs/design-assets/drawing-toolbar/README.md`: 공식 로고 재사용, 이미지와 UI의 분리,
  실제 alpha 확인, 작은 조작 아이콘은 일관된 선 굵기의 벡터 사용.
- `app/globals.css`: 하늘색 `#EBF8FF`, 그림책 남색 `#0A2553`, 파랑 `#087BB9`,
  보조 글자 `#496B89`, 테두리 `#C4DFED`, 노랑 `#FFD85A`, Pretendard 우선 글꼴.

별도 `design-system.md`는 현재 체크아웃에서 찾지 못했다. 위 문서와 CSS를 실제 기준으로 사용했다.
이전 메인의 교실 그림 고정 결정은 이번에 사용자가 선택한 오리 전시관 에셋 준비 범위에서 갱신했다.
프로필 생성·학생 홈·그리기 도구 화면의 기존 확정 시안은 이 작업의 변경 범위가 아니다.

## 제공 파일

런타임 경로는 모두 `/landing-gallery/`로 시작한다. 확장자 앞 숫자는 실제 이미지 너비이며,
모든 비율은 원본대로 유지한다. `manifest.json`에 크기·용량·SHA-256·srcSet·대체 텍스트가 있다.

| 에셋 | WebP 너비 | PNG | 권장 표시 크기 |
| --- | --- | --- | --- |
| `duck-painter` | 640, 1200 | 1200×1200, 투명 | 폭 240–560px |
| `artwork-rocket` | 480, 960 | 960×720 | 액자 안쪽 |
| `artwork-whale` | 480, 960 | 960×720 | 액자 안쪽 |
| `artwork-house` | 480, 960 | 960×720 | 액자 안쪽 |
| `leaves` | 160, 320 | 320×336, 투명 | 폭 64–100px |
| `paper-blue` | 1024 | 1024×1024 | 배경 `cover` |
| `frame-blue` | 480, 960 | 960×720, 투명 | 폭 300–440px |

웹에서는 WebP를 기본으로 사용한다. PNG는 편집 도구 및 PNG가 필요한 소비자용이다.
원본은 이 폴더의 `source/`에 있으며, 선택 시안 전체를 사이트 배경으로 사용하지 않는다.
장식 그림은 실제 학생 작품이 아닌 제품 소개용 생성 일러스트다.

## 조합 방법

`/landing-gallery/gallery-assets.css`는 `.wiggle-gallery-assets` 범위의 색상과
액자·오리·장식 클래스만 제공한다. 실제 앱에 자동으로 적용되지는 않는다.

```html
<div class="wiggle-gallery-assets">
  <figure class="gallery-frame">
    <div class="gallery-wire" aria-hidden="true"><i class="gallery-pin"></i></div>
    <img class="gallery-frame__rim" src="/landing-gallery/frame-blue-960.webp"
         width="960" height="720" alt="" aria-hidden="true">
    <img class="gallery-frame__art" src="/landing-gallery/artwork-rocket-480.webp"
         srcset="/landing-gallery/artwork-rocket-480.webp 480w, /landing-gallery/artwork-rocket-960.webp 960w"
         sizes="(max-width: 600px) 75vw, 320px" width="960" height="720"
         alt="크레용으로 그린 로켓과 우주 비행사">
  </figure>
</div>
```

액자 안쪽의 그림은 액자 **위에** 표시한다. 위치는 왼쪽 14.1%, 위 18%, 너비 71.7%, 높이 62%다.
`object-fit: contain`과 흰 바탕으로 원본 비율을 유지한다. 프레임 중앙의 부드러운 투명 경계 위로
그림을 놓아 그림 전체가 선명하게 보이도록 했다. 와이어와 압정은 CSS 요소로 제공한다.

오리는 `object-fit: contain`으로 표시하고 가로·세로를 독립적으로 늘리지 않는다.
새 파일의 부리·베레모·붓·팔레트·배 패치·발을 유지했다. 기준 시안에서 재생성한 자산으로
포즈와 세부 그림은 픽셀 단위 복제가 아니다.

종이 배경은 반복 경계가 검증된 타일이 아니므로 `repeat` 대신 `center / cover`로 사용한다.
잎·액자·와이어는 `alt=""`, `aria-hidden="true"`로 장식 처리한다.
첫 화면의 오리만 우선 로드하고, 아래쪽의 전시 그림은 배치에 맞춰 lazy loading을 적용한다.

## SVG 아이콘

`icons/`에 24×24 원본 벡터 10개가 있다. 직접 작성한 단순 도형이며 외부 패키지는 필요하지 않다.
시안에 맞춘 2px 둥근 선과 남색 계열을 사용했다(별은 노랑 채움).

| 파일 | 용도 |
| --- | --- |
| `teacher.svg` | 교사 수업 열기 |
| `shield-check.svg` | 익명 참여 안내 |
| `different-ideas.svg` | 모두 다른 답 |
| `question.svg` | AI 도움 설명 |
| `book-discover.svg` | 비교보다 발견 |
| `arrow-right.svg` | 장식 흐름 화살표 |
| `rocket.svg`, `whale.svg`, `house.svg` | 작품 아래 장식 표식 |
| `star.svg` | 학생 안내 장식 |

외부 `<img>`로 쓸 때 색은 SVG에 지정된 색이다. `currentColor` 상속이 필요하면 SVG 내용을
컴포넌트에 인라인으로 넣고 `stroke`를 바꾼다. 작은 아이콘의 실제 터치 영역은 44px 이상이어야 한다.
그리기 도구 문서의 Lucide 계약은 그리기 화면용이며 이번 독립 아이콘은 그 계약을 변경하지 않는다.

## UI와 문구

로고는 `/brand/logo.png`를 재사용한다. 화면 제목, 교사 버튼, 학생 태그, 네 자리 코드 입력,
그리러 가기 버튼, 안전 문구, 하단 설명은 HTML로 구현한다. 입력칸을 그림에 굽지 않는다.
시안의 도형→작품 표식은 예시 장식이며 실제 `Lesson.seed` 데이터라고 소개하지 않는다.
기능성 씨앗 선 미리보기는 기존 문서대로 실제 레슨 좌표를 렌더링한다.

소개 문구는 `모두 다른 답`, `AI는 대신 그리지 않아요`, `비교보다 발견`을 기준으로 한다.
AI가 아이 대신 완성한 작품이나 검증되지 않은 학습 성과처럼 홍보하지 않는다.

## 재생성·검증

이미지는 내장 ImageGen으로 만들었고 전체 프롬프트는 `prompts.json`에 보존했다.
체크무늬가 불투명하게 들어간 액자 2개는 제외했다. 최종 액자는 새로 생성한 실제 alpha PNG다.
현재 저장소의 Sharp로 크기 변환·WebP 인코딩·검사용 연락판을 생성한다.

```sh
node docs/design-assets/gallery/build-assets.mjs
```

오리·잎·액자의 alpha 채널과 완전 투명 픽셀 존재를 검사했고, 모든 PNG/WebP를 디코딩했다.
색 배경 위 연락판과 액자에 그림을 얹은 조합으로 외곽선·비율을 검수했다.
웹용 WebP 13개 전체 합계는 약 1.33MB이며 화면에서는 각 에셋의 알맞은 너비 하나만 요청한다.
이 검증은 에셋 검증이며 실제 입장 폼이나 대문의 반응형 동작 검증이 아니다.
