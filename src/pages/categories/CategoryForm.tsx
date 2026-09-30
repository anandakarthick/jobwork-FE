import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCategory, getCategory, updateCategory, type CategoryInput } from '../../api/categories';
import { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import CategoryFormFields from './CategoryFormFields';

const EMPTY: CategoryInput = { name: '', brands: [], description: '' };

/** Handles both create (`/categories/new`) and edit (`/categories/:id/edit`). */
export default function CategoryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<CategoryInput>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCategory(id)
      .then((c) =>
        setForm({
          name: c.name,
          brands: c.brands,
          description: c.description ?? '',
        }),
      )
      .catch((err) => setError(apiErrorMessage(err, 'Could not load category')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.brands.length === 0) {
      setError('Add at least one supported brand.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = isEdit ? await updateCategory(id!, form) : await createCategory(form);
      navigate(`/categories/${saved.id}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save category'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit category' : 'New category'}
        subtitle={
          isEdit ? 'Update this category and its brands.' : 'Add a product category and its supported brands.'
        }
        actions={
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Back
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Category details" />
        {loading ? (
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardBody>
              <CategoryFormFields value={form} onChange={setForm} />
            </CardBody>

            {/* Save — last. */}
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
