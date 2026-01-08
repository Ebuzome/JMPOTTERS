// ====================
// JMPOTTERS APP - FIXED MODAL ISSUES
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
    
    // Current product state
    let currentProduct = null;
    let currentModalConfig = null;
    let currentSelectedQuantity = 1;
    
    // ====================
    // UTILITY FUNCTIONS
    // ====================
    function getCurrentCategory() {
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
        return pageToCategory[page] || 'mensfootwear';
    }
    
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
        if (!toastContainer) return;
        
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
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
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
            window.JMPOTTERS_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.key);
            console.log('✅ Created new Supabase client');
            return window.JMPOTTERS_SUPABASE_CLIENT;
        }
        
        console.error('❌ Supabase library not loaded');
        return null;
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
                    <p>Failed to connect to database.</p>
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
                showNotification('Category not found', 'error');
                return;
            }
            
            if (!category) {
                throw new Error(`Category "${categorySlug}" not found`);
            }
            
            console.log(`✅ Found category: ${category.name} (ID: ${category.id})`);
            
            // Get ONLY basic product data first (no joins to avoid issues)
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
            
            console.log(`✅ Loaded ${products?.length || 0} basic products`);
            
            if (!products || products.length === 0) {
                showNoProducts();
                return;
            }
            
            // Cache products
            window.JMPOTTERS_PRODUCTS_CACHE = products;
            
            // Render products WITHOUT sizes in product cards
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error Loading Products</h3>
                    <p>${error.message}</p>
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
            const displayDiscount = [10, 20, 35][index % 3];
            const fakePrice = Math.round(product.price * (1 + displayDiscount/100));
            const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            // FIXED: Remove sizes from product card to avoid display issues
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
                    
                    <!-- REMOVED SIZES FROM PRODUCT CARD -->
                    
                    <div class="quantity-selector">
                        <button class="toggle-bulk-options">
                            Bulk Options <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="quantity-options" style="display: none;">
                            ${[1, 10, 25, 50, 100].map(qty => `
                                <div class="quantity-option ${qty === 1 ? 'selected' : ''}" data-qty="${qty}">${qty} Unit${qty > 1 ? 's' : ''}</div>
                            `).join('')}
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
        
        setupProductInteractions();
        console.log(`✅ Rendered ${products.length} products`);
    }
    
    // ====================
    // MODAL FUNCTIONS - SIMPLIFIED
    // ====================
    async function openProductModal(productId) {
        console.log(`📊 Opening modal for product ID: ${productId}`);
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showNotification('Database connection error', 'error');
            return;
        }
        
        try {
            // 1. First get basic product data
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (productError) {
                console.error('❌ Product fetch error:', productError);
                throw new Error('Product not found in database');
            }
            
            if (!product) {
                throw new Error('Product data is empty');
            }
            
            console.log('✅ Loaded basic product:', product.name);
            
            // 2. Get modal configuration (optional)
            let modalConfig = null;
            try {
                const { data: modalData } = await supabase
                    .from('product_modals')
                    .select('*')
                    .eq('product_id', productId)
                    .maybeSingle(); // Use maybeSingle to handle no rows
                
                modalConfig = modalData;
                console.log('✅ Modal config:', modalConfig ? 'found' : 'not found');
            } catch (modalError) {
                console.log('⚠️ No modal config or table missing:', modalError.message);
            }
            
            currentProduct = product;
            currentModalConfig = modalConfig;
            
            // 3. Get sizes (optional)
            let sizes = [];
            try {
                const { data: sizesData } = await supabase
                    .from('product_sizes')
                    .select('*')
                    .eq('product_id', productId)
                    .order('size_value');
                
                sizes = sizesData || [];
                console.log(`✅ Loaded ${sizes.length} sizes`);
            } catch (sizeError) {
                console.log('⚠️ No sizes or table missing:', sizeError.message);
            }
            
            // 4. Get reviews (optional)
            let reviews = [];
            try {
                const { data: reviewsData } = await supabase
                    .from('product_reviews')
                    .select('*')
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                reviews = reviewsData || [];
                console.log(`✅ Loaded ${reviews.length} reviews`);
            } catch (reviewError) {
                console.log('⚠️ No reviews or table missing:', reviewError.message);
            }
            
            // 5. Get bulk pricing (optional)
            let bulkPricing = [];
            try {
                const { data: pricingData } = await supabase
                    .from('bulk_pricing_tiers')
                    .select('*')
                    .eq('product_id', productId)
                    .order('min_quantity');
                
                bulkPricing = pricingData || [];
                console.log(`✅ Loaded ${bulkPricing.length} bulk pricing tiers`);
            } catch (pricingError) {
                console.log('⚠️ No bulk pricing or table missing:', pricingError.message);
            }
            
            // 6. Render the modal with all collected data
            renderProductModal(product, {
                modalConfig,
                sizes,
                reviews,
                bulkPricing
            });
            
            // 7. Open modal
            const modalOverlay = document.getElementById('modalOverlay');
            if (modalOverlay) {
                modalOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                console.log('✅ Modal opened successfully');
            }
            
        } catch (error) {
            console.error('❌ Detailed modal error:', error);
            console.error('Error stack:', error.stack);
            showNotification(`Failed to load product details: ${error.message}`, 'error');
        }
    }
    
    function renderProductModal(product, data) {
        console.log('🎨 Rendering modal for:', product.name);
        
        const currentCategory = getCurrentCategory();
        
        // ====================
        // 1. BASIC PRODUCT INFO
        // ====================
        // Product Image
        const modalImage = document.getElementById('modalImage');
        if (modalImage) {
            modalImage.src = getImageUrl(currentCategory, product.image_url);
            modalImage.alt = product.name;
        }
        
        // Product Name
        const productName = document.getElementById('productName');
        if (productName) {
            productName.textContent = product.name;
        }
        
        // Product Prices
        const productRealPrice = document.getElementById('productRealPrice');
        if (productRealPrice) {
            productRealPrice.textContent = `₦${(product.price || 0).toLocaleString()}`;
        }
        
        const productFakePrice = document.getElementById('productFakePrice');
        if (productFakePrice) {
            const fakePrice = Math.round((product.price || 0) * 1.35);
            productFakePrice.textContent = `₦${fakePrice.toLocaleString()}`;
        }
        
        // Product Description
        const productDescription = document.getElementById('productDescription');
        if (productDescription) {
            productDescription.textContent = product.description || 
                `${product.name} - Premium quality footwear designed for comfort and style.`;
        }
        
        // ====================
        // 2. SIZE SELECTOR
        // ====================
        const sizeGrid = document.getElementById('sizeGrid');
        if (sizeGrid) {
            sizeGrid.innerHTML = '';
            
            const { sizes = [] } = data;
            const showSizeSelector = data.modalConfig?.show_size_selector !== false;
            
            if (showSizeSelector && sizes.length > 0) {
                sizes.forEach(size => {
                    const sizeOption = document.createElement('button');
                    sizeOption.className = 'size-option';
                    sizeOption.textContent = size.size_value;
                    sizeOption.dataset.size = size.size_value;
                    
                    sizeOption.addEventListener('click', function() {
                        sizeGrid.querySelectorAll('.size-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        this.classList.add('selected');
                    });
                    
                    sizeGrid.appendChild(sizeOption);
                });
            } else {
                sizeGrid.innerHTML = '<p style="color: #ccc; text-align: center; grid-column: 1 / -1;">Select size in cart</p>';
            }
        }
        
        // ====================
        // 3. BULK PRICING
        // ====================
        const bulkPricingBody = document.getElementById('bulkPricingBody');
        if (bulkPricingBody) {
            bulkPricingBody.innerHTML = '';
            
            const { bulkPricing = [] } = data;
            const showBulkPricing = data.modalConfig?.show_bulk_pricing !== false;
            
            if (showBulkPricing) {
                if (bulkPricing.length > 0) {
                    bulkPricing.forEach(tier => {
                        const row = document.createElement('tr');
                        const totalPrice = tier.price_per_unit * tier.min_quantity;
                        row.innerHTML = `
                            <td>${tier.min_quantity}+ Units</td>
                            <td>₦${tier.price_per_unit.toLocaleString()}</td>
                            <td>₦${totalPrice.toLocaleString()}</td>
                        `;
                        bulkPricingBody.appendChild(row);
                    });
                } else {
                    // Fallback pricing
                    [1, 10, 25, 50, 100].forEach(qty => {
                        const discount = qty === 1 ? 0 : Math.min(30, Math.floor(qty / 10) * 5);
                        const unitPrice = Math.round(product.price * (1 - discount / 100));
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${qty} Unit${qty > 1 ? 's' : ''}</td>
                            <td>₦${unitPrice.toLocaleString()}</td>
                            <td>₦${(unitPrice * qty).toLocaleString()}</td>
                        `;
                        bulkPricingBody.appendChild(row);
                    });
                }
            }
        }
        
        // ====================
        // 4. QUANTITY OPTIONS
        // ====================
        const quantityOptionsModal = document.getElementById('quantityOptionsModal');
        const quantityTotalPrice = document.getElementById('quantityTotalPrice');
        
        if (quantityOptionsModal && quantityTotalPrice) {
            quantityOptionsModal.innerHTML = '';
            
            // Get quantity options from modal config or use defaults
            const defaultOptions = data.modalConfig?.default_quantity_options || [1, 5, 10, 25, 50, 100];
            
            defaultOptions.forEach((qty, index) => {
                // Simple price calculation
                let unitPrice = product.price;
                if (qty > 1) {
                    const discount = Math.min(30, Math.floor(qty / 10) * 5);
                    unitPrice = Math.round(product.price * (1 - discount / 100));
                }
                
                const totalPrice = unitPrice * qty;
                
                const option = document.createElement('button');
                option.className = `quantity-option-modal ${index === 0 ? 'selected' : ''}`;
                option.dataset.quantity = qty;
                option.dataset.unitPrice = unitPrice;
                option.dataset.totalPrice = totalPrice;
                
                option.innerHTML = `
                    <div style="font-weight: 600;">${qty} Unit${qty > 1 ? 's' : ''}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">₦${unitPrice.toLocaleString()}/unit</div>
                `;
                
                option.addEventListener('click', function() {
                    quantityOptionsModal.querySelectorAll('.quantity-option-modal').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    
                    quantityTotalPrice.textContent = `₦${totalPrice.toLocaleString()}`;
                    currentSelectedQuantity = qty;
                });
                
                quantityOptionsModal.appendChild(option);
                
                // Set initial values
                if (index === 0) {
                    quantityTotalPrice.textContent = `₦${totalPrice.toLocaleString()}`;
                    currentSelectedQuantity = qty;
                }
            });
        }
        
        // ====================
        // 5. REVIEWS
        // ====================
        const reviewsList = document.getElementById('reviewsList');
        if (reviewsList) {
            reviewsList.innerHTML = '';
            
            const { reviews = [] } = data;
            const showReviews = data.modalConfig?.show_reviews !== false;
            
            if (showReviews) {
                if (reviews.length > 0) {
                    reviews.forEach(review => {
                        const reviewEl = document.createElement('div');
                        reviewEl.className = 'review';
                        
                        const date = review.created_at ? 
                            new Date(review.created_at).toLocaleDateString() : '';
                        
                        reviewEl.innerHTML = `
                            <div class="review-header">
                                <div class="review-avatar">
                                    ${review.customer_name?.charAt(0) || 'C'}
                                </div>
                                <div class="review-user">
                                    ${review.customer_name || 'Customer'}
                                </div>
                                <div class="review-rating">
                                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                </div>
                            </div>
                            <div class="review-text">${review.comment || 'Great product!'}</div>
                            ${date ? `<small style="color: #888;">${date}</small>` : ''}
                        `;
                        reviewsList.appendChild(reviewEl);
                    });
                } else {
                    reviewsList.innerHTML = `
                        <div style="text-align: center; color: #ccc; padding: 20px;">
                            No reviews yet. Be the first to review!
                        </div>
                    `;
                }
            }
        }
        
        console.log('✅ Modal rendered successfully');
    }
    
    // ====================
    // PRODUCT INTERACTIONS
    // ====================
    function setupProductInteractions() {
        console.log('🔧 Setting up product interactions...');
        
        // View Details buttons - FIXED: Use event delegation
        document.addEventListener('click', function(event) {
            // Check if clicked element is a view details button or its child
            const viewDetailsBtn = event.target.closest('.btn-view-details');
            if (viewDetailsBtn) {
                event.preventDefault();
                const productId = parseInt(viewDetailsBtn.getAttribute('data-id'));
                console.log('👁️ View details clicked for product:', productId);
                openProductModal(productId);
            }
        });
        
        // Add to Cart buttons
        document.addEventListener('click', function(event) {
            const addCartBtn = event.target.closest('.btn-add-cart');
            if (addCartBtn) {
                event.preventDefault();
                const productId = parseInt(addCartBtn.getAttribute('data-id'));
                const product = window.JMPOTTERS_PRODUCTS_CACHE?.find(p => p.id === productId);
                
                if (!product) {
                    showNotification('Product not found', 'error');
                    return;
                }
                
                addToCart(product, 1);
                showNotification(`${product.name} added to cart!`, 'success');
            }
        });
        
        // Wishlist buttons
        document.addEventListener('click', function(event) {
            const wishlistBtn = event.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                event.preventDefault();
                const productId = parseInt(wishlistBtn.getAttribute('data-id'));
                const product = window.JMPOTTERS_PRODUCTS_CACHE?.find(p => p.id === productId);
                
                if (product) {
                    toggleWishlist(product);
                }
            }
        });
        
        // Quantity toggles
        document.querySelectorAll('.toggle-bulk-options').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const options = this.nextElementSibling;
                options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
            });
        });
        
        document.querySelectorAll('.quantity-option').forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const container = this.closest('.quantity-options');
                container.querySelectorAll('.quantity-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        });
        
        console.log('✅ Product interactions setup complete');
    }
    
    // ====================
    // CART & WISHLIST FUNCTIONS
    // ====================
    function addToCart(product, quantity = 1) {
        let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const existingItem = cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                product_id: product.id,
                quantity: quantity,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                category_slug: getCurrentCategory()
            });
        }
        
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartUI();
        showNotification(`${product.name} added to cart!`, 'success');
    }
    
    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCount = document.getElementById('cartCount');
        
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }
    
    function toggleWishlist(product) {
        let wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const existingIndex = wishlist.findIndex(item => item.id === product.id);
        
        if (existingIndex !== -1) {
            wishlist.splice(existingIndex, 1);
            showNotification(`${product.name} removed from wishlist`, 'info');
        } else {
            wishlist.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url
            });
            showNotification(`${product.name} added to wishlist!`, 'success');
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
        const currentCategory = getCurrentCategory();
        if (document.getElementById('productsGrid')) {
            await loadProductsByCategory(currentCategory);
        }
        
        // Setup modal add to cart button
        const modalAddCart = document.getElementById('modalAddCart');
        if (modalAddCart) {
            modalAddCart.addEventListener('click', () => {
                if (!currentProduct) return;
                
                addToCart(currentProduct, currentSelectedQuantity);
                showNotification(`${currentProduct.name} added to cart!`, 'success');
                
                // Close modal
                const modalOverlay = document.getElementById('modalOverlay');
                if (modalOverlay) {
                    modalOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Setup modal close button
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                const modalOverlay = document.getElementById('modalOverlay');
                if (modalOverlay) {
                    modalOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
        
        console.log('✅ JMPOTTERS initialized');
    }
    
    // ====================
    // EXPOSE TO WINDOW
    // ====================
    if (!window.JMPOTTERS) {
        window.JMPOTTERS = {
            openProductModal,
            addToCart,
            toggleWishlist,
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
    
    console.log('✅ JMPOTTERS app loaded');
})();
