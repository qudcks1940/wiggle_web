"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useParams } from "next/navigation";
import { studentFetch } from "@/lib/client-session";
import { containedCropPlacement, type NormalizedRect } from "@/lib/image-cutout";
import { MAX_STORYBOOK_PAGES, type StorybookDocument, type StorybookElement, type StorybookPage } from "@/lib/storybook-model";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { ImageCutoutModal } from "./ImageCutoutModal";
import { Logo } from "./Logo";

type Asset = { id: string; storybookId: string; sourceType: "artwork" | "upload"; sourceArtworkId: string | null; contentType: string; byteSize: number; createdAt: string };
type Book = { id: string; title: string; document: StorybookDocument; revision: number; status: "draft" | "complete"; updatedAt: string };
type ArtworkChoice = { id: string; title: string; status: string };
type DragState = { mode: "move" | "resize"; elementId: string; startX: number; startY: number; initial: StorybookElement; stageWidth: number; stageHeight: number; remembered: boolean };
type CutoutTarget = { asset: Asset; elementId: string; pageIndex: number };

function clientId(prefix: "page" | "element") { return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`; }
function clonePage(page: StorybookPage): StorybookPage {
  return { ...page, id: clientId("page"), elements: page.elements.map((element) => ({ ...element, id: clientId("element") })) };
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function nextZ(page: StorybookPage) { return page.elements.reduce((max, element) => Math.max(max, element.zIndex), -1) + 1; }

async function imageFileToPng(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일을 골라 주세요.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 읽을 수 없어요.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

export function StorybookEditor() {
  const params = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [document, setDocument] = useState<StorybookDocument | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [artworks, setArtworks] = useState<ArtworkChoice[] | null>(null);
  const [addingAsset, setAddingAsset] = useState(false);
  const [cutoutTarget, setCutoutTarget] = useState<CutoutTarget | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<Book | null>(null);
  const documentRef = useRef<StorybookDocument | null>(null);
  const editGeneration = useRef(0);
  const savingRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const undoRef = useRef<StorybookDocument[]>([]);
  const redoRef = useRef<StorybookDocument[]>([]);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });

  useEffect(() => {
    const controller = new AbortController();
    void studentFetch(`/api/storybooks/${encodeURIComponent(params.id)}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json() as { storybook?: Book; assets?: Asset[]; error?: string };
      if (!response.ok || !data.storybook) throw new Error(data.error ?? "그림책을 불러오지 못했어요.");
      setBook(data.storybook); setDocument(data.storybook.document); setAssets(data.assets ?? []);
      bookRef.current = data.storybook; documentRef.current = data.storybook.document;
    }).catch((cause: unknown) => {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "그림책을 불러오지 못했어요.");
    });
    return () => controller.abort();
  }, [params.id]);

  useEffect(() => { bookRef.current = book; }, [book]);
  useEffect(() => { documentRef.current = document; }, [document]);
  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (saveState === "unsaved" || saveState === "saving") event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [saveState]);

  function scheduleSave() {
    editGeneration.current += 1;
    setSaveState("unsaved");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persist(false), 900);
  }

  function remember(current: StorybookDocument) {
    undoRef.current = [...undoRef.current.slice(-39), current];
    redoRef.current = [];
    setHistoryState({ undo: undoRef.current.length, redo: 0 });
  }

  function changeDocument(updater: (current: StorybookDocument) => StorybookDocument, record = true) {
    const current = documentRef.current;
    if (!current) return;
    if (record) remember(current);
    const next = updater(current);
    documentRef.current = next; setDocument(next);
    scheduleSave();
  }

  function undo() {
    const current = documentRef.current; const previous = undoRef.current.at(-1);
    if (!current || !previous) return;
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current.slice(-39), current];
    documentRef.current = previous; setDocument(previous); setPageIndex((value) => Math.min(value, previous.pages.length - 1)); setSelectedId(null); setHistoryState({ undo: undoRef.current.length, redo: redoRef.current.length }); scheduleSave();
  }

  function redo() {
    const current = documentRef.current; const next = redoRef.current.at(-1);
    if (!current || !next) return;
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current.slice(-39), current];
    documentRef.current = next; setDocument(next); setPageIndex((value) => Math.min(value, next.pages.length - 1)); setSelectedId(null); setHistoryState({ undo: undoRef.current.length, redo: redoRef.current.length }); scheduleSave();
  }

  async function persist(complete: boolean) {
    const currentBook = bookRef.current; const currentDocument = documentRef.current;
    if (!currentBook || !currentDocument) return;
    if (savingRef.current) {
      if (complete) saveTimer.current = window.setTimeout(() => void persist(true), 400);
      return;
    }
    savingRef.current = true; setSaveState("saving");
    const generation = editGeneration.current;
    try {
      const response = await studentFetch(`/api/storybooks/${encodeURIComponent(currentBook.id)}`, { method: "PUT", body: JSON.stringify({
        requestId: `save_${crypto.randomUUID().replaceAll("-", "")}`,
        expectedRevision: currentBook.revision, title: currentBook.title, document: currentDocument, complete,
      }) });
      const data = await response.json() as { revision?: number; status?: "draft" | "complete"; error?: string; code?: string };
      if (!response.ok || typeof data.revision !== "number") throw new Error(data.error ?? "그림책을 저장하지 못했어요.");
      const nextBook = { ...currentBook, revision: data.revision, status: data.status ?? currentBook.status };
      setBook(nextBook); bookRef.current = nextBook;
      setSaveState(generation === editGeneration.current ? "saved" : "unsaved");
      if (complete) { setPreviewPage(0); setPreviewOpen(true); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "그림책을 저장하지 못했어요."); setSaveState("error");
    } finally {
      savingRef.current = false;
      if (generation !== editGeneration.current) saveTimer.current = window.setTimeout(() => void persist(false), 350);
    }
  }

  function changeTitle(title: string) {
    setBook((current) => {
      if (!current) return current;
      const next = { ...current, title }; bookRef.current = next; return next;
    });
    scheduleSave();
  }

  const page = document?.pages[pageIndex];
  const selected = page?.elements.find((element) => element.id === selectedId) ?? null;
  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const selectedImageAsset = selected?.type === "image" && selected.assetId ? assetMap.get(selected.assetId) : undefined;

  function updateElement(elementId: string, patch: Partial<StorybookElement>, record = true) {
    changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, elements: value.elements.map((element) => element.id === elementId ? { ...element, ...patch } as StorybookElement : element) } : value) }), record);
  }

  function updateSelected(patch: Partial<StorybookElement>) {
    if (selectedId) updateElement(selectedId, patch);
  }

  function addText() {
    if (!page) return;
    const element: StorybookElement = { id: clientId("element"), type: "text", text: "여기에 이야기를 써 보세요", x: 0.1, y: 0.78, width: 0.8, height: 0.14, rotation: 0, zIndex: nextZ(page), opacity: 1, locked: false, fontSize: 0.045, color: "#24324A", align: "center" };
    changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, elements: [...value.elements, element] } : value) }));
    setSelectedId(element.id);
  }

  function addImageElement(asset: Asset) {
    if (!page) return;
    const element: StorybookElement = { id: clientId("element"), type: "image", assetId: asset.id, x: 0.12, y: 0.1, width: 0.76, height: 0.58, rotation: 0, zIndex: nextZ(page), opacity: 1, locked: false };
    changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, elements: [...value.elements, element] } : value) }));
    setSelectedId(element.id); setPickerOpen(false);
  }

  async function openArtworkPicker() {
    setPickerOpen(true);
    if (artworks) return;
    try {
      const response = await studentFetch("/api/artworks");
      const data = await response.json() as { artworks?: ArtworkChoice[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "내 그림을 불러오지 못했어요.");
      setArtworks((data.artworks ?? []).filter((artwork) => artwork.status === "complete"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "내 그림을 불러오지 못했어요."); }
  }

  async function importArtwork(artwork: ArtworkChoice) {
    if (addingAsset) return;
    setAddingAsset(true); setError("");
    try {
      const existing = assets.find((asset) => asset.sourceArtworkId === artwork.id);
      if (existing) { addImageElement(existing); return; }
      const response = await studentFetch(`/api/storybooks/${encodeURIComponent(params.id)}/assets`, { method: "POST", body: JSON.stringify({ sourceType: "artwork", artworkId: artwork.id }) });
      const data = await response.json() as { asset?: Asset; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "그림을 가져오지 못했어요.");
      setAssets((current) => [...current, data.asset!]); addImageElement(data.asset);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "그림을 가져오지 못했어요."); }
    finally { setAddingAsset(false); }
  }

  async function uploadFile(file: File | undefined) {
    if (!file || addingAsset) return;
    setAddingAsset(true); setError("");
    try {
      const dataUrl = await imageFileToPng(file);
      const response = await studentFetch(`/api/storybooks/${encodeURIComponent(params.id)}/assets`, { method: "POST", body: JSON.stringify({ sourceType: "upload", dataUrl }) });
      const data = await response.json() as { asset?: Asset; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "이미지를 올리지 못했어요.");
      setAssets((current) => [...current, data.asset!]); addImageElement(data.asset);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "이미지를 올리지 못했어요."); }
    finally { setAddingAsset(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function saveCutout(dataUrl: string, _aspectRatio: number, crop: NormalizedRect & { sourceAspectRatio: number }) {
    const target = cutoutTarget; const currentDocument = documentRef.current;
    if (!target || !currentDocument || addingAsset) return;
    setAddingAsset(true); setError("");
    try {
      const response = await studentFetch(`/api/storybooks/${encodeURIComponent(params.id)}/assets`, { method: "POST", body: JSON.stringify({ sourceType: "upload", dataUrl }) });
      const data = await response.json() as { asset?: Asset; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "오린 캐릭터를 저장하지 못했어요.");
      const stageRatio = currentDocument.format === "landscape" ? 4 / 3 : currentDocument.format === "portrait" ? 3 / 4 : 1;
      changeDocument((current) => ({ ...current, pages: current.pages.map((storyPage, index) => {
        if (index !== target.pageIndex) return storyPage;
        return { ...storyPage, elements: storyPage.elements.map((element) => {
          if (element.id !== target.elementId || element.type !== "image") return element;
          const placement = containedCropPlacement(element, stageRatio, crop.sourceAspectRatio, crop);
          return { ...element, assetId: data.asset!.id, ...placement };
        }) };
      }) }));
      setAssets((current) => [...current, data.asset!]); setCutoutTarget(null);
    } finally { setAddingAsset(false); }
  }

  function addPage() {
    if (!document || document.pages.length >= MAX_STORYBOOK_PAGES) return;
    const next: StorybookPage = { id: clientId("page"), background: "#FFFFFF", elements: [] };
    changeDocument((current) => ({ ...current, pages: [...current.pages, next] }));
    setPageIndex(document.pages.length); setSelectedId(null);
  }

  function duplicatePage() {
    if (!document || !page || document.pages.length >= MAX_STORYBOOK_PAGES) return;
    const copy = clonePage(page);
    changeDocument((current) => ({ ...current, pages: [...current.pages.slice(0, pageIndex + 1), copy, ...current.pages.slice(pageIndex + 1)] }));
    setPageIndex(pageIndex + 1); setSelectedId(null);
  }

  function deletePage() {
    if (!document || document.pages.length === 1) return;
    changeDocument((current) => ({ ...current, pages: current.pages.filter((_, index) => index !== pageIndex) }));
    setPageIndex(Math.max(0, pageIndex - 1)); setSelectedId(null);
  }

  function movePage(direction: -1 | 1) {
    if (!document) return;
    const destination = pageIndex + direction;
    if (destination < 0 || destination >= document.pages.length) return;
    changeDocument((current) => {
      const pages = [...current.pages];
      [pages[pageIndex], pages[destination]] = [pages[destination], pages[pageIndex]];
      return { ...current, pages };
    });
    setPageIndex(destination);
  }

  function sendSelectedToBack() {
    if (!selectedId) return;
    changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, elements: value.elements.map((element) => ({ ...element, zIndex: element.id === selectedId ? 0 : Math.min(10_000, element.zIndex + 1) })) } : value) }));
  }

  function deleteSelected() {
    if (!selectedId) return;
    changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, elements: value.elements.filter((element) => element.id !== selectedId) } : value) }));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected || !page) return;
    const copy = { ...selected, id: clientId("element"), x: clamp(selected.x + 0.03, 0, 1 - selected.width), y: clamp(selected.y + 0.03, 0, 1 - selected.height), zIndex: nextZ(page) };
    changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, elements: [...value.elements, copy] } : value) }));
    setSelectedId(copy.id);
  }

  function startDrag(event: ReactPointerEvent, element: StorybookElement, mode: "move" | "resize") {
    event.stopPropagation(); setSelectedId(element.id);
    if (element.locked || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    dragRef.current = { mode, elementId: element.id, startX: event.clientX, startY: event.clientY, initial: element, stageWidth: rect.width, stageHeight: rect.height, remembered: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.remembered && documentRef.current) { remember(documentRef.current); drag.remembered = true; }
    const dx = (event.clientX - drag.startX) / drag.stageWidth;
    const dy = (event.clientY - drag.startY) / drag.stageHeight;
    if (drag.mode === "move") updateElement(drag.elementId, { x: clamp(drag.initial.x + dx, 0, 1 - drag.initial.width), y: clamp(drag.initial.y + dy, 0, 1 - drag.initial.height) }, false);
    else updateElement(drag.elementId, { width: clamp(drag.initial.width + dx, 0.04, 1 - drag.initial.x), height: clamp(drag.initial.height + dy, 0.04, 1 - drag.initial.y) }, false);
  }

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (!selectedId) return;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelected(); }
    }
    window.addEventListener("keydown", keyDown); return () => window.removeEventListener("keydown", keyDown);
  });

  function renderElement(element: StorybookElement, interactive: boolean) {
    const imageAsset = element.type === "image" && element.assetId ? assetMap.get(element.assetId) : undefined;
    const className = `storybook-stage-element ${element.type} ${interactive && selectedId === element.id ? "selected" : ""} ${element.locked ? "locked" : ""}`;
    return <div key={element.id} className={className} onPointerDown={interactive ? (event) => startDrag(event, element, "move") : undefined} onPointerMove={interactive ? moveDrag : undefined} onPointerUp={interactive ? () => { dragRef.current = null; } : undefined} style={{ left: `${element.x * 100}%`, top: `${element.y * 100}%`, width: `${element.width * 100}%`, height: `${element.height * 100}%`, transform: `rotate(${element.rotation}deg)`, zIndex: element.zIndex, opacity: element.opacity, color: element.color, textAlign: element.align }}>
      {imageAsset ? <AuthenticatedImage src={`/api/storybooks/${params.id}/assets/${imageAsset.id}`} alt="그림책에 넣은 그림" /> : element.type === "text" ? <span style={{ fontSize: `${(element.fontSize ?? 0.045) * 100}cqi` }}>{element.text}</span> : <span>이미지 없음</span>}
      {interactive && selectedId === element.id && !element.locked && <button type="button" className="storybook-resize-handle" aria-label="크기 조절" onPointerDown={(event) => startDrag(event, element, "resize")} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }} />}
    </div>;
  }

  if (!book || !document || !page) return <main className="app-shell"><header className="app-header"><Logo /></header>{error ? <p className="error-box">{error}</p> : <div className="loading-card">그림책 작업실을 여는 중…</div>}</main>;

  return <main className="storybook-editor-shell">
    <header className="storybook-editor-header"><a className="small-button" href="/student/books">← 그림책</a><input aria-label="그림책 제목" maxLength={60} value={book.title} onChange={(event) => changeTitle(event.target.value)} onBlur={() => { if (!book.title.trim()) changeTitle("나의 그림책"); }} /><span className={`storybook-save-state ${saveState}`}>{saveState === "saving" ? "저장 중…" : saveState === "unsaved" ? "변경됨" : saveState === "error" ? "저장 확인 필요" : "✓ 저장됨"}</span><button type="button" className="button secondary" disabled={saveState === "saving"} onClick={() => void persist(false)}>저장</button><button type="button" className="button secondary" onClick={() => { setPreviewPage(pageIndex); setPreviewOpen(true); }}>미리보기</button><button type="button" className="button primary" disabled={saveState === "saving"} onClick={() => void persist(true)}>완성하기</button></header>
    {error && <p className="error-box storybook-editor-error" role="alert">{error}<button type="button" onClick={() => setError("")}>닫기</button></p>}
    <div className="storybook-editor-body">
      <aside className="storybook-page-rail" aria-label="그림책 쪽 목록">{document.pages.map((item, index) => <button type="button" className={index === pageIndex ? "active" : ""} key={item.id} onClick={() => { setPageIndex(index); setSelectedId(null); }}><span style={{ background: item.background }}>{item.elements.slice().sort((a, b) => a.zIndex - b.zIndex).map((element) => <i key={element.id} className={element.type} style={{ left: `${element.x * 100}%`, top: `${element.y * 100}%`, width: `${element.width * 100}%`, height: `${element.height * 100}%` }} />)}</span><b>{index + 1}</b></button>)}<button type="button" className="add-page" disabled={document.pages.length >= MAX_STORYBOOK_PAGES} onClick={addPage}>＋<span>쪽 추가</span></button></aside>
      <section className="storybook-workspace">
        <div className="storybook-toolbar" aria-label="그림책 도구"><button type="button" disabled={!historyState.undo} onClick={undo}>↶ 되돌리기</button><button type="button" disabled={!historyState.redo} onClick={redo}>↷ 다시하기</button><button type="button" onClick={addText}>T 글 넣기</button><button type="button" onClick={() => void openArtworkPicker()}>🎨 내 그림</button><button type="button" onClick={() => fileRef.current?.click()}>🖼️ 새 이미지</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => void uploadFile(event.target.files?.[0])} /><button type="button" disabled={pageIndex === 0} onClick={() => movePage(-1)}>← 쪽 이동</button><button type="button" disabled={pageIndex === document.pages.length - 1} onClick={() => movePage(1)}>쪽 이동 →</button><button type="button" onClick={duplicatePage}>쪽 복제</button><button type="button" disabled={document.pages.length === 1} onClick={deletePage}>쪽 삭제</button></div>
        <div className="storybook-stage-wrap"><div ref={stageRef} className={`storybook-stage format-${document.format}`} style={{ background: page.background }} onPointerDown={() => setSelectedId(null)}>{page.elements.slice().sort((a, b) => a.zIndex - b.zIndex).map((element) => renderElement(element, true))}</div></div>
        <p className="storybook-stage-help">요소를 끌어서 옮기고, 선택 테두리의 동그라미로 크기를 바꿔요.</p>
      </section>
      <aside className="storybook-inspector"><h2>{selected ? selected.type === "text" ? "글 꾸미기" : "그림 꾸미기" : "쪽 꾸미기"}</h2>{selected ? <>
        {selected.type === "text" && <><label>이야기<textarea maxLength={800} value={selected.text ?? ""} onChange={(event) => updateSelected({ text: event.target.value })} /></label><label>글자 크기<input type="range" min="0.018" max="0.12" step="0.002" value={selected.fontSize} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) })} /></label><label>글자 색<input type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value.toUpperCase() })} /></label><div className="storybook-align-buttons" aria-label="글 정렬"><button className={selected.align === "left" ? "active" : ""} onClick={() => updateSelected({ align: "left" })}>왼쪽</button><button className={selected.align === "center" ? "active" : ""} onClick={() => updateSelected({ align: "center" })}>가운데</button><button className={selected.align === "right" ? "active" : ""} onClick={() => updateSelected({ align: "right" })}>오른쪽</button></div></>}
        {selected.type === "image" && <section className="storybook-image-controls"><label>가로 크기 <b>{Math.round(selected.width * 100)}%</b><input aria-label="그림 가로 크기" type="range" min="0.08" max={Math.max(.08, 1 - selected.x)} step="0.01" value={selected.width} onInput={(event) => updateSelected({ width: Number(event.currentTarget.value) })} /></label><label>세로 크기 <b>{Math.round(selected.height * 100)}%</b><input aria-label="그림 세로 크기" type="range" min="0.08" max={Math.max(.08, 1 - selected.y)} step="0.01" value={selected.height} onInput={(event) => updateSelected({ height: Number(event.currentTarget.value) })} /></label><button type="button" className="button secondary full" onClick={() => updateSelected({ x: .05, y: .07, width: .9, height: .7 })}>쪽에 크게 맞추기</button><button type="button" className="button primary full cutout-open-button" disabled={!selectedImageAsset || addingAsset} onClick={() => { if (selectedImageAsset) setCutoutTarget({ asset: selectedImageAsset, elementId: selected.id, pageIndex }); }}>✂️ 캐릭터만 오리기</button><p>그림을 누르면 오른쪽 아래 동그라미로도 크기를 바꿀 수 있어요.</p></section>}
        <label>투명도<input type="range" min="0.05" max="1" step="0.05" value={selected.opacity} onChange={(event) => updateSelected({ opacity: Number(event.target.value) })} /></label><label>기울기<input type="range" min="-180" max="180" step="1" value={selected.rotation} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} /></label>
        <div className="storybook-layer-buttons"><button type="button" onClick={() => updateSelected({ zIndex: nextZ(page) })}>맨 앞으로</button><button type="button" onClick={sendSelectedToBack}>맨 뒤로</button><button type="button" onClick={duplicateSelected}>복제</button><button type="button" onClick={() => updateSelected({ locked: !selected.locked })}>{selected.locked ? "🔓 잠금 풀기" : "🔒 잠그기"}</button><button type="button" className="danger" onClick={deleteSelected}>삭제</button></div>
      </> : <><label>쪽 배경색<input type="color" value={page.background} onChange={(event) => changeDocument((current) => ({ ...current, pages: current.pages.map((value, index) => index === pageIndex ? { ...value, background: event.target.value.toUpperCase() } : value) }))} /></label><p>글이나 그림을 선택하면 위치, 크기, 색, 순서를 바꿀 수 있어요.</p></>}</aside>
    </div>

    {pickerOpen && <div className="storybook-modal-backdrop" role="presentation" onMouseDown={() => setPickerOpen(false)}><section className="storybook-picker-modal" role="dialog" aria-modal="true" aria-labelledby="artwork-picker-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">그대로 가져오기</p><h2 id="artwork-picker-title">완성한 내 그림</h2></div><button type="button" className="small-button" onClick={() => setPickerOpen(false)}>닫기</button></header>{artworks === null ? <div className="loading-card">내 그림을 찾는 중…</div> : artworks.length ? <div className="storybook-artwork-picker-grid">{artworks.map((artwork) => <button type="button" key={artwork.id} disabled={addingAsset} onClick={() => void importArtwork(artwork)}><AuthenticatedImage src={`/api/artworks/${artwork.id}/image`} alt={artwork.title} /><b>{artwork.title}</b><small>이 그림 넣기</small></button>)}</div> : <div className="empty-state">완성한 그림이 아직 없어요.<br /><a href="/student/activities" className="button secondary">그림 그리러 가기</a></div>}</section></div>}

    {cutoutTarget && <ImageCutoutModal sourceUrl={`/api/storybooks/${params.id}/assets/${cutoutTarget.asset.id}`} onClose={() => setCutoutTarget(null)} onSave={saveCutout} />}

    {previewOpen && <div className="storybook-preview" role="dialog" aria-modal="true" aria-label="그림책 미리보기"><header><b>{book.title}</b><button type="button" className="small-button" onClick={() => setPreviewOpen(false)}>편집으로 돌아가기</button></header><div className="storybook-preview-stage-wrap"><button type="button" aria-label="이전 쪽" disabled={previewPage === 0} onClick={() => setPreviewPage((value) => value - 1)}>‹</button><div key={document.pages[previewPage].id} className={`storybook-stage preview format-${document.format}`} style={{ background: document.pages[previewPage].background }}>{document.pages[previewPage].elements.slice().sort((a, b) => a.zIndex - b.zIndex).map((element) => renderElement(element, false))}</div><button type="button" aria-label="다음 쪽" disabled={previewPage === document.pages.length - 1} onClick={() => setPreviewPage((value) => value + 1)}>›</button></div><footer>{previewPage + 1} / {document.pages.length}</footer></div>}
  </main>;
}
