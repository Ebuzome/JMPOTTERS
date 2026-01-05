// ====================
// ULTRA-SAFE JMPOTTERS APP
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
    // Define config if it doesn't exist
    if (!window.JMPOTTERS_CONFIG) {
        window.JMPOTTERS_CONFIG = {};
    }
    
    // Set Supabase configuration (ALWAYS set it here)
    window.JMPOTTERS_CONFIG.supabase = {
        url: 'https://tmpggeeuwdvlngvfncaa.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'
    };
    
    // Set image configuration
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
    
    // Set current category if not already set
    if (!window.JMPOTTERS_CONFIG.currentCategory) {
        // Try to detect from URL
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
            console.log('✅ Using existing Supabase client');
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        
        // Check if Supabase library is loaded
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
        
        const notification = document.createElement('div');
        notification.textContent = message;
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
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    // Add notification animation if not present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
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
    // PRODUCT FUNCTIONS
    // ====================
    async function loadProductsByCategory(categorySlug) {
        console.log(`📦 Loading products for: ${categorySlug}`);
        
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            console.error('❌ Products grid not found');
            return;
        }
        
        // Show loading
        productsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading ${categorySlug} from database...</p>
            </div>
        `;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Database Connection Error</h3>
                    <p>Failed to connect to Supabase. Please check your internet connection and refresh.</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
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
            
            if (catError) {
                console.error('❌ Category error:', catError);
                throw new Error(`Category "${categorySlug}" not found: ${catError.message}`);
            }
            
            if (!category) {
                throw new Error(`Category "${categorySlug}" does not exist in database`);
            }
            
            console.log(`✅ Found category: ${category.name} (ID: ${category.id})`);
            
            // Get products
            console.log('🔍 Fetching products from Supabase...');
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('category_id', category.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) {
                console.error('❌ Products error:', prodError);
                throw prodError;
            }
            
            console.log(`✅ Loaded ${products ? products.length : 0} products`);
            
            if (!products || products.length === 0) {
                showNoProducts();
                return;
            }
            
            // Debug: Log first product to verify data
            if (products.length > 0) {
                console.log('📝 Sample product data:', {
                    id: products[0].id,
                    name: products[0].name,
                    price: products[0].price,
                    image_url: products[0].image_url,
                    category_id: products[0].category_id
                });
            }
            
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error Loading Products</h3>
                    <p>${error.message || 'Failed to load products from database'}</p>
                    <p><small>Error details: ${error.toString()}</small></p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
        }
    }
    
    function renderProducts(products, categorySlug) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = '';
        
        products.forEach(product => {
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            const placeholderUrl = window.JMPOTTERS_CONFIG.images.baseUrl + 'placeholder.jpg';
            
            // Check if product is in wishlist
            const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            let productCardHTML = '';
            
            // Check which category to determine which styling to use
            if (categorySlug === 'mensfootwear') {
                // Use mensfootwear.html sophisticated styling
                // Generate fake price for display (₦5,000–₦10,000 higher than real price)
                const fakePrice = product.price + Math.floor(Math.random() * 5000) + 5000;
                const discount = Math.floor((fakePrice - product.price) / fakePrice * 100);
                
                productCardHTML = `
                    <div class="product-card" data-aos="fade-up">
                        <div class="product-image">
                            <div class="product-badge">-${discount}%</div>
                            <img src="${imageUrl}" alt="${product.name}" 
                                 loading="lazy"
                                 onerror="this.onerror=null; this.src='${placeholderUrl}'">
                            <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                    data-id="${product.id}">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <div class="product-price">
                                <del class="price-fake">₦${fakePrice.toLocaleString()}</del>
                                <span class="price-real">₦${product.price.toLocaleString()}</span>
                            </div>
                            <div class="availability">
                                <i class="fas fa-check-circle"></i> In Stock
                            </div>
                            <div class="sizes">
                                Sizes Available: <span>36 - 45</span>
                            </div>
                            
                            <!-- Quantity selector -->
                            <div class="quantity-selector">
                                <button class="toggle-bulk-options">
                                    Bulk Options <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="quantity-options">
                                    <div class="quantity-option selected" data-qty="1">1 Unit</div>
                                    <div class="quantity-option" data-qty="10">10 Units</div>
                                    <div class="quantity-option" data-qty="25">25 Units</div>
                                    <div class="quantity-option" data-qty="50">50 Units</div>
                                    <div class="quantity-option" data-qty="100">100 Units</div>
                                </div>
                            </div>
                            
                            <div class="action-buttons">
                                <button class="btn-add-cart" data-id="${product.id}">
                                    <i class="fas fa-shopping-cart"></i> Add to Cart
                                </button>
                                <button class="btn-view-details" data-id="${product.id}">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Use accessories.html styling (or default for other categories)
                productCardHTML = `
                    <div class="product-card">
                        <div class="product-image">
                            <img src="${imageUrl}" alt="${product.name}" 
                                 loading="lazy"
                                 onerror="this.onerror=null; this.src='${placeholderUrl}'">
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <div class="product-price">₦${product.price.toLocaleString()}</div>
                            <button class="product-toggle" onclick="window.JMPOTTERS.toggleProductDetails(${product.id})">
                                View Details
                            </button>
                            <button class="cart-btn" onclick="window.JMPOTTERS.addToCart(${product.id})">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                            <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                    onclick="window.JMPOTTERS.toggleWishlist(${product.id})" 
                                    id="wishlist-${product.id}">
                                <i class="fas fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Wishlist'}
                            </button>
                            <a href="https://wa.me/2348139583320?text=I'm interested in ${encodeURIComponent(product.name)} - ₦${product.price}" 
                               class="whatsapp-btn btn" target="_blank">
                                <i class="fab fa-whatsapp"></i> Buy Now
                            </a>
                        </div>
                        <div class="product-details" id="details-${product.id}">
                            <p>${product.description || 'No description available.'}</p>
                            <p><strong>Stock:</strong> ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p>
                        </div>
                    </div>
                `;
            }
            
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = productCardHTML;
            productsGrid.appendChild(productCard);
        });
        
        // Setup product interactions
        setTimeout(() => {
            setupProductInteractions();
        }, 100);
        
        console.log(`✅ Rendered ${products.length} products with correct styling for ${categorySlug}`);
    }
    
    function setupProductInteractions() {
        // ========== FOR MEN'S FOOTWEAR ==========
        // Quantity options toggle
        document.querySelectorAll('.toggle-bulk-options').forEach(btn => {
            btn.addEventListener('click', function() {
                const options = this.nextElementSibling;
                options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
            });
        });
        
        // Quantity option selection
        document.querySelectorAll('.quantity-option').forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options in this container
                const container = this.closest('.quantity-options');
                container.querySelectorAll('.quantity-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
            });
        });
        
        // Add to Cart buttons for mensfootwear
        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                
                // Get selected quantity
                const card = this.closest('.product-card');
                const selectedQty = card.querySelector('.quantity-option.selected');
                const quantity = selectedQty ? parseInt(selectedQty.getAttribute('data-qty')) : 1;
                
                addToCart(productId, quantity);
            });
        });
        
        // View Details buttons for mensfootwear
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                openProductModal(productId);
            });
        });
        
        // Wishlist buttons for mensfootwear
        document.querySelectorAll('.product-card .wishlist-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                toggleWishlist(productId);
            });
        });
        
        // ========== FOR ACCESSORIES ==========
        // Product toggle buttons (View/Hide Details)
        document.querySelectorAll('.product-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const details = this.parentElement.nextElementSibling;
                if (details && details.classList.contains('product-details')) {
                    details.classList.toggle('active');
                    this.textContent = details.classList.contains('active') ? 'Hide Details' : 'View Details';
                }
            });
        });
        
        // Cart buttons for accessories
        document.querySelectorAll('.cart-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Extract product ID from onclick attribute
                const onclickAttr = this.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes('addToCart(')) {
                    // The function will handle it via onclick
                    return;
                }
            });
        });
    }
    
    function showNoProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-box-open"></i>
                <h3>No Products Found</h3>
                <p>No products available in this category yet. Check back soon!</p>
            </div>
        `;
    }
    
    // ====================
    // PRODUCT MODAL FUNCTION
    // ====================
    async function openProductModal(productId) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                showNotification('Database not connected', 'error');
                return;
            }
            
            // Get product details
            const { data: product, error } = await supabase
                .from('products')
                .select('*, categories(slug, name)')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            
            // For now, show a notification that modal would open
            // In your actual implementation, you would open your modal here
            showNotification(`Opening details for ${product.name}`, 'info');
            
            console.log('Product details loaded for modal:', product);
            
        } catch (error) {
            console.error('Error opening product modal:', error);
            showNotification('Failed to load product details', 'error');
        }
    }
    
    // ====================
    // CART FUNCTIONS
    // ====================
    async function addToCart(productId, quantity = 1) {
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
                if (existingItem.quantity + quantity > product.stock) {
                    showNotification('Maximum stock reached!', 'error');
                    return;
                }
                existingItem.quantity += quantity;
            } else {
                cart.push({
                    product_id: productId,
                    quantity: quantity,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    category_slug: product.categories?.slug || 'products'
                });
            }
            
            localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
            updateCartUI();
            showNotification(`✅ ${quantity} ${product.name} added to cart!`, 'success');
            
            // Update cart icon animation
            const cartIcon = document.getElementById('cartIcon');
            if (cartIcon) {
                cartIcon.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    cartIcon.style.transform = 'scale(1)';
                }, 300);
            }
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            showNotification('Failed to add to cart', 'error');
        }
    }
    
    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        // Update cart count
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        // Update cart total in panel
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
            
            // Get image URL for cart item
            const imageUrl = getImageUrl(item.category_slug, item.image_url);
            
            html += `
                <div class="cart-item" style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                    <img src="${imageUrl}" 
                         alt="${item.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin-right: 10px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${item.name}</div>
                        <div style="color: var(--primary-color);">₦${item.price.toLocaleString()} × ${item.quantity}</div>
                    </div>
                    <div style="font-weight: bold; margin-right: 10px;">₦${itemTotal.toLocaleString()}</div>
                    <button onclick="window.JMPOTTERS.removeFromCart(${item.product_id})" 
                            style="background: none; border: none; color: #ff6f61; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        cartItems.innerHTML = html;
        cartTotal.textContent = `₦${total.toLocaleString()}`;
        
        // Update WhatsApp checkout link
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
    
    function toggleProductDetails(productId) {
        const details = document.getElementById(`details-${productId}`);
        if (details) {
            details.classList.toggle('active');
            const button = details.previousElementSibling.querySelector('.product-toggle');
            if (button) {
                button.textContent = details.classList.contains('active') ? 'Hide Details' : 'View Details';
            }
        }
    }
    
    // ====================
    // WISHLIST FUNCTIONS
    // ====================
    function toggleWishlist(productId) {
        let wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const index = wishlist.findIndex(item => item.id === productId);
        
        // Find the wishlist button
        let button = document.getElementById(`wishlist-${productId}`);
        if (!button) {
            // Try to find it by data-id for mensfootwear
            button = document.querySelector(`.wishlist-btn[data-id="${productId}"]`);
        }
        
        if (index === -1) {
            // Add to wishlist
            wishlist.push({ id: productId });
            if (button) {
                button.classList.add('active');
                // Update button text/icon based on page type
                if (button.id && button.id.startsWith('wishlist-')) {
                    // Accessories page
                    button.innerHTML = '<i class="fas fa-heart"></i> In Wishlist';
                } else {
                    // Mensfootwear page - just update the heart icon
                    button.innerHTML = '<i class="fas fa-heart"></i>';
                }
            }
            showNotification('Added to wishlist', 'success');
        } else {
            // Remove from wishlist
            wishlist.splice(index, 1);
            if (button) {
                button.classList.remove('active');
                // Update button text/icon based on page type
                if (button.id && button.id.startsWith('wishlist-')) {
                    // Accessories page
                    button.innerHTML = '<i class="fas fa-heart"></i> Wishlist';
                } else {
                    // Mensfootwear page - just update the heart icon
                    button.innerHTML = '<i class="fas fa-heart"></i>';
                }
            }
            showNotification('Removed from wishlist', 'info');
        }
        
        localStorage.setItem('jmpotters_wishlist', JSON.stringify(wishlist));
        updateWishlistUI();
        
        // Update wishlist icon animation
        const wishlistIcon = document.getElementById('wishlistIcon');
        if (wishlistIcon) {
            wishlistIcon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                wishlistIcon.style.transform = 'scale(1)';
            }, 300);
        }
    }
    
    function updateWishlistUI() {
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const wishlistCount = document.getElementById('wishlistCount');
        
        if (wishlistCount) {
            wishlistCount.textContent = wishlist.length;
            wishlistCount.style.display = wishlist.length > 0 ? 'flex' : 'none';
        }
        
        updateWishlistPanel();
    }
    
    function updateWishlistPanel() {
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const wishlistItems = document.getElementById('wishlistItems');
        
        if (!wishlistItems) return;
        
        if (wishlist.length === 0) {
            wishlistItems.innerHTML = '<div class="wishlist-empty">Your wishlist is empty</div>';
            return;
        }
        
        // Note: To show wishlist items properly, we'd need to fetch product details
        // For now, just show count
        wishlistItems.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <i class="fas fa-heart" style="font-size: 2rem; color: #ff6f61; margin-bottom: 10px;"></i>
                <h4>${wishlist.length} items in wishlist</h4>
                <p>View products on the main page to see details</p>
            </div>
        `;
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    function detectCurrentCategory() {
        return window.JMPOTTERS_CONFIG.currentCategory || 'accessories';
    }
    
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        
        // Initialize UI
        updateCartUI();
        updateWishlistUI();
        
        // Load products if on category page
        const currentCategory = detectCurrentCategory();
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
            toggleProductDetails,
            toggleWishlist,
            removeFromCart,
            initializePage,
            openProductModal
        };
    } else {
        // Add missing functions if JMPOTTERS already exists
        window.JMPOTTERS.openProductModal = openProductModal;
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
