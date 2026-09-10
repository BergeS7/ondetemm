# Contrato HTTP — Onde Tem

Prefixo `/api`. JSON; token `Authorization: Bearer <access_token>` do Supabase. Datas ISO 8601 com timezone; UUIDs; valores monetários em reais, retornados pelo PostgreSQL como strings decimais em registros. Senhas são encaminhadas ao Supabase Auth, nunca persistidas pela aplicação.

## Listagens

`page=1&limit=20`, máximo 100 e página máxima 10000. Resposta `{data:[],pagination:{page,limit,total,totalPages}}`. Os relacionamentos do perfil público usam essa mesma estrutura e compartilham os parâmetros de página. Analytics é uma agregação limitada a até 90 dias, não uma listagem ilimitada de eventos.

## Autenticação e usuário

| Método e caminho           | Acesso / corpo                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------- |
| POST /auth/register        | Público; `{name,email,password}`; 201; confirmação por e-mail pode deixar session=null |
| POST /auth/login           | Público; `{email,password}`                                                            |
| POST /auth/refresh         | Público; `{refresh_token}`                                                             |
| POST /auth/forgot-password | Público; `{email}`; resposta neutra                                                    |
| POST /auth/reset-password  | Token válido da sessão de recuperação; `{password}`                                    |
| POST /auth/logout          | Autenticado; revoga sessões via Supabase                                               |
| GET /auth/me               | Autenticado; perfil próprio                                                            |
| PATCH /me                  | Autenticado; `{name?,phone?,avatar_url?}`                                              |

## Localização, categorias e planos

GET `/states`, `/states/:stateId/cities`, `/cities/:cityId/neighborhoods`, `/locations/search?q=`, `/categories`, `/plans`: públicos e paginados.

## Empresas

| Método e caminho                         | Acesso / comportamento                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| POST /companies                          | Autenticado; cria DRAFT; proprietário é derivado do token                   |
| GET /companies/:id                       | Dono/admin; inclui motivo de rejeição                                       |
| PATCH /companies/:id                     | Dono/admin; campos comerciais e category_ids; não aceita status/plano/owner |
| DELETE /companies/:id                    | Dono/admin; soft delete; cancele assinatura antes                           |
| GET /me/companies                        | Autenticado; empresas próprias                                              |
| POST /companies/:id/submit               | Dono; exige rua, WhatsApp e categoria; DRAFT/REJECTED → PENDING_APPROVAL    |
| GET /public/:state/:city/companies/:slug | Público; apenas ACTIVE; relacionamentos paginados, openStatus e SEO         |

Criação mínima:

```json
{
  "name": "Churrascaria do Zé",
  "short_description": "Churrasco em Santa Inês",
  "description": "Restaurante com almoço e jantar.",
  "state_id": "UUID retornado por /states",
  "city_id": "UUID retornado por /states/:id/cities",
  "street": "Rua Central",
  "whatsapp": "5598999999999",
  "category_ids": ["UUID retornado por /categories"]
}
```

Também aceita legal_name, cnpj (14 dígitos), email, phone, website/instagram HTTP(S), neighborhood_id/neighborhood, number, complement, zipcode (8 dígitos), latitude, longitude, keywords. Nome gera slug estável com sufixo aleatório; renomear não quebra URL. OWNER não é enviado no corpo.

## Serviços, horários, imagens e promoções

| Método e caminho                                                | Acesso                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| POST /companies/:companyId/services                             | Dono/admin, plano habilitado                                    |
| GET /companies/:companyId/services                              | Público; ativos de empresa publicada                            |
| GET /me/companies/:companyId/services                           | Dono/admin; inclui inativos                                     |
| PATCH /services/:id, DELETE /services/:id                       | Dono/admin                                                      |
| PUT /companies/:id/hours                                        | Dono/admin; substituição transacional `{hours:[...]}`           |
| GET /me/companies/:id/hours                                     | Dono/admin                                                      |
| POST /companies/:id/images                                      | Dono/admin; multipart `file`, `type`, `sort_order?`             |
| GET /images/:id                                                 | Público se empresa ativa; redireciona para URL assinada de 60 s |
| GET /me/images/:id                                              | Dono/admin; também imagens de rascunho                          |
| DELETE /images/:id                                              | Dono/admin                                                      |
| POST /companies/:id/promotions                                  | Dono/admin, plano habilitado                                    |
| GET /companies/:id/promotions                                   | Público; vigentes e ativas                                      |
| GET /me/companies/:id/promotions                                | Dono/admin; inclui vencidas                                     |
| PATCH /promotions/:id, DELETE /promotions/:id                   | Dono/admin                                                      |
| GET /promotions?state=ma&city=santa-ines&category=churrascarias | Público                                                         |

Serviço: `{name,description?,price?,price_type:FIXED|STARTING_AT|CONTACT,image_url?,is_active?}`. CONTACT exige price=null/ausente. Outros tipos exigem preço >=0.

Horário: `{day_of_week:0..6,opens_at:"08:00",closes_at:"18:00",is_closed:false}`; domingo=0. Fechado: horários null. Período 22:00–02:00 cruza a meia-noite. Máximo 28 períodos.

Imagem: JPEG/PNG/WebP até 5 MB e 20 megapixels; reencodificada em WebP, máximo 2000×2000. Types LOGO/COVER/GALLERY/SERVICE/PROMOTION; um logo e uma capa. Para substituir, remover a anterior. Todas contam no limite de fotos.

Promoção: `{title,description?,original_price?,promotional_price?,image_url?,starts_at,ends_at,is_active?}`. Fim posterior ao início; preço promocional não pode ultrapassar original. Vencidas permanecem no painel e contam no limite até serem removidas.

## Busca e analytics

GET `/search`: q, state (UF), city (slug), category (slug), neighborhood, page, limit, sort=relevance|rating|name|recent, open_now=true|false, has_promotion=true|false. Entende `onde tem churrascaria em Santa Inês` quando o nome identifica uma cidade única. Retorna is_sponsored e plan_code para identificação de destaque.

POST `/events`: `{company_id,event_type,session_id?,metadata?:{promotion_id?,source?}}`. Eventos PROFILE_VIEW, WHATSAPP_CLICK, PHONE_CLICK, INSTAGRAM_CLICK, WEBSITE_CLICK, ROUTE_CLICK, PROMOTION_CLICK. `promotion_id` obrigatório para clique em promoção. Não aceita user_id/IP pelo corpo. Resposta 202 `{accepted:true,counted:boolean}`.

GET `/companies/:id/analytics?period=7d|30d|90d`: dono/admin; plano controla período. Contadores e `series` por dia com atividade, timezone da cidade. Dias sem eventos podem ser preenchidos com zero pelo gráfico. Cliques não representam vendas confirmadas.

## Assinaturas

POST `/companies/:id/subscriptions`: dono/admin, `{plan_code:"FEATURED"|"PREMIUM"}`; retorna PENDING e checkout_url. GET no mesmo caminho lista assinaturas. POST `/subscriptions/:id/cancel` cancela recorrência no provedor e preserva período já pago quando existir.

POST `/webhooks/mercadopago?data.id=...`: headers `x-signature`, `x-request-id`; body nativo `{id,type,data:{id}}`. Tipos subscription_preapproval, subscription_authorized_payment e payment. Resposta 200 somente depois de transação concluída. Evento falho fica sem processed_at e retorna erro para permitir retry.

## Admin

Requer ADMIN ativo em profiles. GET `/admin/dashboard`, `/admin/companies`, `/admin/companies/pending`, `/admin/users`, `/admin/plans`, `/admin/subscriptions`, `/admin/analytics`, `/admin/audit-logs`.

POST `/admin/companies/:id/approve`, `/reject` (body `{reason}`), `/suspend`. Aprovar/rejeitar exige PENDING_APPROVAL. Suspensão é bloqueio de publicação. POST `/admin/users/:id/suspend` com `{reason}`; não permite suspender a própria conta administrativa.

## Erros

`{error:{code,message}}`: 400 validação/regra, 401 token, 403 permissão, 404 inexistente/não publicado, 409 conflito, 413 tamanho, 429 limite, 500 interno, 502 provedor, 503 não configurado. Stack trace só nos logs do servidor.
