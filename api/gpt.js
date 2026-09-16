// Endpoint serverless do bot @gpt (roda no Vercel, chave escondida no servidor)
// Usa Groq (grátis, sem cartão, cota generosa) — suporta texto + visão (imagem).
const GROQ_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY não configurada' });

  const { prompt, imageUrl } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt obrigatório' });

  try {
    const content = [{ type: 'text', text: prompt }];
    if (imageUrl) {
      // Baixa a imagem e converte pra base64 (Groq aceita URL direta, mas base64 é mais garantido)
      const imgRes = await fetch(imageUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';
      content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${buf.toString('base64')}` } });
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.2-90b-vision-preview',
        messages: [{ role: 'user', content }],
        max_tokens: 800,
      }),
    });
    const j = await r.json().catch(() => ({}));
    const answer = j?.choices?.[0]?.message?.content || null;
    if (!answer) return res.status(502).json({ error: 'Groq sem resposta' });
    res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}