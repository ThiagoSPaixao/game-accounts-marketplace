// Lógica principal do aplicativo COMPLETA

class GameAccountsApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Carrega usuário atual
            this.loadCurrentUser();
            
            // Inicializa componentes
            this.initComponents();
            
            // Carrega dados iniciais
            await this.loadInitialData();
            
            // Configura listeners globais
            this.setupGlobalListeners();
            
            // Configura eventos do usuário
            this.setupUserEvents();
        } catch (error) {
            console.error('Erro na inicialização do app:', error);
            this.showError('Erro ao inicializar o sistema');
        }
    }

    loadCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.updateUIForUser();
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentUserId');
        }
    }

    updateUIForUser() {
        try {
            const userElements = document.querySelectorAll('[data-user-info]');
            const authButtons = document.querySelectorAll('.auth-buttons');
            const userMenu = document.querySelectorAll('.user-menu');
            const logoutButtons = document.querySelectorAll('.btn-logout');

            if (this.currentUser) {
                // Mostra menu do usuário
                userMenu.forEach(el => el.classList.remove('hidden'));
                authButtons.forEach(el => el.classList.add('hidden'));

                // Preenche informações do usuário
                userElements.forEach(el => {
                    const field = el.dataset.userInfo;
                    if (field === 'username') {
                        el.textContent = this.currentUser.username;
                    } else if (field === 'avatar') {
                        el.innerHTML = `<i class="fas fa-user"></i>`;
                    } else if (field === 'email') {
                        el.textContent = this.currentUser.email;
                    } else if (field === 'balance') {
                        el.textContent = `R$ ${(this.currentUser.balance || 0).toFixed(2)}`;
                    }
                });

                // Configura eventos de logout
                logoutButtons.forEach(btn => {
                    btn.onclick = () => this.logout();
                });
            } else {
                // Mostra botões de autenticação
                userMenu.forEach(el => el.classList.add('hidden'));
                authButtons.forEach(el => el.classList.remove('hidden'));
            }
        } catch (error) {
            console.error('Erro ao atualizar UI do usuário:', error);
        }
    }

    initComponents() {
        // Inicializa menu mobile
        this.initMobileMenu();
        
        // Inicializa busca
        this.initSearch();
        
        // Inicializa filtros
        this.initFilters();
        
        // Inicializa formulários
        this.initForms();
        
        // Inicializa tooltips
        this.initTooltips();
    }

    setupGlobalListeners() {
        // Listener para novas contas publicadas
        document.addEventListener('newAccountPublished', () => {
            if (this.isOnHomePage()) {
                this.loadFeaturedAccounts();
            }
        });

        // Verificar se precisa atualizar a home
        if (localStorage.getItem('home_needs_refresh') === 'true') {
            localStorage.removeItem('home_needs_refresh');
            if (this.isOnHomePage()) {
                this.loadFeaturedAccounts();
            }
        }

        // Atualizar contador do carrinho quando atualizado
        window.addEventListener('cartUpdated', (e) => {
            this.updateCartUI(e.detail);
        });
    }

    setupUserEvents() {
        // Configura botões de login/logout dinamicamente
        document.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('.btn-logout, [data-action="logout"]');
            if (logoutBtn) {
                e.preventDefault();
                this.logout();
            }

            const loginBtn = e.target.closest('.btn-login, [data-action="login"]');
            if (loginBtn && !this.currentUser) {
                e.preventDefault();
                this.showLoginModal();
            }
        });
    }

    initMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const closeBtn = document.querySelector('.mobile-nav-close');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const mobileNav = document.querySelector('.mobile-nav');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                mobileNav.classList.add('active');
                if (overlay) overlay.style.display = 'block';
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // Fecha menu ao clicar em links
        const mobileLinks = document.querySelectorAll('.mobile-nav a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });
    }

    closeMobileMenu() {
        const mobileNav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        
        if (mobileNav) mobileNav.classList.remove('active');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    initSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });

        // Busca ao pressionar Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(searchInput.value);
            }
        });
    }

    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            const accounts = await db.getAllAccounts({
                search: query.trim(),
                status: 'available'
            });

            this.displaySearchResults(accounts);
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showError('Erro ao realizar busca');
        }
    }

    displaySearchResults(accounts) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (accounts.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Nenhuma conta encontrada</p>
                    <small>Tente outros termos de busca</small>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
            return;
        }

        resultsContainer.innerHTML = accounts.slice(0, 8).map(account => `
            <div class="search-result-item" data-id="${account.id}" onclick="window.location.href='account-detail.html?id=${account.id}'">
                <div class="search-result-image">
                    <img src="${this.getImageUrl(account)}" alt="${this.escapeHtml(account.title)}"
                         onerror="this.src='https://via.placeholder.com/60x60/1A1A1A/8A2BE2?text=Game'">
                </div>
                <div class="search-result-info">
                    <h4>${this.escapeHtml(account.title.substring(0, 50))}${account.title.length > 50 ? '...' : ''}</h4>
                    <div class="search-result-meta">
                        <span class="game-badge">${this.getGameName(account.game)}</span>
                        <span class="price">R$ ${account.price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        resultsContainer.classList.remove('hidden');
        
        // Fecha resultados ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!resultsContainer.contains(e.target) && !e.target.closest('#searchInput')) {
                    this.hideSearchResults();
                }
            }, { once: true });
        });
    }

    hideSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }
    }

    initFilters() {
        const filterForm = document.getElementById('filterForm');
        if (!filterForm) return;

        filterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.applyFilters();
        });

        // Reseta filtros
        const resetBtn = filterForm.querySelector('.btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterForm.reset();
                this.applyFilters();
            });
        }

        // Filtros em tempo real
        const realTimeFilters = filterForm.querySelectorAll('input, select');
        realTimeFilters.forEach(filter => {
            if (filter.type !== 'submit' && filter.type !== 'reset') {
                filter.addEventListener('change', () => {
                    if (filterForm.dataset.realtime === 'true') {
                        this.applyFilters();
                    }
                });
            }
        });
    }

    async applyFilters() {
        try {
            const formData = new FormData(document.getElementById('filterForm'));
            const filters = {
                status: 'available'
            };

            for (const [key, value] of formData.entries()) {
                if (value && value.trim() !== '') {
                    if (key === 'min_price' || key === 'max_price') {
                        filters[key] = parseFloat(value);
                    } else if (key === 'sort') {
                        filters.sort = value;
                    } else if (key === 'game' && value !== 'all') {
                        filters.game = value;
                    } else if (key.startsWith('feature_')) {
                        if (!filters.features) filters.features = {};
                        const featureName = key.replace('feature_', '');
                        filters.features[featureName] = value;
                    } else if (key !== 'submit' && key !== 'reset') {
                        filters[key] = value;
                    }
                }
            }

            let accounts = await db.getAllAccounts(filters);
            
            // Aplica ordenação
            if (filters.sort) {
                accounts = this.sortAccounts(accounts, filters.sort);
            }

            this.displayFilteredAccounts(accounts);
            
            // Atualiza contador
            const countElement = document.getElementById('accounts-count');
            if (countElement) {
                countElement.textContent = accounts.length;
            }
            
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
            this.showError('Erro ao aplicar filtros');
        }
    }

    sortAccounts(accounts, sortBy) {
        const sorted = [...accounts];
        
        switch (sortBy) {
            case 'price_asc':
                return sorted.sort((a, b) => a.price - b.price);
            case 'price_desc':
                return sorted.sort((a, b) => b.price - a.price);
            case 'newest':
                return sorted.sort((a, b) => 
                    new Date(b.created_at || 0) - new Date(a.created_at || 0));
            case 'popular':
                return sorted.sort((a, b) => 
                    (b.views || 0) - (a.views || 0));
            case 'most_favorited':
                return sorted.sort((a, b) => 
                    (b.favorites_count || 0) - (a.favorites_count || 0));
            default:
                return sorted;
        }
    }

    displayFilteredAccounts(accounts) {
        const accountsGrid = document.querySelector('.accounts-grid');
        if (!accountsGrid) return;

        if (accounts.length === 0) {
            accountsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Nenhuma conta encontrada com os filtros selecionados</p>
                    <button class="btn btn-outline" onclick="document.getElementById('filterForm').reset(); app.applyFilters();">
                        Limpar Filtros
                    </button>
                </div>
            `;
            return;
        }

        accountsGrid.innerHTML = accounts.map(account => this.createAccountCard(account)).join('');
        
        // Adiciona eventos aos botões
        this.attachCardEvents();
    }

    createAccountCard(account) {
        const isInCart = window.cart?.isInCart?.(account.id) || false;
        const isFavorite = this.currentUser ? 
            localStorage.getItem(`favorite_${account.id}_${this.currentUser.id}`) === 'true' : false;
        
        return `
            <div class="account-card" data-id="${account.id}">
                <div class="account-card-header">
                    <span class="game-badge">${this.getGameName(account.game)}</span>
                    ${account.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificada</span>' : ''}
                    ${account.status === 'sold' ? '<span class="sold-badge"><i class="fas fa-tag"></i> Vendida</span>' : ''}
                </div>
                
                <div class="account-image">
                    <img src="${this.getImageUrl(account)}" 
                         alt="${this.escapeHtml(account.title)}"
                         onerror="this.src='https://via.placeholder.com/300x200/1A1A1A/8A2BE2?text=Game'">
                    <div class="account-overlay">
                        <button class="btn-quick-view" data-id="${account.id}" title="Visualização Rápida">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                                data-id="${account.id}" 
                                title="${isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}">
                            <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
                
                <div class="account-info">
                    <h3 class="account-title" title="${this.escapeHtml(account.title)}">
                        ${this.escapeHtml(account.title.substring(0, 60))}${account.title.length > 60 ? '...' : ''}
                    </h3>
                    
                    <div class="account-features">
                        ${this.renderAccountFeatures(account)}
                    </div>
                    
                    <div class="account-stats">
                        <span class="stat" title="Visualizações"><i class="fas fa-eye"></i> ${account.views || 0}</span>
                        <span class="stat" title="Favoritos"><i class="fas fa-heart"></i> ${account.favorites_count || 0}</span>
                        <span class="seller" title="Vendedor">
                            <i class="fas fa-user"></i> ${this.escapeHtml(account.seller || 'Anônimo')}
                        </span>
                    </div>
                    
                    <div class="account-footer">
                        <div class="price">${this.formatPrice(account.price)}</div>
                        <div class="action-buttons">
                            <button class="btn-view" onclick="window.location.href='account-detail.html?id=${account.id}'">
                                Detalhes
                            </button>
                            <button class="btn-add-to-cart ${isInCart ? 'in-cart' : ''}" 
                                    data-account-id="${account.id}"
                                    title="${isInCart ? 'Já no Carrinho' : 'Adicionar ao Carrinho'}">
                                <i class="fas ${isInCart ? 'fa-check' : 'fa-cart-plus'}"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAccountFeatures(account) {
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
                if (account.features.rank) features.push(`${account.features.rank}`);
                if (account.features.champions && features.length < maxFeatures) 
                    features.push(`${account.features.champions} Champions`);
                if (account.features.skins && features.length < maxFeatures) 
                    features.push(`${account.features.skins} Skins`);
                break;
                
            case 'valorant':
                if (account.features.rank) features.push(`${account.features.rank}`);
                if (account.features.agents && features.length < maxFeatures) 
                    features.push(`${account.features.agents} Agents`);
                break;
                
            default:
                // Features genéricas
                for (const [key, value] of Object.entries(account.features)) {
                    if (features.length >= maxFeatures) break;
                    if (value && typeof value !== 'object') {
                        const label = this.formatFeatureLabel(key);
                        features.push(`${label}: ${value}`);
                    }
                }
        }
        
        return features.map(feat => `<span class="feature-tag">${this.escapeHtml(feat)}</span>`).join('');
    }

    attachCardEvents() {
        // Eventos para favoritos
        document.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const accountId = btn.dataset.id;
                if (!accountId) return;
                
                if (!this.currentUser) {
                    this.showLoginPrompt();
                    return;
                }
                
                try {
                    const isFavorite = btn.classList.contains('active');
                    const icon = btn.querySelector('i');
                    
                    if (isFavorite) {
                        // Remove dos favoritos
                        await db.removeFavorite(this.currentUser.id, accountId);
                        btn.classList.remove('active');
                        btn.title = 'Adicionar aos Favoritos';
                        if (icon) icon.className = 'far fa-heart';
                        this.showNotification('Removido dos favoritos', 'info');
                    } else {
                        // Adiciona aos favoritos
                        await db.addFavorite(this.currentUser.id, accountId);
                        btn.classList.add('active');
                        btn.title = 'Remover dos Favoritos';
                        if (icon) icon.className = 'fas fa-heart';
                        this.showNotification('Adicionado aos favoritos', 'success');
                    }
                } catch (error) {
                    console.error('Erro ao atualizar favoritos:', error);
                    this.showError('Erro ao atualizar favoritos');
                }
            });
        });
        
        // Eventos para visualização rápida
        document.querySelectorAll('.btn-quick-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const accountId = btn.dataset.id;
                if (accountId) {
                    this.showQuickView(accountId);
                }
            });
        });
    }

    async showQuickView(accountId) {
        try {
            const account = await db.getAccount(accountId);
            if (!account) return;
            
            // Cria modal de visualização rápida
            const modal = document.createElement('div');
            modal.className = 'modal quick-view-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <button class="modal-close">&times;</button>
                    <div class="quick-view-content">
                        <div class="quick-view-image">
                            <img src="${this.getImageUrl(account)}" alt="${this.escapeHtml(account.title)}">
                        </div>
                        <div class="quick-view-info">
                            <h3>${this.escapeHtml(account.title)}</h3>
                            <div class="game-badge">${this.getGameName(account.game)}</div>
                            <div class="price">${this.formatPrice(account.price)}</div>
                            <p class="description">${this.escapeHtml(account.description?.substring(0, 200) || '')}...</p>
                            <div class="quick-view-actions">
                                <button class="btn btn-primary" onclick="window.location.href='account-detail.html?id=${account.id}'">
                                    Ver Detalhes Completos
                                </button>
                                <button class="btn btn-outline" onclick="cart.addAccount(${JSON.stringify(account).replace(/"/g, '&quot;')})">
                                    Adicionar ao Carrinho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.classList.add('show');
            
            // Fecha modal
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                }
            });
            
        } catch (error) {
            console.error('Erro ao mostrar visualização rápida:', error);
        }
    }

    initForms() {
        // Formulário de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Formulário de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister();
            });
            
            // Validação em tempo real
            this.initFormValidation(registerForm);
        }

        // Formulário de venda
        const sellForm = document.getElementById('sellForm');
        if (sellForm) {
            this.initSellForm(sellForm);
        }
        
        // Formulário de contato
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleContactForm();
            });
        }
    }

    initFormValidation(form) {
        const emailInput = form.querySelector('input[type="email"]');
        const passwordInput = form.querySelector('input[type="password"]');
        const confirmPasswordInput = form.querySelector('input[name="confirm_password"]');
        
        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                this.validateEmailField(emailInput);
            });
        }
        
        if (passwordInput && confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch(passwordInput, confirmPasswordInput);
            });
        }
    }

    validateEmailField(input) {
        const email = input.value.trim();
        if (!email) return true;
        
        const isValid = this.validateEmail(email);
        if (!isValid) {
            this.showFieldError(input, 'Email inválido');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }

    validatePasswordMatch(passwordInput, confirmInput) {
        if (passwordInput.value !== confirmInput.value) {
            this.showFieldError(confirmInput, 'As senhas não coincidem');
            return false;
        }
        
        this.clearFieldError(confirmInput);
        return true;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove mensagem anterior
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        // Adiciona nova mensagem
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) errorDiv.remove();
    }

    async handleLogin() {
        const form = document.getElementById('loginForm');
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember') === 'on';

        if (!email || !password) {
            this.showError('Preencha email e senha');
            return;
        }

        try {
            const user = await db.loginUser(email, password);
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('currentUserId', user.id);
                
                if (remember) {
                    localStorage.setItem('rememberMe', 'true');
                }
                
                this.updateUIForUser();
                this.showSuccess('Login realizado com sucesso!');
                
                // Fecha modal se existir
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                }
                
                // Redireciona se necessário
                const returnUrl = localStorage.getItem('returnUrl');
                if (returnUrl) {
                    localStorage.removeItem('returnUrl');
                    setTimeout(() => {
                        window.location.href = returnUrl;
                    }, 1000);
                }
            } else {
                this.showError('Email ou senha incorretos');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError(error.message || 'Erro ao realizar login');
        }
    }

    async handleRegister() {
        const form = document.getElementById('registerForm');
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            type: formData.get('user_type') || 'buyer',
            phone: formData.get('phone') || '',
            discord: formData.get('discord') || ''
        };

        // Validações
        if (!this.validateEmail(userData.email)) {
            this.showError('Email inválido');
            return;
        }

        if (userData.password.length < 6) {
            this.showError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        const confirmPassword = formData.get('confirm_password');
        if (userData.password !== confirmPassword) {
            this.showError('As senhas não coincidem');
            return;
        }

        try {
            const user = await db.registerUser(userData);
            
            // Remove password do objeto salvo
            const { password, ...userWithoutPassword } = user;
            this.currentUser = userWithoutPassword;
            
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            localStorage.setItem('currentUserId', user.id);
            
            this.updateUIForUser();
            this.showSuccess('Cadastro realizado com sucesso!');
            
            // Fecha modal
            const modal = document.querySelector('.modal.show');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
            
            // Redireciona para dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Erro no registro:', error);
            this.showError(error.message || 'Erro ao realizar cadastro');
        }
    }

    async handleContactForm() {
        const form = document.getElementById('contactForm');
        const formData = new FormData(form);
        
        const contactData = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            created_at: new Date().toISOString()
        };

        // Validação básica
        if (!contactData.name || !contactData.email || !contactData.message) {
            this.showError('Preencha todos os campos obrigatórios');
            return;
        }

        if (!this.validateEmail(contactData.email)) {
            this.showError('Email inválido');
            return;
        }

        try {
            // Salva no localStorage (em um sistema real, enviaria para um backend)
            let messages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
            messages.push({
                ...contactData,
                id: Date.now(),
                read: false
            });
            localStorage.setItem('contact_messages', JSON.stringify(messages));
            
            this.showSuccess('Mensagem enviada com sucesso! Entraremos em contato em breve.');
            form.reset();
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showError('Erro ao enviar mensagem');
        }
    }

    initSellForm(form) {
        const gameSelect = form.querySelector('[name="game"]');
        const gameSpecificFields = form.querySelector('.game-specific-fields');
        
        if (gameSelect && gameSpecificFields) {
            // Carrega campos específicos para o jogo selecionado
            gameSelect.addEventListener('change', (e) => {
                this.updateGameSpecificFields(e.target.value, gameSpecificFields);
            });
            
            // Carrega campos iniciais
            this.updateGameSpecificFields(gameSelect.value, gameSpecificFields);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSellForm(form);
        });

        // Preview de imagens
        const imageInput = form.querySelector('[name="screenshots"]');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.previewImages(e.target.files);
            });
        }

        // Validação de preço
        const priceInput = form.querySelector('[name="price"]');
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value) || 0;
                if (value < 5) {
                    this.showFieldError(priceInput, 'O preço mínimo é R$ 5,00');
                } else if (value > 10000) {
                    this.showFieldError(priceInput, 'O preço máximo é R$ 10.000,00');
                } else {
                    this.clearFieldError(priceInput);
                }
            });
        }
    }

    updateGameSpecificFields(game, container) {
        const templates = {
            'genshin': this.getGenshinTemplate(),
            'lol': this.getLolTemplate(),
            'valorant': this.getValorantTemplate(),
            'mobile-legends': this.getMobileLegendsTemplate(),
            'diablo': this.getDiabloTemplate(),
            'fortnite': this.getFortniteTemplate(),
            'default': this.getDefaultTemplate()
        };

        container.innerHTML = templates[game] || templates['default'];
        
        // Adiciona eventos aos novos campos
        this.attachGameFieldEvents(container);
    }

    getGenshinTemplate() {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="ar_level"><i class="fas fa-level-up-alt"></i> AR Level *</label>
                    <input type="number" id="ar_level" name="ar_level" min="1" max="60" required>
                </div>
                <div class="form-group">
                    <label for="world_level"><i class="fas fa-globe"></i> World Level</label>
                    <select id="world_level" name="world_level">
                        <option value="">Selecione</option>
                        ${[1,2,3,4,5,6,7,8].map(lvl => `<option value="${lvl}">${lvl}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="five_star_chars"><i class="fas fa-star"></i> Personagens 5★ *</label>
                    <input type="number" id="five_star_chars" name="five_star_chars" min="0" required>
                </div>
                <div class="form-group">
                    <label for="five_star_weapons"><i class="fas fa-gem"></i> Armas 5★</label>
                    <input type="number" id="five_star_weapons" name="five_star_weapons" min="0">
                </div>
            </div>
            <div class="form-group">
                <label for="primogems"><i class="fas fa-coins"></i> Primogems</label>
                <input type="number" id="primogems" name="primogems" min="0" placeholder="Ex: 15000">
            </div>
            <div class="form-group">
                <label for="spiral_abyss"><i class="fas fa-trophy"></i> Abismo Espiral</label>
                <select id="spiral_abyss" name="spiral_abyss">
                    <option value="">Nível concluído</option>
                    <option value="8">8-3 Concluído</option>
                    <option value="9">9-3 Concluído</option>
                    <option value="10">10-3 Concluído</option>
                    <option value="11">11-3 Concluído</option>
                    <option value="12">12-3 Concluído</option>
                </select>
            </div>
        `;
    }

    getLolTemplate() {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="rank"><i class="fas fa-trophy"></i> Rank Atual *</label>
                    <select id="rank" name="rank" required>
                        <option value="">Selecione o rank</option>
                        ${['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger']
                            .map(rank => `<option value="${rank.toLowerCase()}">${rank}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="level"><i class="fas fa-level-up-alt"></i> Level *</label>
                    <input type="number" id="level" name="level" min="1" max="2000" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="champions"><i class="fas fa-user-ninja"></i> Champions *</label>
                    <input type="number" id="champions" name="champions" min="0" max="166" required>
                </div>
                <div class="form-group">
                    <label for="skins"><i class="fas fa-tshirt"></i> Skins *</label>
                    <input type="number" id="skins" name="skins" min="0" required>
                </div>
            </div>
            <div class="form-group">
                <label for="rare_skins"><i class="fas fa-crown"></i> Skins Raras (separadas por vírgula)</label>
                <textarea id="rare_skins" name="rare_skins" rows="2" placeholder="Ex: Elementalista Lux, DJ Sona, Prestígio K/DA"></textarea>
            </div>
        `;
    }

    getValorantTemplate() {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="rank"><i class="fas fa-trophy"></i> Rank Atual *</label>
                    <select id="rank" name="rank" required>
                        <option value="">Selecione o rank</option>
                        ${['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']
                            .map(rank => `<option value="${rank.toLowerCase()}">${rank}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="peak_rank"><i class="fas fa-star"></i> Maior Rank Alcançado</label>
                    <select id="peak_rank" name="peak_rank">
                        <option value="">Selecione</option>
                        ${['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']
                            .map(rank => `<option value="${rank.toLowerCase()}">${rank}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="agents"><i class="fas fa-user-secret"></i> Agents *</label>
                    <input type="number" id="agents" name="agents" min="0" max="24" required>
                </div>
                <div class="form-group">
                    <label for="skins"><i class="fas fa-gun"></i> Skins Premium</label>
                    <input type="number" id="skins" name="skins" min="0">
                </div>
            </div>
            <div class="form-group">
                <label for="rare_skins"><i class="fas fa-crown"></i> Bundles/Skins Raras</label>
                <textarea id="rare_skins" name="rare_skins" rows="2" placeholder="Ex: Bundle Oni, Prime Vandal, Reaver Operator"></textarea>
            </div>
        `;
    }

    getMobileLegendsTemplate() {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="rank"><i class="fas fa-trophy"></i> Rank Atual *</label>
                    <select id="rank" name="rank" required>
                        <option value="">Selecione o rank</option>
                        ${['Warrior', 'Elite', 'Master', 'Grandmaster', 'Epic', 'Legend', 'Mythic', 'Mythical Glory']
                            .map(rank => `<option value="${rank.toLowerCase()}">${rank}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="level"><i class="fas fa-level-up-alt"></i> Level</label>
                    <input type="number" id="level" name="level" min="1" max="120">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="heroes"><i class="fas fa-user-ninja"></i> Heroes *</label>
                    <input type="number" id="heroes" name="heroes" min="0" max="150" required>
                </div>
                <div class="form-group">
                    <label for="skins"><i class="fas fa-tshirt"></i> Skins *</label>
                    <input type="number" id="skins" name="skins" min="0" required>
                </div>
            </div>
            <div class="form-group">
                <label for="rare_skins"><i class="fas fa-crown"></i> Skins Raras/Lendárias</label>
                <textarea id="rare_skins" name="rare_skins" rows="2" placeholder="Ex: Skin Legendária, Collector, Starlight"></textarea>
            </div>
        `;
    }

    getDiabloTemplate() {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="level"><i class="fas fa-level-up-alt"></i> Level do Personagem *</label>
                    <input type="number" id="level" name="level" min="1" max="100" required>
                </div>
                <div class="form-group">
                    <label for="world_tier"><i class="fas fa-layer-group"></i> World Tier</label>
                    <select id="world_tier" name="world_tier">
                        <option value="">Selecione</option>
                        ${[1,2,3,4].map(tier => `<option value="${tier}">World Tier ${tier}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="gold"><i class="fas fa-coins"></i> Gold *</label>
                    <input type="number" id="gold" name="gold" min="0" required>
                </div>
                <div class="form-group">
                    <label for="paragon"><i class="fas fa-infinity"></i> Paragon Points</label>
                    <input type="number" id="paragon" name="paragon" min="0">
                </div>
            </div>
            <div class="form-group">
                <label for="rare_items"><i class="fas fa-chess-knight"></i> Itens Raros/Únicos</label>
                <textarea id="rare_items" name="rare_items" rows="2" placeholder="Ex: Shako, Grandfather, Harlequin Crest"></textarea>
            </div>
        `;
    }

    getFortniteTemplate() {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="level"><i class="fas fa-level-up-alt"></i> Level</label>
                    <input type="number" id="level" name="level" min="1" max="1000">
                </div>
                <div class="form-group">
                    <label for="skins"><i class="fas fa-tshirt"></i> Skins *</label>
                    <input type="number" id="skins" name="skins" min="0" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="v_bucks"><i class="fas fa-coins"></i> V-Bucks</label>
                    <input type="number" id="v_bucks" name="v_bucks" min="0">
                </div>
                <div class="form-group">
                    <label for="battle_pass"><i class="fas fa-ticket-alt"></i> Battle Pass</label>
                    <select id="battle_pass" name="battle_pass">
                        <option value="">Selecione</option>
                        <option value="none">Nenhum</option>
                        <option value="current">Atual Completo</option>
                        <option value="multiple">Múltiplos Completos</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="rare_items"><i class="fas fa-crown"></i> Itens Raros/Exclusivos</label>
                <textarea id="rare_items" name="rare_items" rows="2" placeholder="Ex: Mako Glider, Renegade Raider, Recon Expert"></textarea>
            </div>
        `;
    }

    getDefaultTemplate() {
        return `
            <div class="form-group">
                <label for="level"><i class="fas fa-level-up-alt"></i> Level/Nível</label>
                <input type="number" id="level" name="level" min="1">
            </div>
            <div class="form-group">
                <label for="rank"><i class="fas fa-trophy"></i> Rank/Classificação</label>
                <input type="text" id="rank" name="rank" placeholder="Ex: Diamante, Ouro, Top 500...">
            </div>
            <div class="form-group">
                <label for="items"><i class="fas fa-box-open"></i> Itens/Conteúdo</label>
                <textarea id="items" name="items" rows="3" placeholder="Descreva itens, personagens, skins, etc..."></textarea>
            </div>
            <div class="form-group">
                <label for="currency"><i class="fas fa-coins"></i> Moeda do Jogo</label>
                <input type="number" id="currency" name="currency" min="0">
            </div>
        `;
    }

    attachGameFieldEvents(container) {
        // Adiciona eventos de validação aos campos específicos do jogo
        const numberInputs = container.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            input.addEventListener('input', () => {
                const value = parseFloat(input.value) || 0;
                const min = parseFloat(input.min) || 0;
                const max = parseFloat(input.max) || Infinity;
                
                if (value < min || value > max) {
                    this.showFieldError(input, `Valor deve estar entre ${min} e ${max}`);
                } else {
                    this.clearFieldError(input);
                }
            });
        });
    }

    previewImages(files) {
        const previewContainer = document.getElementById('imagePreview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';
        
        Array.from(files).slice(0, 5).forEach((file, index) => {
            if (!file.type.startsWith('image/')) {
                this.showError(`Arquivo "${file.name}" não é uma imagem válida`);
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB
                this.showError(`Imagem "${file.name}" é muito grande (máx. 5MB)`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'image-preview-item';
                img.dataset.index = index;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-image';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => this.removeImage(index);
                
                const wrapper = document.createElement('div');
                wrapper.className = 'image-preview-wrapper';
                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                
                previewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    }

    removeImage(index) {
        const input = document.querySelector('[name="screenshots"]');
        if (!input) return;
        
        const files = Array.from(input.files);
        files.splice(index, 1);
        
        // Atualiza input
        const newFileList = new DataTransfer();
        files.forEach(file => newFileList.items.add(file));
        input.files = newFileList.files;
        
        // Atualiza preview
        this.previewImages(input.files);
    }

    async handleSellForm(form) {
        if (!this.currentUser) {
            this.showLoginPrompt();
            return;
        }

        const formData = new FormData(form);
        const accountData = {
            game: formData.get('game'),
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')) || 0,
            seller: this.currentUser.username,
            seller_id: this.currentUser.id,
            features: {},
            images: [],
            status: 'available',
            created_at: new Date().toISOString(),
            views: 0,
            favorites_count: 0,
            verified: false
        };

        // Validações básicas
        if (accountData.title.length < 10) {
            this.showError('O título deve ter pelo menos 10 caracteres');
            return;
        }

        if (accountData.description.length < 50) {
            this.showError('A descrição deve ter pelo menos 50 caracteres');
            return;
        }

        if (accountData.price < 5 || accountData.price > 10000) {
            this.showError('O preço deve estar entre R$ 5,00 e R$ 10.000,00');
            return;
        }

        // Coleta campos específicos do jogo
        formData.forEach((value, key) => {
            if (key !== 'game' && key !== 'title' && key !== 'description' && 
                key !== 'price' && key !== 'screenshots') {
                if (value && value.toString().trim() !== '') {
                    accountData.features[key] = isNaN(value) ? value : parseFloat(value);
                }
            }
        });

        // Processa imagens
        const imagesInput = form.querySelector('[name="screenshots"]');
        if (imagesInput.files.length > 0) {
            const imagePromises = [];
            
            Array.from(imagesInput.files).slice(0, 5).forEach((file, index) => {
                imagePromises.push(new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        accountData.images.push(e.target.result);
                        resolve();
                    };
                    reader.readAsDataURL(file);
                }));
            });
            
            await Promise.all(imagePromises);
        }

        try {
            // Salva a conta
            const account = await db.addAccount(accountData);
            
            // Adiciona às contas em destaque
            this.addToFeaturedAccounts(account);
            
            this.showSuccess('Conta publicada com sucesso!');
            
            // Redireciona após 2 segundos
            setTimeout(() => {
                window.location.href = `account-detail.html?id=${account.id}`;
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao publicar conta:', error);
            this.showError('Erro ao publicar conta. Tente novamente.');
        }
    }

    addToFeaturedAccounts(account) {
        try {
            let featuredAccounts = JSON.parse(localStorage.getItem('featured_accounts') || '[]');
            
            // Remove contas antigas se houver muitas
            if (featuredAccounts.length >= 6) {
                featuredAccounts = featuredAccounts.slice(0, 5);
            }
            
            // Adiciona nova conta no início
            featuredAccounts.unshift({
                id: account.id,
                game: account.game,
                title: account.title,
                price: account.price,
                seller: account.seller,
                images: account.images,
                created_at: account.created_at
            });
            
            localStorage.setItem('featured_accounts', JSON.stringify(featuredAccounts));
            
            // Dispara evento para atualizar a home
            const event = new CustomEvent('newAccountPublished');
            window.dispatchEvent(event);
            
        } catch (error) {
            console.error('Erro ao adicionar às contas em destaque:', error);
        }
    }

    async loadInitialData() {
        try {
            // Carrega dados específicos da página atual
            if (this.isOnHomePage()) {
                await this.loadHomePageData();
            } else if (this.isOnListingsPage()) {
                await this.loadListingsPageData();
            } else if (this.isOnAccountDetailPage()) {
                await this.loadAccountDetailPageData();
            } else if (this.isOnDashboardPage()) {
                await this.loadDashboardPageData();
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    isOnHomePage() {
        return window.location.pathname.includes('index.html') || 
               window.location.pathname === '/' ||
               window.location.pathname.endsWith('/');
    }

    isOnListingsPage() {
        return window.location.pathname.includes('listings.html');
    }

    isOnAccountDetailPage() {
        return window.location.pathname.includes('account-detail.html');
    }

    isOnDashboardPage() {
        return window.location.pathname.includes('dashboard.html');
    }

    async loadHomePageData() {
        await this.loadFeaturedAccounts();
        await this.loadPopularGames();
        await this.loadStats();
    }

    async loadListingsPageData() {
        await this.loadAllAccounts();
        this.initAdvancedFilters();
    }

    async loadAccountDetailPageData() {
        await this.loadAccountDetails();
        this.initImageGallery();
    }

    async loadDashboardPageData() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        await this.loadUserDashboard();
    }

    async loadFeaturedAccounts() {
        try {
            const featuredGrid = document.getElementById('featuredAccounts');
            if (!featuredGrid) return;

            // Tenta carregar do localStorage primeiro
            let featuredAccounts = JSON.parse(localStorage.getItem('featured_accounts') || '[]');
            
            // Se não houver no localStorage, carrega do banco
            if (featuredAccounts.length === 0) {
                const accounts = await db.getAllAccounts({
                    status: 'available'
                });
                
                // Ordena por visualizações e pega as 6 primeiras
                featuredAccounts = accounts
                    .sort((a, b) => (b.views || 0) - (a.views || 0))
                    .slice(0, 6);
            }

            if (featuredAccounts.length === 0) {
                featuredGrid.innerHTML = `
                    <div class="no-content">
                        <i class="fas fa-store"></i>
                        <p>Nenhuma conta em destaque no momento</p>
                        <a href="listings.html" class="btn btn-primary">Explorar Contas</a>
                    </div>
                `;
            } else {
                featuredGrid.innerHTML = featuredAccounts
                    .map(account => this.createAccountCard(account))
                    .join('');
                
                // Adiciona eventos aos cards
                this.attachCardEvents();
            }
        } catch (error) {
            console.error('Erro ao carregar contas em destaque:', error);
            this.showError('Erro ao carregar contas em destaque');
        }
    }

    async loadPopularGames() {
        try {
            // Carrega estatísticas dos jogos mais populares
            const gamesContainer = document.querySelector('.games-grid');
            if (!gamesContainer) return;

            // Lista de jogos populares
            const popularGames = [
                { code: 'genshin', name: 'Genshin Impact', icon: 'fa-wind', color: '#FF6B6B' },
                { code: 'lol', name: 'League of Legends', icon: 'fa-fist-raised', color: '#FFD166' },
                { code: 'valorant', name: 'Valorant', icon: 'fa-crosshairs', color: '#FF6B6B' },
                { code: 'mobile-legends', name: 'Mobile Legends', icon: 'fa-mobile-alt', color: '#118AB2' },
                { code: 'diablo', name: 'Diablo IV', icon: 'fa-skull', color: '#EF476F' },
                { code: 'fortnite', name: 'Fortnite', icon: 'fa-parachute-box', color: '#06D6A0' }
            ];

            // Conta quantas contas tem para cada jogo
            const accounts = await db.getAllAccounts({ status: 'available' });
            const gameCounts = {};
            
            accounts.forEach(account => {
                if (account.game) {
                    gameCounts[account.game] = (gameCounts[account.game] || 0) + 1;
                }
            });

            gamesContainer.innerHTML = popularGames.map(game => `
                <div class="game-card" data-game="${game.code}" 
                     style="--game-color: ${game.color}"
                     onclick="window.location.href='listings.html?game=${game.code}'">
                    <div class="game-icon" style="color: ${game.color}">
                        <i class="fas ${game.icon}"></i>
                    </div>
                    <h3>${game.name}</h3>
                    <p class="account-count">${gameCounts[game.code] || 0} contas</p>
                    <a href="listings.html?game=${game.code}" class="game-link">
                        Ver Contas <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `).join('');

        } catch (error) {
            console.error('Erro ao carregar jogos populares:', error);
        }
    }

    async loadStats() {
        try {
            const statsBar = document.querySelector('.stats-bar');
            if (!statsBar) return;

            const accounts = await db.getAllAccounts({ status: 'available' });
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            
            // Anima os números
            this.animateNumber('total-accounts', accounts.length);
            this.animateNumber('total-users', users.length);
            this.animateNumber('completed-sales', transactions.filter(t => t.status === 'completed').length);
            this.animateNumber('average-rating', 4.9, 1);

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    animateNumber(elementId, targetValue, decimals = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;

        let currentValue = 0;
        const increment = targetValue / 50; // 50 steps
        const duration = 1000; // 1 second
        const stepTime = duration / 50;

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = currentValue.toFixed(decimals);
        }, stepTime);
    }

    async loadAllAccounts() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const filters = {
                status: 'available'
            };

            // Aplica filtros da URL
            if (urlParams.get('game')) {
                filters.game = urlParams.get('game');
                // Atualiza filtro no formulário
                const gameSelect = document.querySelector('select[name="game"]');
                if (gameSelect) gameSelect.value = filters.game;
            }
            
            if (urlParams.get('min_price')) {
                filters.min_price = parseFloat(urlParams.get('min_price'));
            }
            
            if (urlParams.get('max_price')) {
                filters.max_price = parseFloat(urlParams.get('max_price'));
            }
            
            if (urlParams.get('sort')) {
                filters.sort = urlParams.get('sort');
            }

            const accounts = await db.getAllAccounts(filters);
            this.displayFilteredAccounts(accounts);
            
            // Atualiza contador
            const countElement = document.getElementById('accounts-count');
            if (countElement) {
                countElement.textContent = accounts.length;
            }

        } catch (error) {
            console.error('Erro ao carregar contas:', error);
            this.showError('Erro ao carregar contas');
        }
    }

    initAdvancedFilters() {
        // Inicializa sliders de preço
        const minPriceInput = document.getElementById('min_price');
        const maxPriceInput = document.getElementById('max_price');
        const minPriceValue = document.getElementById('min_price_value');
        const maxPriceValue = document.getElementById('max_price_value');
        
        if (minPriceInput && minPriceValue) {
            minPriceInput.addEventListener('input', (e) => {
                minPriceValue.textContent = `R$ ${e.target.value}`;
            });
        }
        
        if (maxPriceInput && maxPriceValue) {
            maxPriceInput.addEventListener('input', (e) => {
                maxPriceValue.textContent = `R$ ${e.target.value}`;
            });
        }
    }

    async loadAccountDetails() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const accountId = urlParams.get('id');

            if (!accountId) {
                this.showError('Conta não especificada');
                setTimeout(() => window.location.href = 'listings.html', 2000);
                return;
            }

            const account = await db.getAccount(accountId);
            if (!account) {
                this.showError('Conta não encontrada');
                setTimeout(() => window.location.href = 'listings.html', 2000);
                return;
            }

            this.displayAccountDetails(account);
            
            // Carrega reviews
            await this.loadAccountReviews(accountId);
            
            // Verifica se está favoritado
            if (this.currentUser) {
                const isFavorite = await db.isFavorite(this.currentUser.id, accountId);
                this.updateFavoriteButton(accountId, isFavorite);
            }
            
            // Incrementa visualizações
            await this.incrementAccountViews(accountId);

        } catch (error) {
            console.error('Erro ao carregar detalhes da conta:', error);
            this.showError('Erro ao carregar conta');
        }
    }

    displayAccountDetails(account) {
        const container = document.querySelector('.account-detail-container');
        if (!container) return;

        const isInCart = window.cart?.isInCart?.(account.id) || false;
        
        container.innerHTML = `
            <div class="account-detail-header">
                <div class="account-detail-title">
                    <h1>${this.escapeHtml(account.title)}</h1>
                    <div class="account-meta">
                        <span class="game-badge">${this.getGameName(account.game)}</span>
                        <span class="price">${this.formatPrice(account.price)}</span>
                        ${account.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificada</span>' : ''}
                        ${account.status === 'sold' ? '<span class="sold-badge"><i class="fas fa-tag"></i> Vendida</span>' : ''}
                    </div>
                </div>
                
                <div class="account-actions">
                    <button class="btn-favorite-detail ${this.currentUser && db.isFavorite(this.currentUser.id, account.id) ? 'active' : ''}" 
                            data-id="${account.id}">
                        <i class="${this.currentUser && db.isFavorite(this.currentUser.id, account.id) ? 'fas' : 'far'} fa-heart"></i>
                        ${this.currentUser && db.isFavorite(this.currentUser.id, account.id) ? 'Favoritado' : 'Favoritar'}
                    </button>
                    <button class="btn-add-to-cart-detail ${isInCart ? 'in-cart' : ''}" 
                            data-account-id="${account.id}">
                        <i class="fas ${isInCart ? 'fa-check' : 'fa-cart-plus'}"></i>
                        ${isInCart ? 'No Carrinho' : 'Adicionar ao Carrinho'}
                    </button>
                    ${account.status === 'available' ? `
                        <button class="btn-buy-now" data-account-id="${account.id}">
                            <i class="fas fa-bolt"></i> Comprar Agora
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="account-detail-content">
                <div class="account-gallery" id="accountGallery">
                    ${this.renderAccountGallery(account)}
                </div>
                
                <div class="account-info-detail">
                    ${this.renderSellerInfo(account)}
                    
                    <div class="account-description">
                        <h3><i class="fas fa-align-left"></i> Descrição</h3>
                        <p>${this.escapeHtml(account.description || 'Sem descrição')}</p>
                    </div>
                    
                    <div class="account-features-detail">
                        <h3><i class="fas fa-list"></i> Características</h3>
                        <div class="features-grid">
                            ${this.renderDetailedFeatures(account)}
                        </div>
                    </div>
                    
                    <div class="account-stats-detail">
                        <h3><i class="fas fa-chart-bar"></i> Estatísticas</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <i class="fas fa-eye"></i>
                                <span>${account.views || 0} visualizações</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-heart"></i>
                                <span>${account.favorites_count || 0} favoritos</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-calendar"></i>
                                <span>Publicada em ${this.formatDate(account.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="reviews-section" id="reviewsContainer">
                <h3><i class="fas fa-star"></i> Avaliações</h3>
                <div class="reviews-loading">
                    <i class="fas fa-spinner fa-spin"></i> Carregando avaliações...
                </div>
            </div>
        `;

        // Adiciona eventos
        this.attachAccountDetailEvents(account.id);
    }

    renderAccountGallery(account) {
        if (!account.images || account.images.length === 0) {
            return `
                <div class="main-image">
                    <img src="https://via.placeholder.com/800x450/1A1A1A/8A2BE2?text=Sem+Imagem" 
                         alt="${this.escapeHtml(account.title)}">
                </div>
                <div class="thumbnail-grid">
                    <div class="no-images">Sem imagens disponíveis</div>
                </div>
            `;
        }

        const mainImage = account.images[0];
        const thumbnails = account.images.map((img, index) => `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="${img}" alt="Imagem ${index + 1}">
            </div>
        `).join('');

        return `
            <div class="main-image">
                <img src="${mainImage}" alt="${this.escapeHtml(account.title)}" id="mainGalleryImage">
            </div>
            <div class="thumbnail-grid">
                ${thumbnails}
            </div>
        `;
    }

    renderSellerInfo(account) {
        return `
            <div class="seller-info-detail">
                <div class="seller-header">
                    <div class="seller-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="seller-details">
                        <h3>${this.escapeHtml(account.seller || 'Anônimo')}</h3>
                        <div class="seller-rating">
                            <span class="stars">${this.renderStars(account.seller_rating || 5)}</span>
                            <span class="sales">${account.seller_sales || 0} vendas</span>
                        </div>
                    </div>
                </div>
                <button class="btn-contact-seller" data-seller-id="${account.seller_id || account.seller}">
                    <i class="fas fa-comment"></i> Contatar Vendedor
                </button>
            </div>
        `;
    }

    initImageGallery() {
        const thumbnails = document.querySelectorAll('.thumbnail');
        const mainImage = document.getElementById('mainGalleryImage');
        
        if (!mainImage || thumbnails.length === 0) return;
        
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', () => {
                // Remove classe active de todas as thumbnails
                thumbnails.forEach(t => t.classList.remove('active'));
                
                // Adiciona classe active à thumbnail clicada
                thumbnail.classList.add('active');
                
                // Atualiza imagem principal
                const img = thumbnail.querySelector('img');
                if (img) {
                    mainImage.src = img.src;
                    
                    // Adiciona efeito de transição
                    mainImage.style.opacity = '0';
                    setTimeout(() => {
                        mainImage.style.opacity = '1';
                    }, 100);
                }
            });
        });
    }

    attachAccountDetailEvents(accountId) {
        // Evento para favoritar
        const favoriteBtn = document.querySelector('.btn-favorite-detail');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async () => {
                if (!this.currentUser) {
                    this.showLoginPrompt();
                    return;
                }
                
                try {
                    const isFavorite = favoriteBtn.classList.contains('active');
                    
                    if (isFavorite) {
                        await db.removeFavorite(this.currentUser.id, accountId);
                        favoriteBtn.classList.remove('active');
                        favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Favoritar';
                        this.showNotification('Removido dos favoritos', 'info');
                    } else {
                        await db.addFavorite(this.currentUser.id, accountId);
                        favoriteBtn.classList.add('active');
                        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
                        this.showNotification('Adicionado aos favoritos', 'success');
                    }
                } catch (error) {
                    console.error('Erro ao atualizar favoritos:', error);
                    this.showError('Erro ao atualizar favoritos');
                }
            });
        }
        
        // Evento para adicionar ao carrinho
        const addToCartBtn = document.querySelector('.btn-add-to-cart-detail');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', async () => {
                try {
                    const account = await db.getAccount(accountId);
                    if (account) {
                        const success = window.cart.addAccount(account);
                        if (success) {
                            addToCartBtn.classList.add('in-cart');
                            addToCartBtn.innerHTML = '<i class="fas fa-check"></i> No Carrinho';
                        }
                    }
                } catch (error) {
                    console.error('Erro ao adicionar ao carrinho:', error);
                }
            });
        }
        
        // Evento para comprar agora
        const buyNowBtn = document.querySelector('.btn-buy-now');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', async () => {
                try {
                    const account = await db.getAccount(accountId);
                    if (account) {
                        // Adiciona ao carrinho e redireciona para checkout
                        window.cart.addAccount(account);
                        setTimeout(() => {
                            window.location.href = 'checkout.html';
                        }, 500);
                    }
                } catch (error) {
                    console.error('Erro ao comprar:', error);
                }
            });
        }
        
        // Evento para contatar vendedor
        const contactBtn = document.querySelector('.btn-contact-seller');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => {
                if (!this.currentUser) {
                    this.showLoginPrompt();
                    return;
                }
                this.startChat(accountId);
            });
        }
    }

    async loadAccountReviews(accountId) {
        try {
            const reviews = await db.getAccountReviews(accountId);
            this.displayReviews(reviews);
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
            this.showError('Erro ao carregar avaliações');
        }
    }

    async incrementAccountViews(accountId) {
        try {
            await db.updateAccountViews(accountId);
        } catch (error) {
            console.error('Erro ao incrementar visualizações:', error);
        }
    }

    async loadUserDashboard() {
        if (!this.currentUser) return;

        try {
            const user = await db.getUser(this.currentUser.id);
            if (!user) {
                this.logout();
                return;
            }

            this.displayUserDashboard(user);
            
            // Carrega dados adicionais baseados no tipo de usuário
            if (user.type === 'seller' || user.type === 'admin') {
                await this.loadSellerDashboard(user);
            } else {
                await this.loadBuyerDashboard(user);
            }

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showError('Erro ao carregar dashboard');
        }
    }

    displayUserDashboard(user) {
        const container = document.querySelector('.dashboard-content');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-header">
                <div class="user-profile">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info">
                        <h1>${this.escapeHtml(user.username)}</h1>
                        <div class="user-stats">
                            <span class="stat">
                                <i class="fas fa-star"></i>
                                ${user.rating?.toFixed(1) || '5.0'}
                            </span>
                            <span class="stat">
                                <i class="fas fa-shopping-cart"></i>
                                ${user.purchases_count || 0} compras
                            </span>
                            <span class="stat">
                                <i class="fas fa-store"></i>
                                ${user.sales_count || 0} vendas
                            </span>
                            <span class="stat">
                                <i class="fas fa-wallet"></i>
                                ${this.formatPrice(user.balance || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="user-actions">
                    <button class="btn-edit-profile" onclick="app.editProfile()">
                        <i class="fas fa-edit"></i> Editar Perfil
                    </button>
                    <button class="btn-add-account" onclick="window.location.href='sell.html'">
                        <i class="fas fa-plus"></i> Vender Conta
                    </button>
                </div>
            </div>
            
            <div class="dashboard-tabs">
                <button class="tab-btn active" data-tab="overview">Visão Geral</button>
                ${user.type === 'seller' || user.type === 'admin' ? `
                    <button class="tab-btn" data-tab="my-accounts">Minhas Contas</button>
                    <button class="tab-btn" data-tab="sales">Vendas</button>
                ` : ''}
                <button class="tab-btn" data-tab="purchases">Compras</button>
                <button class="tab-btn" data-tab="favorites">Favoritos</button>
                <button class="tab-btn" data-tab="messages">Mensagens</button>
                <button class="tab-btn" data-tab="settings">Configurações</button>
            </div>
            
            <div class="tab-content">
                <div id="overview" class="tab-pane active">
                    ${this.renderDashboardOverview(user)}
                </div>
                ${user.type === 'seller' || user.type === 'admin' ? `
                    <div id="my-accounts" class="tab-pane">
                        <div class="tab-pane-header">
                            <h2><i class="fas fa-store"></i> Minhas Contas à Venda</h2>
                        </div>
                        <div class="accounts-grid" id="userAccountsGrid">
                            <div class="loading">
                                <i class="fas fa-spinner fa-spin"></i> Carregando contas...
                            </div>
                        </div>
                    </div>
                    <div id="sales" class="tab-pane">
                        <div class="tab-pane-header">
                            <h2><i class="fas fa-chart-line"></i> Histórico de Vendas</h2>
                        </div>
                        <div class="sales-list" id="salesList">
                            <div class="loading">
                                <i class="fas fa-spinner fa-spin"></i> Carregando vendas...
                            </div>
                        </div>
                    </div>
                ` : ''}
                <div id="purchases" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2><i class="fas fa-shopping-cart"></i> Histórico de Compras</h2>
                    </div>
                    <div class="purchases-list" id="purchasesList">
                        <div class="loading">
                            <i class="fas fa-spinner fa-spin"></i> Carregando compras...
                        </div>
                    </div>
                </div>
                <div id="favorites" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2><i class="fas fa-heart"></i> Contas Favoritadas</h2>
                    </div>
                    <div class="accounts-grid" id="userFavoritesGrid">
                        <div class="loading">
                            <i class="fas fa-spinner fa-spin"></i> Carregando favoritos...
                        </div>
                    </div>
                </div>
                <div id="messages" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2><i class="fas fa-comments"></i> Mensagens</h2>
                    </div>
                    <div class="messages-container" id="messagesContainer">
                        <div class="no-messages">
                            <i class="fas fa-comment-slash"></i>
                            <p>Nenhuma mensagem</p>
                        </div>
                    </div>
                </div>
                <div id="settings" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2><i class="fas fa-cog"></i> Configurações</h2>
                    </div>
                    <div class="settings-container">
                        ${this.renderSettingsForm(user)}
                    </div>
                </div>
            </div>
        `;

        // Inicializa tabs
        this.initDashboardTabs();
        
        // Carrega dados das tabs
        this.loadDashboardTabData(user);
    }

    renderDashboardOverview(user) {
        return `
            <div class="overview-grid">
                <div class="overview-card stats">
                    <h3><i class="fas fa-chart-bar"></i> Estatísticas</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total Gasto</span>
                            <span class="stat-value">${this.formatPrice(user.total_spent || 0)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Compras Realizadas</span>
                            <span class="stat-value">${user.purchases_count || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Vendas Realizadas</span>
                            <span class="stat-value">${user.sales_count || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Avaliação Média</span>
                            <span class="stat-value">${user.rating?.toFixed(1) || '5.0'}/5.0</span>
                        </div>
                    </div>
                </div>
                
                <div class="overview-card recent-activity">
                    <h3><i class="fas fa-history"></i> Atividade Recente</h3>
                    <div class="activity-list" id="recentActivity">
                        <div class="loading">
                            <i class="fas fa-spinner fa-spin"></i> Carregando atividade...
                        </div>
                    </div>
                </div>
                
                <div class="overview-card quick-actions">
                    <h3><i class="fas fa-bolt"></i> Ações Rápidas</h3>
                    <div class="actions-grid">
                        <button class="action-btn" onclick="window.location.href='sell.html'">
                            <i class="fas fa-plus"></i>
                            <span>Vender Conta</span>
                        </button>
                        <button class="action-btn" onclick="window.location.href='listings.html'">
                            <i class="fas fa-search"></i>
                            <span>Explorar Contas</span>
                        </button>
                        <button class="action-btn" onclick="app.editProfile()">
                            <i class="fas fa-user-edit"></i>
                            <span>Editar Perfil</span>
                        </button>
                        <button class="action-btn" onclick="window.cart.clearCart()">
                            <i class="fas fa-trash"></i>
                            <span>Limpar Carrinho</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderSettingsForm(user) {
        return `
            <form id="settingsForm" class="settings-form">
                <div class="form-group">
                    <label for="settings_email">Email</label>
                    <input type="email" id="settings_email" name="email" value="${this.escapeHtml(user.email || '')}" required>
                </div>
                
                <div class="form-group">
                    <label for="settings_phone">Telefone</label>
                    <input type="tel" id="settings_phone" name="phone" value="${this.escapeHtml(user.phone || '')}">
                </div>
                
                <div class="form-group">
                    <label for="settings_discord">Discord</label>
                    <input type="text" id="settings_discord" name="discord" value="${this.escapeHtml(user.discord || '')}">
                </div>
                
                <div class="form-group">
                    <label for="current_password">Senha Atual (para alterar senha)</label>
                    <input type="password" id="current_password" name="current_password">
                </div>
                
                <div class="form-group">
                    <label for="new_password">Nova Senha</label>
                    <input type="password" id="new_password" name="new_password">
                </div>
                
                <div class="form-group">
                    <label for="confirm_password">Confirmar Nova Senha</label>
                    <input type="password" id="confirm_password" name="confirm_password">
                </div>
                
                <div class="form-group">
                    <label for="notifications">
                        <input type="checkbox" id="notifications" name="notifications" ${user.notifications !== false ? 'checked' : ''}>
                        Receber notificações por email
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                    <button type="button" class="btn btn-outline" onclick="app.logout()">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </button>
                </div>
            </form>
        `;
    }

    initDashboardTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove classe active de todas as tabs
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                // Adiciona classe active na tab clicada
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                const tabPane = document.getElementById(tabId);
                if (tabPane) tabPane.classList.add('active');
                
                // Carrega dados da tab se necessário
                this.loadTabData(tabId);
            });
        });
    }

    loadDashboardTabData(user) {
        // Carrega dados da tab ativa
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            this.loadTabData(activeTab.dataset.tab, user);
        }
    }

    async loadTabData(tabId, user = this.currentUser) {
        if (!user) return;

        try {
            switch (tabId) {
                case 'my-accounts':
                    await this.loadUserAccounts(user.id);
                    break;
                case 'purchases':
                    await this.loadUserPurchases(user.id);
                    break;
                case 'sales':
                    await this.loadUserSales(user.id);
                    break;
                case 'favorites':
                    await this.loadUserFavorites(user.id);
                    break;
                case 'overview':
                    await this.loadRecentActivity(user.id);
                    break;
                case 'settings':
                    this.initSettingsForm();
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar tab ${tabId}:`, error);
        }
    }

    async loadUserAccounts(userId) {
        try {
            const accounts = await db.getAllAccounts({
                seller_id: userId,
                status: 'available'
            });
            
            const container = document.getElementById('userAccountsGrid');
            if (!container) return;
            
            if (accounts.length === 0) {
                container.innerHTML = `
                    <div class="no-content">
                        <i class="fas fa-store"></i>
                        <p>Você ainda não tem contas à venda</p>
                        <a href="sell.html" class="btn btn-primary">Vender Minha Primeira Conta</a>
                    </div>
                `;
            } else {
                container.innerHTML = accounts.map(account => this.createAccountCard(account)).join('');
                this.attachCardEvents();
            }
        } catch (error) {
            console.error('Erro ao carregar contas do usuário:', error);
        }
    }

    async loadUserPurchases(userId) {
        try {
            const transactions = await db.getUserPurchases(userId);
            const container = document.getElementById('purchasesList');
            if (!container) return;
            
            if (transactions.length === 0) {
                container.innerHTML = `
                    <div class="no-content">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Você ainda não fez nenhuma compra</p>
                        <a href="listings.html" class="btn btn-primary">Começar a Comprar</a>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="purchases-grid">
                        ${transactions.map(transaction => `
                            <div class="purchase-item">
                                <div class="purchase-header">
                                    <span class="purchase-id">#${transaction.id?.substring(0, 8) || 'N/A'}</span>
                                    <span class="purchase-date">${this.formatDate(transaction.created_at)}</span>
                                </div>
                                <div class="purchase-details">
                                    <span class="purchase-amount">${this.formatPrice(transaction.amount || 0)}</span>
                                    <span class="purchase-status status-${transaction.status || 'pending'}">
                                        ${transaction.status === 'completed' ? 'Concluído' : 
                                          transaction.status === 'pending' ? 'Pendente' : 
                                          transaction.status === 'cancelled' ? 'Cancelado' : 'Desconhecido'}
                                    </span>
                                </div>
                                <div class="purchase-actions">
                                    <button class="btn btn-sm" onclick="app.viewTransaction('${transaction.id}')">
                                        Detalhes
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar compras:', error);
        }
    }

    async loadUserSales(userId) {
        try {
            // Busca transações onde o usuário é o vendedor
            const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            const sales = allTransactions.filter(t => t.seller_id === userId || t.seller === userId);
            
            const container = document.getElementById('salesList');
            if (!container) return;
            
            if (sales.length === 0) {
                container.innerHTML = `
                    <div class="no-content">
                        <i class="fas fa-chart-line"></i>
                        <p>Você ainda não realizou nenhuma venda</p>
                        <a href="sell.html" class="btn btn-primary">Vender Minha Primeira Conta</a>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="sales-grid">
                        ${sales.map(sale => `
                            <div class="sale-item">
                                <div class="sale-header">
                                    <span class="sale-id">#${sale.id?.substring(0, 8) || 'N/A'}</span>
                                    <span class="sale-date">${this.formatDate(sale.created_at)}</span>
                                </div>
                                <div class="sale-details">
                                    <span class="sale-amount">${this.formatPrice(sale.amount || 0)}</span>
                                    <span class="sale-buyer">Comprador: ${sale.buyer_name || 'Anônimo'}</span>
                                </div>
                                <div class="sale-status status-${sale.status || 'pending'}">
                                    ${sale.status === 'completed' ? 'Concluída' : 
                                      sale.status === 'pending' ? 'Pendente' : 
                                      sale.status === 'cancelled' ? 'Cancelada' : 'Desconhecida'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
        }
    }

    async loadUserFavorites(userId) {
        try {
            const favorites = await db.getUserFavorites(userId);
            const container = document.getElementById('userFavoritesGrid');
            if (!container) return;
            
            if (favorites.length === 0) {
                container.innerHTML = `
                    <div class="no-content">
                        <i class="fas fa-heart"></i>
                        <p>Você ainda não favoritou nenhuma conta</p>
                        <a href="listings.html" class="btn btn-primary">Explorar Contas</a>
                    </div>
                `;
            } else {
                container.innerHTML = favorites.map(account => this.createAccountCard(account)).join('');
                this.attachCardEvents();
            }
        } catch (error) {
            console.error('Erro ao carregar favoritos:', error);
        }
    }

    async loadRecentActivity(userId) {
        try {
            const container = document.getElementById('recentActivity');
            if (!container) return;
            
            // Busca atividade recente (compras, vendas, favoritos)
            const purchases = await db.getUserPurchases(userId);
            const favorites = await db.getUserFavorites(userId);
            
            const activities = [
                ...purchases.map(p => ({
                    type: 'purchase',
                    message: `Você comprou uma conta por ${this.formatPrice(p.amount)}`,
                    date: p.created_at,
                    icon: 'fa-shopping-cart'
                })),
                ...favorites.slice(0, 5).map(f => ({
                    type: 'favorite',
                    message: `Você favoritou "${f.title.substring(0, 30)}..."`,
                    date: f.created_at,
                    icon: 'fa-heart'
                }))
            ];
            
            // Ordena por data (mais recente primeiro)
            activities.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (activities.length === 0) {
                container.innerHTML = `
                    <div class="no-activity">
                        <p>Nenhuma atividade recente</p>
                    </div>
                `;
            } else {
                container.innerHTML = activities.slice(0, 10).map(activity => `
                    <div class="activity-item">
                        <i class="fas ${activity.icon}"></i>
                        <div class="activity-content">
                            <p>${activity.message}</p>
                            <small>${this.formatDate(activity.date)}</small>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar atividade recente:', error);
        }
    }

    initSettingsForm() {
        const form = document.getElementById('settingsForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSettingsUpdate(form);
        });
    }

    async handleSettingsUpdate(form) {
        if (!this.currentUser) return;
        
        const formData = new FormData(form);
        const updates = {};
        
        // Coleta atualizações
        for (const [key, value] of formData.entries()) {
            if (value && key !== 'current_password' && key !== 'new_password' && key !== 'confirm_password') {
                updates[key] = value;
            }
        }
        
        // Validação de senha
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');
        
        if (newPassword) {
            if (!currentPassword) {
                this.showError('Digite sua senha atual para alterar a senha');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                this.showError('As novas senhas não coincidem');
                return;
            }
            
            if (newPassword.length < 6) {
                this.showError('A nova senha deve ter pelo menos 6 caracteres');
                return;
            }
            
            // Verifica senha atual (em um sistema real, isso seria verificado no backend)
            if (currentPassword !== this.currentUser.password) {
                this.showError('Senha atual incorreta');
                return;
            }
            
            updates.password = newPassword;
        }
        
        try {
            // Atualiza usuário
            await db.updateUser(this.currentUser.id, updates);
            
            // Atualiza usuário atual
            this.currentUser = { ...this.currentUser, ...updates };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.showSuccess('Configurações atualizadas com sucesso!');
            
            // Atualiza UI
            this.updateUIForUser();
            
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            this.showError('Erro ao atualizar configurações');
        }
    }

    async loadSellerDashboard(user) {
        // Implementação específica para vendedores
    }

    async loadBuyerDashboard(user) {
        // Implementação específica para compradores
    }

    editProfile() {
        // Implementar edição de perfil
        this.showError('Funcionalidade em desenvolvimento');
    }

    viewTransaction(transactionId) {
        // Implementar visualização de transação
        this.showError('Funcionalidade em desenvolvimento');
    }

    startChat(accountId) {
        // Implementar sistema de chat
        this.showError('Sistema de chat em desenvolvimento');
    }

    initTooltips() {
        // Inicializa tooltips com Tippy.js ou similar
        // Para simplificar, usaremos title attributes
    }

    // ========== UTILITÁRIOS ==========

    getImageUrl(account) {
        if (!account.images || !account.images[0]) {
            return 'https://via.placeholder.com/300x200/1A1A1A/8A2BE2?text=Game';
        }
        
        const image = account.images[0];
        if (image.startsWith('http') || image.startsWith('data:')) {
            return image;
        } else if (image.startsWith('images/')) {
            return image;
        } else {
            return `images/${image}`;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price || 0);
    }

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

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        let stars = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePhone(phone) {
        const digits = phone.replace(/\D/g, '').length;
        return digits >= 10 && digits <= 11;
    }

    formatDate(dateString) {
        if (!dateString) return 'Data desconhecida';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Data inválida';
        }
    }

    generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    showLoginModal() {
        // Implementar modal de login
        this.showError('Faça login para continuar');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }

    showLoginPrompt() {
        Swal.fire({
            title: 'Login necessário',
            text: 'Faça login para usar esta funcionalidade',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Fazer Login',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.setItem('returnUrl', window.location.href);
                window.location.href = 'login.html';
            }
        });
    }

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: message,
            timer: 2000,
            showConfirmButton: false
        });
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Ops...',
            text: message
        });
    }

    showNotification(message, type = 'info') {
        // Cria notificação estilo toast
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                          type === 'error' ? 'fa-exclamation-circle' : 
                          type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Mostra
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove após 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateCartUI(cartData) {
        // Atualiza UI do carrinho
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = cartData.itemCount || 0;
            el.style.display = cartData.itemCount > 0 ? 'flex' : 'none';
        });
    }

    logout() {
        Swal.fire({
            title: 'Sair da conta?',
            text: 'Tem certeza que deseja sair?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, sair',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.currentUser = null;
                localStorage.removeItem('currentUser');
                localStorage.removeItem('currentUserId');
                localStorage.removeItem('rememberMe');
                
                this.updateUIForUser();
                this.showSuccess('Logout realizado com sucesso!');
                
                // Redireciona para home após 1 segundo
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        });
    }
}

// Inicializa o aplicativo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GameAccountsApp();
});

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameAccountsApp;
}