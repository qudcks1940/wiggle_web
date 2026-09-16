"use client";

import { KeyboardEvent, PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { hexToHsv, hsvToHex } from "@/lib/color";
import { useModalDialog } from "./useModalDialog";

// 무지개 버튼으로 여는 상세 색 고르기(2026-09-09 사용자 요청).
// 밝기·진하기 면 + 무지개(색상) 슬라이더 + 고운 색 모음. 고른 색은 「이 색으로 그리기」를 눌러야 적용된다.
export const MORE_PALETTE = [
  "#000000", "#455A64", "#9AA7B1", "#D7DEE3",
  "#5D4037", "#795548", "#A1887F", "#D7CCC8", "#F5E0C3", "#FFE0B2",
  "#B71C1C", "#FF7043", "#C0CA33", "#00897B", "#80CBC4", "#26C6DA",
  "#64B5F6", "#3949AB", "#7E57C2", "#EC407A", "#F8BBD0", "#FFF0A6",
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function ColorPickerDialog({ color, names, onPick, onClose }: { color: string; names: Record<string, string>; onPick: (hex: string) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  useModalDialog(dialogRef, onClose, true);
  const [[h, s, v], setHsv] = useState(() => hexToHsv(color));
  const hex = hsvToHex(h, s, v);

  function pickAt(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHsv([h, clamp01((event.clientX - rect.left) / rect.width), 1 - clamp01((event.clientY - rect.top) / rect.height)]);
  }
  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = 0.05;
    const next: Record<string, [number, number, number]> = {
      ArrowLeft: [h, clamp01(s - step), v], ArrowRight: [h, clamp01(s + step), v],
      ArrowUp: [h, s, clamp01(v + step)], ArrowDown: [h, s, clamp01(v - step)],
    };
    if (!next[event.key]) return;
    event.preventDefault();
    setHsv(next[event.key]);
  }

  return <div className="modal-backdrop" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="color-picker-title">
    <section className="reflection-modal color-picker-modal">
      <h2 id="color-picker-title">🎨 색을 골라요</h2>
      <div className="color-picker-body">
        <div
          ref={areaRef}
          className="color-picker-area"
          style={{ background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${Math.round(h)} 100% 50%))` }}
          tabIndex={0}
          aria-label="밝기와 진하기 고르기. 화살표 키로도 움직여요."
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pickAt(event); }}
          onPointerMove={(event) => { if (event.buttons) pickAt(event); }}
          onKeyDown={nudge}
        >
          <i className="color-picker-dot" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex }} aria-hidden="true" />
        </div>
        <label className="color-picker-hue">
          <span>무지개</span>
          <input type="range" min={0} max={360} value={Math.round(h)} onChange={(event) => setHsv([Number(event.target.value), s, v])} aria-label="무지개 색 고르기" />
        </label>
        <div className="color-picker-preview" role="status" aria-live="polite"><i style={{ background: hex }} aria-hidden="true" /><b>{names[hex] ?? "고른 색"}</b></div>
        <div className="color-picker-swatches" role="group" aria-label="고운 색 모음">
          {MORE_PALETTE.map((value) => <button type="button" key={value} style={{ background: value }} aria-label={names[value] ?? value} title={names[value]} aria-pressed={hex === value} onClick={() => setHsv(hexToHsv(value))} />)}
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>닫기</button>
        <button type="button" className="button primary" onClick={() => onPick(hex)}>이 색으로 그리기</button>
      </div>
    </section>
  </div>;
}
