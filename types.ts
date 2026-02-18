export interface DocStatus {
  id: string; // e.g., 'facade', 'meter'
  name: string;
  isSubmitted: boolean;
  submissionDate?: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  icon: string;
}

export interface House {
  id: number;
  ownerName: string;
  phoneNumber: string;
  houseNumber: string;
  stage: 'Foundations' | 'Structure' | 'Installations' | 'Finishing';
  documents: DocStatus[];
  progress: number; // 0-100
  lastActivity: string;
  isConstructora: boolean; // New field to exclude from KPIs
  livesAbroad: boolean; 
}

export type ViewState = 'home' | 'dashboard' | 'registry' | 'detail';

export const REQUIRED_DOCS = [
  { id: 'facade', name: 'Foto Fachada', icon: 'cottage' },
  { id: 'meter_site', name: 'Foto Sitio Medidor', icon: 'water_drop' },
  { id: 'tax', name: 'Impuesto Predial', icon: 'receipt_long' },
  { id: 'lien', name: 'Cert. Gravámenes', icon: 'gavel' },
  { id: 'id_copy', name: 'Copia Cédula/Pap.', icon: 'badge' },
  { id: 'form', name: 'Formulario Conjunto', icon: 'description' },
];
export const ADMIN_DOCS = [
  { id: 'admin_paz_salvo', name: 'Paz y Salvo Admin', icon: 'verified' },
  { id: 'impuestos', name: 'Impuestos al día', icon: 'account_balance' }
];
export const DEADLINE_DATE = "2025-02-28";
export const TOTAL_HOUSES = 114;