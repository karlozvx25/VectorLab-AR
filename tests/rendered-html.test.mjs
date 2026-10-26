import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renderiza la experiencia VectorLab AR", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /SyborX/);
  assert.match(html, /Laboratorio de Cálculo/);
  assert.match(html, /De la ecuación al/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|SkeletonPreview/);
});

test("conserva el parser seguro y el generador GLB", async () => {
  const [math, route, page] = await Promise.all([
    readFile(new URL("../lib/math.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/model/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(math, /function compileFormula/);
  assert.doesNotMatch(math, /\beval\s*\(|new Function/);
  assert.match(route, /model\/gltf-binary/);
  assert.match(route, /Superficie con malla y ejes/);
  assert.match(page, /webxr scene-viewer quick-look/);
});
