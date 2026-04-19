import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 2001;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.json': 'application/json', '.avif': 'image/avif',
};

const HOME    = path.join(__dirname, 'Home');
const WORK    = path.join(__dirname, 'Work');
const CONTACT = path.join(__dirname, 'Contact');

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Route to correct folder
  let filePath;
  if (urlPath === '/index.html') {
    filePath = path.join(HOME, 'index.html');
  } else if (urlPath.startsWith('/assets/')) {
    filePath = path.join(HOME, urlPath);
  } else if (urlPath === '/work.html' || urlPath === '/work' || urlPath === '/work/' || urlPath === '/projects' || urlPath === '/projects/') {
    filePath = path.join(WORK, 'index.html');
  } else if (urlPath === '/contact-versions' || urlPath === '/contact-versions/') {
    filePath = path.join(CONTACT, 'versions.html');
  } else if (urlPath === '/contact-versions-2' || urlPath === '/contact-versions-2/') {
    filePath = path.join(CONTACT, 'versions2.html');
  } else if (urlPath === '/contact' || urlPath === '/contact/' || urlPath === '/contact.html') {
    filePath = path.join(CONTACT, 'index.html');
  } else if (urlPath === '/services' || urlPath === '/services/') {
    filePath = path.join(__dirname, 'Services', 'index.html');
  } else if (/^\/capabilities\/assets\//i.test(urlPath)) {
    const sub = urlPath.replace(/^\/capabilities\/assets\//i, '');
    filePath = path.join(__dirname, 'Capabilities', 'assets', sub);
  } else if (urlPath === '/capabilities' || urlPath === '/capabilities/' || urlPath === '/Capabilities' || urlPath === '/Capabilities/') {
    filePath = path.join(__dirname, 'Capabilities', 'index.html');
  } else if (urlPath === '/project' || urlPath === '/project/') {
    filePath = path.join(WORK, 'project', 'index.html');
  } else if (urlPath.startsWith('/work/') && urlPath.length > '/work/'.length) {
    // Category/project sub-pages, e.g. /work/visual-effects/into-the-void/
    const sub = urlPath.slice('/work/'.length);
    filePath = path.join(WORK, sub);
    if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
  } else {
    filePath = path.join(__dirname, urlPath);
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    }
  });
}).listen(PORT, () => console.log(`Serving http://localhost:${PORT}`));
