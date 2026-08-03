import { NextRequest, NextResponse } from 'next/server';

// Mirrors MAX_MEDIA_DATA_LENGTH in server.js — voice notes never exceed this.
const MAX_AUDIO_BASE64_LENGTH = 4 * 1024 * 1024;
const MAX_TARGET_LANGUAGE_LENGTH = 40;

function base64DataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const [, mimeType, base64] = match;
  return new Blob([Buffer.from(base64, 'base64')], { type: mimeType });
}

async function transcribeAudio(apiKey: string, audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', audioBlob, 'voice-message.webm');
  form.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) throw new Error('Transcription request failed');
  const data = await res.json();
  return data.text;
}

async function translateText(apiKey: string, text: string, targetLanguage: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a translation engine. Translate the user's message into ${targetLanguage}. Respond with only the translated text and nothing else. If the message is already in ${targetLanguage}, return it unchanged.`,
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) throw new Error('Translation request failed');
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? text;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Transcription is not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const audio = body?.audio;
  const targetLanguage = body?.targetLanguage;

  if (typeof audio !== 'string' || audio.length === 0 || audio.length > MAX_AUDIO_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Invalid audio' }, { status: 400 });
  }
  if (
    typeof targetLanguage !== 'string' ||
    targetLanguage.length === 0 ||
    targetLanguage.length > MAX_TARGET_LANGUAGE_LENGTH
  ) {
    return NextResponse.json({ error: 'Invalid target language' }, { status: 400 });
  }

  let audioBlob: Blob;
  try {
    audioBlob = base64DataUrlToBlob(audio);
  } catch {
    return NextResponse.json({ error: 'Invalid audio' }, { status: 400 });
  }

  try {
    const transcript = await transcribeAudio(apiKey, audioBlob);
    const translated = transcript.trim().length > 0
      ? await translateText(apiKey, transcript, targetLanguage)
      : '';
    return NextResponse.json({ transcript: translated });
  } catch (error) {
    console.error('Transcription/translation failed:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}
