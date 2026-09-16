import type { Metadata } from "next";
import { Logo } from "../components/Logo";

export const metadata: Metadata = { title: "서비스 약관" };

// 게시 전 사용자 검토 필요: 이 문서는 법률 자문이 아닌 초안이다 (Story 1.1).
const CONTACT_EMAIL = "ghdlrr2969@gmail.com";

export default function TermsPage() {
  return (
    <main className="policy-page">
      <nav className="topbar policy-topbar">
        <a href="/" aria-label="위글 홈으로"><Logo /></a>
      </nav>
      <article className="policy-body">
        <h1>서비스 약관</h1>
        <p className="policy-updated">시행일: 2026-08-31</p>

        <h2>1. 서비스 소개</h2>
        <p>
          위글(Wiggle)은 교실에서 아이들이 그림을 그리고 이야기를 만드는 웹 서비스입니다.
          교사가 수업을 열고, 학생은 수업 코드로 익명 참여합니다.
        </p>

        <h2>2. 계정과 이용</h2>
        <ul>
          <li>교사 계정은 구글 로그인으로 만들며, 교육 목적으로만 사용합니다.</li>
          <li>학생은 계정 없이 참여합니다. 학생의 참여에 필요한 안내와 동의 확인은
            수업을 운영하는 교사와 소속 기관의 절차를 따릅니다.</li>
          <li>서비스를 부정하게 사용하거나 다른 학급·학생의 기록에 접근하려는 시도는 금지됩니다.</li>
        </ul>

        <h2>3. 아이 작품의 권리</h2>
        <ul>
          <li>아이가 그린 그림과 이야기는 <b>아이의 것</b>입니다. 위글은 서비스 제공(저장·표시)에
            필요한 범위에서만 작품을 다룹니다.</li>
          <li>위글은 아이 작품을 광고나 홍보에 사용하지 않습니다.</li>
        </ul>

        <h2>4. 서비스 변경과 중단</h2>
        <p>
          기능은 개선 과정에서 바뀔 수 있습니다. 서비스를 중단해야 하는 경우, 보관 중인
          작품을 정리할 수 있도록 합리적인 기간을 두고 교사에게 알립니다.
        </p>

        <h2>5. 책임의 한계</h2>
        <p>
          위글은 안정적인 서비스를 위해 노력하지만, 무료 제공 기간 동안 발생한 일시적 오류나
          데이터 손실에 대해 법이 허용하는 범위에서 책임이 제한될 수 있습니다.
        </p>

        <h2>6. 문의</h2>
        <p className="policy-contact">문의: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </article>
    </main>
  );
}
