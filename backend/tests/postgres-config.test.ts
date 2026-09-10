import { it, expect } from 'vitest';
import { postgresOptions } from '../src/config/postgres.js';
it('keeps certificate verification and overrides conflicting URL SSL parameters', () => {
  const config = postgresOptions(
    'postgresql://test:fake@localhost/test?sslmode=no-verify',
    true,
    'certs/supabase-ca.crt',
  );
  expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
  expect(config.connectionString).not.toContain('sslmode');
  expect((config.ssl as { ca: string }).ca).toContain('BEGIN CERTIFICATE');
});
it('fails closed when the configured CA file is missing', () => {
  expect(() =>
    postgresOptions('postgresql://localhost/test', true, 'missing-certificate.crt'),
  ).toThrow();
});
