import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createCompany,
  deleteBrandPriceList,
  getCompany,
  listBrandPriceLists,
  listBrandPrompts,
  saveBrandPrompts,
  updateBrandPriceList,
  updateCompany,
  uploadBrandPriceLists,
  type CompanyInput,
} from '../../api/companies';
import { apiErrorMessage } from '../../lib/api';
import { useAppDispatch } from '../../store/hooks';
import { pollIngestJobs, pushToast } from '../../store/ingestJobsSlice';
import type { Company } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import BrandFiles, {
  toExistingFiles,
  type ExistingFile,
  type NewFile,
} from '../../components/ui/BrandFiles';
import BrandPrompts, { toPromptRows, type PromptRow } from '../../components/ui/BrandPrompts';
import CompanyFormFields from './CompanyFormFields';

const EMPTY: CompanyInput = { name: '', status: 'ACTIVE', description: '' };

/** What a create hands to the edit page when the brand saved but a later step failed. */
interface CarriedState {
  error?: string;
  /** Prompts typed on the create page that could not be saved yet. */
  prompts?: PromptRow[];
}

/** Handles both create (`/companies/new`) and edit (`/companies/:id/edit`). */
export default function CompanyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const carried = useLocation().state as CarriedState | null;
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<CompanyInput>(EMPTY);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  // Files already on the brand (edit) and files picked but not uploaded yet.
  const [existing, setExisting] = useState<ExistingFile[]>([]);
  const [added, setAdded] = useState<NewFile[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(carried?.error ?? '');

  const loadFiles = useCallback(async (companyId: number | string) => {
    setExisting(toExistingFiles(await listBrandPriceLists(companyId)));
  }, []);
  const loadPrompts = useCallback(async (companyId: number | string) => {
    setPrompts(toPromptRows(await listBrandPrompts(companyId)));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getCompany(id),
      loadFiles(id),
      // Unsaved prompts carried over from a failed create win over the (empty) saved list.
      carried?.prompts ? setPrompts(carried.prompts) : loadPrompts(id),
    ])
      .then(([c]) => setForm({ name: c.name, status: c.status, description: c.description ?? '' }))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load brand')))
      .finally(() => setLoading(false));
    // `carried` is read once on arrival; it must not re-trigger the load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadFiles, loadPrompts]);

  /** Save the prompt list (blank rows are dropped). */
  const savePrompts = async (companyId: number) => {
    const rows = prompts.filter((p) => p.content.trim());
    if (!isEdit && rows.length === 0) return;
    await saveBrandPrompts(
      companyId,
      rows.map((p) => ({ id: p.id, name: p.name.trim(), content: p.content.trim(), train: p.train })),
    );
  };

  /** Apply the pending file changes; returns true if any training was started. */
  const saveFiles = async (companyId: number): Promise<boolean> => {
    let training = false;
    for (const e of existing) {
      if (e.remove) {
        await deleteBrandPriceList(companyId, e.doc.id);
        continue;
      }
      const status = e.doc.ingestStatus ?? 'NOT_STARTED';
      const needsTraining = e.train && (status === 'NOT_STARTED' || status === 'FAILED');
      const renamed = e.name.trim() !== (e.doc.name ?? '');
      // A file whose text was never read (or failed) is read on this save.
      const textStatus = e.doc.textStatus ?? 'NOT_STARTED';
      const needsText = textStatus === 'NOT_STARTED' || textStatus === 'FAILED';
      if (renamed || e.train !== (e.doc.train ?? true) || needsTraining || needsText) {
        await updateBrandPriceList(companyId, e.doc.id, { name: e.name.trim(), train: e.train });
        if (needsTraining) training = true;
      }
    }
    if (added.length) {
      await uploadBrandPriceLists(
        companyId,
        added.map((a) => a.file),
        added.map((a) => a.train),
        added.map((a) => a.name.trim()),
      );
      if (added.some((a) => a.train)) training = true;
    }
    return training;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let saved: Company;
    try {
      saved = isEdit ? await updateCompany(id!, form) : await createCompany(form);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save brand'));
      setSaving(false);
      return;
    }

    // The brand itself is saved from here on; a failure below only affects its
    // prompts or files, so the user is kept on (or sent to) the edit page to retry.
    let promptsSaved = false;
    try {
      await savePrompts(saved.id);
      promptsSaved = true;
      const training = await saveFiles(saved.id);
      if (training) {
        dispatch(
          pushToast({
            tone: 'info',
            message: 'Training started — you’ll be notified when it finishes.',
          }),
        );
      }
      // Pick up the background work (text extraction / training) the save started.
      void dispatch(pollIngestJobs());
      navigate(`/companies/${saved.id}`, { replace: true });
    } catch (err) {
      const what = promptsSaved ? 'files' : 'keyword prompts and files';
      const message = `The brand was saved, but its ${what} could not be updated: ${apiErrorMessage(err)}`;
      if (!isEdit) {
        const state: CarriedState = { error: message, prompts: promptsSaved ? undefined : prompts };
        navigate(`/companies/${saved.id}/edit`, { replace: true, state });
      } else {
        setError(message);
        if (promptsSaved) {
          // Some file changes may have gone through — show what is really saved.
          setAdded([]);
          await Promise.all([loadPrompts(saved.id), loadFiles(saved.id)]).catch(() => undefined);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit brand' : 'New brand'}
        subtitle={isEdit ? 'Update this brand’s details, prompts and files.' : 'Add a new brand.'}
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
        <CardHeader title="Brand details" />
        {loading ? (
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardBody>
              <CompanyFormFields value={form} onChange={setForm} />

              <div className="mt-6">
                <label className="label">Keyword prompts</label>
                <BrandPrompts rows={prompts} onChange={setPrompts} />
              </div>

              <div className="mt-6">
                <label className="label">Reference files</label>
                <BrandFiles
                  companyId={isEdit ? Number(id) : undefined}
                  existing={existing}
                  added={added}
                  onExistingChange={setExisting}
                  onAddedChange={setAdded}
                />
              </div>
            </CardBody>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create brand'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
