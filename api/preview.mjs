// Prévia de link: devolve título, descrição, imagem e nome do site de uma URL.
// Chamada pelo app em /api/preview?url=https://...
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 400 * 1024;
const TIMEOUT_MS = 4000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
}

async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('url inválida'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocolo não permitido');
  if (u.username || u.password) throw new Error('url não permitida');
  const host = u.hostname;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('host não permitido');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('host não permitido');
  return u;
}

function decode(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim();
}

function meta(html, keys) {
  for (const k of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, 'i');
    const m = html.match(re1) || html.match(re2);
    if (m && m[1]) return decode(m[1]);
  }
  return '';
}

async function readLimited(res) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  try { await reader.cancel(); } catch { /* ignora */ }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

export default async function handler(req, res) {
  try {
    const raw = String(req.query?.url || '');
    let u = await assertPublicUrl(raw);

    let html = '';
    let finalUrl = u;
    // segue até 3 redirecionamentos, conferindo cada destino
    for (let i = 0; i < 4; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(finalUrl, {
        redirect: 'manual', signal: ctrl.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; GrupoWhatBot/1.0; +link-preview)', accept: 'text/html,application/xhtml+xml' },
      });
      clearTimeout(timer);
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        finalUrl = await assertPublicUrl(new URL(r.headers.get('location'), finalUrl).toString());
        continue;
      }
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.includes('text/html')) {
        res.setHeader('Cache-Control', 's-maxage=3600');
        return res.status(200).json({});
      }
      html = await readLimited(r);
      break;
    }

    const title = meta(html, ['og:title', 'twitter:title']) || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
    const description = meta(html, ['og:description', 'twitter:description', 'description']);
    let image = meta(html, ['og:image', 'og:image:url', 'twitter:image']);
    if (image) {
      try { image = new URL(image, finalUrl).toString(); } catch { image = ''; }
      if (!/^https:\/\//i.test(image)) image = '';
    }
    const site = meta(html, ['og:site_name']) || finalUrl.hostname.replace(/^www\./, '');

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({
      title: title.slice(0, 140),
      description: description.slice(0, 220),
      image,
      site: site.slice(0, 60),
    });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({});
  }
}
