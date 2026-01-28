// Lógica específica para a página de vendas (sell.html)

class SellPage {
    constructor() {
        this.currentUser = null;
        this.formData = {
            game: '',
            title: '',
            description: '',
            price: 0,
            features: {},
            images: [],
            contact: {}
        };
        
        this.uploadedImages = [];
        this.currentSection = 0;
        this.sections = ['section-game', 'section-details', 'section-images', 'section-review'];
        
        this.init();
    }
    
    init() {
        // Carrega usuário atual
        this.loadCurrentUser();
        
        // Inicializa componentes
        this.initForm();
        this.initEventListeners();
        this.initGameSpecificFields();
        this.initImageUpload();
        
        // Verifica se usuário está logado
        this.checkAuthentication();
    }
    
    loadCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateFormWithUserData();
        }
    }
    
    checkAuthentication() {
        if (!this.currentUser) {
            Swal.fire({
                title: 'Atenção!',
                text: 'Você precisa estar logado para vender uma conta.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Fazer Login',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.setItem('returnUrl', 'sell.html');
                    window.location.href = 'login.html';
                } else {
                    window.location.href = 'index.html';
                }
            });
        }
    }
    
    updateFormWithUserData() {
        if (this.currentUser) {
            // Preenche email de contato
            const contactEmail = document.getElementById('contact_email');
            if (contactEmail && !contactEmail.value) {
                contactEmail.value = this.currentUser.email;
            }
        }
    }
    
    initForm() {
        // Inicializa contadores de caracteres
        this.initCharCounters();
        
        // Inicializa sugestões de preço
        this.initPriceSuggestions();
    }
    
    initCharCounters() {
        const titleInput = document.getElementById('title');
        const descriptionInput = document.getElementById('description');
        const titleCounter = document.getElementById('title-counter');
        const descriptionCounter = document.getElementById('description-counter');
        
        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                titleCounter.textContent = titleInput.value.length;
                this.updateFormData('title', titleInput.value);
            });
        }
        
        if (descriptionInput && descriptionCounter) {
            descriptionInput.addEventListener('input', () => {
                descriptionCounter.textContent = descriptionInput.value.length;
                this.updateFormData('description', descriptionInput.value);
            });
        }
    }
    
    initPriceSuggestions() {
        const suggestions = document.querySelectorAll('.price-suggestion');
        const priceInput = document.getElementById('price');
        
        suggestions.forEach(button => {
            button.addEventListener('click', () => {
                const price = button.dataset.price;
                if (priceInput) {
                    priceInput.value = price;
                    this.updateFormData('price', parseFloat(price));
                }
            });
        });
        
        if (priceInput) {
            priceInput.addEventListener('input', () => {
                this.updateFormData('price', parseFloat(priceInput.value) || 0);
            });
        }
    }
    
    initEventListeners() {
        // Navegação entre seções
        this.initSectionNavigation();
        
        // Submit do formulário
        const form = document.getElementById('sell-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
        
        // Observa mudanças no jogo selecionado
        const gameSelect = document.getElementById('game');
        if (gameSelect) {
            gameSelect.addEventListener('change', (e) => {
                this.updateFormData('game', e.target.value);
                this.updateGameSpecificFields(e.target.value);
            });
        }
        
        // Observa outros campos do formulário
        this.initFormFieldsListeners();
    }
    
    initSectionNavigation() {
        // Botões Próximo
        const nextButtons = document.querySelectorAll('.btn-next');
        nextButtons.forEach(button => {
            button.addEventListener('click', () => {
                const nextSection = button.dataset.next;
                if (this.validateCurrentSection()) {
                    this.goToSection(nextSection);
                }
            });
        });
        
        // Botões Anterior
        const prevButtons = document.querySelectorAll('.btn-prev');
        prevButtons.forEach(button => {
            button.addEventListener('click', () => {
                const prevSection = button.dataset.prev;
                this.goToSection(prevSection);
            });
        });
    }
    
    validateCurrentSection() {
        const currentSection = this.sections[this.currentSection];
        const sectionElement = document.getElementById(currentSection);
        
        // Valida campos obrigatórios
        const requiredFields = sectionElement.querySelectorAll('[required]');
        let isValid = true;
        
        for (const field of requiredFields) {
            if (!field.value.trim()) {
                this.showFieldError(field, 'Este campo é obrigatório');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
            
            // Validações específicas
            if (field.name === 'price') {
                const price = parseFloat(field.value);
                if (price < 5 || price > 10000) {
                    this.showFieldError(field, 'O preço deve estar entre R$ 5,00 e R$ 10.000,00');
                    isValid = false;
                }
            }
            
            if (field.name === 'title' && field.value.length < 10) {
                this.showFieldError(field, 'O título deve ter no mínimo 10 caracteres');
                isValid = false;
            }
            
            if (field.name === 'description' && field.value.length < 50) {
                this.showFieldError(field, 'A descrição deve ter no mínimo 50 caracteres');
                isValid = false;
            }
        }
        
        if (!isValid) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos inválidos',
                text: 'Por favor, preencha todos os campos obrigatórios corretamente.',
                confirmButtonText: 'Entendi'
            });
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove mensagem de erro anterior
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Adiciona nova mensagem de erro
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        field.parentNode.appendChild(errorElement);
    }
    
    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    goToSection(sectionId) {
        // Atualiza seção atual
        const currentIndex = this.sections.indexOf(sectionId);
        if (currentIndex !== -1) {
            this.currentSection = currentIndex;
        }
        
        // Atualiza steps
        this.updateSteps(currentIndex);
        
        // Esconde todas as seções
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostra a seção alvo
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Atualiza revisão se for a seção de revisão
            if (sectionId === 'section-review') {
                this.updateReviewSection();
            }
            
            // Scroll para o topo da seção
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    updateSteps(activeIndex) {
        const steps = document.querySelectorAll('.sell-step');
        steps.forEach((step, index) => {
            if (index <= activeIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
    
    initFormFieldsListeners() {
        // Observa campos dinâmicos
        const form = document.getElementById('sell-form');
        if (form) {
            form.addEventListener('input', (e) => {
                const field = e.target;
                const fieldName = field.name;
                let value = field.value;
                
                // Converte números
                if (field.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                
                // Atualiza formData
                if (fieldName.startsWith('feature_')) {
                    const featureName = fieldName.replace('feature_', '');
                    this.formData.features[featureName] = value;
                } else if (fieldName.startsWith('contact_')) {
                    const contactField = fieldName.replace('contact_', '');
                    this.formData.contact[contactField] = value;
                } else {
                    this.updateFormData(fieldName, value);
                }
            });
        }
    }
    
    updateFormData(field, value) {
        this.formData[field] = value;
    }
    
    initGameSpecificFields() {
        const gameSelect = document.getElementById('game');
        if (gameSelect) {
            this.updateGameSpecificFields(gameSelect.value);
        }
    }
    
    updateGameSpecificFields(game) {
        const container = document.getElementById('game-specific-fields');
        if (!container) return;
        
        const templates = this.getGameTemplates(game);
        container.innerHTML = templates;
        
        // Adiciona event listeners aos novos campos
        this.initGameFieldsListeners();
    }
    
    getGameTemplates(game) {
        const templates = {
            'genshin': `
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_ar_level">
                            <i class="fas fa-level-up-alt"></i> AR Level *
                        </label>
                        <input type="number" 
                               id="feature_ar_level" 
                               name="feature_ar_level" 
                               min="1" 
                               max="60" 
                               required>
                        <div class="form-hint">Nível de Aventura (1-60)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_five_star_chars">
                            <i class="fas fa-star"></i> Personagens 5★ *
                        </label>
                        <input type="number" 
                               id="feature_five_star_chars" 
                               name="feature_five_star_chars" 
                               min="0" 
                               required>
                        <div class="form-hint">Quantidade de personagens 5 estrelas</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_five_star_weapons">
                            <i class="fas fa-gem"></i> Armas 5★
                        </label>
                        <input type="number" 
                               id="feature_five_star_weapons" 
                               name="feature_five_star_weapons" 
                               min="0">
                        <div class="form-hint">Quantidade de armas 5 estrelas</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_primogems">
                            <i class="fas fa-coins"></i> Primogems
                        </label>
                        <input type="number" 
                               id="feature_primogems" 
                               name="feature_primogems" 
                               min="0">
                        <div class="form-hint">Quantidade de Primogems disponíveis</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="feature_characters">
                        <i class="fas fa-users"></i> Personagens 4★
                    </label>
                    <input type="number" 
                           id="feature_characters" 
                           name="feature_characters" 
                           min="0">
                    <div class="form-hint">Quantidade de personagens 4 estrelas (opcional)</div>
                </div>
                
                <div class="form-group">
                    <label for="feature_spiral_abyss">
                        <i class="fas fa-trophy"></i> Abismo Espiral
                    </label>
                    <select id="feature_spiral_abyss" name="feature_spiral_abyss">
                        <option value="">Nível concluído</option>
                        <option value="8">8-3 Concluído</option>
                        <option value="9">9-3 Concluído</option>
                        <option value="10">10-3 Concluído</option>
                        <option value="11">11-3 Concluído</option>
                        <option value="12">12-3 Concluído</option>
                    </select>
                </div>
            `,
            
            'lol': `
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_rank">
                            <i class="fas fa-trophy"></i> Rank Atual *
                        </label>
                        <select id="feature_rank" name="feature_rank" required>
                            <option value="">Selecione o rank</option>
                            <option value="iron">Iron</option>
                            <option value="bronze">Bronze</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                            <option value="platinum">Platinum</option>
                            <option value="emerald">Emerald</option>
                            <option value="diamond">Diamond</option>
                            <option value="master">Master</option>
                            <option value="grandmaster">Grandmaster</option>
                            <option value="challenger">Challenger</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_level">
                            <i class="fas fa-level-up-alt"></i> Level *
                        </label>
                        <input type="number" 
                               id="feature_level" 
                               name="feature_level" 
                               min="1" 
                               max="2000" 
                               required>
                        <div class="form-hint">Level da conta (1-2000)</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_champions">
                            <i class="fas fa-user-ninja"></i> Champions *
                        </label>
                        <input type="number" 
                               id="feature_champions" 
                               name="feature_champions" 
                               min="0" 
                               max="166" 
                               required>
                        <div class="form-hint">Quantidade de champions desbloqueados (0-166)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_skins">
                            <i class="fas fa-tshirt"></i> Skins *
                        </label>
                        <input type="number" 
                               id="feature_skins" 
                               name="feature_skins" 
                               min="0" 
                               required>
                        <div class="form-hint">Quantidade total de skins</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_rp">
                            <i class="fas fa-coins"></i> RP Disponível
                        </label>
                        <input type="number" 
                               id="feature_rp" 
                               name="feature_rp" 
                               min="0">
                        <div class="form-hint">Quantidade de Riot Points</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_blue_essence">
                            <i class="fas fa-gem"></i> Blue Essence
                        </label>
                        <input type="number" 
                               id="feature_blue_essence" 
                               name="feature_blue_essence" 
                               min="0">
                        <div class="form-hint">Quantidade de Blue Essence</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="feature_rare_skins">
                        <i class="fas fa-crown"></i> Skins Raras
                    </label>
                    <textarea id="feature_rare_skins" 
                              name="feature_rare_skins" 
                              placeholder="Liste skins raras, prestígio, ultimate, etc..."
                              rows="3"></textarea>
                    <div class="form-hint">Separe por vírgulas (ex: Elementalista Lux, DJ Sona, Prestígio K/DA)</div>
                </div>
            `,
            
            'valorant': `
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_rank">
                            <i class="fas fa-trophy"></i> Rank Atual *
                        </label>
                        <select id="feature_rank" name="feature_rank" required>
                            <option value="">Selecione o rank</option>
                            <option value="iron">Iron</option>
                            <option value="bronze">Bronze</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                            <option value="platinum">Platinum</option>
                            <option value="diamond">Diamond</option>
                            <option value="ascendant">Ascendant</option>
                            <option value="immortal">Immortal</option>
                            <option value="radiant">Radiant</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_level">
                            <i class="fas fa-level-up-alt"></i> Level da Batalha
                        </label>
                        <input type="number" 
                               id="feature_level" 
                               name="feature_level" 
                               min="1">
                        <div class="form-hint">Level do Passe de Batalha</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_agents">
                            <i class="fas fa-user-secret"></i> Agents *
                        </label>
                        <input type="number" 
                               id="feature_agents" 
                               name="feature_agents" 
                               min="0" 
                               max="24" 
                               required>
                        <div class="form-hint">Quantidade de agents desbloqueados (0-24)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_skins">
                            <i class="fas fa-gun"></i> Skins Premium
                        </label>
                        <input type="number" 
                               id="feature_skins" 
                               name="feature_skins" 
                               min="0">
                        <div class="form-hint">Quantidade de skins premium/edition</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="feature_vp">
                        <i class="fas fa-coins"></i> Valorant Points
                    </label>
                    <input type="number" 
                           id="feature_vp" 
                           name="feature_vp" 
                           min="0">
                    <div class="form-hint">Quantidade de VP disponíveis</div>
                </div>
                
                <div class="form-group">
                    <label for="feature_radianite">
                        <i class="fas fa-gem"></i> Radianite Points
                    </label>
                    <input type="number" 
                           id="feature_radianite" 
                           name="feature_radianite" 
                           min="0">
                </div>
                
                <div class="form-group">
                    <label for="feature_rare_skins">
                        <i class="fas fa-crown"></i> Bundles/Skins Raras
                    </label>
                    <textarea id="feature_rare_skins" 
                              name="feature_rare_skins" 
                              placeholder="Liste bundles raros, skins deluxe, etc..."
                              rows="3"></textarea>
                    <div class="form-hint">Ex: Bundle Oni, Prime Vandal, Reaver Operator</div>
                </div>
            `,
            
            'mobile-legends': `
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_rank">
                            <i class="fas fa-trophy"></i> Rank Atual *
                        </label>
                        <select id="feature_rank" name="feature_rank" required>
                            <option value="">Selecione o rank</option>
                            <option value="warrior">Warrior</option>
                            <option value="elite">Elite</option>
                            <option value="master">Master</option>
                            <option value="grandmaster">Grandmaster</option>
                            <option value="epic">Epic</option>
                            <option value="legend">Legend</option>
                            <option value="mythic">Mythic</option>
                            <option value="mythical_glory">Mythical Glory</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_level">
                            <i class="fas fa-level-up-alt"></i> Level
                        </label>
                        <input type="number" 
                               id="feature_level" 
                               name="feature_level" 
                               min="1" 
                               max="120">
                        <div class="form-hint">Level da conta (1-120)</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_heroes">
                            <i class="fas fa-user-ninja"></i> Heroes *
                        </label>
                        <input type="number" 
                               id="feature_heroes" 
                               name="feature_heroes" 
                               min="0" 
                               max="150" 
                               required>
                        <div class="form-hint">Quantidade de heroes desbloqueados (0-150)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_skins">
                            <i class="fas fa-tshirt"></i> Skins *
                        </label>
                        <input type="number" 
                               id="feature_skins" 
                               name="feature_skins" 
                               min="0" 
                               required>
                        <div class="form-hint">Quantidade total de skins</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_diamonds">
                            <i class="fas fa-gem"></i> Diamonds
                        </label>
                        <input type="number" 
                               id="feature_diamonds" 
                               name="feature_diamonds" 
                               min="0">
                        <div class="form-hint">Quantidade de diamonds disponíveis</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_battle_points">
                            <i class="fas fa-coins"></i> Battle Points
                        </label>
                        <input type="number" 
                               id="feature_battle_points" 
                               name="feature_battle_points" 
                               min="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="feature_rare_skins">
                        <i class="fas fa-crown"></i> Skins Raras/Lendárias
                    </label>
                    <textarea id="feature_rare_skins" 
                              name="feature_rare_skins" 
                              placeholder="Liste skins lendárias, épicas, etc..."
                              rows="3"></textarea>
                    <div class="form-hint">Ex: Skin Legendária, Collector, Starlight</div>
                </div>
            `,
            
            'diablo': `
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_level">
                            <i class="fas fa-level-up-alt"></i> Level do Personagem *
                        </label>
                        <input type="number" 
                               id="feature_level" 
                               name="feature_level" 
                               min="1" 
                               max="100" 
                               required>
                        <div class="form-hint">Level do personagem principal (1-100)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_world_tier">
                            <i class="fas fa-layer-group"></i> World Tier
                        </label>
                        <select id="feature_world_tier" name="feature_world_tier">
                            <option value="">Selecione</option>
                            <option value="1">World Tier 1</option>
                            <option value="2">World Tier 2</option>
                            <option value="3">World Tier 3</option>
                            <option value="4">World Tier 4</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="feature_gold">
                            <i class="fas fa-coins"></i> Gold *
                        </label>
                        <input type="number" 
                               id="feature_gold" 
                               name="feature_gold" 
                               min="0" 
                               required>
                        <div class="form-hint">Quantidade de gold disponível</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="feature_paragon">
                            <i class="fas fa-infinity"></i> Paragon Points
                        </label>
                        <input type="number" 
                               id="feature_paragon" 
                               name="feature_paragon" 
                               min="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="feature_characters">
                        <i class="fas fa-users"></i> Personagens
                    </label>
                    <input type="number" 
                           id="feature_characters" 
                           name="feature_characters" 
                           min="1" 
                           max="10">
                    <div class="form-hint">Quantidade de personagens criados (1-10)</div>
                </div>
                
                <div class="form-group">
                    <label for="feature_items">
                        <i class="fas fa-chess-knight"></i> Itens Raros/Únicos
                    </label>
                    <textarea id="feature_items" 
                              name="feature_items" 
                              placeholder="Liste itens raros, únicos, sets completos..."
                              rows="3"></textarea>
                    <div class="form-hint">Ex: Shako, Grandfather, Harlequin Crest, Sets completos</div>
                </div>
                
                <div class="form-group">
                    <label for="feature_uber_lilith">
                        <i class="fas fa-skull"></i> Uber Lilith Derrotada
                    </label>
                    <select id="feature_uber_lilith" name="feature_uber_lilith">
                        <option value="false">Não</option>
                        <option value="true">Sim</option>
                    </select>
                </div>
            `,
            
            'default': `
                <div class="form-group">
                    <label for="feature_level">
                        <i class="fas fa-level-up-alt"></i> Level/Nível
                    </label>
                    <input type="number" 
                           id="feature_level" 
                           name="feature_level" 
                           min="1">
                </div>
                
                <div class="form-group">
                    <label for="feature_rank">
                        <i class="fas fa-trophy"></i> Rank/Classificação
                    </label>
                    <input type="text" 
                           id="feature_rank" 
                           name="feature_rank" 
                           placeholder="Ex: Diamante, Ouro, Top 500...">
                </div>
                
                <div class="form-group">
                    <label for="feature_items">
                        <i class="fas fa-box-open"></i> Itens/Conteúdo
                    </label>
                    <textarea id="feature_items" 
                              name="feature_items" 
                              placeholder="Descreva itens, personagens, skins, etc..."
                              rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="feature_currency">
                        <i class="fas fa-coins"></i> Moeda do Jogo
                    </label>
                    <input type="number" 
                           id="feature_currency" 
                           name="feature_currency" 
                           min="0">
                </div>
            `
        };
        
        return templates[game] || templates['default'];
    }
    
    initGameFieldsListeners() {
        // Adiciona listeners para campos específicos do jogo
        const gameFields = document.querySelectorAll('#game-specific-fields input, #game-specific-fields select, #game-specific-fields textarea');
        gameFields.forEach(field => {
            field.addEventListener('input', (e) => {
                const fieldName = e.target.name;
                let value = e.target.value;
                
                // Converte números
                if (e.target.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                
                // Atualiza features
                if (fieldName.startsWith('feature_')) {
                    const cleanName = fieldName.replace('feature_', '');
                    this.formData.features[cleanName] = value;
                }
            });
        });
    }
    
    initImageUpload() {
        const uploadArea = document.getElementById('upload-area');
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('screenshots');
        const clearAllBtn = document.getElementById('clear-all-images');
        
        if (!uploadArea || !uploadBtn || !fileInput) return;
        
        // Click no botão de upload
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Seleção de arquivos
        fileInput.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleImageUpload(e.dataTransfer.files);
            }
        });
        
        // Limpar todas as imagens
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllImages();
            });
        }
    }
    
    handleImageUpload(files) {
        const maxFiles = 10;
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        // Limita quantidade de arquivos
        const filesArray = Array.from(files).slice(0, maxFiles - this.uploadedImages.length);
        
        for (const file of filesArray) {
            // Valida tipo
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Tipo de arquivo inválido',
                    text: 'Apenas imagens JPG, PNG, GIF e WebP são permitidas.',
                    confirmButtonText: 'Entendi'
                });
                continue;
            }
            
            // Valida tamanho
            if (file.size > maxSize) {
                Swal.fire({
                    icon: 'error',
                    title: 'Arquivo muito grande',
                    text: 'Cada imagem deve ter no máximo 5MB.',
                    confirmButtonText: 'Entendi'
                });
                continue;
            }
            
            // Cria preview
            this.createImagePreview(file);
        }
        
        // Atualiza contador
        this.updateImageCount();
    }
    
    createImagePreview(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageData = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result,
                preview: e.target.result
            };
            
            this.uploadedImages.push(imageData);
            this.renderImagePreview(imageData);
            
            // Atualiza formData
            this.formData.images = this.uploadedImages.map(img => img.data);
        };
        
        reader.readAsDataURL(file);
    }
    
    renderImagePreview(imageData) {
        const imageGrid = document.getElementById('image-grid');
        if (!imageGrid) return;
        
        const imageItem = document.createElement('div');
        imageItem.className = 'image-preview-item';
        imageItem.dataset.id = imageData.id;
        
        imageItem.innerHTML = `
            <img src="${imageData.preview}" alt="${imageData.name}">
            <button class="remove-btn" onclick="sellPage.removeImage('${imageData.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        imageGrid.appendChild(imageItem);
    }
    
    removeImage(imageId) {
        // Remove da array
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
        
        // Remove do DOM
        const imageItem = document.querySelector(`.image-preview-item[data-id="${imageId}"]`);
        if (imageItem) {
            imageItem.remove();
        }
        
        // Atualiza contador
        this.updateImageCount();
        
        // Atualiza formData
        this.formData.images = this.uploadedImages.map(img => img.data);
    }
    
    clearAllImages() {
        Swal.fire({
            title: 'Limpar todas as imagens?',
            text: 'Esta ação não pode ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, limpar!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.uploadedImages = [];
                this.formData.images = [];
                
                const imageGrid = document.getElementById('image-grid');
                if (imageGrid) {
                    imageGrid.innerHTML = '';
                }
                
                this.updateImageCount();
            }
        });
    }
    
    updateImageCount() {
        const imageCount = document.getElementById('image-count');
        if (imageCount) {
            imageCount.textContent = this.uploadedImages.length;
        }
    }
    
    updateReviewSection() {
        // Informações básicas
        this.updateReviewBasic();
        
        // Detalhes
        this.updateReviewDetails();
        
        // Imagens
        this.updateReviewImages();
        
        // Contato
        this.updateReviewContact();
    }
    
    updateReviewBasic() {
        const container = document.getElementById('review-basic');
        if (!container) return;
        
        const gameName = this.getGameName(this.formData.game);
        const price = this.formData.price ? `R$ ${this.formData.price.toFixed(2)}` : 'Não informado';
        
        container.innerHTML = `
            <div class="review-item">
                <span class="review-label">Jogo:</span>
                <span class="review-value">${gameName}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Título:</span>
                <span class="review-value">${this.formData.title || 'Não informado'}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Preço:</span>
                <span class="review-value">${price}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Descrição:</span>
                <span class="review-value">${(this.formData.description || '').substring(0, 100)}${this.formData.description && this.formData.description.length > 100 ? '...' : ''}</span>
            </div>
        `;
    }
    
    updateReviewDetails() {
        const container = document.getElementById('review-details');
        if (!container) return;
        
        let html = '';
        
        // Recupera valores dos campos
        const server = document.getElementById('server')?.value;
        const region = document.getElementById('region')?.value;
        const accountStatus = document.getElementById('account_status')?.value;
        const createdDate = document.getElementById('created_date')?.value;
        const playtime = document.getElementById('playtime')?.value;
        
        // Adiciona campos gerais
        if (server) {
            html += `<div class="review-item">
                <span class="review-label">Servidor:</span>
                <span class="review-value">${server}</span>
            </div>`;
        }
        
        if (region) {
            html += `<div class="review-item">
                <span class="review-label">Região:</span>
                <span class="review-value">${region}</span>
            </div>`;
        }
        
        if (accountStatus) {
            html += `<div class="review-item">
                <span class="review-label">Status:</span>
                <span class="review-value">${this.getStatusName(accountStatus)}</span>
            </div>`;
        }
        
        // Adiciona campos específicos do jogo
        for (const [key, value] of Object.entries(this.formData.features)) {
            if (value) {
                const label = this.getFeatureLabel(key);
                html += `<div class="review-item">
                    <span class="review-label">${label}:</span>
                    <span class="review-value">${value}</span>
                </div>`;
            }
        }
        
        container.innerHTML = html || '<p class="no-data">Nenhum detalhe especificado</p>';
    }
    
    updateReviewImages() {
        const container = document.getElementById('review-images');
        if (!container) return;
        
        if (this.uploadedImages.length === 0) {
            container.innerHTML = '<p class="no-data">Nenhuma imagem adicionada</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="review-item">
                <span class="review-label">Quantidade:</span>
                <span class="review-value">${this.uploadedImages.length} imagem(ns)</span>
            </div>
            <div class="review-item">
                <span class="review-label">Pré-visualização:</span>
                <div class="review-images-preview">
                    ${this.uploadedImages.slice(0, 3).map(img => `
                        <img src="${img.preview}" alt="Preview" class="review-thumbnail">
                    `).join('')}
                    ${this.uploadedImages.length > 3 ? `<span class="more-images">+${this.uploadedImages.length - 3} mais</span>` : ''}
                </div>
            </div>
        `;
    }
    
    updateReviewContact() {
        const container = document.getElementById('review-contact');
        if (!container) return;
        
        const email = document.getElementById('contact_email')?.value || this.currentUser?.email || 'Não informado';
        const whatsapp = document.getElementById('contact_whatsapp')?.value || 'Não informado';
        const discord = document.getElementById('contact_discord')?.value || 'Não informado';
        
        container.innerHTML = `
            <div class="review-item">
                <span class="review-label">Email:</span>
                <span class="review-value">${email}</span>
            </div>
            <div class="review-item">
                <span class="review-label">WhatsApp:</span>
                <span class="review-value">${whatsapp}</span>
            </div>
            <div class="review-item">
                <span class="review-label">Discord:</span>
                <span class="review-value">${discord}</span>
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
            'minecraft': 'Minecraft',
            'other': 'Outro Jogo'
        };
        
        return games[gameCode] || gameCode;
    }
    
    getStatusName(statusCode) {
        const statuses = {
            'active': 'Ativa (Jogável)',
            'fresh': 'Fresh (Nova)',
            'banned': 'Banida',
            'recovered': 'Recuperável'
        };
        
        return statuses[statusCode] || statusCode;
    }
    
    getFeatureLabel(featureCode) {
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
            'characters': 'Personagens'
        };
        
        // Transforma snake_case em Title Case
        return labels[featureCode] || featureCode
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    async handleSubmit() {
        // Valida termos
        const terms = document.getElementById('terms');
        const tosAcknowledge = document.getElementById('tos_acknowledge');
        
        if (!terms?.checked || !tosAcknowledge?.checked) {
            Swal.fire({
                icon: 'error',
                title: 'Aceite os termos',
                text: 'Você precisa aceitar os Termos de Uso e reconhecer os riscos.',
                confirmButtonText: 'Entendi'
            });
            return;
        }
        
        // Coleta todos os dados do formulário
        const formData = this.collectFormData();
        
        // Valida dados
        if (!this.validateFinalData(formData)) {
            return;
        }
        
        // Mostra loading
        Swal.fire({
            title: 'Publicando conta...',
            text: 'Por favor, aguarde um momento.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            // Publica a conta
            const account = await this.publishAccount(formData);
            
            // Sucesso
            Swal.close();
            this.showSuccessModal(account);
            
        } catch (error) {
            console.error('Erro ao publicar conta:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Erro ao publicar',
                text: error.message || 'Ocorreu um erro ao publicar sua conta. Tente novamente.',
                confirmButtonText: 'Entendi'
            });
        }
    }
    
    collectFormData() {
        const form = document.getElementById('sell-form');
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {
            game: formData.get('game'),
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')) || 0,
            seller: this.currentUser.username,
            seller_id: this.currentUser.id,
            features: {},
            images: this.uploadedImages.map(img => img.data),
            contact: {},
            metadata: {}
        };
        
        // Coleta campos específicos
        formData.forEach((value, key) => {
            // Campos de contato
            if (key.startsWith('contact_')) {
                const cleanKey = key.replace('contact_', '');
                data.contact[cleanKey] = value;
            }
            
            // Campos de features
            else if (key.startsWith('feature_')) {
                const cleanKey = key.replace('feature_', '');
                data.features[cleanKey] = value;
            }
            
            // Outros campos
            else if (['server', 'region', 'account_status', 'created_date', 'playtime'].includes(key)) {
                data.metadata[key] = value;
            }
        });
        
        return data;
    }
    
    validateFinalData(data) {
        const errors = [];
        
        if (!data.game) errors.push('Selecione um jogo');
        if (!data.title || data.title.length < 10) errors.push('Título deve ter pelo menos 10 caracteres');
        if (!data.description || data.description.length < 50) errors.push('Descrição deve ter pelo menos 50 caracteres');
        if (!data.price || data.price < 5) errors.push('Preço deve ser no mínimo R$ 5,00');
        if (!data.seller_id) errors.push('Usuário não identificado');
        
        // Validações específicas por jogo
        if (data.game === 'genshin' && (!data.features.ar_level || data.features.ar_level < 1)) {
            errors.push('AR Level é obrigatório para Genshin Impact');
        }
        
        if (data.game === 'lol' && !data.features.rank) {
            errors.push('Rank é obrigatório para League of Legends');
        }
        
        if (errors.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Dados inválidos',
                html: `Por favor, corrija os seguintes erros:<br><br>${errors.map(err => `• ${err}`).join('<br>')}`,
                confirmButtonText: 'Entendi'
            });
            return false;
        }
        
        return true;
    }
    
    async publishAccount(accountData) {
        // Adiciona timestamp
        accountData.created_at = new Date().toISOString();
        accountData.updated_at = new Date().toISOString();
        accountData.status = 'available';
        accountData.views = 0;
        accountData.favorites_count = 0;
        accountData.verified = false;
        
        // Adiciona ID único
        accountData.id = Date.now() + Math.random().toString(36).substr(2, 9);
        
        // Salva no banco de dados
        const account = await db.addAccount(accountData);
        
        // Atualiza estatísticas do usuário
        await this.updateUserStats();
        
        return account;
    }
    
    async updateUserStats() {
        try {
            const user = await db.getUser(this.currentUser.id);
            if (user) {
                user.sales_count = (user.sales_count || 0) + 1;
                await db.updateUser(user.id, { sales_count: user.sales_count });
            }
        } catch (error) {
            console.error('Erro ao atualizar estatísticas do usuário:', error);
        }
    }
    
    showSuccessModal(account) {
        const modal = document.getElementById('success-modal');
        if (!modal) return;
        
        // Atualiza link para ver a publicação
        const viewLink = modal.querySelector('a[href*="account-detail.html"]');
        if (viewLink) {
            viewLink.href = `account-detail.html?id=${account.id}`;
        }
        
        // Mostra modal
        modal.classList.add('show');
        
        // Configura botão de fechar
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('show');
            window.location.href = `account-detail.html?id=${account.id}`;
        });
        
        // Fecha modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                window.location.href = `account-detail.html?id=${account.id}`;
            }
        });
        
        // Adiciona ao LocalStorage para aparecer na home
        this.addToFeaturedAccounts(account);
    }
    
    addToFeaturedAccounts(account) {
        // Recupera contas em destaque
        let featuredAccounts = JSON.parse(localStorage.getItem('featured_accounts') || '[]');
        
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
        
        // Mantém apenas as 6 últimas
        featuredAccounts = featuredAccounts.slice(0, 6);
        
        // Salva
        localStorage.setItem('featured_accounts', JSON.stringify(featuredAccounts));
        
        // Atualiza home page se estiver aberta
        this.notifyHomePage();
    }
    
    notifyHomePage() {
        // Dispara evento para atualizar a home
        const event = new CustomEvent('newAccountPublished');
        window.dispatchEvent(event);
        
        // Se estiver em outra aba, atualiza o localStorage
        localStorage.setItem('home_needs_refresh', 'true');
    }
}

// Inicializa a página de vendas
const sellPage = new SellPage();

// Exporta para uso global
window.sellPage = sellPage;