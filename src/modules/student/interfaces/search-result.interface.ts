export interface SgaRecoveryResult {
  data?: {
    id?: string | number;
    usuario?: string;
    nombre_completo?: string;
    es_mujer?: boolean;
    es_hombre?: boolean;
  };
  [key: string]: unknown;
}

export interface PosgradoRecoveryResult {
  id?: string | number;
  user?: string;
  email?: string;
  [key: string]: unknown;
}

export interface MatriculacionSearchResult {
  aData?: {
    username?: string;
    nombre_completo?: string;
    email?: string;
    email_institucional?: string;
    temp_token?: string;
  };
  [key: string]: unknown;
}

export interface SearchResult {
  sga: SgaRecoveryResult | null;
  posgrado: PosgradoRecoveryResult | null;
  matriculacion: MatriculacionSearchResult | null;
}
