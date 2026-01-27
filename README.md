# GameAccounts - Marketplace de Contas de Jogos

Um marketplace completo para compra e venda de contas de jogos desenvolvido com HTML, CSS e JavaScript vanilla.

## 🚀 Funcionalidades

### 🛍️ Para Compradores
- Busca avançada de contas por jogo, preço e características
- Sistema de favoritos
- Carrinho de compras
- Checkout simplificado com múltiplos métodos de pagamento
- Chat com vendedores
- Sistema de avaliações
- Histórico de compras

### 💰 Para Vendedores
- Publicação de contas com formulários específicos por jogo
- Upload de screenshots
- Gestão de anúncios
- Histórico de vendas
- Sistema de mensagens
- Dashboard de performance

### 🔐 Segurança
- Verificação de dados
- Sistema de denúncia
- Selo de verificação para contas e vendedores
- Proteção contra fraudes
- Backup local dos dados

## 🎮 Jogos Suportados

1. **Genshin Impact**
   - AR Level
   - Personagens 5★
   - Armas 5★
   - Primogems
   - Servidor

2. **League of Legends**
   - Rank
   - Champions
   - Skins
   - RP
   - Level

3. **Valorant**
   - Rank
   - Agents
   - Skins
   - Valorant Points

4. **Mobile Legends**
   - Rank
   - Heroes
   - Skins
   - Diamonds

5. **Diablo IV**
   - Level
   - Characters
   - Gold
   - Items

6. **Fortnite, Free Fire, Call of Duty, Overwatch 2, Minecraft**

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Armazenamento:** IndexedDB (fallback para LocalStorage)
- **Bibliotecas:**
  - Font Awesome (ícones)
  - SweetAlert2 (modais)
  - Swiper.js (carrosséis)
- **APIs:** FileReader (upload de imagens)

## 📁 Estrutura do Projeto

game-accounts/
├── index.html # Página inicial
├── listings.html # Lista de contas
├── account-detail.html # Detalhes da conta
├── sell.html # Publicar conta
├── cart.html # Carrinho
├── checkout.html # Checkout
├── dashboard.html # Área do usuário
├── about.html # Sobre
├── contact.html # Contato
├── terms.html # Termos
├── css/
│ ├── style.css # Estilos principais
│ ├── components.css # Componentes
│ └── responsive.css # Responsividade
├── js/
│ ├── app.js # Lógica principal
│ ├── database.js # Banco de dados
│ ├── cart.js # Carrinho
│ ├── forms.js # Formulários
│ ├── chat.js # Chat
│ └── ui.js # UI helpers
└── images/ # Assets