import type { Metadata } from "next";
import { Logo } from "../components/Logo";

export const metadata: Metadata = { title: "개인정보처리방침" };

// 게시 전 사용자 검토 필요: 이 문서는 법률 자문이 아닌 초안이다 (Story 1.1).
// 연락처 이메일은 게시 전에 실제 지원 주소인지 확인한다.
const CONTACT_EMAIL = "ghdlrr2969@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <nav className="topbar policy-topbar">
        <a href="/" aria-label="위글 홈으로"><Logo /></a>
      </nav>
      <article className="policy-body">
        <h1>개인정보처리방침</h1>
        <p className="policy-updated">시행일: 2026-08-31</p>

        <p>
          위글(Wiggle)은 아이들이 교실에서 안전하게 그림을 그리고 이야기를 만들도록 돕는
          웹 서비스입니다. 이 문서는 위글이 어떤 정보를 다루고, 어떤 정보를 다루지 않는지를
          보호자와 선생님이 읽기 쉽게 설명합니다.
        </p>

        <h2>1. 학생은 익명으로 참여합니다</h2>
        <ul>
          <li>학생의 이메일, 실명, 학교 이름, 생년월일을 <b>수집하지 않습니다.</b></li>
          <li>학생은 수업 코드나 학급 QR로 입장한 뒤, 동물 그림·별명·그림 비밀번호만으로 참여합니다.</li>
          <li>작품과 활동 기록은 서버가 발급한 <b>익명 학생 번호</b>에만 연결됩니다.
            위글은 이 번호가 실제로 어느 어린이인지 알 수 없습니다.</li>
          <li>학생 계정, 학생 사진, 공개 프로필을 만들지 않습니다.</li>
        </ul>

        <h2>2. 점수와 순위를 만들지 않습니다</h2>
        <ul>
          <li>그림 점수, 등수, 재능 진단을 만들지 않고, 그런 정보를 저장할 자리 자체를 두지 않습니다.</li>
          <li>AI 도우미(그리미)는 아이가 부를 때만 답하며, 그림을 대신 그리거나 평가하지 않습니다.</li>
        </ul>

        <h2>3. 구글 로그인은 어른(교사)만 사용합니다</h2>
        <ul>
          <li>구글 로그인은 <b>만 18세 이상 교사 계정 인증에만</b> 사용합니다.
            학생은 구글 계정을 사용하지 않으며, 위글은 학생에 관한 어떠한 구글 사용자 데이터도 수집하지 않습니다.</li>
          <li>교사 로그인 시 받는 정보는 구글 계정의 이메일과 이름뿐이며, 학급 운영 목적으로만 사용합니다.</li>
        </ul>

        <h2>4. 무엇을 어디에 보관하나요</h2>
        <ul>
          <li>수업 기록(익명 학생 번호, 작품 정보)은 데이터베이스(Turso)에,
            그림 파일은 파일 저장소(Cloudflare R2)에 보관합니다.</li>
          <li>그림 파일에는 공개 주소가 없습니다. 본인 학생의 기기 또는 담당 교사의 화면에서만,
            로그인 확인을 거쳐 열 수 있습니다.</li>
          <li>비밀번호 종류의 값은 원문 대신 암호화된 형태(해시)로만 저장합니다.</li>
        </ul>

        <h2>5. 문의와 삭제 요청</h2>
        <p>
          보관 중인 기록의 확인·삭제를 원하시면 아래로 연락해 주세요. 학급을 운영한 선생님을 통해
          요청하시면 더 빠르게 처리할 수 있습니다.
        </p>
        <p className="policy-contact">문의: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </article>
    </main>
  );
}
