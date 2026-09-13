"use client";

import { useEffect, useRef, useState } from "react";
import { storeProfile } from "@/lib/client-session";
import { classifyEntryError, EntryErrorKind, readStudentEntryResponse, StudentEntryResponseError } from "@/lib/student-entry-client";
import { Logo } from "./Logo";
import check from "./EntryCheck.module.css";

const ANIMALS = ["🐰", "🐻", "🦊", "🐯", "🐼", "🐶", "🐱", "🐨", "🦁", "🐸"];
const ANIMAL_NAMES: Record<string, string> = { "🐰": "토끼", "🐻": "곰", "🦊": "여우", "🐯": "호랑이", "🐼": "판다", "🐶": "강아지", "🐱": "고양이", "🐨": "코알라", "🦁": "사자", "🐸": "개구리" };
import { entryPathFor, parseEntryQr, readEntryHash } from "@/lib/qr-entry";
import { QrScanner } from "./QrScanner";

export const ENTRY_CODE_LENGTH = 4;
/* 입장은 두 단계다: 반을 정하고(QR이 기본, 못 쓰면 수업 코드 4자리) 아이 참여 코드 4자리를 누른다.
 * 코드가 곧 그 아이의 자리라, 다음 시간에 같은 코드를 넣으면 같은 아이로 돌아온다.
 * 참여 코드는 2026-09-12에 네 자리로 줄였다 — 여섯 자리는 아이가 누르기 벅찼다. */
type Mode = "checking" | "code" | "animal" | "noRoster";

export function JoinClient({ initialEntry = "" }: { initialEntry?: string }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [classroomName, setClassroomName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [animal, setAnimal] = useState("");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<EntryErrorKind | "">("");
  const [teacherCallOpen, setTeacherCallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  // 아이별 쪽지 QR(`#entry=1234`)로 들어오면 반 확인이 끝난 뒤 이 코드로 곧바로 입장한다.
  const pendingEntryCode = useRef<string | null>(null);
  const entry = initialEntry;

  useEffect(() => {
    setCodeInput(""); setAnimal(""); setError(""); setErrorKind(""); setTeacherCallOpen(false);
    // 참여 코드는 주소 조각에만 온다. 서버로는 원래 안 가지만, 주소창과 방문 기록에 남지 않도록
    // 어떤 네트워크 호출보다 먼저 지운다. replaceState라 뒤로 가기 기록에도 남지 않는다.
    const fromHash = readEntryHash(location.hash);
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    pendingEntryCode.current = fromHash;
    if (!initialEntry) { location.replace("/"); return; }
    void checkEntry();
  // checkEntry only reads the stable entry prop. Keeping it outside this dependency list
  // prevents a status response from retriggering itself through mode changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !initialEntry) return;
      setCodeInput(""); setAnimal(""); setMode("checking"); void checkEntry();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry]);

  // 이미 이 반 화면에 있는데 태블릿 카메라로 쪽지 QR을 찍으면, 경로는 같고 조각만 바뀌어
  // 페이지가 다시 읽히지 않는다(같은 문서 이동). 그러면 위의 마운트 처리가 돌지 않으므로
  // 조각 변화를 따로 받는다. 읽자마자 지우는 규칙은 같다.
  useEffect(() => {
    const onHashChange = () => {
      if (!location.hash) return;
      const code = readEntryHash(location.hash);
      history.replaceState(history.state, "", location.pathname + location.search);
      if (!code) return;
      if (mode === "code") { setCodeInput(code); void submit("", code); }
      else pendingEntryCode.current = code;
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  // submit은 코드를 인자로 받으므로 옛 codeInput을 붙잡지 않는다. 화면 단계만 따라가면 된다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function checkEntry() {
    setBusy(true); setError(""); setErrorKind(""); setTeacherCallOpen(false);
    try {
      const response = await fetch("/api/student", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "entryStatus", entry }), cache: "no-store" });
      const data = await readStudentEntryResponse(response);
      if (!response.ok) {
        setErrorKind(classifyEntryError(response.status));
        throw new StudentEntryResponseError(data.error ?? "수업을 확인하지 못했어요.");
      }
      setClassroomName(data.classroomName ?? "우리 반");
      setCodeInput("");
      // 명단이 없으면 아이가 할 수 있는 일이 없다. 선생님을 부르도록 안내한다.
      setMode(data.hasRoster ? "code" : "noRoster");
      const scanned = pendingEntryCode.current;
      pendingEntryCode.current = null;
      if (data.hasRoster && scanned) { setCodeInput(scanned); void submit("", scanned); }
    } catch (cause) {
      setError(cause instanceof StudentEntryResponseError ? cause.message : "수업을 확인하는 중 연결이 끊겼어요. 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  function clearEntryError() {
    setError(""); setErrorKind(""); setTeacherCallOpen(false);
  }

  function backToCode() {
    clearEntryError(); setAnimal(""); setCodeInput(""); setMode("code");
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  // code를 따로 받는 이유: QR로 채운 직후에는 setCodeInput이 아직 반영되지 않았다.
  async function submit(chosenAnimal = "", code = codeInput) {
    if (code.length !== ENTRY_CODE_LENGTH) { setError("참여 코드 네 자리를 눌러 주세요."); setErrorKind("general"); return; }
    clearEntryError(); setBusy(true);
    let failureKind: EntryErrorKind = "general";
    try {
      const response = await fetch("/api/student", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join", entry, entryCode: code, ...(chosenAnimal ? { animal: chosenAnimal } : {}) }), cache: "no-store" });
      failureKind = classifyEntryError(response.status);
      const data = await readStudentEntryResponse(response);
      if (!response.ok) throw new StudentEntryResponseError(data.error ?? "입장할 수 없어요.");
      // 코드는 맞는데 처음이면 동물 하나만 고른다. 별명은 서버가 동물에 맞춰 붙인다.
      if (data.firstTime) { setMode("animal"); requestAnimationFrame(() => window.scrollTo(0, 0)); return; }
      if (!data.student || !data.deviceToken || !data.expiresAt) throw new StudentEntryResponseError(data.error ?? "입장할 수 없어요.");
      storeProfile({ studentId: data.student.id, nickname: data.student.nickname, animal: data.student.animal, classroomName: data.student.classroomName, deviceToken: data.deviceToken, expiresAt: data.expiresAt });
      location.replace("/student");
    } catch (cause) {
      setError(cause instanceof StudentEntryResponseError ? cause.message : "입장 중 연결을 확인하지 못했어요. 잠시 뒤 다시 해 주세요.");
      setErrorKind(failureKind);
    } finally { setBusy(false); }
  }

  // 참여 코드 화면에서 찍은 QR. 아이별 쪽지 QR만 쓸모가 있다 — 반 QR에는 참여 코드가 없다.
  function handleScan(text: string) {
    setScanning(false);
    const qr = parseEntryQr(text);
    if (!qr) { setError("Wiggle 수업 QR이 아니에요. 내 쪽지의 QR을 찍어 주세요."); setErrorKind("general"); return; }
    if (!qr.entryCode) { setError("이 QR에는 내 참여 코드가 없어요. 내 쪽지의 QR을 찍어 주세요."); setErrorKind("general"); return; }
    // 지금 들어온 반의 쪽지면 바로 입장한다. 주소 조각만 바뀌는 이동은 페이지를 다시 읽지 않아
    // 조각 처리가 돌지 않으므로, 같은 반은 여기서 직접 제출한다.
    if (qr.classCode === entry) { setCodeInput(qr.entryCode); void submit("", qr.entryCode); return; }
    // 다른 반 쪽지면 그 반부터 다시 확인한다(경로가 달라 실제로 다시 읽힌다).
    location.replace(entryPathFor(qr));
  }

  function errorNotice() {
    if (!error) return null;
    return <div className="entry-error-block">
      <div className="error-box child-error" role="alert"><span className="child-error-icon" aria-hidden="true">⚠️</span><p>{error}</p></div>
      {errorKind === "code" && !teacherCallOpen && <button type="button" className="button secondary full teacher-call-button" onClick={() => setTeacherCallOpen(true)}><span aria-hidden="true">🙋</span>선생님 불러요</button>}
      {errorKind === "code" && teacherCallOpen && <div className="teacher-call-note" role="status"><span className="teacher-call-emoji" aria-hidden="true">🙋</span><p>손을 들고 선생님을 불러요.<br />참여 코드를 다시 알려 주실 거예요.</p></div>}
    </div>;
  }

  // 교실 장식. 배경이 아니라 독립 요소라 화면이 늘어나도 늘어나지 않고, 좁으면 CSS가 내려놓는다.
  const scenery = (
    <>
      <img className={`${check.scenery} ${check.sceneryLeft}`} src="/entry-green/scene/left-group.webp" alt="" aria-hidden="true" width="700" height="881" />
      <img className={`${check.scenery} ${check.sceneryRight}`} src="/entry-green/scene/right-group.webp" alt="" aria-hidden="true" width="392" height="571" />
    </>
  );

  if (mode === "checking") {
    const codeError = errorKind === "code";
    // 문구는 docs/design-assets/entry-green/README-CLAUDE.md의 확정 문구. 선생님 도움 버튼은 실제 메시지를 보내지 않고 손을 드는 안내다.
    // 대기 상태는 2026-09-09 사용자 시안: 크림 배경 + 선 너머로 고개 내민 몽그리 + 문구 두 줄만.
    if (!error) return <main className={`entry-check ${check.waitShell}`}>
      <img className={check.waitMongri} src="/entry-green/wait-mongri.png" alt="" aria-hidden="true" width="476" height="340" />
      <div role="status"><h1 id="entry-check-title">잠깐만 기다려 줘!</h1><p>수업실을 준비하고 있어요</p></div>
    </main>;
    const guidance = codeError ? "수업 코드가 맞는지 한 번만 더 확인해 줘." : "잠깐 연결이 어려운가 봐. 한 번 더 해 보자.";
    return <main className={`entry-check ${check.shell}`}>
      {scenery}
      <div className={check.stage}>
        <div className={check.head}>
          <div className={check.logo}><Logo /></div>
        </div>
        <span className={check.sign} aria-hidden="true">우리 반</span>
        <img className={check.duck} src="/landing-gallery/duck-painter-640.webp" alt="" aria-hidden="true" width="640" height="640" />
        <section className={check.panel} aria-labelledby="entry-check-title">
          <h1 id="entry-check-title">몽그리랑 다시 찾아보자!</h1>
          <p className={check.lead}>{guidance}</p>
          <div className={check.note}>
            <div className="error-box child-error" role="alert"><span className="child-error-icon" aria-hidden="true">⚠️</span><p>{codeError ? "수업을 아직 찾지 못했어요" : error}</p></div>
          </div>
          {error && <div className={check.actions}>
            {codeError
              ? <a className={check.primary} href="/">수업 코드 다시 입력하기</a>
              : <button type="button" className={check.primary} disabled={busy} onClick={() => void checkEntry()}>{busy ? "확인 중…" : "다시 확인하기"}</button>}
            {codeError && !teacherCallOpen && <button type="button" className={`${check.help} teacher-call-button`} onClick={() => setTeacherCallOpen(true)}><span aria-hidden="true">🙋</span>선생님 불러요</button>}
            {codeError && teacherCallOpen && <div className="teacher-call-note" role="status"><span className="teacher-call-emoji" aria-hidden="true">🙋</span><p>손을 들고 선생님을 불러요.<br />수업 코드를 다시 알려 주실 거예요.</p></div>}
            {codeError
              ? <button type="button" className={check.retry} disabled={busy} onClick={() => void checkEntry()}>{busy ? "확인 중…" : "다시 확인하기"}</button>
              : <a className={check.retry} href="/">수업 코드 다시 입력하기</a>}
          </div>}
        </section>
      </div>
    </main>;
  }

  if (mode === "code") {
    const pressKey = (digit: string) => { clearEntryError(); setCodeInput((current) => (current + digit).slice(0, ENTRY_CODE_LENGTH)); };
    return <main className={`${check.shell} ${check.seatShell}`}>
      {scenery}
      <div className={`${check.stage} ${check.seatStage}`}>
        <div className={check.head}>
          <div className={check.logo}><Logo /></div>
        </div>
        <img className={check.duck} src="/landing-gallery/duck-painter-640.webp" alt="" aria-hidden="true" width="640" height="640" />
        <div className={check.seatTitle}>
          <h1>내 참여 코드를 눌러요</h1>
          <p>선생님이 준 네 자리 숫자예요.</p>
        </div>
        <span className={check.padBadge}>{classroomName}</span>
        <section className={`code-card ${check.pad}`} aria-label="참여 코드 입력 수첩">
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <label className={check.padLabel} htmlFor="entry-code">내 참여 코드</label>
            <div className={check.display}>
              <input
                id="entry-code"
                className="entry-code-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={ENTRY_CODE_LENGTH}
                value={codeInput}
                aria-label="내 참여 코드"
                onChange={(event) => { setCodeInput(event.target.value.replace(/[^0-9]/g, "").slice(0, ENTRY_CODE_LENGTH)); clearEntryError(); }}
              />
            </div>
            <div className={check.keys} role="group" aria-label="숫자판">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => <button type="button" className={check.key} key={digit} onClick={() => pressKey(digit)}>{digit}</button>)}
              <span className={check.keyBlank} aria-hidden="true" />
              <button type="button" className={check.key} onClick={() => pressKey("0")}>0</button>
              <button type="button" className={`${check.key} ${check.keyErase}`} aria-label="한 자리 지우기" onClick={() => { clearEntryError(); setCodeInput((current) => current.slice(0, -1)); }}><span aria-hidden="true">⌫</span>지우기</button>
            </div>
            {errorNotice()}
            <button className={`${check.enter} child-primary-action`} disabled={busy || codeInput.length !== ENTRY_CODE_LENGTH}>{busy ? "확인 중…" : "들어가기"}</button>
          </form>
          {/* 누르기 어려운 아이는 쪽지의 QR을 찍어 바로 들어간다. */}
          <button type="button" className={`${check.scan} child-primary-action`} disabled={busy} onClick={() => { clearEntryError(); setScanning(true); }}><span aria-hidden="true">📷</span>내 쪽지 QR로 찍기</button>
          <a className={check.again} href="/">수업 코드 다시 입력하기</a>
        </section>
      </div>
      {scanning && <QrScanner onResult={handleScan} onClose={() => setScanning(false)} hint="내 쪽지의 QR을 네모 안에 보여 줘" />}
    </main>;
  }

  if (mode === "animal") {
    return <main className={`${check.shell} ${check.seatShell}`}>
      {scenery}
      <div className={`${check.stage} ${check.seatStage}`}>
        <div className={check.head}>
          <div className={check.logo}><Logo /></div>
        </div>
        <img className={check.duck} src="/landing-gallery/duck-painter-640.webp" alt="" aria-hidden="true" width="640" height="640" />
        <div className={check.seatTitle}>
          <h1>내 동물을 골라요</h1>
          <p>처음 왔구나! 하나만 고르면 돼요.</p>
        </div>
        <span className={check.padBadge}>{classroomName}</span>
        <section className={`animal-card ${check.pad}`} aria-label="내 동물 고르기 수첩">
          <form onSubmit={(event) => { event.preventDefault(); void submit(animal); }}>
            <fieldset className="animal-choice-fieldset"><legend className={check.padLabel}>내 동물</legend>
              <div className="animal-choice-grid">{ANIMALS.map((value, index) => <button type="button" aria-pressed={animal === value} aria-label={`${ANIMAL_NAMES[value]} 고르기`} className={animal === value ? "emoji-chip selected" : "emoji-chip"} key={value} onClick={() => { setAnimal(value); clearEntryError(); }}><span className="animal-choice-portrait" data-animal-index={index} aria-hidden="true" /><small>{ANIMAL_NAMES[value]}</small></button>)}</div>
            </fieldset>
            {errorNotice()}
            <button className={`${check.enter} child-primary-action`} disabled={busy || !animal}>{busy ? "들어가는 중…" : "이 동물로 들어가기"}</button>
          </form>
          <button type="button" className={check.again} onClick={backToCode}>참여 코드 다시 누르기</button>
        </section>
      </div>
    </main>;
  }

  // 명단이 아직 없는 반(2026-09-13 사용자 시안): 카드 없이 크림 바탕 + 고개 내민 몽그리 + 문구 + 버튼.
  // 몽그리 그림(peek-mongri)은 사용자 시안에서 잘라 왔다. 불투명 그림이라 배경이 시안과 같은 #fefaea여야
  // 경계가 보이지 않는다(원본: docs/design-assets/not-ready/mockup-2026-09-13.png).
  return <main className={check.readyShell}>
    <header className={check.readyTop}>
      <div className={check.readyLogo}><Logo /></div>
      <span className={check.readyClass}>{classroomName}</span>
    </header>
    <section className={check.readyBody} aria-labelledby="ready-title">
      <img className={check.readyMongri} src="/entry-green/peek-mongri.webp" alt="" aria-hidden="true" width="384" height="368" />
      <h1 id="ready-title" className={check.readyTitle}>아직 준비 중이에요</h1>
      <p className={check.readyLead}>선생님이 우리 반 명단을 넣으면<br />내 참여 코드로 들어올 수 있어요.</p>
      {error && <p className={check.readyError} role="alert">{error}</p>}
      <button type="button" className={`${check.readyRetry} child-primary-action`} disabled={busy} onClick={() => void checkEntry()}><span aria-hidden="true">🔄</span>{busy ? "확인 중…" : "다시 확인하기"}</button>
      <a className={check.readyAgain} href="/">수업 코드 다시 입력하기</a>
    </section>
  </main>;
}
