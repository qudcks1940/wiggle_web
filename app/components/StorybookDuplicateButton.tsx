"use client";
import { useRef, useState } from "react";
import { storybookEditorFetch } from "@/lib/storybook-editor-fetch";

export function StorybookDuplicateButton({ bookId, classroomId, disabled, onCopied }: { bookId: string; classroomId?: string; disabled?: boolean; onCopied?: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false), copyId = useRef<string | null>(null);
  async function copy() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    copyId.current ??= `storybook_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      const response = await storybookEditorFetch(`${classroomId ? "/api/teacher/book-editor" : "/api/storybooks"}/${bookId}/duplicate`, { method: "POST", body: JSON.stringify({ copyId: copyId.current }) });
      const data = await response.json() as { storybook?: { id: string }; error?: string };
      if (!response.ok || !data.storybook) throw new Error(data.error ?? "복제하지 못했어요. 다시 눌러 주세요.");
      onCopied?.();
      location.href = classroomId ? `/teacher/class/${classroomId}/books/${data.storybook.id}/edit` : `/student/books/${data.storybook.id}`;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "복제하지 못했어요."); setBusy(false); pending.current = false; }
  }
  return <div className="storybook-copy-action"><button type="button" className="small-button" disabled={busy || disabled} onClick={() => void copy()}>{busy ? "복제하는 중…" : "전체 복제"}</button>{error && <p className="error-box" role="alert">{error}</p>}</div>;
}
