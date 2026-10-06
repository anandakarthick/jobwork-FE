import { useCallback, useEffect, useState } from 'react';
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
import type { BrandPrompt, BrandRuleGroup, Company, ProductDocument } from '../../types';
import { DetailField, DetailHero, Empty } from '../../components/ui/Detail';
import { EditIcon } from '../../components/icons';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import BrandFiles, { toExistingFiles } from '../../components/ui/BrandFiles';
import BrandPrompts, { toGroupRows, toPromptRows } from '../../components/ui/BrandPrompts';
import { confirmDialog } from '../../components/ui/Dialog';

export default function CompanyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [company, setCompany] = useState<Company | null>(null);
  const [docs, setDocs] = useState<ProductDocument[]>([]);
  const [groups, setGroups] = useState<BrandRuleGroup[]>([]);
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
      .then((res) => {
        setGroups(res.groups);
        setPrompts(res.prompts);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load rules')));
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
    if (!company) return;
    if (
      !(await confirmDialog({
        title: 'Delete brand',
        message: `Delete brand "${company.name}"? Its rules and reference files are removed too.`,
      }))
    )
      return;
    try {
      await deleteCompany(company.id);
      navigate('/companies', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete company'));
    }
  };

  return (
    <div>
      <DetailHero
        name={loading ? 'Brand' : (company?.name ?? 'Brand')}
        subtitle="Brand"
        meta={
          company && (
            <>
              <Badge tone={company.status === 'ACTIVE' ? 'green' : 'gray'}>{company.status}</Badge>
              <Badge tone="blue">{docs.length} reference file{docs.length === 1 ? '' : 's'}</Badge>
              <Badge tone="amber">{prompts.length} rule{prompts.length === 1 ? '' : 's'}</Badge>
              <span>Created {formatDate(company.createdAt, settings.general.dateFormat)}</span>
            </>
          )
        }
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
                  className="btn-primary"
                  onClick={() => navigate(`/companies/${company.id}/edit`)}
                >
                  <EditIcon className="h-4 w-4" />
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
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Brand details" />
        <CardBody>
          {loading && <p className="py-8 text-center text-slate-400">Loading…</p>}
          {!loading && company && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailField label="Brand name">{company.name}</DetailField>
              <DetailField label="Status">
                <Badge tone={company.status === 'ACTIVE' ? 'green' : 'gray'}>{company.status}</Badge>
              </DetailField>
              <DetailField label="Created by">{company.createdBy?.name ?? <Empty />}</DetailField>
              <DetailField label="Created at">
                {formatDate(company.createdAt, settings.general.dateFormat)}
              </DetailField>
              <DetailField label="Description" className="sm:col-span-2 lg:col-span-4">
                {company.description ? (
                  <span className="whitespace-pre-wrap">{company.description}</span>
                ) : (
                  <Empty />
                )}
              </DetailField>
            </dl>
          )}
        </CardBody>
      </Card>

      {!loading && company && (
        <div className="mt-6">
          <Card>
            <CardHeader title="Rules" />
            <CardBody>
              <BrandPrompts
                companyId={company?.id}
                groups={toGroupRows(groups)}
                rows={toPromptRows(prompts)}
                readOnly
              />
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
