// ====================
// JMPOTTERS APP - WITH COLOR & SIZE SELECTION
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
    let currentSelectedColor = null;
    let currentSelectedSize = null;
    let currentProductColors = [];
    let currentProductSizes = [];
    let colorSizeMap = {}; // Maps color -> available sizes
    
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
    
    function formatPrice(price) {
        if (!price && price !== 0) {
            console.warn('⚠️ Price is undefined or null:', price);
            return '₦0';
        }
        return `₦${parseInt(price).toLocaleString()}`;
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
            
            // Get basic product data
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
            
            // Render products
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
            const fakePrice = product.price ? Math.round(product.price * (1 + displayDiscount/100)) : 0;
            const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
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
                        <del class="price-fake">${formatPrice(fakePrice)}</del>
                        <span class="price-real">${formatPrice(product.price)}</span>
                    </div>
                    <div class="availability">
                        <i class="fas fa-check-circle"></i> ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                    
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
    // MODAL FUNCTIONS - WITH COLOR & SIZE SELECTION
    // ====================
    async function openProductModal(productId) {
        console.log(`📊 Opening modal for product ID: ${productId}`);
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showNotification('Database connection error', 'error');
            return;
        }
        
        try {
            // 1. Get basic product data
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
            
            // 2. Get colors
            let colors = [];
            try {
                const { data: colorsData } = await supabase
                    .from('product_colors')
                    .select('*')
                    .eq('product_id', productId)
                    .order('color_name');
                
                colors = colorsData || [];
                console.log(`✅ Loaded ${colors.length} colors`);
            } catch (colorError) {
                console.log('⚠️ No colors or table missing:', colorError.message);
            }
            
            // 3. Get sizes
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
            
            // 4. Build color-size map
            const colorSizeMap = {};
            if (colors.length > 0 && sizes.length > 0) {
                // Assuming all sizes are available for all colors
                // In a real app, you might have a color_size_availability table
                colors.forEach(color => {
                    colorSizeMap[color.id] = sizes;
                });
            }
            
            // 5. Get modal configuration
            let modalConfig = null;
            try {
                const { data: modalData } = await supabase
                    .from('product_modals')
                    .select('*')
                    .eq('product_id', productId)
                    .maybeSingle();
                
                modalConfig = modalData;
                console.log('✅ Modal config:', modalConfig ? 'found' : 'not found');
            } catch (modalError) {
                console.log('⚠️ No modal config:', modalError.message);
            }
            
            // 6. Get reviews
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
                console.log('⚠️ No reviews:', reviewError.message);
            }
            
            // 7. Get bulk pricing
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
                console.log('⚠️ No bulk pricing:', pricingError.message);
            }
            
            // Store data globally
            currentProduct = product;
            currentModalConfig = modalConfig;
            currentProductColors = colors;
            currentProductSizes = sizes;
            currentSelectedColor = colors.length > 0 ? colors[0] : null;
            currentSelectedSize = null;
            
            // 8. Render the modal
            renderProductModal(product, {
                modalConfig,
                colors,
                sizes,
                reviews,
                bulkPricing,
                colorSizeMap
            });
            
            // 9. Open modal
            const modalOverlay = document.getElementById('modalOverlay');
            if (modalOverlay) {
                modalOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                console.log('✅ Modal opened successfully');
            }
            
        } catch (error) {
            console.error('❌ Detailed modal error:', error);
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
        
        // Product Prices - FIXED: Use formatPrice to handle undefined
        const productRealPrice = document.getElementById('productRealPrice');
        if (productRealPrice) {
            productRealPrice.textContent = formatPrice(product.price);
        }
        
        const productFakePrice = document.getElementById('productFakePrice');
        if (productFakePrice) {
            const fakePrice = product.price ? Math.round(product.price * 1.35) : 0;
            productFakePrice.textContent = formatPrice(fakePrice);
        }
        
        // Product Description
        const productDescription = document.getElementById('productDescription');
        if (productDescription) {
            productDescription.textContent = product.description || 
                `${product.name} - Premium quality footwear designed for comfort and style.`;
        }
        
        // ====================
        // 2. COLOR SELECTOR
        // ====================
        const colorSelector = document.getElementById('colorSelector');
        if (!colorSelector) {
            // Create color selector if it doesn't exist
            const sizeSelectionDiv = document.querySelector('.size-selection');
            if (sizeSelectionDiv) {
                const colorSelectorHTML = `
                    <div class="color-selection" style="margin-bottom: 30px;">
                        <h4><i class="fas fa-palette"></i> Select Color</h4>
                        <div class="color-grid" id="colorGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; margin-bottom: 20px;">
                            <!-- Colors will be added here -->
                        </div>
                    </div>
                `;
                sizeSelectionDiv.insertAdjacentHTML('beforebegin', colorSelectorHTML);
            }
        }
        
        const colorGrid = document.getElementById('colorGrid');
        if (colorGrid) {
            colorGrid.innerHTML = '';
            
            const { colors = [] } = data;
            
            if (colors.length > 0) {
                colors.forEach(color => {
                    const colorOption = document.createElement('button');
                    colorOption.className = 'color-option';
                    colorOption.dataset.colorId = color.id;
                    colorOption.dataset.colorName = color.color_name;
                    colorOption.dataset.hexCode = color.hex_code;
                    
                    // Create color swatch
                    const colorSwatch = document.createElement('div');
                    colorSwatch.style.width = '40px';
                    colorSwatch.style.height = '40px';
                    colorSwatch.style.backgroundColor = color.hex_code || '#ccc';
                    colorSwatch.style.borderRadius = '4px';
                    colorSwatch.style.margin = '0 auto 5px';
                    colorSwatch.style.border = '2px solid #333';
                    
                    colorOption.appendChild(colorSwatch);
                    
                    const colorName = document.createElement('div');
                    colorName.textContent = color.color_name;
                    colorName.style.fontSize = '0.8rem';
                    colorName.style.marginTop = '5px';
                    colorOption.appendChild(colorName);
                    
                    colorOption.style.display = 'flex';
                    colorOption.style.flexDirection = 'column';
                    colorOption.style.alignItems = 'center';
                    colorOption.style.padding = '10px';
                    colorOption.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                    colorOption.style.background = 'transparent';
                    colorOption.style.color = 'white';
                    colorOption.style.cursor = 'pointer';
                    colorOption.style.transition = 'all 0.3s ease';
                    colorOption.style.borderRadius = '4px';
                    
                    colorOption.addEventListener('click', function() {
                        // Remove selected class from all color options
                        colorGrid.querySelectorAll('.color-option').forEach(opt => {
                            opt.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            opt.style.boxShadow = 'none';
                        });
                        
                        // Add selected style
                        this.style.borderColor = '#d4af37';
                        this.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.5)';
                        
                        // Update selected color
                        currentSelectedColor = {
                            id: this.dataset.colorId,
                            name: this.dataset.colorName,
                            hex: this.dataset.hexCode
                        };
                        
                        console.log('Selected color:', currentSelectedColor);
                        
                        // Update size grid based on selected color
                        updateSizeGridForColor(data.colorSizeMap?.[color.id] || data.sizes || []);
                    });
                    
                    colorGrid.appendChild(colorOption);
                    
                    // Select first color by default
                    if (colors.indexOf(color) === 0) {
                        setTimeout(() => {
                            colorOption.click();
                        }, 100);
                    }
                });
            } else {
                colorGrid.innerHTML = '<p style="color: #ccc; text-align: center; grid-column: 1 / -1;">No colors available</p>';
            }
        }
        
        // ====================
        // 3. SIZE SELECTOR
        // ====================
        function updateSizeGridForColor(availableSizes = []) {
            const sizeGrid = document.getElementById('sizeGrid');
            if (!sizeGrid) return;
            
            sizeGrid.innerHTML = '';
            currentSelectedSize = null;
            
            if (availableSizes.length > 0) {
                availableSizes.forEach(size => {
                    const sizeOption = document.createElement('button');
                    sizeOption.className = 'size-option';
                    sizeOption.textContent = size.size_value;
                    sizeOption.dataset.sizeId = size.id;
                    sizeOption.dataset.sizeValue = size.size_value;
                    sizeOption.dataset.stock = size.stock;
                    
                    // Add stock indicator
                    if (size.stock <= 0) {
                        sizeOption.disabled = true;
                        sizeOption.style.opacity = '0.5';
                        sizeOption.style.cursor = 'not-allowed';
                        sizeOption.innerHTML += `<br><small style="color: #ff6b6b;">Out of stock</small>`;
                    } else if (size.stock < 10) {
                        sizeOption.innerHTML += `<br><small style="color: #f39c12;">${size.stock} left</small>`;
                    }
                    
                    sizeOption.addEventListener('click', function() {
                        // Remove selected class from all size options
                        sizeGrid.querySelectorAll('.size-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        
                        // Add selected class to clicked option
                        this.classList.add('selected');
                        currentSelectedSize = {
                            id: this.dataset.sizeId,
                            value: this.dataset.sizeValue,
                            stock: this.dataset.stock
                        };
                        
                        console.log('Selected size:', currentSelectedSize);
                    });
                    
                    sizeGrid.appendChild(sizeOption);
                });
            } else {
                sizeGrid.innerHTML = '<p style="color: #ccc; text-align: center; grid-column: 1 / -1;">No sizes available for this color</p>';
            }
        }
        
        // Initialize size grid with all sizes
        updateSizeGridForColor(data.sizes || []);
        
        // ====================
        // 4. BULK PRICING
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
                        const totalPrice = (tier.price_per_unit || 0) * (tier.min_quantity || 1);
                        row.innerHTML = `
                            <td>${tier.min_quantity || 1}+ Units</td>
                            <td>${formatPrice(tier.price_per_unit)}</td>
                            <td>${formatPrice(totalPrice)}</td>
                        `;
                        bulkPricingBody.appendChild(row);
                    });
                } else {
                    // Fallback pricing
                    [1, 10, 25, 50, 100].forEach(qty => {
                        const basePrice = product.price || 0;
                        const discount = qty === 1 ? 0 : Math.min(30, Math.floor(qty / 10) * 5);
                        const unitPrice = Math.round(basePrice * (1 - discount / 100));
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${qty} Unit${qty > 1 ? 's' : ''}</td>
                            <td>${formatPrice(unitPrice)}</td>
                            <td>${formatPrice(unitPrice * qty)}</td>
                        `;
                        bulkPricingBody.appendChild(row);
                    });
                }
            }
        }
        
        // ====================
        // 5. QUANTITY OPTIONS
        // ====================
        const quantityOptionsModal = document.getElementById('quantityOptionsModal');
        const quantityTotalPrice = document.getElementById('quantityTotalPrice');
        
        if (quantityOptionsModal && quantityTotalPrice) {
            quantityOptionsModal.innerHTML = '';
            
            // Get quantity options from modal config or use defaults
            const defaultOptions = data.modalConfig?.default_quantity_options || [1, 5, 10, 25, 50, 100];
            
            defaultOptions.forEach((qty, index) => {
                // Simple price calculation
                const basePrice = product.price || 0;
                let unitPrice = basePrice;
                if (qty > 1) {
                    const discount = Math.min(30, Math.floor(qty / 10) * 5);
                    unitPrice = Math.round(basePrice * (1 - discount / 100));
                }
                
                const totalPrice = unitPrice * qty;
                
                const option = document.createElement('button');
                option.className = `quantity-option-modal ${index === 0 ? 'selected' : ''}`;
                option.dataset.quantity = qty;
                option.dataset.unitPrice = unitPrice;
                option.dataset.totalPrice = totalPrice;
                
                option.innerHTML = `
                    <div style="font-weight: 600;">${qty} Unit${qty > 1 ? 's' : ''}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">${formatPrice(unitPrice)}/unit</div>
                `;
                
                option.addEventListener('click', function() {
                    quantityOptionsModal.querySelectorAll('.quantity-option-modal').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    
                    quantityTotalPrice.textContent = formatPrice(totalPrice);
                    currentSelectedQuantity = qty;
                });
                
                quantityOptionsModal.appendChild(option);
                
                // Set initial values
                if (index === 0) {
                    quantityTotalPrice.textContent = formatPrice(totalPrice);
                    currentSelectedQuantity = qty;
                }
            });
        }
        
        // ====================
        // 6. REVIEWS
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
        
        // View Details buttons
        document.addEventListener('click', function(event) {
            const viewDetailsBtn = event.target.closest('.btn-view-details');
            if (viewDetailsBtn) {
                event.preventDefault();
                const productId = parseInt(viewDetailsBtn.getAttribute('data-id'));
                console.log('👁️ View details clicked for product:', productId);
                openProductModal(productId);
            }
        });
        
        // Add to Cart buttons (from product cards)
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
    // CART FUNCTIONS - UPDATED FOR COLOR & SIZE
    // ====================
    function addToCart(product, quantity = 1, options = {}) {
        let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        
        // Create cart item with color and size
        const cartItem = {
            product_id: product.id,
            quantity: quantity,
            name: product.name,
            price: product.price || 0,
            image_url: product.image_url,
            category_slug: getCurrentCategory(),
            color: options.color || null,
            size: options.size || null,
            color_name: options.color_name || null,
            size_value: options.size_value || null
        };
        
        // Check if same product with same color/size already in cart
        const existingIndex = cart.findIndex(item => 
            item.product_id === product.id && 
            item.color_name === cartItem.color_name && 
            item.size_value === cartItem.size_value
        );
        
        if (existingIndex !== -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push(cartItem);
        }
        
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartUI();
        
        // Show detailed notification
        let notificationText = `${product.name}`;
        if (options.color_name) notificationText += ` (${options.color_name})`;
        if (options.size_value) notificationText += ` - Size: ${options.size_value}`;
        notificationText += ' added to cart!';
        
        showNotification(notificationText, 'success');
    }
    
    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCount = document.getElementById('cartCount');
        
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        // Update cart panel if it's open
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
        
        cart.forEach((item, index) => {
            const itemTotal = (item.price || 0) * item.quantity;
            total += itemTotal;
            
            // Build item description with color and size
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
                        <div class="cart-item-quantity">
                            <button class="decrease-quantity" data-index="${index}">-</button>
                            <span>${item.quantity}</span>
                            <button class="increase-quantity" data-index="${index}">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        cartItems.innerHTML = html;
        cartTotal.textContent = formatPrice(total);
        
        // Setup cart interactions
        setupCartInteractions();
        
        // Update WhatsApp checkout link
        if (whatsappCheckout) {
            let text = "I would like to purchase:\n";
            cart.forEach(item => {
                let itemDescription = item.name;
                if (item.color_name) itemDescription += ` (${item.color_name})`;
                if (item.size_value) itemDescription += ` - Size ${item.size_value}`;
                
                const itemTotal = (item.price || 0) * item.quantity;
                text += `- ${itemDescription} (${item.quantity} × ${formatPrice(item.price)}) = ${formatPrice(itemTotal)}\n`;
            });
            text += `\n*Total: ${formatPrice(total)}*\n\nPlease confirm order & shipping details.`;
            whatsappCheckout.href = `https://wa.me/2348139583320?text=${encodeURIComponent(text)}`;
        }
    }
    
    function setupCartInteractions() {
        // Decrease quantity
        document.querySelectorAll('.decrease-quantity').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                
                if (cart[index].quantity > 1) {
                    cart[index].quantity--;
                } else {
                    cart.splice(index, 1);
                }
                
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                showNotification('Cart updated', 'info');
            });
        });
        
        // Increase quantity
        document.querySelectorAll('.increase-quantity').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                
                cart[index].quantity++;
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                showNotification('Cart updated', 'info');
            });
        });
        
        // Remove item
        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
                const removedItem = cart[index];
                
                cart.splice(index, 1);
                localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
                updateCartUI();
                
                showNotification(`${removedItem.name} removed from cart`, 'info');
            });
        });
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
                
                // Validate selection
                if (currentProductColors.length > 0 && !currentSelectedColor) {
                    showNotification('Please select a color', 'warning');
                    return;
                }
                
                if (currentProductSizes.length > 0 && !currentSelectedSize) {
                    showNotification('Please select a size', 'warning');
                    return;
                }
                
                // Add to cart with color and size
                addToCart(currentProduct, currentSelectedQuantity, {
                    color: currentSelectedColor?.id,
                    color_name: currentSelectedColor?.name,
                    size: currentSelectedSize?.id,
                    size_value: currentSelectedSize?.value
                });
                
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
            initializePage,
            formatPrice // Expose for debugging
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
    
    console.log('✅ JMPOTTERS app loaded with color & size selection');
})();
