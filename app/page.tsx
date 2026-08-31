import { Logo } from "./components/Logo";
import { LandingCodeForm } from "./components/LandingCodeForm";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const teacherAuthFailed = params.teacherAuth === "failed";
  return (
    <main className="landing landing-centered">
      <section className="landing-hero">
        <div className="landing-illustration-wrap">
          <nav className="topbar">
            <Logo />
            <a className="button secondary teacher-link" href="/teacher">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              교사 수업 열기
            </a>
          </nav>
          <img className="landing-illustration" src="/brand/landing-scene-v2.png" alt="교실에서 함께 그림을 그리는 아이들" />
          <div className="landing-copy">
            <p className="eyebrow landing-eyebrow">AI 그림 학습 · 교실 창작 코칭</p>
            <h1 className="landing-headline"><span>오늘은</span> <strong>어떤 생각을 그려볼까요?</strong></h1>
            <p className="landing-subtitle">함께 그리고, 서로의 생각을 발견하는 교실.</p>
          </div>
          <div className="landing-student-tag">
            <b>학생</b>
            <span>수업 코드로 바로 참여해요</span>
          </div>
          <div className="landing-code-card">
            <h2 className="landing-code-card-title">수업 코드 입력</h2>
            <LandingCodeForm />
          </div>
          <p className="landing-trust-note">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z" />
              <path d="m9 12 2 2 4-5" />
            </svg>
            학생 이메일 · 실명 없이 안전하게
          </p>
          {teacherAuthFailed && (
            <aside className="teacher-auth-notice" role="alert">
              <b>구글 로그인이 되지 않았어요.</b>
              <span>
                학교 구글 계정은 학교 관리자가 외부 서비스 접속을 막아 둔 경우가 있어요.
                <br />개인 Gmail로 다시 시도하거나, 학교 관리자에게 이 서비스 허용을 요청해 주세요.
              </span>
              <a className="button secondary" href="/api/auth/google/start?return_to=%2Fteacher">다른 계정으로 다시 로그인</a>
            </aside>
          )}
          <p className="landing-policy-links">
            <a href="/privacy">개인정보처리방침</a>
            <span aria-hidden="true">·</span>
            <a href="/terms">서비스 약관</a>
          </p>
        </div>
      </section>
    </main>
  );
}
