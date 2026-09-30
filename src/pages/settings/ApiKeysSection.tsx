import { useEffect, useState } from 'react';
import {
  getLlmSettings,
  updateLlmSettings,
  type LlmProviderId,
  type LlmSettings,
} from '../../api/settings';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch } from '../../store/hooks';
import { fetchLlmStatus } from '../../store/llmStatusSlice';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { KeyIcon } from '../../components/icons';

const PROVIDERS: { id: LlmProviderId; label: string; hint: string }[] = [
  { id: 'stub', label: 'None (placeholder)', hint: 'No AI — returns placeholder responses.' },
  { id: 'openai', label: 'OpenAI (ChatGPT)', hint: 'Uses your OpenAI API key.' },
  { id: 'claude', label: 'Claude (Anthropic)', hint: 'Uses your Anthropic API key.' },
];

export default function ApiKeysSection() {
  const { can } = useAuth();
  const canEdit = can('apikeys.edit');
  const dispatch = useAppDispatch();

  const [settings, setSettings] = useState<LlmSettings | null>(null);
  const [provider, setProvider] = useState<LlmProviderId>('stub');
  const [openaiModel, setOpenaiModel] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiBalance, setOpenaiBalance] = useState('');
  const [anthropicBalance, setAnthropicBalance] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState('USD');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    getLlmSettings()
      .then((s) => {
        setSettings(s);
        setProvider(s.provider);
        setOpenaiModel(s.openaiModel);
        setAnthropicModel(s.anthropicModel);
        setOpenaiBalance(s.openaiBalance != null ? String(s.openaiBalance) : '');
        setAnthropicBalance(s.anthropicBalance != null ? String(s.anthropicBalance) : '');
        setBalanceCurrency(s.balanceCurrency || 'USD');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load API settings')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updateLlmSettings({
        provider,
        openaiModel: openaiModel || undefined,
        anthropicModel: anthropicModel || undefined,
        openaiApiKey: openaiKey || undefined,
        anthropicApiKey: anthropicKey || undefined,
        openaiBalance: openaiBalance === '' ? null : Number(openaiBalance),
        anthropicBalance: anthropicBalance === '' ? null : Number(anthropicBalance),
        balanceCurrency: balanceCurrency || undefined,
      });
      setSettings(updated);
      setOpenaiKey('');
      setAnthropicKey('');
      setSaved(true);
      // Refresh the header chip (provider / model / balance) live.
      void dispatch(fetchLlmStatus());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save API settings'));
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async (which: 'openai' | 'anthropic') => {
    if (!window.confirm(`Remove the stored ${which === 'openai' ? 'OpenAI' : 'Anthropic'} API key?`))
      return;
    setError('');
    try {
      const updated = await updateLlmSettings({
        provider,
        ...(which === 'openai' ? { clearOpenaiKey: true } : { clearAnthropicKey: true }),
      });
      setSettings(updated);
      void dispatch(fetchLlmStatus());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not remove key'));
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2">
          <KeyIcon className="h-5 w-5 text-brand-500" />
          API Keys
        </h1>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          Settings saved.
        </div>
      )}
      {!canEdit && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have read-only access to API keys.
        </div>
      )}

      {loading ? (
        <Card>
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active provider */}
          <Card>
            <CardHeader title="Active provider" />
            <CardBody>
              <label className="label" htmlFor="provider">LLM provider</label>
              <select
                id="provider"
                className="input"
                value={provider}
                disabled={!canEdit}
                onChange={(e) => setProvider(e.target.value as LlmProviderId)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">
                {PROVIDERS.find((p) => p.id === provider)?.hint}
              </p>
            </CardBody>
          </Card>

          {/* OpenAI — shown only when OpenAI is the active provider */}
          {provider === 'openai' && (
          <Card>
            <CardHeader
              title="OpenAI (ChatGPT)"
              action={
                <span className={settings?.openaiKeySet ? 'badge-green' : 'badge-gray'}>
                  {settings?.openaiKeySet ? 'Key set' : 'No key'}
                </span>
              }
            />
            <CardBody className="space-y-4">
              <div>
                <label className="label" htmlFor="openaiModel">Model</label>
                <input
                  id="openaiModel"
                  className="input"
                  value={openaiModel}
                  disabled={!canEdit}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="openaiKey">API key</label>
                <input
                  id="openaiKey"
                  type="password"
                  className="input"
                  placeholder={settings?.openaiKeySet ? '•••••••••• (leave blank to keep)' : 'sk-…'}
                  value={openaiKey}
                  disabled={!canEdit}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                {canEdit && settings?.openaiKeySet && (
                  <button
                    type="button"
                    onClick={() => clearKey('openai')}
                    className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove stored key
                  </button>
                )}
              </div>
              <div>
                <label className="label" htmlFor="openaiBalance">Credit balance ({balanceCurrency})</label>
                <input
                  id="openaiBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  placeholder="e.g. 50.00"
                  value={openaiBalance}
                  disabled={!canEdit}
                  onChange={(e) => setOpenaiBalance(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Shown in the header. Providers don't expose remaining balance via the API, so keep
                  this updated manually.
                </p>
              </div>
            </CardBody>
          </Card>
          )}

          {/* Claude — shown only when Claude is the active provider */}
          {provider === 'claude' && (
          <Card>
            <CardHeader
              title="Claude (Anthropic)"
              action={
                <span className={settings?.anthropicKeySet ? 'badge-green' : 'badge-gray'}>
                  {settings?.anthropicKeySet ? 'Key set' : 'No key'}
                </span>
              }
            />
            <CardBody className="space-y-4">
              <div>
                <label className="label" htmlFor="anthropicModel">Model</label>
                <input
                  id="anthropicModel"
                  className="input"
                  value={anthropicModel}
                  disabled={!canEdit}
                  onChange={(e) => setAnthropicModel(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="anthropicKey">API key</label>
                <input
                  id="anthropicKey"
                  type="password"
                  className="input"
                  placeholder={settings?.anthropicKeySet ? '•••••••••• (leave blank to keep)' : 'sk-ant-…'}
                  value={anthropicKey}
                  disabled={!canEdit}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                {canEdit && settings?.anthropicKeySet && (
                  <button
                    type="button"
                    onClick={() => clearKey('anthropic')}
                    className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove stored key
                  </button>
                )}
              </div>
              <div>
                <label className="label" htmlFor="anthropicBalance">Credit balance ({balanceCurrency})</label>
                <input
                  id="anthropicBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  placeholder="e.g. 50.00"
                  value={anthropicBalance}
                  disabled={!canEdit}
                  onChange={(e) => setAnthropicBalance(e.target.value)}
                />
              </div>
            </CardBody>
          </Card>
          )}

          {/* Currency for the balance above — only when a provider is selected */}
          {provider !== 'stub' && (
          <Card>
            <CardBody>
              <label className="label" htmlFor="balanceCurrency">Balance currency</label>
              <select
                id="balanceCurrency"
                className="input"
                value={balanceCurrency}
                disabled={!canEdit}
                onChange={(e) => setBalanceCurrency(e.target.value)}
              >
                {['USD', 'INR', 'EUR', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </CardBody>
          </Card>
          )}
        </div>
      )}
    </div>
  );
}
