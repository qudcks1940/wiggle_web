/* 브랜드 마크는 손 흔드는 WIGGLE 마크다(2026-10-03 사용자 지정, 종전 크레용 그림 대체).
 * 그림에는 바탕이 없다 — .brand-mark가 그리는 초록 타일 위에 그대로 얹힌다.
 * 옛 /brand/logo.png·crayon-* 파일은 남겨 두되 쓰지 않는다. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return <a className="brand" href="/" aria-label="Wiggle 홈"><span className="brand-mark" aria-hidden="true"><img src="/brand/wiggle-mark-128.png" alt="" /></span>{!compact && <span>Wiggle</span>}</a>;
}
