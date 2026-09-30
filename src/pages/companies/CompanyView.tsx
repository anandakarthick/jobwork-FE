import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteCompany,
  getCompany,
  listBrandPriceLists,
  listBrandPrompts,
  setCompanyStatus,
} from '../../api/companies';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useAppSelector } from '../../store/hooks';
import type { BrandPrompt, Company, ProductDocument } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import BrandFiles, { toExistingFiles } from '../../components/ui/BrandFiles';
import BrandPrompts, { toPromptRows } from '../../components/ui/BrandPrompts';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function CompanyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [company, setCompany] = useState<Company | null>(null);
  const [docs, setDocs] = useState<ProductDocument[]>([]);
  const [prompts, setPrompts] = useState<BrandPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const jobsById = useAppSelector((s) => s.ingestJobs.byId);

  const loadDocs = useCallback(async () => {
    if (!id) return;
    try {
      setDocs(await listBrandPriceLists(id));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load files'));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCompany(id)
      .then(setCompany)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load company')))
      .finally(() => setLoading(false));
    void loadDocs();
    listBrandPrompts(id)
      .then(setPrompts)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load keyword prompts')));
  }, [id, loadDocs]);

  // When the app-level watcher reports a file here finished training, reload so
  // its persisted item count / status refreshes.
  const finishedSig = docs
    .map((d) => {
      const j = jobsById[d.id];
      return j ? `${d.id}:${j.ingestStatus}:${j.ingestedItemCount ?? ''}` : '';
    })
    .join('|');
  useEffect(() => {
    const anyFinished = docs.some((d) => {
      const j = jobsById[d.id];
      return (
        j &&
        (j.ingestStatus === 'COMPLETED' || j.ingestStatus === 'FAILED') &&
        (j.ingestStatus !== d.ingestStatus ||
          (j.ingestedItemCount ?? null) !== (d.ingestedItemCount ?? null))
      );
    });
    if (anyFinished) void loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedSig]);

  const toggleStatus = async () => {
    if (!company) return;
    const next = company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setCompany(await setCompanyStatus(company.id, next));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update status'));
    }
  };

  const handleDelete = async () => {
    if (!company || !window.confirm(`Delete brand "${company.name}"?`)) return;
    try {
      await deleteCompany(company.id);
      navigate('/companies', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete company'));
    }
  };

  return (
    <div>
      <PageHeader
        title={loading ? 'Brand' : (company?.name ?? 'Brand')}
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => navigate('/companies')}>
              Back
            </button>
            {company && (
              <>
                <button type="button" className="btn-ghost" onClick={toggleStatus}>
                  {company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => navigate(`/companies/${company.id}/edit`)}
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
        <CardHeader
          title="Brand details"
          action={
            company && (
              <Badge tone={company.status === 'ACTIVE' ? 'green' : 'gray'}>
                {company.status}
              </Badge>
            )
          }
        />
        <CardBody>
          {loading && <p className="py-8 text-center text-slate-400">Loading…</p>}
          {!loading && company && (
            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Brand name">{company.name}</Field>
              <Field label="Status">
                <Badge tone={company.status === 'ACTIVE' ? 'green' : 'gray'}>
                  {company.status}
                </Badge>
              </Field>
              <Field label="Created by">{company.createdBy?.name ?? '—'}</Field>
              <Field label="Created at">{formatDate(company.createdAt, settings.general.dateFormat)}</Field>
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Description">
                  {company.description || <span className="text-slate-400">—</span>}
                </Field>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      {!loading && company && (
        <div className="mt-6">
          <Card>
            <CardHeader title="Keyword prompts" />
            <CardBody>
              <BrandPrompts rows={toPromptRows(prompts)} readOnly />
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && company && (
        <div className="mt-6">
          <Card>
            <CardHeader title="Reference files" />
            <CardBody>
              <BrandFiles companyId={company.id} existing={toExistingFiles(docs)} readOnly />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
