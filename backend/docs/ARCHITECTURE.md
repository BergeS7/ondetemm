# Onde Tem — arquitetura antes da implementação

## Inventário

O repositório contém React/TypeScript/TanStack, dados estáticos e servidor SSR; não há módulos de negócio, migrations ou autenticação. O backend Express é um pacote independente. Nenhum arquivo funcional do frontend será substituído.

## Decisões

- Express 5 e TypeScript estrito; controllers adaptam HTTP, services aplicam regras e repositories executam SQL parametrizado.
- Supabase Auth é a única autoridade de senhas e tokens. getUser valida cada bearer; papel/status vêm de profiles, nunca do body nem de user_metadata.
- PostgreSQL do Supabase via pg, com transações que SET LOCAL ROLE anon/authenticated e request.jwt.claims. Assim RLS também protege consultas do backend. A conexão e service_role ficam no servidor.
- Operações financeiras, uploads e analytics usam escopo service_role apenas após validações específicas. Transações e locks protegem limites, deduplicação, auditoria e webhooks concorrentes.
- Publicação por views com projeção explícita; tabelas privadas não se tornam públicas só por a empresa estar ativa.
- UUIDs; empresa com slug único por cidade; país/estado/cidade/bairro normalizados. Texto neighborhood é mantido para compatibilidade. timezone por cidade para horários, inclusive virada da noite.
- Planos e limites em plans.limits; assinatura vigente é a fonte da elegibilidade. companies.plan_id é cache, não autorização.
- Busca nativa com ranking explícito e paginação estável; repositório substituível.

## Modelo

countries → states → cities → neighborhoods; profiles (auth.users) → companies; companies ↔ categories; companies → services/hours/images/promotions/events/subscriptions; subscriptions → payments; payment_events registra recebimento/processamento; admin_audit_logs mantém ações privilegiadas.

## Riscos e mitigação

1. IDOR: checagem de proprietário nos services + RLS + testes com dois usuários.
2. Escalada de papel/status/plano: schemas strict, grants por coluna e triggers; decisões financeiras não vêm do navegador.
3. Limites em concorrência: lock da empresa e validação no banco.
4. Pagamento duplicado/fora de ordem: assinatura HMAC, consulta ao provedor, IDs únicos e transação; eventos falhos ficam reprocessáveis.
5. Imagens maliciosas: assinatura binária, decodificação/reencodificação, limites e bucket privado; compensação de falhas.
6. Métricas artificiais: rate limit, HMAC de IP, chave por sessão e identidade de rede, janela móvel sob lock. Não equivale a prova de venda.
7. Integrações externas: testes locais substituem Auth/Storage/MP por adapters; homologação real requer contas e segredos do operador.
8. Escala: limite de páginas, timeouts, índices e pool. Rate limiter em memória exige uma instância inicialmente; store compartilhado antes de múltiplas réplicas.

## Sequência

Fundação → schema/profiles/Auth/RBAC → localizações/categorias/empresas/RLS → serviços/horários/imagens/promoções/admin → catálogo/busca → eventos/analytics/planos → assinaturas/MP/auditoria → validação e documentação.
