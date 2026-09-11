# 위글 화면 모음

> 캡처: 2026-09-11 · 기준 커밋 `4794197` (main)
> 실제 빌드(`next build` → `next start`)를 띄우고 헤드리스 크롬으로 찍었다. 시안이 아니라 **지금 동작하는 화면**이다.
> 데스크톱 1440×900, 휴대전화 390×844. 2배 해상도로 찍어 1배 크기 webp로 저장했다(21장, 합계 785KB).

캡처에 쓴 자료는 모두 지어낸 것이다. 학급 `햇살 2반`, 학생 이름 여섯 개, 수업 코드 `3270`,
참여 코드 여섯 개 모두 로컬 시연용이며 실제 학생·학급이 아니다.

## 한눈에 보는 흐름

```
대문(수업 코드 4자리)  →  참여 코드 6자리  →  [처음이면] 동물 고르기  →  학생 홈  →  그리기
   01                      02·03                 04                      05          06
```

교사는 따로 들어온다: 학급 목록(09) → 오늘 수업(10) · 작품·그림책(11) · 명단·설정(12).

## 학생 화면

| 파일 | 화면 | 설명 |
|---|---|---|
| [01-landing-desktop](screens/01-landing-desktop.webp) · [phone](screens/01-landing-phone.webp) | 대문 | 전시관 그림과 몽그리. 오른쪽 카드에 4자리 **수업 코드**를 넣는다. 오른쪽 위는 교사 입구. |
| [02-entry-code-desktop](screens/02-entry-code-desktop.webp) · [phone](screens/02-entry-code-phone.webp) | 참여 코드 | 반을 확인한 뒤 열리는 수첩 숫자판. 선생님이 준 **여섯 자리**를 누른다. 넓은 화면은 교실 원화 위, 좁은 화면은 크림 배경 카드. |
| [03-entry-wrong-code-desktop](screens/03-entry-wrong-code-desktop.webp) · [phone](screens/03-entry-wrong-code-phone.webp) | 코드가 틀렸을 때 | 글을 못 읽어도 알 수 있게 ⚠️ 그림과 짧은 문장. 「선생님 불러요」를 누르면 손을 들라는 안내가 펼쳐진다. |
| [04-entry-animal-desktop](screens/04-entry-animal-desktop.webp) · [phone](screens/04-entry-animal-phone.webp) | 동물 고르기 | 그 코드로 **처음** 들어올 때만 나온다. 동물 하나만 고르면 되고 별명은 자동으로 붙는다(토끼→토끼 화가). |
| [05-student-home-desktop](screens/05-student-home-desktop.webp) · [phone](screens/05-student-home-phone.webp) | 학생 홈 | 오늘 회차 카드(이야기 제목·장면 문장·힌트 3개·큰 시작 버튼)와 아래 연필 선반(이어 그리기·내 그림), 그림책 만들기 안내. |
| [06-drawing-studio-desktop](screens/06-drawing-studio-desktop.webp) · [phone](screens/06-drawing-studio-phone.webp) | 그리기 | 도화지가 화면을 채우고 도구·색이 떠 있다. 가운데 초록 동그라미가 1회차 **씨앗 선**이고, 그 위 남색 획이 아이가 그린 것이다. |
| [07-student-archive-desktop](screens/07-student-archive-desktop.webp) | 내 그림 | 내가 그린 것만 모인 보관함. |
| [08-student-books-desktop](screens/08-student-books-desktop.webp) | 그림책 작업실 | 가로·세로·정사각 중 책 모양을 고르고 이야기와 그림을 얹는다. |

## 교사 화면

| 파일 | 화면 | 설명 |
|---|---|---|
| [09-teacher-classes-desktop](screens/09-teacher-classes-desktop.webp) | 학급 목록 | 최근 학급 카드와 전체 표. 행마다 수업 코드·복사·QR. |
| [10-teacher-today-desktop](screens/10-teacher-today-desktop.webp) | 오늘 수업 | 지금 열린 회차와 반 전체 그림 격자. 저장 전인 아이는 「시작 전」로 보인다. |
| [11-teacher-works-desktop](screens/11-teacher-works-desktop.webp) | 작품·그림책 | 학생·회차로 걸러 보는 그림과 완성 그림책. |
| [12-teacher-roster-desktop](screens/12-teacher-roster-desktop.webp) | 명단·설정 | **참여 코드가 여기 있다.** 번호·이름·코드(복사·새로 뽑기)·별명·첫 입장. 「코드표 인쇄」로 잘라 나눠 줄 표를 뽑는다. 오른쪽은 입장 열기/닫기, 수업 코드, QR, 학급 삭제. |
| [13-teacher-episode-desktop](screens/13-teacher-episode-desktop.webp) | 회차 변경 | 이야기(아크)를 고르고 1~5회차 중 열 회차를 누른다. |
| [14-teacher-qr-desktop](screens/14-teacher-qr-desktop.webp) | 입장 QR | 칠판에 띄우는 큰 QR과 수업 코드. QR로 들어오면 아이는 참여 코드만 누른다. |

## 그 밖

| 파일 | 화면 |
|---|---|
| [15-privacy-desktop](screens/15-privacy-desktop.webp) | 개인정보 처리방침 |

## 다시 찍는 법

1. 현재 트리를 빌드해 띄운다. `npm run build && npx next start -p 3299`
2. 이 폴더의 [`capture.mjs`](capture.mjs)를 쓴다. `node docs/wiggle/capture.mjs http://localhost:3299 <출력폴더>`
   교사 로그인 → 명단 학급 → 회차 열기 → 학생 입장 → 몇 획 그리기까지 시드하고 21장을 찍는다.
3. 2배로 찍은 png를 1배 webp로 줄여 `screens/`에 넣는다(`sharp`, quality 82).

찍는 서버는 **반드시 현재 트리를 빌드해 띄운 것**이어야 한다. 다른 워크트리의 3000번 서버를
찍은 실사고가 있었다(2026-09-07, `CLAUDE.md` 개발 절차 5항).
