// Envia notificações push. Duas rotas:
//  GET  /api/push  -> devolve a chave pública (o app usa pra se inscrever)
//  POST /api/push  -> usada SÓ pelo banco (Supabase) quando chega mensagem; protegida por segredo
import webpush from 'web-push';
import crypto from 'node:crypto';

function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ key: pub || '' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.PUSH_SECRET || !sameSecret(req.headers['x-push-secret'], process.env.PUSH_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!pub || !priv) return res.status(500).json({ error: 'vapid-missing' });

  try {
    webpush.setVapidDetails('https://grupowhat.vercel.app', pub, priv);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const subs = Array.isArray(body.subs) ? body.subs.slice(0, 300) : [];
    const payload = JSON.stringify({
      title: String(body.payload?.title || 'GrupoWhat').slice(0, 80),
      body: String(body.payload?.body || '').slice(0, 200),
      tag: String(body.payload?.tag || 'grupowhat'),
      gid: body.payload?.gid || null,
    });
    const results = await Promise.allSettled(subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' })));
    const failed = results.filter((r) => r.status === 'rejected').length;
    return res.status(200).json({ sent: subs.length - failed, failed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'push-failed' });
  }
}
