'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, RefreshCw, Lightbulb } from 'lucide-react';
import { useRecommendations } from '@/hooks/UseRecommendations';

interface AIRecommendationsCardProps {
  uid: string;
  learningStyle?: string;
  xp: number;
  streak: number;
}

const STYLE_LABELS: Record<string, string> = {
  visual: 'Visual',
  auditory: 'Auditory',
  reading: 'Reading / Writing',
  kinesthetic: 'Kinesthetic',
};

const REC_COLOURS = [
  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
];

export default function AIRecommendationsCard({
  uid,
  learningStyle,
  xp,
  streak,
}: AIRecommendationsCardProps) {
  const router = useRouter();
  const { recommendations, loading, error, fetch } = useRecommendations(
    uid,
    learningStyle,
    xp,
    streak
  );

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current || !learningStyle) return;
    hasFetched.current = true;
    fetch();
  }, [learningStyle, fetch]);

  // ── STATE: NO LEARNING STYLE ─────────────────────────────────────────────
  if (!learningStyle) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <Brain size={20} className="text-pink-400" />
        </div>
        <div>
          <p className="text-slate-300 text-sm font-medium">No recommendations yet</p>
          <p className="text-slate-500 text-xs mt-1">
            Set your learning style so the AI can personalise suggestions for you.
          </p>
        </div>
        <button 
          onClick={() => router.push('/profile')} 
          className="mt-1 px-4 py-2 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/20 text-pink-300 text-xs font-medium rounded-xl transition-colors"
        >
          Set learning style
        </button>
      </div>
    );
  }

  // ── STATE: LOADING ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">
          Personalising for your {STYLE_LABELS[learningStyle] ?? learningStyle} style…
        </p>
      </div>
    );
  }

  // ── STATE: ERROR ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <p className="text-slate-400 text-sm">{error}</p>
        <button 
          onClick={() => { hasFetched.current = false; fetch(); }} 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium rounded-xl transition-colors"
        >
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    );
  }

  // ── STATE: EMPTY ──────────────────────────────────────────────────────────
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <Lightbulb size={20} className="text-slate-600" />
        <p className="text-slate-500 text-sm">No recommendations generated yet.</p>
      </div>
    );
  }

  // ── STATE: RECOMMENDATIONS LIST ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec, i) => {
          const colours = REC_COLOURS[i % REC_COLOURS.length];
          return (
            <div key={i} className={`rounded-xl border p-4 flex flex-col gap-3 ${colours.bg} ${colours.border}`}>
              <div className={`w-7 h-7 rounded-lg bg-white/5 border ${colours.border} flex items-center justify-center shrink-0`}>
                <span className={`text-xs font-bold ${colours.text}`}>{i + 1}</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{rec}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-slate-600 text-xs">
          Based on your{' '}
          <span className="text-slate-500">{STYLE_LABELS[learningStyle] ?? learningStyle}</span>{' '}
          learning style
        </span>
        <button 
          onClick={() => { hasFetched.current = false; fetch(); }} 
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
    </div>
  );
}
