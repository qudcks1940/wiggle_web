import { StorybookDemoBootstrap } from "@/app/components/StorybookDemoBootstrap";

export default function StorybookDemoPage() {
  if (process.env.NODE_ENV === "production") return <main className="app-shell"><p className="error-box">로컬 체험에서만 사용할 수 있어요.</p></main>;
  return <StorybookDemoBootstrap />;
}
