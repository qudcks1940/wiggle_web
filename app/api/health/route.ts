import { bindings, ensureSchema } from "@/db/runtime";
import { assertHostedAuthenticationConfiguration, runtimeEnvironment } from "@/lib/runtime/environment";

function healthJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store, max-age=0", pragma: "no-cache" } });
}

export async function GET() {
  const environment = runtimeEnvironment();
  try {
    // bindings()가 환경-데이터 표식, DB URL, 저장소 자격증명 경계를 먼저 검증한다.
    bindings();
    assertHostedAuthenticationConfiguration(environment);
    await ensureSchema();
    return healthJson({ ok: true, environment });
  } catch (cause) {
    console.error(`[health:${environment}] runtime configuration failed`, cause);
    return healthJson({ ok: false, environment, error: "실행 환경 설정을 확인해 주세요." }, 503);
  }
}
