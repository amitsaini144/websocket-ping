'use client'

import { useCallback, useEffect, useState } from 'react';
import { TRANSCRIPT_LANGUAGE_STORAGE_KEY } from '@/lib/chat/transcriptLanguages';

export type TranscriptStatus = 'loading' | 'done' | 'error';

interface TranscriptEntry {
  status: TranscriptStatus;
  text?: string;
}

function cacheKey(messageId: string, language: string): string {
  return `${messageId}::${language}`;
}

export default function useVoiceTranscripts() {
  const [language, setLanguageState] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, TranscriptEntry>>({});

  useEffect(() => {
    const stored = window.localStorage.getItem(TRANSCRIPT_LANGUAGE_STORAGE_KEY);
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((next: string | null) => {
    setLanguageState(next);
    if (next) {
      window.localStorage.setItem(TRANSCRIPT_LANGUAGE_STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(TRANSCRIPT_LANGUAGE_STORAGE_KEY);
    }
  }, []);

  const requestTranscript = useCallback((messageId: string, mediaData: string) => {
    if (!language) return;
    const key = cacheKey(messageId, language);

    setEntries(prev => {
      if (prev[key]?.status === 'loading' || prev[key]?.status === 'done') return prev;
      return { ...prev, [key]: { status: 'loading' } };
    });

    fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: mediaData, targetLanguage: language }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Transcription failed');
        const data = await res.json();
        setEntries(prev => ({ ...prev, [key]: { status: 'done', text: data.transcript } }));
      })
      .catch(() => {
        setEntries(prev => ({ ...prev, [key]: { status: 'error' } }));
      });
  }, [language]);

  const getEntry = useCallback((messageId: string): TranscriptEntry | undefined => {
    if (!language) return undefined;
    return entries[cacheKey(messageId, language)];
  }, [entries, language]);

  return { language, setLanguage, requestTranscript, getEntry };
}
