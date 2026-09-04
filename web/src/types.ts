export type Role = 'USER' | 'ADMIN';
export type EntryStatus = 'PENDENTE' | 'PAGA' | 'COMPENSADA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  hasPassword?: boolean;
  googleLinked?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface OverviewUserRow {
  userId: string;
  name: string;
  email: string;
  totalMinutes: number;
  count: number;
  minutesPendente: number;
  minutesPaga: number;
  minutesCompensada: number;
}

export interface OverviewResponse {
  month: string;
  users: OverviewUserRow[];
  totals: Omit<OverviewUserRow, 'userId' | 'name' | 'email'>;
}

export interface OvertimeEntry {
  id: string;
  userId: string;
  date: string; // ISO
  minutes: number;
  description: string | null;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonthSummary {
  month: string; // "YYYY-MM"
  totalMinutes: number;
  count: number;
  minutesPendente: number;
  minutesPaga: number;
  minutesCompensada: number;
}

export interface SummaryResponse {
  year: number;
  userId: string;
  months: MonthSummary[];
  totals: Omit<MonthSummary, 'month'>;
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  PENDENTE: 'Pendente',
  PAGA: 'Paga',
  COMPENSADA: 'Compensada',
};

export const STATUS_COLOR: Record<EntryStatus, string> = {
  PENDENTE: 'warning',
  PAGA: 'success',
  COMPENSADA: 'info',
};
