# Testar frontend + API localmente

Abra dois terminais na pasta encontrai:

1. Backend: `cd backend` e `npm run dev` (porta 3001).
2. Frontend: na raiz, `npm run dev` (porta 5173).
3. Acesse http://localhost:5173, crie sua conta e entre.
4. Em **Cadastrar empresa**, salve os dados. Em **Minhas empresas**, envie para aprovação.
5. Após aprovação administrativa, o cadastro aparece na busca pública.

O frontend usa `/api`, encaminhado pelo Vite ao backend local. Não precisa copiar as chaves do Supabase para o frontend. As credenciais privadas permanecem em `backend/.env`.

Para confirmação de e-mail e recuperação de senha, `FRONTEND_URL` do backend deve ser `http://localhost:5173`. No Supabase, autorize os redirects `http://localhost:5173/auth/callback` e `http://localhost:5173/auth/reset-password`. Se a confirmação estiver habilitada, confirme o e-mail antes do primeiro login.

A sessão fica em sessionStorage, com renovação automática. Fechar a aba encerra o armazenamento daquela sessão. O painel exige autenticação e o backend valida a propriedade dos cadastros.

## Publicação

O proxy do Vite vale somente para desenvolvimento. Na hospedagem, configure um proxy HTTPS `/api` para o backend ou defina `VITE_API_URL=https://seu-backend/api` antes do build. Configure também CORS_ORIGINS e FRONTEND_URL do backend, além dos redirects do Supabase, para o domínio final. Nunca coloque DATABASE_URL ou SERVICE_ROLE_KEY em variáveis VITE_*.

## Cobertura desta integração

Cadastro/login, confirmação de e-mail, recuperação de senha, painel do proprietário, cadastro/edição/envio de empresas para análise, catálogos reais, busca com filtros/paginação e perfil público com contato. O painel administrativo de aprovação, uploads e pagamentos ainda não têm telas nesta entrega; suas operações existentes continuam na API.

Verificação: `npm run typecheck`, `npm test`, `npm run build`. Os testes do frontend usam API simulada para não criar contas ou enviar e-mails reais. O backend possui sua própria suíte: `cd backend` e `npm run check`. O lint geral do frontend tem pendências antigas de formatação CRLF nos arquivos originais.

## Painel administrativo

Acesse http://localhost:5173/admin após entrar com uma conta ADMIN. O menu Administração aparece apenas para esse perfil. Contas comuns recebem uma mensagem de acesso restrito; a API também exige ADMIN em todas as operações.

O painel oferece resumo de empresas, pendências, usuários e assinaturas ativas; filtro e paginação de empresas; aprovação, rejeição com motivo e suspensão; consulta e suspensão de usuários (exceto a própria conta); e interações dos últimos 30 dias. As ações exigem confirmação antes do envio. A reativação de empresas/usuários ainda não é oferecida pela API existente.

Para provisionar o primeiro administrador, crie a conta pelo site e, na pasta backend, execute `npm run admin:grant -- UUID_DO_USUARIO`. É necessário configurar MIGRATION_DATABASE_URL. Nenhuma conta é promovida automaticamente pela interface.
