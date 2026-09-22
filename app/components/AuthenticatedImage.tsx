"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { storybookEditorFetch } from "@/lib/storybook-editor-fetch";

export function AuthenticatedImage({ src, alt, className, onLoad, style }: { src: string; alt: string; className?: string; onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"]; style?: ImgHTMLAttributes<HTMLImageElement>["style"] }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl(""); setFailed(false);
    void storybookEditorFetch(src, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("image unavailable");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("invalid image");
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (url) return <img className={className} src={url} alt={alt} draggable={false} onLoad={onLoad} style={style} />;
  return <span className={className} role="img" aria-label={failed ? `${alt}을 불러오지 못했어요` : `${alt}을 불러오는 중`}>{failed ? "⚠️" : "🎨"}</span>;
}
