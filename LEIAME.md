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

Do jeito que está (`firebase: null` em `js/config.js`), o painel funciona em **modo demonstração**: o que o dono salva fica **só no navegador de quem salvou**. Serve para testar, mas os visitantes não veem as mudanças.

Senha do painel no modo demonstração: **1234** (troque em "Contato e backup").

### Ativar o modo online (grátis, cerca de 15 minutos)

1. Acesse https://console.firebase.google.com e crie um projeto (ex.: `grupo-star`).
2. **Firestore Database**: clique em *Criar banco de dados*, escolha a região `southamerica-east1 (São Paulo)` e o modo de produção.
3. **Authentication**: clique em *Vamos começar*, ative *E-mail/senha* e, na aba *Usuários*, adicione o e-mail e a senha do dono.
4. **Firestore, aba Regras**: cole o conteúdo de `firestore.rules`, troque `EMAIL_DO_DONO@gmail.com` pelo e-mail do passo 3 e publique.
5. **Configurações do projeto** (engrenagem), em *Seus apps*, clique no ícone `</>`, registre o app e copie o objeto `firebaseConfig`.
6. Em `js/config.js`, troque `firebase: null` pelo objeto copiado (há um exemplo no arquivo).
7. Publique o site de novo e entre no painel com o e-mail e a senha do passo 3. Clique em **Salvar** uma vez para gravar os valores no banco.

Depois, adicione o domínio do site em Firebase, *Authentication*, *Configurações*, *Domínios autorizados*.
