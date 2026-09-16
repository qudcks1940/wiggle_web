"use client";

import { useEffect, useRef, useState } from "react";
import { storeProfile } from "@/lib/client-session";
import { FALLBACK_NICKNAME, NICKNAME_IDEAS, pickDifferentNickname } from "@/lib/nickname-ideas";
import { PICTURE_PASSWORD_LENGTH } from "@/lib/picture-password";
import { classifyEntryError, EntryErrorKind, readStudentEntryResponse, StudentEntryResponseError } from "@/lib/student-entry-client";
import { Logo } from "./Logo";
import { SpeakButton } from "./SpeakButton";

const ANIMALS = ["🐰", "🐻", "🦊", "🐯", "🐼", "🐶", "🐱", "🐨", "🦁", "🐸"];
const ANIMAL_NAMES: Record<string, string> = { "🐰": "토끼", "🐻": "곰", "🦊": "여우", "🐯": "호랑이", "🐼": "판다", "🐶": "강아지", "🐱": "고양이", "🐨": "코알라", "🦁": "사자", "🐸": "개구리" };
const PICTURES = [
  { value: "⭐", picture: "⭐", name: "별" },
  { value: "🍎", picture: "🍎", name: "사과" },
  { value: "🚲", picture: "🚲", name: "자전거" },
  { value: "🌈", picture: "🌈", name: "무지개" },
  { value: "⚽", picture: "⚽", name: "축구공" },
  { value: "🌙", picture: "🌙", name: "달" },
  { value: "꽃", picture: "🌸", name: "꽃" },
  { value: "집", picture: "🏠", name: "집" },
  { value: "로켓", picture: "🚀", name: "로켓" },
  { value: "풍선", picture: "🎈", name: "풍선" },
] as const;
/* 입장은 선생님 명단의 번호로만 한다(2026-09-07 사용자 결정). 아이가 스스로 프로필을
 * 만들던 "새로 시작하기 / 내 그림 이어가기" 갈림길은 없앴다. */
type Mode = "checking" | "seat" | "noRoster" | "join" | "recover" | "legacyRecover";
type MobileStep = 1 | 2 | 3;

export function JoinClient({ initialEntry = "", recoveryToken = "" }: { initialEntry?: string; recoveryToken?: string }) {
  const [mode, setMode] = useState<Mode>(recoveryToken ? "legacyRecover" : "checking");
  const [classroomName, setClassroomName] = useState("");
  /* 선생님이 명단을 만든 학급은 번호가 곧 신원이다. 명단 자체는 서버가 주지 않으므로
   * 아이가 자기 번호만 입력한다 — 수업 코드를 아는 사람에게 반 전체 이름이 새지 않는다. */
  const [hasRoster, setHasRoster] = useState(false);
  const [seatInput, setSeatInput] = useState("");
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [nickname, setNickname] = useState(NICKNAME_IDEAS["🐰"][0]);
  const [animal, setAnimal] = useState("🐰");
  const [pictures, setPictures] = useState<string[]>([]);
  const [mobileStep, setMobileStep] = useState<MobileStep>(1);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<EntryErrorKind | "">("");
  const [teacherCallOpen, setTeacherCallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nicknameAuto, setNicknameAuto] = useState(true);
  const animalButtonRef = useRef<HTMLButtonElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const pictureButtonRef = useRef<HTMLButtonElement>(null);
  const entry = initialEntry;
  const targetLength = PICTURE_PASSWORD_LENGTH;

  useEffect(() => {
    setPictures([]); setError(""); setErrorKind(""); setTeacherCallOpen(false); setMobileStep(1);
    if (recoveryToken) { setMode("legacyRecover"); return; }
    if (!initialEntry) { location.replace("/"); return; }
    void checkEntry();
  // checkEntry only reads the two stable entry props. Keeping it outside this dependency list
  // prevents a status response from retriggering itself through mode changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry, recoveryToken]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || recoveryToken || !initialEntry) return;
      setPictures([]); setMobileStep(1); setMode("checking"); void checkEntry();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry, recoveryToken]);

  async function checkEntry() {
    setBusy(true); setError(""); setErrorKind(""); setTeacherCallOpen(false);
    try {
      const response = await fetch("/api/student", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "entryStatus", entry }), cache: "no-store" });
      const data = await readStudentEntryResponse(response);
      if (!response.ok) {
        setErrorKind(response.status === 404 ? "code" : "general");
        throw new StudentEntryResponseError(data.error ?? "수업을 확인하지 못했어요.");
      }
      setClassroomName(data.classroomName ?? "우리 반");
      setHasRoster(Boolean(data.hasRoster));
      setSeatInput(""); setSeatNumber(null);
      // 명단이 없으면 아이가 할 수 있는 일이 없다. 선생님을 부르도록 안내한다.
      setMode(data.hasRoster ? "seat" : "noRoster");
    } catch (cause) {
      setError(cause instanceof StudentEntryResponseError ? cause.message : "수업을 확인하는 중 연결이 끊겼어요. 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  async function checkSeat() {
    const parsed = Number(seatInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) { setError("번호를 다시 확인해 주세요."); setErrorKind("general"); return; }
    setBusy(true); clearEntryError();
    try {
      const response = await fetch("/api/student", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "seatStatus", entry, seatNumber: parsed }), cache: "no-store" });
      const data = await readStudentEntryResponse(response);
      if (!response.ok) { setErrorKind("general"); throw new StudentEntryResponseError(data.error ?? "번호를 확인하지 못했어요."); }
      setSeatNumber(parsed);
      setPictures([]); setMobileStep(1);
      // 처음이면 동물·별명·그림 비밀번호를 고르고, 그다음부터는 그림 비밀번호만 확인한다.
      setMode(data.firstTime ? "join" : "recover");
      requestAnimationFrame(() => window.scrollTo(0, 0));
    } catch (cause) {
      setError(cause instanceof StudentEntryResponseError ? cause.message : "번호를 확인하는 중 연결이 끊겼어요.");
    } finally { setBusy(false); }
  }

  function backToSeat() {
    clearEntryError(); setPictures([]); setMobileStep(1); setSeatNumber(null); setMode("seat");
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function clearEntryError() {
    setError(""); setErrorKind(""); setTeacherCallOpen(false);
  }


  function goToStep(nextStep: MobileStep) {
    setMobileStep(nextStep);
    requestAnimationFrame(() => {
      if (nextStep === 1) animalButtonRef.current?.focus();
      else if (nextStep === 2) nicknameInputRef.current?.focus();
      else pictureButtonRef.current?.focus();
    });
  }

  function appendPicture(value: string) {
    clearEntryError();
    setPictures((current) => current.length < targetLength ? [...current, value] : current);
  }

  function removeLastPicture() {
    clearEntryError();
    setPictures((current) => current.slice(0, -1));
  }

  function resetPictures() {
    clearEntryError();
    setPictures([]);
  }

  function pictureFor(value: string) {
    return PICTURES.find((item) => item.value === value)?.picture ?? value;
  }

  function pictureNameFor(value: string) {
    return PICTURES.find((item) => item.value === value)?.name ?? value;
  }

  function suggestNickname() {
    const ideas = NICKNAME_IDEAS[animal] ?? [FALLBACK_NICKNAME];
    setNickname(pickDifferentNickname(ideas, nickname, Math.random()));
    setNicknameAuto(true);
    clearEntryError();
  }

  function picturePasswordPicker({ numbered = false, showSlots = true }: { numbered?: boolean; showSlots?: boolean } = {}) {
    const creating = mode === "join";
    const chipsFull = pictures.length >= targetLength;
    const legendLabel = numbered ? "3️⃣ 그림 비밀번호" : creating ? "그림 비밀번호 만들기" : "내 그림 비밀번호";
    return <fieldset className="picture-password-picker"><legend>{legendLabel} <small>{pictures.length}/{targetLength}</small></legend><div className="picture-password-help"><p className="helper">{creating ? `같은 그림도 괜찮아요. 순서대로 ${targetLength}개 골라요.` : "만들 때 고른 순서 그대로 눌러요."}</p></div>{showSlots && <div className="password-slots" aria-label={`고른 그림 ${pictures.length}개`}>{Array.from({ length: targetLength }, (_, index) => <span className={pictures[index] ? "filled" : ""} key={index}>{pictures[index] ? pictureFor(pictures[index]) : "?"}</span>)}</div>}<div className="picture-choice-grid" role="group" aria-label={`그림 비밀번호 고르기. 현재 ${pictures.length}/${targetLength}개를 골랐어요. 같은 그림을 여러 번 고를 수 있어요.`}>{PICTURES.map((item, index) => <button ref={index === 0 ? pictureButtonRef : undefined} type="button" className="picture-chip" aria-label={chipsFull ? `${item.name} 그림. 이미 ${targetLength}개를 다 골랐어요. 바꾸려면 다시 골라요를 눌러요.` : `${item.name} 그림 추가. 현재 ${pictures.length}/${targetLength}개 선택. 같은 그림도 다시 고를 수 있어요.`} key={item.value} onClick={() => appendPicture(item.value)}><span aria-hidden="true">{item.picture}</span><small aria-hidden="true">{item.name}</small></button>)}</div><div className="password-actions"><button type="button" className={`reset-pictures-button${errorKind === "password" ? " attention" : ""}`} disabled={!pictures.length} aria-label={`고른 그림 ${targetLength}칸 모두 지우고 다시 고르기`} onClick={resetPictures}><span aria-hidden="true">🔄</span> 다시 골라요</button><button type="button" className="small-button" disabled={!pictures.length} aria-label={`마지막 그림 한 칸 지우기. 현재 ${pictures.length}개 선택.`} onClick={removeLastPicture}>↩️ 한 칸 지우기</button></div></fieldset>;
  }


  function errorNotice() {
    if (!error) return null;
    return <div className="entry-error-block">
      <div className="error-box child-error" role="alert"><span className="child-error-icon" aria-hidden="true">⚠️</span><p>{error}</p></div>
      {errorKind === "code" && !teacherCallOpen && <button type="button" className="button secondary full teacher-call-button" onClick={() => setTeacherCallOpen(true)}><span aria-hidden="true">🙋</span>선생님 불러요</button>}
      {errorKind === "code" && teacherCallOpen && <div className="teacher-call-note" role="status"><span className="teacher-call-emoji" aria-hidden="true">🙋</span><p>손을 들고 선생님을 불러요.<br />수업 코드를 다시 알려 주실 거예요.</p></div>}
    </div>;
  }

  async function submit() {
    clearEntryError(); setBusy(true);
    const action = mode === "join" ? "join" : "recover";
    let failureKind: EntryErrorKind = "general";
    try {
      const seat = seatNumber === null ? {} : { seatNumber };
      const payload = action === "join"
        ? { action, entry, nickname, animal, picturePassword: pictures, ...seat }
        : recoveryToken ? { action, personalQrToken: recoveryToken } : { action, entry, nickname, animal, picturePassword: pictures, ...seat };
      const response = await fetch("/api/student", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
      failureKind = classifyEntryError({ status: response.status, action, hasPersonalQrToken: Boolean(recoveryToken) });
      const data = await readStudentEntryResponse(response);
      if (!response.ok || !data.student || !data.deviceToken || !data.expiresAt) throw new StudentEntryResponseError(data.error ?? "입장할 수 없어요.");
      storeProfile({ studentId: data.student.id, nickname: data.student.nickname, animal: data.student.animal, classroomName: data.student.classroomName, deviceToken: data.deviceToken, expiresAt: data.expiresAt });
      location.replace("/student");
    } catch (cause) {
      setError(cause instanceof StudentEntryResponseError ? cause.message : "입장 중 연결을 확인하지 못했어요. 잠시 뒤 다시 해 주세요.");
      setErrorKind(failureKind);
    } finally { setBusy(false); }
  }

  if (mode === "checking") {
    return <main className="entry-shell"><div className="entry-top"><Logo /></div><section className="entry-card entry-check-card"><div className="entry-title-row"><div><p className="eyebrow">수업에 들어가요</p><h1>{error ? "수업을 찾지 못했어요" : "우리 반을 확인하고 있어요"}</h1></div>{error && <SpeakButton text="수업 코드를 확인하지 못했어요. 화면의 안내를 보고 다시 시도하거나 선생님을 불러요." />}</div>{error ? <>{errorNotice()}<button type="button" className="button primary full" disabled={busy} onClick={() => void checkEntry()}>{busy ? "확인 중…" : "다시 확인하기"}</button><a className="text-button" href="/">수업 코드 다시 입력하기</a></> : <div className="entry-loading" role="status"><span aria-hidden="true">🎨</span><b>잠깐만 기다려 주세요</b></div>}</section></main>;
  }

  if (mode === "seat") {
    return <main className="entry-shell"><div className="entry-top"><Logo /><span>{classroomName}</span></div>
      <section className="entry-card seat-card">
        <div className="entry-title-row"><div><p className="eyebrow">{classroomName}</p><h1>내 번호를 눌러요</h1></div><SpeakButton text="선생님이 알려 준 내 번호를 눌러요. 다 눌렀으면 들어가기를 눌러요." /></div>
        <form onSubmit={(event) => { event.preventDefault(); void checkSeat(); }}>
          <label className="seat-input-label" htmlFor="seat-number">우리 반에서 내 번호</label>
          <input
            id="seat-number"
            className="seat-input"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={2}
            value={seatInput}
            aria-label="내 번호"
            onChange={(event) => { setSeatInput(event.target.value.replace(/[^0-9]/g, "").slice(0, 2)); clearEntryError(); }}
          />
          {errorNotice()}
          <button className="button primary full child-primary-action" disabled={busy || !seatInput}><span aria-hidden="true">▶️</span>{busy ? "확인 중…" : "들어가기"}</button>
        </form>
        <a className="text-button" href="/">수업 코드 다시 입력하기</a>
      </section></main>;
  }

  if (mode === "noRoster") {
    return <main className="entry-shell"><div className="entry-top"><Logo /><span>{classroomName}</span></div>
      <section className="entry-card entry-check-card">
        <div className="entry-title-row"><div><p className="eyebrow">{classroomName}</p><h1>아직 준비 중이에요</h1></div><SpeakButton text="선생님이 우리 반 명단을 아직 넣지 않았어요. 선생님을 불러 주세요." /></div>
        <p className="helper">선생님이 우리 반 명단을 넣으면 내 번호로 들어올 수 있어요.</p>
        <button type="button" className="button primary full child-primary-action" disabled={busy} onClick={() => void checkEntry()}><span aria-hidden="true">🔄</span>{busy ? "확인 중…" : "다시 확인하기"}</button>
        <a className="text-button" href="/">수업 코드 다시 입력하기</a>
      </section></main>;
  }

  if (mode === "legacyRecover") {
    return <main className="entry-shell"><div className="entry-top"><Logo /></div><section className="entry-card"><div className="entry-title-row"><div><p className="eyebrow">내 그림을 찾아요</p><h1>다시 만나서 반가워!</h1></div><SpeakButton text="화면 아래의 내 그림 찾기 버튼을 눌러요." /></div><p className="helper">안전하게 내 그림을 찾고 있어요.</p>{errorNotice()}<button className="button primary full child-primary-action" disabled={busy} onClick={() => void submit()}><span aria-hidden="true">▶️</span>{busy ? "찾는 중…" : "내 그림 찾기"}</button></section></main>;
  }

  const creating = mode === "join";
  /* 번호로 들어온 재입장은 그림 비밀번호만 확인한다. 번호가 이미 한 사람을 가리키므로
   * 동물·별명을 다시 묻지 않는다 — 아이가 별명을 잊어도 자기 그림으로 돌아올 수 있다. */
  const seatRecover = seatNumber !== null && !creating;
  const pageInstruction = seatRecover
    ? `${seatNumber}번이 맞으면 그림 비밀번호 세 개를 순서대로 골라요. 모두 고르면 내 그림 이어가기를 눌러요.`
    : creating
    ? "내 동물을 고르고, 그림 별명을 정한 다음, 그림 비밀번호 세 개를 순서대로 골라요. 모두 고르면 이 모습으로 수업 들어가기를 눌러요."
    : "전에 고른 동물과 그림 별명을 선택하고, 그림 비밀번호 세 개를 같은 순서로 골라요. 모두 고르면 내 그림 이어가기를 눌러요.";

  return <main className="entry-shell entry-join-shell"><div className="entry-top entry-join-top"><Logo /></div><section className={`entry-card join-card ${creating ? "join-create" : "join-recover"}${seatRecover ? " join-seat-recover" : ""}`} data-mobile-step={seatRecover ? 3 : mobileStep}>
    <div className="entry-title-row"><div><p className="eyebrow">{seatNumber !== null ? `${seatNumber}번` : creating ? "수업에 들어가요" : "내 그림을 찾아요"}</p><h1>{seatRecover ? "내 그림 비밀번호" : creating ? "나만의 꼬마 화가를 만들어요" : "내 꼬마 화가를 찾아요"}</h1><p className="join-subtitle">{seatRecover ? "그림 세 개를 순서대로 골라요." : creating ? "세 가지만 고르면 바로 그림 수업에 들어갈 수 있어요." : "전에 고른 세 가지를 입력하면 어느 태블릿에서나 이어갈 수 있어요."}</p></div><SpeakButton text={pageInstruction} /></div>
    <button type="button" className="entry-mode-back" onClick={backToSeat}>← 번호 다시 입력하기</button>
    <div className="mobile-entry-progress" aria-label={`입장 ${mobileStep}단계 / 3단계`}><span className={mobileStep >= 1 ? "active" : ""}>1 동물</span><span className={mobileStep >= 2 ? "active" : ""}>2 별명</span><span className={mobileStep >= 3 ? "active" : ""}>3 비밀번호</span></div>
    <div className="join-card-body">
      <div className="join-preview"><img src="/brand/student-entry-arch.png" alt="" aria-hidden="true" /><div className="join-preview-card" role="status" aria-live="polite" aria-label={`선택한 동물 ${ANIMAL_NAMES[animal]}, 별명 ${nickname || "꼬마 화가"}, 그림 비밀번호 ${pictures.length}/${targetLength}개: ${pictures.length ? pictures.map((value, index) => `${index + 1}번째 ${pictureNameFor(value)}`).join(", ") : "아직 없음"}`}><span className="join-preview-animal" data-animal-index={ANIMALS.indexOf(animal)} aria-hidden="true" /><b aria-hidden="true">{nickname || "꼬마 화가"}</b><span className="join-preview-password-title" aria-hidden="true">그림 비밀번호</span><div className="join-preview-slots" aria-hidden="true">{Array.from({ length: targetLength }, (_, index) => <span className={pictures[index] ? "filled" : ""} key={index}><i>{pictures[index] ? pictureFor(pictures[index]) : "?"}</i></span>)}</div></div></div>
      <div className="join-controls">
        <div className={`join-step join-step-1${mobileStep === 1 ? " active" : ""}`}><fieldset><legend>1️⃣ 내 동물</legend><div className="animal-choice-grid">{ANIMALS.map((value, index) => <button ref={index === 0 ? animalButtonRef : undefined} type="button" aria-pressed={animal === value} aria-label={`${ANIMAL_NAMES[value]} 고르기`} className={animal === value ? "emoji-chip selected" : "emoji-chip"} key={value} onClick={() => { if (nicknameAuto) setNickname(NICKNAME_IDEAS[value]?.[0] ?? "꼬마 화가"); setAnimal(value); clearEntryError(); }}><span className="animal-choice-portrait" data-animal-index={index} aria-hidden="true" /><small>{ANIMAL_NAMES[value]}</small></button>)}</div></fieldset><button type="button" className="button primary mobile-step-next" onClick={() => goToStep(2)}>별명 고르기 →</button></div>
        <div className={`join-step join-step-2${mobileStep === 2 ? " active" : ""}`}><label><span>2️⃣ 그림 별명</span><div className="nickname-row"><input ref={nicknameInputRef} maxLength={16} value={nickname} onChange={(event) => { setNickname(event.target.value); setNicknameAuto(false); clearEntryError(); }} placeholder="예: 토끼 화가" /><button type="button" onClick={suggestNickname}>🎲 다른 별명</button></div></label><div className="mobile-step-actions"><button type="button" className="button ghost" onClick={() => goToStep(1)}>← 동물</button><button type="button" className="button primary" disabled={nickname.trim().length < 2} onClick={() => goToStep(3)}>비밀번호 고르기 →</button></div></div>
        <div className={`join-step join-step-3${mobileStep === 3 ? " active" : ""}`}>{picturePasswordPicker({ numbered: true, showSlots: false })}<button type="button" className="button ghost mobile-step-back" onClick={() => goToStep(2)}>← 별명 다시 보기</button></div>
      </div>
    </div>
    {errorNotice()}
    <button className="button primary full child-primary-action" disabled={busy || nickname.trim().length < 2 || pictures.length !== targetLength} onClick={() => void submit()}><span aria-hidden="true">▶️</span>{busy ? (creating ? "들어가는 중…" : "찾는 중…") : creating ? "이 모습으로 수업 들어가기" : "내 그림 이어가기"}</button>
    <p className="join-privacy-note">이름이나 학교 대신 동물과 그림 비밀번호로 안전하게 들어가요.</p>
  </section></main>;
}
