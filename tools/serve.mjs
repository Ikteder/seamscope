import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const port = Number.parseInt(process.env.SEAMSCOPE_PORT ?? "8080", 10);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    const requested = normalize(join(root, relative));
    if (!requested.startsWith(root)) throw new Error("outside root");
    const metadata = await stat(requested);
    if (!metadata.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": `${types[extname(requested)] ?? "application/octet-stream"}; charset=utf-8` });
    response.end(await readFile(requested));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SeamScope running at http://127.0.0.1:${port}`);
});
