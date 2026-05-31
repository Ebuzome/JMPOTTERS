// Replace your entire app.js with this version - FIXED CHECKOUT

// ====================
// JMPOTTERS APP - COMPLETE WITH FIXED CHECKOUT
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting...');
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
    
    function showNotification(message, type = 'success') {
        console.log(`${type.toUpperCase()}: ${message}`);
        let container = document.getElementById('jmpottersNotificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'jmpottersNotificationContainer';
            container.style.cssText = `position: fixed; top: 80px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 12px; pointer-events: none;`;
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        const colors = {
            success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
            error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
            warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
            info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }
        };
        const color = colors[type];
        notification.style.cssText = `background: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 12px; padding: 14px 18px; min-width: 280px; max-width: 380px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; animation: slideIn 0.3s ease; pointer-events: auto; color: ${color.text}; font-size: 0.875rem; font-weight: 500;`;
        notification.innerHTML = `<span>${message}</span><button style="background:none;border:none;margin-left:auto;cursor:pointer;opacity:0.6" onclick="this.parentElement.remove()">✕</button>`;
        container.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `@keyframes slideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }`;
    document.head.appendChild(style);
    
    // ====================
    // SUPABASE CLIENT
    // ====================
    function getSupabaseClient() {
        if (window.JMPOTTERS_SUPABASE_CLIENT) return window.JMPOTTERS_SUPABASE_CLIENT;
        if (window.supabase && window.supabase.createClient) {
            const config = window.JMPOTTERS_CONFIG.supabase;
            window.JMPOTTERS_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.key);
            console.log('✅ Supabase client ready');
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        console.error('❌ Supabase not loaded');
        return null;
    }
    
    // ====================
    // CART FUNCTIONS
    // ====================
    let cartUpdateCallback = null;
    
    function getCart() {
        return JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
    }
    
    function saveCart(cart) {
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartUI();
        if (cartUpdateCallback) cartUpdateCallback();
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
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        const wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) {
            wishlistCount.textContent = wishlist.length;
            wishlistCount.style.display = wishlist.length > 0 ? 'flex' : 'none';
        }
        
        // Update cart panel content
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
            
            // Attach remove handlers
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
    
    function toggleWishlist(product) {
        let wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const exists = wishlist.some(item => item.id === product.id);
        if (exists) {
            wishlist = wishlist.filter(item => item.id !== product.id);
            showNotification(`${product.name} removed from wishlist`, 'info');
        } else {
            wishlist.push({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
            showNotification(`${product.name} added to wishlist!`, 'success');
        }
        localStorage.setItem('jmpotters_wishlist', JSON.stringify(wishlist));
        updateCartUI();
    }
    
    // ====================
    // CHECKOUT SIGNUP MODAL
    // ====================
    let pendingCheckoutData = null;
    
    function showCheckoutSignupModal() {
        const modal = document.getElementById('checkoutSignupModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeCheckoutSignupModal() {
        const modal = document.getElementById('checkoutSignupModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    async function saveCheckoutUser(userData) {
        const supabase = getSupabaseClient();
        if (!supabase) return null;
        
        try {
            const { data: existing } = await supabase
                .from('user_profiles')
                .select('id, email, full_name, phone, address, city, state')
                .eq('email', userData.email)
                .maybeSingle();
            
            if (existing) {
                const { data: updated } = await supabase
                    .from('user_profiles')
                    .update({ full_name: userData.fullName, phone: userData.phone, address: userData.address, city: userData.city, state: userData.state, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)
                    .select()
                    .single();
                localStorage.setItem('jmpotters_user', JSON.stringify(updated));
                showNotification(`Welcome back ${updated.full_name}!`, 'success');
                return updated;
            } else {
                const { data: newUser } = await supabase
                    .from('user_profiles')
                    .insert({ email: userData.email, full_name: userData.fullName, phone: userData.phone, address: userData.address, city: userData.city, state: userData.state, role: 'customer' })
                    .select()
                    .single();
                localStorage.setItem('jmpotters_user', JSON.stringify(newUser));
                showNotification(`Welcome to JMPOTTERS, ${newUser.full_name}! 🎉`, 'success');
                return newUser;
            }
        } catch (error) {
            console.error('Signup error:', error);
            showNotification('Signup failed. Please try again.', 'error');
            return null;
        }
    }
    
    async function handleCheckoutSignup(event) {
        event.preventDefault();
        
        const userData = {
            fullName: document.getElementById('checkoutFullName')?.value.trim() || '',
            email: document.getElementById('checkoutEmail')?.value.trim() || '',
            phone: document.getElementById('checkoutPhone')?.value.trim() || '',
            address: document.getElementById('checkoutAddress')?.value.trim() || '',
            city: document.getElementById('checkoutCity')?.value.trim() || '',
            state: document.getElementById('checkoutState')?.value || ''
        };
        
        if (!userData.fullName || !userData.email || !userData.phone || !userData.address || !userData.city || !userData.state) {
            showNotification('Please fill in all fields', 'warning');
            return;
        }
        
        const savedUser = await saveCheckoutUser(userData);
        if (savedUser) {
            closeCheckoutSignupModal();
            pendingCheckoutData = {
                user_id: savedUser.id,
                email: savedUser.email,
                full_name: savedUser.full_name,
                phone: savedUser.phone,
                address: userData.address,
                city: userData.city,
                state: userData.state
            };
            await proceedToCheckout();
        }
    }
    
    // ====================
    // ORDER CREATION - SIMPLIFIED & FIXED
    // ====================
    async function createOrder(orderData, cart) {
        console.log('Creating order with data:', orderData);
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showNotification('Database connection error', 'error');
            return null;
        }
        
        try {
            const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
            const shippingFee = subtotal >= 50000 ? 0 : 2000;
            const grandTotal = subtotal + shippingFee;
            const orderNumber = 'JMP-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
            
            const items = cart.map(item => ({
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                color_name: item.color_name,
                size_value: item.size_value,
                image_url: item.image_url
            }));
            
            const orderInsert = {
                order_number: orderNumber,
                user_id: orderData.user_id,
                user_name: orderData.full_name,
                user_email: orderData.email,
                user_phone: orderData.phone,
                full_name: orderData.full_name,
                shipping_address: orderData.address,
                city: orderData.city,
                state: orderData.state,
                total_amount: subtotal,
                shipping_fee: shippingFee,
                grand_total: grandTotal,
                status: 'pending',
                payment_status: 'pending',
                payment_method: 'whatsapp',
                items: items,
                created_at: new Date().toISOString()
            };
            
            console.log('Inserting order:', orderInsert);
            
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(orderInsert)
                .select()
                .single();
            
            if (orderError) {
                console.error('Order insert error:', orderError);
                showNotification(`Order failed: ${orderError.message}`, 'error');
                return null;
            }
            
            localStorage.removeItem('jmpotters_cart');
            updateCartUI();
            
            showNotification(`Order #${orderNumber} placed successfully!`, 'success');
            return order;
            
        } catch (error) {
            console.error('Order creation error:', error);
            showNotification(`Failed to place order: ${error.message}`, 'error');
            return null;
        }
    }
    
    // ====================
    // PROCEED TO CHECKOUT - FIXED (NO INFINITE LOOP)
    // ====================
    async function proceedToCheckout() {
        console.log('🔍 proceedToCheckout called');
        
        const cart = getCart();
        console.log('Cart items:', cart.length);
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'warning');
            return;
        }
        
        const user = JSON.parse(localStorage.getItem('jmpotters_user'));
        console.log('User logged in:', !!user);
        
        let checkoutData;
        
        if (pendingCheckoutData) {
            checkoutData = pendingCheckoutData;
            pendingCheckoutData = null;
        } else if (user && user.address) {
            checkoutData = {
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                address: user.address,
                city: user.city,
                state: user.state
            };
        } else {
            console.log('Showing signup modal');
            showCheckoutSignupModal();
            return;
        }
        
        console.log('Creating order...');
        showNotification('Processing your order...', 'info');
        
        const order = await createOrder(checkoutData, cart);
        
        if (order) {
            console.log('Order created, redirecting to invoice');
            window.location.href = `invoice.html?order=${order.order_number}`;
        }
    }
    
    // ====================
    // SETUP CHECKOUT BUTTONS
    // ====================
    function setupCheckoutButtons() {
        console.log('Setting up checkout buttons');
        
        // Setup the main checkout button
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            // Remove all existing listeners by cloning
            const newBtn = checkoutBtn.cloneNode(true);
            checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Checkout button clicked');
                proceedToCheckout();
            });
            console.log('Checkout button attached');
        } else {
            console.log('Checkout button not found in DOM');
        }
    }
    
    // ====================
    // PRODUCT LOADING (simplified)
    // ====================
    let currentProduct = null;
    let currentSelectedQuantity = 1;
    let currentSelectedColor = null;
    let currentSelectedSize = null;
    let currentProductColors = [];
    let currentProductSizes = [];
    let colorSizeMap = {};
    
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
            
            currentProduct = product;
            
            // Setup quantity controls
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
                addToCart(currentProduct, qty);
            });
            
            if (loadingState) loadingState.style.display = 'none';
        } catch (error) {
            console.error(error);
            if (loadingState) loadingState.style.display = 'none';
            productViewer.innerHTML = '<div class="error-message">Product not found</div>';
        }
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS...');
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('Supabase not available');
        }
        
        updateCartUI();
        
        // Setup header cart icon
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.addEventListener('click', openCart);
        }
        
        const wishlistIcon = document.getElementById('wishlistIcon');
        if (wishlistIcon) {
            wishlistIcon.addEventListener('click', () => showNotification('Wishlist coming soon', 'info'));
        }
        
        // Setup close cart handlers
        const closeCartBtn = document.querySelector('.close-cart');
        const cartOverlay = document.getElementById('cartOverlay');
        if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
        if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
        
        // Setup checkout modal
        const modalForm = document.getElementById('checkoutSignupForm');
        if (modalForm) {
            modalForm.removeEventListener('submit', handleCheckoutSignup);
            modalForm.addEventListener('submit', handleCheckoutSignup);
        }
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeCheckoutSignupModal);
        const cancelBtn = document.getElementById('cancelCheckoutBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeCheckoutSignupModal);
        
        // Setup checkout button after a short delay
        setTimeout(() => {
            setupCheckoutButtons();
        }, 500);
        
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
    
    console.log('✅ JMPOTTERS app loaded');
})();
