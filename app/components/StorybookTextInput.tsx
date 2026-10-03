"use client";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_STORYBOOK_TEXT, MAX_STORYBOOK_TEXT_GRAPHEMES, storybookAspectRatio, type StorybookElement, type StorybookFormat } from "@/lib/storybook-model";
import { fittedStoryText, storyTextLines, STORY_TEXT_LINE_HEIGHT } from "@/lib/storybook-text";

type Measure = (value: string, size: number) => number;
function createMeasure(): Measure {
  const context = document.createElement("canvas").getContext("2d");
  return (value, size) => {
    if (!context) return value.length * size;
    context.font = `${size}px StorybookText`;
    return context.measureText(value).width;
  };
}
export function StorybookTextInput({ element, format, interactive, onFocus, onChange, onFull }: { element: StorybookElement; format: StorybookFormat; interactive: boolean; onFocus?: () => void; onChange?: (text: string) => void; onFull?: () => void }) {
  const text = element.text === DEFAULT_STORYBOOK_TEXT ? "" : element.text ?? "";
  const [draft, setDraft] = useState(text), [measureText, setMeasureText] = useState<Measure | null>(null);
  const ready = !!measureText;
  const composing = useRef(false);
  useEffect(() => { void document.fonts.load('20px "StorybookText"').catch(() => {}).then(() => { const measure = createMeasure(); setMeasureText(() => measure); }); }, []);
  useEffect(() => { if (!composing.current) setDraft(text); }, [text]);
  function measure(value: string, size: number) {
    return measureText ? measureText(value, size) : value.length * size;
  }
  const width = 1024 * element.width - 4;
  const height = 1024 / storybookAspectRatio(format) * element.height - 4;
  const layout = ready ? fittedStoryText(text, (element.fontSize ?? .045) * 1024, width, height, measure) : { size: (element.fontSize ?? .045) * 1024, lines: [text] };
  function accept(value: string, target: HTMLTextAreaElement) {
    const normalized = value.normalize("NFC");
    if ([...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(normalized)].length > MAX_STORYBOOK_TEXT_GRAPHEMES || storyTextLines(normalized, width, v => measure(v, layout.size)).length * layout.size * STORY_TEXT_LINE_HEIGHT > height) {
      setDraft(text); target.value = text; target.scrollTop = 0; onFull?.(); return;
    }
    setDraft(normalized); onChange?.(normalized);
  }
  const lineCount = storyTextLines(interactive ? draft : text, width, v => measure(v, layout.size)).length;
  const spare = Math.max(0, height - lineCount * layout.size * STORY_TEXT_LINE_HEIGHT);
  const offset = element.verticalAlign === "top" ? 0 : element.verticalAlign === "bottom" ? spare : spare / 2;
  const style = { fontSize: `${layout.size / 1024 * 100}cqi`, lineHeight: STORY_TEXT_LINE_HEIGHT, textAlign: element.align ?? "left", paddingTop: `${(offset + 2) / 1024 * 100}cqi` };
  const label = element.textRole === "title" ? "이 쪽의 제목" : element.textRole === "credit" ? "글·그림 작가 이름" : element.textRole === "heading" ? "이 쪽의 머리말" : "이 쪽의 이야기";
  const placeholder = element.textRole === "credit" ? "글 / 그림  이름" : element.textRole === "title" ? "책 제목을 써 보세요" : element.textRole === "heading" ? "작가의 말" : DEFAULT_STORYBOOK_TEXT;
  if (!interactive) return <span className="storybook-inline-text" style={style}>{text}</span>;
  return <textarea aria-label={label} className="storybook-inline-text" style={style} value={draft} placeholder={placeholder} spellCheck={false} disabled={!ready} onFocus={onFocus} onClick={onFocus} onPointerDown={e => e.stopPropagation()} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={e => { composing.current = false; accept(e.currentTarget.value, e.currentTarget); }} onChange={e => { if (composing.current || (e.nativeEvent as InputEvent).isComposing) setDraft(e.target.value); else accept(e.target.value, e.target); }} />;
}
