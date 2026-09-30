import type { CompanyInput } from '../../api/companies';
import type { CompanyStatus } from '../../types';

const STATUSES: CompanyStatus[] = ['ACTIVE', 'INACTIVE'];

interface Props {
  value: CompanyInput;
  onChange: (next: CompanyInput) => void;
}

/** Shared fields for the create and edit brand pages. */
export default function CompanyFormFields({ value, onChange }: Props) {
  const set = <K extends keyof CompanyInput>(key: K, v: CompanyInput[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Brand name</label>
          <input
            id="name"
            className="input"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Larsen & Toubro"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select
            id="status"
            className="input"
            value={value.status}
            onChange={(e) => set('status', e.target.value as CompanyStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'ACTIVE' ? 'Active' : 'Inactive'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea
          id="description"
          className="input min-h-20 resize-y"
          rows={2}
          value={value.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Optional notes about this brand…"
        />
      </div>
    </div>
  );
}
