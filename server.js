import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT) || 3000;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  let target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const stats = statSync(target);
    if (stats.isDirectory()) target = path.join(target, 'index.html');
    statSync(target);
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  response.setHeader('Content-Type', mimeTypes[path.extname(target)] || 'application/octet-stream');
  createReadStream(target).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Teclado Musical disponível em http://localhost:${port}`);
});
