// ====================
// ULTRA-SAFE JMPOTTERS APP - FIXED VERSION
// ====================
(function() {
    'use strict';
    
    // Prevent duplicate initialization
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting...');
    window.JMPOTTERS_APP_INITIALIZED = true;
    
    // ====================
    // CONFIGURATION - DEFINE HERE TO ENSURE IT EXISTS
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
            'accessories': 'accessories/'
        }
    };
    
    if (!window.JMPOTTERS_CONFIG.currentCategory) {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        
        const pageToCategory = {
            'mensfootwear': 'mensfootwear',
            'womensfootwear': 'womensfootwear',
            'bags': 'bags',
            'household': 'household',
            'kids': 'kids',
            'accessories': 'accessories'
        };
        
        window.JMPOTTERS_CONFIG.currentCategory = pageToCategory[page] || 'accessories';
    }
    
    console.log('⚙️ Configuration loaded:', window.JMPOTTERS_CONFIG);
    
    // ====================
    // GET SUPABASE CLIENT
    // ====================
    function getSupabaseClient() {
        if (window.JMPOTTERS_SUPABASE_CLIENT) {
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        
        if (window.supabase && window.supabase.createClient) {
            const config = window.JMPOTTERS_CONFIG.supabase;
            if (!config || !config.url || !config.key) {
                console.error('❌ Supabase configuration missing');
                return null;
            }
            
            try {
                window.JMPOTTERS_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.key);
                console.log('✅ Created new Supabase client');
                return window.JMPOTTERS_SUPABASE_CLIENT;
            } catch (error) {
                console.error('❌ Failed to create Supabase client:', error);
                return null;
            }
        }
        
        console.error('❌ Supabase library not loaded');
        return null;
    }
    
    // ====================
    // UTILITY FUNCTIONS
    // ====================
    function getImageUrl(categorySlug, imageFilename) {
        if (!imageFilename) {
            return window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
        }
        
        const config = window.JMPOTTERS_CONFIG.images;
        const folder = config.paths[categorySlug] || '';
        return config.baseUrl + folder + imageFilename;
    }
    
    function showNotification(message, type = 'success') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Create or update notification
        let notification = document.getElementById('jmpotters-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'jmpotters-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#4CAF50' : '#f44336'};
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                z-index: 9999;
                animation: fadeInOut 3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.background = type === 'success' ? '#4CAF50' : '#f44336';
        
        // Show notification
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    // Add notification animation
    if (!document.querySelector('#jmpotters-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'jmpotters-notification-styles';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-20px); }
                10% { opacity: 1; transform: translateY(0); }
                90% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ====================
    // ENHANCED RENDER FUNCTION - PRESERVES YOUR CSS
    // ====================
    function renderProducts(products, categorySlug) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            console.error('❌ productsGrid not found');
            return;
        }
        
        // If productsGrid already has children (your original structure), enhance them
        const existingCards = productsGrid.querySelectorAll('.product-card');
        
        if (existingCards.length > 0) {
            console.log('🔄 Enhancing existing product cards...');
            enhanceExistingCards(products, categorySlug);
        } else {
            console.log('🔄 Creating new product cards with your CSS structure...');
            createCardsWithYourCSS(products, categorySlug);
        }
        
        console.log(`✅ Rendered ${products.length} products`);
    }
    
    // Option 1: Enhance existing HTML cards (preserves your CSS exactly)
    function enhanceExistingCards(products, categorySlug) {
        const productCards = document.querySelectorAll('.product-card');
        
        products.forEach((product, index) => {
            if (index >= productCards.length) return;
            
            const card = productCards[index];
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            const placeholderUrl = window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
            
            // Update product image
            const img = card.querySelector('.product-image img');
            if (img) {
                img.src = imageUrl;
                img.alt = product.name;
                img.onerror = function() {
                    this.onerror = null;
                    this.src = placeholderUrl;
                };
            }
            
            // Update product name
            const nameEl = card.querySelector('.product-name, h3, .product-title');
            if (nameEl) nameEl.textContent = product.name;
            
            // Update product price
            const priceEl = card.querySelector('.product-price, .price');
            if (priceEl) priceEl.textContent = `₦${product.price.toLocaleString()}`;
            
            // Update product description (if hidden)
            const descEl = card.querySelector('.product-description, .description');
            if (descEl) descEl.textContent = product.description || '';
            
            // Update stock info
            const stockEl = card.querySelector('.product-stock, .stock');
            if (stockEl) {
                stockEl.textContent = product.stock > 0 ? `${product.stock} available` : 'Out of stock';
            }
            
            // Add data attributes for JavaScript functions
            card.dataset.productId = product.id;
            card.dataset.productName = product.name;
            card.dataset.productPrice = product.price;
            card.dataset.categorySlug = categorySlug;
            card.dataset.imageUrl = product.image_url;
            
            // Update buttons with correct event handlers
            updateCardButtons(card, product.id);
        });
    }
    
    // Option 2: Create new cards matching your CSS structure
    function createCardsWithYourCSS(products, categorySlug) {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = ''; // Clear if no existing structure
        
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        
        products.forEach(product => {
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            const placeholderUrl = window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            // THIS STRUCTURE MATCHES YOUR ORIGINAL CSS CLASSES
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.productId = product.id;
            
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="this.onerror=null; this.src='${placeholderUrl}'">
                    <button class="wishlist-toggle ${isInWishlist ? 'active' : ''}" 
                            onclick="window.JMPOTTERS.toggleWishlist(${product.id})"
                            data-product-id="${product.id}">
                        <i class="${isInWishlist ? 'fas fa-heart' : 'far fa-heart'}"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">₦${product.price.toLocaleString()}</div>
                    <div class="product-actions">
                        <button class="btn btn-primary add-to-cart" 
                                onclick="window.JMPOTTERS.addToCart(${product.id})">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                        <a href="https://wa.me/2348139583320?text=I'm interested in ${encodeURIComponent(product.name)} - ₦${product.price}" 
                           class="btn btn-whatsapp" target="_blank">
                            <i class="fab fa-whatsapp"></i> Buy Now
                        </a>
                    </div>
                    <div class="product-description" style="display: none;">
                        <p>${product.description || 'No description available.'}</p>
                        <p><strong>Stock:</strong> ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p>
                    </div>
                </div>
            `;
            
            productsGrid.appendChild(productCard);
        });
    }
    
    function updateCardButtons(card, productId) {
        // Update wishlist button
        const wishlistBtn = card.querySelector('.wishlist-toggle, .wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.onclick = () => window.JMPOTTERS.toggleWishlist(productId);
            wishlistBtn.dataset.productId = productId;
        }
        
        // Update cart button
        const cartBtn = card.querySelector('.add-to-cart, .cart-btn');
        if (cartBtn) {
            cartBtn.onclick = () => window.JMPOTTERS.addToCart(productId);
        }
        
        // Update WhatsApp button
        const whatsappBtn = card.querySelector('.btn-whatsapp, .whatsapp-btn');
        if (whatsappBtn && whatsappBtn.tagName === 'A') {
            const productName = card.dataset.productName;
            const productPrice = card.dataset.productPrice;
            whatsappBtn.href = `https://wa.me/2348139583320?text=I'm interested in ${encodeURIComponent(productName)} - ₦${productPrice}`;
        }
    }
    
    // ====================
    // PRODUCT FUNCTIONS
    // ====================
    async function loadProductsByCategory(categorySlug) {
        console.log(`📦 Loading products for: ${categorySlug}`);
        
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            console.error('❌ Products grid not found');
            return;
        }
        
        // Show loading - BUT DON'T DESTROY EXISTING STRUCTURE
        const loadingHTML = `
            <div class="loading-spinner" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                <p>Loading ${categorySlug} from database...</p>
            </div>
        `;
        
        const existingContent = productsGrid.innerHTML;
        productsGrid.innerHTML = loadingHTML;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = existingContent; // Restore original
            showNotification('Database connection error', 'error');
            return;
        }
        
        try {
            console.log('🔍 Fetching category from Supabase...');
            
            // Get category ID
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name')
                .eq('slug', categorySlug)
                .single();
            
            if (catError) throw catError;
            if (!category) throw new Error(`Category "${categorySlug}" not found`);
            
            console.log(`✅ Found category: ${category.name} (ID: ${category.id})`);
            
            // Get products
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('category_id', category.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) throw prodError;
            
            console.log(`✅ Loaded ${products?.length || 0} products`);
            
            if (!products || products.length === 0) {
                showNoProducts();
                return;
            }
            
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = existingContent; // Restore original on error
            showNotification('Failed to load products', 'error');
        }
    }
    
    function showNoProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = `
            <div class="no-products" style="text-align: center; padding: 40px;">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc;"></i>
                <h3>No Products Found</h3>
                <p>No products available in this category yet.</p>
            </div>
        `;
    }
    
    // ====================
    // CART FUNCTIONS (UNCHANGED)
    // ====================
    async function addToCart(productId) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                showNotification('Database not connected', 'error');
                return;
            }
            
            const { data: product, error } = await supabase
                .from('products')
                .select('*, categories(slug)')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            
            if (product.stock < 1) {
                showNotification('Product out of stock!', 'error');
                return;
            }
            
            let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
            const existingItem = cart.find(item => item.product_id === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    showNotification('Maximum stock reached!', 'error');
                    return;
                }
                existingItem.quantity += 1;
            } else {
                cart.push({
                    product_id: productId,
                    quantity: 1,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    category_slug: product.categories?.slug || 'products'
                });
            }
            
            localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
            updateCartUI();
            showNotification('✅ Added to cart!', 'success');
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            showNotification('Failed to add to cart', 'error');
        }
    }
    
    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        updateCartPanel();
    }
    
    function updateCartPanel() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const whatsappCheckout = document.getElementById('whatsappCheckout');
        
        if (!cartItems || !cartTotal) return;
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
            cartTotal.textContent = '₦0';
            if (whatsappCheckout) whatsappCheckout.href = '#';
            return;
        }
        
        let html = '';
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            html += `
                <div class="cart-item">
                    <img src="${getImageUrl(item.category_slug, item.image_url)}" alt="${item.name}">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₦${item.price.toLocaleString()} × ${item.quantity}</div>
                    </div>
                    <div class="cart-item-total">₦${itemTotal.toLocaleString()}</div>
                    <button onclick="window.JMPOTTERS.removeFromCart(${item.product_id})" class="cart-item-remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        cartItems.innerHTML = html;
        cartTotal.textContent = `₦${total.toLocaleString()}`;
        
        if (whatsappCheckout) {
            let text = "I would like to purchase:\n";
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                text += `- ${item.name} (${item.quantity} × ₦${item.price.toLocaleString()}) = ₦${itemTotal.toLocaleString()}\n`;
            });
            text += `\n*Total: ₦${total.toLocaleString()}*\n\nPlease confirm order & shipping details.`;
            whatsappCheckout.href = `https://wa.me/2348139583320?text=${encodeURIComponent(text)}`;
        }
    }
    
    function removeFromCart(productId) {
        let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        cart = cart.filter(item => item.product_id !== productId);
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        
        updateCartUI();
        showNotification('Item removed from cart', 'info');
    }
    
    // ====================
    // WISHLIST FUNCTIONS
    // ====================
    function toggleWishlist(productId) {
        let wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const index = wishlist.findIndex(item => item.id === productId);
        const wishlistBtn = document.querySelector(`[data-product-id="${productId}"]`);
        
        if (index === -1) {
            // Add to wishlist
            wishlist.push({ id: productId });
            if (wishlistBtn) {
                wishlistBtn.classList.add('active');
                wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';
            }
            showNotification('Added to wishlist', 'success');
        } else {
            // Remove from wishlist
            wishlist.splice(index, 1);
            if (wishlistBtn) {
                wishlistBtn.classList.remove('active');
                wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
            }
            showNotification('Removed from wishlist', 'info');
        }
        
        localStorage.setItem('jmpotters_wishlist', JSON.stringify(wishlist));
        updateWishlistUI();
    }
    
    function updateWishlistUI() {
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const wishlistCount = document.getElementById('wishlistCount');
        
        if (wishlistCount) {
            wishlistCount.textContent = wishlist.length;
            wishlistCount.style.display = wishlist.length > 0 ? 'flex' : 'none';
        }
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        
        // Initialize UI
        updateCartUI();
        updateWishlistUI();
        
        // Load products if on category page
        const currentCategory = window.JMPOTTERS_CONFIG.currentCategory;
        if (document.getElementById('productsGrid')) {
            await loadProductsByCategory(currentCategory);
        }
        
        console.log('✅ JMPOTTERS page initialized');
    }
    
    // ====================
    // EXPOSE TO WINDOW OBJECT
    // ====================
    if (!window.JMPOTTERS) {
        window.JMPOTTERS = {
            addToCart,
            toggleWishlist,
            removeFromCart,
            initializePage
        };
    }
    
    // ====================
    // START THE APP
    // ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
    
    console.log('✅ JMPOTTERS app loaded successfully');
})();
