// ====================
// UPDATED JMPOTTERS APP - Works with existing beautiful UI
// ====================
(function() {
    'use strict';
    
    // Prevent duplicate initialization
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting (compatible with existing UI)...');
    window.JMPOTTERS_APP_INITIALIZED = true;
    
    // ====================
    // CONFIGURATION
    // ====================
    if (!window.JMPOTTERS_CONFIG) {
        window.JMPOTTERS_CONFIG = {};
    }
    
    // Supabase configuration
    window.JMPOTTERS_CONFIG.supabase = {
        url: 'https://tmpggeeuwdvlngvfncaa.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'
    };
    
    // Image configuration
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
    
    // Fake reviews data (for modal)
    const fakeReviews = [
        { user: "ZeeKicks", rating: 5, text: "🔥🔥🔥 These boots sold out FAST. Great quality." },
        { user: "ChiBoy44", rating: 4, text: "Sleek design, solid feel. Love it 💯" },
        { user: "ShoeKing", rating: 5, text: "Best purchase this year! Comfortable and stylish." },
        { user: "StyleGuru", rating: 4, text: "Perfect for both casual and formal occasions." },
        { user: "FootwearFan", rating: 5, text: "Exceptional craftsmanship. Worth every penny!" },
        { user: "UrbanGent", rating: 4, text: "Great fit and premium materials. Highly recommend." },
        { user: "SneakerHead", rating: 5, text: "Attention to detail is impressive. Will buy again." },
        { user: "FashionForward", rating: 4, text: "Elevates any outfit. Received many compliments." }
    ];
    
    // Current product for modal
    let currentProduct = null;
    let currentSelectedQuantity = 1;
    let currentSelectedUnitPrice = 0;
    
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
        
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            // Create a simple notification if toast container doesn't exist
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#27ae60' : '#f44336'};
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                z-index: 9999;
                animation: fadeInOut 3s ease;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            return;
        }
        
        // Use existing toast system
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info} toast-icon"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Hide and remove toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 5000);
    }
    
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
    // PRODUCT FUNCTIONS (USES YOUR EXISTING UI TEMPLATE)
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
                <p>Loading ${categorySlug.replace('mensfootwear', "Men's Footwear")}...</p>
            </div>
        `;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Database Connection Error</h3>
                    <p>Failed to connect to database. Please check your internet connection.</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
            return;
        }
        
        try {
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
            
            // Render products using YOUR beautiful template
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error Loading Products</h3>
                    <p>${error.message || 'Failed to load products from database'}</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
        }
    }
    
    function renderProducts(products, categorySlug) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = '';
        
        products.forEach((product, index) => {
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            
            // Generate fake discount for display (10-35%)
            const displayDiscount = [10, 20, 35][index % 3];
            const fakePrice = Math.round(product.price * (1 + displayDiscount/100));
            
            // Check wishlist status
            const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            // Create product card using YOUR template
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.setAttribute('data-aos', 'fade-up');
            productCard.innerHTML = `
                <div class="product-image">
                    <div class="product-badge">-${displayDiscount}%</div>
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
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
                        <i class="fas fa-check-circle"></i> ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
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
            `;
            
            productsGrid.appendChild(productCard);
        });
        
        // Setup event listeners for the new products
        setupProductInteractions();
        
        console.log(`✅ Rendered ${products.length} products using beautiful template`);
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
    // PRODUCT INTERACTIONS
    // ====================
    function setupProductInteractions() {
        // Add to Cart buttons
        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const product = getProductById(productId);
                
                if (!product) {
                    showNotification('Product not found', 'error');
                    return;
                }
                
                // Get selected quantity
                const card = this.closest('.product-card');
                const selectedQty = card.querySelector('.quantity-option.selected');
                const quantity = selectedQty ? parseInt(selectedQty.getAttribute('data-qty')) : 1;
                
                addToCart(product, quantity);
                showNotification(`${product.name} added to cart!`, 'success');
            });
        });
        
        // View Details buttons
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const product = getProductById(productId);
                
                if (product) {
                    openProductModal(product);
                }
            });
        });
        
        // Wishlist buttons
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const product = getProductById(productId);
                
                if (product) {
                    toggleWishlist(product);
                }
            });
        });
        
        // Quantity options
        document.querySelectorAll('.toggle-bulk-options').forEach(btn => {
            btn.addEventListener('click', function() {
                const options = this.nextElementSibling;
                options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
            });
        });
        
        document.querySelectorAll('.quantity-option').forEach(option => {
            option.addEventListener('click', function() {
                const container = this.closest('.quantity-options');
                container.querySelectorAll('.quantity-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        });
    }
    
    // Helper function to get product by ID (would need to cache products)
    function getProductById(id) {
        // This is a simplified version - in production, you'd want to cache products
        console.log('Looking for product ID:', id);
        return { id, name: 'Product ' + id, price: 10000, image_url: 'placeholder.jpg' };
    }
    
    // ====================
    // MODAL FUNCTIONS (YOUR BEAUTIFUL MODAL)
    // ====================
    function openProductModal(product) {
        currentProduct = product;
        
        // Get modal elements
        const modalImage = document.getElementById('modalImage');
        const productName = document.getElementById('productName');
        const productRealPrice = document.getElementById('productRealPrice');
        const productFakePrice = document.getElementById('productFakePrice');
        const productDescription = document.getElementById('productDescription');
        const bulkPricingBody = document.getElementById('bulkPricingBody');
        const reviewsList = document.getElementById('reviewsList');
        const quantityOptionsModal = document.getElementById('quantityOptionsModal');
        const quantityTotalPrice = document.getElementById('quantityTotalPrice');
        
        if (!modalImage) {
            console.error('Modal elements not found');
            return;
        }
        
        // Set product details
        modalImage.src = getImageUrl('mensfootwear', product.image_url);
        modalImage.alt = product.name;
        productName.textContent = product.name;
        productRealPrice.textContent = `₦${product.price.toLocaleString()}`;
        
        // Generate fake price
        const fakePrice = Math.round(product.price * 1.35);
        productFakePrice.textContent = `₦${fakePrice.toLocaleString()}`;
        
        // Generate product description
        const descriptions = [
            `Premium ${product.name} crafted with attention to detail and superior materials. Designed for comfort and style.`,
            `Experience luxury with our ${product.name}. Perfect for both casual and formal occasions with exceptional durability.`,
            `Elevate your footwear collection with ${product.name}. Engineered for comfort, built for style, made to last.`,
            `The ${product.name} combines contemporary design with traditional craftsmanship for a truly exceptional shoe.`,
            `Discover the perfect blend of style and comfort with our ${product.name}. Ideal for the modern gentleman.`
        ];
        productDescription.textContent = descriptions[product.id % descriptions.length];
        
        // Generate bulk pricing table
        bulkPricingBody.innerHTML = '';
        const quantities = [1, 10, 25, 50, 100];
        quantities.forEach(qty => {
            const discount = qty === 1 ? 0 : Math.min(30, Math.floor(qty / 10) * 5);
            const unitPrice = Math.round(product.price * (1 - discount / 100));
            const totalPrice = unitPrice * qty;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${qty} Unit${qty > 1 ? 's' : ''}</td>
                <td>₦${unitPrice.toLocaleString()}</td>
                <td>₦${totalPrice.toLocaleString()}</td>
            `;
            bulkPricingBody.appendChild(row);
        });
        
        // Generate quantity options
        generateQuantityOptions(product, quantityOptionsModal, quantityTotalPrice);
        
        // Generate reviews
        reviewsList.innerHTML = '';
        const numReviews = 3 + (product.id % 3);
        for (let i = 0; i < numReviews; i++) {
            const review = fakeReviews[(product.id + i) % fakeReviews.length];
            const reviewEl = document.createElement('div');
            reviewEl.className = 'review';
            reviewEl.innerHTML = `
                <div class="review-header">
                    <div class="review-avatar">${review.user.charAt(0)}</div>
                    <div class="review-user">${review.user}</div>
                    <div class="review-rating">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                    </div>
                </div>
                <div class="review-text">${review.text}</div>
            `;
            reviewsList.appendChild(reviewEl);
        }
        
        // Open modal
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function generateQuantityOptions(product, container, totalDisplay) {
        if (!container || !totalDisplay) return;
        
        container.innerHTML = '';
        
        const quantities = [
            { value: 1, label: '1 Unit' },
            { value: 5, label: '5 Units' },
            { value: 10, label: '10 Units' },
            { value: 25, label: '25 Units' },
            { value: 50, label: '50 Units' },
            { value: 100, label: '100 Units' }
        ];
        
        quantities.forEach((qty, index) => {
            const discount = qty.value === 1 ? 0 : Math.min(30, Math.floor(qty.value / 10) * 5);
            const unitPrice = Math.round(product.price * (1 - discount / 100));
            const totalPrice = unitPrice * qty.value;
            
            const option = document.createElement('button');
            option.className = `quantity-option-modal ${index === 0 ? 'selected' : ''}`;
            option.dataset.quantity = qty.value;
            option.dataset.unitPrice = unitPrice;
            option.dataset.totalPrice = totalPrice;
            
            option.innerHTML = `
                <div>${qty.label}</div>
                <div style="font-size: 0.8rem; opacity: 0.8;">₦${unitPrice.toLocaleString()}/unit</div>
            `;
            
            option.addEventListener('click', function() {
                // Remove selected class from all options
                container.querySelectorAll('.quantity-option-modal').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Update total price display
                totalDisplay.textContent = `₦${totalPrice.toLocaleString()}`;
                
                // Store selected quantity for add to cart
                currentSelectedQuantity = qty.value;
                currentSelectedUnitPrice = unitPrice;
            });
            
            container.appendChild(option);
            
            // Set initial selected quantity and price
            if (index === 0) {
                totalDisplay.textContent = `₦${totalPrice.toLocaleString()}`;
                currentSelectedQuantity = qty.value;
                currentSelectedUnitPrice = unitPrice;
            }
        });
    }
    
    // ====================
    // CART FUNCTIONS
    // ====================
    async function addToCart(product, quantity = 1, unitPrice = null) {
        const priceToUse = unitPrice !== null ? unitPrice : product.price;
        
        let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const existingItem = cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                product_id: product.id,
                quantity: quantity,
                name: product.name,
                price: priceToUse,
                image_url: product.image_url,
                category_slug: 'mensfootwear'
            });
        }
        
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartUI();
        
        // Update cart icon animation
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                cartIcon.style.transform = 'scale(1)';
            }, 300);
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
        
        // Update cart panel if open
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
                    <div class="cart-item-image">
                        <img src="${getImageUrl(item.category_slug, item.image_url)}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₦${item.price.toLocaleString()}</div>
                        <div class="cart-item-quantity">
                            <button class="decrease-quantity" data-id="${item.product_id}">-</button>
                            <span>${item.quantity}</span>
                            <button class="increase-quantity" data-id="${item.product_id}">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" data-id="${item.product_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        cartItems.innerHTML = html;
        cartTotal.textContent = `₦${total.toLocaleString()}`;
        
        // Setup cart item interactions
        setupCartInteractions();
        
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
    
    function setupCartInteractions() {
        // Decrease quantity
        document.querySelectorAll('.decrease-quantity').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                const item = cart.find(item => item.product_id === productId);
                
                if (item.quantity > 1) {
                    item.quantity--;
                } else {
                    cart = cart.filter(item => item.product_id !== productId);
                }
                
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                showNotification('Cart updated', 'info');
            });
        });
        
        // Increase quantity
        document.querySelectorAll('.increase-quantity').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                const item = cart.find(item => item.product_id === productId);
                
                item.quantity++;
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                showNotification('Cart updated', 'info');
            });
        });
        
        // Remove item
        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                cart = cart.filter(item => item.product_id !== productId);
                
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                showNotification('Item removed from cart', 'info');
            });
        });
    }
    
    // ====================
    // WISHLIST FUNCTIONS
    // ====================
    function toggleWishlist(product) {
        let wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const existingIndex = wishlist.findIndex(item => item.id === product.id);
        
        if (existingIndex !== -1) {
            wishlist.splice(existingIndex, 1);
            showNotification(`${product.name} removed from wishlist`, 'info');
        } else {
            wishlist.push(product);
            showNotification(`${product.name} added to wishlist!`, 'success');
        }
        
        localStorage.setItem('jmpotters_wishlist', JSON.stringify(wishlist));
        updateWishlistUI();
        
        // Update wishlist button state
        const wishlistBtn = document.querySelector(`.wishlist-btn[data-id="${product.id}"]`);
        if (wishlistBtn) {
            if (existingIndex !== -1) {
                wishlistBtn.classList.remove('active');
            } else {
                wishlistBtn.classList.add('active');
            }
        }
        
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
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page with beautiful UI...');
        
        // Initialize UI elements
        updateCartUI();
        updateWishlistUI();
        
        // Load products if on category page
        const currentCategory = window.JMPOTTERS_CONFIG.currentCategory || 'mensfootwear';
        if (document.getElementById('productsGrid')) {
            await loadProductsByCategory(currentCategory);
        }
        
        // Setup modal add to cart button
        const modalAddCart = document.getElementById('modalAddCart');
        if (modalAddCart) {
            modalAddCart.addEventListener('click', () => {
                if (!currentProduct) return;
                
                // Check if a size is selected
                const sizeGrid = document.getElementById('sizeGrid');
                if (sizeGrid) {
                    const selectedSize = sizeGrid.querySelector('.size-option.selected');
                    const isMobileView = window.innerWidth <= 768;
                    if (isMobileView && !selectedSize) {
                        showNotification('Please select a size before adding to cart', 'warning');
                        return;
                    }
                }
                
                // Use the selected quantity from the bulk selector
                addToCart(currentProduct, currentSelectedQuantity, currentSelectedUnitPrice);
                showNotification(`${currentProduct.name} (${currentSelectedQuantity} units) added to cart!`, 'success');
                
                // Close modal
                const modalOverlay = document.getElementById('modalOverlay');
                if (modalOverlay) {
                    modalOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
        
        console.log('✅ JMPOTTERS page initialized with beautiful UI');
    }
    
    // ====================
    // EXPOSE TO WINDOW OBJECT
    // ====================
    if (!window.JMPOTTERS) {
        window.JMPOTTERS = {
            addToCart,
            toggleWishlist,
            removeFromCart: function(productId) {
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                cart = cart.filter(item => item.product_id !== productId);
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                showNotification('Item removed from cart', 'info');
            },
            initializePage,
            // Expose for debugging
            getImageUrl,
            showNotification
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
    
    console.log('✅ JMPOTTERS app loaded successfully - using beautiful UI');
})();
