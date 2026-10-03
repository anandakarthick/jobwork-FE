import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCustomer,
  getCustomer,
  updateCustomer,
  type CustomerInput,
} from '../../api/customers';
import { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import CustomerFormFields from './CustomerFormFields';

const EMPTY: CustomerInput = { name: '', status: 'ACTIVE', email: '', phone: '', address: '' };

/** Handles both create (`/customers/new`) and edit (`/customers/:id/edit`). */
export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCustomer(id)
      .then((c) =>
        setForm({
          name: c.name,
          status: c.status,
          email: c.email ?? '',
          phone: c.phone ?? '',
          address: c.address ?? '',
        }),
      )
      .catch((err) => setError(apiErrorMessage(err, 'Could not load customer')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Customer name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = isEdit ? await updateCustomer(id!, form) : await createCustomer(form);
      navigate(`/customers/${saved.id}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save customer'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit customer' : 'New customer'}
        subtitle={isEdit ? 'Update this customer’s details.' : 'Add a new customer.'}
        actions={
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Back
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Customer details" />
        {loading ? (
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardBody>
              <CustomerFormFields value={form} onChange={setForm} />
            </CardBody>
            <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
