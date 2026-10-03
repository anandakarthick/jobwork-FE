import { api } from '../lib/api';

export type LlmProviderId = 'stub' | 'openai' | 'claude';

/** Masked LLM settings — keys are never returned, only whether they're set. */
export interface LlmSettings {
  provider: LlmProviderId;
  openaiModel: string;
  anthropicModel: string;
  /** "database" = parsed price-list rows; "claude" = brand files trained into Claude. */
  quoteEngine: QuoteEngine;
  /** Anthropic workspace id ("wrkspc_…") — needed by the Files API with an org-wide key. */
  anthropicWorkspaceId?: string;
  openaiKeySet: boolean;
  anthropicKeySet: boolean;
  openaiBalance: number | null;
  anthropicBalance: number | null;
  balanceCurrency: string;
  updatedAt: string | null;
}

export type QuoteEngine = 'database' | 'claude';

export interface UpdateLlmPayload {
  provider: LlmProviderId;
  openaiModel?: string;
  anthropicModel?: string;
  quoteEngine?: QuoteEngine;
  anthropicWorkspaceId?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  clearOpenaiKey?: boolean;
  clearAnthropicKey?: boolean;
  openaiBalance?: number | null;
  anthropicBalance?: number | null;
  balanceCurrency?: string;
}

export const getLlmSettings = () => api.get<LlmSettings>('/settings/llm').then((r) => r.data);

export const updateLlmSettings = (payload: UpdateLlmPayload) =>
  api.put<LlmSettings>('/settings/llm', payload).then((r) => r.data);

/** Lightweight header status: active provider/model, key-set flag, balance. */
export interface LlmStatus {
  provider: LlmProviderId;
  model: string | null;
  /** "database" or "claude" — how Get Quote finds products. */
  quoteEngine?: QuoteEngine;
  keySet: boolean;
  balance: number | null;
  /** Estimated USD spent since the balance was set. */
  spent: number;
  /** balance − spent (null when no balance is set). */
  remaining: number | null;
  balanceCurrency: string;
  balanceNote: string;
}

export const getLlmStatus = () => api.get<LlmStatus>('/settings/llm/status').then((r) => r.data);

/** App branding — project name + logo (data URL). Public GET (login page needs it). */
export interface AppSettings {
  appName: string;
  logo: string | null;
  themeColor: string;
  updatedAt: string | null;
}

export interface UpdateAppPayload {
  appName?: string;
  logo?: string | null;
  clearLogo?: boolean;
  themeColor?: string;
}

export const getAppSettings = () => api.get<AppSettings>('/settings/app').then((r) => r.data);

export const updateAppSettings = (payload: UpdateAppPayload) =>
  api.put<AppSettings>('/settings/app', payload).then((r) => r.data);

/** SMTP config — password never returned, only `passwordSet`. */
export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordSet: boolean;
  fromName: string;
  fromEmail: string;
  updatedAt: string | null;
}

export interface UpdateSmtpPayload {
  host?: string | null;
  port?: number;
  secure?: boolean;
  username?: string | null;
  password?: string;
  clearPassword?: boolean;
  fromName?: string | null;
  fromEmail?: string | null;
}

export const getSmtpSettings = () => api.get<SmtpSettings>('/settings/smtp').then((r) => r.data);

export const updateSmtpSettings = (payload: UpdateSmtpPayload) =>
  api.put<SmtpSettings>('/settings/smtp', payload).then((r) => r.data);

/** Letter-pad (letterhead) design — the branded HTML shell wrapping emails. */
export interface Letterhead {
  html: string;
  enabled: boolean;
  isDefault: boolean;
  updatedAt: string | null;
}

export interface UpdateLetterheadPayload {
  html?: string;
  enabled?: boolean;
  resetToDefault?: boolean;
}

export interface LetterheadPreset {
  key: string;
  name: string;
  description: string;
  /** CSS background for the card swatch (solid colour or gradient). */
  color: string;
  html: string;
}

export const getLetterhead = () => api.get<Letterhead>('/settings/letterhead').then((r) => r.data);

export const getLetterheadPresets = () =>
  api.get<LetterheadPreset[]>('/settings/letterhead/presets').then((r) => r.data);

export const updateLetterhead = (payload: UpdateLetterheadPayload) =>
  api.put<Letterhead>('/settings/letterhead', payload).then((r) => r.data);

/** An editable AI prompt the quote pipeline runs with (stored in the database). */
export interface SystemPrompt {
  key: string;
  name: string;
  description: string;
  content: string;
  updatedAt: string;
  /** True while the stored text still equals the shipped default. */
  isDefault: boolean;
}

export const listSystemPrompts = () =>
  api.get<SystemPrompt[]>('/settings/prompts').then((r) => r.data);
export const updateSystemPrompt = (key: string, content: string) =>
  api.put<SystemPrompt>(`/settings/prompts/${encodeURIComponent(key)}`, { content }).then((r) => r.data);
export const resetSystemPrompt = (key: string) =>
  api.post<SystemPrompt>(`/settings/prompts/${encodeURIComponent(key)}/reset`).then((r) => r.data);

