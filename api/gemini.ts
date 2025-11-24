import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
  }
  try {
    const { systemPrompt, message } = req.body || {}
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'
    const r = await fetch(`${url}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser message: ${message}` }] }],
        generationConfig: { temperature: 0.7, topK: 1, topP: 1, maxOutputTokens: 2048 },
      }),
    })
    const json = await r.json()
    return res.status(r.status).json(json)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unknown error' })
  }
}
