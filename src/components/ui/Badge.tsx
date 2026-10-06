import type { ReactNode } from 'react';

type Tone = 'gray' | 'green' | 'amber' | 'blue' | 'red' | 'violet';

const toneClass: Record<Tone, string> = {
  gray: 'badge-gray',
  green: 'badge-green',
  amber: 'badge-amber',
  blue: 'badge-blue',
  red: 'badge-red',
  violet: 'badge-violet',
};

export default function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={toneClass[tone]}>{children}</span>;
}
