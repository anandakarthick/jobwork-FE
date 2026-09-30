import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteCategory, getCategory } from '../../api/categories';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import type { ProductCategory } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function CategoryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCategory(id)
      .then(setCategory)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load category')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!category || !window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await deleteCategory(category.id);
      navigate('/categories', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete category'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={loading ? 'Category' : (category?.name ?? 'Category')}
        subtitle={category ? `${category.brands.length} supported brand(s)` : undefined}
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => navigate('/categories')}>
              Back
            </button>
            {category && (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => navigate(`/categories/${category.id}/edit`)}
                >
                  Edit
                </button>
                <button type="button" className="btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Category details" />
        <CardBody>
          {loading && <p className="py-8 text-center text-slate-400">Loading…</p>}
          {!loading && category && (
            <dl className="space-y-6">
              <Field label="Product category">{category.name}</Field>

              <Field label="Supported brands">
                <div className="mt-1 flex flex-wrap gap-2">
                  {category.brands.map((brand) => (
                    <Badge key={brand} tone="blue">
                      {brand}
                    </Badge>
                  ))}
                </div>
              </Field>

              <Field label="Description">
                {category.description || <span className="text-slate-400">—</span>}
              </Field>

              <div className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
                <Field label="Created by">{category.createdBy?.name ?? '—'}</Field>
                <Field label="Created at">{formatDate(category.createdAt, settings.general.dateFormat)}</Field>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
