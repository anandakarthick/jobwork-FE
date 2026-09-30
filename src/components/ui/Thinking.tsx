import { useEffect, useState } from 'react';
import { CheckCircleIcon, SparklesIcon } from '../icons';

/** Three bouncing dots — the classic "typing/thinking" animation. */
function Dots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </span>
  );
}

/**
 * A phrase whose words slide in one after another, with a soft light sweeping
 * across the text while it is the active step. Keyed on the text by the caller,
 * so every new phrase replays the animation.
 */
function AnimatedWords({ text, shimmer = false }: { text: string; shimmer?: boolean }) {
  return (
    <span className={shimmer ? 'text-shimmer' : undefined}>
      {text.split(' ').map((word, i) => (
        <span
          key={`${i}-${word}`}
          className="word-in inline-block"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {word}
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

interface ThinkingProps {
  /** Status lines cycled while working; the last one stays put. */
  phases: string[];
  /** `block` = centred panel (quote generation); `bubble` = chat message. */
  variant?: 'block' | 'bubble';
  /** ms between phase advances. */
  interval?: number;
}

/**
 * Animated "thinking" indicator like ChatGPT/Claude. Advances through `phases`
 * on a timer (stopping at the last), so a long single request still feels like
 * live progress instead of a frozen line of text. Each phrase animates in word
 * by word; pass freshly picked phrases (see lib/thinkingPhrases) so the wording
 * differs from run to run.
 */
export default function Thinking({ phases, variant = 'bubble', interval = 2200 }: ThinkingProps) {
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
    if (phases.length <= 1) return;
    const id = setInterval(() => setI((p) => (p < phases.length - 1 ? p + 1 : p)), interval);
    return () => clearInterval(id);
  }, [phases, interval]);

  const label = phases[Math.min(i, phases.length - 1)] ?? 'Thinking…';

  if (variant === 'block') {
    // Stepper: completed steps get a check, the current one spins, upcoming ones
    // stay faint — so a long single request reads as visible, ongoing progress.
    const multi = phases.length > 1;
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50">
          <SparklesIcon className="h-6 w-6 animate-pulse text-brand-500" />
        </span>
        <p className="text-sm font-semibold text-slate-700">Generating your quote</p>
        {multi ? (
          <ul className="w-full max-w-sm space-y-2.5">
            {phases.map((p, idx) => {
              const done = idx < i;
              const active = idx === i;
              return (
                <li
                  key={p}
                  className={`flex items-center gap-2.5 text-sm transition-colors ${
                    active
                      ? 'font-medium text-slate-800'
                      : done
                        ? 'text-slate-400'
                        : 'text-slate-300'
                  }`}
                >
                  {done ? (
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                  ) : active ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
                  ) : (
                    <span className="ml-[3px] mr-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  )}
                  {/* Only the active step animates; keyed so a new step replays it. */}
                  {active ? <AnimatedWords key={p} text={p} shimmer /> : <span>{p}</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">
              <AnimatedWords key={label} text={label} shimmer />
            </p>
            <Dots />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
        <Dots />
        <AnimatedWords key={label} text={label} shimmer />
      </div>
    </div>
  );
}
