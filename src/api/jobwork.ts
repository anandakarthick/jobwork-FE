import { api } from '../lib/api';

export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MessageRole = 'SYSTEM' | 'USER' | 'ASSISTANT';

export interface AnalysisMessage {
  id: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface AnalysisRequirement {
  id: number;
  partName: string;
  quantity: number | null;
  specifications: string | null;
  suggestedBrands: string[];
  notes: string | null;
  matchedCategory?: { id: number; name: string } | null;
}

export interface Analysis {
  id: number;
  status: AnalysisStatus;
  summary: string | null;
  provider: string | null;
  error: string | null;
  brands: string[] | null;
  customer: { id: number; name: string };
  category?: { id: number; name: string } | null;
  documents: { id: number; fileName: string; sizeBytes: number }[];
  messages: AnalysisMessage[];
  requirements: AnalysisRequirement[];
}

export interface CreateAnalysisInput {
  customerId: number;
  categoryId?: number | null;
  brands: string[];
  instructions?: string;
  files: File[];
}

export const createAnalysis = (input: CreateAnalysisInput) => {
  const form = new FormData();
  form.append('customerId', String(input.customerId));
  if (input.categoryId) form.append('categoryId', String(input.categoryId));
  form.append('brands', JSON.stringify(input.brands));
  if (input.instructions) form.append('instructions', input.instructions);
  input.files.forEach((f) => form.append('documents', f));
  return api.post<Analysis>('/jobwork/analyses', form).then((r) => r.data);
};

export const sendAnalysisMessage = (analysisId: number, content: string) =>
  api
    .post<AnalysisMessage>(`/jobwork/analyses/${analysisId}/messages`, { content })
    .then((r) => r.data);
