// ====================
// JMPOTTERS APP - COMPLETE IMPROVED VERSION
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting (Improved v2)...');
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
    let currentSelectedVariant = null;
    let currentProductColors = [];
    let currentProductSizes = [];
    let colorSizeMap = {};
    let sizeColorMap = {};
    
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
    // MODAL FUNCTIONS - WITH IMPROVED DROPDOWNS
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
            
            // 2. Get colors for this product
            const { data: colors, error: colorsError } = await supabase
                .from('product_colors')
                .select('*')
                .eq('product_id', productId)
                .order('sort_order');
            
            if (colorsError) {
                console.error('❌ Colors fetch error:', colorsError);
                throw new Error('Failed to load colors');
            }
            
            console.log(`✅ Loaded ${colors?.length || 0} colors`);
            
            // 3. Get sizes with stock for this product
            const { data: sizes, error: sizesError } = await supabase
                .from('product_sizes')
                .select('*')
                .eq('product_id', productId)
                .order('size_value');
            
            if (sizesError) {
                console.error('❌ Sizes fetch error:', sizesError);
                throw new Error('Failed to load sizes');
            }
            
            console.log(`✅ Loaded ${sizes?.length || 0} size variants`);
            
            // 4. Get modal configuration
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
            
            // 5. Build mappings
            currentProduct = product;
            currentModalConfig = modalConfig;
            currentProductColors = colors || [];
            currentProductSizes = sizes || [];
            currentSelectedColor = null;
            currentSelectedSize = null;
            currentSelectedVariant = null;
            
            buildColorSizeMappings(colors || [], sizes || []);
            
            // 6. Render modal with new dropdown interface
            renderModalWithDropdowns(product, colors || [], sizes || [], modalConfig);
            
            // 7. Open modal
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
    
    function buildColorSizeMappings(colors, sizes) {
        // Reset mappings
        colorSizeMap = {};
        sizeColorMap = {};
        
        // Build color -> sizes map
        colors.forEach(color => {
            colorSizeMap[color.id] = sizes.filter(size => size.color_id === color.id);
        });
        
        // Build size -> colors map
        const uniqueSizes = [...new Set(sizes.map(s => s.size_value))];
        uniqueSizes.forEach(sizeValue => {
            const sizeVariants = sizes.filter(s => s.size_value === sizeValue);
            sizeColorMap[sizeValue] = colors.filter(color => 
                sizeVariants.some(s => s.color_id === color.id)
            );
        });
        
        console.log('🗺️ Built color-size mappings:', {
            colors: colors.length,
            sizes: sizes.length,
            colorSizeMapEntries: Object.keys(colorSizeMap).length,
            sizeColorMapEntries: Object.keys(sizeColorMap).length
        });
    }
    
    function renderModalWithDropdowns(product, colors, sizes, modalConfig) {
        console.log('🎨 Rendering modal with dropdowns for:', product.name);
        
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
        // 2. REPLACE GRIDS WITH DROPDOWNS
        // ====================
        const sizeSelectionDiv = document.querySelector('.size-selection');
        if (sizeSelectionDiv) {
            sizeSelectionDiv.innerHTML = '';
            
            // Create dropdown container
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'variant-selector-dropdown';
            dropdownContainer.innerHTML = `
                <div class="dropdown-section">
                    <h4><i class="fas fa-palette"></i> Select Color</h4>
                    <div class="dropdown-wrapper">
                        <button class="dropdown-btn" id="colorDropdownBtn">
                            <span class="dropdown-text">Choose Color</span>
                            <i class="fas fa-chevron-down dropdown-icon"></i>
                        </button>
                        <div class="dropdown-menu" id="colorDropdownMenu">
                            ${colors.length > 0 ? colors.map(color => `
                                <div class="dropdown-item" data-color-id="${color.id}" data-color-name="${color.color_name}">
                                    <span class="color-indicator" style="background-color: ${color.color_code || '#666'}"></span>
                                    ${color.color_name}
                                    <span class="color-stock-count">
                                        (${colorSizeMap[color.id]?.length || 0} sizes)
                                    </span>
                                </div>
                            `).join('') : `
                                <div class="dropdown-item empty">No colors available</div>
                            `}
                        </div>
                    </div>
                </div>
                
                <div class="dropdown-section">
                    <h4><i class="fas fa-ruler"></i> Select Size</h4>
                    <div class="dropdown-wrapper">
                        <button class="dropdown-btn" id="sizeDropdownBtn" disabled>
                            <span class="dropdown-text">Select Color First</span>
                            <i class="fas fa-chevron-down dropdown-icon"></i>
                        </button>
                        <div class="dropdown-menu" id="sizeDropdownMenu">
                            <div class="dropdown-item empty">Please select a color first</div>
                        </div>
                    </div>
                </div>
                
                <div class="selection-info" id="selectionInfo" style="display: none;">
                    <div class="selected-combination">
                        <span id="selectedColorDisplay"></span>
                        <span class="separator">-</span>
                        <span id="selectedSizeDisplay"></span>
                    </div>
                    <div class="stock-info">
                        <i class="fas fa-box"></i>
                        <span>Stock Available:</span>
                        <strong id="stockQuantityDisplay">0</strong>
                    </div>
                    <div class="action-hint">
                        <i class="fas fa-info-circle"></i>
                        <span>Select both color and size to see stock</span>
                    </div>
                </div>
            `;
            
            sizeSelectionDiv.appendChild(dropdownContainer);
            
            // Add custom styles
            addDropdownStyles();
            
            // Initialize dropdown interactions
            setupDropdownInteractions();
        }
        
        // ====================
        // 3. BULK PRICING
        // ====================
        const bulkPricingBody = document.getElementById('bulkPricingBody');
        if (bulkPricingBody) {
            bulkPricingBody.innerHTML = '';
            
            if (modalConfig?.show_bulk_pricing !== false) {
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
        
        // ====================
        // 4. QUANTITY OPTIONS
        // ====================
        const quantityOptionsModal = document.getElementById('quantityOptionsModal');
        const quantityTotalPrice = document.getElementById('quantityTotalPrice');
        
        if (quantityOptionsModal && quantityTotalPrice) {
            quantityOptionsModal.innerHTML = '';
            
            // Get quantity options from modal config or use defaults
            const defaultOptions = modalConfig?.default_quantity_options || [1, 5, 10, 25, 50, 100];
            
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
                    
                    // Update add to cart button if variant is selected
                    updateAddToCartButton();
                });
                
                quantityOptionsModal.appendChild(option);
                
                // Set initial values
                if (index === 0) {
                    quantityTotalPrice.textContent = formatPrice(totalPrice);
                    currentSelectedQuantity = qty;
                }
            });
        }
        
        console.log('✅ Modal dropdowns rendered successfully');
    }
    
    function addDropdownStyles() {
        // Only add styles once
        if (document.getElementById('dropdown-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dropdown-styles';
        style.textContent = `
            .variant-selector-dropdown {
                margin: 25px 0;
                padding: 20px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .dropdown-section {
                margin-bottom: 25px;
            }
            
            .dropdown-section h4 {
                color: var(--gold);
                margin-bottom: 10px;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .dropdown-wrapper {
                position: relative;
            }
            
            .dropdown-btn {
                width: 100%;
                padding: 14px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.3s ease;
                font-size: 1rem;
            }
            
            .dropdown-btn:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.1);
                border-color: var(--gold);
            }
            
            .dropdown-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .dropdown-text {
                flex: 1;
            }
            
            .dropdown-icon {
                transition: transform 0.3s ease;
            }
            
            .dropdown-btn.active .dropdown-icon {
                transform: rotate(180deg);
            }
            
            .dropdown-menu {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                max-height: 300px;
                overflow-y: auto;
                background: #1a1a1a;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                margin-top: 5px;
                z-index: 1000;
                display: none;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            }
            
            .dropdown-menu.show {
                display: block;
            }
            
            .dropdown-item {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                color: #ddd;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .dropdown-item:last-child {
                border-bottom: none;
            }
            
            .dropdown-item:hover {
                background: rgba(212, 175, 55, 0.15);
                color: white;
            }
            
            .dropdown-item.selected {
                background: rgba(212, 175, 55, 0.25);
                color: white;
            }
            
            .dropdown-item.empty {
                cursor: default;
                opacity: 0.7;
                font-style: italic;
            }
            
            .dropdown-item.empty:hover {
                background: transparent;
            }
            
            .color-indicator {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.5);
                flex-shrink: 0;
            }
            
            .color-stock-count {
                margin-left: auto;
                font-size: 0.85rem;
                opacity: 0.7;
            }
            
            .selection-info {
                margin-top: 25px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                border-left: 3px solid var(--gold);
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .selected-combination {
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 15px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .separator {
                opacity: 0.5;
            }
            
            .stock-info {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 10px;
                color: #ddd;
            }
            
            .stock-info i {
                color: var(--gold);
            }
            
            #stockQuantityDisplay {
                color: var(--gold);
                font-size: 1.2rem;
                margin-left: 5px;
            }
            
            .action-hint {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.9rem;
                color: #aaa;
            }
            
            .action-hint i {
                color: #4d96ff;
            }
            
            .size-with-stock {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            }
            
            .size-stock-badge {
                font-size: 0.8rem;
                padding: 2px 8px;
                border-radius: 10px;
                background: rgba(212, 175, 55, 0.2);
                color: var(--gold);
            }
            
            .size-stock-badge.low {
                background: rgba(243, 156, 18, 0.2);
                color: #f39c12;
            }
            
            .size-stock-badge.out {
                background: rgba(231, 76, 60, 0.2);
                color: #e74c3c;
            }
        `;
        document.head.appendChild(style);
    }
    
    function setupDropdownInteractions() {
        const colorDropdownBtn = document.getElementById('colorDropdownBtn');
        const colorDropdownMenu = document.getElementById('colorDropdownMenu');
        const sizeDropdownBtn = document.getElementById('sizeDropdownBtn');
        const sizeDropdownMenu = document.getElementById('sizeDropdownMenu');
        const selectionInfo = document.getElementById('selectionInfo');
        
        if (!colorDropdownBtn || !sizeDropdownBtn) return;
        
        // Toggle dropdowns
        colorDropdownBtn.addEventListener('click', () => {
            colorDropdownMenu.classList.toggle('show');
            colorDropdownBtn.classList.toggle('active');
            sizeDropdownMenu.classList.remove('show');
            sizeDropdownBtn.classList.remove('active');
        });
        
        sizeDropdownBtn.addEventListener('click', () => {
            if (sizeDropdownBtn.disabled) return;
            sizeDropdownMenu.classList.toggle('show');
            sizeDropdownBtn.classList.toggle('active');
            colorDropdownMenu.classList.remove('show');
            colorDropdownBtn.classList.remove('active');
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (event) => {
            if (!colorDropdownBtn.contains(event.target) && !colorDropdownMenu.contains(event.target)) {
                colorDropdownMenu.classList.remove('show');
                colorDropdownBtn.classList.remove('active');
            }
            if (!sizeDropdownBtn.contains(event.target) && !sizeDropdownMenu.contains(event.target)) {
                sizeDropdownMenu.classList.remove('show');
                sizeDropdownBtn.classList.remove('active');
            }
        });
        
        // Color selection
        colorDropdownMenu.querySelectorAll('.dropdown-item:not(.empty)').forEach(item => {
            item.addEventListener('click', () => {
                const colorId = parseInt(item.dataset.colorId);
                const colorName = item.dataset.colorName;
                
                // Update selected color
                currentSelectedColor = {
                    id: colorId,
                    name: colorName
                };
                
                // Update UI
                colorDropdownBtn.querySelector('.dropdown-text').textContent = colorName;
                colorDropdownMenu.classList.remove('show');
                colorDropdownBtn.classList.remove('active');
                
                // Remove selected class from all color items
                colorDropdownMenu.querySelectorAll('.dropdown-item').forEach(i => {
                    i.classList.remove('selected');
                });
                item.classList.add('selected');
                
                // Enable and update size dropdown
                sizeDropdownBtn.disabled = false;
                sizeDropdownBtn.querySelector('.dropdown-text').textContent = 'Choose Size';
                updateSizeDropdownForColor(colorId);
                
                // If size is already selected, update stock display
                if (currentSelectedSize) {
                    updateStockDisplay();
                }
            });
        });
        
        // Size selection
        // This will be populated dynamically
    }
    
    function updateSizeDropdownForColor(colorId) {
        const sizeDropdownMenu = document.getElementById('sizeDropdownMenu');
        const sizeDropdownBtn = document.getElementById('sizeDropdownBtn');
        
        if (!sizeDropdownMenu || !sizeDropdownBtn) return;
        
        // Get sizes for this color
        const availableSizes = colorSizeMap[colorId] || [];
        
        if (availableSizes.length === 0) {
            sizeDropdownMenu.innerHTML = '<div class="dropdown-item empty">No sizes available for this color</div>';
            sizeDropdownBtn.disabled = true;
            currentSelectedSize = null;
            updateStockDisplay();
            return;
        }
        
        // Populate size dropdown
        sizeDropdownMenu.innerHTML = availableSizes.map(size => {
            const stockBadgeClass = size.stock_quantity === 0 ? 'out' : 
                                   size.stock_quantity < 5 ? 'low' : '';
            
            return `
                <div class="dropdown-item" data-size-id="${size.id}" data-size-value="${size.size_value}" data-stock="${size.stock_quantity}">
                    <div class="size-with-stock">
                        <span>${size.size_value}</span>
                        <span class="size-stock-badge ${stockBadgeClass}">
                            ${size.stock_quantity === 0 ? 'Out of stock' : 
                              size.stock_quantity < 5 ? `${size.stock_quantity} left` : 
                              'In stock'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add size selection event listeners
        sizeDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const sizeId = parseInt(item.dataset.sizeId);
                const sizeValue = item.dataset.sizeValue;
                const stock = parseInt(item.dataset.stock);
                
                // Update selected size
                currentSelectedSize = {
                    id: sizeId,
                    value: sizeValue,
                    stock: stock
                };
                
                // Find the exact variant
                currentSelectedVariant = currentProductSizes.find(s => 
                    s.id === sizeId && s.color_id === currentSelectedColor?.id
                );
                
                // Update UI
                sizeDropdownBtn.querySelector('.dropdown-text').textContent = sizeValue;
                sizeDropdownMenu.classList.remove('show');
                sizeDropdownBtn.classList.remove('active');
                
                // Remove selected class from all size items
                sizeDropdownMenu.querySelectorAll('.dropdown-item').forEach(i => {
                    i.classList.remove('selected');
                });
                item.classList.add('selected');
                
                // Update stock display
                updateStockDisplay();
            });
        });
        
        // If we have a previously selected size that's also available for this color,
        // automatically select it
        if (currentSelectedSize) {
            const matchingSize = availableSizes.find(s => s.size_value === currentSelectedSize.value);
            if (matchingSize) {
                setTimeout(() => {
                    const sizeItem = sizeDropdownMenu.querySelector(`[data-size-value="${matchingSize.size_value}"]`);
                    if (sizeItem) {
                        sizeItem.click();
                    }
                }, 100);
            }
        }
    }
    
    function updateStockDisplay() {
        const selectionInfo = document.getElementById('selectionInfo');
        const selectedColorDisplay = document.getElementById('selectedColorDisplay');
        const selectedSizeDisplay = document.getElementById('selectedSizeDisplay');
        const stockQuantityDisplay = document.getElementById('stockQuantityDisplay');
        
        if (!selectionInfo || !selectedColorDisplay || !selectedSizeDisplay || !stockQuantityDisplay) return;
        
        if (currentSelectedColor && currentSelectedSize) {
            // Show selection info
            selectedColorDisplay.textContent = currentSelectedColor.name;
            selectedSizeDisplay.textContent = currentSelectedSize.value;
            stockQuantityDisplay.textContent = currentSelectedSize.stock;
            
            // Add stock status class
            stockQuantityDisplay.className = '';
            if (currentSelectedSize.stock === 0) {
                stockQuantityDisplay.classList.add('out-of-stock');
            } else if (currentSelectedSize.stock < 5) {
                stockQuantityDisplay.classList.add('low-stock');
            } else {
                stockQuantityDisplay.classList.add('in-stock');
            }
            
            selectionInfo.style.display = 'block';
            
            // Update add to cart button
            updateAddToCartButton();
        } else {
            selectionInfo.style.display = 'none';
        }
    }
    
    function updateAddToCartButton() {
        const modalAddCart = document.getElementById('modalAddCart');
        if (!modalAddCart) return;
        
        if (currentSelectedColor && currentSelectedSize && currentSelectedSize.stock > 0) {
            modalAddCart.disabled = false;
            modalAddCart.innerHTML = `<i class="fas fa-shopping-cart"></i> Add to Cart (${currentSelectedQuantity} units)`;
            modalAddCart.style.opacity = '1';
            modalAddCart.style.cursor = 'pointer';
        } else {
            modalAddCart.disabled = true;
            modalAddCart.innerHTML = `<i class="fas fa-shopping-cart"></i> Select Color & Size`;
            modalAddCart.style.opacity = '0.6';
            modalAddCart.style.cursor = 'not-allowed';
        }
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
    // CART FUNCTIONS
    // ====================
    function addToCart(product, quantity = 1, options = {}) {
        let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        
        // Create cart item
        const cartItem = {
            product_id: product.id,
            quantity: quantity,
            name: product.name,
            price: product.price || 0,
            image_url: product.image_url,
            category_slug: getCurrentCategory(),
            color_id: options.color_id || null,
            color_name: options.color_name || null,
            size_id: options.size_id || null,
            size_value: options.size_value || null,
            variant_id: options.variant_id || null,
            added_at: new Date().toISOString()
        };
        
        // Check if same variant already in cart
        const existingIndex = cart.findIndex(item => 
            item.product_id === cartItem.product_id && 
            item.color_id === cartItem.color_id && 
            item.size_id === cartItem.size_id
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
        if (options.size_value) notificationText += ` - Size ${options.size_value}`;
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
            
            // Build item description
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
                if (!currentSelectedColor) {
                    showNotification('Please select a color', 'warning');
                    return;
                }
                
                if (!currentSelectedSize) {
                    showNotification('Please select a size', 'warning');
                    return;
                }
                
                if (currentSelectedSize.stock === 0) {
                    showNotification('This size is out of stock', 'error');
                    return;
                }
                
                if (currentSelectedQuantity > currentSelectedSize.stock) {
                    showNotification(`Only ${currentSelectedSize.stock} units available`, 'error');
                    return;
                }
                
                // Add to cart with all details
                addToCart(currentProduct, currentSelectedQuantity, {
                    color_id: currentSelectedColor.id,
                    color_name: currentSelectedColor.name,
                    size_id: currentSelectedSize.id,
                    size_value: currentSelectedSize.value,
                    variant_id: currentSelectedVariant?.id
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
            formatPrice
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
    
    console.log('✅ JMPOTTERS app loaded with improved dropdowns');
})();
