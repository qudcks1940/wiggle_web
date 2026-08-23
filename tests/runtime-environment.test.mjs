import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  assertDataEnvironment,
  assertHostedAuthenticationConfiguration,
  isLocalDevelopmentRequest,
  requiresHostedTeacherAuthentication,
  runtimeEnvironment,
  runtimePolicy,
} from "../lib/runtime/environment.ts";

test("Vercel system environment wins over local overrides", () => {
  assert.equal(runtimeEnvironment({ VERCEL: "1", VERCEL_ENV: "production", WIGGLE_APP_ENV: "local" }), "production");
  assert.equal(runtimeEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", WIGGLE_APP_ENV: "local" }), "preview");
  assert.equal(runtimeEnvironment({ VERCEL: "1", VERCEL_ENV: "staging" }), "preview", "custom hosted environments stay on the non-production boundary");
  assert.equal(runtimeEnvironment({ VERCEL_ENV: "development" }), "local");
});

test("local, test, preview and production policies stay distinct", () => {
  assert.equal(runtimeEnvironment({ WIGGLE_APP_ENV: "test", NODE_ENV: "production" }), "test");
  assert.equal(runtimeEnvironment({ NODE_ENV: "production" }), "local", "NODE_ENV is a build mode, not a deployment target");
  assert.equal(runtimePolicy("local").allowsLocalDevelopmentFeatures, true);
  assert.equal(runtimePolicy("test").requiresRemoteData, false);
  assert.equal(runtimePolicy("preview").storagePrefix, "preview");
  assert.equal(runtimePolicy("production").storagePrefix, "");
  assert.equal(requiresHostedTeacherAuthentication({ WIGGLE_APP_ENV: "preview" }), true);
  assert.equal(requiresHostedTeacherAuthentication({ WIGGLE_APP_ENV: "local" }), false);
});

test("hosted data markers fail closed when scope does not match", () => {
  assert.doesNotThrow(() => assertDataEnvironment("local", {}));
  assert.doesNotThrow(() => assertDataEnvironment("test", { WIGGLE_DATA_ENV: "test" }));
  assert.doesNotThrow(() => assertDataEnvironment("preview", { WIGGLE_DATA_ENV: "preview" }));
  assert.doesNotThrow(() => assertDataEnvironment("production", { WIGGLE_DATA_ENV: "production" }));
  assert.throws(() => assertDataEnvironment("preview", { WIGGLE_DATA_ENV: "production" }), /preview/);
  assert.throws(() => assertDataEnvironment("production", {}), /미설정/);
  assert.throws(() => assertHostedAuthenticationConfiguration("preview", {}), /Google OAuth/);
  assert.doesNotThrow(() => assertHostedAuthenticationConfiguration("production", { GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret" }));
  assert.doesNotThrow(() => assertHostedAuthenticationConfiguration("local", {}));
});

test("development seed and PIN paths require both a local runtime and local hostname", () => {
  const localRequest = new Request("http://localhost/api/student");
  const remoteRequest = new Request("https://preview.example/api/student");
  assert.equal(isLocalDevelopmentRequest(localRequest, { WIGGLE_APP_ENV: "local" }), true);
  assert.equal(isLocalDevelopmentRequest(localRequest, { WIGGLE_APP_ENV: "test" }), true);
  assert.equal(isLocalDevelopmentRequest(remoteRequest, { WIGGLE_APP_ENV: "local" }), false);
  assert.equal(isLocalDevelopmentRequest(localRequest, { VERCEL: "1", VERCEL_ENV: "preview", WIGGLE_APP_ENV: "local" }), false);
});

test("health endpoint validates the selected environment without exposing credentials", async () => {
  const source = await readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  assert.match(source, /bindings\(\)/);
  assert.match(source, /ensureSchema\(\)/);
  assert.match(source, /runtimeEnvironment\(\)/);
  assert.doesNotMatch(source, /TURSO_AUTH_TOKEN|R2_S3_SECRET_ACCESS_KEY|GOOGLE_CLIENT_SECRET/);
});
