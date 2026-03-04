// ====================
// JMPOTTERS APP - UNIFIED SINGLE PAGE VERSION
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        return;
    }
    
    console.log('🚀 JMPOTTERS Unified App starting...');
    window.JMPOTTERS_APP_INITIALIZED = true;
    
    // ====================
    // CONFIGURATION
    // ====================
    window.JMPOTTERS_CONFIG = {
        supabase: {
            url: 'https://tmpggeeuwdvlngvfncaa.supabase.co',
            key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'
        },
        images: {
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
        },
        categories: [
            { id: 'all', name: 'All Products', icon: 'fa-solid fa-grid-2' },
            { id: 'mensfootwear', name: "Men's Footwear", icon: 'fa-solid fa-shoe-prints' },
            { id: 'womensfootwear', name: "Women's Footwear", icon: 'fa-solid fa-shoe-prints' },
            { id: 'bags', name: 'Bags', icon: 'fa-solid fa-bag-shopping' },
            { id: 'household', name: 'Household', icon: 'fa-solid fa-house' },
            { id: 'kids', name: 'Kids', icon: 'fa-solid fa-child' },
            { id: 'accessories', name: 'Accessories', icon: 'fa-solid fa-clock' },
            { id: 'healthcare', name: 'Healthcare', icon: 'fa-solid fa-heart-pulse' }
        ]
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
        cart: JSON.parse(localStorage.getItem('jmpotters_cart')) || [],
        wishlist: JSON.parse(localStorage.getItem('jmpotters_wishlist')) || []
    };
    
    // ====================
    // DOM ELEMENTS (cached)
    // ====================
    const elements = {
        productsGrid: document.getElementById('productsGrid'),
        categoryTabs: document.getElementById('categoryTabs'),
        productModal: document.getElementById('productModal'),
        cartPanel: document.getElementById('cartPanel'),
        cartOverlay: document.getElementById('cartOverlay'),
        cartCount: document.getElementById('cartCount'),
        wishlistCount: document.getElementById('wishlistCount'),
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState')
    };
    
    // ====================
    // SUPABASE CLIENT
    // ====================
    function getSupabaseClient() {
        if (window.supabase?.createClient) {
            return window.supabase.createClient(
                window.JMPOTTERS_CONFIG.supabase.url,
                window.JMPOTTERS_CONFIG.supabase.key
            );
        }
        return null;
    }
    
    // ====================
    // UTILITIES
    // ====================
    function formatPrice(price) {
        return `₦${parseInt(price || 0).toLocaleString()}`;
    }
    
    function getImageUrl(categorySlug, imageFilename) {
        if (!imageFilename) return window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
        const folder = window.JMPOTTERS_CONFIG.images.paths[categorySlug] || '';
        return window.JMPOTTERS_CONFIG.images.baseUrl + folder + imageFilename;
    }
    
    function showNotification(message, type = 'success') {
        // Your existing notification code
        console.log(`${type}: ${message}`);
    }
    
    // ====================
    // LOAD ALL PRODUCTS
    // ====================
    async function loadAllProducts() {
        showLoading();
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showError('Database connection failed');
            return;
        }
        
        try {
            // Get all categories first
            const { data: categories, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug');
            
            if (catError) throw catError;
            
            // Create category map
            const categoryMap = {};
            categories.forEach(cat => {
                categoryMap[cat.id] = cat;
            });
            
            // Get all active products
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) throw prodError;
            
            // Attach category info to products
            state.products = products.map(product => ({
                ...product,
                category_slug: categoryMap[product.category_id]?.slug || 'unknown',
                category_name: categoryMap[product.category_id]?.name || 'Unknown'
            }));
            
            state.filteredProducts = state.products;
            
            renderCategoryTabs();
            renderProducts();
            hideLoading();
            
        } catch (error) {
            console.error('Error loading products:', error);
            showError('Failed to load products');
        }
    }
    
    // ====================
    // RENDER CATEGORY TABS
    // ====================
    function renderCategoryTabs() {
        if (!elements.categoryTabs) return;
        
        let html = '';
        window.JMPOTTERS_CONFIG.categories.forEach(cat => {
            const count = cat.id === 'all' 
                ? state.products.length 
                : state.products.filter(p => p.category_slug === cat.id).length;
            
            html += `
                <button class="category-tab ${state.currentCategory === cat.id ? 'active' : ''}" 
                        data-category="${cat.id}">
                    <i class="${cat.icon}"></i>
                    <span>${cat.name}</span>
                    <span class="count">(${count})</span>
                </button>
            `;
        });
        
        elements.categoryTabs.innerHTML = html;
        
        // Add click handlers
        elements.categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
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
    // RENDER PRODUCTS GRID
    // ====================
    function renderProducts() {
        if (!elements.productsGrid) return;
        
        if (state.filteredProducts.length === 0) {
            elements.productsGrid.innerHTML = `
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
                             onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                data-action="wishlist"
                                data-product-id="${product.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span class="category-badge">${product.category_name}</span>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-price">${formatPrice(product.price)}</div>
                        <div class="stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                            <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                            ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                        <button class="quick-view-btn" data-product-id="${product.id}">
                            <i class="fas fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        elements.productsGrid.innerHTML = html;
        
        setupProductInteractions();
    }
    
    // ====================
    // PRODUCT MODAL (replaces product.html)
    // ====================
    async function openProductModal(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        
        state.selectedProduct = product;
        
        // Load colors and sizes for this product
        const supabase = getSupabaseClient();
        
        const [colorsResult, sizesResult] = await Promise.all([
            supabase.from('product_colors').select('*').eq('product_id', product.id).order('sort_order'),
            supabase.from('product_sizes').select('*').eq('product_id', product.id).order('size_value')
        ]);
        
        state.productColors = colorsResult.data || [];
        state.productSizes = sizesResult.data || [];
        state.selectedColor = null;
        state.selectedSize = null;
        state.selectedQuantity = 1;
        
        renderProductModal();
    }
    
    function renderProductModal() {
        if (!elements.productModal) return;
        
        const product = state.selectedProduct;
        const isFootwear = ['mensfootwear', 'womensfootwear'].includes(product.category_slug);
        const imageUrl = getImageUrl(product.category_slug, product.image_url);
        
        elements.productModal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close"><i class="fas fa-times"></i></button>
                
                <div class="modal-body">
                    <!-- Left: Images -->
                    <div class="modal-images">
                        <img src="${imageUrl}" alt="${product.name}" class="main-image">
                    </div>
                    
                    <!-- Right: Details -->
                    <div class="modal-details">
                        <h2>${product.name}</h2>
                        <div class="price">${formatPrice(product.price)}</div>
                        
                        <div class="stock-info ${product.stock > 0 ? '' : 'out'}">
                            <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                            ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                        
                        <div class="description">
                            ${product.description || 'Premium quality product from JMPOTTERS.'}
                        </div>
                        
                        ${isFootwear && state.productColors.length > 0 ? `
                            <div class="variant-section">
                                <h4>Select Color</h4>
                                <div class="color-options" id="modalColorOptions">
                                    ${state.productColors.map(color => `
                                        <div class="color-option" 
                                             data-color-id="${color.id}"
                                             data-color-name="${color.color_name}"
                                             style="background-color: ${color.color_code || '#666'}">
                                            ${color.color_name}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="variant-section">
                                <h4>Select Size</h4>
                                <div class="size-options" id="modalSizeOptions">
                                    <div class="no-selection">Select a color first</div>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="quantity-section">
                            <h4>Quantity</h4>
                            <div class="quantity-controls">
                                <button class="quantity-btn minus">-</button>
                                <input type="number" id="modalQuantity" value="1" min="1" max="${product.stock}" class="quantity-input">
                                <button class="quantity-btn plus">+</button>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-primary btn-add-cart" id="modalAddToCart">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                            <button class="btn btn-secondary btn-wishlist ${state.wishlist.some(w => w.id === product.id) ? 'active' : ''}" 
                                    id="modalWishlist">
                                <i class="fas fa-heart"></i> 
                                ${state.wishlist.some(w => w.id === product.id) ? 'In Wishlist' : 'Add to Wishlist'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        elements.productModal.classList.add('active');
        
        setupModalInteractions();
    }
    
    // ====================
    // CART FUNCTIONS (unified)
    // ====================
    function addToCart(product, quantity = 1, options = {}) {
        const cartItem = {
            product_id: product.id,
            quantity: quantity,
            name: product.name,
            price: product.price,
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
        showNotification('Added to cart!', 'success');
    }
    
    function updateCartUI() {
        const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (elements.cartCount) {
            elements.cartCount.textContent = totalItems;
            elements.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        if (elements.wishlistCount) {
            elements.wishlistCount.textContent = state.wishlist.length;
            elements.wishlistCount.style.display = state.wishlist.length > 0 ? 'flex' : 'none';
        }
        
        renderCartPanel();
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function init() {
        console.log('🚀 Initializing Unified JMPOTTERS...');
        
        // Load all products
        await loadAllProducts();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update cart UI
        updateCartUI();
        
        console.log('✅ Unified JMPOTTERS ready!');
    }
    
    function setupEventListeners() {
        // Cart toggle
        document.getElementById('cartBtn')?.addEventListener('click', openCart);
        
        // Close modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || 
                e.target === elements.productModal) {
                closeModal();
            }
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeCart();
            }
        });
    }
    
    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
