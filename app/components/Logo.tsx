/* 브랜드 마크는 크레용 그림이다(2026-09-12 사용자 지정). 초록 바탕이 그림에 들어 있어
 * .brand-mark의 둥근 모서리·기울기와 그대로 어울린다. 옛 /brand/logo.png는 남겨 두되 쓰지 않는다. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return <a className="brand" href="/" aria-label="Wiggle 홈"><span className="brand-mark" aria-hidden="true"><img src="/brand/crayon-mark-128.png" alt="" /></span>{!compact && <span>Wiggle</span>}</a>;
}
