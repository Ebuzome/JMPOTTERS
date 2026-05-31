// ====================
// JMPOTTERS APP - COMPLETE WITH FIXED CHECKOUT
// ====================
(function() {
    'use strict';
    
    if (window.JMPOTTERS_APP_INITIALIZED) {
        console.warn('⚠️ JMPOTTERS app already initialized, skipping...');
        return;
    }
    
    console.log('🚀 JMPOTTERS app starting (With Recommendations)...');
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
    
    // Flag to prevent multiple checkout attempts
    let isCheckoutInProgress = false;
    
    // ====================
    // PROFESSIONAL NOTIFICATION SYSTEM
    // ====================
    function showNotification(message, type = 'success') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        let container = document.getElementById('jmpottersNotificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'jmpottersNotificationContainer';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `jmpotters-notification jmpotters-notification-${type}`;
        
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        
        const colors = {
            success: { bg: '#f0fdf4', border: '#22c55e', icon: '#22c55e', text: '#166534' },
            error: { bg: '#fef2f2', border: '#ef4444', icon: '#ef4444', text: '#991b1b' },
            warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#f59e0b', text: '#92400e' },
            info: { bg: '#eff6ff', border: '#3b82f6', icon: '#3b82f6', text: '#1e40af' }
        };
        
        const color = colors[type];
        
        notification.style.cssText = `
            background: ${color.bg};
            border-left: 4px solid ${color.border};
            border-radius: 12px;
            padding: 14px 18px;
            min-width: 320px;
            max-width: 420px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
            display: flex;
            align-items: center;
            gap: 14px;
            animation: jmpottersSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="flex-shrink: 0; width: 22px; height: 22px; color: ${color.icon};">${icons[type]}</div>
            <div style="flex: 1; color: ${color.text}; font-size: 0.875rem; font-weight: 500; line-height: 1.4;">${message}</div>
            <button class="jmpotters-notification-close" style="background: none; border: none; cursor: pointer; padding: 4px; margin: -4px; opacity: 0.6; transition: opacity 0.2s;" onclick="this.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ${color.text};"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.style.animation = 'jmpottersSlideOut 0.2s ease forwards';
                setTimeout(() => {
                    if (notification.parentElement) notification.remove();
                }, 200);
            }
        }, 4500);
    }
    
    const notificationStyle = document.createElement('style');
    notificationStyle.textContent = `
        @keyframes jmpottersSlideIn {
            from {
                opacity: 0;
                transform: translateX(30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes jmpottersSlideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(30px);
            }
        }
    `;
    document.head.appendChild(notificationStyle);
    
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
        
        if (imageFilename.startsWith('https://tmpggeeuwdvlngvfncaa.supabase.co')) {
            return imageFilename;
        }
        
        if (imageFilename.startsWith('http://') || imageFilename.startsWith('https://')) {
            return imageFilename;
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
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    // RECOMMENDATION ENGINE
    // ====================
    async function loadRecommendations(currentProduct) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) return [];
            
            const currentCategoryId = currentProduct.category_id;
            const currentProductName = currentProduct.name.toLowerCase();
            const currentProductId = currentProduct.id;
            
            const nameWords = currentProductName.split(' ').filter(w => w.length > 2);
            let recommendations = [];
            
            if (nameWords.length > 0) {
                let nameQuery = supabase
                    .from('products')
                    .select('id, name, price, image_url, slug, stock, category_id')
                    .eq('is_active', true)
                    .neq('id', currentProductId);
                
                if (nameWords.length > 1) {
                    nameQuery = nameQuery.or(nameWords.map(w => `name.ilike.%${w}%`).join(','));
                } else {
                    nameQuery = nameQuery.ilike('name', `%${nameWords[0]}%`);
                }
                
                const { data: keywordMatches } = await nameQuery.limit(10);
                if (keywordMatches && keywordMatches.length > 0) {
                    recommendations = keywordMatches;
                }
            }
            
            if (recommendations.length < 15) {
                const needed = 15 - recommendations.length;
                const existingIds = recommendations.map(r => r.id);
                let categoryQuery = supabase
                    .from('products')
                    .select('id, name, price, image_url, slug, stock, category_id')
                    .eq('category_id', currentCategoryId)
                    .eq('is_active', true)
                    .neq('id', currentProductId);
                
                if (existingIds.length > 0) {
                    categoryQuery = categoryQuery.not('id', 'in', `(${existingIds.join(',')})`);
                }
                
                const { data: categoryProducts } = await categoryQuery.limit(needed);
                if (categoryProducts && categoryProducts.length > 0) {
                    recommendations = [...recommendations, ...categoryProducts];
                }
            }
            
            if (recommendations.length < 15) {
                const needed = 15 - recommendations.length;
                const existingIds = recommendations.map(r => r.id);
                let randomQuery = supabase
                    .from('products')
                    .select('id, name, price, image_url, slug, stock, category_id')
                    .eq('is_active', true)
                    .neq('id', currentProductId);
                
                if (existingIds.length > 0) {
                    randomQuery = randomQuery.not('id', 'in', `(${existingIds.join(',')})`);
                }
                
                const { data: randomProducts } = await randomQuery.limit(needed);
                if (randomProducts && randomProducts.length > 0) {
                    recommendations = [...recommendations, ...randomProducts];
                }
            }
            
            recommendations = recommendations.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            recommendations = recommendations.slice(0, 15);
            return recommendations;
            
        } catch (error) {
            console.error('Error loading recommendations:', error);
            return [];
        }
    }
    
    async function renderRecommendations(currentProduct) {
        const section = document.getElementById('recommendationsSection');
        const container = document.getElementById('recommendationsContainer');
        
        if (!section || !container) return;
        
        const recommendations = await loadRecommendations(currentProduct);
        
        if (recommendations.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        let html = '';
        for (const product of recommendations) {
            const categorySlug = currentProduct.category_slug || getCurrentCategory();
            const imageUrl = getImageUrl(categorySlug, product.image_url);
            
            html += `
                <a href="product.html?slug=${product.slug}" class="recommendation-card">
                    <img src="${imageUrl}" alt="${product.name}" class="rec-image"
                         onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    <div class="rec-info">
                        <div class="rec-name">${escapeHtml(product.name)}</div>
                        <div class="rec-price">${formatPrice(product.price)}</div>
                        <div class="text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-600'} mt-1">
                            ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                    </div>
                </a>
            `;
        }
        
        container.innerHTML = html;
        section.style.display = 'block';
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
            
            const { data: colors, error: colorsError } = await supabase
                .from('product_colors')
                .select('*')
                .eq('product_id', product.id)
                .order('sort_order');
            
            const { data: sizes, error: sizesError } = await supabase
                .from('product_sizes')
                .select('*')
                .eq('product_id', product.id)
                .order('size_value');
            
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
            await renderRecommendations(currentProduct);
            
            if (loadingState) loadingState.style.display = 'none';
            
            if (typeof PhotoSwipeLightbox !== 'undefined') {
                setupImageMagnification();
            }
            
        } catch (error) {
            console.error('❌ Error loading product by slug:', error);
            showError(error.message || 'Failed to load product');
        }
    }
    
    function setupImageMagnification() {
        const lightbox = new PhotoSwipeLightbox({
            gallery: '.product-image-section',
            children: '.product-image-wrapper',
            pswpModule: PhotoSwipe
        });
        lightbox.init();
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
        const hasComparePrice = product.compare_price && product.compare_price > product.price;
        const discountPercent = hasComparePrice ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;
        
        const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        const isInWishlist = wishlist.some(item => item.id === product.id);
        
        const stockStatus = product.stock > 10 ? 'in-stock' : (product.stock > 0 ? 'low-stock' : 'out-of-stock');
        const stockText = product.stock > 10 ? 'In Stock' : (product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock');
        
        productViewer.innerHTML = `
            <div class="product-container">
                <div class="product-image-section" id="productImageSection">
                    <div class="product-image-wrapper">
                        <img src="${imageUrl}" alt="${product.name}" class="product-image"
                             onerror="this.onerror=null; this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                        <div class="magnify-icon">
                            <i class="fas fa-search-plus"></i>
                        </div>
                    </div>
                </div>
                
                <div class="product-details">
                    <h1 class="product-title">${escapeHtml(product.name)}</h1>
                    
                    <div class="price-section">
                        <span class="current-price">${formatPrice(product.price)}</span>
                        ${hasComparePrice ? `<span class="original-price">${formatPrice(product.compare_price)}</span>` : ''}
                        ${hasComparePrice ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
                    </div>
                    
                    <div class="stock-tile">
                        <div class="stock-status ${stockStatus}">
                            <i class="fas ${product.stock > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${stockText}</span>
                            ${product.stock > 0 && product.stock <= 10 ? `<span class="stock-count">Hurry up!</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="description-tile">
                        <div class="tile-label"><i class="fas fa-info-circle"></i> Description</div>
                        <div class="product-description">
                            ${product.description ? product.description.replace(/\n/g, '<br>') : 'Premium quality product from JMPOTTERS.'}
                        </div>
                    </div>
                    
                    ${isFootwear && currentProductColors.length > 0 ? `
                        <div class="variant-tile">
                            <div class="tile-label"><i class="fas fa-palette"></i> Select Color</div>
                            <div class="color-options" id="colorOptions">
                                ${currentProductColors.map(color => `
                                    <div class="color-option" 
                                         data-color-id="${color.id}"
                                         data-color-name="${color.color_name}"
                                         style="background: ${color.color_code ? `linear-gradient(135deg, ${color.color_code.split('+').join(', ')})` : '#f3f4f6'};">
                                        ${color.color_name}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="variant-tile">
                            <div class="tile-label"><i class="fas fa-ruler"></i> Select Size</div>
                            <div class="size-options" id="sizeOptions">
                                <div class="text-gray-400 text-sm">Please select a color first</div>
                            </div>
                        </div>
                        
                        <div class="selection-summary" id="selectionSummary" style="display: none;">
                            <div class="selected-variant">
                                <span id="selectedColorName"></span> - <span id="selectedSizeValue"></span>
                            </div>
                            <div class="stock-info">
                                <i class="fas fa-box"></i> Available Stock: <strong id="availableStock">0</strong>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="quantity-tile">
                        <div class="tile-label"><i class="fas fa-calculator"></i> Quantity</div>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus">-</button>
                            <input type="number" id="productQuantity" value="1" min="1" max="${product.stock || 100}">
                            <button class="quantity-btn plus">+</button>
                        </div>
                        <div class="bulk-options">
                            ${[2, 3, 5, 10].map(qty => `
                                <button class="bulk-option" data-qty="${qty}">${qty} Units</button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-btn btn-add-cart" id="pageAddToCart">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                        <button class="action-btn btn-wishlist ${isInWishlist ? 'active' : ''}" id="pageWishlist">
                            <i class="fas fa-heart"></i> ${isInWishlist ? 'Saved' : 'Wishlist'}
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
                    currentSelectedQuantity = parseInt(quantityInput.value);
                }
            });
            
            plusBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                const maxStock = currentSelectedSize?.stock || currentProduct?.stock || 100;
                if (currentValue < maxStock) {
                    quantityInput.value = currentValue + 1;
                    currentSelectedQuantity = parseInt(quantityInput.value);
                }
            });
            
            quantityInput.addEventListener('change', () => {
                const value = parseInt(quantityInput.value) || 1;
                const maxStock = currentSelectedSize?.stock || currentProduct?.stock || 100;
                quantityInput.value = Math.max(1, Math.min(value, maxStock));
                currentSelectedQuantity = parseInt(quantityInput.value);
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
                    ${isActive ? 'Wishlist' : 'Saved'}
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
            sizeOptions.innerHTML = '<div class="text-gray-400 text-sm">No sizes available for this color</div>';
            if (selectionSummary) selectionSummary.style.display = 'none';
            currentSelectedSize = null;
            currentSelectedVariant = null;
            return;
        }
        
        sizeOptions.innerHTML = availableSizes.map(size => {
            const stock = size.stock_quantity || 0;
            let disabledClass = '';
            let disabledAttr = '';
            if (stock === 0) {
                disabledClass = 'disabled';
                disabledAttr = 'disabled';
            }
            
            return `
                <div class="size-option ${disabledClass}" 
                     data-size-id="${size.id}"
                     data-size-value="${size.size_value}"
                     data-stock="${stock}"
                     ${disabledAttr}>
                    ${size.size_value}
                </div>
            `;
        }).join('');
        
        sizeOptions.querySelectorAll('.size-option:not(.disabled)').forEach(option => {
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
        
        productsGrid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading products...</p></div>`;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = `<div class="error-message"><h3>⚠️ Database Connection Error</h3><button onclick="location.reload()">Retry</button></div>`;
            return;
        }
        
        try {
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('slug', categorySlug)
                .single();
            
            if (catError || !category) {
                productsGrid.innerHTML = `<div class="error-message"><h3>⚠️ Category Not Found</h3><a href="index.html">Return to Home</a></div>`;
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
                productsGrid.innerHTML = `<div class="no-products"><i class="fas fa-box-open"></i><h3>No Products Found</h3></div>`;
                return;
            }
            
            window.JMPOTTERS_PRODUCTS_CACHE = products;
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = `<div class="error-message"><h3>⚠️ Error Loading Products</h3><button onclick="location.reload()">Retry</button></div>`;
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
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-id="${product.id}" data-action="wishlist">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div class="availability ${product.stock <= 0 ? 'out-of-stock' : ''}">
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
            showNotification(`Updated quantity for ${product.name}`, 'info');
        } else {
            cart.push(cartItem);
            let notificationText = `${product.name}`;
            if (options.color_name) notificationText += ` (${options.color_name})`;
            if (options.size_value) notificationText += ` - Size ${options.size_value}`;
            showNotification(`${notificationText} added to cart`, 'success');
        }
        
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartUI();
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
                        <div class="cart-item-name">${escapeHtml(itemDescription)}</div>
                        <div class="cart-item-price">${formatPrice(item.price)}</div>
                        <div class="cart-item-quantity-display">Quantity: ${item.quantity}</div>
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
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loading');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'flex';
        }
        
        const userData = {
            fullName: document.getElementById('checkoutFullName')?.value.trim() || '',
            email: document.getElementById('checkoutEmail')?.value.trim() || '',
            phone: document.getElementById('checkoutPhone')?.value.trim() || '',
            address: document.getElementById('checkoutAddress')?.value.trim() || '',
            city: document.getElementById('checkoutCity')?.value.trim() || '',
            state: document.getElementById('checkoutState')?.value || '',
            newsletter: document.getElementById('checkoutNewsletter')?.checked || false
        };
        
        if (!userData.fullName || !userData.email || !userData.phone || !userData.address || !userData.city || !userData.state) {
            showNotification('Please fill in all required fields', 'warning');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'flex';
                if (btnLoading) btnLoading.style.display = 'none';
            }
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            showNotification('Please enter a valid email address', 'warning');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'flex';
                if (btnLoading) btnLoading.style.display = 'none';
            }
            return;
        }
        
        const phoneRegex = /^[0-9]{10,11}$/;
        const cleanPhone = userData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            showNotification('Please enter a valid phone number (10-11 digits)', 'warning');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'flex';
                if (btnLoading) btnLoading.style.display = 'none';
            }
            return;
        }
        userData.phone = cleanPhone;
        
        const savedUser = await saveCheckoutUser(userData);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'flex';
            if (btnLoading) btnLoading.style.display = 'none';
        }
        
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
    
    // ====================
    // ORDER CREATION FUNCTIONS
    // ====================
    
    async function createOrder(orderData, cart) {
        const supabase = getSupabaseClient();
        
        if (!supabase) {
            showNotification('Database connection error', 'error');
            return null;
        }
        
        try {
            const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
            const shippingFee = subtotal >= 50000 ? 0 : 2000;
            const grandTotal = subtotal + shippingFee;
            
            const items = cart.map(item => ({
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                color_name: item.color_name || null,
                size_value: item.size_value || null,
                image_url: item.image_url
            }));
            
            let finalOrderNumber = null;
            let attempts = 0;
            const maxAttempts = 5;
            
            while (!finalOrderNumber && attempts < maxAttempts) {
                attempts++;
                
                try {
                    const timestamp = Date.now().toString().slice(-6);
                    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    const tempOrderNumber = 'JMP-' + new Date().getFullYear().toString().slice(-2) + '-' + timestamp + randomNum;
                    
                    const { data: existing } = await supabase
                        .from('orders')
                        .select('order_number')
                        .eq('order_number', tempOrderNumber)
                        .maybeSingle();
                    
                    if (!existing) {
                        finalOrderNumber = tempOrderNumber;
                    }
                } catch (e) {
                    console.warn('Order number generation error:', e);
                }
            }
            
            if (!finalOrderNumber) {
                finalOrderNumber = 'JMP-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
            }
            
            const orderInsert = {
                order_number: finalOrderNumber,
                user_id: orderData.user_id || null,
                user_name: orderData.full_name,
                user_email: orderData.email,
                user_phone: orderData.phone,
                full_name: orderData.full_name,
                shipping_address: orderData.address,
                city: orderData.city || null,
                state: orderData.state || null,
                total_amount: subtotal,
                shipping_fee: shippingFee,
                grand_total: grandTotal,
                status: 'pending',
                payment_status: 'pending',
                payment_method: 'card',
                notes: orderData.notes || '',
                items: items,
                created_at: new Date().toISOString()
            };
            
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(orderInsert)
                .select()
                .single();
            
            if (orderError) {
                showNotification(`Order failed: ${orderError.message}`, 'error');
                return null;
            }
            
            localStorage.removeItem('jmpotters_cart');
            updateCartUI();
            
            showNotification(`Order #${finalOrderNumber} placed successfully!`, 'success');
            
            localStorage.setItem('jmpotters_last_order', JSON.stringify({
                order: order,
                items: items,
                subtotal: subtotal,
                shipping_fee: shippingFee,
                grand_total: grandTotal
            }));
            
            return order;
            
        } catch (error) {
            console.error('Order creation error:', error);
            showNotification(`Failed to place order: ${error.message || 'Unknown error'}`, 'error');
            return null;
        }
    }
    
    async function getOrderByNumber(orderNumber) {
        const supabase = getSupabaseClient();
        
        try {
            const { data: order, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .maybeSingle();
            
            if (error) throw error;
            return order;
            
        } catch (error) {
            console.error('Order fetch error:', error);
            return null;
        }
    }
    
    // ====================
    // PROCEED TO CHECKOUT - FIXED (NO INFINITE LOOP)
    // ====================
    async function proceedToCheckout() {
        // Prevent multiple simultaneous checkout attempts
        if (isCheckoutInProgress) {
            console.log('Checkout already in progress, ignoring...');
            return;
        }
        
        console.log('🔍 proceedToCheckout called');
        
        const cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'warning');
            return;
        }
        
        const user = JSON.parse(localStorage.getItem('jmpotters_user'));
        console.log('User logged in:', !!user);
        
        let checkoutData;
        
        if (window.pendingCheckoutData) {
            checkoutData = window.pendingCheckoutData;
            window.pendingCheckoutData = null;
        } else if (user && user.address && user.city && user.state) {
            checkoutData = {
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                address: user.address,
                city: user.city,
                state: user.state,
                notes: ''
            };
        } else if (user) {
            // User exists but missing address - show modal to complete info
            showNotification('Please complete your shipping address', 'warning');
            showCheckoutSignupModal();
            return;
        } else {
            showCheckoutSignupModal();
            return;
        }
        
        isCheckoutInProgress = true;
        showNotification('Processing your order...', 'info');
        
        try {
            const order = await createOrder(checkoutData, cart);
            if (order) {
                window.location.href = `invoice.html?order=${order.order_number}`;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            showNotification('Checkout failed. Please try again.', 'error');
        } finally {
            isCheckoutInProgress = false;
        }
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
    
    // ====================
    // SETUP CHECKOUT BUTTONS - FIXED
    // ====================
    function setupCheckoutButtons() {
        console.log('Setting up checkout buttons');
        
        // Find the checkout button in the cart panel
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            // Remove all existing listeners by cloning
            const newBtn = checkoutBtn.cloneNode(true);
            checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Checkout button clicked');
                proceedToCheckout();
            });
            console.log('✅ Checkout button attached');
        } else {
            console.log('⚠️ Checkout button not found in DOM');
        }
        
        // Remove any WhatsApp checkout buttons (duplicate)
        const whatsappBtns = document.querySelectorAll('#whatsappCheckout');
        whatsappBtns.forEach(btn => {
            if (btn && btn.parentNode) {
                console.log('Removing duplicate WhatsApp button');
                btn.remove();
            }
        });
    }
    
    // ====================
    // HEADER FUNCTIONS
    // ====================
    function setupHeaderInteractions() {
        const cartBtn = document.getElementById('cartIcon');
        if (cartBtn && !cartBtn.hasAttribute('data-listener-added')) {
            cartBtn.setAttribute('data-listener-added', 'true');
            cartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openCart();
            });
        }
        
        const wishlistBtn = document.getElementById('wishlistIcon');
        if (wishlistBtn && !wishlistBtn.hasAttribute('data-listener-added')) {
            wishlistBtn.setAttribute('data-listener-added', 'true');
            wishlistBtn.addEventListener('click', function() {
                showNotification('Wishlist feature coming soon!', 'info');
            });
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeCart();
            }
        });
    }
    
    // ====================
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        
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
        
        // Setup checkout buttons after cart is rendered
        setTimeout(() => {
            setupCheckoutButtons();
        }, 500);
        
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
            isUserLoggedIn,
            createOrder,
            getOrderByNumber,
            loadRecommendations,
            renderRecommendations,
            updateCartUI
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
    
    console.log('✅ JMPOTTERS app loaded with recommendation engine');
})();
