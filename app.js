// ====================
// JMPOTTERS APP - UNIFIED SINGLE PAGE VERSION
// WITH PRODUCT CARD REDIRECT TO PRODUCT.HTML
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
        if (productsGrid) productsGrid.innerHTML = '';
        
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
                <i class="fas fa-th-large"></i>
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
            if (cat.slug.includes('footwear')) {
                if (cat.slug.includes('mens')) icon = 'fa-solid fa-shoe-prints';
                else icon = 'fa-solid fa-shoe-prints';
            }
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
    // RENDER PRODUCTS GRID - WITH CLICKABLE CARDS THAT REDIRECT TO PRODUCT.HTML
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
        
        // Add CSS for clickable cards if not already present
        if (!document.getElementById('product-card-css')) {
            const style = document.createElement('style');
            style.id = 'product-card-css';
            style.textContent = `
                .product-card-wrapper {
                    text-decoration: none;
                    color: inherit;
                    display: block;
                }
                .product-card-wrapper:hover .product-card {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
                .product-card {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
        
        let html = '<div class="products-grid">';
        
        state.filteredProducts.forEach(product => {
            const imageUrl = getImageUrl(product.category_slug, product.image_url);
            const isInWishlist = state.wishlist.some(item => item.id === product.id);
            
            // Create product card wrapper - this makes the whole card clickable
            html += `
                <a href="product.html?slug=${encodeURIComponent(product.slug || product.id)}" class="product-card-wrapper">
                    <div class="product-card" data-product-id="${product.id}">
                        <div class="product-image" style="position: relative; height: 250px; overflow: hidden;">
                            <img src="${imageUrl}" alt="${product.name}" 
                                 style="width: 100%; height: 100%; object-fit: cover;"
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
                            <h3 class="product-title" style="margin: 0 0 10px 0; font-size: 1.1rem; color: #000; font-weight: 600;">${product.name}</h3>
                            <div class="product-price" style="margin-bottom: 8px;">
                                <span class="price-real" style="font-size: 1.2rem; font-weight: bold; color: #d4af37;">${formatPrice(product.price)}</span>
                            </div>
                            <div class="stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}" style="display: flex; align-items: center; gap: 5px; color: ${product.stock > 0 ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem;">
                                <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                                ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                            </div>
                        </div>
                    </div>
                </a>
            `;
        });
        
        html += '</div>';
        productsGrid.innerHTML = html;
        
        setupWishlistInteractions();
    }
    
    // ====================
    // WISHLIST INTERACTIONS (separate from card click)
    // ====================
    function setupWishlistInteractions() {
        // Wishlist buttons - need to stop propagation so they don't trigger the card link
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
        
        // Update all wishlist buttons for this product
        document.querySelectorAll(`[data-product-id="${product.id}"]`).forEach(btn => {
            if (btn.classList.contains('wishlist-btn')) {
                btn.classList.toggle('active');
                btn.style.color = btn.classList.contains('active') ? '#e74c3c' : 'white';
            }
        });
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
            checkoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
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
        addToCart,
        toggleWishlist,
        formatPrice
    };
    
})();
