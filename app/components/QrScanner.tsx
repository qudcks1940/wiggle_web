"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { useModalDialog } from "./useModalDialog";

/**
 * 앱 안 QR 찍기 (2026-09-13).
 *
 * 태블릿 기본 카메라 앱으로 찍어도 입장 주소가 열리지만, 저학년은 앱을 오가다 길을 잃는다.
 * 그래서 입장 화면 안에서 바로 찍는다.
 *
 * 해석은 `jsqr` 한 경로다. 브라우저 내장 `BarcodeDetector`는 아이패드 사파리에 없어서
 * 핵심 기기에서 동작하지 않는다. 결과 글자는 부르는 쪽이 `parseEntryQr`로 검증한다 —
 * 이 컴포넌트는 글자만 넘기고 주소를 따라가지 않는다.
 */
export function QrScanner({ onResult, onClose, hint = "QR을 네모 안에 보여 줘" }: {
  onResult: (text: string) => void;
  onClose: () => void;
  hint?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState("");
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);
  const resultRef = useRef(onResult);
  useEffect(() => { resultRef.current = onResult; }, [onResult]);

  const close = useCallback(() => onClose(), [onClose]);
  useModalDialog(dialogRef, close, true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const stop = () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const scan = () => {
      const video = videoRef.current;
      if (cancelled || doneRef.current || !video || !context) return;
      if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth) {
        // 원본 해상도로 풀면 태블릿에서 프레임마다 무겁다. 긴 변 640px로 줄여도 인쇄 쪽지는 충분히 읽힌다.
        const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (found?.data) {
          doneRef.current = true;
          stop();
          resultRef.current(found.data);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    };

    (async () => {
      // getUserMedia는 보안 맥락(HTTPS·localhost)에서만 있다. 교실 태블릿이 내부 주소로 열면 없다.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setProblem("이 화면에서는 카메라를 쓸 수 없어요. 태블릿 카메라 앱으로 QR을 찍어 주세요.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) { stop(); return; }
        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = stream;
        await video.play();
        setReady(true);
        frame = requestAnimationFrame(scan);
      } catch (cause) {
        const name = (cause as DOMException)?.name;
        setProblem(name === "NotAllowedError" || name === "SecurityError"
          ? "카메라를 쓸 수 있게 허락해 주세요. 허락하지 않으면 코드를 눌러서 들어올 수 있어요."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "카메라를 찾지 못했어요. 코드를 눌러서 들어와 주세요."
            : "카메라를 켜지 못했어요. 코드를 눌러서 들어와 주세요.");
      }
    })();

    return () => { cancelled = true; stop(); };
  }, []);

  return <div className="qr-scanner-backdrop" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
    <section className="qr-scanner">
      <header className="qr-scanner-head">
        <h2 id="qr-scanner-title"><span aria-hidden="true">📷</span> QR 찍기</h2>
        <button type="button" className="qr-scanner-close" onClick={close} aria-label="QR 찍기 닫기">×</button>
      </header>
      {problem
        ? <div className="qr-scanner-problem" role="alert"><span aria-hidden="true">📷</span><p>{problem}</p></div>
        : <div className="qr-scanner-view">
            {/* iOS 사파리는 playsInline이 없으면 영상을 전체 화면으로 띄워 앱을 가린다. */}
            <video ref={videoRef} className="qr-scanner-video" playsInline muted autoPlay aria-hidden="true" />
            <div className="qr-scanner-frame" aria-hidden="true" />
            {!ready && <p className="qr-scanner-wait" role="status">카메라를 켜고 있어요…</p>}
          </div>}
      <p className="qr-scanner-hint">{problem ? "" : hint}</p>
      <button type="button" className="button secondary full qr-scanner-cancel" onClick={close}>코드 눌러서 들어갈래</button>
    </section>
  </div>;
}
