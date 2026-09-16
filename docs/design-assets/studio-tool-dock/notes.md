# Wiggle 그리기 도구 도크 시안

2026-09-14 · 초등 3~6학년 · 교실 공용 아이패드 가로 1180×820 중심, 휴대폰 390px 보조.

세 PNG는 각각 1536×1024인 비교용 시트다. 왼쪽은 태블릿 화면, 오른쪽은 굵기·더보기 및 색·휴대폰 확대 예시다. 실제 화면 크기의 스크린샷이나 동작하는 구현은 아니다. 터치 영역 수치는 아래의 **설계 목표**이며 DOM 실측 결과가 아니다.

## 공통 접근 방식

- 바 왼쪽의 둥근 화살표: 실행 취소·다시 실행.
- 가운데 도구 여섯 개: 연필, 크레용, 마커, 수채붓, 지우개, 나비 모양 스티커. 끝이 위를 향한다. 선택 도구는 12~16px 올라가고 현재 색 띠·끝과 작은 굵기 표시를 보인다.
- 선택 도구를 한 번 더 누르면 위쪽에 `굵기` 팝오버가 열린다. 점 다섯 개로 5단계를 고른다. 바깥 누름·다른 도구 선택으로 닫는 구성이다.
- `⋯` → `더보기`에서 `채우기`, `도형`, `글씨`에 접근한다. Aa는 사용자가 지정한 글씨 도구 기호다. 자는 실제 Wiggle 도구 목록에 없으므로 추가하지 않았다.
- 무지개 → `색 더보기`에서 단색 16개(4×4)와 별도의 무지개 버튼을 제공한다. 마지막 무지개는 자유 색 선택으로 이어진다. 시트의 색 확장 예시는 동작 경로 설명이며 더보기와 색 창을 동시에 열라는 뜻은 아니다.
- A·B는 펜 모드 / 손가락 모드를 더보기에, C는 바 오른쪽 끝에 둔다. 기본값은 펜 모드다. 공유 기기의 직전 학생 설정을 무조건 이어받지 않도록 다음 구현에서 전환 정책을 확인한다.
- 태블릿 모든 버튼·색·굵기 항목의 실제 누름 영역은 최소 48×48px. 도구 슬롯은 56~64px 폭을 권장한다. 작은 색 점의 그림 크기와 누름 영역은 다르다.
- 휴대폰은 태블릿 바를 통째로 줄이지 않는다. 도구 6개를 첫 줄(최소 48px씩), 실행 취소·다시 실행·현재 색·무지개·더보기를 둘째 줄에 둔다. 시트는 모드 줄까지 펼친 상태다. 16색은 별도 위쪽 시트로 연다.
- 태블릿 헤더 높이 64px, 바 아래 여백 16px를 가정한다. 브라우저 주소창이 포함된 물리 해상도가 아닌 **실제 웹 뷰포트 높이**가 기준이다. 그림의 저장 비율을 바 크기에 맞춰 바꾸는 제안은 아니다.

## A · faithful

**한 줄 콘셉트:** 아주 옅은 회색 바에 실제 필기구를 세워, 애플 마크업처럼 가볍고 익숙하게 고른다.

**장점:** 도구와 그림이 먼저 보이며 시각적 잡음이 적다. 6색과 무지개로 기본 바를 짧게 유지한다. 선택 도구가 올라와 현재 상태를 형태로 구분한다.

**위험:** 아이가 연필·크레용·마커의 작은 끝 모양을 혼동할 수 있다. 굵기 재탭과 더보기 속 모드는 처음에는 교사 설명이 필요하다. 교실 조명과 화면 보호 필름 아래에서는 옅은 경계가 약해질 수 있다. 820px 높이에서 도크 목표 높이는 120~136px, 헤더·아래 여백을 제외한 가림 없는 높이는 약 604~620px다. 팝오버는 그림을 잠시 더 가린다.

**필요한 새 그림 자산:** 은색 몸통 연필, 종이 감싼 크레용, 흰색 마커, 금속 연결부의 수채붓, 분홍·흰 지우개, 파란 나비 스티커. 아래 공통 규격의 6종. 연필 목재·흑연, 펜촉, 붓털 질감을 작은 크기에서도 서로 구별되게 제작한다.

## B · crayon box

**한 줄 콘셉트:** 크림색 필통에 Wiggle 종이 띠 도구를 세우고 진한 초록으로 고른 도구를 표시한다.

**장점:** 초록 크레용 로고와 도구가 같은 브랜드로 읽힌다. 8색을 바로 고를 수 있어 색 창을 덜 연다. 선택 배경과 색 링의 `#184028`은 교실 화면에서 상태를 찾기 쉽다.

**위험:** 동일한 종이 띠가 도구 차이를 흐릴 수 있으므로 끝 모양을 명확히 구분해야 한다. 실제 펜 색과 브랜드 초록 띠를 혼동하지 않게 현재 색은 끝·별도 띠로 표시한다. 도구를 크게 강조한 목업이라 세 방향 중 세로 점유가 가장 커 보인다. 820px 구현에서는 도크를 136~152px 목표로 줄이고, 가림 없는 높이 약 588~604px를 확보한다. 색 8개와 무지개의 누름 영역을 확보하면 가로폭도 늘어난다.

**필요한 새 그림 자산:** 초록 크레용 마크 종이 띠가 있는 목재 연필, 왁스 크레용, 크림 마커, 나무 손잡이 수채붓, 종이 띠 지우개, 테두리 있는 나비 스티커. 아래 공통 규격의 6종을 B 전용 재질로 제작한다. 도구마다 로고를 지나치게 크게 넣지 않는다.

## C · labels for kids

**한 줄 콘셉트:** 세워진 도구 아래 한글 이름을 붙이고 노란 선택 표시와 눈에 보이는 입력 모드로 스스로 찾게 한다.

**장점:** 교사가 “수채붓을 눌러요”라고 설명하면 아이가 같은 단어를 찾을 수 있다. `연필 / 크레용 / 마커 / 수채붓 / 지우개 / 스티커`가 형태 인식을 보완한다. `#f3c94f` 선택 배경과 올라간 도구를 함께 사용하고 펜·손가락 모드를 바로 확인한다.

**위험:** 이름·팔레트·모드를 모두 꺼내면 가로 공간이 가장 빠듯하다. 노란 배경만으로 선택을 알리면 밝은 화면에서 약해지므로 올라감과 색 링을 유지한다. 820px 높이에서는 도크 144~160px, 가림 없는 높이 약 580~596px가 목표다. 휴대폰의 모드 줄은 높이를 더 사용하므로 접힘 상태도 후속 검토가 필요하다. 한글 라벨은 실제 화면에서 12~14px 이상으로 구현하고 PNG에 구워 넣지 않는다.

**필요한 새 그림 자산:** A와 같은 연필·크레용·마커·수채붓·지우개·나비 6종을 재사용할 수 있다. 노란 선택 배경, 라벨, 입력 모드 버튼은 그림 자산이 아니라 UI로 만든다.

## 새 그림 자산 제작 규격

아래는 후속 구현용 권장 규격이며 이번 납품에 개별 도구 파일이 포함된 것은 아니다.

| 자산 | 투명 PNG 원본 | 화면 안 그림 크기 목표 |
|---|---|---|
| 세운 연필 | 192×384px | 32~40×80~104px |
| 세운 크레용 | 192×384px | 32~40×72~96px |
| 세운 마커 | 192×384px | 36~44×80~104px |
| 세운 수채붓 | 192×384px | 28~36×88~112px |
| 세운 지우개 | 192×256px | 36~44×56~72px |
| 나비 스티커 | 192×192px | 40~48×40~48px |

도구는 정면·같은 광원·같은 바닥 기준으로 만들고 좌우 투명 여백을 포함한다. 선택 상태는 이미지를 위로 이동시켜 표현하므로 별도의 선택 그림은 불필요하다. 연필·크레용·마커·수채붓의 색이 바뀌는 끝·띠는 같은 원본 크기의 투명 마스크 4종을 추가로 준비한다. 5단 굵기 표시는 UI로 얹어 16색×5단 이미지 조합을 만들지 않는다. 로고는 기존 초록 크레용 마크를 재사용한다. 실행 취소·다시 실행·더보기·채우기·도형·글씨·모드 기호, 손잡이, 선택 링, 색 점은 UI 자산으로 분리한다.

## 생성과 검수

내장 imagegen을 사용해 A → B → C 순으로 각각 생성하고, 같은 순서로 배경 번짐과 색 표시를 보정했다. 이미지 편집도 imagegen으로 수행했다. 최종 세 장은 1536×1024 PNG이며 도구 6종, 굵기 5단, 확장 단색 16개와 별도 무지개, 세 가지 상세 예시를 육안 확인했다. 픽셀 크기는 파일 메타데이터로 확인했다. 실행 코드·제품 결정·현재 상태 문서는 수정하지 않았다. 브랜치 생성은 Git 메타데이터 쓰기 제한으로 실패했으며 커밋·브랜치 전환·push는 하지 않았다. 파일은 새 비추적 산출물로만 저장했다.

### 생성 프롬프트 원문

아래는 최초 생성에 사용한 전체 프롬프트다. 후속 편집은 구도를 유지하면서 흰 배경으로 번짐을 제거하고, A는 16번째 단색과 별도 무지개를 보완하고, B는 빨강 선택 링을 보완하고, C는 색 선택 문구를 `색 더보기`로 맞췄다.

#### A

```text
Use case: ui-mockup. Generate ONE polished design presentation image EXACTLY 1536x1024 pixels landscape. Wiggle Korean drawing web app for elementary grades 3–6 on shared classroom iPads. A clean flat front-on UI design sheet, no photographic tablet chassis or perspective. White canvas, calm airy spacing, delicate gray frames. Sheet layout: large landscape tablet drawing screen occupying left 1090px and about 760px height (representing 1180x820 logical viewport), right column about 390px containing framed inset zooms, and lower strip for remaining inset. The main tablet screen shows slim header: back arrow, GREEN rounded-square CRAYON ICON logo (yellow crayon and white squiggle; NEVER a duck), '내 마음 그림', small '저장됨', right '과정 보기', '몽그리 부르기', '선생님', envelope icon and yellow '완성'. Main white drawing canvas shows a simple charming child's wax crayon drawing of a red-roof house, green tree and yellow sun, lots of empty space. Central focus: ONE wide rounded floating tool bar centered at the BOTTOM of the tablet screen, little grip line on its top, soft shadow. No right-side vertical cards. Left two small round undo and redo arrow buttons, logical hit areas >=48x48. Middle six well-separated realistic miniature instruments standing VERTICALLY UPRIGHT with tips UP: graphite pencil, wax crayon, broad felt marker, watercolor paintbrush, pink-white eraser, blue butterfly sticker. All SIX present, recognizable and upright, same baseline, selected red marker lifted 16 logical px higher with red tip/band and tiny 3-stroke thickness mark. No ruler because Wiggle has no ruler function; the six Wiggle tools replace the reference's ruler. Tablet hit slots >=48px, tool slots ideally 56-64px. Right palette and round '⋯' button.
Three framed inset callouts on SAME SHEET with precise Korean captions:
1. '굵기' inset shows popover anchored above the raised red marker: exactly FIVE progressively larger red dots in 48px hit areas, middle dot ringed; caption '선택한 도구를 한 번 더 눌러요'.
2. '더보기' inset shows popover with icon+label buttons '채우기', '도형', '글씨' (Aa glyph is allowed as the specified text-tool icon); also mode control '펜 모드' and '손가락 모드' where applicable. Within this same framed detail, a rainbow-linked '색 더보기' palette shows exactly SIXTEEN swatches in 4x4 grid plus rainbow more-color entry, making all 16 colors and custom color access explicit.
3. '휴대폰 · 390' inset shows actual 390-logical-pixel-wide compact responsive bottom dock in two rows, not a scaled-down tablet strip: first row six upright tool slots (six times 48px fits), lower row undo, redo, selected color, rainbow and more. A small expandable mode row can be shown. Keep touch targets big. Include house/tree/sun fragment above phone dock.
All UI text Korean EXACTLY as quoted, clear modern Korean sans-serif. NO English words except optional 'Wiggle' logo and the explicitly requested Aa text-tool glyph. Do not add Latin direction headings or long prose. Sheet title Korean. Match all constraints, show main dock large enough to appreciate realistic tools.
DIRECTION A faithful: Sheet title '가볍고 익숙한 도구'. As close as possible to Apple iPad Notes / Markup tool picker: very light gray #f2f3f5 wide pill, softly realistic clean white/silver instrument bodies, minimal material detailing, refined rubber eraser, graphite pencil wood tip, felt marker, wax crayon paper wrap, watercolor brush metal ferrule. Selected tool raised with subtle neutral selection backing, not a heavy colored box. Right compact grid EXACTLY SIX color dots in 3 columns x 2 rows (black, red, yellow, green, blue, brown) plus ONE rainbow dot, red ringed. Modes in more popover. Calm, airy, beautiful white space.
```

#### B

```text
Use case: ui-mockup. Generate ONE polished design presentation image EXACTLY 1536x1024 pixels landscape. Wiggle Korean drawing web app for elementary grades 3–6 on shared classroom iPads. A clean flat front-on UI design sheet, no photographic tablet chassis or perspective. White canvas, calm airy spacing, delicate gray frames. Sheet layout: large landscape tablet drawing screen occupying left 1090px and about 760px height (representing 1180x820 logical viewport), right column about 390px containing framed inset zooms, and lower strip for remaining inset. The main tablet screen shows slim header: back arrow, GREEN rounded-square CRAYON ICON logo (yellow crayon and white squiggle; NEVER a duck), '내 마음 그림', small '저장됨', right '과정 보기', '몽그리 부르기', '선생님', envelope icon and yellow '완성'. Main white drawing canvas shows a simple charming child's wax crayon drawing of a red-roof house, green tree and yellow sun, lots of empty space. Central focus: ONE wide rounded floating tool bar centered at the BOTTOM of the tablet screen, little grip line on its top, soft shadow. No right-side vertical cards. Left two small round undo and redo arrow buttons, logical hit areas >=48x48. Middle six well-separated realistic miniature instruments standing VERTICALLY UPRIGHT with tips UP: graphite pencil, wax crayon, broad felt marker, watercolor paintbrush, pink-white eraser, blue butterfly sticker. All SIX present, recognizable and upright, same baseline, selected red marker lifted 16 logical px higher with red tip/band and tiny 3-stroke thickness mark. No ruler because Wiggle has no ruler function; the six Wiggle tools replace the reference's ruler. Tablet hit slots >=48px, tool slots ideally 56-64px. Right palette and round '⋯' button.
Three framed inset callouts on SAME SHEET with precise Korean captions:
1. '굵기' inset shows popover anchored above the raised red marker: exactly FIVE progressively larger red dots in 48px hit areas, middle dot ringed; caption '선택한 도구를 한 번 더 눌러요'.
2. '더보기' inset shows popover with icon+label buttons '채우기', '도형', '글씨' (Aa glyph is allowed as the specified text-tool icon); also mode control '펜 모드' and '손가락 모드' where applicable. Within this same framed detail, a rainbow-linked '색 더보기' palette shows exactly SIXTEEN swatches in 4x4 grid plus rainbow more-color entry, making all 16 colors and custom color access explicit.
3. '휴대폰 · 390' inset shows actual 390-logical-pixel-wide compact responsive bottom dock in two rows, not a scaled-down tablet strip: first row six upright tool slots (six times 48px fits), lower row undo, redo, selected color, rainbow and more. A small expandable mode row can be shown. Keep touch targets big. Include house/tree/sun fragment above phone dock.
All UI text Korean EXACTLY as quoted, clear modern Korean sans-serif. NO English words except optional 'Wiggle' logo and the explicitly requested Aa text-tool glyph. Do not add Latin direction headings or long prose. Sheet title Korean. Match all constraints, show main dock large enough to appreciate realistic tools.
DIRECTION B crayon box: Sheet title '나만의 크레용 상자'. Same Apple upright-tools arrangement, but all instruments are bespoke Wiggle crayon-brand stationery: tactile wax tips, cream paper sleeves with fine dark-green bands and tiny green crayon insignia, warm wood pencil, creamy marker body, watercolor brush with warm wood handle, pink rubber eraser and blue butterfly sticker. Soft CREAM #faf6e9 dock, subtle DARK GREEN #184028 selected tool backing and edge, red marker raised. EXACTLY EIGHT quick color dots in TWO ROWS of FOUR plus a separate ninth RAINBOW dot. Colors black, red, orange, yellow, green, blue, purple, brown. The expanded '색 더보기' inset must show SIXTEEN SOLID color swatches in a 4x4 grid PLUS a SEPARATE seventeenth rainbow button BELOW grid, not replacing a solid color. Modes inside more. Main tablet dock about 128px tall logical, <=1000px wide. White page background and PURE WHITE drawing canvas: absolutely NO blurred colorful background, NO dark gradients, NO vignetting, NO colored haze, NO decorative footer slogans. Crisp readable restrained UI, instruments realistic and standing tips-up, generous consistent spacing. No extra English captions.
```

#### C

```text
Use case: ui-mockup. Generate ONE polished design presentation image EXACTLY 1536x1024 pixels landscape. Wiggle Korean drawing web app for elementary grades 3–6 on shared classroom iPads. A clean flat front-on UI design sheet, no photographic tablet chassis or perspective. White canvas, calm airy spacing, delicate gray frames. Sheet layout: large landscape tablet drawing screen occupying left 1090px and about 760px height (representing 1180x820 logical viewport), right column about 390px containing framed inset zooms, and lower strip for remaining inset. The main tablet screen shows slim header: back arrow, GREEN rounded-square CRAYON ICON logo (yellow crayon and white squiggle; NEVER a duck), '내 마음 그림', small '저장됨', right '과정 보기', '몽그리 부르기', '선생님', envelope icon and yellow '완성'. Main white drawing canvas shows a simple charming child's wax crayon drawing of a red-roof house, green tree and yellow sun, lots of empty space. Central focus: ONE wide rounded floating tool bar centered at the BOTTOM of the tablet screen, little grip line on its top, soft shadow. No right-side vertical cards. Left two small round undo and redo arrow buttons, logical hit areas >=48x48. Middle six well-separated realistic miniature instruments standing VERTICALLY UPRIGHT with tips UP: graphite pencil, wax crayon, broad felt marker, watercolor paintbrush, pink-white eraser, blue butterfly sticker. All SIX present, recognizable and upright, same baseline, selected red marker lifted 16 logical px higher with red tip/band and tiny 3-stroke thickness mark. No ruler because Wiggle has no ruler function; the six Wiggle tools replace the reference's ruler. Tablet hit slots >=48px, tool slots ideally 56-64px. Right palette and round '⋯' button.
Three framed inset callouts on SAME SHEET with precise Korean captions:
1. '굵기' inset shows popover anchored above the raised red marker: exactly FIVE progressively larger red dots in 48px hit areas, middle dot ringed; caption '선택한 도구를 한 번 더 눌러요'.
2. '더보기' inset shows popover with icon+label buttons '채우기', '도형', '글씨' (Aa glyph is allowed as the specified text-tool icon); also mode control '펜 모드' and '손가락 모드' where applicable. Within this same framed detail, a rainbow-linked '색 더보기' palette shows exactly SIXTEEN swatches in 4x4 grid plus rainbow more-color entry, making all 16 colors and custom color access explicit.
3. '휴대폰 · 390' inset shows actual 390-logical-pixel-wide compact responsive bottom dock in two rows, not a scaled-down tablet strip: first row six upright tool slots (six times 48px fits), lower row undo, redo, selected color, rainbow and more. A small expandable mode row can be shown. Keep touch targets big. Include house/tree/sun fragment above phone dock.
All UI text Korean EXACTLY as quoted, clear modern Korean sans-serif. NO English words except optional 'Wiggle' logo and the explicitly requested Aa text-tool glyph. Do not add Latin direction headings or long prose. Sheet title Korean. Match all constraints, show main dock large enough to appreciate realistic tools.
DIRECTION C labels for kids: Sheet title '이름을 보고 골라요'. Faithful Apple Markup realistic clean silver/white upright instruments in VERY LIGHT GRAY bottom bar. Under EACH of six tools put EXACT Korean tiny but crisp labels in this order: '연필', '크레용', '마커', '수채붓', '지우개', '스티커'. Raised selected RED MARKER gets soft pale YELLOW #f3c94f glow/backing and visible red tip and tiny thickness stripes. Exact SIX quick solid color dots arranged 3x2 plus SEPARATE rainbow. Selected red dot must be RINGED. At FAR RIGHT END of TABLET BAR after colors and ⋯, a small two-option toggle has readable exact '펜 모드' / '손가락 모드'; each option hit area minimum 48px tall, may stack options to save width. Modes remain visible on phone as a bottom row. Main dock logical width max 1100 and height 144; no collisions between tool labels and controls. Phone inset 390 wide uses 6 labeled upright tools in first row, undo/redo/current ringed color/rainbow/⋯ in second row, mode toggle third row. More inset '채우기', '도형', '글씨' + neighboring '색 더보기' 4x4 grid of SIXTEEN SOLID colors PLUS SEPARATE rainbow below; don't count rainbow as one of sixteen. This is a crisp flat UI screenshot sheet, completely WHITE background and WHITE drawing canvas, softly rounded thin gray frames; NO decorative footer, no slogans, no shadows across screen, no dark vignette, no colored blur. Only subtle small shadows under dock and inset popup. All labels precisely spelled, typographic clarity prioritized.
```

