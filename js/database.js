// Sistema de Banco de Dados Local para GameAccounts

class GameAccountsDB {
    constructor() {
        this.dbName = 'GameAccountsDB';
        this.version = 1;
        this.db = null;
        this.initDB();
    }

    initDB() {
        // Tenta usar IndexedDB, fallback para LocalStorage
        if ('indexedDB' in window) {
            this.initIndexedDB();
        } else {
            console.warn('IndexedDB não suportado, usando LocalStorage');
            this.useLocalStorage = true;
            this.initLocalStorage();
        }
    }

    initIndexedDB() {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = (event) => {
            console.error('Erro ao abrir IndexedDB:', event.target.error);
            this.useLocalStorage = true;
            this.initLocalStorage();
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('IndexedDB inicializado com sucesso');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Cria store para contas
            if (!db.objectStoreNames.contains('accounts')) {
                const accountsStore = db.createObjectStore('accounts', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                accountsStore.createIndex('game', 'game', { unique: false });
                accountsStore.createIndex('price', 'price', { unique: false });
                accountsStore.createIndex('seller', 'seller', { unique: false });
                accountsStore.createIndex('created_at', 'created_at', { unique: false });
            }

            // Cria store para usuários
            if (!db.objectStoreNames.contains('users')) {
                const usersStore = db.createObjectStore('users', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                usersStore.createIndex('email', 'email', { unique: true });
                usersStore.createIndex('username', 'username', { unique: true });
            }

            // Cria store para transações
            if (!db.objectStoreNames.contains('transactions')) {
                const transactionsStore = db.createObjectStore('transactions', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                transactionsStore.createIndex('account_id', 'account_id', { unique: false });
                transactionsStore.createIndex('buyer_id', 'buyer_id', { unique: false });
                transactionsStore.createIndex('seller_id', 'seller_id', { unique: false });
            }

            // Cria store para reviews
            if (!db.objectStoreNames.contains('reviews')) {
                const reviewsStore = db.createObjectStore('reviews', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                reviewsStore.createIndex('account_id', 'account_id', { unique: false });
                reviewsStore.createIndex('user_id', 'user_id', { unique: false });
                reviewsStore.createIndex('seller_id', 'seller_id', { unique: false });
            }

            // Cria store para favoritos
            if (!db.objectStoreNames.contains('favorites')) {
                const favoritesStore = db.createObjectStore('favorites', {
                    keyPath: ['user_id', 'account_id']
                });
            }

            // Cria store para mensagens
            if (!db.objectStoreNames.contains('messages')) {
                const messagesStore = db.createObjectStore('messages', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                messagesStore.createIndex('conversation_id', 'conversation_id', { unique: false });
            }
        };
    }

    initLocalStorage() {
        // Inicializa estruturas no localStorage se não existirem
        const defaultData = {
            accounts: [],
            users: [],
            transactions: [],
            reviews: [],
            favorites: [],
            messages: []
        };

        Object.keys(defaultData).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(defaultData[key]));
            }
        });
    }

    // Métodos para Contas
    async addAccount(accountData) {
        const account = {
            ...accountData,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'available',
            views: 0,
            favorites_count: 0,
            verified: false
        };

        // Validação dos dados
        if (!this.validateAccountData(account)) {
            throw new Error('Dados da conta inválidos');
        }

        if (this.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            accounts.push(account);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return account;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readwrite');
            const store = transaction.objectStore('accounts');
            const request = store.add(account);

            request.onsuccess = () => resolve(account);
            request.onerror = () => reject(request.error);
        });
    }

    async getAccount(id) {
        if (this.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const account = accounts.find(acc => acc.id === id);
            
            if (account) {
                // Incrementar visualizações
                account.views = (account.views || 0) + 1;
                localStorage.setItem('accounts', JSON.stringify(accounts));
            }
            
            return account;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readonly');
            const store = transaction.objectStore('accounts');
            const request = store.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    // Incrementar visualizações no IndexedDB
                    this.updateAccountViews(id);
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateAccountViews(id) {
        if (this.useLocalStorage) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readwrite');
            const store = transaction.objectStore('accounts');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const account = getRequest.result;
                if (account) {
                    account.views = (account.views || 0) + 1;
                    account.updated_at = new Date().toISOString();
                    
                    const putRequest = store.put(account);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getAllAccounts(filters = {}) {
        if (this.useLocalStorage) {
            let accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            return this.filterAccounts(accounts, filters);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readonly');
            const store = transaction.objectStore('accounts');
            const request = store.getAll();

            request.onsuccess = () => {
                let accounts = request.result;
                accounts = this.filterAccounts(accounts, filters);
                resolve(accounts);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAccountsByGame(game, limit = 20) {
        if (this.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            return accounts
                .filter(acc => acc.game === game && acc.status === 'available')
                .slice(0, limit);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readonly');
            const store = transaction.objectStore('accounts');
            const index = store.index('game');
            const request = index.getAll(game);

            request.onsuccess = () => {
                const accounts = request.result
                    .filter(acc => acc.status === 'available')
                    .slice(0, limit);
                resolve(accounts);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateAccount(id, updates) {
        if (this.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const index = accounts.findIndex(acc => acc.id === id);
            
            if (index !== -1) {
                accounts[index] = {
                    ...accounts[index],
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                localStorage.setItem('accounts', JSON.stringify(accounts));
                return accounts[index];
            }
            return null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readwrite');
            const store = transaction.objectStore('accounts');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const account = getRequest.result;
                if (account) {
                    Object.assign(account, updates);
                    account.updated_at = new Date().toISOString();
                    
                    const putRequest = store.put(account);
                    putRequest.onsuccess = () => resolve(account);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(null);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteAccount(id) {
        if (this.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const filtered = accounts.filter(acc => acc.id !== id);
            localStorage.setItem('accounts', JSON.stringify(filtered));
            return true;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readwrite');
            const store = transaction.objectStore('accounts');
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para Usuários
    async registerUser(userData) {
        const user = {
            ...userData,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            type: 'buyer', // buyer, seller, admin
            verified: false,
            rating: 5.0,
            sales_count: 0,
            purchases_count: 0,
            balance: 0
        };

        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // Verifica se email ou username já existem
            if (users.some(u => u.email === user.email)) {
                throw new Error('Email já cadastrado');
            }
            if (users.some(u => u.username === user.username)) {
                throw new Error('Nome de usuário já existe');
            }
            
            users.push(user);
            localStorage.setItem('users', JSON.stringify(users));
            return user;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            // Verifica unicidade do email e username
            const emailIndex = store.index('email');
            const usernameIndex = store.index('username');
            
            const emailCheck = emailIndex.get(user.email);
            const usernameCheck = usernameIndex.get(user.username);

            emailCheck.onsuccess = () => {
                if (emailCheck.result) {
                    reject(new Error('Email já cadastrado'));
                    return;
                }
                
                usernameCheck.onsuccess = () => {
                    if (usernameCheck.result) {
                        reject(new Error('Nome de usuário já existe'));
                        return;
                    }
                    
                    const request = store.add(user);
                    request.onsuccess = () => resolve(user);
                    request.onerror = () => reject(request.error);
                };
                
                usernameCheck.onerror = () => reject(usernameCheck.error);
            };
            
            emailCheck.onerror = () => reject(emailCheck.error);
        });
    }

    async loginUser(email, password) {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                // Remove password da resposta
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }
            return null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('email');
            const request = index.get(email);

            request.onsuccess = () => {
                const user = request.result;
                if (user && user.password === password) {
                    // Remove password da resposta
                    const { password, ...userWithoutPassword } = user;
                    resolve(userWithoutPassword);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getUser(id) {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return users.find(u => u.id === id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para Transações
    async createTransaction(transactionData) {
        const transaction = {
            ...transactionData,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            status: 'pending', // pending, completed, cancelled
            payment_method: transactionData.payment_method || 'pix'
        };

        if (this.useLocalStorage) {
            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            transactions.push(transaction);
            localStorage.setItem('transactions', JSON.stringify(transactions));
            return transaction;
        }

        return new Promise((resolve, reject) => {
            const dbTransaction = this.db.transaction(['transactions'], 'readwrite');
            const store = dbTransaction.objectStore('transactions');
            const request = store.add(transaction);

            request.onsuccess = () => resolve(transaction);
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para Favoritos
    async addFavorite(userId, accountId) {
        const favorite = {
            user_id: userId,
            account_id: accountId,
            created_at: new Date().toISOString()
        };

        if (this.useLocalStorage) {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            
            // Verifica se já está favoritado
            if (favorites.some(f => f.user_id === userId && f.account_id === accountId)) {
                return favorite;
            }
            
            favorites.push(favorite);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            
            // Atualiza contador de favoritos na conta
            await this.updateFavoriteCount(accountId, 1);
            
            return favorite;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites', 'accounts'], 'readwrite');
            const favoritesStore = transaction.objectStore('favorites');
            const accountsStore = transaction.objectStore('accounts');
            
            // Adiciona favorito
            const addRequest = favoritesStore.add(favorite);
            
            // Atualiza contador na conta
            const getAccountRequest = accountsStore.get(accountId);
            
            getAccountRequest.onsuccess = () => {
                const account = getAccountRequest.result;
                if (account) {
                    account.favorites_count = (account.favorites_count || 0) + 1;
                    accountsStore.put(account);
                }
            };
            
            transaction.oncomplete = () => resolve(favorite);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async removeFavorite(userId, accountId) {
        if (this.useLocalStorage) {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const filtered = favorites.filter(f => 
                !(f.user_id === userId && f.account_id === accountId)
            );
            localStorage.setItem('favorites', JSON.stringify(filtered));
            
            // Atualiza contador de favoritos na conta
            await this.updateFavoriteCount(accountId, -1);
            
            return true;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites', 'accounts'], 'readwrite');
            const favoritesStore = transaction.objectStore('favorites');
            const accountsStore = transaction.objectStore('accounts');
            
            // Remove favorito
            const deleteRequest = favoritesStore.delete([userId, accountId]);
            
            // Atualiza contador na conta
            const getAccountRequest = accountsStore.get(accountId);
            
            getAccountRequest.onsuccess = () => {
                const account = getAccountRequest.result;
                if (account) {
                    account.favorites_count = Math.max(0, (account.favorites_count || 0) - 1);
                    accountsStore.put(account);
                }
            };
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getUserFavorites(userId) {
        if (this.useLocalStorage) {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const userFavorites = favorites.filter(f => f.user_id === userId);
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            
            return userFavorites.map(fav => 
                accounts.find(acc => acc.id === fav.account_id)
            ).filter(Boolean);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites', 'accounts'], 'readonly');
            const favoritesStore = transaction.objectStore('favorites');
            const accountsStore = transaction.objectStore('accounts');
            
            const userFavorites = [];
            const cursorRequest = favoritesStore.openCursor();
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.user_id === userId) {
                        const getRequest = accountsStore.get(cursor.value.account_id);
                        getRequest.onsuccess = () => {
                            const account = getRequest.result;
                            if (account) {
                                userFavorites.push(account);
                            }
                            cursor.continue();
                        };
                    } else {
                        cursor.continue();
                    }
                } else {
                    resolve(userFavorites);
                }
            };
            
            cursorRequest.onerror = () => reject(cursorRequest.error);
        });
    }

    async isFavorite(userId, accountId) {
        if (this.useLocalStorage) {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            return favorites.some(f => f.user_id === userId && f.account_id === accountId);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites'], 'readonly');
            const store = transaction.objectStore('favorites');
            const request = store.get([userId, accountId]);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para Reviews
    async addReview(reviewData) {
        const review = {
            ...reviewData,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            helpful: 0,
            reported: false
        };

        if (this.useLocalStorage) {
            const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
            reviews.push(review);
            localStorage.setItem('reviews', JSON.stringify(reviews));
            return review;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reviews'], 'readwrite');
            const store = transaction.objectStore('reviews');
            const request = store.add(review);

            request.onsuccess = () => resolve(review);
            request.onerror = () => reject(request.error);
        });
    }

    async getAccountReviews(accountId) {
        if (this.useLocalStorage) {
            const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
            return reviews.filter(r => r.account_id === accountId);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reviews'], 'readonly');
            const store = transaction.objectStore('reviews');
            const index = store.index('account_id');
            const request = index.getAll(accountId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para Mensagens
    async sendMessage(messageData) {
        const message = {
            ...messageData,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            read: false
        };

        if (this.useLocalStorage) {
            const messages = JSON.parse(localStorage.getItem('messages') || '[]');
            messages.push(message);
            localStorage.setItem('messages', JSON.stringify(messages));
            return message;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.add(message);

            request.onsuccess = () => resolve(message);
            request.onerror = () => reject(request.error);
        });
    }

    async getConversation(userId1, userId2) {
        const conversationId = [userId1, userId2].sort().join('_');

        if (this.useLocalStorage) {
            const messages = JSON.parse(localStorage.getItem('messages') || '[]');
            return messages
                .filter(m => m.conversation_id === conversationId)
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversation_id');
            const request = index.getAll(conversationId);

            request.onsuccess = () => {
                const messages = request.result;
                messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                resolve(messages);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos Auxiliares
    filterAccounts(accounts, filters) {
        return accounts.filter(account => {
            // Filtro por status (só mostra disponíveis por padrão)
            if (account.status !== (filters.status || 'available')) {
                return false;
            }

            // Filtro por jogo
            if (filters.game && account.game !== filters.game) {
                return false;
            }

            // Filtro por preço
            if (filters.min_price && account.price < filters.min_price) {
                return false;
            }
            if (filters.max_price && account.price > filters.max_price) {
                return false;
            }

            // Filtro por seller
            if (filters.seller && account.seller !== filters.seller) {
                return false;
            }

            // Filtro por características específicas do jogo
            if (filters.features) {
                for (const [key, value] of Object.entries(filters.features)) {
                    if (account.features && account.features[key] !== value) {
                        return false;
                    }
                }
            }

            // Filtro por texto na busca
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchable = [
                    account.title,
                    account.description,
                    account.game,
                    account.seller
                ].join(' ').toLowerCase();
                
                if (!searchable.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });
    }

    validateAccountData(data) {
        const validations = {
            game: data.game && typeof data.game === 'string',
            title: data.title && data.title.length >= 10 && data.title.length <= 100,
            description: data.description && data.description.length >= 50,
            price: data.price && data.price > 0 && data.price < 10000,
            seller: data.seller && typeof data.seller === 'string'
        };

        return Object.values(validations).every(v => v === true);
    }

    async updateFavoriteCount(accountId, change) {
        const account = await this.getAccount(accountId);
        if (account) {
            account.favorites_count = (account.favorites_count || 0) + change;
            await this.updateAccount(accountId, {
                favorites_count: account.favorites_count
            });
        }
    }

    // Métodos para Estatísticas
    async getStats() {
        if (this.useLocalStorage) {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            
            return {
                total_accounts: accounts.length,
                available_accounts: accounts.filter(a => a.status === 'available').length,
                total_users: users.length,
                total_transactions: transactions.length,
                total_sales: transactions.filter(t => t.status === 'completed').length,
                total_revenue: transactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t) => sum + t.amount, 0)
            };
        }

        return new Promise((resolve, reject) => {
            // Implementação para IndexedDB
            // Similar à versão LocalStorage
            resolve({
                total_accounts: 0,
                available_accounts: 0,
                total_users: 0,
                total_transactions: 0,
                total_sales: 0,
                total_revenue: 0
            });
        });
    }

    // Métodos para Inicialização com Dados de Exemplo
    async initializeSampleData() {
        const sampleAccounts = [
            {
                game: 'genshin',
                title: 'Conta AR 57 End Game - 15x 5★ - Hu Tao + Homa',
                description: 'Conta completa AR 57 com todos os mapas 100%. Personagens 5★: Hu Tao C1 + Homa, Raiden Shogun, Nahida, Yelan, Zhongli, Ganyu, Ayaka, Eula, Diluc C2, Mona C1, Qiqi, Keqing, Jean. 8x Armas 5★. +20.000 Primogems. Todas as missões de arquivo concluídas.',
                price: 450.00,
                seller: 'playerpro_gaming',
                features: {
                    ar_level: 57,
                    five_star_chars: 15,
                    five_star_weapons: 8,
                    primogems: 20000,
                    server: 'America',
                    welkin_active: true,
                    battle_pass: 20
                },
                images: ['genshin1.jpg', 'genshin2.jpg', 'genshin3.jpg']
            },
            {
                game: 'lol',
                title: 'Conta Challenger S13 - 500 Skins - Todos Champions',
                description: 'Conta nível 500+ com rank Challenger na temporada 13. Todos os 162 champions desbloqueados. +500 skins incluindo Ultimate, Legendary e Prestigious. +100.000 Blue Essence e 5.000 RP. MMR alto para ranked.',
                price: 1200.00,
                seller: 'elite_lol',
                features: {
                    level: 500,
                    rank: 'Challenger',
                    champions: 162,
                    skins: 520,
                    blue_essence: 100000,
                    rp: 5000,
                    server: 'BR'
                },
                images: ['lol1.jpg', 'lol2.jpg']
            },
            {
                game: 'valorant',
                title: 'Conta Radiante - Todos Agents - Skins Raras',
                description: 'Conta Radiante no último episódio. Todos os agents desbloqueados. Skins raras: Prime Vandal, Reaver Operator, Glitchpop Phantom, Elderflame Judge. +10.000 VP. Coleção completa de cards e sprays.',
                price: 850.00,
                seller: 'valorant_pro',
                features: {
                    rank: 'Radiante',
                    agents: 22,
                    skins: 45,
                    valorant_points: 10000,
                    server: 'São Paulo'
                },
                images: ['valorant1.jpg']
            },
            {
                game: 'mobile-legends',
                title: 'Conta Mythical Glory - 150 Heroes - 300 Skins',
                description: 'Conta Mythical Glory 800+ pontos. Todos os 150 heroes desbloqueados. +300 skins incluindo Legend, Epic e Special. 50.000 diamonds. Coleção completa de emblems nível 60.',
                price: 350.00,
                seller: 'mlbb_king',
                features: {
                    rank: 'Mythical Glory',
                    heroes: 150,
                    skins: 320,
                    diamonds: 50000,
                    emblems: 'Nível 60'
                },
                images: ['ml1.jpg']
            },
            {
                game: 'diablo',
                title: 'Conta Diablo IV - Level 100 - BiS Gear',
                description: 'Conta com 5 characters level 100 (Barbarian, Sorcerer, Rogue, Druid, Necro). Gear BiS para todos. Uber Lilith derrotada. +500 milhões de gold. Todos os aspectos desbloqueados. Coleção completa de mounts raros.',
                price: 650.00,
                seller: 'diablo_master',
                features: {
                    level: 100,
                    characters: 5,
                    gold: 500000000,
                    uber_lilith: true,
                    mounts: 'Completa'
                },
                images: ['diablo1.jpg']
            },
            {
                game: 'fortnite',
                title: 'Conta Fortnite - 500 Skins - STW Completo',
                description: 'Conta com +500 skins incluindo todas as battle passes desde a season 2. Save The World completo (PL 130). Todos os items do item shop raros. +20.000 V-Bucks. Muitos emotes e gliders exclusivos.',
                price: 1200.00,
                seller: 'fortnite_collector',
                features: {
                    skins: 520,
                    v_bucks: 20000,
                    stw_completed: true,
                    bp_seasons: '2-20',
                    server: 'Global'
                },
                images: ['fortnite1.jpg']
            }
        ];

        const sampleUsers = [
            {
                username: 'admin',
                email: 'admin@gameaccounts.com',
                password: 'admin123',
                type: 'admin',
                verified: true
            },
            {
                username: 'jogador_pro',
                email: 'pro@gamer.com',
                password: '123456',
                type: 'seller',
                verified: true,
                rating: 4.9,
                sales_count: 42
            }
        ];

        try {
            // Adiciona usuários de exemplo
            for (const user of sampleUsers) {
                try {
                    await this.registerUser(user);
                } catch (error) {
                    console.log('Usuário já existe:', user.username);
                }
            }

            // Adiciona contas de exemplo
            for (const account of sampleAccounts) {
                try {
                    await this.addAccount(account);
                } catch (error) {
                    console.log('Erro ao adicionar conta:', error);
                }
            }

            console.log('Dados de exemplo inicializados com sucesso!');
            return true;
        } catch (error) {
            console.error('Erro ao inicializar dados de exemplo:', error);
            return false;
        }
    }

    // Limpar todos os dados (para desenvolvimento)
    async clearAllData() {
        if (this.useLocalStorage) {
            const keys = ['accounts', 'users', 'transactions', 'reviews', 'favorites', 'messages', 'cart'];
            keys.forEach(key => localStorage.removeItem(key));
            console.log('Todos os dados foram limpos do LocalStorage');
        } else {
            // Para IndexedDB, fecha e deleta o banco
            if (this.db) {
                this.db.close();
            }
            
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            deleteRequest.onsuccess = () => {
                console.log('Banco de dados deletado com sucesso');
                this.initDB(); // Reinicializa
            };
            deleteRequest.onerror = () => {
                console.error('Erro ao deletar banco de dados');
            };
        }
    }
}

// Exporta uma instância única do banco de dados
const db = new GameAccountsDB();

// Inicializa com dados de exemplo se estiver vazio
if (localStorage.getItem('accounts') === null || 
    JSON.parse(localStorage.getItem('accounts') || '[]').length === 0) {
    db.initializeSampleData();
}

export default db;