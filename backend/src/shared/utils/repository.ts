import type { Page, Row, Sql } from '../types/index.js';
import { NotFoundError } from '../errors/index.js';
export async function one<T extends Row = Row>(
  sql: Sql,
  query: string,
  values: unknown[] = [],
): Promise<T> {
  const row = (await sql.query<T>(query, values)).rows[0];
  if (!row) throw new NotFoundError();
  return row;
}
export async function paged(sql: Sql, query: string, values: unknown[], page: Page) {
  const count = await one(sql, `select count(*)::int as total from (${query}) listing`, values);
  const data = (
    await sql.query(`${query} limit $${values.length + 1} offset $${values.length + 2}`, [
      ...values,
      page.limit,
      (page.page - 1) * page.limit,
    ])
  ).rows;
  return {
    data,
    pagination: {
      ...page,
      total: Number(count.total),
      totalPages: Math.ceil(Number(count.total) / page.limit),
    },
  };
}
// Table names and keys originate only from module constants and strict Zod schemas.
export async function insert(sql: Sql, table: string, input: Row) {
  const keys = Object.keys(input);
  return one(
    sql,
    `insert into public.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
    Object.values(input),
  );
}
export async function update(sql: Sql, table: string, recordId: string, input: Row) {
  const keys = Object.keys(input);
  if (!keys.length) return one(sql, `select * from public.${table} where id=$1`, [recordId]);
  return one(
    sql,
    `update public.${table} set ${keys.map((k, i) => `${k}=$${i + 2}`).join(',')} where id=$1 returning *`,
    [recordId, ...Object.values(input)],
  );
}
