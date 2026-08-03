export interface TranscriptLanguageOption {
  code: string;
  label: string;
}

export const TRANSCRIPT_LANGUAGES: TranscriptLanguageOption[] = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'Hindi' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'French', label: 'French' },
  { code: 'German', label: 'German' },
  { code: 'Arabic', label: 'Arabic' },
  { code: 'Chinese (Simplified)', label: 'Chinese' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Portuguese', label: 'Portuguese' },
  { code: 'Russian', label: 'Russian' },
];

export const TRANSCRIPT_LANGUAGE_STORAGE_KEY = 'videocall:transcript-language';
