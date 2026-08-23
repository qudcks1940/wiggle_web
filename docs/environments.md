# Wiggle Web 환경 분리

Wiggle은 Local, Vercel Preview, Production에서 같은 UI·도메인 로직·API를 사용한다.
환경별로 달라지는 것은 인증 방식, 데이터 자원, 테스트 시드와 운영 안전장치뿐이다.
기능을 환경별로 복사하거나 서로 다른 구현으로 유지하지 않는다.

## 환경 행렬

| 구분 | Local / Test | Vercel Preview | Production |
|---|---|---|---|
| 판별 | `WIGGLE_APP_ENV=local|test` | Vercel의 `VERCEL_ENV=preview` | Vercel의 `VERCEL_ENV=production` |
| 데이터 표식 | `WIGGLE_DATA_ENV=local|test` | `WIGGLE_DATA_ENV=preview` | `WIGGLE_DATA_ENV=production` |
| DB | `.data/` 또는 테스트 임시 file libSQL | Preview 전용 Turso | 운영 전용 Turso |
| 이미지 | `.data/` 또는 테스트 임시 디렉터리 | Preview 전용 R2 자격증명 + `preview/` 키 접두사 | 운영 R2, 기존 키 유지 |
| 교사 인증 | localhost 전용 개발 로그인 | 구글 OAuth | 구글 OAuth |
| 데모 시드 | localhost에서만 허용 | 금지 | 금지 |
| 용도 | 구현·자동 검증 | 공동 개발·QA | 실제 사용자 서비스 |

`NODE_ENV`는 이 표의 환경을 판별하는 데 사용하지 않는다. Preview와 Production은 모두
최적화된 production 빌드일 수 있기 때문이다. Vercel에서는 시스템 `VERCEL_ENV`가
`WIGGLE_APP_ENV`보다 우선하며, Preview/Production을 로컬로 강제로 낮출 수 없다.

## 코드 경계

```text
app/, app/components/          세 환경 공통 UI와 API
lib/runtime/                   환경 판별·권한·데이터 경계
lib/auth/                      세 환경 공통 인증 세션
lib/dev-only/                  로컬 시드와 개발 로그인만
app/components/dev-only/       로컬 전용 데모 화면만
db/adapters/                   환경이 선택하는 DB·파일 저장 구현
tests/, tests/harness/         test 전용 임시 DB·파일 저장소
```

공통 기능은 `dev-only`를 import하지 않는다. 로컬 전용 API 분기만 이 디렉터리를
서버에서 import하고, Preview/Production에서는 환경·hostname 검사를 통과할 수 없다.

## 실패 차단 규칙

- Local/Test에 원격 Turso URL이나 R2 자격증명이 들어오면 서버 시작을 거부한다.
- Preview/Production은 `WIGGLE_DATA_ENV`가 현재 배포 환경과 정확히 일치해야 한다.
- Preview/Production은 원격 Turso와 R2 값이 모두 있어야 하며 로컬 파일 폴백을 쓰지 않는다.
- Preview R2 object는 adapter가 `preview/` 아래에 저장한다. DB에는 기존과 같은 논리 key가 남는다.
- Preview와 Production은 반드시 Vercel의 서로 다른 환경 범위에 자격증명을 등록하고, Turso DB도 별도로 사용한다.
- `/api/health`는 선택된 환경과 DB·저장소 설정을 검증하되 자격증명을 응답하지 않는다.

## 로컬 설정

`.env.example`을 `.env.local`로 복사한다. 아래 두 값은 로컬 그대로 유지하고,
Turso/R2 원격 값은 비워 둔다.

```dotenv
WIGGLE_APP_ENV=local
WIGGLE_DATA_ENV=local
```

자동 통합 테스트는 하네스가 `test`를 강제로 지정하고 테스트마다 임시 DB와 파일
디렉터리를 만든다. 상위 셸이나 `.env.local`의 운영 자격증명은 테스트 환경에서 사용할 수 없다.

## Vercel 설정

Vercel 대시보드에서 같은 변수 이름을 Preview와 Production 범위에 각각 등록한다.

```text
Preview:    WIGGLE_DATA_ENV=preview    + Preview Turso/R2/Google/OpenAI 값
Production: WIGGLE_DATA_ENV=production + Production Turso/R2/Google/OpenAI 값
```

`WIGGLE_APP_ENV`는 Vercel에 등록하지 않는다. 배포 환경은 Vercel 시스템 값으로 결정한다.
Preview 구글 로그인은 고정된 Preview 별칭을 사용하고 그 별칭의
`/api/auth/google/callback`을 구글 OAuth 리디렉션 URI에 따로 등록한다.

기능 브랜치 push는 Preview 배포·검증 대상이다. `main` push만 Production 배포로 취급하며
사용자가 직접 수행한다. Preview에서 저장·이미지·로그인까지 확인한 같은 커밋을 Production으로
올리고, 배포 후 운영 실측을 다시 수행한다.
