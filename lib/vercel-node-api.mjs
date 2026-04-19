/** Read JSON body from Vercel / Node IncomingMessage. */
export async function readJsonBody(req, limit = 65536) {
  const raw = await new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
  try {
    return JSON.parse(raw.toString('utf8') || '{}');
  } catch {
    return {};
  }
}
