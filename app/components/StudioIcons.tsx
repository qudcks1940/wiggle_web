/* 그리기 화면 시안(`docs/design-assets/drawing-toolbar/`)이 지정한 아이콘 계약.
 * 시안 문서는 `lucide-react` 추가를 제안하지만, 이 저장소는 아이콘을 인라인 SVG로 그려 왔고
 * 필요한 모양이 10개뿐이라 패키지를 늘리지 않는다. 모양·이름·2px 둥근 선은 Lucide와 같게 맞췄다.
 * 모두 장식이므로 `aria-hidden`이며, 뜻은 감싸는 버튼의 `aria-label`이 전달한다.
 */
type IconProps = { className?: string; size?: number };

function Icon({ children, className, size = 22 }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}><path d="M19 12H5m7-7-7 7 7 7" /></Icon>
);
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}><path d="M20 6 9 17l-5-5" /></Icon>
);
export const Undo2Icon = (props: IconProps) => (
  <Icon {...props}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>
);
export const Redo2Icon = (props: IconProps) => (
  <Icon {...props}><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Icon>
);
export const EraserIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m7 21-4-4a2 2 0 0 1 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l4.8 4.8a2 2 0 0 1 0 2.8L12 21z" />
    <path d="M22 21H7M5 13l6 6" />
  </Icon>
);
export const MoreHorizontalIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></Icon>
);
export const Volume2Icon = (props: IconProps) => (
  <Icon {...props}><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M16 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></Icon>
);
export const ChevronUpIcon = (props: IconProps) => (
  <Icon {...props}><path d="m6 15 6-6 6 6" /></Icon>
);
export const MessageSquareIcon = (props: IconProps) => (
  <Icon {...props}><path d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></Icon>
);
export const SparklesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m11 3 1.9 4.6L17.5 9.5l-4.6 1.9L11 16l-1.9-4.6L4.5 9.5l4.6-1.9z" />
    <path d="M18.5 14.5 19.4 17l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z" />
  </Icon>
);
export const GripHorizontalIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="10" r="1.1" /><circle cx="12" cy="10" r="1.1" /><circle cx="16" cy="10" r="1.1" />
    <circle cx="8" cy="14" r="1.1" /><circle cx="12" cy="14" r="1.1" /><circle cx="16" cy="14" r="1.1" />
  </Icon>
);
