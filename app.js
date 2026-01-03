// ====================
// CONFIGURATION
// ====================
// ====================
// CONFIGURATION
// ====================
const SUPABASE_URL = window.SUPABASE_URL || 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4';

// Initialize Supabase - CHECK IF ALREADY EXISTS TO AVOID DUPLICATE
let supabase;
if (window.supabase && window.supabase.createClient) {
    if (!window.globalSupabaseClient) {
        window.globalSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    supabase = window.globalSupabaseClient;
} else {
    console.error('Supabase library not loaded!');
    // Create placeholder to prevent errors
    supabase = { 
        from: () => ({ 
            select: () => ({ 
                eq: () => ({ 
                    single: async () => ({ data: null, error: { message: 'Supabase not loaded' } })
                })
            })
        })
    };
}

console.log('✅ Supabase initialized');
// ====================
// IMAGE PATH CONFIGURATION
// ====================
const IMAGE_BASE_URL = 'https://ebuzome.io/JMPOTTERS/assets/images/';

// Image paths for each category
const CATEGORY_IMAGE_PATHS = {
    'mensfootwear': IMAGE_BASE_URL + 'mensfootwear/',
    'womensfootwear': IMAGE_BASE_URL,  // Root images folder
    'bags': IMAGE_BASE_URL,            // Same as womensfootwear
    'household': IMAGE_BASE_URL + 'household2/',
    'kids': IMAGE_BASE_URL + 'kids/',
    'accessories': IMAGE_BASE_URL + 'accessories/'
};

// ====================
// UTILITY FUNCTIONS
// ====================
function getSessionId() {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
        sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
}

function getImageUrl(categorySlug, imageFilename) {
    const basePath = CATEGORY_IMAGE_PATHS[categorySlug] || IMAGE_BASE_URL;
    return basePath + imageFilename;
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(el => el.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
    
    // Show loading
    productsGrid.innerHTML = `
        <div class="loading" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Loading products...</p>
        </div>
    `;
    
    try {
        // Get category ID
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('id, name, description')
            .eq('slug', categorySlug)
            .single();
        
        if (catError || !category) {
            throw new Error(`Category "${categorySlug}" not found`);
        }
        
        // Update page title if exists
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = category.name;
        }
        
        // Update page description if exists
        const pageDesc = document.getElementById('page-description');
        if (pageDesc && category.description) {
            pageDesc.textContent = category.description;
        }
        
        // Get products
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (prodError) throw prodError;
        
        if (!products || products.length === 0) {
            showNoProducts(categorySlug);
            return;
        }
        
        console.log(`✅ Loaded ${products.length} products for ${categorySlug}`);
        renderProducts(products, categorySlug);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        productsGrid.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h3>⚠️ Error Loading Products</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

function renderProducts(products, categorySlug) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    // Clear grid
    productsGrid.innerHTML = '';
    
    // Render each product
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id;
        
        // Build image URL using correct path
        const imageUrl = getImageUrl(categorySlug, product.image_url);
        const placeholderUrl = IMAGE_BASE_URL + 'placeholder.jpg';
        
        // Calculate discount for display (optional)
        const fakePrice = Math.round(product.price * 1.3);
        const discount = Math.floor((fakePrice - product.price) / fakePrice * 100);
        
        productCard.innerHTML = `
            <div class="product-image">
                ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
                <img src="${imageUrl}" alt="${product.name}" 
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${placeholderUrl}'">
                <div class="quick-actions">
                    <button class="quick-view" onclick="quickView(${product.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
                <div class="product-price">
                    ${discount > 0 ? `<span class="old-price">₦${fakePrice.toLocaleString()}</span>` : ''}
                    <span class="current-price">₦${product.price.toLocaleString()}</span>
                </div>
                <div class="product-meta">
                    <span class="product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                        <i class="fas ${product.stock > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})" 
                            ${product.stock < 1 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
    
    // Update product count display
    const productCount = document.getElementById('productCount');
    if (productCount) {
        productCount.textContent = `${products.length} products`;
    }
}

function showNoProducts(categorySlug) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = `
        <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 60px;">
            <i class="fas fa-box-open fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
            <h3>No Products Found</h3>
            <p>Check back later for new arrivals in ${categorySlug}!</p>
            <a href="index.html" class="btn-shop-all">Browse All Categories</a>
        </div>
    `;
}

// ====================
// CART FUNCTIONS
// ====================
async function addToCart(productId) {
    try {
        // Get product details
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        if (product.stock < 1) {
            showNotification('Product out of stock!', 'error');
            return;
        }
        
        // Get or create cart
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item.product_id === productId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                showNotification('Maximum stock reached!', 'error');
                return;
            }
            existingItem.quantity += 1;
        } else {
            // Get category slug for image path
            const { data: category } = await supabase
                .from('categories')
                .select('slug')
                .eq('id', product.category_id)
                .single();
            
            cart.push({
                product_id: productId,
                quantity: 1,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                category_slug: category?.slug || 'products',
                added_at: new Date().toISOString()
            });
        }
        
        // Save to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update UI
        updateCartUI();
        showNotification('✅ Added to cart!', 'success');
        
        // Update cart count animation
        animateCartIcon();
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add to cart', 'error');
    }
}

function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update cart count in navbar
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
    
    // Update cart total if on cart page
    if (window.location.pathname.includes('cart.html')) {
        updateCartTotal();
    }
}

function animateCartIcon() {
    const cartIcons = document.querySelectorAll('.cart-count');
    cartIcons.forEach(icon => {
        icon.style.transform = 'scale(1.5)';
        setTimeout(() => {
            icon.style.transform = 'scale(1)';
        }, 300);
    });
}

function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.product_id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    updateCartUI();
    showNotification('Item removed from cart', 'info');
    
    // If on cart page, refresh display
    if (window.location.pathname.includes('cart.html')) {
        loadCartPage();
    }
}

function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cart.find(i => i.product_id === productId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        
        // Reload cart page if on it
        if (window.location.pathname.includes('cart.html')) {
            loadCartPage();
        }
    }
}

// ====================
// CART PAGE FUNCTIONS
// ====================
async function loadCartPage() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartContainer = document.getElementById('cartContainer');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartItemCount');
    const emptyCart = document.getElementById('emptyCart');
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (!cartContainer) return;
    
    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'block';
        if (cartItems) cartItems.style.display = 'none';
        if (cartSummary) cartSummary.style.display = 'none';
        if (cartTotal) cartTotal.textContent = '₦0';
        if (cartCount) cartCount.textContent = '0 items';
        return;
    }
    
    // Show cart items and summary
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartItems) cartItems.style.display = 'block';
    if (cartSummary) cartSummary.style.display = 'block';
    
    // Calculate totals
    let subtotal = 0;
    let html = '';
    
    for (const item of cart) {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        // Get image URL
        const imageUrl = getImageUrl(item.category_slug, item.image_url);
        
        html += `
            <div class="cart-item" data-id="${item.product_id}">
                <div class="cart-item-image">
                    <img src="${imageUrl}" alt="${item.name}"
                         onerror="this.src='${IMAGE_BASE_URL}placeholder.jpg'">
                </div>
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p class="price">₦${item.price.toLocaleString()}</p>
                    <div class="quantity-controls">
                        <button onclick="updateQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <div class="cart-item-total">
                    <p class="item-total">₦${itemTotal.toLocaleString()}</p>
                    <button onclick="removeFromCart(${item.product_id})" class="remove-btn">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }
    
    if (cartItems) cartItems.innerHTML = html;
    
    // Calculate shipping and total
    const shipping = subtotal > 0 ? 1500 : 0; // Free shipping over certain amount?
    const total = subtotal + shipping;
    
    // Update summary
    if (cartSummary) {
        const subtotalEl = document.getElementById('cartSubtotal');
        const shippingEl = document.getElementById('cartShipping');
        const totalEl = document.getElementById('cartTotal');
        
        if (subtotalEl) subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
        if (shippingEl) shippingEl.textContent = `₦${shipping.toLocaleString()}`;
        if (totalEl) totalEl.textContent = `₦${total.toLocaleString()}`;
    }
    
    if (cartCount) cartCount.textContent = `${cart.reduce((sum, item) => sum + item.quantity, 0)} items`;
}

function updateCartTotal() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 0 ? 1500 : 0;
    const total = subtotal + shipping;
    
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = `₦${total.toLocaleString()}`;
}

// ====================
// PAGE INITIALIZATION
// ====================
function detectCurrentCategory() {
    // Try window.currentCategory first (set in HTML)
    if (window.currentCategory) return window.currentCategory;
    
    // Detect from URL pathname
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '');
    
    const pageToCategory = {
        'mensfootwear': 'mensfootwear',
        'womensfootwear': 'womensfootwear',
        'bags': 'bags',
        'household': 'household',
        'kids': 'kids',
        'accessories': 'accessories',
        'index': 'featured' // Special case for homepage
    };
    
    return pageToCategory[page] || 'mensfootwear';
}

async function initializePage() {
    console.log('🚀 Initializing page...');
    
    // Update cart UI
    updateCartUI();
    
    // Load products if on category page
    const currentCategory = detectCurrentCategory();
    if (document.getElementById('productsGrid') && currentCategory !== 'featured') {
        await loadProductsByCategory(currentCategory);
    }
    
    // Load featured products for homepage
    if (currentCategory === 'featured' && document.getElementById('featuredProducts')) {
        await loadFeaturedProducts();
    }
    
    // Initialize cart page if needed
    if (window.location.pathname.includes('cart.html')) {
        loadCartPage();
    }
    
    // Initialize checkout page if needed
    if (window.location.pathname.includes('checkout.html')) {
        initializeCheckout();
    }
    
    console.log('✅ Page initialized');
}

// ====================
// HOMEPAGE FUNCTIONS
// ====================
async function loadFeaturedProducts() {
    try {
        // Get 6 random products from different categories
        const { data: products, error } = await supabase
            .from('products')
            .select('*, categories(slug)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(12);
        
        if (error) throw error;
        
        if (!products || products.length === 0) return;
        
        renderFeaturedProducts(products);
        
    } catch (error) {
        console.error('Error loading featured products:', error);
    }
}

function renderFeaturedProducts(products) {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    container.innerHTML = '';
    
    products.forEach(product => {
        const categorySlug = product.categories?.slug || 'products';
        const imageUrl = getImageUrl(categorySlug, product.image_url);
        
        const productCard = `
            <div class="product-card">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="price">₦${product.price.toLocaleString()}</p>
                    <button onclick="addToCart(${product.id})" class="btn-add-cart">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', productCard);
    });
}

// ====================
// CHECKOUT FUNCTIONS
// ====================
function initializeCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const orderSummary = document.getElementById('orderSummary');
    
    if (!orderSummary || cart.length === 0) return;
    
    let subtotal = 0;
    let html = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="order-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>₦${itemTotal.toLocaleString()}</span>
            </div>
        `;
    });
    
    const shipping = 1500;
    const total = subtotal + shipping;
    
    html += `
        <div class="order-totals">
            <div class="total-row">
                <span>Subtotal</span>
                <span>₦${subtotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
                <span>Shipping</span>
                <span>₦${shipping.toLocaleString()}</span>
            </div>
            <div class="total-row grand-total">
                <span>Total</span>
                <span>₦${total.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    orderSummary.innerHTML = html;
    
    // Update checkout form total
    const totalInput = document.getElementById('checkoutTotal');
    if (totalInput) {
        totalInput.value = total;
    }
}

// ====================
// QUICK VIEW FUNCTION
// ====================
async function quickView(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*, categories(slug, name)')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'quick-view-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        const imageUrl = getImageUrl(product.categories.slug, product.image_url);
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                max-width: 800px;
                width: 100%;
                border-radius: 10px;
                padding: 30px;
                position: relative;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <button class="close-modal" onclick="this.parentElement.parentElement.remove()" 
                        style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">
                    ×
                </button>
                <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div class="modal-image">
                        <img src="${imageUrl}" alt="${product.name}" 
                             style="width: 100%; border-radius: 5px;">
                    </div>
                    <div class="modal-details">
                        <h2 style="margin-top: 0;">${product.name}</h2>
                        <p class="price" style="font-size: 24px; color: #d4af37; font-weight: bold;">
                            ₦${product.price.toLocaleString()}
                        </p>
                        ${product.description ? `<p>${product.description}</p>` : ''}
                        <p><strong>Category:</strong> ${product.categories.name}</p>
                        <p><strong>Stock:</strong> ${product.stock} available</p>
                        <div class="modal-actions" style="margin-top: 30px;">
                            <button onclick="addToCart(${product.id})" 
                                    style="padding: 12px 30px; background: #000; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error in quick view:', error);
        showNotification('Failed to load product details', 'error');
    }
}

// ====================
// START APPLICATION
// ====================
document.addEventListener('DOMContentLoaded', initializePage);

// Add CSS for notifications and animations
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
    
    .cart-count {
        transition: transform 0.3s ease;
    }
    
    .loading {
        color: #666;
    }
    
    .loading .fa-spinner {
        color: #d4af37;
        margin-bottom: 10px;
    }
    
    .retry-btn {
        padding: 8px 20px;
        background: #d4af37;
        color: #000;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 15px;
    }
    
    .btn-shop-all {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 25px;
        background: #000;
        color: white;
        text-decoration: none;
        border-radius: 5px;
    }
`;
document.head.appendChild(style);

console.log('✅ app.js loaded with correct image paths');
