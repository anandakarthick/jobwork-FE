import type { CustomerInput } from '../../api/customers';
import type { CompanyStatus } from '../../types';

const STATUSES: CompanyStatus[] = ['ACTIVE', 'INACTIVE'];

interface Props {
  value: CustomerInput;
  onChange: (next: CustomerInput) => void;
}

/** Shared fields for the create and edit customer pages. */
export default function CustomerFormFields({ value, onChange }: Props) {
  const set = <K extends keyof CustomerInput>(key: K, v: CustomerInput[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Customer name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            className="input"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Acme Industries"
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={value.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
            placeholder="contact@customer.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            className="input"
            value={value.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+91 …"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="address">Address</label>
        <textarea
          id="address"
          className="input min-h-24 resize-y"
          rows={3}
          value={value.address ?? ''}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Optional address…"
        />
      </div>
    </div>
  );
}
