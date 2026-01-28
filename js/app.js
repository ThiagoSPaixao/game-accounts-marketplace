// Lógica principal do aplicativo
class GameAccountsApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Carrega usuário atual
        this.loadCurrentUser();
        
        // Inicializa componentes
        this.initComponents();
        
        // Carrega dados iniciais
        await this.loadInitialData();
        
        // Configura listeners globais
        this.setupGlobalListeners();
    }

    loadCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForUser();
        }
    }

    updateUIForUser() {
        // Atualiza UI com informações do usuário
        const userElements = document.querySelectorAll('[data-user-info]');
        const authButtons = document.querySelectorAll('.auth-buttons');
        const userMenu = document.querySelectorAll('.user-menu');

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
                }
            });
        } else {
            // Mostra botões de autenticação
            userMenu.forEach(el => el.classList.add('hidden'));
            authButtons.forEach(el => el.classList.remove('hidden'));
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
    }

    setupGlobalListeners() {
        // Adicionar listener para atualizar quando nova conta for publicada
        document.addEventListener('newAccountPublished', () => {
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                this.loadFeaturedAccounts();
            }
        });

        // Verificar se precisa atualizar a home
        if (localStorage.getItem('home_needs_refresh') === 'true') {
            localStorage.removeItem('home_needs_refresh');
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                this.loadFeaturedAccounts();
            }
        }
    }

    initMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const closeBtn = document.querySelector('.mobile-nav-close');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const mobileNav = document.querySelector('.mobile-nav');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                mobileNav.classList.add('active');
                overlay.style.display = 'block';
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                overlay.style.display = 'none';
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                overlay.style.display = 'none';
            });
        }
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
    }

    async performSearch(query) {
        if (!query.trim()) return;

        try {
            const accounts = await window.db.getAllAccounts({
                search: query,
                status: 'available'
            });

            this.displaySearchResults(accounts);
        } catch (error) {
            console.error('Erro na busca:', error);
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
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = accounts.map(account => `
            <div class="search-result-item" data-id="${account.id}">
                <div class="search-result-image">
                    <img src="images/${account.images?.[0] || 'default-account.jpg'}" alt="${account.title}">
                </div>
                <div class="search-result-info">
                    <h4>${account.title}</h4>
                    <div class="search-result-meta">
                        <span class="game-badge">${this.getGameName(account.game)}</span>
                        <span class="price">R$ ${account.price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `).join('');
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
    }

    async applyFilters() {
        const formData = new FormData(document.getElementById('filterForm'));
        const filters = {};

        for (const [key, value] of formData.entries()) {
            if (value) {
                if (key === 'min_price' || key === 'max_price') {
                    filters[key] = parseFloat(value);
                } else if (key === 'sort') {
                    filters.sort = value;
                } else {
                    filters[key] = value;
                }
            }
        }

        try {
            let accounts = await window.db.getAllAccounts(filters);
            
            // Aplica ordenação
            if (filters.sort) {
                accounts = this.sortAccounts(accounts, filters.sort);
            }

            this.displayFilteredAccounts(accounts);
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
        }
    }

    sortAccounts(accounts, sortBy) {
        switch (sortBy) {
            case 'price_asc':
                return [...accounts].sort((a, b) => a.price - b.price);
            case 'price_desc':
                return [...accounts].sort((a, b) => b.price - a.price);
            case 'newest':
                return [...accounts].sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at));
            case 'popular':
                return [...accounts].sort((a, b) => 
                    (b.views || 0) - (a.views || 0));
            default:
                return accounts;
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
                </div>
            `;
            return;
        }

        accountsGrid.innerHTML = accounts.map(account => this.createAccountCard(account)).join('');
    }

    createAccountCard(account) {
        return `
            <div class="account-card" data-id="${account.id}">
                <div class="account-card-header">
                    <span class="game-badge">${this.getGameName(account.game)}</span>
                    ${account.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificada</span>' : ''}
                </div>
                
                <div class="account-image">
                    <img src="images/${account.images?.[0] || 'default-account.jpg'}" alt="${account.title}">
                    <div class="account-overlay">
                        <button class="btn-quick-view" data-id="${account.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-favorite" data-id="${account.id}">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
                
                <div class="account-info">
                    <h3 class="account-title">${account.title}</h3>
                    
                    <div class="account-features">
                        ${this.renderAccountFeatures(account)}
                    </div>
                    
                    <div class="account-stats">
                        <span class="stat"><i class="fas fa-eye"></i> ${account.views || 0}</span>
                        <span class="stat"><i class="fas fa-heart"></i> ${account.favorites_count || 0}</span>
                        <span class="seller">
                            <i class="fas fa-user"></i> ${account.seller}
                        </span>
                    </div>
                    
                    <div class="account-footer">
                        <div class="price">R$ ${account.price.toFixed(2)}</div>
                        <div class="action-buttons">
                            <button class="btn-view" onclick="window.location.href='account-detail.html?id=${account.id}'">
                                Ver Detalhes
                            </button>
                            <button class="btn-add-to-cart" data-account-id="${account.id}">
                                <i class="fas fa-cart-plus"></i>
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
        
        for (const [key, value] of Object.entries(account.features)) {
            if (features.length >= maxFeatures) break;
            
            switch (key) {
                case 'ar_level':
                    features.push(`AR ${value}`);
                    break;
                case 'rank':
                    features.push(`Rank: ${value}`);
                    break;
                case 'five_star_chars':
                    features.push(`${value}x 5★`);
                    break;
                case 'level':
                    features.push(`Level ${value}`);
                    break;
                case 'skins':
                    features.push(`${value} Skins`);
                    break;
            }
        }
        
        return features.map(feat => `<span class="feature-tag">${feat}</span>`).join('');
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
        }

        // Formulário de venda
        const sellForm = document.getElementById('sellForm');
        if (sellForm) {
            this.initSellForm(sellForm);
        }
    }

    async handleLogin() {
        const form = document.getElementById('loginForm');
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const user = await window.db.loginUser(email, password);
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('currentUserId', user.id);
                
                this.updateUIForUser();
                this.showSuccess('Login realizado com sucesso!');
                
                // Redireciona ou fecha modal
                const returnUrl = localStorage.getItem('returnUrl');
                if (returnUrl) {
                    localStorage.removeItem('returnUrl');
                    window.location.href = returnUrl;
                } else {
                    // Fecha modal se existir
                    const modal = document.querySelector('.modal.show');
                    if (modal) {
                        this.closeModal(modal);
                    }
                }
            } else {
                this.showError('Email ou senha incorretos');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro ao realizar login');
        }
    }

    async handleRegister() {
        const form = document.getElementById('registerForm');
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            type: formData.get('user_type') || 'buyer'
        };

        try {
            const user = await window.db.registerUser(userData);
            this.currentUser = user;
            
            // Remove password do objeto antes de salvar
            const { password, ...userWithoutPassword } = user;
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            localStorage.setItem('currentUserId', user.id);
            
            this.updateUIForUser();
            this.showSuccess('Cadastro realizado com sucesso!');
            
            // Fecha modal
            const modal = document.querySelector('.modal.show');
            if (modal) {
                this.closeModal(modal);
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            this.showError(error.message || 'Erro ao realizar cadastro');
        }
    }

    initSellForm(form) {
        const gameSelect = form.querySelector('[name="game"]');
        const gameSpecificFields = form.querySelector('.game-specific-fields');
        
        if (gameSelect && gameSpecificFields) {
            gameSelect.addEventListener('change', (e) => {
                this.updateGameSpecificFields(e.target.value, gameSpecificFields);
            });
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
    }

    updateGameSpecificFields(game, container) {
        const templates = {
            'genshin': `
                <div class="form-group">
                    <label for="ar_level">AR Level</label>
                    <input type="number" name="ar_level" min="1" max="60" required>
                </div>
                <div class="form-group">
                    <label for="five_star_chars">Personagens 5★</label>
                    <input type="number" name="five_star_chars" min="0" required>
                </div>
                <div class="form-group">
                    <label for="five_star_weapons">Armas 5★</label>
                    <input type="number" name="five_star_weapons" min="0">
                </div>
                <div class="form-group">
                    <label for="primogems">Primogems</label>
                    <input type="number" name="primogems" min="0">
                </div>
                <div class="form-group">
                    <label for="server">Servidor</label>
                    <select name="server" required>
                        <option value="America">America</option>
                        <option value="Europe">Europe</option>
                        <option value="Asia">Asia</option>
                    </select>
                </div>
            `,
            'lol': `
                <div class="form-group">
                    <label for="rank">Rank</label>
                    <select name="rank" required>
                        <option value="Iron">Iron</option>
                        <option value="Bronze">Bronze</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Diamond">Diamond</option>
                        <option value="Master">Master</option>
                        <option value="Grandmaster">Grandmaster</option>
                        <option value="Challenger">Challenger</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="level">Level</label>
                    <input type="number" name="level" min="1" required>
                </div>
                <div class="form-group">
                    <label for="champions">Champions</label>
                    <input type="number" name="champions" min="0" required>
                </div>
                <div class="form-group">
                    <label for="skins">Skins</label>
                    <input type="number" name="skins" min="0" required>
                </div>
                <div class="form-group">
                    <label for="rp">RP</label>
                    <input type="number" name="rp" min="0">
                </div>
            `
            // Adicione templates para outros jogos...
        };

        container.innerHTML = templates[game] || '';
    }

    previewImages(files) {
        const previewContainer = document.getElementById('imagePreview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            if (!file.type.startsWith('image/')) return;
            
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
        const files = Array.from(input.files);
        files.splice(index, 1);
        
        // Atualiza input (requer recriação)
        const newFileList = new DataTransfer();
        files.forEach(file => newFileList.items.add(file));
        input.files = newFileList.files;
        
        // Atualiza preview
        this.previewImages(input.files);
    }

    async handleSellForm(form) {
        const formData = new FormData(form);
        const accountData = {
            game: formData.get('game'),
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            seller: this.currentUser.username,
            seller_id: this.currentUser.id,
            features: {}
        };

        // Coleta campos específicos do jogo
        formData.forEach((value, key) => {
            if (key.startsWith('ar_level') || key.startsWith('rank') || 
                key.startsWith('five_star') || key.startsWith('level') ||
                key.startsWith('skins') || key.startsWith('champions') ||
                key.startsWith('primogems') || key.startsWith('rp') ||
                key.startsWith('server') || key.startsWith('agents') ||
                key.startsWith('diamonds') || key.startsWith('v_bucks') ||
                key.startsWith('gold') || key.startsWith('characters')) {
                
                if (!isNaN(value) && value !== '') {
                    accountData.features[key] = parseFloat(value);
                } else {
                    accountData.features[key] = value;
                }
            }
        });

        try {
            // Processa imagens (simulação)
            const imagesInput = form.querySelector('[name="screenshots"]');
            if (imagesInput.files.length > 0) {
                accountData.images = [];
                for (let i = 0; i < Math.min(imagesInput.files.length, 5); i++) {
                    accountData.images.push(`user_upload_${Date.now()}_${i}.jpg`);
                }
            }

            const account = await window.db.addAccount(accountData);
            this.showSuccess('Conta publicada com sucesso!');
            form.reset();
            
            // Redireciona para detalhes da conta
            setTimeout(() => {
                window.location.href = `account-detail.html?id=${account.id}`;
            }, 1500);
        } catch (error) {
            console.error('Erro ao publicar conta:', error);
            this.showError('Erro ao publicar conta. Verifique os dados.');
        }
    }

    async loadInitialData() {
        // Carrega contas em destaque na home
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname === '/') {
            await this.loadFeaturedAccounts();
        }

        // Carrega lista de contas na página de listagens
        if (window.location.pathname.includes('listings.html')) {
            await this.loadAllAccounts();
        }

        // Carrega detalhes da conta
        if (window.location.pathname.includes('account-detail.html')) {
            await this.loadAccountDetails();
        }

        // Carrega dashboard do usuário
        if (window.location.pathname.includes('dashboard.html')) {
            await this.loadUserDashboard();
        }
    }

    async loadFeaturedAccounts() {
        try {
            // Tenta carregar do LocalStorage primeiro (contas recentes)
            let featuredAccounts = JSON.parse(localStorage.getItem('featured_accounts') || '[]');
            
            // Se não houver contas recentes, carrega do banco
            if (featuredAccounts.length === 0) {
                const accounts = await window.db.getAllAccounts({
                    status: 'available',
                    sort: 'popular'
                });
                
                featuredAccounts = accounts.slice(0, 6);
            }
            
            // Renderiza na home
            const featuredGrid = document.getElementById('featuredAccounts');
            if (featuredGrid) {
                if (featuredAccounts.length === 0) {
                    featuredGrid.innerHTML = `
                        <div class="no-content">
                            <i class="fas fa-store"></i>
                            <p>Nenhuma conta em destaque no momento</p>
                            <a href="listings.html" class="btn btn-primary">Ver Todas as Contas</a>
                        </div>
                    `;
                } else {
                    featuredGrid.innerHTML = featuredAccounts
                        .map(account => this.createAccountCard(account))
                        .join('');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contas em destaque:', error);
            this.showError('Erro ao carregar contas em destaque');
        }
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
            }
            if (urlParams.get('min_price')) {
                filters.min_price = parseFloat(urlParams.get('min_price'));
            }
            if (urlParams.get('max_price')) {
                filters.max_price = parseFloat(urlParams.get('max_price'));
            }

            const accounts = await window.db.getAllAccounts(filters);
            this.displayFilteredAccounts(accounts);
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
        }
    }

    async loadAccountDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const accountId = urlParams.get('id');

        if (!accountId) return;

        try {
            const account = await window.db.getAccount(accountId);
            if (account) {
                this.displayAccountDetails(account);
                
                // Carrega reviews
                const reviews = await window.db.getAccountReviews(accountId);
                this.displayReviews(reviews);
                
                // Verifica se está favoritado
                if (this.currentUser) {
                    const isFav = await window.db.isFavorite(this.currentUser.id, accountId);
                    this.updateFavoriteButton(accountId, isFav);
                }
            } else {
                this.showError('Conta não encontrada');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            this.showError('Erro ao carregar conta');
        }
    }

    displayAccountDetails(account) {
        const container = document.querySelector('.account-detail-container');
        if (!container) return;

        container.innerHTML = `
            <div class="account-detail-header">
                <div class="account-detail-title">
                    <h1>${account.title}</h1>
                    <div class="account-meta">
                        <span class="game-badge">${this.getGameName(account.game)}</span>
                        <span class="price">R$ ${account.price.toFixed(2)}</span>
                        ${account.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificada</span>' : ''}
                    </div>
                </div>
                
                <div class="account-actions">
                    <button class="btn-favorite-detail" data-id="${account.id}">
                        <i class="far fa-heart"></i> Favoritar
                    </button>
                    <button class="btn-add-to-cart-detail" data-account-id="${account.id}">
                        <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                    </button>
                    <button class="btn-buy-now" data-account-id="${account.id}">
                        <i class="fas fa-bolt"></i> Comprar Agora
                    </button>
                </div>
            </div>
            
            <div class="account-detail-content">
                <div class="account-gallery">
                    <div class="main-image">
                        <img src="images/${account.images?.[0] || 'default-account.jpg'}" alt="${account.title}">
                    </div>
                    <div class="thumbnail-grid">
                        ${this.renderImageThumbnails(account.images)}
                    </div>
                </div>
                
                <div class="account-info-detail">
                    <div class="seller-info-detail">
                        <div class="seller-header">
                            <div class="seller-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="seller-details">
                                <h3>${account.seller}</h3>
                                <div class="seller-rating">
                                    <span class="stars">${this.renderStars(account.seller_rating || 5)}</span>
                                    <span class="sales">${account.seller_sales || 0} vendas</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn-contact-seller" data-seller="${account.seller_id}">
                            <i class="fas fa-comment"></i> Contatar Vendedor
                        </button>
                    </div>
                    
                    <div class="account-description">
                        <h3>Descrição</h3>
                        <p>${account.description}</p>
                    </div>
                    
                    <div class="account-features-detail">
                        <h3>Características</h3>
                        <div class="features-grid">
                            ${this.renderDetailedFeatures(account)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderImageThumbnails(images = []) {
        if (images.length === 0) {
            return '<div class="no-images">Sem imagens disponíveis</div>';
        }

        return images.map((img, index) => `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="images/${img}" alt="Imagem ${index + 1}">
            </div>
        `).join('');
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

    renderDetailedFeatures(account) {
        if (!account.features) return '<p>Nenhuma característica especificada</p>';
        
        const features = [];
        
        for (const [key, value] of Object.entries(account.features)) {
            let label = key;
            let displayValue = value;
            
            // Traduz labels para português
            switch (key) {
                case 'ar_level':
                    label = 'AR Level';
                    break;
                case 'five_star_chars':
                    label = 'Personagens 5★';
                    break;
                case 'five_star_weapons':
                    label = 'Armas 5★';
                    break;
                case 'primogems':
                    label = 'Primogems';
                    break;
                case 'rank':
                    label = 'Rank';
                    break;
                case 'level':
                    label = 'Level';
                    break;
                case 'champions':
                    label = 'Champions';
                    break;
                case 'skins':
                    label = 'Skins';
                    break;
                case 'rp':
                    label = 'RP';
                    break;
                case 'agents':
                    label = 'Agents';
                    break;
                case 'diamonds':
                    label = 'Diamonds';
                    break;
                case 'v_bucks':
                    label = 'V-Bucks';
                    break;
                case 'gold':
                    label = 'Gold';
                    break;
                case 'server':
                    label = 'Servidor';
                    break;
            }
            
            features.push(`
                <div class="feature-item">
                    <span class="feature-label">${label}:</span>
                    <span class="feature-value">${displayValue}</span>
                </div>
            `);
        }
        
        return features.join('');
    }

    displayReviews(reviews) {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="no-reviews">
                    <i class="fas fa-comment"></i>
                    <p>Esta conta ainda não tem avaliações</p>
                </div>
            `;
            return;
        }

        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

        container.innerHTML = `
            <div class="reviews-summary">
                <div class="average-rating">
                    <span class="rating-number">${averageRating.toFixed(1)}</span>
                    <div class="rating-stars">${this.renderStars(averageRating)}</div>
                    <span class="review-count">${reviews.length} avaliações</span>
                </div>
            </div>
            
            <div class="reviews-list">
                ${reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <div class="reviewer">
                                <div class="reviewer-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="reviewer-info">
                                    <h4>${review.reviewer_name || 'Anônimo'}</h4>
                                    <div class="review-meta">
                                        <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                                        <span class="review-rating">${this.renderStars(review.rating)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="review-content">
                            <p>${review.comment}</p>
                        </div>
                        
                        <div class="review-helpful">
                            <button class="btn-helpful" data-review-id="${review.id}">
                                <i class="fas fa-thumbs-up"></i> Útil (${review.helpful || 0})
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateFavoriteButton(accountId, isFavorite) {
        const buttons = document.querySelectorAll(`.btn-favorite[data-id="${accountId}"], .btn-favorite-detail[data-id="${accountId}"]`);
        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
            }
            if (btn.classList.contains('btn-favorite-detail')) {
                btn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i> ${isFavorite ? 'Favoritado' : 'Favoritar'}`;
            }
        });
    }

    async loadUserDashboard() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        try {
            // Carrega dados do usuário
            const user = await window.db.getUser(this.currentUser.id);
            this.displayUserDashboard(user);

            // Carrega contas do usuário (se vendedor)
            if (user.type === 'seller' || user.type === 'admin') {
                const userAccounts = await this.getUserAccounts(user.id);
                this.displayUserAccounts(userAccounts);
            }

            // Carrega favoritos
            const favorites = await window.db.getUserFavorites(user.id);
            this.displayUserFavorites(favorites);

            // Carrega histórico de compras
            const purchases = await this.getUserPurchases(user.id);
            this.displayUserPurchases(purchases);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
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
                        <h1>${user.username}</h1>
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
                                R$ ${user.balance?.toFixed(2) || '0,00'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="user-actions">
                    <button class="btn-edit-profile">
                        <i class="fas fa-edit"></i> Editar Perfil
                    </button>
                    <button class="btn-add-account" onclick="window.location.href='sell.html'">
                        <i class="fas fa-plus"></i> Vender Conta
                    </button>
                </div>
            </div>
            
            <div class="dashboard-tabs">
                <button class="tab-btn active" data-tab="my-accounts">Minhas Contas</button>
                <button class="tab-btn" data-tab="favorites">Favoritos</button>
                <button class="tab-btn" data-tab="purchases">Compras</button>
                <button class="tab-btn" data-tab="sales">Vendas</button>
                <button class="tab-btn" data-tab="messages">Mensagens</button>
            </div>
            
            <div class="tab-content">
                <div id="my-accounts" class="tab-pane active">
                    <div class="tab-pane-header">
                        <h2>Minhas Contas à Venda</h2>
                    </div>
                    <div class="accounts-grid" id="userAccountsGrid">
                        <!-- Contas serão carregadas aqui -->
                    </div>
                </div>
                
                <div id="favorites" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2>Contas Favoritadas</h2>
                    </div>
                    <div class="accounts-grid" id="userFavoritesGrid">
                        <!-- Favoritos serão carregados aqui -->
                    </div>
                </div>
                
                <div id="purchases" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2>Histórico de Compras</h2>
                    </div>
                    <div class="purchases-list" id="purchasesList">
                        <!-- Compras serão carregadas aqui -->
                    </div>
                </div>
                
                <div id="sales" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2>Histórico de Vendas</h2>
                    </div>
                    <div class="sales-list" id="salesList">
                        <!-- Vendas serão carregadas aqui -->
                    </div>
                </div>
                
                <div id="messages" class="tab-pane">
                    <div class="tab-pane-header">
                        <h2>Mensagens</h2>
                    </div>
                    <div class="messages-container">
                        <!-- Sistema de mensagens -->
                    </div>
                </div>
            </div>
        `;

        // Configura tabs
        this.initDashboardTabs();
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
                document.getElementById(tabId)?.classList.add('active');
            });
        });
    }

    async getUserAccounts(userId) {
        if (window.db.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            return accounts.filter(acc => acc.seller_id === userId || acc.seller === userId);
        }

        return new Promise((resolve, reject) => {
            const transaction = window.db.db.transaction(['accounts'], 'readonly');
            const store = transaction.objectStore('accounts');
            const index = store.index('seller');
            const request = index.getAll(userId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserPurchases(userId) {
        if (window.db.useLocalStorage) {
            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            return transactions.filter(t => t.buyer_id === userId);
        }

        return new Promise((resolve, reject) => {
            const transaction = window.db.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const index = store.index('buyer_id');
            const request = index.getAll(userId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    displayUserAccounts(accounts) {
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
            return;
        }

        container.innerHTML = accounts.map(account => this.createAccountCard(account)).join('');
    }

    displayUserFavorites(accounts) {
        const container = document.getElementById('userFavoritesGrid');
        if (!container) return;

        if (accounts.length === 0) {
            container.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-heart"></i>
                    <p>Você ainda não favoritou nenhuma conta</p>
                    <a href="listings.html" class="btn btn-primary">Explorar Contas</a>
                </div>
            `;
            return;
        }

        container.innerHTML = accounts.map(account => this.createAccountCard(account)).join('');
    }

    displayUserPurchases(purchases) {
        const container = document.getElementById('purchasesList');
        if (!container) return;

        if (purchases.length === 0) {
            container.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Você ainda não fez nenhuma compra</p>
                    <a href="listings.html" class="btn btn-primary">Começar a Comprar</a>
                </div>
            `;
            return;
        }

        // Implementar lista de compras
        container.innerHTML = `
            <div class="purchases-grid">
                ${purchases.map(purchase => `
                    <div class="purchase-item">
                        <div class="purchase-header">
                            <span class="purchase-id">#${purchase.id}</span>
                            <span class="purchase-date">${new Date(purchase.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="purchase-status status-${purchase.status}">
                            ${purchase.status === 'completed' ? 'Concluído' : 
                              purchase.status === 'pending' ? 'Pendente' : 
                              'Cancelado'}
                        </div>
                        <div class="purchase-amount">R$ ${purchase.amount?.toFixed(2) || '0,00'}</div>
                    </div>
                `).join('')}
            </div>
        `;
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
            'minecraft': 'Minecraft'
        };
        
        return games[gameCode] || gameCode;
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

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserId');
        this.updateUIForUser();
        this.showSuccess('Logout realizado com sucesso!');
        window.location.href = 'index.html';
    }
}

// Inicializa o aplicativo
const app = new GameAccountsApp();

// Exporta para uso global
window.app = app;