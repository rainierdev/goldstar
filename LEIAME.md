# Site Grupo Star

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Site para os clientes (abertura, simulador, mapa do patrimônio, entregas, avaliações) |
| `admin.html` | Painel do dono (também tem o link "Área do dono" no rodapé do site) |
| `js/config.js` | Valores iniciais e chave do Firebase |
| `js/store.js` | Onde o painel guarda o que o dono salva |
| `firestore.rules` | Regras de segurança do banco de dados online |

## O que o dono altera no painel

- **Simulador e taxas:** para automóvel, imóvel e pesados: nome, faixa de carta, prazos, taxa de administração, fundo de reserva e juros do financiamento usados na comparação. Cada taxa tem um valor sugerido, a faixa de mercado e um alerta quando o número foge do comum.
- **Textos do site:** título e subtítulo do topo, aviso embaixo do simulador e faixa de destaques.
- **Mapa do patrimônio:** valor sugerido de cada objetivo (casa, carro, trator...).
- **Avaliações:** adicionar, editar, remover e marcar como exemplo.
- **Contato e backup:** WhatsApp, Instagram, baixar e importar backup, voltar aos valores iniciais.
- **Guia:** resumo do que a lei diz sobre as taxas, a comparação com o financiamento e os dados dos visitantes.

---

## ⚠️ Modo demonstração x modo online

Do jeito que está (`supabase: null` e `firebase: null` em `js/config.js`), o painel funciona em **modo demonstração**: o que o dono salva fica **só no navegador de quem salvou**. Serve para testar, mas os visitantes não veem as mudanças.

Senha do painel no modo demonstração: **1234** (troque em "Contato e backup").

### Ativar o modo online com Supabase (recomendado, grátis, cerca de 10 minutos)

1. Acesse https://supabase.com, entre e clique em **New project**. Região: **South America (São Paulo)**. Guarde a senha do banco num lugar seguro (o site não usa).
2. **Authentication › Users › Add user › Create new user**: cadastre o e-mail e uma senha forte do dono (marque *Auto Confirm User*). É com eles que o dono entra no painel.
3. **Authentication › Sign In / Providers**: deixe *Email* ligado e **desligue "Allow new users to sign up"**, para ninguém criar conta sozinho.
4. **SQL Editor › New query**: cole o conteúdo de `supabase.sql`, troque `EMAIL_DO_DONO@gmail.com` pelo e-mail do passo 2 e clique em **Run**.
5. **Project Settings › API**: copie a **Project URL** e a chave **anon public**.
6. Em `js/config.js`, troque `supabase: null` por `{ url: "...", chave: "..." }` (há um exemplo no arquivo) e publique o site.
7. Entre no painel com o e-mail e a senha do passo 2 e clique em **Salvar** uma vez para gravar a configuração no banco.

Os leads ficam em **Table Editor › leads**, onde dá para filtrar e exportar CSV também pelo Supabase.

⚠️ No plano grátis, o Supabase pausa o projeto depois de cerca de 1 semana sem atividade. Se isso acontecer, o site continua no ar com os valores iniciais, mas o painel não salva e os leads não chegam até alguém clicar em **Restore project** no Supabase. No plano pago isso não acontece.

### Ativar o modo online com Firebase (alternativa)

1. Acesse https://console.firebase.google.com e crie um projeto (ex.: `grupo-star`).
2. **Firestore Database**: clique em *Criar banco de dados*, escolha a região `southamerica-east1 (São Paulo)` e o modo de produção.
3. **Authentication**: clique em *Vamos começar*, ative *E-mail/senha* e, na aba *Usuários*, adicione o e-mail e a senha do dono.
4. **Firestore, aba Regras**: cole o conteúdo de `firestore.rules`, troque `EMAIL_DO_DONO@gmail.com` pelo e-mail do passo 3 e publique.
5. **Configurações do projeto** (engrenagem), em *Seus apps*, clique no ícone `</>`, registre o app e copie o objeto `firebaseConfig`.
6. Em `js/config.js`, troque `firebase: null` pelo objeto copiado (há um exemplo no arquivo).
7. Publique o site de novo e entre no painel com o e-mail e a senha do passo 3. Clique em **Salvar** uma vez para gravar os valores no banco.

Depois, adicione o domínio do site em Firebase, *Authentication*, *Configurações*, *Domínios autorizados*.

## Ao publicar uma atualização

Troque o número de versão (`?v=...`) nos links de `css/style.css` e `js/*.js` em `index.html` e `admin.html`. Assim o navegador dos visitantes baixa os arquivos novos na hora, em vez de usar a cópia guardada.
