// Sistema de Carrinho de Compras

class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
        this.updateCartCount();
        this.setupEventListeners();
    }

    // Adiciona conta ao carrinho
    addAccount(account) {
        // Verifica se a conta já está no carrinho
        if (this.items.some(item => item.id === account.id)) {
            this.showNotification('Esta conta já está no carrinho!', 'warning');
            return false;
        }

        // Adiciona ao carrinho
        this.items.push({
            ...account,
            added_at: new Date().toISOString(),
            cart_id: Date.now() + Math.random().toString(36).substr(2, 9)
        });

        this.save();
        this.updateCartCount();
        this.showNotification('Conta adicionada ao carrinho!', 'success');
        return true;
    }

    // Remove conta do carrinho
    removeAccount(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.save();
        this.updateCartCount();
        
        // Atualiza a UI se estiver na página do carrinho
        if (window.location.pathname.includes('cart.html')) {
            this.renderCartItems();
        }
        
        this.showNotification('Conta removida do carrinho!', 'info');
    }

    // Limpa todo o carrinho
    clearCart() {
        this.items = [];
        this.save();
        this.updateCartCount();
        
        if (window.location.pathname.includes('cart.html')) {
            this.renderCartItems();
        }
        
        this.showNotification('Carrinho esvaziado!', 'info');
    }

    // Calcula total do carrinho
    calculateTotal() {
        return this.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    }

    // Calcula total de itens
    getItemCount() {
        return this.items.length;
    }

    // Salva carrinho no localStorage
    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.dispatchCartUpdateEvent();
    }

    // Atualiza contador no header
    updateCartCount() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(element => {
            element.textContent = this.getItemCount();
            element.style.display = this.getItemCount() > 0 ? 'flex' : 'none';
        });
    }

    // Renderiza itens na página do carrinho
    renderCartItems() {
        const cartContainer = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const emptyCart = document.getElementById('emptyCart');
        const cartWithItems = document.getElementById('cartWithItems');

        if (!cartContainer) return;

        if (this.items.length === 0) {
            emptyCart?.classList.remove('hidden');
            cartWithItems?.classList.add('hidden');
            return;
        }

        emptyCart?.classList.add('hidden');
        cartWithItems?.classList.remove('hidden');

        // Renderiza cada item
        cartContainer.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="images/${item.images?.[0] || 'default-account.jpg'}" alt="${item.title}">
                </div>
                
                <div class="cart-item-details">
                    <div class="cart-item-header">
                        <h3 class="cart-item-title">${item.title}</h3>
                        <button class="btn-remove" onclick="cart.removeAccount('${item.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="cart-item-game">
                        <span class="game-badge">${this.getGameName(item.game)}</span>
                    </div>
                    
                    <div class="cart-item-features">
                        ${this.renderFeatures(item)}
                    </div>
                    
                    <div class="cart-item-seller">
                        <i class="fas fa-user"></i>
                        <span>${item.seller}</span>
                    </div>
                </div>
                
                <div class="cart-item-price">
                    <div class="price">R$ ${item.price.toFixed(2)}</div>
                    <button class="btn-move-favorites" onclick="cart.moveToFavorites('${item.id}')">
                        <i class="far fa-heart"></i> Favoritar
                    </button>
                </div>
            </div>
        `).join('');

        // Atualiza total
        if (cartTotal) {
            const total = this.calculateTotal();
            cartTotal.textContent = `R$ ${total.toFixed(2)}`;
            document.getElementById('checkoutTotal')?.textContent = `R$ ${total.toFixed(2)}`;
        }
    }

    // Renderiza features da conta
    renderFeatures(account) {
        if (!account.features) return '';
        
        const features = [];
        
        switch (account.game) {
            case 'genshin':
                if (account.features.ar_level) features.push(`AR ${account.features.ar_level}`);
                if (account.features.five_star_chars) features.push(`${account.features.five_star_chars}x 5★`);
                if (account.features.primogems) features.push(`${account.features.primogems} Primogems`);
                break;
            case 'lol':
                if (account.features.rank) features.push(`Rank: ${account.features.rank}`);
                if (account.features.champions) features.push(`${account.features.champions} Champions`);
                if (account.features.skins) features.push(`${account.features.skins} Skins`);
                break;
            case 'valorant':
                if (account.features.rank) features.push(`Rank: ${account.features.rank}`);
                if (account.features.agents) features.push(`${account.features.agents} Agents`);
                break;
        }
        
        return features.map(feat => `<span class="feature-tag">${feat}</span>`).join('');
    }

    // Move item para favoritos
    moveToFavorites(accountId) {
        const account = this.items.find(item => item.id === accountId);
        if (!account) return;

        // Remove do carrinho
        this.removeAccount(accountId);

        // Adiciona aos favoritos
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            db.addFavorite(userId, accountId)
                .then(() => {
                    this.showNotification('Conta movida para favoritos!', 'success');
                })
                .catch(error => {
                    console.error('Erro ao favoritar:', error);
                    this.showNotification('Erro ao favoritar conta', 'error');
                });
        } else {
            this.showNotification('Faça login para usar favoritos', 'warning');
        }
    }

    // Inicia checkout
    async startCheckout() {
        if (this.items.length === 0) {
            this.showNotification('Adicione itens ao carrinho antes de finalizar', 'warning');
            return;
        }

        // Verifica se o usuário está logado
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            this.showNotification('Faça login para finalizar a compra', 'warning');
            
            // Redireciona para login com return URL
            localStorage.setItem('returnUrl', 'checkout.html');
            window.location.href = 'login.html';
            return;
        }

        // Redireciona para checkout
        window.location.href = 'checkout.html';
    }

    // Processa checkout
    async processCheckout(paymentMethod, buyerInfo) {
        try {
            const transactionPromises = this.items.map(async (item) => {
                const transaction = await db.createTransaction({
                    account_id: item.id,
                    buyer_id: buyerInfo.userId,
                    seller_id: item.seller_id || item.seller,
                    amount: item.price,
                    payment_method: paymentMethod,
                    buyer_email: buyerInfo.email,
                    buyer_phone: buyerInfo.phone
                });

                // Atualiza status da conta para "vendida"
                await db.updateAccount(item.id, {
                    status: 'sold',
                    sold_at: new Date().toISOString(),
                    transaction_id: transaction.id
                });

                return transaction;
            });

            await Promise.all(transactionPromises);

            // Limpa carrinho após sucesso
            this.clearCart();

            // Gera mensagem do WhatsApp
            const whatsappMessage = this.generateWhatsAppMessage(buyerInfo);
            
            return {
                success: true,
                transactions: transactionPromises.length,
                total: this.calculateTotal(),
                whatsappMessage: whatsappMessage
            };
        } catch (error) {
            console.error('Erro no checkout:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Gera mensagem para WhatsApp
    generateWhatsAppMessage(buyerInfo) {
        const itemsList = this.items.map(item => 
            `• ${item.title} - R$ ${item.price.toFixed(2)}`
        ).join('%0A');
        
        const total = this.calculateTotal().toFixed(2);
        
        return `Olá! Gostaria de finalizar minha compra no GameAccounts:%0A%0A` +
               `*Itens no Carrinho:*%0A${itemsList}%0A%0A` +
               `*Total:* R$ ${total}%0A` +
               `*Nome:* ${buyerInfo.name}%0A` +
               `*Email:* ${buyerInfo.email}%0A` +
               `*Telefone:* ${buyerInfo.phone}%0A%0A` +
               `Por favor, confirme os dados e me informe como proceder com o pagamento.`;
    }

    // Configura event listeners
    setupEventListeners() {
        // Listener para botões "Adicionar ao Carrinho"
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.btn-add-to-cart, .btn-buy');
            if (addToCartBtn) {
                e.preventDefault();
                
                const accountId = addToCartBtn.dataset.accountId;
                if (accountId) {
                    // Busca dados da conta
                    db.getAccount(accountId)
                        .then(account => {
                            if (account) {
                                this.addAccount(account);
                            } else {
                                this.showNotification('Conta não encontrada', 'error');
                            }
                        })
                        .catch(error => {
                            console.error('Erro ao buscar conta:', error);
                            this.showNotification('Erro ao adicionar ao carrinho', 'error');
                        });
                }
            }
        });

        // Listener para limpar carrinho
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clearCart')) {
                e.preventDefault();
                Swal.fire({
                    title: 'Tem certeza?',
                    text: 'Isso removerá todos os itens do seu carrinho.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sim, limpar!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.clearCart();
                    }
                });
            }
        });

        // Listener para checkout
        document.addEventListener('click', (e) => {
            if (e.target.closest('#checkoutBtn, #proceedToCheckout')) {
                e.preventDefault();
                this.startCheckout();
            }
        });
    }

    // Mostra notificação
    showNotification(message, type = 'info') {
        // Remove notificação anterior
        const existingNotification = document.querySelector('.cart-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Cria nova notificação
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Adiciona ao DOM
        document.body.appendChild(notification);

        // Adiciona classe para animação
        setTimeout(() => notification.classList.add('show'), 10);

        // Configura botão de fechar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });

        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Retorna ícone baseado no tipo de notificação
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'bell';
        }
    }

    // Retorna nome do jogo
    getGameName(gameCode) {
        const games = {
            'genshin': 'Genshin Impact',
            'lol': 'League of Legends',
            'valorant': 'Valorant',
            'mobile-legends': 'Mobile Legends',
            'diablo': 'Diablo IV',
            'fortnite': 'Fortnite',
            'free-fire': 'Free Fire',
            'cod': 'Call of Duty',
            'overwatch': 'Overwatch 2',
            'minecraft': 'Minecraft'
        };
        
        return games[gameCode] || gameCode;
    }

    // Dispara evento de atualização do carrinho
    dispatchCartUpdateEvent() {
        const event = new CustomEvent('cartUpdated', {
            detail: { itemCount: this.getItemCount(), total: this.calculateTotal() }
        });
        window.dispatchEvent(event);
    }
}

// Inicializa o carrinho
const cart = new ShoppingCart();

// CSS para notificações
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .cart-notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 15px 20px;
        min-width: 300px;
        max-width: 400px;
        box-shadow: var(--shadow-card);
        z-index: 9999;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
    }

    .cart-notification.show {
        transform: translateX(0);
    }

    .cart-notification.success {
        border-left: 4px solid var(--accent-green);
    }

    .cart-notification.error {
        border-left: 4px solid var(--accent-red);
    }

    .cart-notification.warning {
        border-left: 4px solid #ffa502;
    }

    .cart-notification.info {
        border-left: 4px solid var(--neon-blue);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
    }

    .notification-content i {
        font-size: 1.2rem;
    }

    .notification-close {
        background: none;
        border: none;
        color: var(--text-gray);
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: var(--transition-fast);
    }

    .notification-close:hover {
        color: var(--text-light);
        background: rgba(255, 255, 255, 0.1);
    }
`;

document.head.appendChild(notificationStyles);

export default cart;