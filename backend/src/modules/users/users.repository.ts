import type { Profile, Sql } from '../../shared/types/index.js';
import { one, update } from '../../shared/utils/repository.js';
export const usersRepository = {
  get: (sql: Sql, id: string) =>
    one<Profile>(sql, 'select * from public.profiles where id=$1', [id]),
  update: (sql: Sql, id: string, input: Record<string, unknown>) =>
    update(sql, 'profiles', id, input),
};
