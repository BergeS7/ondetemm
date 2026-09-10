export type Role = 'USER' | 'COMPANY_OWNER' | 'ADMIN';
export interface Actor {
  id: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  email: string;
  token: string;
}
export type Row = Record<string, unknown>;
export interface Sql {
  query<T extends Row = Row>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}
export interface Database {
  run<T>(actor: Actor | 'system' | undefined, work: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export interface Page {
  page: number;
  limit: number;
}
export interface Profile extends Row {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
}
export interface Company extends Row {
  id: string;
  owner_id: string | null;
  status: string;
  city_id: string;
  slug: string;
  deleted_at: string | null;
}
declare module 'express-serve-static-core' {
  interface Request {
    actor?: Actor;
  }
}
