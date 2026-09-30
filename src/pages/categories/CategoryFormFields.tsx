import type { CategoryInput } from '../../api/categories';
import BrandPicker from '../../components/ui/BrandPicker';

interface Props {
  value: CategoryInput;
  onChange: (next: CategoryInput) => void;
}

/** Shared fields for the create and edit category pages. */
export default function CategoryFormFields({ value, onChange }: Props) {
  const set = <K extends keyof CategoryInput>(key: K, v: CategoryInput[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div>
        <label className="label" htmlFor="name">Product category</label>
        <input
          id="name"
          className="input"
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. MCCB (Moulded Case Circuit Breaker)"
          required
        />
      </div>

      <div>
        <label className="label">Supported brands</label>
        <BrandPicker value={value.brands} onChange={(brands) => set('brands', brands)} />
        <p className="mt-1.5 text-xs text-slate-400">
          Pick from your companies. The dot shows active (green) / inactive. Manage the list in the
          Companies section.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea
          id="description"
          className="input min-h-24 resize-y"
          rows={3}
          value={value.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Optional notes about this category…"
        />
      </div>
    </div>
  );
}
