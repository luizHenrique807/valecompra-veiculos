# ValeCompra Veículos

Código-fonte autônomo: **TanStack Start + Vercel + Supabase**. Não precisa de créditos Lovable para alterações.

- Formulário com dados do veículo e até 5 fotos JPG/PNG/WEBP de até 5 MB.
- Painel `/admin` protegido, fotos privadas e botão de WhatsApp exclusivo do administrador.
- Nenhum botão público de WhatsApp.

## Antes de atender clientes
1. Crie um projeto **Supabase independente** e aplique `supabase/migrations/20261016000000_init_valecompra.sql` no SQL Editor. Configure em Supabase Authentication > URL Configuration a URL do site e o redirecionamento para o domínio Vercel em `/auth`. O login por link de e-mail dispensa configurar um aplicativo Google OAuth.
2. Configure no Vercel as variáveis de `.env.example`. Não é preciso informar uma chave de serviço. Nunca publique credenciais administrativas no GitHub.
3. O e-mail do proprietário é configurado de forma privada no banco. Entre em `/auth` por link enviado ao e-mail verificado e, em `/admin`, clique **Verificar acesso do proprietário**. O banco concede a permissão somente ao endereço previamente autorizado.
4. Complete o nome e contato real do responsável e o prazo de retenção na política de privacidade.
5. Faça um teste completo de envio de formulário, upload das cinco fotos, leitura restrita do painel e abertura do WhatsApp; remova os dados de teste.
6. Não desligue o banco Lovable Cloud antes de migrar e verificar todos os dados necessários.

Desenvolvimento: `npm install && npm run dev`. Testes: `npm run test && npm run build`.
