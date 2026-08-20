export const WIGGLE_RUNTIME_ENVIRONMENTS = ["local", "test", "preview", "production"] as const;

export type WiggleRuntimeEnvironment = (typeof WIGGLE_RUNTIME_ENVIRONMENTS)[number];
export type EnvironmentSource = Record<string, string | undefined>;

export type RuntimePolicy = {
  environment: WiggleRuntimeEnvironment;
  allowsLocalDevelopmentFeatures: boolean;
  requiresRemoteData: boolean;
  storagePrefix: string;
};

function clean(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function explicitEnvironment(source: EnvironmentSource): WiggleRuntimeEnvironment | null {
  const value = clean(source.WIGGLE_APP_ENV);
  if (!value) return null;
  if ((WIGGLE_RUNTIME_ENVIRONMENTS as readonly string[]).includes(value)) return value as WiggleRuntimeEnvironment;
  throw new Error(`WIGGLE_APP_ENV 값이 올바르지 않아요: ${value}`);
}

/**
 * NODE_ENV는 빌드 최적화 모드일 뿐 배포 대상을 뜻하지 않는다. Vercel Preview와
 * Production은 둘 다 production 빌드이므로 VERCEL_ENV를 먼저 신뢰한다.
 * WIGGLE_APP_ENV는 Vercel 밖의 로컬 검증과 테스트 하네스에서만 덮어쓴다.
 */
export function runtimeEnvironment(source: EnvironmentSource = process.env): WiggleRuntimeEnvironment {
  const vercelEnvironment = clean(source.VERCEL_ENV);
  if (vercelEnvironment === "production") return "production";
  if (vercelEnvironment === "development") return "local";
  if (vercelEnvironment) return "preview";
  if (clean(source.VERCEL)) return "preview";

  const explicit = explicitEnvironment(source);
  if (explicit) return explicit;
  if (clean(source.NODE_ENV) === "test") return "test";
  return "local";
}

export function runtimePolicy(environment: WiggleRuntimeEnvironment = runtimeEnvironment()): RuntimePolicy {
  return {
    environment,
    allowsLocalDevelopmentFeatures: environment === "local" || environment === "test",
    requiresRemoteData: environment === "preview" || environment === "production",
    // Production은 기존 R2 키를 그대로 보존한다. Preview는 같은 버킷이 실수로
    // 연결돼도 object key가 운영 영역과 겹치지 않도록 투명한 접두사를 쓴다.
    storagePrefix: environment === "preview" ? "preview" : "",
  };
}

export function assertDataEnvironment(
  environment: WiggleRuntimeEnvironment,
  source: EnvironmentSource = process.env,
): void {
  const marker = clean(source.WIGGLE_DATA_ENV);
  if (!marker && (environment === "local" || environment === "test")) return;
  if (marker !== environment) {
    throw new Error(
      `${environment} 실행 환경의 WIGGLE_DATA_ENV는 '${environment}'여야 해요. 현재 값: '${marker || "미설정"}'`,
    );
  }
}

export function assertHostedAuthenticationConfiguration(
  environment: WiggleRuntimeEnvironment,
  source: EnvironmentSource = process.env,
): void {
  if (!runtimePolicy(environment).requiresRemoteData) return;
  if (!source.GOOGLE_CLIENT_ID?.trim() || !source.GOOGLE_CLIENT_SECRET?.trim()) {
    throw new Error(`${environment} 환경의 Google OAuth 설정이 필요해요.`);
  }
}

export function requiresHostedTeacherAuthentication(
  source: EnvironmentSource = process.env,
): boolean {
  return !runtimePolicy(runtimeEnvironment(source)).allowsLocalDevelopmentFeatures;
}

export function isLocalDevelopmentRequest(
  request: Request,
  source: EnvironmentSource = process.env,
): boolean {
  if (!runtimePolicy(runtimeEnvironment(source)).allowsLocalDevelopmentFeatures) return false;
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
