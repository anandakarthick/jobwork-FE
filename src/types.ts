/** A short role reference attached to the signed-in user. */
export interface RoleRef {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: RoleRef | null;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A full role record (roles module). */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  _count?: { users: number };
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  module: string;
  permissions: PermissionDef[];
}

/** A user record as managed in the Users module. */
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role: RoleRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedCompany {
  id: number;
  name: string;
  status: CompanyStatus;
}

export type DocumentKind = 'PRICE_LIST' | 'SPEC' | 'DRAWING' | 'OTHER';
export type IngestStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ProductDocument {
  id: number;
  /** Label the user gave the file, e.g. "Price list 1". */
  name?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  /** Last change — upload, train on/off, or a finished training run. */
  updatedAt?: string;
  kind?: DocumentKind;
  brand?: string | null;
  /** Whether the file is trained and used by Get Quote. */
  train?: boolean;
  ingestStatus?: IngestStatus;
  ingestedItemCount?: number | null;
  ingestError?: string | null;
  /** State of reading the file into stored text (every file, trained or not). */
  textStatus?: IngestStatus;
  /** Length of the stored text; 0 = no readable text (e.g. a scan or an image). */
  textChars?: number | null;
  /** "FILE" = read straight from the file; "AI" = a scan/image read by the AI. */
  textSource?: string | null;
  textError?: string | null;
  /** Knowledge-in-Claude: the id Anthropic returned for this file ("file_…"). */
  aiFileId?: string | null;
  aiStatus?: IngestStatus;
  aiError?: string | null;
  aiFileChars?: number | null;
  aiTrainedAt?: string | null;
  /** "pdf" = the original PDF is in Claude (plus its text); "text" = text only. */
  aiFileKind?: 'pdf' | 'text' | null;
  aiPages?: number | null;
}

/** A brand's keyword prompt — sent to the AI for that brand's quotes when trained. */
export interface BrandPrompt {
  id: number;
  /** Label the user gave the prompt, e.g. "Rule 1". */
  name: string;
  content: string;
  train: boolean;
  createdAt: string;
  updatedAt: string;
  /** Knowledge-in-Claude: the Files API id of this rule's text and its status. */
  aiFileId?: string | null;
  aiStatus?: IngestStatus;
  aiError?: string | null;
  aiTrainedAt?: string | null;
}

export interface ProductCategory {
  id: number;
  name: string;
  brands: string[];
  description: string | null;
  companies?: LinkedCompany[];
  documents?: ProductDocument[];
  _count?: { documents: number };
  createdById: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email'>;
}

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export interface Company {
  id: number;
  name: string;
  status: CompanyStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email'>;
  _count?: { priceListDocuments: number };
}

export interface Customer {
  id: number;
  name: string;
  status: CompanyStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuthResponse {
  user: User;
  token: string;
}
