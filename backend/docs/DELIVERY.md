# Etapas da implementação

## 1 — Inventário e fundação

- Criados: package.json/lock, tsconfig*.json, eslint.config.js, .env.example, config/_, shared/_, app.ts/server.ts, docs/ARCHITECTURE.md.
- Implementado: pacote Express independente, env validado, logger, erros, CORS, Helmet, limitação de payload e taxa, pool com escopo RLS.
- Migrations: preparação de 001–003.
- Env: NODE_ENV, PORT, FRONTEND_URL, PUBLIC_SITE_URL, CORS_ORIGINS, TRUST_PROXY_HOPS, DATABASE_URL, DATABASE_SSL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, IP_HASH_SECRET, LOG_LEVEL.
- Validação: typecheck/lint; erros de schemas Zod corrigidos antes de avançar.

## 2 — Catálogo, Auth, empresas, RLS e administração

- Criados: modules/auth, users, locations, categories, companies, services, hours, uploads, promotions, search, plans, admin; migrations 001_schema.sql, 002_security.sql, 003_storage.sql; seeds/001_initial.sql; tests/core.test.ts.
- Implementado: Supabase Auth, JWT/RBAC, proprietário, transições, catálogo público, busca, SEO, Storage privado, horários, recursos e limites.
- Migrations: 001–003; seed de localidades/categorias/planos.
- Env adicional: nenhuma.
- Validação: 15 testes de API/PostgreSQL/RLS passaram; corrigida política de SELECT no retorno da criação de empresa. Typecheck/lint passaram.

## 3 — Métricas e cobrança

- Criados: modules/analytics e subscriptions; migrations/004_billing.sql; tests/billing.test.ts.
- Implementado: eventos com HMAC/deduplicação, dashboards por plano, reserva de assinatura, adapter Mercado Pago, validação de webhook, pagamento único, auditoria transacional e proteção contra eventos antigos.
- Env adicional: MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_WEBHOOK_SECRET.
- Validação: 25 testes passaram, incluindo webhook idempotente, ativação confirmada, estorno, busca por serviço e promoção vencida. Typecheck/lint/build passaram.

## 4 — Hardening, operação e entrega

- Criados: migrations/005_hardening.sql, tests/security.test.ts, scripts/migrate.ts, scripts/admin.ts, Dockerfile, documentação de instalação e contrato HTTP.
- Modificados: dependências Sharp/Vitest para versões corrigidas; organização de repositories, busca de cidade em linguagem natural, formatação.
- Env adicional: MIGRATION_DATABASE_URL para administração/runner.
- Validação final: 34 testes em quatro arquivos aprovados; typecheck, lint e build aprovados; npm audit sem vulnerabilidades conhecidas após atualização de Sharp e Vitest. Banco dos testes é PostgreSQL embutido com migrations e RLS; Auth/Storage/MP externos são adapters de teste, com testes adicionais dos adapters reais usando HTTP simulado. Nenhuma migration remota ou cobrança real foi executada.

## Condições que exigem configuração externa

Supabase real, SMTP/URLs Auth, env, conexão frontend, domínio/host e homologação Mercado Pago. Nenhuma credencial foi inventada ou incluída no código. A pasta do frontend permanece preservada.
