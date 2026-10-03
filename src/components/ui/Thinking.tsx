import { useEffect, useRef, useState } from 'react';
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
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

/** What the server says is really running (see api/quotes getQuoteProgress). */
export interface LiveProgress {
  /** Key of the running step — matches a `steps[].key`. */
  stage: string;
  /** Live detail under the step, e.g. "Batch 3 of 8 · 37 line(s)". */
  detail: string | null;
  /** 0–100 as computed by the server. */
  percent: number;
}

interface ThinkingProps {
  /** Status lines cycled while working; the last one stays put. */
  phases: string[];
  /** `block` = centred panel (quote generation); `bubble` = chat message. */
  variant?: 'block' | 'bubble';
  /** ms between phase advances (timer mode only). */
  interval?: number;
  /**
   * Block variant: the real pipeline steps and the server's live progress. When
   * given, the card follows the server instead of a timer — the active step,
   * its detail and the percentage are what is actually happening.
   */
  steps?: { key: string; label: string }[];
  progress?: LiveProgress | null;
  title?: string;
}

/**
 * Animated "thinking" indicator like ChatGPT/Claude. In timer mode it advances
 * through `phases` (stopping at the last) so a long single request still feels
 * alive. With `steps` + `progress` it shows the step the server is really on.
 * Each phrase animates in word by word; pass freshly picked phrases (see
 * lib/thinkingPhrases) so the wording differs from run to run.
 */
export default function Thinking({
  phases,
  variant = 'bubble',
  interval = 2200,
  steps,
  progress,
  title = 'Generating your quote',
}: ThinkingProps) {
  const [i, setI] = useState(0);
  const live = Boolean(steps && steps.length);

  useEffect(() => {
    if (live) return;
    setI(0);
    if (phases.length <= 1) return;
    const id = setInterval(() => setI((p) => (p < phases.length - 1 ? p + 1 : p)), interval);
    return () => clearInterval(id);
  }, [phases, interval, live]);

  const label = phases[Math.min(i, phases.length - 1)] ?? 'Thinking…';

  if (variant === 'block') {
    // Stepper card: a gradient header with a progress bar, then the steps —
    // completed ones get a green check tile, the current one a spinning ring and
    // animated words, upcoming ones stay faint. The step list scrolls and keeps
    // the running step in view, so long pipelines never overflow the card.
    const items = live ? steps! : phases.map((p) => ({ key: p, label: p }));
    const multi = items.length > 1;
    const liveIdx = live && progress ? items.findIndex((s) => s.key === progress.stage) : -1;
    // Before the first poll lands, the first step is "running".
    const active = live ? Math.max(0, liveIdx) : i;
    const pct = live
      ? progress
        ? Math.max(1, Math.min(99, Math.round(progress.percent)))
        : 1
      : multi
        ? Math.round(((i + 0.5) / items.length) * 100)
        : 50;
    return (
      <div className="mx-auto w-full max-w-md animate-fade-up overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-pop">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-violet-600 px-5 py-4 text-white">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25">
              <SparklesIcon className="h-6 w-6 animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{title}</p>
              <p className="truncate text-xs text-white/75">
                {multi ? `Step ${Math.min(active + 1, items.length)} of ${items.length}` : 'Working…'}
                {live && progress?.detail ? ` · ${progress.detail}` : ''}
              </p>
            </div>
            <span className="text-lg font-semibold tabular-nums">{pct}%</span>
          </div>
          {/* Progress bar */}
          <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {multi ? (
          <StepList items={items} active={active} detail={live ? progress?.detail ?? null : null} />
        ) : (
          <div className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-slate-600">
            <Dots />
            <AnimatedWords key={label} text={label} shimmer />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-card">
        <Dots />
        <AnimatedWords key={label} text={label} shimmer />
      </div>
    </div>
  );
}

/** The scrollable step list; the running step is scrolled into view as it moves. */
function StepList({
  items,
  active,
  detail,
}: {
  items: { key: string; label: string }[];
  active: number;
  detail: string | null;
}) {
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
      {items.map((s, idx) => {
        const done = idx < active;
        const isActive = idx === active;
        return (
          <li
            key={s.key}
            ref={isActive ? activeRef : undefined}
            className={`flex items-start gap-3 rounded-xl px-2.5 py-2 text-sm transition-all ${
              isActive
                ? 'bg-brand-50/70 font-medium text-slate-800 ring-1 ring-inset ring-brand-100'
                : done
                  ? 'text-slate-500'
                  : 'text-slate-300'
            }`}
          >
            {done ? (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
                <CheckCircleIcon className="h-3.5 w-3.5" />
              </span>
            ) : isActive ? (
              <span className="grid h-6 w-6 shrink-0 place-items-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              </span>
            ) : (
              <span className="grid h-6 w-6 shrink-0 place-items-center">
                <span className="h-2 w-2 rounded-full bg-slate-200" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              {/* Only the active step animates; keyed so a new step replays it. */}
              {isActive ? <AnimatedWords key={s.label} text={s.label} shimmer /> : <span>{s.label}</span>}
              {isActive && detail && (
                <span className="mt-0.5 block truncate text-xs font-normal text-brand-700/80">{detail}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
