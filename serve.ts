// GTA 6 Trophy Guide & Tracker — tiny static server for the app.
//
// Serves app/ on http://localhost:8080 with no dependencies and no
// network access: every file comes from the local app/ directory.
//
// Usage: node serve.ts
//   PORT=8080 node serve.ts   (to pick another port)
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(fileURLToPath(new URL("./app", import.meta.url)));
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  // Only GET and HEAD, and only paths inside app/: anything with ".."
  // or an absolute escape is rejected rather than served.
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Method not allowed\n");
    return;
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = resolve(join(appDir, normalize(rel).replace(/^(\.\.[/\\])+/, "")));
  if (!file.startsWith(appDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found\n");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  if (req.method === "GET") createReadStream(file).pipe(res);
  else res.end();
});

server.listen(port, () => {
  console.log(`GTA 6 Trophy Guide & Tracker at http://localhost:${port}/`);
});
