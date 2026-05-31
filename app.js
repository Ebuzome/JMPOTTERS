// ====================
// JMPOTTERS APP - DEBUG VERSION (Checkout Fix)
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting - DEBUG MODE');
    window.JMPOTTERS_APP_INITIALIZED = true;
    
    // ====================
    // CONFIGURATION
    // ====================
    if (!window.JMPOTTERS_CONFIG) {
        window.JMPOTTERS_CONFIG = {};
    }
    
    window.JMPOTTERS_CONFIG.supabase = {
        url: 'https://tmpggeeuwdvlngvfncaa.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'
    };
    
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
    // UTILITY FUNCTIONS
    // ====================
    function showNotification(message, type = 'success') {
        console.log(`${type}: ${message}`);
        const toast = document.createElement('div');
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:12px 20px;border-radius:8px;z-index:10000;font-size:14px;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    function getImageUrl(categorySlug, imageFilename) {
        if (!imageFilename) return window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
        if (imageFilename.startsWith('http')) return imageFilename;
        const config = window.JMPOTTERS_CONFIG.images;
        const folder = config.paths[categorySlug] || '';
        return config.baseUrl + folder + imageFilename;
    }
    
    function formatPrice(price) {
        if (!price && price !== 0) return '₦0';
        return `₦${parseInt(price).toLocaleString()}`;
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function getCurrentCategory() {
        if (window.JMPOTTERS_CONFIG && window.JMPOTTERS_CONFIG.currentCategory) {
            return window.JMPOTTERS_CONFIG.currentCategory;
        }
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        const pageToCategory = {
            'mensfootwear': 'mensfootwear',
            'womensfootwear': 'womensfootwear',
            'bags': 'bags',
            'household': 'household',
            'kids': 'kids',
            'accessories': 'accessories',
            'healthcare': 'healthcare',
            'product': 'mensfootwear'
        };
        return pageToCategory[page] || 'mensfootwear';
    }
    
    function isProductPage() {
        return window.location.pathname.includes('product.html');
    }
    
    function getSlugFromURL() {
        if (!isProductPage()) return null;
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('slug') ? decodeURIComponent(urlParams.get('slug')) : null;
    }
    
    function getSupabaseClient() {
        if (window.JMPOTTERS_SUPABASE_CLIENT) return window.JMPOTTERS_SUPABASE_CLIENT;
        if (window.supabase && window.supabase.createClient) {
            window.JMPOTTERS_SUPABASE_CLIENT = window.supabase.createClient(
                window.JMPOTTERS_CONFIG.supabase.url, 
                window.JMPOTTERS_CONFIG.supabase.key
            );
            console.log('✅ Supabase client ready');
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        console.error('❌ Supabase not loaded');
        return null;
    }
    
    // ====================
    // CART FUNCTIONS
    // ====================
    function getCart() {
        return JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
    }
    
    function saveCart(cart) {
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartUI();
    }
    
    function addToCart(product, quantity = 1, options = {}) {
        let cart = getCart();
        const cartItem = {
            product_id: product.id,
            quantity: quantity,
            name: product.name,
            price: product.price || 0,
            image_url: product.image_url,
            category_slug: options.category_slug || getCurrentCategory(),
            color_name: options.color_name || null,
            size_value: options.size_value || null
        };
        
        const existingIndex = cart.findIndex(item => 
            item.product_id === cartItem.product_id && 
            item.color_name === cartItem.color_name && 
            item.size_value === cartItem.size_value
        );
        
        if (existingIndex !== -1) {
            cart[existingIndex].quantity += quantity;
            showNotification(`Updated ${product.name} quantity`, 'info');
        } else {
            cart.push(cartItem);
            showNotification(`${product.name} added to cart!`, 'success');
        }
        
        saveCart(cart);
        openCart();
    }
    
    function updateCartUI() {
        const cart = getCart();
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (cartItems && cartTotal) {
            if (cart.length === 0) {
                cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
                cartTotal.textContent = '₦0';
                return;
            }
            
            let html = '';
            let total = 0;
            cart.forEach((item, index) => {
                const itemTotal = (item.price || 0) * item.quantity;
                total += itemTotal;
                let itemDesc = item.name;
                if (item.color_name) itemDesc += ` (${item.color_name})`;
                if (item.size_value) itemDesc += ` - ${item.size_value}`;
                html += `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${getImageUrl(item.category_slug, item.image_url)}" alt="${item.name}">
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-name">${escapeHtml(itemDesc)}</div>
                            <div class="cart-item-price">${formatPrice(item.price)}</div>
                            <div>Qty: ${item.quantity}</div>
                        </div>
                        <button class="cart-item-remove" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            cartItems.innerHTML = html;
            cartTotal.textContent = formatPrice(total);
            
            document.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', function() {
                    let cart = getCart();
                    cart.splice(parseInt(this.dataset.index), 1);
                    saveCart(cart);
                    showNotification('Item removed', 'info');
                });
            });
        }
    }
    
    function openCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartPanel) cartPanel.classList.add('active');
        if (cartOverlay) cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateCartUI();
    }
    
    function closeCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartPanel) cartPanel.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // ====================
    // CHECKOUT - SIMPLIFIED & DEBUGGED
    // ====================
    let isProcessingCheckout = false;
    
    // Simple test function to verify button click works
    function testCheckoutButton() {
        console.log('🔴 TEST: Checkout button was clicked!');
        alert('Checkout button works! Now checking cart...');
        
        const cart = getCart();
        console.log('Cart contains:', cart.length, 'items');
        alert(`Cart has ${cart.length} items`);
        
        if (cart.length === 0) {
            alert('Cart is empty! Add items first.');
            return false;
        }
        
        // Check if user exists
        const user = localStorage.getItem('jmpotters_user');
        console.log('User in localStorage:', user);
        
        alert('Checkout would proceed here. This is just a test to confirm the button works.');
        return true;
    }
    
    // Actual checkout function
    async function proceedToCheckout() {
        console.log('🔴 proceedToCheckout() called');
        
        // Prevent double execution
        if (isProcessingCheckout) {
            console.log('⚠️ Checkout already in progress, ignoring...');
            return;
        }
        
        const cart = getCart();
        console.log('Cart items count:', cart.length);
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'warning');
            return;
        }
        
        // Start processing
        isProcessingCheckout = true;
        showNotification('Processing checkout...', 'info');
        
        try {
            // Get user from localStorage
            let userData = localStorage.getItem('jmpotters_user');
            let user = userData ? JSON.parse(userData) : null;
            
            console.log('User found:', user ? user.email : 'No user');
            
            // For now, just simulate checkout to test the flow
            showNotification('Checkout simulation - would create order', 'success');
            
            // Uncomment this for real checkout:
            /*
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Database connection failed');
            
            // Calculate totals
            const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
            const shippingFee = subtotal >= 50000 ? 0 : 2000;
            const grandTotal = subtotal + shippingFee;
            const orderNumber = 'TEST-' + Date.now();
            
            const items = cart.map(item => ({
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                color_name: item.color_name,
                size_value: item.size_value
            }));
            
            const orderData = {
                order_number: orderNumber,
                user_email: user?.email || 'guest@example.com',
                full_name: user?.full_name || 'Guest User',
                user_phone: user?.phone || '',
                shipping_address: user?.address || 'No address',
                total_amount: subtotal,
                shipping_fee: shippingFee,
                grand_total: grandTotal,
                status: 'pending',
                payment_status: 'pending',
                items: items
            };
            
            console.log('Creating order:', orderData);
            
            const { data: order, error } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single();
            
            if (error) throw error;
            
            localStorage.removeItem('jmpotters_cart');
            updateCartUI();
            showNotification(`Order ${orderNumber} created!`, 'success');
            
            // Redirect to invoice
            window.location.href = `invoice.html?order=${orderNumber}`;
            */
            
        } catch (error) {
            console.error('Checkout error:', error);
            showNotification(error.message || 'Checkout failed', 'error');
        } finally {
            isProcessingCheckout = false;
        }
    }
    
    // ====================
    // PRODUCT LOADING
    // ====================
    async function loadProductsByCategory(categorySlug) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading products...</p></div>';
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = '<div class="error-message">Database connection error</div>';
            return;
        }
        
        try {
            const { data: category } = await supabase
                .from('categories')
                .select('id')
                .eq('slug', categorySlug)
                .single();
            
            if (!category) throw new Error('Category not found');
            
            const { data: products } = await supabase
                .from('products')
                .select('id, name, price, image_url, stock, slug')
                .eq('category_id', category.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (!products || products.length === 0) {
                productsGrid.innerHTML = '<div class="no-products">No products found</div>';
                return;
            }
            
            productsGrid.innerHTML = '';
            products.forEach(product => {
                const imageUrl = getImageUrl(categorySlug, product.image_url);
                const card = document.createElement('a');
                card.href = `product.html?slug=${product.slug}`;
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-image"><img src="${imageUrl}" alt="${product.name}" onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'"></div>
                    <div class="product-info"><h3>${escapeHtml(product.name)}</h3><div class="product-price">${formatPrice(product.price)}</div></div>
                `;
                productsGrid.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            productsGrid.innerHTML = '<div class="error-message">Error loading products</div>';
        }
    }
    
    async function loadSingleProductBySlug(slug) {
        const productViewer = document.getElementById('productViewer');
        const loadingState = document.getElementById('loadingState');
        
        if (!productViewer) return;
        if (loadingState) loadingState.style.display = 'block';
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            if (loadingState) loadingState.style.display = 'none';
            return;
        }
        
        try {
            const { data: product } = await supabase
                .from('products')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();
            
            if (!product) throw new Error('Product not found');
            
            const { data: category } = await supabase
                .from('categories')
                .select('slug')
                .eq('id', product.category_id)
                .single();
            
            const imageUrl = getImageUrl(category?.slug || 'mensfootwear', product.image_url);
            
            productViewer.innerHTML = `
                <div class="product-container">
                    <div class="product-image-section"><img src="${imageUrl}" alt="${product.name}" style="width:100%;border-radius:12px"></div>
                    <div class="product-details">
                        <h1>${escapeHtml(product.name)}</h1>
                        <div class="product-price">${formatPrice(product.price)}</div>
                        <p>${product.description || 'Premium quality product from JMPOTTERS.'}</p>
                        <div class="quantity-tile">
                            <div class="quantity-controls">
                                <button class="quantity-btn minus">-</button>
                                <input type="number" id="productQuantity" value="1" min="1" max="${product.stock || 100}">
                                <button class="quantity-btn plus">+</button>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="action-btn btn-add-cart" id="pageAddToCart">Add to Cart</button>
                            <button class="action-btn btn-wishlist" id="pageWishlist">Wishlist</button>
                        </div>
                    </div>
                </div>
            `;
            
            const qtyInput = document.getElementById('productQuantity');
            document.querySelector('.quantity-btn.minus')?.addEventListener('click', () => {
                let val = parseInt(qtyInput.value) || 1;
                if (val > 1) qtyInput.value = val - 1;
            });
            document.querySelector('.quantity-btn.plus')?.addEventListener('click', () => {
                let val = parseInt(qtyInput.value) || 1;
                if (val < (product.stock || 100)) qtyInput.value = val + 1;
            });
            
            document.getElementById('pageAddToCart')?.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                addToCart(currentProduct || product, qty);
            });
            
            if (loadingState) loadingState.style.display = 'none';
        } catch (error) {
            console.error(error);
            if (loadingState) loadingState.style.display = 'none';
            productViewer.innerHTML = '<div class="error-message">Product not found</div>';
        }
    }
    
    // ====================
    // INITIALIZATION WITH DEBUG BUTTON
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS...');
        
        updateCartUI();
        
        // Setup header cart icon
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.addEventListener('click', openCart);
        }
        
        // Setup close cart handlers
        const closeCartBtn = document.querySelector('.close-cart');
        const cartOverlay = document.getElementById('cartOverlay');
        if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
        if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
        
        // Setup checkout button with test function first
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            console.log('✅ Found checkout button, attaching test listener');
            
            // Remove any existing listeners by cloning
            const newBtn = checkoutBtn.cloneNode(true);
            checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);
            
            // First, attach a simple test listener to verify the button works
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔴 Checkout button CLICKED!');
                proceedToCheckout(); // Call the full function
            });
            
            console.log('✅ Checkout button attached');
        } else {
            console.log('❌ Checkout button NOT found in DOM!');
            console.log('Looking for element with id="checkoutButton"');
        }
        
        // Load products if on category page
        if (!isProductPage()) {
            const category = getCurrentCategory();
            if (document.getElementById('productsGrid')) {
                await loadProductsByCategory(category);
            }
        } else {
            const slug = getSlugFromURL();
            if (slug) {
                await loadSingleProductBySlug(slug);
            }
        }
        
        console.log('✅ JMPOTTERS ready');
    }
    
    // ====================
    // EXPOSE TO WINDOW
    // ====================
    window.JMPOTTERS = {
        addToCart,
        proceedToCheckout,
        openCart,
        closeCart,
        formatPrice,
        getImageUrl,
        loadProductsByCategory,
        loadSingleProductBySlug,
        updateCartUI
    };
    
    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
    
    console.log('✅ JMPOTTERS app loaded - DEBUG MODE');
})();
