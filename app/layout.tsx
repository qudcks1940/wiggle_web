import { PresenceHeartbeat } from "./components/PresenceHeartbeat";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { InputModeTracker } from "./components/InputModeTracker";

const title = "Wiggle — 함께 그리며 생각해요";
const description =
  "설치 없이 교실에서 기초 도형부터 자유 창작까지 이어지는 어린이 그림 학습 웹앱";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: { default: title, template: "%s | Wiggle" },
    description,
    icons: {
      // 브라우저 탭 아이콘은 크레용 그림이다(2026-09-12 사용자 지정). 32px에서도 읽히도록
      // 작은 크기는 크레용을 더 크게 잘라 따로 뽑았다. app_icon.png는 제품 앱 아이콘이라 그대로 둔다.
      icon: [
        { url: "/brand/crayon-icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/crayon-icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/brand/crayon-icon-32.png",
      apple: { url: "/brand/crayon-icon-180.png", sizes: "180x180", type: "image/png" },
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: new URL("/og.png", metadataBase), width: 1488, height: 1057, alt: "Wiggle Web 교실 그림 학습" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", metadataBase)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body><InputModeTracker /><PresenceHeartbeat />{children}</body>
    </html>
  );
}
