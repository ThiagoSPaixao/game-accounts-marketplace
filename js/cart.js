// Sistema de Carrinho de Compras COMPLETO

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

        // Verifica se a conta está disponível
        if (account.status && account.status !== 'available') {
            this.showNotification('Esta conta não está mais disponível para venda', 'error');
            return false;
        }

        // Adiciona ao carrinho
        const cartItem = {
            ...account,
            cart_id: Date.now() + Math.random().toString(36).substr(2, 9),
            added_at: new Date().toISOString(),
            quantity: 1
        };

        this.items.push(cartItem);
        this.save();
        this.updateCartCount();
        this.showNotification('Conta adicionada ao carrinho!', 'success');
        
        // Dispara evento customizado
        this.dispatchCartUpdateEvent();
        
        return true;
    }

    // Remove conta do carrinho
    removeAccount(id) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== id);
        
        if (this.items.length !== initialLength) {
            this.save();
            this.updateCartCount();
            
            // Atualiza a UI se estiver na página do carrinho
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartItems();
            }
            
            this.showNotification('Conta removida do carrinho!', 'info');
            this.dispatchCartUpdateEvent();
        }
    }

    // Atualiza quantidade de um item (se aplicável)
    updateQuantity(id, quantity) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            item.quantity = Math.max(1, Math.min(10, quantity)); // Limita entre 1 e 10
            this.save();
            this.updateCartCount();
            
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartItems();
            }
            
            this.dispatchCartUpdateEvent();
        }
    }

    // Limpa todo o carrinho
    clearCart() {
        if (this.items.length === 0) return;
        
        this.items = [];
        this.save();
        this.updateCartCount();
        
        if (window.location.pathname.includes('cart.html')) {
            this.renderCartItems();
        }
        
        this.showNotification('Carrinho esvaziado!', 'info');
        this.dispatchCartUpdateEvent();
    }

    // Calcula total do carrinho
    calculateTotal() {
        return this.items.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);
    }

    // Calcula subtotal (sem taxas)
    calculateSubtotal() {
        return this.calculateTotal();
    }

    // Calcula total de itens (considerando quantidade)
    getItemCount() {
        return this.items.reduce((total, item) => total + (item.quantity || 1), 0);
    }

    // Calcula quantidade de itens distintos
    getUniqueItemCount() {
        return this.items.length;
    }

    // Salva carrinho no localStorage
    save() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
        } catch (error) {
            console.error('Erro ao salvar carrinho:', error);
            this.showNotification('Erro ao salvar carrinho', 'error');
        }
    }

    // Atualiza contador no header
    updateCartCount() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const count = this.getItemCount();
        
        cartCountElements.forEach(element => {
            element.textContent = count;
            element.style.display = count > 0 ? 'flex' : 'none';
            
            // Adiciona animação
            if (count > 0) {
                element.classList.add('pulse');
                setTimeout(() => element.classList.remove('pulse'), 300);
            }
        });
    }

    // Renderiza itens na página do carrinho
    renderCartItems() {
        const cartContainer = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const cartSubtotal = document.getElementById('subtotal');
        const emptyCart = document.getElementById('emptyCart');
        const cartWithItems = document.getElementById('cartWithItems');

        if (!cartContainer) return;

        if (this.items.length === 0) {
            if (emptyCart) emptyCart.classList.remove('hidden');
            if (cartWithItems) cartWithItems.classList.add('hidden');
            return;
        }

        if (emptyCart) emptyCart.classList.add('hidden');
        if (cartWithItems) cartWithItems.classList.remove('hidden');

        // Renderiza cada item
        cartContainer.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${this.getImageUrl(item)}" 
                         alt="${item.title}"
                         onerror="this.src='https://via.placeholder.com/120x80/1A1A1A/8A2BE2?text=Game'">
                </div>
                
                <div class="cart-item-details">
                    <div class="cart-item-header">
                        <h3 class="cart-item-title">${this.escapeHtml(item.title)}</h3>
                        <button class="btn-remove-item" onclick="cart.removeAccount('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    <div class="cart-item-game">
                        <span class="game-badge">${this.getGameName(item.game)}</span>
                        ${item.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificada</span>' : ''}
                    </div>
                    
                    <div class="cart-item-features">
                        ${this.renderFeatures(item)}
                    </div>
                    
                    <div class="cart-item-seller">
                        <i class="fas fa-user"></i>
                        <span>Vendedor: ${this.escapeHtml(item.seller || 'Anônimo')}</span>
                        ${item.seller_rating ? `<span class="seller-rating">⭐ ${item.seller_rating.toFixed(1)}</span>` : ''}
                    </div>
                    
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="cart.updateQuantity('${item.id}', ${(item.quantity || 1) - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity">${item.quantity || 1}</span>
                        <button class="quantity-btn" onclick="cart.updateQuantity('${item.id}', ${(item.quantity || 1) + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <div class="cart-item-price">
                    <div class="price">R$ ${(item.price * (item.quantity || 1)).toFixed(2)}</div>
                    <small class="unit-price">R$ ${item.price.toFixed(2)} cada</small>
                    
                    <div class="cart-item-actions">
                        <button class="btn-move-favorites" onclick="cart.moveToFavorites('${item.id}')">
                            <i class="far fa-heart"></i> Favoritar
                        </button>
                        <button class="btn-view-details" onclick="window.location.href='account-detail.html?id=${item.id}'">
                            <i class="fas fa-eye"></i> Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Atualiza totais
        if (cartTotal) {
            const total = this.calculateTotal();
            cartTotal.textContent = `R$ ${total.toFixed(2)}`;
        }
        
        if (cartSubtotal) {
            const subtotal = this.calculateSubtotal();
            cartSubtotal.textContent = `R$ ${subtotal.toFixed(2)}`;
        }
        
        // Atualiza contagem no título
        const cartTitle = document.querySelector('.cart-header h2');
        if (cartTitle) {
            const itemCount = this.getUniqueItemCount();
            cartTitle.innerHTML = `<i class="fas fa-shopping-cart"></i> Meu Carrinho (${itemCount} ${itemCount === 1 ? 'item' : 'itens'})`;
        }
    }

    // Obtém URL da imagem
    getImageUrl(item) {
        if (!item.images || !item.images[0]) {
            return 'https://via.placeholder.com/120x80/1A1A1A/8A2BE2?text=Game';
        }
        
        const image = item.images[0];
        if (image.startsWith('http')) {
            return image;
        } else if (image.startsWith('data:')) {
            return image;
        } else {
            return `images/${image}`;
        }
    }

    // Renderiza features da conta
    renderFeatures(account) {
        if (!account.features) return '';
        
        const features = [];
        const maxFeatures = 3;
        
        // Features específicas por jogo
        switch (account.game) {
            case 'genshin':
                if (account.features.ar_level) features.push(`AR ${account.features.ar_level}`);
                if (account.features.five_star_chars && features.length < maxFeatures) 
                    features.push(`${account.features.five_star_chars}x 5★`);
                if (account.features.primogems && features.length < maxFeatures) 
                    features.push(`${this.formatNumber(account.features.primogems)} Primogems`);
                break;
                
            case 'lol':
                if (account.features.rank) features.push(`Rank: ${account.features.rank}`);
                if (account.features.champions && features.length < maxFeatures) 
                    features.push(`${account.features.champions} Champions`);
                if (account.features.skins && features.length < maxFeatures) 
                    features.push(`${account.features.skins} Skins`);
                break;
                
            case 'valorant':
                if (account.features.rank) features.push(`Rank: ${account.features.rank}`);
                if (account.features.agents && features.length < maxFeatures) 
                    features.push(`${account.features.agents} Agents`);
                break;
                
            case 'mobile-legends':
                if (account.features.rank) features.push(`Rank: ${account.features.rank}`);
                if (account.features.heroes && features.length < maxFeatures) 
                    features.push(`${account.features.heroes} Heroes`);
                break;
                
            case 'diablo':
                if (account.features.level) features.push(`Level ${account.features.level}`);
                if (account.features.gold && features.length < maxFeatures) 
                    features.push(`${this.formatNumber(account.features.gold)} Gold`);
                break;
                
            default:
                // Features genéricas
                for (const [key, value] of Object.entries(account.features)) {
                    if (features.length >= maxFeatures) break;
                    if (value && typeof value !== 'object' && value !== '') {
                        const label = this.formatFeatureLabel(key);
                        features.push(`${label}: ${value}`);
                    }
                }
        }
        
        return features.map(feat => `<span class="feature-tag">${this.escapeHtml(feat)}</span>`).join('');
    }

    // Formata números grandes
    formatNumber(num) {
        if (typeof num !== 'number') return num;
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Formata label das features
    formatFeatureLabel(key) {
        const labels = {
            'ar_level': 'AR Level',
            'five_star_chars': 'Personagens 5★',
            'five_star_weapons': 'Armas 5★',
            'primogems': 'Primogems',
            'rank': 'Rank',
            'level': 'Level',
            'champions': 'Champions',
            'skins': 'Skins',
            'rp': 'RP',
            'agents': 'Agents',
            'diamonds': 'Diamonds',
            'gold': 'Gold',
            'characters': 'Personagens',
            'heroes': 'Heroes',
            'weapons': 'Armas',
            'server': 'Servidor',
            'region': 'Região'
        };
        
        return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Move item para favoritos
    async moveToFavorites(accountId) {
        const account = this.items.find(item => item.id === accountId);
        if (!account) return;

        // Remove do carrinho
        this.removeAccount(accountId);

        // Adiciona aos favoritos
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            try {
                await db.addFavorite(userId, accountId);
                this.showNotification('Conta movida para favoritos!', 'success');
                
                // Atualiza dashboard se estiver aberto
                if (window.location.pathname.includes('dashboard.html')) {
                    window.location.reload();
                }
            } catch (error) {
                console.error('Erro ao favoritar:', error);
                this.showNotification('Erro ao favoritar conta', 'error');
            }
        } else {
            this.showNotification('Faça login para usar favoritos', 'warning');
            // Salva em localStorage temporário
            this.saveToTempFavorites(account);
        }
    }

    // Salva em favoritos temporários
    saveToTempFavorites(account) {
        try {
            let tempFavorites = JSON.parse(localStorage.getItem('temp_favorites') || '[]');
            
            // Verifica se já está nos favoritos
            if (!tempFavorites.some(fav => fav.id === account.id)) {
                tempFavorites.push({
                    ...account,
                    added_at: new Date().toISOString(),
                    is_temp: true
                });
                localStorage.setItem('temp_favorites', JSON.stringify(tempFavorites));
                this.showNotification('Conta adicionada aos favoritos temporários', 'info');
            }
        } catch (error) {
            console.error('Erro ao salvar favorito temporário:', error);
        }
    }

    // Inicia checkout
    async startCheckout() {
        if (this.items.length === 0) {
            this.showNotification('Adicione itens ao carrinho antes de finalizar', 'warning');
            return false;
        }

        // Verifica se há contas indisponíveis
        const unavailableItems = this.items.filter(item => item.status && item.status !== 'available');
        if (unavailableItems.length > 0) {
            this.showNotification('Algumas contas não estão mais disponíveis. Remova-as do carrinho para continuar.', 'error');
            
            // Remove itens indisponíveis automaticamente
            unavailableItems.forEach(item => this.removeAccount(item.id));
            return false;
        }

        // Verifica se o usuário está logado
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            this.showNotification('Faça login para finalizar a compra', 'warning');
            
            // Salva carrinho para restaurar após login
            localStorage.setItem('pending_cart', JSON.stringify(this.items));
            localStorage.setItem('returnUrl', 'checkout.html');
            
            // Redireciona para login
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            
            return false;
        }

        // Valida dados do usuário
        if (!currentUser.email || !currentUser.username) {
            this.showNotification('Complete seu cadastro antes de comprar', 'warning');
            
            localStorage.setItem('returnUrl', 'checkout.html');
            setTimeout(() => {
                window.location.href = 'dashboard.html?tab=profile';
            }, 1500);
            
            return false;
        }

        // Redireciona para checkout
        setTimeout(() => {
            window.location.href = 'checkout.html';
        }, 500);
        
        return true;
    }

    // Processa checkout (chamado pela página de checkout)
    async processCheckout(paymentMethod, buyerInfo) {
        try {
            // Valida dados do comprador
            if (!buyerInfo.email || !buyerInfo.phone || !buyerInfo.name) {
                throw new Error('Dados do comprador incompletos');
            }

            const transactions = [];
            const total = this.calculateTotal();
            
            // Para cada item no carrinho
            for (const item of this.items) {
                // Verifica disponibilidade novamente
                const account = await db.getAccount(item.id);
                if (!account || account.status !== 'available') {
                    throw new Error(`A conta "${item.title}" não está mais disponível`);
                }

                // Cria transação
                const transaction = {
                    account_id: item.id,
                    buyer_id: buyerInfo.userId,
                    seller_id: item.seller_id || item.seller,
                    amount: item.price * (item.quantity || 1),
                    payment_method: paymentMethod,
                    buyer_email: buyerInfo.email,
                    buyer_phone: buyerInfo.phone,
                    buyer_name: buyerInfo.name,
                    buyer_cpf: buyerInfo.cpf,
                    notes: buyerInfo.notes,
                    status: 'pending',
                    created_at: new Date().toISOString()
                };

                // Salva transação
                const savedTransaction = await db.createTransaction(transaction);
                transactions.push(savedTransaction);

                // Atualiza status da conta para "vendida"
                await db.updateAccount(item.id, {
                    status: 'sold',
                    sold_at: new Date().toISOString(),
                    transaction_id: savedTransaction.id,
                    buyer_id: buyerInfo.userId,
                    buyer_name: buyerInfo.name
                });

                // Notifica o vendedor
                this.notifySeller(item.seller_id || item.seller, item, savedTransaction);
            }

            // Atualiza estatísticas do comprador
            await this.updateBuyerStats(buyerInfo.userId, total);

            // Limpa carrinho após sucesso
            this.clearCart();

            // Gera mensagem do WhatsApp
            const whatsappMessage = this.generateWhatsAppMessage(buyerInfo, transactions);
            
            return {
                success: true,
                transactions: transactions,
                total: total,
                whatsappMessage: whatsappMessage,
                orderId: transactions[0]?.id || 'GAC-' + Date.now().toString().substr(-6)
            };
            
        } catch (error) {
            console.error('Erro no checkout:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Notifica o vendedor
    notifySeller(sellerId, account, transaction) {
        try {
            // Adiciona notificação no localStorage do vendedor
            let sellerNotifications = JSON.parse(localStorage.getItem(`notifications_${sellerId}`) || '[]');
            
            sellerNotifications.push({
                id: Date.now(),
                type: 'sale',
                title: '🎉 Conta Vendida!',
                message: `Sua conta "${account.title}" foi vendida por R$ ${transaction.amount.toFixed(2)}`,
                account_id: account.id,
                transaction_id: transaction.id,
                buyer_name: transaction.buyer_name,
                amount: transaction.amount,
                read: false,
                created_at: new Date().toISOString(),
                urgent: true
            });
            
            localStorage.setItem(`notifications_${sellerId}`, JSON.stringify(sellerNotifications));
            
            // Adiciona ao histórico de vendas
            let sellerSales = JSON.parse(localStorage.getItem(`sales_${sellerId}`) || '[]');
            sellerSales.push({
                ...transaction,
                account_title: account.title,
                account_game: account.game
            });
            localStorage.setItem(`sales_${sellerId}`, JSON.stringify(sellerSales));
            
        } catch (error) {
            console.error('Erro ao notificar vendedor:', error);
        }
    }

    // Atualiza estatísticas do comprador
    async updateBuyerStats(userId, total) {
        try {
            const user = await db.getUser(userId);
            if (user) {
                user.purchases_count = (user.purchases_count || 0) + 1;
                user.total_spent = (user.total_spent || 0) + total;
                user.last_purchase = new Date().toISOString();
                
                // Atualiza no banco de dados
                await db.updateUser(user.id, {
                    purchases_count: user.purchases_count,
                    total_spent: user.total_spent,
                    last_purchase: user.last_purchase
                });
                
                // Atualiza no localStorage
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if (currentUser && currentUser.id === userId) {
                    currentUser.purchases_count = user.purchases_count;
                    currentUser.total_spent = user.total_spent;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar estatísticas do comprador:', error);
        }
    }

    // Gera mensagem para WhatsApp
    generateWhatsAppMessage(buyerInfo, transactions) {
        try {
            const phoneNumber = '5511999999999'; // Número de suporte (substitua pelo real)
            const itemsList = this.items.map((item, index) => {
                const transaction = transactions[index];
                return `• ${item.title} - R$ ${item.price.toFixed(2)}${item.quantity > 1 ? ` (x${item.quantity})` : ''}${transaction ? ` - Pedido: ${transaction.id}` : ''}`;
            }).join('%0A');
            
            const total = this.calculateTotal().toFixed(2);
            
            const message = `Olá! Acabei de realizar uma compra no GameAccounts:%0A%0A` +
                           `*📋 Itens Comprados:*%0A${itemsList}%0A%0A` +
                           `*💰 Total:* R$ ${total}%0A` +
                           `*🧾 Número do Pedido:* ${transactions[0]?.id || 'GAC-' + Date.now().toString().substr(-6)}%0A` +
                           `*👤 Comprador:* ${buyerInfo.name}%0A` +
                           `*📧 Email:* ${buyerInfo.email}%0A` +
                           `*📱 Telefone:* ${buyerInfo.phone}%0A` +
                           `${buyerInfo.cpf ? `*📄 CPF:* ${buyerInfo.cpf}%0A` : ''}` +
                           `${buyerInfo.notes ? `*📝 Observações:* ${buyerInfo.notes}%0A` : ''}` +
                           `%0APor favor, me envie os dados das contas adquiridas.`;
            
            return `https://wa.me/${phoneNumber}?text=${message}`;
            
        } catch (error) {
            console.error('Erro ao gerar mensagem do WhatsApp:', error);
            return `https://wa.me/5511999999999?text=Olá! Preciso de ajuda com minha compra no GameAccounts.`;
        }
    }

    // Configura event listeners
    setupEventListeners() {
        // Listener para botões "Adicionar ao Carrinho"
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.btn-add-to-cart, .btn-buy, [data-action="add-to-cart"]');
            if (addToCartBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const accountId = addToCartBtn.dataset.accountId || 
                                 addToCartBtn.dataset.id ||
                                 addToCartBtn.closest('[data-account-id]')?.dataset.accountId;
                
                if (accountId) {
                    this.handleAddToCart(accountId, addToCartBtn);
                }
            }
        });

        // Listener para limpar carrinho
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clearCart, .btn-clear-cart, [data-action="clear-cart"]')) {
                e.preventDefault();
                this.confirmClearCart();
            }
        });

        // Listener para checkout
        document.addEventListener('click', (e) => {
            if (e.target.closest('#checkoutBtn, #proceedToCheckout, .btn-checkout, [data-action="checkout"]')) {
                e.preventDefault();
                this.startCheckout();
            }
        });

        // Listener para atualizar quantidade
        document.addEventListener('click', (e) => {
            const quantityBtn = e.target.closest('.quantity-btn, [data-action="update-quantity"]');
            if (quantityBtn) {
                e.preventDefault();
                const accountId = quantityBtn.closest('.cart-item')?.dataset.id;
                const action = quantityBtn.dataset.action || 
                             (quantityBtn.querySelector('.fa-plus') ? 'increase' : 
                              quantityBtn.querySelector('.fa-minus') ? 'decrease' : null);
                
                if (accountId && action) {
                    const item = this.items.find(item => item.id === accountId);
                    if (item) {
                        const currentQty = item.quantity || 1;
                        const newQty = action === 'increase' ? currentQty + 1 : currentQty - 1;
                        this.updateQuantity(accountId, newQty);
                    }
                }
            }
        });

        // Atualiza carrinho quando a página carrega
        document.addEventListener('DOMContentLoaded', () => {
            this.updateCartCount();
            
            // Se estiver na página do carrinho, renderiza os itens
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartItems();
            }
            
            // Restaura carrinho pendente se existir
            this.restorePendingCart();
        });

        // Atualiza quando volta para a página
        window.addEventListener('pageshow', () => {
            this.updateCartCount();
        });
    }

    // Manipula adição ao carrinho
    async handleAddToCart(accountId, button) {
        try {
            // Mostra loading no botão
            const originalHtml = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            // Busca dados da conta
            const account = await db.getAccount(accountId);
            
            if (account) {
                if (account.status !== 'available') {
                    this.showNotification('Esta conta não está mais disponível', 'error');
                } else {
                    const success = this.addAccount(account);
                    
                    if (success) {
                        // Adiciona animação ao ícone do carrinho
                        const cartIcon = document.querySelector('.cart-link i');
                        if (cartIcon) {
                            cartIcon.classList.add('bounce');
                            setTimeout(() => cartIcon.classList.remove('bounce'), 300);
                        }
                    }
                }
            } else {
                this.showNotification('Conta não encontrada', 'error');
            }
            
            // Restaura botão
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.disabled = false;
            }, 1000);
            
        } catch (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            this.showNotification('Erro ao adicionar ao carrinho', 'error');
            
            // Restaura botão
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    // Confirma limpeza do carrinho
    confirmClearCart() {
        if (this.items.length === 0) {
            this.showNotification('O carrinho já está vazio', 'info');
            return;
        }
        
        Swal.fire({
            title: 'Limpar carrinho?',
            text: `Tem certeza que deseja remover todos os ${this.getUniqueItemCount()} itens do carrinho?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, limpar tudo!',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                this.clearCart();
            }
        });
    }

    // Restaura carrinho pendente após login
    restorePendingCart() {
        const pendingCart = localStorage.getItem('pending_cart');
        const currentUser = localStorage.getItem('currentUser');
        
        if (pendingCart && currentUser) {
            try {
                const items = JSON.parse(pendingCart);
                items.forEach(item => this.addAccount(item));
                localStorage.removeItem('pending_cart');
                
                this.showNotification('Itens do carrinho restaurados!', 'success');
            } catch (error) {
                console.error('Erro ao restaurar carrinho:', error);
                localStorage.removeItem('pending_cart');
            }
        }
    }

    // Mostra notificação
    showNotification(message, type = 'info') {
        // Remove notificação anterior
        const existingNotification = document.querySelector('.cart-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Ícones por tipo
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };

        // Cores por tipo
        const colors = {
            'success': 'var(--accent-green)',
            'error': 'var(--accent-red)',
            'warning': '#ffa502',
            'info': 'var(--neon-blue)'
        };

        // Cria nova notificação
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--card-bg);
            border: 1px solid ${colors[type] || 'var(--border-color)'};
            border-left: 4px solid ${colors[type] || 'var(--primary-purple)'};
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
        `;

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icons[type] || 'fa-bell'}" style="color: ${colors[type] || 'var(--primary-purple)'}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Adiciona ao DOM
        document.body.appendChild(notification);

        // Animação de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Configura botão de fechar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        });

        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
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
            'minecraft': 'Minecraft',
            'other': 'Outro Jogo'
        };
        
        return games[gameCode] || gameCode;
    }

    // Dispara evento de atualização do carrinho
    dispatchCartUpdateEvent() {
        const event = new CustomEvent('cartUpdated', {
            detail: { 
                itemCount: this.getItemCount(),
                uniqueCount: this.getUniqueItemCount(),
                total: this.calculateTotal(),
                items: this.items 
            }
        });
        window.dispatchEvent(event);
    }

    // Escapa HTML para segurança
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Verifica se um item está no carrinho
    isInCart(accountId) {
        return this.items.some(item => item.id === accountId);
    }

    // Obtém quantidade de um item no carrinho
    getQuantity(accountId) {
        const item = this.items.find(item => item.id === accountId);
        return item ? (item.quantity || 1) : 0;
    }

    // Calcula frete (simulado)
    calculateShipping() {
        return 0; // Frete grátis
    }

    // Calcula taxas (simulado)
    calculateFees() {
        const subtotal = this.calculateSubtotal();
        // Taxa de serviço de 5%
        return subtotal * 0.05;
    }

    // Calcula total com taxas
    calculateTotalWithFees() {
        return this.calculateTotal() + this.calculateFees();
    }
}

// Inicializa o carrinho
let cart;
document.addEventListener('DOMContentLoaded', () => {
    cart = new ShoppingCart();
    window.cart = cart;
});

// Exporta a classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShoppingCart;
}

// CSS para notificações e animações
const cartStyles = document.createElement('style');
cartStyles.textContent = `
    .cart-notification {
        font-family: inherit;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
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
    
    .cart-count {
        transition: transform 0.3s ease;
    }
    
    .cart-count.pulse {
        animation: pulse 0.3s ease;
    }
    
    .fa-shopping-cart.bounce {
        animation: bounce 0.3s ease;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }
    
    /* Estilos para a página do carrinho */
    .cart-item-quantity {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 10px;
    }
    
    .quantity-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(138, 43, 226, 0.1);
        border: 1px solid var(--primary-purple);
        color: var(--primary-purple);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition-fast);
    }
    
    .quantity-btn:hover {
        background: rgba(138, 43, 226, 0.2);
    }
    
    .quantity-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .quantity {
        min-width: 30px;
        text-align: center;
        font-weight: 600;
    }
    
    .unit-price {
        color: var(--text-gray);
        font-size: 0.85rem;
        margin-top: 5px;
        display: block;
    }
    
    .cart-item-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }
    
    .btn-view-details {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid var(--neon-blue);
        color: var(--neon-blue);
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: var(--transition-fast);
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .btn-view-details:hover {
        background: rgba(0, 255, 255, 0.2);
    }
    
    .seller-rating {
        background: rgba(255, 215, 0, 0.1);
        color: #FFD700;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.8rem;
        margin-left: 8px;
    }
    
    .verified-badge {
        background: rgba(50, 205, 50, 0.1);
        color: var(--accent-green);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8rem;
        margin-left: 8px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    
    .hidden {
        display: none !important;
    }
    
    /* Responsividade */
    @media (max-width: 768px) {
        .cart-item {
            grid-template-columns: 100px 1fr;
        }
        
        .cart-item-price {
            grid-column: 1 / -1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
        }
        
        .cart-item-actions {
            justify-content: flex-end;
        }
    }
`;

document.head.appendChild(cartStyles);