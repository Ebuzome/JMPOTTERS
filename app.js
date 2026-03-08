// ====================
// JMPOTTERS APP - COMPLETE FIXED VERSION WITH ALL FUNCTIONS
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
    
    window.JMPOTTERS_CONFIG.supabase = {
        url: 'https://tmpggeeuwdvlngvfncaa.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'
    };
    
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
    // STATE MANAGEMENT
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
            notificationContainer.className = 'fixed top-4 right-4 z-[100] space-y-2';
            document.body.appendChild(notificationContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `glass rounded-xl p-4 pr-6 shadow-2xl transform transition-all duration-500 translate-x-full opacity-0 border-l-4 ${
            type === 'success' ? 'border-l-green-500' :
            type === 'error' ? 'border-l-red-500' :
            type === 'warning' ? 'border-l-jmp-gold' :
            'border-l-blue-500'
        }`;
        
        const icons = {
            success: 'fa-check-circle text-green-500',
            error: 'fa-exclamation-circle text-red-500',
            warning: 'fa-exclamation-triangle text-jmp-gold',
            info: 'fa-info-circle text-blue-500'
        };
        
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas ${icons[type] || icons.info} text-xl"></i>
                <span class="text-gray-200">${message}</span>
            </div>
        `;
        
        notificationContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }
    
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
    // LOAD PRODUCTS BY CATEGORY (FOR CATEGORY PAGES)
    // ====================
    async function loadProductsByCategory(categorySlug) {
        console.log(`📦 Loading products for category: ${categorySlug}`);
        
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            console.log('No products grid found - not a category page');
            return;
        }
        
        // Show loading skeletons
        productsGrid.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                ${Array(8).fill().map(() => `
                    <div class="glass rounded-2xl overflow-hidden animate-pulse">
                        <div class="aspect-square skeleton"></div>
                        <div class="p-4 space-y-3">
                            <div class="h-4 skeleton rounded w-3/4"></div>
                            <div class="h-6 skeleton rounded w-1/2"></div>
                            <div class="h-4 skeleton rounded w-1/4"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            productsGrid.innerHTML = `<div class="text-center py-12 text-red-400">Database connection error</div>`;
            return;
        }
        
        try {
            // Get category first
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id, name, slug')
                .eq('slug', categorySlug)
                .single();
            
            if (catError || !category) {
                console.error('Category error:', catError);
                productsGrid.innerHTML = `<div class="text-center py-12 text-gray-400">Category not found</div>`;
                return;
            }
            
            // Get products for this category
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id, name, price, image_url, stock, slug, description')
                .eq('category_id', category.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (prodError) throw prodError;
            
            if (!products || products.length === 0) {
                productsGrid.innerHTML = `
                    <div class="col-span-full text-center py-16">
                        <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-box-open text-3xl text-gray-500"></i>
                        </div>
                        <p class="text-gray-400 text-lg">No products found in this category</p>
                    </div>
                `;
                return;
            }
            
            renderProducts(products, categorySlug);
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            productsGrid.innerHTML = `<div class="text-center py-12 text-red-400">Error loading products. Please try again.</div>`;
        }
    }
    
    function renderProducts(products, categorySlug) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                ${products.map(product => {
                    const imageUrl = getImageUrl(categorySlug, product.image_url);
                    const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
                    const isInWishlist = wishlist.some(item => item.id === product.id);
                    
                    return `
                        <a href="product.html?slug=${encodeURIComponent(product.slug || product.id)}" 
                           class="group block glass rounded-2xl overflow-hidden hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
                            <div class="relative aspect-square overflow-hidden bg-gradient-to-br from-jmp-dark-light to-jmp-darker">
                                <img src="${imageUrl}" 
                                     alt="${product.name}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                     onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                                
                                <!-- Wishlist Button -->
                                <button class="wishlist-btn absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-110 z-10 ${
                                    isInWishlist ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
                                }" 
                                        data-product-id="${product.id}"
                                        onclick="event.preventDefault(); event.stopPropagation();">
                                    <i class="fas fa-heart"></i>
                                </button>
                                
                                <!-- Stock Badge -->
                                ${product.stock < 5 ? `
                                    <div class="absolute bottom-3 left-3">
                                        <span class="px-3 py-1.5 text-xs font-semibold rounded-full ${
                                            product.stock > 0 
                                                ? 'bg-jmp-gold/20 text-jmp-gold border border-jmp-gold/30' 
                                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        } backdrop-blur-sm">
                                            <i class="fas fa-${product.stock > 0 ? 'exclamation-triangle' : 'times-circle'} mr-1"></i>
                                            ${product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="p-4">
                                <h3 class="font-semibold text-white mb-2 line-clamp-2 group-hover:text-jmp-gold transition-colors">
                                    ${product.name}
                                </h3>
                                <div class="text-2xl font-bold gradient-gold mb-2">
                                    ${formatPrice(product.price)}
                                </div>
                                <div class="flex items-center gap-2 text-sm ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}">
                                    <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                                    <span>${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                                </div>
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
        `;
        
        // Add wishlist event listeners
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(this.dataset.productId);
                const product = products.find(p => p.id === productId);
                
                if (product) {
                    toggleWishlist(product);
                    this.classList.toggle('text-red-500');
                    this.classList.toggle('text-gray-300');
                }
            });
        });
    }
    
    // ====================
    // LOAD SINGLE PRODUCT BY SLUG (FOR PRODUCT PAGE)
    // ====================
    async function loadSingleProductBySlug(slug) {
        console.log(`📦 Loading single product by slug: ${slug}`);
        
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const productContainer = document.getElementById('productContainer');
        const productViewer = document.getElementById('productViewer');
        const productBreadcrumb = document.getElementById('productBreadcrumb');
        const categoryBreadcrumb = document.getElementById('categoryBreadcrumb');
        
        if (!productViewer || !productContainer) {
            console.error('❌ Product viewer container not found');
            return;
        }
        
        // Hide error state if visible
        if (errorState) errorState.style.display = 'none';
        
        // Show loading state
        if (loadingState) loadingState.style.display = 'block';
        if (productContainer) productContainer.classList.add('hidden');
        
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
            
            // Update document title and breadcrumb
            document.title = `${product.name} - JMPOTTERS`;
            if (productBreadcrumb) productBreadcrumb.textContent = product.name;
            
            if (categoryBreadcrumb && category) {
                categoryBreadcrumb.textContent = category.name;
                categoryBreadcrumb.href = `${category.slug}.html`;
            }
            
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
            
            // Render product
            renderProductPage(currentProduct);
            
            // Hide loading state, show product
            if (loadingState) loadingState.style.display = 'none';
            productContainer.classList.remove('hidden');
            
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
        
        console.log('🗺️ Built color-size mappings');
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <!-- Product Image -->
                <div class="relative group">
                    <div class="glass rounded-3xl p-4 overflow-hidden transform transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl">
                        <div class="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-jmp-dark-light to-jmp-darker">
                            <img src="${imageUrl}" alt="${product.name}" 
                                 class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                 onerror="this.src='${window.JMPOTTERS_CONFIG.images.baseUrl}placeholder.jpg'">
                            
                            <!-- Stock Badge -->
                            <div class="absolute top-4 left-4">
                                <span class="px-4 py-2 rounded-full text-sm font-semibold ${
                                    product.stock > 0 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                } backdrop-blur-sm">
                                    <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'} mr-1"></i>
                                    ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                            </div>
                            
                            <!-- Category Badge -->
                            <div class="absolute top-4 right-4">
                                <span class="px-4 py-2 rounded-full text-sm font-semibold bg-jmp-gold/20 text-jmp-gold border border-jmp-gold/30 backdrop-blur-sm">
                                    <i class="fas fa-tag mr-1"></i>
                                    ${categorySlug.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Product Details -->
                <div class="space-y-6">
                    <!-- Title -->
                    <h1 class="text-4xl lg:text-5xl font-black text-white leading-tight">${product.name}</h1>
                    
                    <!-- Price -->
                    <div class="glass rounded-2xl p-6 relative overflow-hidden">
                        <div class="relative z-10">
                            <span class="text-gray-400 text-sm uppercase tracking-wider">Price</span>
                            <div class="text-5xl font-black gradient-gold mt-1">${formatPrice(product.price)}</div>
                        </div>
                        <div class="absolute bottom-0 right-0 text-8xl opacity-5 pointer-events-none select-none">₦</div>
                    </div>
                    
                    ${isFootwear && currentProductColors.length > 0 ? `
                        <!-- Color Selection -->
                        <div class="glass rounded-2xl p-6">
                            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <i class="fas fa-palette text-jmp-gold"></i>
                                Select Color
                            </h3>
                            <div class="flex flex-wrap gap-3" id="colorOptions">
                                ${currentProductColors.map(color => `
                                    <button class="color-option group relative px-5 py-3 rounded-xl bg-white/5 border-2 border-transparent hover:border-jmp-gold/50 hover:bg-jmp-gold/10 transition-all duration-300 text-gray-300 hover:text-white font-medium"
                                            data-color-id="${color.id}"
                                            data-color-name="${color.color_name}">
                                        <span class="relative z-10">${color.color_name}</span>
                                        <div class="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-jmp-gold/20 to-transparent"></div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Size Selection -->
                        <div class="glass rounded-2xl p-6">
                            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <i class="fas fa-ruler text-jmp-gold"></i>
                                Select Size
                            </h3>
                            <div id="sizeOptions" class="flex flex-wrap gap-3">
                                <div class="text-gray-400 py-8 text-center w-full">
                                    <i class="fas fa-hand-pointer text-2xl mb-2 opacity-50"></i>
                                    <p>Please select a color first</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Selection Summary -->
                        <div id="selectionSummary" class="glass rounded-2xl p-6 border-2 border-jmp-gold/30 hidden">
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="text-sm text-gray-400">Selected</span>
                                    <div class="text-xl font-bold text-white mt-1">
                                        <span id="selectedColorName"></span> - <span id="selectedSizeValue"></span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="text-sm text-gray-400">Available</span>
                                    <div class="text-2xl font-bold text-jmp-gold mt-1" id="availableStock">0</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Quantity -->
                    <div class="glass rounded-2xl p-6">
                        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <i class="fas fa-cubes text-jmp-gold"></i>
                            Quantity
                        </h3>
                        
                        <div class="flex items-center gap-4 mb-4">
                            <button class="quantity-btn minus w-12 h-12 rounded-xl bg-gradient-to-r from-jmp-gold to-jmp-gold-light text-black font-bold text-xl hover:scale-105 transition-all duration-300 shadow-lg shadow-jmp-gold/20">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" id="productQuantity" value="1" min="1" max="${product.stock || 100}" 
                                   class="w-24 h-12 text-center bg-white/5 border-2 border-white/10 text-white font-bold text-xl rounded-xl focus:border-jmp-gold focus:outline-none transition-colors">
                            <button class="quantity-btn plus w-12 h-12 rounded-xl bg-gradient-to-r from-jmp-gold to-jmp-gold-light text-black font-bold text-xl hover:scale-105 transition-all duration-300 shadow-lg shadow-jmp-gold/20">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        
                        <div class="flex flex-wrap gap-2">
                            ${[1, 5, 10, 25, 50].map(qty => `
                                <button class="bulk-option px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-jmp-gold hover:bg-jmp-gold/10 transition-all duration-300 text-gray-300 hover:text-white font-medium ${
                                    qty === 1 ? 'bg-jmp-gold/20 border-jmp-gold text-white' : ''
                                }" data-qty="${qty}">
                                    ${qty} Unit${qty > 1 ? 's' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Description -->
                    <div class="glass rounded-2xl p-6">
                        <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <i class="fas fa-info-circle text-jmp-gold"></i>
                            Description
                        </h3>
                        <p class="text-gray-300 leading-relaxed">
                            ${product.description ? product.description.replace(/\n/g, '<br>') : 'Premium quality product from JMPOTTERS.'}
                        </p>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="grid grid-cols-2 gap-4">
                        <button id="pageAddToCart" class="group relative px-6 py-4 bg-gradient-to-r from-jmp-gold to-jmp-gold-light text-black font-bold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-jmp-gold/30">
                            <span class="relative z-10 flex items-center justify-center gap-2">
                                <i class="fas fa-shopping-cart"></i>
                                Add to Cart
                            </span>
                            <div class="absolute inset-0 bg-gradient-to-r from-jmp-gold-dark to-jmp-gold opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        
                        <button id="pageWishlist" class="px-6 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                            isInWishlist 
                                ? 'bg-red-500/20 text-red-400 border-2 border-red-500/30 hover:bg-red-500/30' 
                                : 'bg-white/5 text-gray-300 border-2 border-white/10 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10'
                        }">
                            <i class="fas fa-heart"></i>
                            ${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
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
                
                colorOptions.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('border-jmp-gold', 'bg-jmp-gold/20', 'text-white');
                });
                colorOption.classList.add('border-jmp-gold', 'bg-jmp-gold/20', 'text-white');
                
                currentSelectedColor = {
                    id: parseInt(colorOption.dataset.colorId),
                    name: colorOption.dataset.colorName
                };
                
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
        
        // Bulk options
        document.querySelectorAll('.bulk-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.bulk-option').forEach(opt => {
                    opt.classList.remove('bg-jmp-gold/20', 'border-jmp-gold', 'text-white');
                });
                this.classList.add('bg-jmp-gold/20', 'border-jmp-gold', 'text-white');
                
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
                        variant_id: currentSelectedVariant?.id,
                        category_slug: currentProduct.category_slug
                    });
                } else {
                    if (currentSelectedQuantity > currentProduct.stock) {
                        showNotification(`Only ${currentProduct.stock} units available`, 'error');
                        return;
                    }
                    
                    addToCart(currentProduct, currentSelectedQuantity, {
                        category_slug: currentProduct.category_slug
                    });
                }
            });
        }
        
        // Wishlist button
        const pageWishlist = document.getElementById('pageWishlist');
        if (pageWishlist && currentProduct) {
            pageWishlist.addEventListener('click', () => {
                toggleWishlist(currentProduct);
                const isActive = pageWishlist.classList.contains('bg-red-500/20');
                pageWishlist.classList.toggle('bg-red-500/20');
                pageWishlist.classList.toggle('text-red-400');
                pageWishlist.classList.toggle('border-red-500/30');
                pageWishlist.classList.toggle('bg-white/5');
                pageWishlist.classList.toggle('text-gray-300');
                pageWishlist.classList.toggle('border-white/10');
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
            sizeOptions.innerHTML = `
                <div class="text-gray-400 py-8 text-center w-full">
                    <i class="fas fa-times-circle text-2xl mb-2 opacity-50"></i>
                    <p>No sizes available for this color</p>
                </div>
            `;
            if (selectionSummary) selectionSummary.style.display = 'none';
            currentSelectedSize = null;
            currentSelectedVariant = null;
            return;
        }
        
        sizeOptions.innerHTML = availableSizes.map(size => {
            const stock = size.stock_quantity || 0;
            let stockClass = '';
            if (stock === 0) {
                stockClass = 'opacity-50 cursor-not-allowed line-through bg-red-500/10 border-red-500/30 text-red-400';
            } else if (stock < 5) {
                stockClass = 'border-jmp-gold/50 relative';
            }
            
            return `
                <button class="size-option px-5 py-3 rounded-xl bg-white/5 border-2 hover:border-jmp-gold hover:bg-jmp-gold/10 transition-all duration-300 text-gray-300 hover:text-white font-medium ${stockClass} ${
                    stock === 0 ? 'disabled' : ''
                }" 
                        data-size-id="${size.id}"
                        data-size-value="${size.size_value}"
                        data-stock="${stock}"
                        ${stock === 0 ? 'disabled' : ''}>
                    ${size.size_value}
                    ${stock < 5 && stock > 0 ? '<span class="absolute -top-2 -right-2 text-xs bg-jmp-gold text-black px-2 py-1 rounded-full">Low Stock</span>' : ''}
                </button>
            `;
        }).join('');
        
        sizeOptions.querySelectorAll('.size-option:not(.disabled)').forEach(option => {
            option.addEventListener('click', function() {
                sizeOptions.querySelectorAll('.size-option').forEach(opt => {
                    opt.classList.remove('border-jmp-gold', 'bg-jmp-gold/20', 'text-white');
                });
                this.classList.add('border-jmp-gold', 'bg-jmp-gold/20', 'text-white');
                
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
            cartItems.innerHTML = `
                <div class="text-center py-16">
                    <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-shopping-bag text-3xl text-gray-500"></i>
                    </div>
                    <p class="text-gray-400">Your cart is empty</p>
                </div>
            `;
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
                <div class="glass rounded-xl p-4 hover:scale-[1.02] transition-transform duration-300">
                    <div class="flex gap-4">
                        <div class="w-20 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                            <img src="${getImageUrl(item.category_slug, item.image_url)}" alt="${item.name}" class="w-full h-full object-cover">
                        </div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-white mb-1">${itemDescription}</h4>
                            <div class="text-jmp-gold font-bold mb-1">${formatPrice(item.price)}</div>
                            <div class="text-sm text-gray-400">Quantity: ${item.quantity}</div>
                        </div>
                        <button class="cart-item-remove w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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
        
        const checkoutBtn = document.getElementById('checkoutButton');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
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
                window.open(`https://wa.me/2348139583320?text=${encodeURIComponent(text)}`, '_blank');
            });
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
            cartPanel.classList.remove('translate-x-full');
        }
        
        if (cartOverlay) {
            cartOverlay.classList.remove('hidden');
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    function closeCart() {
        const cartPanel = document.getElementById('cartPanel');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartPanel) {
            cartPanel.classList.add('translate-x-full');
        }
        
        if (cartOverlay) {
            cartOverlay.classList.add('hidden');
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
    // INITIALIZATION
    // ====================
    async function initializePage() {
        console.log('🚀 Initializing JMPOTTERS page...');
        
        setupHeaderInteractions();
        updateCartUI();
        
        if (isProductPage()) {
            const slug = getSlugFromURL();
            console.log('📦 Product page detected, slug:', slug);
            
            if (slug) {
                await loadSingleProductBySlug(slug);
            } else {
                console.error('❌ No slug found in URL');
                const errorState = document.getElementById('errorState');
                if (errorState) {
                    errorState.style.display = 'block';
                }
                const loadingState = document.getElementById('loadingState');
                if (loadingState) loadingState.style.display = 'none';
            }
        } else {
            const currentCategory = getCurrentCategory();
            if (document.getElementById('productsGrid')) {
                await loadProductsByCategory(currentCategory);
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
})();
