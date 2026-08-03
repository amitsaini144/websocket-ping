'use client'

import { useState } from 'react';
import { Languages } from 'lucide-react';
import type { TranscriptStatus } from '@/hooks/useVoiceTranscripts';

interface VoiceTranscriptProps {
  isOwn: boolean;
  language: string | null;
  status?: TranscriptStatus;
  text?: string;
  onRequest: () => void;
}

export default function VoiceTranscript({ isOwn, language, status, text, onRequest }: Readonly<VoiceTranscriptProps>) {
  const [expanded, setExpanded] = useState(false);

  if (!language) return null;

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && (!status || status === 'error')) {
      onRequest();
    }
  };

  return (
    <div className="mt-1.5">
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1 text-[11px] font-medium ${isOwn ? 'text-white/70 hover:text-white' : 'text-brand/70 hover:text-brand'}`}
      >
        <Languages className="h-3 w-3" />
        {expanded ? `Hide ${language} transcript` : `Show in ${language}`}
      </button>
      {expanded && (
        <div className={`mt-1 text-xs rounded-lg px-2 py-1.5 ${isOwn ? 'bg-white/10 text-white/90' : 'bg-black/5 text-gray-700'}`}>
          {status === 'loading' && (
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s] inline-block" />
              <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s] inline-block" />
              <span className="h-1 w-1 rounded-full bg-current animate-bounce inline-block" />
            </span>
          )}
          {status === 'error' && (
            <span>
              Couldn&apos;t translate this message.{' '}
              <button onClick={onRequest} className="underline">Retry</button>
            </span>
          )}
          {status === 'done' && <span>{text}</span>}
        </div>
      )}
    </div>
  );
}
