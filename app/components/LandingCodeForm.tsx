"use client";

import { useEffect, useRef, useState } from "react";
import { entryPathFor, parseEntryQr } from "@/lib/qr-entry";
import { QrScanner } from "./QrScanner";

const CODE_LENGTH = 4;

export function LandingCodeForm() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    function syncRestoredDigits() {
      const restored = inputRefs.current.map((input) => input?.value.replace(/[^0-9]/g, "").slice(0, 1) ?? "");
      if (!restored.some(Boolean)) return;
      setDigits((current) => restored.every((digit, index) => digit === current[index]) ? current : restored);
    }

    // Browsers can restore the visible values of separate code inputs after React has
    // hydrated them. Reconcile those values so a visibly complete code never leaves
    // the submit button disabled.
    const timers = [0, 100, 500].map((delay) => window.setTimeout(syncRestoredDigits, delay));
    window.addEventListener("pageshow", syncRestoredDigits);
    window.addEventListener("focus", syncRestoredDigits);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("pageshow", syncRestoredDigits);
      window.removeEventListener("focus", syncRestoredDigits);
    };
  }, []);

  function fillFrom(startIndex: number, value: string) {
    const chars = value.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH - startIndex).split("");
    if (!chars.length) return;
    setDigits((current) => {
      const next = [...current];
      chars.forEach((char, offset) => { next[startIndex + offset] = char; });
      return next;
    });
    const focusIndex = Math.min(startIndex + chars.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  function handleChange(index: number, rawValue: string) {
    const digitsOnly = rawValue.replace(/[^0-9]/g, "");
    if (!digitsOnly) {
      setDigits((current) => { const next = [...current]; next[index] = ""; return next; });
      return;
    }
    if (digitsOnly.length > 1) { fillFrom(index, digitsOnly); return; }
    setDigits((current) => { const next = [...current]; next[index] = digitsOnly; return next; });
    if (index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace" || digits[index] || index === 0) return;
    setDigits((current) => { const next = [...current]; next[index - 1] = ""; return next; });
    inputRefs.current[index - 1]?.focus();
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!/[0-9]/.test(pasted)) return;
    event.preventDefault();
    fillFrom(index, pasted);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const submittedDigits = inputRefs.current.map((input) => input?.value.replace(/[^0-9]/g, "").slice(0, 1) ?? "");
    const firstEmptyIndex = submittedDigits.findIndex((digit) => digit === "");
    if (firstEmptyIndex >= 0) {
      inputRefs.current[firstEmptyIndex]?.focus();
      return;
    }
    window.location.href = `/join?code=${submittedDigits.join("")}`;
  }

  // 반 QR이면 그 반 참여 코드 화면으로, 아이별 쪽지 QR이면 키패드 없이 바로 들어간다.
  function handleScan(text: string) {
    setScanning(false);
    const qr = parseEntryQr(text);
    if (!qr) { setScanError("Wiggle 수업 QR이 아니에요. 쪽지나 선생님 화면의 QR을 찍어 주세요."); return; }
    setScanError("");
    window.location.href = entryPathFor(qr);
  }

  return (
    <>
    <form className="landing-code-form" onSubmit={handleSubmit} aria-label="수업 코드로 입장">
      <div className="landing-code-boxes" role="group" aria-label="4자리 수업 코드">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            className="landing-code-box"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]"
            required
            autoComplete="off"
            maxLength={1}
            value={digit}
            aria-label={`수업 코드 ${index + 1}번째 숫자`}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
          />
        ))}
      </div>
      <button type="submit" className="button primary large full landing-code-submit">
        그리러 가기
      </button>
      <button type="button" className="button secondary full landing-qr-button" onClick={() => { setScanError(""); setScanning(true); }}>
        <span aria-hidden="true">📷</span>QR로 찍기
      </button>
      {scanError && <p className="landing-qr-error" role="alert">{scanError}</p>}
    </form>
    {scanning && <QrScanner onResult={handleScan} onClose={() => setScanning(false)} hint="쪽지나 선생님 화면의 QR을 네모 안에 보여 줘" />}
    </>
  );
}
