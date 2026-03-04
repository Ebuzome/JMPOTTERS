// ====================
// JMPOTTERS APP - UNIFIED SINGLE PAGE VERSION
// PRESERVES ALL ORIGINAL SUPABASE LOGIC
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS UNIFIED app starting...');
    window.JMPOTTERS_APP_INITIALIZED = true;
    
    // ====================
    // CONFIGURATION - EXACTLY AS ORIGINAL
    // ====================
    if (!window.JMPOTTERS_CONFIG) {
        window.JMPOTTERS_CONFIG = {};
    }
    
    // Supabase configuration - EXACT same as original
    window.JMPOTTERS_CONFIG.supabase = {
        url: 'https://tmpggeeuwdvlngvfncaa.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'
    };
    
    // Image configuration - EXACT same paths
    window.JMPOTTERS_CONFIG.images = {
        baseUrl: 'https://ebuzome.github.io/JMPOTTERS/assets/images/',
        paths: {
            'mensfootwear': 'mensfootwear/',
            'womensfootwear': '',
            'bags': '',
            'household': 'household2/',
            'kids': 'kids/',
            'accessories': 'accessories/',
            'healthcare': ''
        }
    };
    
    // ====================
    // STATE MANAGEMENT
    // ====================
    let state = {
        currentCategory: 'all',
        products: [],
        filteredProducts: [],
        selectedProduct: null,
        selectedColor: null,
        selectedSize: null,
        selectedQuantity: 1,
        productColors: [],
        productSizes: [],
        colorSizeMap: {},
        sizeColorMap: {},
        cart: JSON.parse(localStorage.getItem('jmpotters_cart')) || [],
        wishlist: JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [],
        categories: []
    };
    
    // ====================
    // UTILITY FUNCTIONS - EXACTLY AS ORIGINAL
    // ====================
    function getSupabaseClient() {
        if (window.JMPOTTERS_SUPABASE_CLIENT) {
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        
        if (window.supabase && window.supabase.createClient) {
            const config = window.JMPOTTERS_CONFIG.supabase;
            window.JMPOTTERS_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.key);
            console.log('✅ Created new Supabase client');
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        
        console.error('❌ Supabase library not loaded');
        return null;
    }
    
    function getImageUrl(categorySlug, imageFilename) {
        if (!imageFilename) {
            return window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
        }
        
        const config = window.JMPOTTERS_CONFIG.images;
        const folder = config.paths[categorySlug] || '';
        return config.baseUrl + folder + imageFilename;
    }
    
    function formatPrice(price) {
        if (!price && price !== 0) {
            return '₦0';
        }
        return `₦${parseInt(price).toLocaleString()}`;
    }
    
    function showNotification(message, type = 'success') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info} notification-icon"></i>
            <span>${message}</span>
        `;
        
        notificationContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    // ====================
    // LOAD CATEGORIES AND PRODUCTS - EXACT SUPABASE LOGIC
    // ====================
    async function loadCategoriesAndProducts() {
        console.log('📦 Loading categories and products from Supabase...');
        
        const productsGrid = document.getElementById('productsGrid');
        const loadingState = document.getElementById('loadingState');
        
        if (loadingState) loadingState.style.display = 'block';
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showError('Database connection error');
            return;
        }
        
        try {
            // First, load all categories - EXACTLY as original
            const { data: categories, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .order('name');
            
            if (catError) throw catError;
            
            state.categories = categories || [];
            console.log(`✅ Loaded ${state.categories.length} categories`);
            
            // Create category map
            const categoryMap = {};
            categories.forEach(cat => {
                categoryMap[cat.id] = cat;
            });
            
            // Load all active products - EXACTLY as original
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id, name, price, image_url, stock, slug, description, category_id, is_active')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) throw prodError;
            
            console.log(`✅ Loaded ${products?.length || 0} products`);
            
            // Attach category info to products
            state.products = (products || []).map(product => ({
                ...product,
                category_slug: categoryMap[product.category_id]?.slug || 'unknown',
                category_name: categoryMap[product.category_id]?.name || 'Unknown'
            }));
            
            // Cache products globally (for wishlist, etc.)
            window.JMPOTTERS_PRODUCTS_CACHE = state.products;
            
            // Set filtered products to all initially
            state.filteredProducts = state.products;
            
            // Render category tabs
            renderCategoryTabs();
            
            // Render products
            renderProducts();
            
            if (loadingState) loadingState.style.display = 'none';
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            showError(error.message || 'Failed to load products');
        }
    }
    
    function showError(message) {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        
        if (loadingState) loadingState.style.display = 'none';
        if (errorState) {
            errorState.style.display = 'block';
            if (errorMessage) errorMessage.textContent = message;
        }
    }
    
    // ====================
    // RENDER CATEGORY TABS
    // ====================
    function renderCategoryTabs() {
        const categoryTabs = document.getElementById('categoryTabs');
        if (!categoryTabs) return;
        
        // Add "All Products" tab first
        let html = `
            <button class="category-tab ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">
                <i class="fas fa-grid-2"></i>
                <span>All Products</span>
                <span class="count">(${state.products.length})</span>
            </button>
        `;
        
        // Add tabs for each category from database
        state.categories.forEach(cat => {
            const count = state.products.filter(p => p.category_slug === cat.slug).length;
            if (count === 0) return; // Skip empty categories
            
            // Map icon based on slug
            let icon = 'fa-solid fa-tag';
            if (cat.slug.includes('footwear')) icon = 'fa-solid fa-shoe-prints';
            else if (cat.slug.includes('bag')) icon = 'fa-solid fa-bag-shopping';
            else if (cat.slug.includes('house')) icon = 'fa-solid fa-house';
            else if (cat.slug.includes('kid')) icon = 'fa-solid fa-child';
            else if (cat.slug.includes('access')) icon = 'fa-solid fa-clock';
            else if (cat.slug.includes('health')) icon = 'fa-solid fa-heart-pulse';
            
            html += `
                <button class="category-tab ${state.currentCategory === cat.slug ? 'active' : ''}" data-category="${cat.slug}">
                    <i class="${icon}"></i>
                    <span>${cat.name}</span>
                    <span class="count">(${count})</span>
                </button>
            `;
        });
        
        categoryTabs.innerHTML = html;
        
        // Add click handlers
        categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                state.currentCategory = category;
                
                // Filter products
                if (category === 'all') {
                    state.filteredProducts = state.products;
                } else {
                    state.filteredProducts = state.products.filter(
                        p => p.category_slug === category
                    );
                }
                
                // Update UI
                renderCategoryTabs();
                renderProducts();
            });
        });
    }
    
    // ====================
    // RENDER PRODUCTS GRID - WITH WISHLIST SUPPORT
    // ====================
    function renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        if (state.filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <h3>No Products Found</h3>
                    <p>No products available in this category yet.</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="products-grid">';
        
        state.filteredProducts.forEach(product => {
            const imageUrl = getImageUrl(product.category_slug, product.image_url);
            const isInWishlist = state.wishlist.some(item => item.id === product.id);
            
            html += `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-image">
                        <img src="${imageUrl}" alt="${product.name}"
                             onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                data-action="wishlist"
                                data-product-id="${product.id}"
                                style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; width: 36px; height: 36px; border-radius: 50%; color: ${isInWishlist ? '#e74c3c' : 'white'}; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span class="category-badge" style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">
                            ${product.category_name}
                        </span>
                    </div>
                    <div class="product-info" style="padding: 15px;">
                        <h3 class="product-title" style="margin: 0 0 10px 0; font-size: 1.1rem; font-weight: 600;">${product.name}</h3>
                        <div class="product-price" style="margin-bottom: 8px;">
                            <span class="price-real" style="font-size: 1.2rem; font-weight: bold; color: #d4af37;">${formatPrice(product.price)}</span>
                        </div>
                        <div class="stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}" style="display: flex; align-items: center; gap: 5px; color: ${product.stock > 0 ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem; margin-bottom: 10px;">
                            <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                            ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                        <button class="quick-view-btn" data-product-id="${product.id}" style="width: 100%; padding: 10px; background: #000; color: white; border: none; cursor: pointer; font-weight: 500;">
                            <i class="fas fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        productsGrid.innerHTML = html;
        
        setupProductCardInteractions();
    }
    
    // ====================
    // PRODUCT MODAL - WITH FULL VARIANT SUPPORT
    // ====================
    async function openProductModal(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        
        state.selectedProduct = product;
        state.selectedColor = null;
        state.selectedSize = null;
        state.selectedQuantity = 1;
        
        // Show modal with loading
        const modal = document.getElementById('productModal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-loading">Loading product details...</div>
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        const supabase = getSupabaseClient();
        
        try {
            // Load colors and sizes - EXACTLY as original product page
            const [colorsResult, sizesResult] = await Promise.all([
                supabase.from('product_colors').select('*').eq('product_id', product.id).order('sort_order'),
                supabase.from('product_sizes').select('*').eq('product_id', product.id).order('size_value')
            ]);
            
            state.productColors = colorsResult.data || [];
            state.productSizes = sizesResult.data || [];
            
            // Build mappings - EXACTLY as original
            buildColorSizeMappings();
            
            renderProductModal();
            
        } catch (error) {
            console.error('Error loading product details:', error);
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-error">
                        <h3>Error Loading Product</h3>
                        <p>${error.message}</p>
                        <button class="close-modal-btn">Close</button>
                    </div>
                </div>
            `;
        }
    }
    
    function buildColorSizeMappings() {
        // Reset mappings
        state.colorSizeMap = {};
        state.sizeColorMap = {};
        
        // Build color -> sizes map
        state.productColors.forEach(color => {
            state.colorSizeMap[color.id] = state.productSizes.filter(size => size.color_id === color.id);
        });
        
        // Build size -> colors map
        const uniqueSizes = [...new Set(state.productSizes.map(s => s.size_value))];
        uniqueSizes.forEach(sizeValue => {
            const sizeVariants = state.productSizes.filter(s => s.size_value === sizeValue);
            state.sizeColorMap[sizeValue] = state.productColors.filter(color => 
                sizeVariants.some(s => s.color_id === color.id)
            );
        });
    }
    
    function renderProductModal() {
        const modal = document.getElementById('productModal');
        if (!modal) return;
        
        const product = state.selectedProduct;
        const isFootwear = ['mensfootwear', 'womensfootwear'].includes(product.category_slug);
        const imageUrl = getImageUrl(product.category_slug, product.image_url);
        const isInWishlist = state.wishlist.some(item => item.id === product.id);
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close"><i class="fas fa-times"></i></button>
                
                <div class="modal-body">
                    <!-- Left: Images -->
                    <div class="modal-images">
                        <img src="${imageUrl}" alt="${product.name}" class="main-image"
                             onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    </div>
                    
                    <!-- Right: Details -->
                    <div class="modal-details">
                        <h2>${product.name}</h2>
                        <div class="price">${formatPrice(product.price)}</div>
                        
                        <div class="stock-info ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                            <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                            <span>${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                            ${product.stock > 0 ? `<span class="stock-count">${product.stock} units available</span>` : ''}
                        </div>
                        
                        <div class="description">
                            <h3>Description</h3>
                            <p>${product.description ? product.description.replace(/\n/g, '<br>') : 'Premium quality product from JMPOTTERS.'}</p>
                        </div>
                        
                        ${isFootwear && state.productColors.length > 0 ? `
                            <div class="variant-section">
                                <h3>Select Color</h3>
                                <div class="color-options" id="modalColorOptions">
                                    ${state.productColors.map(color => `
                                        <div class="color-option" 
                                             data-color-id="${color.id}"
                                             data-color-name="${color.color_name}"
                                             style="background-color: ${color.color_code || '#666'}"
                                             title="${color.color_name}">
                                            ${color.color_name}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="variant-section">
                                <h3>Select Size</h3>
                                <div class="size-options" id="modalSizeOptions">
                                    <div class="no-selection">Select a color first</div>
                                </div>
                            </div>
                            
                            <div class="selection-summary" id="selectionSummary" style="display: none;">
                                <div class="selected-variant">
                                    <span id="selectedColorName"></span>
                                    <span class="separator">-</span>
                                    <span id="selectedSizeValue"></span>
                                </div>
                                <div class="stock-info">
                                    <i class="fas fa-box"></i>
                                    <span>Available Stock:</span>
                                    <strong id="availableStock">0</strong>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="quantity-section">
                            <h3>Quantity</h3>
                            <div class="quantity-controls">
                                <button class="quantity-btn minus">-</button>
                                <input type="number" id="modalQuantity" value="1" min="1" max="${product.stock}" class="quantity-input">
                                <button class="quantity-btn plus">+</button>
                            </div>
                            <div class="bulk-options">
                                ${[1, 5, 10, 25, 50].map(qty => `
                                    <button class="bulk-option ${qty === 1 ? 'active' : ''}" data-qty="${qty}">
                                        ${qty} Unit${qty > 1 ? 's' : ''}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="action-btn btn-primary btn-add-cart" id="modalAddToCart">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                            <button class="action-btn btn-secondary btn-wishlist ${isInWishlist ? 'active' : ''}" id="modalWishlist">
                                <i class="fas fa-heart"></i> 
                                ${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        setupModalInteractions();
    }
    
    // ====================
    // MODAL INTERACTIONS - EXACTLY AS ORIGINAL PRODUCT PAGE
    // ====================
    function setupModalInteractions() {
        // Close button
        document.querySelector('.modal-close')?.addEventListener('click', closeModal);
        
        // Color selection
        const colorOptions = document.getElementById('modalColorOptions');
        if (colorOptions) {
            colorOptions.addEventListener('click', (e) => {
                const colorOption = e.target.closest('.color-option');
                if (!colorOption) return;
                
                colorOptions.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                colorOption.classList.add('selected');
                
                state.selectedColor = {
                    id: parseInt(colorOption.dataset.colorId),
                    name: colorOption.dataset.colorName
                };
                
                updateModalSizeOptions();
            });
        }
        
        // Quantity controls
        const quantityInput = document.getElementById('modalQuantity');
        const minusBtn = document.querySelector('.quantity-btn.minus');
        const plusBtn = document.querySelector('.quantity-btn.plus');
        
        if (quantityInput && minusBtn && plusBtn) {
            minusBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    state.selectedQuantity = quantityInput.value;
                }
            });
            
            plusBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                const maxStock = state.selectedSize?.stock || state.selectedProduct.stock;
                if (currentValue < maxStock) {
                    quantityInput.value = currentValue + 1;
                    state.selectedQuantity = quantityInput.value;
                }
            });
            
            quantityInput.addEventListener('change', () => {
                const value = parseInt(quantityInput.value) || 1;
                const maxStock = state.selectedSize?.stock || state.selectedProduct.stock;
                quantityInput.value = Math.max(1, Math.min(value, maxStock));
                state.selectedQuantity = quantityInput.value;
            });
        }
        
        // Bulk options
        document.querySelectorAll('.bulk-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.bulk-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                this.classList.add('active');
                
                const qty = parseInt(this.dataset.qty);
                if (quantityInput) {
                    quantityInput.value = qty;
                    state.selectedQuantity = qty;
                }
            });
        });
        
        // Add to Cart button
        document.getElementById('modalAddToCart')?.addEventListener('click', () => {
            const product = state.selectedProduct;
            const isFootwear = ['mensfootwear', 'womensfootwear'].includes(product.category_slug);
            
            if (isFootwear && state.productColors.length > 0) {
                if (!state.selectedColor) {
                    showNotification('Please select a color', 'warning');
                    return;
                }
                
                if (!state.selectedSize) {
                    showNotification('Please select a size', 'warning');
                    return;
                }
                
                if (state.selectedSize.stock === 0) {
                    showNotification('This size is out of stock', 'error');
                    return;
                }
                
                if (state.selectedQuantity > state.selectedSize.stock) {
                    showNotification(`Only ${state.selectedSize.stock} units available`, 'error');
                    return;
                }
                
                addToCart(product, state.selectedQuantity, {
                    color_id: state.selectedColor.id,
                    color_name: state.selectedColor.name,
                    size_id: state.selectedSize.id,
                    size_value: state.selectedSize.value
                });
            } else {
                if (state.selectedQuantity > product.stock) {
                    showNotification(`Only ${product.stock} units available`, 'error');
                    return;
                }
                
                addToCart(product, state.selectedQuantity);
            }
            
            closeModal();
        });
        
        // Wishlist button
        document.getElementById('modalWishlist')?.addEventListener('click', () => {
            toggleWishlist(state.selectedProduct);
            
            const btn = document.getElementById('modalWishlist');
            const isActive = btn.classList.contains('active');
            btn.classList.toggle('active');
            btn.innerHTML = `
                <i class="fas fa-heart"></i> 
                ${isActive ? 'Add to Wishlist' : 'In Wishlist'}
            `;
        });
    }
    
    function updateModalSizeOptions() {
        const sizeOptions = document.getElementById('modalSizeOptions');
        const selectionSummary = document.getElementById('selectionSummary');
        
        if (!sizeOptions || !state.selectedColor) return;
        
        const availableSizes = state.colorSizeMap[state.selectedColor.id] || [];
        
        if (availableSizes.length === 0) {
            sizeOptions.innerHTML = '<div class="no-selection">No sizes available for this color</div>';
            if (selectionSummary) selectionSummary.style.display = 'none';
            state.selectedSize = null;
            return;
        }
        
        sizeOptions.innerHTML = availableSizes.map(size => {
            const stock = size.stock_quantity || 0;
            let stockClass = '';
            if (stock === 0) stockClass = 'out-of-stock';
            else if (stock < 5) stockClass = 'low-stock';
            
            return `
                <div class="size-option ${stockClass}" 
                     data-size-id="${size.id}"
                     data-size-value="${size.size_value}"
                     data-stock="${stock}"
                     ${stock === 0 ? 'disabled' : ''}>
                    ${size.size_value}
                </div>
            `;
        }).join('');
        
        sizeOptions.querySelectorAll('.size-option:not(.out-of-stock)').forEach(option => {
            option.addEventListener('click', function() {
                sizeOptions.querySelectorAll('.size-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                
                state.selectedSize = {
                    id: parseInt(this.dataset.sizeId),
                    value: this.dataset.sizeValue,
                    stock: parseInt(this.dataset.stock)
                };
                
                updateModalSelectionSummary();
                
                const quantityInput = document.getElementById('modalQuantity');
                if (quantityInput) {
                    quantityInput.max = state.selectedSize.stock;
                    if (state.selectedQuantity > state.selectedSize.stock) {
                        state.selectedQuantity = state.selectedSize.stock;
                        quantityInput.value = state.selectedSize.stock;
                    }
                }
            });
        });
    }
    
    function updateModalSelectionSummary() {
        const selectionSummary = document.getElementById('selectionSummary');
        const selectedColorName = document.getElementById('selectedColorName');
        const selectedSizeValue = document.getElementById('selectedSizeValue');
        const availableStock = document.getElementById('availableStock');
        
        if (!selectionSummary || !state.selectedColor || !state.selectedSize) return;
        
        selectedColorName.textContent = state.selectedColor.name;
        selectedSizeValue.textContent = state.selectedSize.value;
        availableStock.textContent = state.selectedSize.stock;
        
        selectionSummary.style.display = 'block';
    }
    
    // ====================
    // CART FUNCTIONS - EXACTLY AS ORIGINAL
    // ====================
    function addToCart(product, quantity = 1, options = {}) {
        const cartItem = {
            product_id: product.id,
            quantity: quantity,
            name: product.name,
            price: product.price || 0,
            image_url: product.image_url,
            category_slug: product.category_slug,
            color_id: options.color_id || null,
            color_name: options.color_name || null,
            size_id: options.size_id || null,
            size_value: options.size_value || null,
            added_at: new Date().toISOString()
        };
        
        const existingIndex = state.cart.findIndex(item => 
            item.product_id === cartItem.product_id && 
            item.color_id === cartItem.color_id && 
            item.size_id === cartItem.size_id
        );
        
        if (existingIndex !== -1) {
            state.cart[existingIndex].quantity += quantity;
        } else {
            state.cart.push(cartItem);
        }
        
        localStorage.setItem('jmpotters_cart', JSON.stringify(state.cart));
        updateCartUI();
        
        let notificationText = `${product.name}`;
        if (options.color_name) notificationText += ` (${options.color_name})`;
        if (options.size_value) notificationText += ` - Size ${options.size_value}`;
        notificationText += ' added to cart!';
        
        showNotification(notificationText, 'success');
        openCart();
    }
    
    function updateCartUI() {
        const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        const wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) {
            wishlistCount.textContent = state.wishlist.length;
            wishlistCount.style.display = state.wishlist.length > 0 ? 'flex' : 'none';
        }
        
        updateCartPanel();
    }
    
    function updateCartPanel() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (!cartItems || !cartTotal) return;
        
        if (state.cart.length === 0) {
            cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
            cartTotal.textContent = '₦0';
            return;
        }
        
        let html = '';
        let total = 0;
        
        state.cart.forEach((item, index) => {
            const itemTotal = (item.price || 0) * item.quantity;
            total += itemTotal;
            
            let itemDescription = item.name;
            if (item.color_name) itemDescription += ` (${item.color_name})`;
            if (item.size_value) itemDescription += ` - Size ${item.size_value}`;
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${getImageUrl(item.category_slug, item.image_url)}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${itemDescription}</div>
                        <div class="cart-item-price">${formatPrice(item.price)}</div>
                        <div class="cart-item-quantity-display">
                            Quantity: <strong>${item.quantity}</strong>
                        </div>
                    </div>
                    <button class="cart-item-remove" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        html += `
            <div class="cart-total">
                <span>Total:</span>
                <span class="cart-total-amount">${formatPrice(total)}</span>
            </div>
            <button class="cart-checkout-btn" id="checkoutButton">
                <i class="fas fa-shopping-bag"></i> Proceed to Checkout
            </button>
            <a href="#" class="cart-whatsapp-btn" id="whatsappCheckout" target="_blank">
                <i class="fab fa-whatsapp"></i> Checkout via WhatsApp
            </a>
        `;
        
        cartItems.innerHTML = html;
        cartTotal.textContent = formatPrice(total);
        
        setupCartInteractions();
    }
    
    function setupCartInteractions() {
        // Remove items
        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const removedItem = state.cart[index];
                
                state.cart.splice(index, 1);
                localStorage.setItem('jmpotters_cart', JSON.stringify(state.cart));
                updateCartUI();
                
                showNotification(`${removedItem.name} removed from cart`, 'info');
            });
        });
        
        // Checkout buttons
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                document.getElementById('whatsappCheckout')?.click();
            });
        }
        
        // WhatsApp checkout link
        const whatsappCheckout = document.getElementById('whatsappCheckout');
        if (whatsappCheckout && state.cart.length > 0) {
            let text = "I would like to purchase:\n";
            let total = 0;
            
            state.cart.forEach(item => {
                let itemDescription = item.name;
                if (item.color_name) itemDescription += ` (${item.color_name})`;
                if (item.size_value) itemDescription += ` - Size ${item.size_value}`;
                
                const itemTotal = (item.price || 0) * item.quantity;
                total += itemTotal;
                text += `- ${itemDescription} (${item.quantity} × ${formatPrice(item.price)}) = ${formatPrice(itemTotal)}\n`;
            });
            
            text += `\n*Total: ${formatPrice(total)}*\n\nPlease confirm order & shipping details.`;
            whatsappCheckout.href = `https://wa.me/2348139583320?text=${encodeURIComponent(text)}`;
        }
    }
    
    // ====================
    // WISHLIST FUNCTIONS
    // ====================
    function toggleWishlist(product) {
        const existingIndex = state.wishlist.findIndex(item => item.id === product.id);
        
        if (existingIndex !== -1) {
            state.wishlist.splice(existingIndex, 1);
            showNotification(`${product.name} removed from wishlist`, 'info');
        } else {
            state.wishlist.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                slug: product.slug,
                category_slug: product.category_slug
            });
            showNotification(`${product.name} added to wishlist!`, 'success');
        }
        
        localStorage.setItem('jmpotters_wishlist', JSON.stringify(state.wishlist));
        updateCartUI();
        
        // Update all wishlist buttons
        document.querySelectorAll(`[data-product-id="${product.id}"]`).forEach(btn => {
            if (btn.classList.contains('wishlist-btn')) {
                btn.classList.toggle('active');
                btn.style.color = btn.classList.contains('active') ? '#e74c3c' : 'white';
            }
        });
    }
    
    // ====================
    // PRODUCT CARD INTERACTIONS
    // ====================
    function setupProductCardInteractions() {
        // Wishlist buttons
        document.querySelectorAll('[data-action="wishlist"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(btn.dataset.productId);
                const product = state.products.find(p => p.id === productId);
                
                if (product) {
                    toggleWishlist(product);
                }
            });
        });
        
        // Quick view buttons
        document.querySelectorAll('.quick-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(btn.dataset.productId);
                openProductModal(productId);
            });
        });
        
        // Product card click (optional - open modal)
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open if clicking on wishlist button
                if (e.target.closest('[data-action="wishlist"]')) return;
                
                const productId = parseInt(card.dataset.productId);
                openProductModal(productId);
            });
        });
    }
    
    // ====================
    // CART PANEL CONTROLS
    // ====================
    function openCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartPanel) {
            cartPanel.classList.add('active');
            updateCartPanel();
        }
        
        if (cartOverlay) {
            cartOverlay.classList.add('active');
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    function closeCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartPanel) {
            cartPanel.classList.remove('active');
        }
        
        if (cartOverlay) {
            cartOverlay.classList.remove('active');
        }
        
        document.body.style.overflow = '';
    }
    
    function closeModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.remove('active');
        }
        document.body.style.overflow = '';
    }
    
    // ====================
    // HEADER INTERACTIONS
    // ====================
    function setupHeaderInteractions() {
        // Cart button
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openCart();
            });
        }
        
        // Close cart with overlay
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartOverlay) {
            cartOverlay.addEventListener('click', closeCart);
        }
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCart();
                closeModal();
            }
        });
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function init() {
        console.log('🚀 Initializing Unified JMPOTTERS...');
        
        // Setup header
        setupHeaderInteractions();
        
        // Load all data from Supabase
        await loadCategoriesAndProducts();
        
        // Update cart UI
        updateCartUI();
        
        console.log('✅ Unified JMPOTTERS ready!');
    }
    
    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose to window
    window.JMPOTTERS = {
        openCart,
        closeCart,
        openProductModal,
        addToCart,
        toggleWishlist,
        formatPrice
    };
    
})();
