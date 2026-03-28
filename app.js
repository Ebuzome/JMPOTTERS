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
            console.warn('⚠️ Price is undefined or null:', price);
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
        
        const productViewer = document.getElementById('productViewer');
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        
        if (!productViewer) {
            console.error('❌ Product viewer container not found');
            return;
        }
        
        if (errorState) errorState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'block';
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showError('Database connection error');
            return;
        }
        
        try {
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
            
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('id', product.category_id)
                .single();
            
            if (catError) {
                console.warn('⚠️ Category not found for product:', product.id);
            }
            
            const { data: colors, error: colorsError } = await supabase
                .from('product_colors')
                .select('*')
                .eq('product_id', product.id)
                .order('sort_order');
            
            if (colorsError) {
                console.warn('⚠️ Could not load colors:', colorsError);
            }
            
            const { data: sizes, error: sizesError } = await supabase
                .from('product_sizes')
                .select('*')
                .eq('product_id', product.id)
                .order('size_value');
            
            if (sizesError) {
                console.warn('⚠️ Could not load sizes:', sizesError);
            }
            
            document.title = `${product.name} - JMPOTTERS`;
            
            currentProduct = product;
            currentProduct.category_slug = category?.slug || getCurrentCategory();
            currentProduct.category_name = category?.name || 'Category';
            currentProductColors = colors || [];
            currentProductSizes = sizes || [];
            currentSelectedQuantity = 1;
            currentSelectedColor = null;
            currentSelectedSize = null;
            
            buildColorSizeMappings(currentProductColors, currentProductSizes);
            renderProductPage(currentProduct);
            
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
    
    function renderProductPage(product) {
        const productViewer = document.getElementById('productViewer');
        if (!productViewer) return;
        
        const categorySlug = product.category_slug || getCurrentCategory();
        const imageUrl = getImageUrl(categorySlug, product.image_url);
        const isFootwear = ['mensfootwear', 'womensfootwear'].includes(categorySlug);
        
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const isInWishlist = wishlist.some(item => item.id === product.id);
        
        productViewer.innerHTML = `
            <div class="product-container">
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image"
                         onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                </div>
                
                <div class="product-details">
                    <h1 class="product-title">${product.name}</h1>
                    
                    <div class="price-container">
                        <div class="current-price">${formatPrice(product.price)}</div>
                    </div>
                    
                    <div class="stock-status ${product.stock > 0 ? '' : 'out-of-stock'}">
                        <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                        <span>${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                        ${product.stock > 0 ? `<span class="stock-count">${product.stock} units available</span>` : ''}
                    </div>
                    
                    <div class="detail-tile">
                        <h3 class="tile-title">Description</h3>
                        <div class="product-description">
                            ${product.description ? product.description.replace(/\n/g, '<br>') : 'Premium quality product from JMPOTTERS.'}
                        </div>
                    </div>
                    
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
    
    function buildColorSizeMappings(colors, sizes) {
        colorSizeMap = {};
        sizeColorMap = {};
        
        colors.forEach(color => {
            colorSizeMap[color.id] = sizes.filter(size => size.color_id === color.id);
        });
        
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
        
        const colorOptions = document.getElementById('colorOptions');
        if (colorOptions) {
            colorOptions.addEventListener('click', (e) => {
                const colorOption = e.target.closest('.color-option');
                if (!colorOption) return;
                
                colorOptions.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                colorOption.classList.add('selected');
                
                currentSelectedColor = {
                    id: parseInt(colorOption.dataset.colorId),
                    name: colorOption.dataset.colorName
                };
                
                updateSizeOptionsForColor(currentSelectedColor.id);
            });
        }
        
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
        
        const availableSizes = colorSizeMap[colorId] || [];
        
        if (availableSizes.length === 0) {
            sizeOptions.innerHTML = '<div class="no-selection">No sizes available for this color</div>';
            if (selectionSummary) selectionSummary.style.display = 'none';
            currentSelectedSize = null;
            currentSelectedVariant = null;
            return;
        }
        
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
            <div class="products-grid">
                ${Array(6).fill().map(() => `
                    <div class="product-card-skeleton">
                        <div class="skeleton-image" style="height: 250px; border-radius: 8px; margin-bottom: 1rem;"></div>
                        <div class="skeleton-title" style="height: 1.25rem; width: 80%; margin-bottom: 0.5rem;"></div>
                        <div class="skeleton-price" style="height: 1.5rem; width: 40%; margin-bottom: 0.5rem;"></div>
                        <div class="skeleton-stock" style="height: 1rem; width: 60%;"></div>
                    </div>
                `).join('')}
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
            
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id, name, price, image_url, stock, slug, description')
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
            
            window.JMPOTTERS_PRODUCTS_CACHE = products;
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
        
        if (!document.getElementById('product-card-css')) {
            const style = document.createElement('style');
            style.id = 'product-card-css';
            style.textContent = `
                .product-card-wrapper {
                    text-decoration: none;
                    color: inherit;
                    display: block;
                }
                .product-card-wrapper:hover .product-card {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
            `;
            document.head.appendChild(style);
        }
        
        products.forEach((product) => {
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            const productLink = document.createElement('a');
            productLink.href = `product.html?slug=${encodeURIComponent(product.slug || product.id)}`;
            productLink.className = 'product-card-wrapper';
            
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.style.cssText = `
                background: #1e293b;
                border-radius: 10px;
                overflow: hidden;
                transition: all 0.3s ease;
                height: 100%;
                border: 1px solid rgba(255,255,255,0.1);
            `;
            
            productCard.innerHTML = `
                <div class="product-image" style="position: relative; height: 250px; overflow: hidden;">
                    <img src="${imageUrl}" alt="${product.name}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                            data-id="${product.id}"
                            data-action="wishlist"
                            style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; width: 36px; height: 36px; border-radius: 50%; color: ${isInWishlist ? '#e74c3c' : 'white'}; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="product-info" style="padding: 15px;">
                    <h3 class="product-title" style="margin: 0 0 10px 0; font-size: 1.1rem; color: white; font-weight: 600;">${product.name}</h3>
                    <div class="product-price" style="margin-bottom: 8px;">
                        <span class="price-real" style="font-size: 1.2rem; font-weight: bold; color: #d4af37;">${formatPrice(product.price)}</span>
                    </div>
                    <div class="availability ${product.stock <= 0 ? 'out-of-stock' : ''}" style="display: flex; align-items: center; gap: 5px; color: ${product.stock > 0 ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem;">
                        <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i> 
                        ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                </div>
            `;
            
            productLink.appendChild(productCard);
            productsGrid.appendChild(productLink);
        });
        
        setupProductInteractions();
        console.log(`✅ Rendered ${products.length} products with clickable cards`);
    }
    
    function setupProductInteractions() {
        console.log('🔧 Setting up product interactions...');
        
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
        
        console.log('✅ Product interactions setup complete');
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
        setupCheckoutButtons();
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
    
    // ====================
    // CART PANEL FUNCTIONS
    // ====================
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
        updateCartPanel();
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
    
    // ====================
    // HEADER FUNCTIONS
    // ====================
    function setupHeaderInteractions() {
        console.log('🔧 Setting up header interactions...');
        
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn && !cartBtn.hasAttribute('data-listener-added')) {
            cartBtn.setAttribute('data-listener-added', 'true');
            cartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🛒 Cart button clicked from app.js');
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
        
        console.log('✅ Header interactions setup complete');
    }
    
    // ====================
    // CHECKOUT SIGNUP MODAL FUNCTIONS
    // ====================
    
    function showCheckoutSignupModal() {
        const modal = document.getElementById('checkoutSignupModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            const form = document.getElementById('checkoutSignupForm');
            if (form) form.reset();
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
        
        if (!supabase) {
            showNotification('Connection error. Please try again.', 'error');
            return null;
        }
        
        try {
            const { data: existingUser, error: checkError } = await supabase
                .from('user_profiles')
                .select('id, email, full_name, phone, address, city, state')
                .eq('email', userData.email)
                .maybeSingle();
            
            if (existingUser) {
                const { data: updatedUser, error: updateError } = await supabase
                    .from('user_profiles')
                    .update({
                        full_name: userData.fullName,
                        phone: userData.phone,
                        address: userData.address,
                        city: userData.city,
                        state: userData.state,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingUser.id)
                    .select()
                    .single();
                
                if (updateError) throw updateError;
                
                localStorage.setItem('jmpotters_user', JSON.stringify({
                    id: updatedUser.id,
                    email: updatedUser.email,
                    full_name: updatedUser.full_name,
                    phone: updatedUser.phone,
                    address: updatedUser.address,
                    city: updatedUser.city,
                    state: updatedUser.state,
                    role: updatedUser.role || 'customer'
                }));
                
                showNotification(`Welcome back ${updatedUser.full_name}!`, 'success');
                return updatedUser;
                
            } else {
                const { data: newUser, error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        email: userData.email,
                        full_name: userData.fullName,
                        phone: userData.phone,
                        address: userData.address,
                        city: userData.city,
                        state: userData.state,
                        role: 'customer'
                    })
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                
                localStorage.setItem('jmpotters_user', JSON.stringify({
                    id: newUser.id,
                    email: newUser.email,
                    full_name: newUser.full_name,
                    phone: newUser.phone,
                    address: newUser.address,
                    city: newUser.city,
                    state: newUser.state,
                    role: newUser.role
                }));
                
                showNotification(`Welcome to JMPOTTERS, ${newUser.full_name}! 🎉`, 'success');
                return newUser;
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            showNotification(error.message || 'Signup failed. Please try again.', 'error');
            return null;
        }
    }
    
    async function handleCheckoutSignup(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('checkoutSubmitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        
        const userData = {
            fullName: document.getElementById('checkoutFullName').value.trim(),
            email: document.getElementById('checkoutEmail').value.trim(),
            phone: document.getElementById('checkoutPhone').value.trim(),
            address: document.getElementById('checkoutAddress').value.trim(),
            city: document.getElementById('checkoutCity').value.trim(),
            state: document.getElementById('checkoutState').value,
            newsletter: document.getElementById('checkoutNewsletter')?.checked || false
        };
        
        if (!userData.fullName || !userData.email || !userData.phone || !userData.address || !userData.city || !userData.state) {
            showNotification('Please fill in all required fields', 'warning');
            submitBtn.disabled = false;
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            showNotification('Please enter a valid email address', 'warning');
            submitBtn.disabled = false;
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
        }
        
        const phoneRegex = /^[0-9]{10,11}$/;
        const cleanPhone = userData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            showNotification('Please enter a valid phone number (10-11 digits)', 'warning');
            submitBtn.disabled = false;
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
        }
        userData.phone = cleanPhone;
        
        const savedUser = await saveCheckoutUser(userData);
        
        submitBtn.disabled = false;
        btnText.style.display = 'flex';
        btnLoading.style.display = 'none';
        
        if (savedUser) {
            closeCheckoutSignupModal();
            
            window.pendingCheckoutData = {
                user_id: savedUser.id,
                email: savedUser.email,
                full_name: savedUser.full_name,
                phone: savedUser.phone,
                address: userData.address,
                city: userData.city,
                state: userData.state,
                notes: ''
            };
            
            proceedToCheckout();
        }
    }
    
    function proceedToCheckout() {
        const user = JSON.parse(localStorage.getItem('jmpotters_user'));
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'warning');
            return;
        }
        
        const total = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
        
        let message = `*NEW ORDER FROM JMPOTTERS*\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${user.full_name}\n`;
        message += `Email: ${user.email}\n`;
        message += `Phone: ${user.phone}\n`;
        if (user.address) message += `Address: ${user.address}, ${user.city || ''}, ${user.state || ''}\n`;
        message += `\n*Order Items:*\n`;
        
        cart.forEach(item => {
            let itemDesc = item.name;
            if (item.color_name) itemDesc += ` (${item.color_name})`;
            if (item.size_value) itemDesc += ` - Size ${item.size_value}`;
            message += `- ${itemDesc} x${item.quantity} = ₦${((item.price || 0) * item.quantity).toLocaleString()}\n`;
        });
        
        message += `\n*Total: ₦${total.toLocaleString()}*\n\n`;
        message += `Please confirm my order and provide payment details.`;
        
        const whatsappUrl = `https://wa.me/2348139583320?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    function initCheckoutSignupModal() {
        const modal = document.getElementById('checkoutSignupModal');
        if (!modal) return;
        
        const form = document.getElementById('checkoutSignupForm');
        if (form) {
            form.removeEventListener('submit', handleCheckoutSignup);
            form.addEventListener('submit', handleCheckoutSignup);
        }
        
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.removeEventListener('click', closeCheckoutSignupModal);
            closeBtn.addEventListener('click', closeCheckoutSignupModal);
        }
        
        const cancelBtn = document.getElementById('cancelCheckoutBtn');
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', closeCheckoutSignupModal);
            cancelBtn.addEventListener('click', closeCheckoutSignupModal);
        }
        
        const overlay = document.querySelector('.checkout-modal-overlay');
        if (overlay) {
            overlay.removeEventListener('click', closeCheckoutSignupModal);
            overlay.addEventListener('click', closeCheckoutSignupModal);
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeCheckoutSignupModal();
            }
        });
    }
    
    function isUserLoggedIn() {
        return JSON.parse(localStorage.getItem('jmpotters_user'));
    }
    
    function updateUserUI() {
        const user = isUserLoggedIn();
        if (user) {
            console.log('User logged in:', user.full_name);
        }
    }
    
    function setupCheckoutButtons() {
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn && !checkoutBtn._modalListenerAttached) {
            checkoutBtn._modalListenerAttached = true;
            checkoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const user = isUserLoggedIn();
                
                if (user) {
                    proceedToCheckout();
                } else {
                    showCheckoutSignupModal();
                }
            });
        }
        
        const whatsappBtn = document.getElementById('whatsappCheckout');
        if (whatsappBtn && !whatsappBtn._modalListenerAttached) {
            whatsappBtn._modalListenerAttached = true;
            whatsappBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const user = isUserLoggedIn();
                
                if (user) {
                    proceedToCheckout();
                } else {
                    showCheckoutSignupModal();
                }
            });
        }
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        console.log('Current page:', window.location.pathname);
        console.log('Current category:', getCurrentCategory());
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ Supabase client not initialized');
        } else {
            console.log('✅ Supabase client ready');
        }
        
        setupHeaderInteractions();
        initCheckoutSignupModal();
        updateCartUI();
        updateUserUI();
        
        if (isProductPage()) {
            const slug = getSlugFromURL();
            if (slug) {
                await loadSingleProductBySlug(slug);
            } else {
                window.location.href = 'index.html';
            }
        } else {
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
            openProductModal: function(productId) {
                const product = window.JMPOTTERS_PRODUCTS_CACHE?.find(p => p.id === productId);
                if (product?.slug) {
                    window.location.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
                }
            },
            addToCart,
            toggleWishlist,
            initializePage,
            formatPrice,
            loadSingleProductBySlug,
            getImageUrl,
            loadProductsByCategory,
            openCart,
            closeCart,
            showCheckoutSignupModal,
            closeCheckoutSignupModal,
            proceedToCheckout,
            isUserLoggedIn
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
    
    console.log('✅ JMPOTTERS app loaded with all fixes');
})();
