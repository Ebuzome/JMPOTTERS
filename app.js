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
            
            const productCard = document.createElement('a');
            productCard.className = 'product-card product-card-clickable';
            productCard.href = `product.html?slug=${encodeURIComponent(product.slug || product.id)}`;
            productCard.setAttribute('data-aos', 'fade-up');
            productCard.setAttribute('role', 'article');
            productCard.setAttribute('aria-label', `View details for ${product.name}`);
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                            data-id="${product.id}"
                            aria-label="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <span class="card-hover-indicator">
                        <i class="fas fa-arrow-right"></i> View Details
                    </span>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">
                        <span class="price-real">${formatPrice(product.price)}</span>
                    </div>
                    <div class="availability">
                        <i class="fas fa-check-circle"></i> ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                </div>
            `;
            
            productsGrid.appendChild(productCard);
        });
        
        setupProductInteractions();
        injectProductCardStyles();
        console.log(`✅ Rendered ${products.length} products`);
    }
    
    // ====================
    // CLICKABLE PRODUCT CARD STYLES
    // ====================
    function injectProductCardStyles() {
        if (document.getElementById('product-card-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'product-card-styles';
        style.textContent = `
            /* Clickable Product Card Styles */
            .product-card-clickable {
                display: flex;
                flex-direction: column;
                text-decoration: none;
                color: inherit;
                cursor: pointer;
                position: relative;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), 
                            box-shadow 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            }
            
            .product-card-clickable:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            }
            
            .product-card-clickable:focus {
                outline: 3px solid var(--gold, #d4af37);
                outline-offset: 2px;
            }
            
            .product-card-clickable:focus:not(:focus-visible) {
                outline: none;
            }
            
            .product-card-clickable:focus-visible {
                outline: 3px solid var(--gold, #d4af37);
                outline-offset: 2px;
            }
            
            .product-card-clickable .product-image {
                position: relative;
                height: 250px;
                overflow: hidden;
            }
            
            .product-card-clickable .product-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
            }
            
            .product-card-clickable:hover .product-image img {
                transform: scale(1.08);
            }
            
            /* Hover indicator */
            .card-hover-indicator {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 15px 20px;
                background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
                color: white;
                font-weight: 600;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .product-card-clickable:hover .card-hover-indicator,
            .product-card-clickable:focus .card-hover-indicator {
                opacity: 1;
                transform: translateY(0);
            }
            
            .card-hover-indicator i {
                transition: transform 0.3s ease;
            }
            
            .product-card-clickable:hover .card-hover-indicator i {
                transform: translateX(5px);
            }
            
            /* Wishlist button - prevent card navigation */
            .product-card-clickable .wishlist-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                z-index: 10;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.95);
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1.1rem;
                color: #888;
            }
            
            .product-card-clickable .wishlist-btn:hover {
                background: white;
                transform: scale(1.1);
                color: #e74c3c;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .product-card-clickable .wishlist-btn.active {
                background: #e74c3c;
                color: white;
            }
            
            .product-card-clickable .wishlist-btn.active:hover {
                background: #c0392b;
                color: white;
            }
            
            /* Product info section */
            .product-card-clickable .product-info {
                padding: 20px;
                flex-grow: 1;
                display: flex;
                flex-direction: column;
            }
            
            .product-card-clickable .product-title {
                font-size: 1.05rem;
                font-weight: 600;
                color: #333;
                margin-bottom: 10px;
                line-height: 1.4;
                min-height: 45px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .product-card-clickable .product-price {
                margin-top: auto;
                margin-bottom: 8px;
            }
            
            .product-card-clickable .price-real {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--gold, #d4af37);
            }
            
            .product-card-clickable .availability {
                font-size: 0.85rem;
                color: #27ae60;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .product-card-clickable .availability i {
                font-size: 0.8rem;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .product-card-clickable .product-image {
                    height: 200px;
                }
                
                .product-card-clickable .product-info {
                    padding: 15px;
                }
                
                .product-card-clickable .product-title {
                    font-size: 0.95rem;
                    min-height: 40px;
                }
                
                .card-hover-indicator {
                    padding: 12px 15px;
                    font-size: 0.85rem;
                }
            }
            
            @media (max-width: 480px) {
                .product-card-clickable .product-image {
                    height: 180px;
                }
                
                .product-card-clickable .wishlist-btn {
                    width: 35px;
                    height: 35px;
                    font-size: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
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
        
        // Wishlist buttons - prevent navigation when clicking inside clickable cards
        document.addEventListener('click', function(event) {
            const wishlistBtn = event.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                event.preventDefault();
                event.stopPropagation(); // Prevent card navigation
                
                const productId = parseInt(wishlistBtn.getAttribute('data-id'));
                const product = window.JMPOTTERS_PRODUCTS_CACHE?.find(p => p.id === productId);
                
                if (product) {
                    toggleWishlist(product);
                    
                    // Update wishlist button state
                    const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
                    const isInWishlist = wishlist.some(item => item.id === productId);
                    wishlistBtn.classList.toggle('active', isInWishlist);
                    wishlistBtn.setAttribute('aria-label', isInWishlist ? 'Remove from wishlist' : 'Add to wishlist');
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
        
        // Add checkout section
        html += `
            <div class="cart-checkout-section">
                <div class="cart-total-row">
                    <span>Total:</span>
                    <span class="cart-total-amount">${formatPrice(total)}</span>
                </div>
                <button class="btn btn-primary btn-checkout" id="checkoutButton">
                    <i class="fas fa-shopping-bag"></i> Proceed to Checkout
                </button>
                <a href="#" class="btn btn-secondary btn-whatsapp" id="whatsappCheckout">
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
                // You can redirect to a checkout page or show a checkout modal
                // For now, we'll use WhatsApp as the checkout method
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
    // HEADER CART/WISHLIST UNIVERSAL SETUP
    // ====================
    function ensureHeaderIconsExist() {
        // This function helps ensure cart/wishlist icons are present on all pages
        // You should have these in your HTML header:
        // <button id="cartIcon"><i class="fas fa-shopping-cart"></i><span id="cartCount">0</span></button>
        // <button id="wishlistIcon"><i class="fas fa-heart"></i><span id="wishlistCount">0</span></button>
        
        // If icons don't exist, you might need to add them to your HTML template
        if (!document.getElementById('cartIcon')) {
            console.warn('⚠️ Cart icon not found in HTML. Please add: <button id="cartIcon"><i class="fas fa-shopping-cart"></i><span id="cartCount">0</span></button>');
        }
        
        if (!document.getElementById('wishlistIcon')) {
            console.warn('⚠️ Wishlist icon not found in HTML. Please add: <button id="wishlistIcon"><i class="fas fa-heart"></i><span id="wishlistCount">0</span></button>');
        }
        
        // Setup cart toggle
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.addEventListener('click', function() {
                const cartPanel = document.getElementById('cartPanel');
                if (cartPanel) {
                    cartPanel.classList.toggle('active');
                }
            });
        }
        
        // Setup wishlist toggle (if you have a wishlist panel)
        const wishlistIcon = document.getElementById('wishlistIcon');
        if (wishlistIcon) {
            wishlistIcon.addEventListener('click', function() {
                // Redirect to wishlist page or open wishlist panel
                window.location.href = 'wishlist.html'; // You'll need to create this page
            });
        }
    }
    
    // ====================
    // CART STYLES INJECTION
    // ====================
    function injectCartStyles() {
        if (document.getElementById('cart-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cart-styles';
        style.textContent = `
            .cart-item {
                display: flex;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                gap: 15px;
            }
            
            .cart-item-image {
                width: 60px;
                height: 60px;
                border-radius: 6px;
                overflow: hidden;
                flex-shrink: 0;
            }
            
            .cart-item-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            
            .cart-item-details {
                flex: 1;
                min-width: 0;
            }
            
            .cart-item-name {
                font-weight: 500;
                color: white;
                margin-bottom: 5px;
                font-size: 0.95rem;
            }
            
            .cart-item-price {
                color: var(--gold);
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .cart-item-quantity-display {
                color: #ddd;
                font-size: 0.9rem;
            }
            
            .cart-item-remove {
                background: rgba(231, 76, 60, 0.2);
                border: none;
                color: #e74c3c;
                width: 35px;
                height: 35px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .cart-item-remove:hover {
                background: rgba(231, 76, 60, 0.3);
            }
            
            .cart-empty {
                text-align: center;
                padding: 40px 20px;
                color: #888;
                font-style: italic;
            }
            
            .cart-checkout-section {
                padding: 20px;
                background: rgba(0, 0, 0, 0.2);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .cart-total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                font-size: 1.2rem;
                font-weight: bold;
                color: white;
            }
            
            .cart-total-amount {
                color: var(--gold);
                font-size: 1.3rem;
            }
            
            .btn-checkout {
                width: 100%;
                padding: 15px;
                margin-bottom: 10px;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .btn-whatsapp {
                width: 100%;
                padding: 15px;
                background: #25D366;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                text-decoration: none;
                transition: background 0.3s;
            }
            
            .btn-whatsapp:hover {
                background: #1da851;
            }
        `;
        document.head.appendChild(style);
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
        
        // Inject cart styles
        injectCartStyles();
        
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
        
        // Setup modal close button (for backward compatibility)
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
            loadProductsByCategory
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
    
    console.log('✅ JMPOTTERS app loaded with Simplified Product Display and Fixed Cart');
})();
