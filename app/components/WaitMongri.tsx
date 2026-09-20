import check from "./EntryCheck.module.css";

/* 기다리는 동안 보여 주는 화면 하나 (2026-09-09 사용자 시안: 크림 단색 배경 가운데에
 * 선 너머로 고개 내민 몽그리 + 제목 + 부제, 로고·버튼 없음).
 * 입장 확인과 그리기 화면이 같은 것을 쓴다 — 2026-09-20 사용자 요청("도화지 그리는 중도 다른 화면처럼 뜨게").
 * 화면마다 따로 만들면 한쪽만 고쳐져 아이가 다른 화면을 만난다. */
export function WaitMongri({ title = "잠깐만 기다려 줘!", line, titleId }: { title?: string; line: string; titleId?: string }) {
  return (
    <main className={`entry-check ${check.waitShell}`}>
      <img className={check.waitMongri} src="/entry-green/wait-mongri.png" alt="" aria-hidden="true" width="476" height="340" />
      <div role="status">
        <h1 id={titleId}>{title}</h1>
        <p>{line}</p>
      </div>
    </main>
  );
}
