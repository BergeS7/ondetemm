# Onde Tem — Backend

API do diretório de empresas e serviços **Onde Tem**, domínio `ondetemm.com`, com lançamento em Santa Inês–MA e estrutura para expansão. Este pacote é independente do frontend React/TanStack existente.

## Tecnologias e arquitetura

Node.js 22+ (recomendado 24), Express 5, TypeScript estrito, PostgreSQL/Supabase, Supabase Auth e Storage, Zod, Helmet, CORS, express-rate-limit, Pino, pg, Sharp, Vitest e Supertest.

Controllers adaptam HTTP, services aplicam as regras e repositories encapsulam consultas parametrizadas. Operações usam transações com papel PostgreSQL `anon`, `authenticated` ou `service_role`. O JWT é validado pelo Supabase Auth; o papel do usuário é consultado em `profiles`. Não há armazenamento de senha nem autenticação paralela.

Consulte [decisões e riscos](docs/ARCHITECTURE.md), [contrato completo da API](docs/ENDPOINTS.md) e [etapas e validação](docs/DELIVERY.md).

```text
backend/
  src/
    config/                  # env, pool PostgreSQL, clientes Supabase
    middlewares/             # JWT, RBAC, tratamento global de erros
    modules/
      auth/ users/ companies/ categories/ locations/
      services/ hours/ promotions/ plans/ subscriptions/
      analytics/ search/ uploads/ admin/
    shared/                  # erros, tipos, validação, utilitários e recursos comuns
    app.ts                   # app injetável nos testes
    server.ts                # processo HTTP e encerramento controlado
  migrations/                # SQL versionado, RLS, funções, Storage
  seeds/                     # localidades, categorias e planos
  scripts/                   # migrations e provisionamento seguro de admin
  tests/                     # API, PostgreSQL/RLS e integrações isoladas
```

## Instalação local

Abra PowerShell na pasta `backend`:

```powershell
npm ci
Copy-Item .env.example .env
```

Preencha `.env` localmente; não publique o arquivo nem envie segredos pelo chat. Para testar sem contas externas:

```powershell
npm run check
```

Os testes iniciam um PostgreSQL embutido (PGlite), aplicam as migrations reais e simulam somente as superfícies externas Auth/Storage/Mercado Pago. Não exigem Docker, não cobram pagamentos e não alteram contas reais. PGlite não substitui homologação com a infraestrutura completa do Supabase.

## Configurar Supabase

1. Crie um projeto Supabase exclusivo para desenvolvimento/homologação.
2. Copie URL do projeto, chave pública e `service_role` para as variáveis correspondentes. **service_role é exclusivamente do backend.**
3. Obtenha a conexão PostgreSQL nas configurações do projeto. Prefira conexão direta ou pooler de sessão; use SSL com validação do certificado.
4. Configure `MIGRATION_DATABASE_URL` com a conexão administrativa para migrations.
5. Configure `DATABASE_URL` com conexão autorizada a executar `SET ROLE anon`, `authenticated` e `service_role`. A conexão `postgres` do projeto permite isso; em produção prefira um login exclusivo, sem DDL, autorizado somente a assumir esses papéis. Nunca forneça essa URL ao navegador.
6. No Supabase Auth, habilite e-mail/senha, confirmação de e-mail e política de senhas. Configure SMTP para entrega real de mensagens.
7. Em URLs autorizadas, adicione `${FRONTEND_URL}/auth/callback` e `${FRONTEND_URL}/auth/reset-password`. Esses caminhos pertencem ao frontend e ainda precisam ser conectados por ele.
8. Aplique migrations e seed. O bucket privado `company-images` é criado pela migration; não crie bucket público paralelo.

O middleware chama `auth.getUser(token)`, e não apenas decodifica o JWT. Logout revoga as sessões no Supabase; a política de validade dos access tokens continua sendo a do Supabase, portanto use expiração adequada ao produto. A recuperação recebe o token da sessão de recuperação emitida pelo Supabase e encaminha a alteração de senha a ele.

## Banco, migrations e seed

```powershell
npm run db:migrate
npm run db:seed
```

O runner usa transação por arquivo, lock de execução e checksum. Arquivo já aplicado não é reaplicado nem pode ser modificado silenciosamente: para evoluir, crie uma nova migration. Não executa reset nem apaga dados existentes.

| Arquivo           | Conteúdo                                                             |
| ----------------- | -------------------------------------------------------------------- |
| 001_schema.sql    | Tabelas, enums, constraints, índices, profiles ligado a auth.users   |
| 002_security.sql  | RLS, catálogo público, horários, plano efetivo, transições e limites |
| 003_storage.sql   | Bucket privado e política de leitura de objetos                      |
| 004_billing.sql   | Valores contratados, períodos e versão temporal de pagamentos        |
| 005_hardening.sql | Campos protegidos, quotas de horários e restrições de escrita        |

Seed inclui Brasil, Maranhão, Santa Inês, São Luís, Imperatriz, Bacabal, Pindaré-Mirim e Santa Luzia; 20 categorias e os três planos. É um conjunto inicial de municípios, não a lista integral do Maranhão. Outras localidades entram por novas migrations/seed, sem alterar lógica de busca. Bairro pode ser texto livre ou referência normalizada. Cada cidade tem timezone.

### Primeiro administrador

Cadastre e confirme uma conta normalmente pelo Supabase Auth. Depois execute com a conexão de migration configurada:

```powershell
npm run admin:grant -- UUID_DO_USUARIO
```

O comando promove apenas um perfil existente e ativo e registra auditoria. Nenhuma senha administrativa é incluída no seed, e o endpoint de cadastro não aceita role.

## Desenvolvimento

```powershell
npm run dev
```

API padrão: `http://localhost:3001`. `/health` verifica o processo e `/ready` a conexão PostgreSQL. O frontend continua em seu próprio processo, normalmente porta 5173. O frontend está preservado: os botões e páginas existentes não foram conectados automaticamente a esta API.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Variáveis de ambiente

| Variável                    | Uso                                                                   |
| --------------------------- | --------------------------------------------------------------------- |
| NODE_ENV, PORT              | Ambiente e porta                                                      |
| FRONTEND_URL                | Retornos de autenticação e cobrança                                   |
| PUBLIC_SITE_URL             | Base dos links canônicos; https://ondetemm.com                        |
| CORS_ORIGINS                | Lista exata separada por vírgula; sem wildcard                        |
| TRUST_PROXY_HOPS            | 0 local; número exato de proxies confiáveis no deploy                 |
| SUPABASE_URL                | URL do projeto                                                        |
| SUPABASE_ANON_KEY           | Chave pública do Auth                                                 |
| SUPABASE_SERVICE_ROLE_KEY   | Chave privada para Auth administrativo e Storage                      |
| DATABASE_URL                | Conexão runtime, usada somente no backend                             |
| MIGRATION_DATABASE_URL      | Conexão administrativa dos scripts                                    |
| DATABASE_SSL                | true em Supabase; false apenas para PostgreSQL local sem TLS          |
| MERCADO_PAGO_ACCESS_TOKEN   | Token do vendedor; vazio desabilita contratação real                  |
| MERCADO_PAGO_WEBHOOK_SECRET | Segredo de validação das notificações                                 |
| IP_HASH_SECRET              | Segredo aleatório de no mínimo 32 caracteres, independente dos demais |
| LOG_LEVEL                   | info por padrão; silent nos testes                                    |

Configuração essencial ausente impede iniciar o servidor. Mercado Pago pode permanecer sem configuração durante desenvolvimento do catálogo; sua integração retorna erro explícito ao ser utilizada.

## Fluxo principal

Registrar/login → obter estados/cidades/categorias → criar empresa → cadastrar endereço, WhatsApp e categoria → upload de fotos → enviar para aprovação → admin aprova → visitante pesquisa e abre perfil → frontend envia PROFILE_VIEW/WHATSAPP_CLICK → comerciante de plano habilitado consulta métricas.

Consulte os exemplos e formatos exatos em [ENDPOINTS.md](docs/ENDPOINTS.md).

## Planos e limites

| Recurso                     |       FREE |    FEATURED |     PREMIUM |
| --------------------------- | ---------: | ----------: | ----------: |
| Mensalidade                 |       R$ 0 |    R$ 29,90 |    R$ 59,90 |
| Categorias                  |          1 |           3 |           8 |
| Fotos, incluindo logo/capa  |          3 |          10 |          30 |
| Serviços                    |          0 |          15 |          50 |
| Promoções armazenadas       |          0 |           3 |          10 |
| Histórico de analytics      | Sem acesso | Até 30 dias | Até 90 dias |
| Elegível a destaque na home |        Não |         Não |         Sim |

Quantidades não definidas no pedido foram explicitadas acima como configuração inicial. A fonte é `plans.limits`; altere por migration, não espalhe condicionais pelo frontend. A assinatura vigente determina os benefícios; `companies.plan_id` é apenas cache. Vencimento remove elegibilidade automaticamente pela data, sem depender de cron para negar acesso.

Em downgrade, dados são preservados e novos cadastros ficam bloqueados até adequação. FREE oculta serviços e promoções publicamente; fotos já existentes são preservadas. Não há exclusão automática de conteúdo pago. Promoções vencidas continuam no painel e podem ser removidas para liberar quota. Assinaturas novas exigem cancelar a anterior; upgrade com rateio/prorrata não está implementado.

## Segurança e RLS

- A API verifica proprietário e retorna 403 para empresa alheia. RLS protege também chamadas diretas autenticadas ao banco.
- Cada transação define role e claims locais; o pool não reaproveita identidade após commit/rollback.
- Tabelas de empresas não possuem SELECT público. `public_companies` é uma view com campos comerciais explícitos e somente empresas ACTIVE.
- Imagens ficam em bucket privado; conteúdo é detectado pelos bytes, decodificado e reencodificado. Nome/extensão não definem o formato.
- JWT, dados de pagamento, senhas e corpos de requisição não entram no logger HTTP. Erros internos ficam nos logs do servidor, nunca no JSON público.
- Quotas têm lock da empresa e trigger no PostgreSQL; transições administrativas e auditoria são atômicas.
- Eventos não armazenam IP puro. Há deduplicação de visualização por 30 minutos e cliques por 60 segundos, usando sessão ou hash de rede/agente.
- Métricas não são prova de venda e podem ser afetadas por redes compartilhadas/bots sofisticados.
- O rate limiter usa memória: inicialmente execute uma instância; antes de escalar horizontalmente adote store compartilhado. Ajuste TRUST_PROXY_HOPS ao ambiente real, sem confiar livremente em X-Forwarded-For.

## Mercado Pago e webhook

O backend cria uma assinatura pendente em `/preapproval` e devolve o checkout hospedado. Não manipula cartão. Registra valor e moeda contratados e mantém PENDING até comprovar uma cobrança aprovada.

Configure no painel do provedor:

```text
https://SEU_HOST_DA_API/api/webhooks/mercadopago
```

Habilite subscription_preapproval, subscription_authorized_payment e payment. Copie o segredo de assinatura para o backend. O webhook verifica HMAC, ID de recurso e timestamp, consulta a API oficial, confere assinatura/valor/moeda e atualiza pagamento, benefícios e auditoria em transação. Apenas autorização da assinatura não libera plano.

ID do evento é único; o pagamento também é único por provedor/ID. Snapshots antigos não substituem pagamento mais novo. Estorno revoga benefícios quando não há outro período pago vigente. Cancelamento para próximas cobranças preserva período já pago.

Falha de criação com resultado incerto mantém a reserva pendente e bloqueia criação duplicada. A notificação de preapproval pode reconciliar pelo external_reference. Se a notificação não chegar, o operador deve consultar a assinatura no painel/API pelo external_reference, reconciliar e só então permitir nova contratação. Não delete a reserva nem tente cobrar de novo sem confirmar o estado externo.

Notificações falhas ficam com processed_at=null e retornam erro. Configure alertas para essas linhas e erros 5xx. A homologação deve confirmar criação, pagamento, renovação, cancelamento, reenvio, assinatura HMAC e estorno com contas de teste próprias. Não foi feita cobrança real na entrega.

Referências: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Mercado Pago assinaturas pendentes](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments), [webhooks](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks).

## Deploy

1. Use projeto Supabase e credenciais separados para homologação e produção.
2. Execute migrations/seed em job administrativo antes da nova versão da API. Não execute migrations automaticamente em cada réplica.
3. Faça build com `npm ci && npm run build`; execute `npm start`. Há Dockerfile usando Node 24 e usuário não-root.
4. Configure HTTPS no proxy, domínio da API, CORS e redirects do frontend.
5. Armazene segredos no mecanismo do host, nunca na imagem Docker.
6. Configure probes `/health` e `/ready`, monitoramento de 5xx, retenção de logs, backups PostgreSQL e backup separado dos objetos Storage. Teste restauração.
7. Rode a homologação completa das integrações antes de habilitar cobrança pública.

O Dockerfile foi incluído como receita de deploy; a imagem Docker não foi construída nesta entrega. Não foi publicado domínio nem alterado DNS.

## Troubleshooting

| Sintoma                          | Verificação                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Env inválido ao iniciar          | Preencha todas as variáveis obrigatórias; IP_HASH_SECRET >=32 caracteres                             |
| permission denied to set role    | DATABASE_URL não permite assumir os papéis necessários                                               |
| relation does not exist          | Execute migrations na mesma base usada pelo runtime                                                  |
| Perfil não encontrado após login | Trigger em auth.users precisa existir antes de cadastrar; contas anteriores exigem backfill revisado |
| E-mail de confirmação não chega  | SMTP, confirmação e redirect URLs no Supabase                                                        |
| 403 ao editar                    | Token de outro proprietário, conta suspensa ou recurso não permitido                                 |
| 400 ao criar recurso             | Constraint, plano/quota ou dados inconsistentes; consulte logs internos quando necessário            |
| Promoção não aparece             | Empresa ACTIVE, plano habilitado, is_active, starts_at e ends_at                                     |
| Imagem 404                       | Empresa não publicada; dono deve usar /api/me/images/:id                                             |
| Webhook 401                      | Segredo, headers, query data.id e relógio do servidor                                                |
| Reserva pendente após timeout    | Reconcilie no provedor; não repita cobrança cegamente                                                |
| Erro TLS PostgreSQL              | Use certificado válido do provedor; não desabilite validação em produção                             |

## Escopo da entrega

Código de backend, schema/RLS, seed, testes e documentação. A conexão do frontend, provisionamento de Supabase, credenciais, DNS, SMTP e homologação de pagamentos exigem configuração externa. A base já suporta esses serviços, mas testes locais não equivalem à certificação de produção.

## Certificado PostgreSQL

`DATABASE_SSL_CA_FILE=certs/supabase-ca.crt` configura a CA pública do Supabase para o servidor, migrations e provisionamento administrativo. `DATABASE_SSL=true` mantém a validação da cadeia e do hostname. Execute os comandos na pasta backend. Não é necessário desabilitar SSL ou validar certificados de forma permissiva.
