// ====================
// JMPOTTERS APP - COMPLETE FIXED VERSION WITH PERMANENT PRODUCT URLs
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting (Fixed v3)...');
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
            'accessories': 'accessories/',
            'healthcare': ''
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
    
    // Cart panel state
    let isCartOpen = false;
    
    // ====================
    // UTILITY FUNCTIONS
    // ====================
    function getCurrentCategory() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        
        // Map your actual category slugs from database
        const pageToCategory = {
            'mensfootwear': 'mensfootwear',
            'womensfootwear': 'womensfootwear',
            'bags': 'bags',
            'household': 'household',
            'kids': 'kids',
            'accessories': 'accessories',
            'healthcare': 'healthcare'
        };
        
        return pageToCategory[page] || 'mensfootwear';
    }
    
    function isProductPage() {
        return window.location.pathname.includes('product.html');
    }
    
    function getSlugFromURL() {
        if (!isProductPage()) return null;
        
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');
        
        // Decode the slug to handle spaces and special characters
        return slug ? decodeURIComponent(slug) : null;
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
        
        // Create or get notification container
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
        toast.style.cssText = `
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 200px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            toast.style.background = '#38a169';
        } else if (type === 'error') {
            toast.style.background = '#e53e3e';
        } else if (type === 'warning') {
            toast.style.background = '#d69e2e';
        } else {
            toast.style.background = '#4a5568';
        }
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info}" style="font-size: 18px;"></i>
            <span>${message}</span>
        `;
        
        notificationContainer.appendChild(toast);
        
        // Add slideIn animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
    // LOAD SINGLE PRODUCT BY SLUG (FOR PERMANENT URLS)
    // ====================
    async function loadSingleProductBySlug(slug) {
        console.log(`📦 Loading single product by slug: ${slug}`);
        
        const productViewer = document.getElementById('productViewer');
        if (!productViewer) {
            console.error('❌ Product viewer container not found');
            return;
        }
        
        // Show loading state
        productViewer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading product details...</p>
            </div>
        `;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productViewer.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Database Connection Error</h3>
                    <p>Failed to connect to database.</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
            return;
        }
        
        try {
            // Get product first
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();
            
            if (productError || !product) {
                console.error('❌ Product not found:', slug);
                throw new Error('Product not found');
            }
            
            console.log('✅ Loaded product:', product.name);
            
            // Get category separately
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('id', product.category_id)
                .single();
            
            if (catError) {
                console.warn('⚠️ Category not found for product:', product.id);
            }
            
            // Get colors separately
            const { data: colors, error: colorsError } = await supabase
                .from('product_colors')
                .select('*')
                .eq('product_id', product.id)
                .order('sort_order');
            
            if (colorsError) {
                console.warn('⚠️ Could not load colors:', colorsError);
            }
            
            // Get sizes separately
            const { data: sizes, error: sizesError } = await supabase
                .from('product_sizes')
                .select('*')
                .eq('product_id', product.id)
                .order('size_value');
            
            if (sizesError) {
                console.warn('⚠️ Could not load sizes:', sizesError);
            }
            
            // Update document title
            document.title = `${product.name} - JMPOTTERS`;
            
            // Set current product state
            currentProduct = product;
            currentProduct.category_slug = category?.slug || getCurrentCategory();
            currentProduct.category_name = category?.name || 'Category';
            currentProductColors = colors || [];
            currentProductSizes = sizes || [];
            currentSelectedQuantity = 1;
            currentSelectedColor = null;
            currentSelectedSize = null;
            
            // Build mappings
            buildColorSizeMappings(currentProductColors, currentProductSizes);
            
            // Render product on standalone page
            renderProductPage(currentProduct);
            
            // Update breadcrumb
            updateBreadcrumb(currentProduct);
            
            // Setup product page interactions
            setupProductPageInteractions();
            
        } catch (error) {
            console.error('❌ Error loading product by slug:', error);
            productViewer.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Product Not Found</h3>
                    <p>The product "${slug}" was not found or is no longer available.</p>
                    <a href="index.html" class="btn">Return to Home</a>
                </div>
            `;
        }
    }
    
    function renderProductPage(product) {
        const productViewer = document.getElementById('productViewer');
        if (!productViewer) return;
        
        const categorySlug = product.category_slug || getCurrentCategory();
        const imageUrl = getImageUrl(categorySlug, product.image_url);
        
        // Determine if it's footwear (needs size/color selectors)
        const isFootwear = ['mensfootwear', 'womensfootwear'].includes(categorySlug);
        
        // Check wishlist status
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const isInWishlist = wishlist.some(item => item.id === product.id);
        
        productViewer.innerHTML = `
            <!-- Breadcrumb -->
            <div class="breadcrumb">
                <a href="index.html">Home</a>
                <i class="fas fa-chevron-right"></i>
                <a href="${categorySlug}.html">${product.category_name || categorySlug}</a>
                <i class="fas fa-chevron-right"></i>
                <span>${product.name}</span>
            </div>
            
            <!-- Product Main Container -->
            <div class="product-page-container">
                <!-- Product Images -->
                <div class="product-images">
                    <div class="main-image">
                        <img src="${imageUrl}" alt="${product.name}" 
                             onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    </div>
                </div>
                
                <!-- Product Details -->
                <div class="product-details">
                    <h1 class="product-title">${product.name}</h1>
                    
                    <!-- Price - SIMPLIFIED (No fake prices or discounts) -->
                    <div class="product-price-container">
                        <div class="current-price">${formatPrice(product.price)}</div>
                    </div>
                    
                    <!-- Availability -->
                    <div class="availability">
                        <i class="fas fa-check-circle"></i>
                        <span>${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                        <span class="stock-count">${product.stock > 0 ? `${product.stock} units available` : ''}</span>
                    </div>
                    
                    <!-- Description -->
                    <div class="product-description">
                        <h3>Description</h3>
                        <p>${product.description || 'Premium quality product from JMPOTTERS.'}</p>
                    </div>
                    
                    <!-- Variant Selectors (for footwear) -->
                    ${isFootwear && currentProductColors.length > 0 ? `
                    <div class="variant-selectors" id="variantSelectors">
                        <div class="variant-section">
                            <h4>Select Color</h4>
                            <div class="color-options" id="colorOptions">
                                ${currentProductColors.map(color => `
                                    <div class="color-option" 
                                         data-color-id="${color.id}"
                                         data-color-name="${color.color_name}"
                                         style="background-color: ${color.color_code || '#666'}"
                                         title="${color.color_name}">
                                        ${color.color_name}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="variant-section">
                            <h4>Select Size</h4>
                            <div class="size-options" id="sizeOptions">
                                <div class="no-selection">Please select a color first</div>
                            </div>
                        </div>
                        
                        <div class="selection-summary" id="selectionSummary" style="display: none;">
                            <div class="selected-variant">
                                <span id="selectedColorName"></span>
                                <span class="separator">-</span>
                                <span id="selectedSizeValue"></span>
                            </div>
                            <div class="stock-info">
                                <i class="fas fa-box"></i>
                                <span>Available Stock:</span>
                                <strong id="availableStock">0</strong>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Quantity Selector -->
                    <div class="quantity-selector-container">
                        <h4>Quantity</h4>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus">-</button>
                            <input type="number" id="productQuantity" value="1" min="1" max="${product.stock || 100}">
                            <button class="quantity-btn plus">+</button>
                        </div>
                        <div class="bulk-options">
                            ${[1, 5, 10, 25, 50].map(qty => `
                                <button class="bulk-option ${qty === 1 ? 'active' : ''}" data-qty="${qty}">
                                    ${qty} Unit${qty > 1 ? 's' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-add-cart" id="pageAddToCart">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                        <button class="btn btn-secondary btn-wishlist ${isInWishlist ? 'active' : ''}" id="pageWishlist">
                            <i class="fas fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                        </button>
                    </div>
                    
                    <!-- Bulk Pricing Table -->
                    <div class="bulk-pricing-table">
                        <h3>Bulk Pricing</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Quantity</th>
                                    <th>Price Per Unit</th>
                                    <th>Total Price</th>
                                </tr>
                            </thead>
                            <tbody id="bulkPricingBody">
                                ${[1, 10, 25, 50, 100].map(qty => {
                                    const basePrice = product.price || 0;
                                    const discount = qty === 1 ? 0 : Math.min(30, Math.floor(qty / 10) * 5);
                                    const unitPrice = Math.round(basePrice * (1 - discount / 100));
                                    return `
                                        <tr>
                                            <td>${qty} Unit${qty > 1 ? 's' : ''}</td>
                                            <td>${formatPrice(unitPrice)}</td>
                                            <td>${formatPrice(unitPrice * qty)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles for product page
        addProductPageStyles();
    }
    
    function addProductPageStyles() {
        if (document.getElementById('product-page-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'product-page-styles';
        style.textContent = `
            .breadcrumb {
                padding: 15px 0;
                margin-bottom: 20px;
                color: #888;
                font-size: 0.9rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .breadcrumb a {
                color: var(--gold);
                text-decoration: none;
                transition: color 0.3s;
            }
            
            .breadcrumb a:hover {
                color: white;
                text-decoration: underline;
            }
            
            .breadcrumb i {
                margin: 0 10px;
                opacity: 0.5;
            }
            
            .product-page-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 20px;
            }
            
            @media (max-width: 768px) {
                .product-page-container {
                    grid-template-columns: 1fr;
                }
            }
            
            .product-images .main-image {
                border-radius: 10px;
                overflow: hidden;
                background: rgba(0, 0, 0, 0.2);
            }
            
            .product-images .main-image img {
                width: 100%;
                height: auto;
                display: block;
            }
            
            .product-title {
                font-size: 2rem;
                margin-bottom: 20px;
                color: white;
            }
            
            .product-price-container {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
            }
            
            .current-price {
                font-size: 2rem;
                font-weight: bold;
                color: var(--gold);
            }
            
            .availability {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 30px;
                color: #2ecc71;
                font-weight: 500;
            }
            
            .availability i {
                color: #2ecc71;
            }
            
            .stock-count {
                margin-left: auto;
                color: #888;
                font-size: 0.9rem;
            }
            
            .product-description {
                margin-bottom: 30px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 8px;
            }
            
            .product-description h3 {
                margin-bottom: 10px;
                color: var(--gold);
            }
            
            .product-description p {
                line-height: 1.6;
                color: #ddd;
            }
            
            .variant-selectors {
                margin-bottom: 30px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 8px;
            }
            
            .variant-section {
                margin-bottom: 20px;
            }
            
            .variant-section h4 {
                margin-bottom: 10px;
                color: white;
                font-size: 1.1rem;
            }
            
            .color-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .color-option {
                padding: 10px 15px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
                color: white;
                font-size: 0.9rem;
                text-align: center;
                min-width: 80px;
            }
            
            .color-option:hover {
                background: rgba(212, 175, 55, 0.2);
                border-color: rgba(212, 175, 55, 0.5);
            }
            
            .color-option.selected {
                background: rgba(212, 175, 55, 0.3);
                border-color: var(--gold);
                color: white;
            }
            
            .size-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .size-option {
                padding: 12px 20px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
                color: white;
                font-weight: bold;
                text-align: center;
                min-width: 60px;
            }
            
            .size-option:hover {
                background: rgba(212, 175, 55, 0.2);
                border-color: rgba(212, 175, 55, 0.5);
            }
            
            .size-option.selected {
                background: rgba(212, 175, 55, 0.3);
                border-color: var(--gold);
                color: white;
            }
            
            .size-option.out-of-stock {
                opacity: 0.5;
                cursor: not-allowed;
                text-decoration: line-through;
            }
            
            .size-option.low-stock {
                position: relative;
            }
            
            .size-option.low-stock::after {
                content: 'Low';
                position: absolute;
                top: -5px;
                right: -5px;
                background: #f39c12;
                color: white;
                font-size: 0.7rem;
                padding: 2px 5px;
                border-radius: 3px;
            }
            
            .no-selection {
                color: #888;
                font-style: italic;
                padding: 20px;
                text-align: center;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                width: 100%;
            }
            
            .selection-summary {
                padding: 15px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                margin-top: 20px;
                border-left: 3px solid var(--gold);
                animation: fadeIn 0.3s ease;
            }
            
            .selected-variant {
                font-size: 1.1rem;
                font-weight: bold;
                margin-bottom: 10px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .selected-variant .separator {
                opacity: 0.5;
            }
            
            .stock-info {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #ddd;
            }
            
            .stock-info i {
                color: var(--gold);
            }
            
            .quantity-selector-container {
                margin-bottom: 30px;
            }
            
            .quantity-selector-container h4 {
                margin-bottom: 10px;
                color: white;
            }
            
            .quantity-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .quantity-btn {
                width: 40px;
                height: 40px;
                background: var(--gold);
                color: black;
                border: none;
                border-radius: 6px;
                font-size: 1.2rem;
                cursor: pointer;
                transition: background 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .quantity-btn:hover {
                background: #e0c04c;
            }
            
            #productQuantity {
                width: 80px;
                height: 40px;
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                border-radius: 6px;
                font-size: 1.1rem;
            }
            
            .bulk-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .bulk-option {
                padding: 8px 15px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 0.9rem;
            }
            
            .bulk-option:hover {
                background: rgba(212, 175, 55, 0.2);
                border-color: var(--gold);
            }
            
            .bulk-option.active {
                background: rgba(212, 175, 55, 0.3);
                border-color: var(--gold);
                color: white;
            }
            
            .action-buttons {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .action-buttons .btn {
                flex: 1;
                padding: 15px;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .btn-wishlist.active {
                background: #e74c3c;
            }
            
            .bulk-pricing-table {
                margin-top: 30px;
            }
            
            .bulk-pricing-table h3 {
                margin-bottom: 15px;
                color: var(--gold);
            }
            
            .bulk-pricing-table table {
                width: 100%;
                border-collapse: collapse;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                overflow: hidden;
            }
            
            .bulk-pricing-table th {
                background: rgba(212, 175, 55, 0.3);
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
            }
            
            .bulk-pricing-table td {
                padding: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                color: #ddd;
            }
            
            .bulk-pricing-table tr:last-child td {
                border-bottom: none;
            }
            
            .bulk-pricing-table tr:hover {
                background: rgba(212, 175, 55, 0.1);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    function updateBreadcrumb(product) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb && product) {
            const categoryName = product.category_name || 'Category';
            const categorySlug = product.category_slug || getCurrentCategory();
            
            breadcrumb.innerHTML = `
                <a href="index.html">Home</a>
                <i class="fas fa-chevron-right"></i>
                <a href="${categorySlug}.html">${categoryName}</a>
                <i class="fas fa-chevron-right"></i>
                <span>${product.name}</span>
            `;
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
    
    function setupProductPageInteractions() {
        if (!isProductPage()) return;
        
        // Color selection
        const colorOptions = document.getElementById('colorOptions');
        if (colorOptions) {
            colorOptions.addEventListener('click', (e) => {
                const colorOption = e.target.closest('.color-option');
                if (!colorOption) return;
                
                // Update UI
                colorOptions.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                colorOption.classList.add('selected');
                
                // Update state
                currentSelectedColor = {
                    id: parseInt(colorOption.dataset.colorId),
                    name: colorOption.dataset.colorName
                };
                
                // Update size options
                updateSizeOptionsForColor(currentSelectedColor.id);
            });
        }
        
        // Quantity controls
        const quantityInput = document.getElementById('productQuantity');
        const minusBtn = document.querySelector('.quantity-btn.minus');
        const plusBtn = document.querySelector('.quantity-btn.plus');
        
        if (quantityInput && minusBtn && plusBtn) {
            minusBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    currentSelectedQuantity = quantityInput.value;
                }
            });
            
            plusBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                const maxStock = currentSelectedSize?.stock || currentProduct?.stock || 100;
                if (currentValue < maxStock) {
                    quantityInput.value = currentValue + 1;
                    currentSelectedQuantity = quantityInput.value;
                }
            });
            
            quantityInput.addEventListener('change', () => {
                const value = parseInt(quantityInput.value) || 1;
                const maxStock = currentSelectedSize?.stock || currentProduct?.stock || 100;
                quantityInput.value = Math.max(1, Math.min(value, maxStock));
                currentSelectedQuantity = quantityInput.value;
            });
        }
        
        // Bulk options
        document.querySelectorAll('.bulk-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.bulk-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                this.classList.add('active');
                
                const qty = parseInt(this.dataset.qty);
                if (quantityInput) {
                    quantityInput.value = qty;
                    currentSelectedQuantity = qty;
                }
            });
        });
        
        // Add to Cart button
        const pageAddToCart = document.getElementById('pageAddToCart');
        if (pageAddToCart && currentProduct) {
            pageAddToCart.addEventListener('click', () => {
                // For footwear, validate selection
                const isFootwear = ['mensfootwear', 'womensfootwear'].includes(
                    currentProduct.category_slug || getCurrentCategory()
                );
                
                if (isFootwear && currentProductColors.length > 0) {
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
                    
                    // Add to cart with variant details
                    addToCart(currentProduct, currentSelectedQuantity, {
                        color_id: currentSelectedColor.id,
                        color_name: currentSelectedColor.name,
                        size_id: currentSelectedSize.id,
                        size_value: currentSelectedSize.value,
                        variant_id: currentSelectedVariant?.id
                    });
                } else {
                    // For non-footwear, simple add to cart
                    if (currentSelectedQuantity > currentProduct.stock) {
                        showNotification(`Only ${currentProduct.stock} units available`, 'error');
                        return;
                    }
                    
                    addToCart(currentProduct, currentSelectedQuantity);
                }
            });
        }
        
        // Wishlist button
        const pageWishlist = document.getElementById('pageWishlist');
        if (pageWishlist && currentProduct) {
            pageWishlist.addEventListener('click', () => {
                toggleWishlist(currentProduct);
                pageWishlist.classList.toggle('active');
                pageWishlist.innerHTML = `
                    <i class="fas fa-heart"></i> 
                    ${pageWishlist.classList.contains('active') ? 'In Wishlist' : 'Add to Wishlist'}
                `;
            });
        }
    }
    
    function updateSizeOptionsForColor(colorId) {
        const sizeOptions = document.getElementById('sizeOptions');
        const selectionSummary = document.getElementById('selectionSummary');
        
        if (!sizeOptions) return;
        
        // Get sizes for this color
        const availableSizes = colorSizeMap[colorId] || [];
        
        if (availableSizes.length === 0) {
            sizeOptions.innerHTML = '<div class="no-selection">No sizes available for this color</div>';
            if (selectionSummary) selectionSummary.style.display = 'none';
            currentSelectedSize = null;
            currentSelectedVariant = null;
            return;
        }
        
        // Populate size options
        sizeOptions.innerHTML = availableSizes.map(size => {
            const stock = size.stock_quantity || 0;
            let stockClass = '';
            if (stock === 0) {
                stockClass = 'out-of-stock';
            } else if (stock < 5) {
                stockClass = 'low-stock';
            }
            
            return `
                <div class="size-option ${stockClass}" 
                     data-size-id="${size.id}"
                     data-size-value="${size.size_value}"
                     data-stock="${stock}"
                     ${stock === 0 ? 'disabled' : ''}>
                    ${size.size_value}
                </div>
            `;
        }).join('');
        
        // Add event listeners to size options
        sizeOptions.querySelectorAll('.size-option:not(.out-of-stock)').forEach(option => {
            option.addEventListener('click', function() {
                // Update UI
                sizeOptions.querySelectorAll('.size-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // Update state
                currentSelectedSize = {
                    id: parseInt(this.dataset.sizeId),
                    value: this.dataset.sizeValue,
                    stock: parseInt(this.dataset.stock)
                };
                
                // Find the exact variant
                currentSelectedVariant = currentProductSizes.find(s => 
                    s.id === currentSelectedSize.id && s.color_id === currentSelectedColor?.id
                );
                
                // Update selection summary
                updateSelectionSummary();
                
                // Update quantity max
                const quantityInput = document.getElementById('productQuantity');
                if (quantityInput) {
                    quantityInput.max = currentSelectedSize.stock;
                    if (currentSelectedQuantity > currentSelectedSize.stock) {
                        currentSelectedQuantity = currentSelectedSize.stock;
                        quantityInput.value = currentSelectedSize.stock;
                    }
                }
            });
        });
    }
    
    function updateSelectionSummary() {
        const selectionSummary = document.getElementById('selectionSummary');
        const selectedColorName = document.getElementById('selectedColorName');
        const selectedSizeValue = document.getElementById('selectedSizeValue');
        const availableStock = document.getElementById('availableStock');
        
        if (!selectionSummary || !currentSelectedColor || !currentSelectedSize) return;
        
        selectedColorName.textContent = currentSelectedColor.name;
        selectedSizeValue.textContent = currentSelectedSize.value;
        availableStock.textContent = currentSelectedSize.stock;
        
        selectionSummary.style.display = 'block';
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
            // Get category by slug first
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('slug', categorySlug)
                .single();
            
            if (catError || !category) {
                console.error('❌ Category not found:', categorySlug);
                productsGrid.innerHTML = `
                    <div class="error-message">
                        <h3>⚠️ Category Not Found</h3>
                        <p>The category "${categorySlug}" was not found.</p>
                        <a href="index.html" class="btn">Return to Home</a>
                    </div>
                `;
                return;
            }
            
            console.log(`✅ Found category: ${category.name} (ID: ${category.id})`);
            
            // Get products for this category
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id, name, price, image_url, stock, slug')
                .eq('category_id', category.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) {
                console.error('❌ Products error:', prodError);
                throw prodError;
            }
            
            console.log(`✅ Loaded ${products?.length || 0} products`);
            
            if (!products || products.length === 0) {
                productsGrid.innerHTML = `
                    <div class="no-products">
                        <i class="fas fa-box-open"></i>
                        <h3>No Products Found</h3>
                        <p>No products available in this category yet.</p>
                    </div>
                `;
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
        
        products.forEach((product) => {
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            // Create a wrapper link for the entire product card
            const productLink = document.createElement('a');
            productLink.href = `product.html?slug=${encodeURIComponent(product.slug || product.id)}`;
            productLink.className = 'product-card-link';
            productLink.style.cssText = `
                display: block;
                text-decoration: none;
                color: inherit;
            `;
            
            // Create the product card
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.setAttribute('data-aos', 'fade-up');
            productCard.style.cssText = `
                cursor: pointer;
                transition: transform 0.3s, box-shadow 0.3s;
                border-radius: 10px;
                overflow: hidden;
                background: rgba(0, 0, 0, 0.2);
                height: 100%;
            `;
            
            productCard.innerHTML = `
                <div class="product-image" style="position: relative;">
                    <img src="${imageUrl}" alt="${product.name}" 
                         style="width: 100%; height: 250px; object-fit: cover;"
                         onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                            data-id="${product.id}"
                            style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; width: 36px; height: 36px; border-radius: 50%; color: ${isInWishlist ? '#e74c3c' : 'white'}; cursor: pointer; z-index: 10;">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="product-info" style="padding: 15px;">
                    <h3 class="product-title" style="margin: 0 0 10px 0; font-size: 1.1rem; color: white;">${product.name}</h3>
                    <div class="product-price" style="margin-bottom: 8px;">
                        <span class="price-real" style="font-size: 1.2rem; font-weight: bold; color: #d4af37;">${formatPrice(product.price)}</span>
                    </div>
                    <div class="availability" style="display: flex; align-items: center; gap: 5px; color: ${product.stock > 0 ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem;">
                        <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i> 
                        ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                </div>
            `;
            
            // Add hover effect
            productCard.addEventListener('mouseenter', () => {
                productCard.style.transform = 'translateY(-5px)';
                productCard.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
            });
            
            productCard.addEventListener('mouseleave', () => {
                productCard.style.transform = 'translateY(0)';
                productCard.style.boxShadow = 'none';
            });
            
            productLink.appendChild(productCard);
            productsGrid.appendChild(productLink);
        });
        
        setupProductInteractions();
        console.log(`✅ Rendered ${products.length} products with clickable cards`);
    }
    
    // ====================
    // MODAL FUNCTIONS (FOR BACKWARD COMPATIBILITY)
    // ====================
    async function openProductModal(productId) {
        console.log(`📊 Opening modal for product ID: ${productId}`);
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showNotification('Database connection error', 'error');
            return;
        }
        
        try {
            // Get product
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (productError || !product) {
                throw new Error('Product not found in database');
            }
            
            // Get colors
            const { data: colors, error: colorsError } = await supabase
                .from('product_colors')
                .select('*')
                .eq('product_id', productId)
                .order('sort_order');
            
            if (colorsError) {
                console.warn('⚠️ Colors fetch error:', colorsError);
            }
            
            // Get sizes
            const { data: sizes, error: sizesError } = await supabase
                .from('product_sizes')
                .select('*')
                .eq('product_id', productId)
                .order('size_value');
            
            if (sizesError) {
                console.warn('⚠️ Sizes fetch error:', sizesError);
            }
            
            // Set current state
            currentProduct = product;
            currentProductColors = colors || [];
            currentProductSizes = sizes || [];
            currentSelectedColor = null;
            currentSelectedSize = null;
            currentSelectedVariant = null;
            
            buildColorSizeMappings(currentProductColors, currentProductSizes);
            
            // Redirect to product page instead of opening modal
            if (product.slug) {
                window.location.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
            } else {
                // Fallback to ID if no slug
                window.location.href = `product.html?slug=${product.id}`;
            }
            
        } catch (error) {
            console.error('❌ Modal error:', error);
            showNotification(`Failed to load product: ${error.message}`, 'error');
        }
    }
    
    // ====================
    // PRODUCT INTERACTIONS
    // ====================
    function setupProductInteractions() {
        console.log('🔧 Setting up product interactions...');
        
        // Wishlist buttons - using event delegation
        document.addEventListener('click', function(event) {
            const wishlistBtn = event.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                event.preventDefault();
                event.stopPropagation(); // Prevent card click
                const productId = parseInt(wishlistBtn.getAttribute('data-id'));
                const product = window.JMPOTTERS_PRODUCTS_CACHE?.find(p => p.id === productId);
                
                if (product) {
                    toggleWishlist(product);
                    // Update button appearance
                    wishlistBtn.innerHTML = `<i class="fas fa-heart"></i>`;
                    wishlistBtn.style.color = '#e74c3c';
                    wishlistBtn.classList.add('active');
                }
            }
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
            category_slug: options.category_slug || getCurrentCategory(),
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
        
        // Open cart panel
        openCart();
    }
    
    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        // Update cart count in multiple possible locations
        const cartCounts = document.querySelectorAll('#cartCount, .cart-count');
        cartCounts.forEach(cartCount => {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        });
        
        updateCartPanel();
    }
    
    function updateCartPanel() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (!cartItems || !cartTotal) return;
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
            cartTotal.textContent = '₦0';
            // Disable checkout button if it exists
            const checkoutBtn = document.getElementById('checkoutButton');
            if (checkoutBtn) checkoutBtn.disabled = true;
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
                <div class="cart-item" style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); gap: 12px;">
                    <div class="cart-item-image" style="width: 60px; height: 60px; border-radius: 6px; overflow: hidden; flex-shrink: 0;">
                        <img src="${getImageUrl(item.category_slug, item.image_url)}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="cart-item-details" style="flex: 1; min-width: 0;">
                        <div class="cart-item-name" style="font-weight: 500; color: white; margin-bottom: 4px; font-size: 0.95rem;">${itemDescription}</div>
                        <div class="cart-item-price" style="color: #d4af37; font-weight: bold; margin-bottom: 4px;">${formatPrice(item.price)}</div>
                        <div class="cart-item-quantity-display" style="color: #ddd; font-size: 0.9rem;">
                            Quantity: <strong>${item.quantity}</strong>
                        </div>
                    </div>
                    <button class="cart-item-remove" data-index="${index}" style="background: rgba(231, 76, 60, 0.2); border: none; color: #e74c3c; width: 35px; height: 35px; border-radius: 6px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        // Add checkout section
        html += `
            <div class="cart-checkout-section" style="padding: 20px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255,255,255,0.1);">
                <div class="cart-total-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 1.2rem; font-weight: bold; color: white;">
                    <span>Total:</span>
                    <span class="cart-total-amount" style="color: #d4af37; font-size: 1.3rem;">${formatPrice(total)}</span>
                </div>
                <button class="btn btn-primary btn-checkout" id="checkoutButton" style="width: 100%; padding: 15px; margin-bottom: 10px; background: #d4af37; color: black; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-shopping-bag"></i> Proceed to Checkout
                </button>
                <a href="#" class="btn btn-secondary btn-whatsapp" id="whatsappCheckout" target="_blank" style="width: 100%; padding: 15px; background: #25D366; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none;">
                    <i class="fab fa-whatsapp"></i> Checkout via WhatsApp
                </a>
            </div>
        `;
        
        cartItems.innerHTML = html;
        cartTotal.textContent = formatPrice(total);
        
        // Setup checkout button
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                // Use WhatsApp as the checkout method
                document.getElementById('whatsappCheckout')?.click();
            });
        }
        
        // Update WhatsApp checkout link
        const whatsappCheckout = document.getElementById('whatsappCheckout');
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
        
        setupCartInteractions();
    }
    
    function setupCartInteractions() {
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
                image_url: product.image_url,
                slug: product.slug
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
    // CART PANEL FUNCTIONS
    // ====================
    function openCart() {
        isCartOpen = true;
        const cartPanel = document.getElementById('cartPanel');
        const overlay = document.getElementById('overlay');
        
        if (cartPanel) {
            cartPanel.classList.add('active');
            // Ensure cart panel is visible
            cartPanel.style.cssText = `
                position: fixed;
                top: 0;
                right: 0;
                width: 100%;
                max-width: 400px;
                height: 100vh;
                background: #1e293b;
                z-index: 1000;
                transform: translateX(0);
                transition: transform 0.3s ease;
                overflow-y: auto;
            `;
        }
        
        if (overlay) {
            overlay.style.display = 'block';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            `;
        }
        
        document.body.style.overflow = 'hidden';
        updateCartPanel();
    }
    
    function closeCart() {
        isCartOpen = false;
        const cartPanel = document.getElementById('cartPanel');
        const overlay = document.getElementById('overlay');
        
        if (cartPanel) {
            cartPanel.classList.remove('active');
            cartPanel.style.transform = 'translateX(100%)';
        }
        
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        document.body.style.overflow = '';
    }
    
    // ====================
    // HEADER CART/WISHLIST UNIVERSAL SETUP
    // ====================
    function ensureHeaderIconsExist() {
        console.log('🔧 Setting up header icons...');
        
        // Setup cart button - check for multiple possible IDs
        const cartButtons = [
            document.getElementById('cartBtn'),
            document.getElementById('cartIcon'),
            document.querySelector('[data-cart-button]')
        ].filter(btn => btn !== null);
        
        if (cartButtons.length > 0) {
            cartButtons.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🛒 Cart button clicked');
                    openCart();
                });
            });
        } else {
            console.warn('⚠️ No cart button found. Please add a cart button with id="cartBtn" or id="cartIcon"');
        }
        
        // Setup wishlist button
        const wishlistButtons = [
            document.getElementById('wishlistBtn'),
            document.getElementById('wishlistIcon'),
            document.querySelector('[data-wishlist-button]')
        ].filter(btn => btn !== null);
        
        if (wishlistButtons.length > 0) {
            wishlistButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Redirect to wishlist page or show wishlist
                    console.log('❤️ Wishlist button clicked');
                    // For now, just show a notification
                    showNotification('Wishlist feature coming soon!', 'info');
                });
            });
        }
        
        // Setup close cart button
        const closeCartBtn = document.getElementById('closeCartBtn');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', closeCart);
        }
        
        // Setup overlay to close cart
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', closeCart);
        }
        
        // Close cart with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isCartOpen) {
                closeCart();
            }
        });
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        console.log('Current page:', window.location.pathname);
        console.log('Current category:', getCurrentCategory());
        
        // Check Supabase connection
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ Supabase client not initialized');
        } else {
            console.log('✅ Supabase client ready');
        }
        
        // Ensure header icons exist and work
        ensureHeaderIconsExist();
        
        // Initialize UI
        updateCartUI();
        updateWishlistUI();
        
        // Check if we're on a product page
        if (isProductPage()) {
            const slug = getSlugFromURL();
            if (slug) {
                await loadSingleProductBySlug(slug);
            } else {
                // Redirect to home if no slug
                window.location.href = 'index.html';
            }
        } else {
            // Load products if on category page
            const currentCategory = getCurrentCategory();
            if (document.getElementById('productsGrid')) {
                await loadProductsByCategory(currentCategory);
            }
        }
        
        console.log('✅ JMPOTTERS initialized successfully');
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
            formatPrice,
            loadSingleProductBySlug,
            getImageUrl,
            loadProductsByCategory,
            openCart,
            closeCart
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
    
    console.log('✅ JMPOTTERS app loaded with Clickable Product Cards and Fixed Cart');
})();
