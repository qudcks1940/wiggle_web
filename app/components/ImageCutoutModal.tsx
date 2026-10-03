"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { opaqueBounds, removeConnectedColor, removeEdgeBackground, type NormalizedRect } from "@/lib/image-cutout";
import { storybookEditorFetch } from "@/lib/storybook-editor-fetch";

type Tool = "background" | "eraser" | "restore";

export function ImageCutoutModal({ sourceUrl, onClose, onSave }: {
  sourceUrl: string;
  onClose: () => void;
  onSave: (dataUrl: string, aspectRatio: number, crop: NormalizedRect & { sourceAspectRatio: number }) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLCanvasElement | null>(null);
  const paintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [canvasRatio, setCanvasRatio] = useState(1);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tool, setTool] = useState<Tool>("background");
  const [tolerance, setTolerance] = useState(48);
  const [brushSize, setBrushSize] = useState(56);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("그림을 불러오는 중…");
  const [error, setError] = useState("");

  function remember(image?: ImageData) {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const limit = Math.max(1, Math.min(6, Math.floor(16_000_000 / (canvas.width * canvas.height * 4))));
    undoRef.current = [...undoRef.current, image ?? context.getImageData(0, 0, canvas.width, canvas.height)].slice(-limit);
    setUndoCount(undoRef.current.length);
  }

  function undo() {
    if (saving || paintingRef.current) return;
    const image = undoRef.current.pop();
    if (image) canvasRef.current?.getContext("2d")?.putImageData(image, 0, 0);
    setUndoCount(undoRef.current.length); setError(""); setMessage("방금 지운 부분을 되돌렸어요.");
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await storybookEditorFetch(sourceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("선택한 그림을 불러오지 못했어요.");
        const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob);
        try {
          const image = new Image(); image.decoding = "async"; image.src = objectUrl; await image.decode();
          if (controller.signal.aborted) return;
          const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale)); const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const original = document.createElement("canvas"); original.width = width; original.height = height;
          original.getContext("2d")?.drawImage(image, 0, 0, width, height); originalRef.current = original;
          const canvas = canvasRef.current; if (!canvas) return;
          canvas.width = width; canvas.height = height; canvas.getContext("2d")?.drawImage(original, 0, 0);
          const context = canvas.getContext("2d")!;
          const before = context.getImageData(0, 0, width, height);
          const preview = context.getImageData(0, 0, width, height);
          const removed = removeEdgeBackground(preview, 48);
          if (removed && opaqueBounds(preview)) {
            undoRef.current = [before]; setUndoCount(1); context.putImageData(preview, 0, 0);
            setMessage("배경을 먼저 지워 봤어요. 체크무늬는 투명한 곳이에요. 마음에 들면 ‘이 그림 넣기’를 눌러요.");
          } else setMessage("남기고 싶은 그림은 그대로예요. 지울 배경을 누르거나 지우개로 문질러 주세요.");
          setCanvasRatio(width / height); setReady(true);
        } finally { URL.revokeObjectURL(objectUrl); }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "그림을 불러오지 못했어요.");
      }
    })();
    return () => controller.abort();
  }, [sourceUrl]);

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function paint(point: { x: number; y: number }) {
    const canvas = canvasRef.current; const original = originalRef.current; const context = canvas?.getContext("2d");
    if (!canvas || !context || !original || tool === "background") return;
    const radius = brushSize / 2, from = lastPointRef.current ?? point;
    const steps = Math.max(1, Math.ceil(Math.hypot(point.x - from.x, point.y - from.y) / (radius / 2)));
    context.save(); context.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const x = from.x + (point.x - from.x) * step / steps, y = from.y + (point.y - from.y) * step / steps;
      context.moveTo(x + radius, y); context.arc(x, y, radius, 0, Math.PI * 2);
    }
    context.clip();
    if (tool === "eraser") context.clearRect(0, 0, canvas.width, canvas.height);
    else context.drawImage(original, 0, 0);
    context.restore(); lastPointRef.current = point;
    setMessage(tool === "eraser" ? "문지른 부분을 지웠어요. 실수하면 ‘되돌리기’를 눌러요." : "문지른 부분을 다시 살렸어요.");
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!ready || saving) return;
    const point = canvasPoint(event); if (!point) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "background") {
      const context = canvasRef.current?.getContext("2d"); const canvas = canvasRef.current;
      if (!context || !canvas) return;
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const before = context.getImageData(0, 0, canvas.width, canvas.height);
      const removed = removeConnectedColor(image, point.x, point.y, tolerance);
      if (removed) remember(before);
      context.putImageData(image, 0, 0); setMessage(removed ? "누른 배경을 지웠어요. 다른 배경도 이어서 눌러 보세요." : "이 부분에서는 지울 배경을 찾지 못했어요.");
      return;
    }
    remember(); lastPointRef.current = null; paintingRef.current = true; paint(point);
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!paintingRef.current) return;
    const point = canvasPoint(event); if (point) paint(point);
  }

  function reset() {
    const canvas = canvasRef.current; const original = originalRef.current; const context = canvas?.getContext("2d");
    if (!canvas || !original || !context) return;
    remember();
    context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(original, 0, 0);
    setMessage("처음 그림으로 되돌렸어요."); setError("");
  }

  function removeEdges() {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const before = context.getImageData(0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const removed = removeEdgeBackground(image, tolerance);
    if (!opaqueBounds(image)) { setMessage("그림까지 지워질 수 있어 자동 지우기를 멈췄어요. 지울 배경을 직접 눌러 주세요."); return; }
    if (removed) { remember(before); context.putImageData(image, 0, 0); }
    setMessage(removed ? "그림 가장자리와 이어진 배경을 자동으로 지웠어요." : "자동으로 지울 배경을 찾지 못했어요. 배경을 직접 눌러 보세요.");
  }

  async function save() {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d");
    if (!canvas || !context || saving) return;
    const image = context.getImageData(0, 0, canvas.width, canvas.height); const bounds = opaqueBounds(image, Math.max(6, Math.round(Math.min(canvas.width, canvas.height) * .015)));
    if (!bounds) { setError("남아 있는 캐릭터가 없어요. ‘처음으로’를 누르고 다시 오려 주세요."); return; }
    const output = document.createElement("canvas"); output.width = bounds.width; output.height = bounds.height;
    output.getContext("2d")?.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    setSaving(true); setError("");
    try {
      await onSave(output.toDataURL("image/png"), output.width / output.height, {
        x: bounds.x / canvas.width,
        y: bounds.y / canvas.height,
        width: bounds.width / canvas.width,
        height: bounds.height / canvas.height,
        sourceAspectRatio: canvas.width / canvas.height,
      });
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "오린 캐릭터를 저장하지 못했어요."); setSaving(false); }
  }

  return <div className="storybook-modal-backdrop cutout-backdrop" role="presentation" onMouseDown={() => { if (!saving) onClose(); }}>
    <section ref={dialogRef} className="image-cutout-modal" role="dialog" aria-modal="true" aria-labelledby="cutout-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.stopPropagation(); undo(); }
      if (event.key === "Escape" && !saving) { event.stopPropagation(); onClose(); }
      if (event.key === "Tab") {
        const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),canvas[tabindex]') ?? [])];
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header><div><p className="eyebrow">1. 배경 확인 → 2. 필요한 곳 다듬기 → 3. 넣기</p><h2 id="cutout-title">배경 지우기</h2></div><button ref={closeRef} type="button" className="small-button" disabled={saving} onClick={onClose}>닫기</button></header>
      <div className="cutout-layout">
        <div className="cutout-canvas-wrap"><canvas ref={canvasRef} tabIndex={0} role="img" aria-label="캐릭터 오리기 작업 그림" style={{ "--cutout-ratio": canvasRatio } as CSSProperties} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { paintingRef.current = false; }} onPointerCancel={() => { paintingRef.current = false; }} /></div>
        <aside className="cutout-controls">
          <button type="button" className="button secondary full" disabled={!ready || saving} onClick={removeEdges}>✨ 배경 자동 지우기</button>
          <div className="cutout-tool-buttons" aria-label="오리기 도구">
            <button type="button" disabled={!ready || saving} aria-pressed={tool === "background"} onClick={() => setTool("background")}>🪄 배경 누르기</button>
            <button type="button" disabled={!ready || saving} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}>🧽 지우개</button>
            <button type="button" disabled={!ready || saving} aria-pressed={tool === "restore"} onClick={() => setTool("restore")}>🩹 다시 살리기</button>
          </div>
          {tool === "background" ? <label>배경을 지우는 힘 <b>{tolerance < 32 ? "약하게" : tolerance > 70 ? "강하게" : "보통"}</b><input aria-label="배경을 지우는 힘" disabled={!ready || saving} type="range" min="8" max="120" step="2" value={tolerance} onInput={(event) => setTolerance(Number(event.currentTarget.value))} /></label> : <label>붓 크기 <b>{brushSize}</b><input aria-label="오리기 붓 크기" disabled={!ready || saving} type="range" min="12" max="180" step="4" value={brushSize} onInput={(event) => setBrushSize(Number(event.currentTarget.value))} /></label>}
          <p>{tool === "background" ? "없애고 싶은 배경을 눌러요. 캐릭터와 이어지지 않은 비슷한 색은 남아요." : tool === "eraser" ? "필요 없는 부분을 손가락이나 마우스로 문질러 지워요." : "실수로 지운 캐릭터 부분을 문질러 다시 살려요."}</p>
          <div className="cutout-history"><button type="button" className="button secondary" disabled={!undoCount || saving} onClick={undo}>↶ 되돌리기</button><button type="button" className="button secondary" disabled={!ready || saving} onClick={reset}>처음으로</button></div>
        </aside>
      </div>
      <footer><p role="status">{error || message}</p><button type="button" className="button primary" disabled={!ready || saving} onClick={() => void save()}>{saving ? "그림을 넣는 중…" : "이 그림 넣기"}</button></footer>
    </section>
  </div>;
}
