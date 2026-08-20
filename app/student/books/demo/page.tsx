import { StorybookDemoBootstrap } from "@/app/components/dev-only/StorybookDemoBootstrap";
import { runtimeEnvironment, runtimePolicy } from "@/lib/runtime/environment";

export default function StorybookDemoPage() {
  if (!runtimePolicy(runtimeEnvironment()).allowsLocalDevelopmentFeatures) return <main className="app-shell"><p className="error-box">로컬 체험에서만 사용할 수 있어요.</p></main>;
  return <StorybookDemoBootstrap />;
}
