// ====================
// JMPOTTERS APP - COMPLETE FIXED VERSION WITH PRODUCT PAGE SUPPORT
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
    
    // ====================
    // CURRENT PRODUCT STATE
    // ====================
    let currentProduct = null;
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
        const slug = urlParams.get('slug');
        
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
            return '₦0';
        }
        return `₦${parseInt(price).toLocaleString()}`;
    }
    
    function showNotification(message, type = 'success') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
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
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info} notification-icon"></i>
            <span>${message}</span>
        `;
        
        notificationContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
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
    // LOAD SINGLE PRODUCT BY SLUG
    // ====================
    async function loadSingleProductBySlug(slug) {
        console.log(`📦 Loading single product by slug: ${slug}`);
        
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const productViewer = document.getElementById('productViewer');
        
        if (!productViewer) {
            console.error('❌ Product viewer container not found');
            return;
        }
        
        // Hide error state if visible
        if (errorState) errorState.style.display = 'none';
        
        // Show loading state
        if (loadingState) loadingState.style.display = 'block';
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showError('Database connection error');
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
            
            // Hide loading state
            if (loadingState) loadingState.style.display = 'none';
            
        } catch (error) {
            console.error('❌ Error loading product by slug:', error);
            showError(error.message || 'Failed to load product');
        }
    }
    
    function showError(message) {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        
        if (loadingState) loadingState.style.display = 'none';
        if (errorState) {
            errorState.style.display = 'block';
            if (errorMessage) errorMessage.textContent = message;
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
            <div class="product-container">
                <!-- Product Images -->
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image"
                         onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                </div>
                
                <!-- Product Details -->
                <div class="product-details">
                    <!-- Title -->
                    <h1 class="product-title">${product.name}</h1>
                    
                    <!-- Price -->
                    <div class="price-container">
                        <div class="current-price">${formatPrice(product.price)}</div>
                    </div>
                    
                    <!-- Availability -->
                    <div class="stock-status ${product.stock > 0 ? '' : 'out-of-stock'}">
                        <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                        <span>${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                        ${product.stock > 0 ? `<span class="stock-count">${product.stock} units available</span>` : ''}
                    </div>
                    
                    <!-- Description -->
                    <div class="detail-tile">
                        <h3 class="tile-title">Description</h3>
                        <div class="product-description">
                            ${product.description ? product.description.replace(/\n/g, '<br>') : 'Premium quality product from JMPOTTERS.'}
                        </div>
                    </div>
                    
                    <!-- Variant Selectors (for footwear) -->
                    ${isFootwear && currentProductColors.length > 0 ? `
                    <div class="detail-tile">
                        <h3 class="tile-title">Select Color</h3>
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
                    
                    <div class="detail-tile">
                        <h3 class="tile-title">Select Size</h3>
                        <div class="size-options" id="sizeOptions">
                            <div class="no-selection">Please select a color first</div>
                        </div>
                    </div>
                    
                    <div class="selection-summary" id="selectionSummary">
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
                    ` : ''}
                    
                    <!-- Quantity Selector -->
                    <div class="detail-tile">
                        <h3 class="tile-title">Quantity</h3>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus">-</button>
                            <input type="number" id="productQuantity" value="1" min="1" max="${product.stock || 100}" class="quantity-input">
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
                        <button class="action-btn btn-primary btn-add-cart" id="pageAddToCart">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                        <button class="action-btn btn-secondary btn-wishlist ${isInWishlist ? 'active' : ''}" id="pageWishlist">
                            <i class="fas fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        setupProductPageInteractions();
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
                    
                    addToCart(currentProduct, currentSelectedQuantity, {
                        color_id: currentSelectedColor.id,
                        color_name: currentSelectedColor.name,
                        size_id: currentSelectedSize.id,
                        size_value: currentSelectedSize.value,
                        variant_id: currentSelectedVariant?.id
                    });
                } else {
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
                const isActive = pageWishlist.classList.contains('active');
                pageWishlist.classList.toggle('active');
                pageWishlist.innerHTML = `
                    <i class="fas fa-heart"></i> 
                    ${isActive ? 'Add to Wishlist' : 'In Wishlist'}
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
                sizeOptions.querySelectorAll('.size-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                
                currentSelectedSize = {
                    id: parseInt(this.dataset.sizeId),
                    value: this.dataset.sizeValue,
                    stock: parseInt(this.dataset.stock)
                };
                
                currentSelectedVariant = currentProductSizes.find(s => 
                    s.id === currentSelectedSize.id && s.color_id === currentSelectedColor?.id
                );
                
                updateSelectionSummary();
                
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
    // LOAD PRODUCTS BY CATEGORY
    // ====================
    async function loadProductsByCategory(categorySlug) {
        console.log(`📦 Loading products for: ${categorySlug}`);
        
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            console.error('❌ Products grid not found');
            return;
        }
        
        // Show skeleton loading
        productsGrid.innerHTML = `
            <div class="products-grid">
                ${Array(6).fill().map(() => `
                    <div class="product-card-skeleton">
                        <div class="skeleton-image"></div>
                        <div class="skeleton-title"></div>
                        <div class="skeleton-price"></div>
                    </div>
                `).join('')}
            </div>
        `;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = `<div class="error-message">Database connection error</div>`;
            return;
        }
        
        try {
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('slug', categorySlug)
                .single();
            
            if (catError || !category) {
                productsGrid.innerHTML = `<div class="error-message">Category not found</div>`;
                return;
            }
            
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id, name, price, image_url, stock, slug, description')
                .eq('category_id', category.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) throw prodError;
            
            if (!products || products.length === 0) {
                productsGrid.innerHTML = `<div class="no-products">No products found</div>`;
                return;
            }
            
            window.JMPOTTERS_PRODUCTS_CACHE = products;
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = `<div class="error-message">Error loading products</div>`;
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
            
            const productLink = document.createElement('a');
            productLink.href = `product.html?slug=${encodeURIComponent(product.slug || product.id)}`;
            productLink.className = 'product-card-wrapper';
            
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                            data-action="wishlist"
                            data-product-id="${product.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <span class="category-badge">${categorySlug}</span>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div class="stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                        <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i> 
                        ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                </div>
            `;
            
            productLink.appendChild(productCard);
            productsGrid.appendChild(productLink);
        });
        
        setupProductInteractions();
    }
    
    function setupProductInteractions() {
        document.addEventListener('click', function(event) {
            const wishlistBtn = event.target.closest('[data-action="wishlist"]');
            if (wishlistBtn) {
                event.preventDefault();
                event.stopPropagation();
                const productId = parseInt(wishlistBtn.getAttribute('data-id'));
                const product = window.JMPOTTERS_PRODUCTS_CACHE?.find(p => p.id === productId);
                
                if (product) {
                    toggleWishlist(product);
                    const isActive = wishlistBtn.classList.contains('active');
                    wishlistBtn.classList.toggle('active');
                    wishlistBtn.style.color = isActive ? 'white' : '#e74c3c';
                }
            }
        });
    }
    
    // ====================
    // CART FUNCTIONS
    // ====================
    function addToCart(product, quantity = 1, options = {}) {
        let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        
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
        
        let notificationText = `${product.name}`;
        if (options.color_name) notificationText += ` (${options.color_name})`;
        if (options.size_value) notificationText += ` - Size ${options.size_value}`;
        notificationText += ' added to cart!';
        
        showNotification(notificationText, 'success');
        openCart();
    }
    
    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
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
            return;
        }
        
        let html = '';
        let total = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = (item.price || 0) * item.quantity;
            total += itemTotal;
            
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
        
        html += `
            <div class="cart-total">
                <span>Total:</span>
                <span class="cart-total-amount">${formatPrice(total)}</span>
            </div>
            <button class="cart-checkout-btn" id="checkoutButton">
                <i class="fas fa-shopping-bag"></i> Proceed to Checkout
            </button>
            <a href="#" class="cart-whatsapp-btn" id="whatsappCheckout" target="_blank">
                <i class="fab fa-whatsapp"></i> Checkout via WhatsApp
            </a>
        `;
        
        cartItems.innerHTML = html;
        cartTotal.textContent = formatPrice(total);
        
        setupCartInteractions();
    }
    
    function setupCartInteractions() {
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
        
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                document.getElementById('whatsappCheckout')?.click();
            });
        }
        
        const whatsappCheckout = document.getElementById('whatsappCheckout');
        if (whatsappCheckout) {
            let text = "I would like to purchase:\n";
            const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
            let total = 0;
            
            cart.forEach(item => {
                let itemDescription = item.name;
                if (item.color_name) itemDescription += ` (${item.color_name})`;
                if (item.size_value) itemDescription += ` - Size ${item.size_value}`;
                
                const itemTotal = (item.price || 0) * item.quantity;
                total += itemTotal;
                text += `- ${itemDescription} (${item.quantity} × ${formatPrice(item.price)}) = ${formatPrice(itemTotal)}\n`;
            });
            
            text += `\n*Total: ${formatPrice(total)}*\n\nPlease confirm order & shipping details.`;
            whatsappCheckout.href = `https://wa.me/2348139583320?text=${encodeURIComponent(text)}`;
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
                image_url: product.image_url,
                slug: product.slug
            });
            showNotification(`${product.name} added to wishlist!`, 'success');
        }
        
        localStorage.setItem('jmpotters_wishlist', JSON.stringify(wishlist));
        updateCartUI();
    }
    
    function openCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartPanel) {
            cartPanel.classList.add('active');
        }
        
        if (cartOverlay) {
            cartOverlay.classList.add('active');
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    function closeCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartPanel) {
            cartPanel.classList.remove('active');
        }
        
        if (cartOverlay) {
            cartOverlay.classList.remove('active');
        }
        
        document.body.style.overflow = '';
    }
    
    function setupHeaderInteractions() {
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn && !cartBtn.hasAttribute('data-listener-added')) {
            cartBtn.setAttribute('data-listener-added', 'true');
            cartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openCart();
            });
        }
        
        const wishlistBtn = document.getElementById('wishlistBtn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', function() {
                if (currentProduct) {
                    toggleWishlist(currentProduct);
                } else {
                    showNotification('Wishlist feature coming soon!', 'info');
                }
            });
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeCart();
            }
        });
    }
    
    // ====================
    // INITIALIZATION - THIS IS THE KEY PART
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        console.log('Current page:', window.location.pathname);
        
        setupHeaderInteractions();
        updateCartUI();
        
        // Check if we're on a product page
        if (isProductPage()) {
            const slug = getSlugFromURL();
            console.log('📦 Product page detected, slug:', slug);
            
            if (slug) {
                await loadSingleProductBySlug(slug);
            } else {
                console.error('❌ No slug found in URL');
                // Show error state
                const errorState = document.getElementById('errorState');
                if (errorState) {
                    errorState.style.display = 'block';
                }
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
    // START THE APP
    // ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
    
    console.log('✅ JMPOTTERS app loaded with all fixes');
})();
