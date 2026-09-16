import { Logo } from "./components/Logo";
import { LandingCodeForm } from "./components/LandingCodeForm";

/* 2026-09-07 오리 전시관 대문 (`docs/design-assets/gallery/selected-reference.png`).
   그림은 개별 에셋으로 배치하고 제목·버튼·입력칸은 실제 HTML이다. 전시 그림과 도형 표식은
   제품 소개용 장식이며 실제 학생 작품이나 `Lesson.seed` 데이터가 아니다. */
const EXHIBITS = [
  { id: "rocket", alt: "크레용으로 그린 로켓과 우주 비행사", mark: "/landing-gallery/icons/rocket.svg" },
  { id: "whale", alt: "크레용으로 그린 고래와 바닷속 친구들", mark: "/landing-gallery/icons/whale.svg" },
  { id: "house", alt: "크레용으로 그린 빨간 지붕 집과 꽃밭", mark: "/landing-gallery/icons/house.svg" },
];

const REASONS = [
  { icon: "different-ideas", title: "모두 다른 답", body: "같은 시작에서도 생각은 달라져요" },
  { icon: "question", title: "AI는 대신 그리지 않아요", body: "필요할 때만 질문으로 도와요" },
  { icon: "book-discover", title: "비교보다 발견", body: "선생님과 서로의 과정을 살펴봐요" },
];

export default function Home() {
  return (
    <main className="landing gallery-landing">
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

      <section className="gallery-hero">
        <div className="gallery-copy">
          <p className="eyebrow landing-eyebrow">AI 그림 학습 · 교실 창작 코칭</p>
          <h1 className="landing-headline"><span>오늘은</span> <strong>어떤 생각을 그려볼까요?</strong></h1>
          <p className="landing-subtitle">함께 그리고, 서로의 생각을 발견하는 교실.</p>
        </div>

        <div className="gallery-stage">
          <div className="gallery-wall">
            {EXHIBITS.map((exhibit) => (
              <div className="gallery-exhibit" key={exhibit.id}>
                <figure className="gallery-frame">
                  <div className="gallery-wire" aria-hidden="true"><i className="gallery-pin" /></div>
                  <img
                    className="gallery-frame__rim"
                    src="/landing-gallery/frame-blue-960.webp"
                    width={960}
                    height={720}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    className="gallery-frame__art"
                    src={`/landing-gallery/artwork-${exhibit.id}-480.webp`}
                    srcSet={`/landing-gallery/artwork-${exhibit.id}-480.webp 480w, /landing-gallery/artwork-${exhibit.id}-960.webp 960w`}
                    sizes="(max-width:600px) 74vw, 320px"
                    width={960}
                    height={720}
                    alt={exhibit.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
                <p className="gallery-shape-chip" aria-hidden="true">
                  ○<i>→</i>▽<i>→</i>
                  <img src={exhibit.mark} width={20} height={20} alt="" loading="lazy" />
                </p>
              </div>
            ))}
          </div>

          <img
            className="gallery-duck"
            src="/landing-gallery/duck-painter-1200.webp"
            srcSet="/landing-gallery/duck-painter-640.webp 640w, /landing-gallery/duck-painter-1200.webp 1200w"
            sizes="(max-width:640px) 62vw, (max-width:1023px) 40vw, 420px"
            width={1200}
            height={1200}
            alt="붓과 팔레트를 든 노란 오리 화가"
            fetchPriority="high"
            decoding="async"
          />

          <img
            className="gallery-leaves gallery-decoration"
            src="/landing-gallery/leaves-320.webp"
            width={320}
            height={336}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />

          <div className="gallery-entry">
            <div className="gallery-student-tag">
              <img src="/landing-gallery/icons/star.svg" width={22} height={22} alt="" aria-hidden="true" />
              <b>학생</b>
              <span>수업 코드로 바로 참여해요</span>
            </div>
            <div className="landing-code-card">
              <h2 className="landing-code-card-title">수업 코드 입력</h2>
              <LandingCodeForm />
            </div>
            <p className="gallery-trust-note">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z" />
                <path d="m9 12 2 2 4-5" />
              </svg>
              학생 이메일 없이 안전하게
            </p>
          </div>
        </div>
      </section>

      <section className="gallery-reasons" aria-labelledby="gallery-reasons-title">
        <h2 id="gallery-reasons-title">Wiggle이<br />다른 이유</h2>
        <ul>
          {REASONS.map((reason) => (
            <li key={reason.icon}>
              <img src={`/landing-gallery/icons/${reason.icon}.svg`} width={26} height={26} alt="" aria-hidden="true" loading="lazy" />
              <div>
                <b>{reason.title}</b>
                <span>{reason.body}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
