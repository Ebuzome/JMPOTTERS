// ====================
// CONFIGURATION
// ====================
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4';

// Initialize Supabase
let supabase;
try {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabase;
        console.log('✅ Supabase client created');
    } else {
        throw new Error('Supabase library not loaded');
    }
} catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    supabase = null;
}

// ====================
// IMAGE PATH CONFIGURATION - CORRECTED!
// ====================
const IMAGE_BASE_URL = 'https://ebuzome.github.io/JMPOTTERS/assets/images/';

const CATEGORY_IMAGE_PATHS = {
    'mensfootwear': IMAGE_BASE_URL + 'mensfootwear/',
    'womensfootwear': IMAGE_BASE_URL,
    'bags': IMAGE_BASE_URL,
    'household': IMAGE_BASE_URL + 'household2/',
    'kids': IMAGE_BASE_URL + 'kids/',
    'accessories': IMAGE_BASE_URL + 'accessories/'
};

// ====================
// UTILITY FUNCTIONS
// ====================
function getImageUrl(categorySlug, imageFilename) {
    if (!imageFilename) return IMAGE_BASE_URL + 'placeholder.jpg';
    const basePath = CATEGORY_IMAGE_PATHS[categorySlug] || IMAGE_BASE_URL;
    return basePath + imageFilename;
}

function showNotification(message, type = 'success') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create a simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 9999;
        animation: fadeInOut 3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Add notification animation
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
}

// ====================
// PRODUCT FUNCTIONS - UPDATED FOR ACCESSORIES.HTML
// ====================
async function loadProductsByCategory(categorySlug) {
    console.log(`📦 Loading products for: ${categorySlug}`);
    
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.error('❌ Products grid not found');
        return;
    }
    
    // Show loading with CORRECT CSS class
    productsGrid.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading accessories...</p>
        </div>
    `;
    
    if (!supabase) {
        productsGrid.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Database Connection Error</h3>
                <p>Supabase client not initialized</p>
                <button onclick="location.reload()" class="btn">Retry</button>
            </div>
        `;
        return;
    }
    
    try {
        // Get category ID
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('id, name, description')
            .eq('slug', categorySlug)
            .single();
        
        if (catError || !category) {
            console.error('Category error:', catError);
            productsGrid.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Category Not Found</h3>
                    <p>Category "${categorySlug}" does not exist in database</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
            return;
        }
        
        console.log(`✅ Found category: ${category.name} (ID: ${category.id})`);
        
        // Get products
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (prodError) {
            console.error('Products error:', prodError);
            throw prodError;
        }
        
        console.log(`✅ Loaded ${products ? products.length : 0} products`);
        
        if (!products || products.length === 0) {
            showNoProducts();
            return;
        }
        
        renderProducts(products, categorySlug);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        productsGrid.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error Loading Products</h3>
                <p>${error.message || 'Unknown error'}</p>
                <button onclick="location.reload()" class="btn">Retry</button>
            </div>
        `;
    }
}

function renderProducts(products, categorySlug) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    // Clear grid
    productsGrid.innerHTML = '';
    
    // Render each product using the EXACT HTML structure from accessories.html
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id;
        
        // Build image URL
        const imageUrl = getImageUrl(categorySlug, product.image_url);
        const placeholderUrl = IMAGE_BASE_URL + 'placeholder.jpg';
        
        // Create product card HTML matching accessories.html structure
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" 
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${placeholderUrl}'">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">₦${product.price.toLocaleString()}</div>
                <button class="product-toggle" onclick="toggleProductDetails(${product.id})">
                    View Details
                </button>
                <button class="cart-btn" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
                <button class="wishlist-btn" onclick="toggleWishlist(${product.id})" id="wishlist-${product.id}">
                    <i class="fas fa-heart"></i> Wishlist
                </button>
                <a href="https://wa.me/2348139583320?text=I'm interested in ${encodeURIComponent(product.name)} - ₦${product.price}" 
                   class="whatsapp-btn btn" target="_blank">
                    <i class="fab fa-whatsapp"></i> Buy Now
                </a>
            </div>
            <div class="product-details" id="details-${product.id}">
                <p>${product.description || 'No description available.'}</p>
                <p><strong>Stock:</strong> ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
    
    console.log(`✅ Rendered ${products.length} products`);
}

function toggleProductDetails(productId) {
    const details = document.getElementById(`details-${productId}`);
    if (details) {
        details.classList.toggle('active');
    }
}

function showNoProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = `
        <div class="no-products">
            <i class="fas fa-box-open"></i>
            <h3>No Products Found</h3>
            <p>No accessories available in this category yet.</p>
        </div>
    `;
}

// ====================
// CART FUNCTIONS
// ====================
async function addToCart(productId) {
    try {
        if (!supabase) {
            showNotification('Database not connected', 'error');
            return;
        }
        
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
        
        // Get or create cart in localStorage
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
        el.style.display = totalItems > 0 ? 'flex' : 'none';
    });
}

// ====================
// WISHLIST FUNCTIONS
// ====================
function toggleWishlist(productId) {
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const index = wishlist.indexOf(productId);
    const button = document.getElementById(`wishlist-${productId}`);
    
    if (index === -1) {
        wishlist.push(productId);
        if (button) {
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-heart"></i> In Wishlist';
        }
        showNotification('Added to wishlist', 'success');
    } else {
        wishlist.splice(index, 1);
        if (button) {
            button.classList.remove('active');
            button.innerHTML = '<i class="fas fa-heart"></i> Wishlist';
        }
        showNotification('Removed from wishlist', 'info');
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    // Update wishlist count
    document.getElementById('wishlistCount').textContent = wishlist.length;
}

// ====================
// PAGE INITIALIZATION
// ====================
function detectCurrentCategory() {
    // Check if set in HTML
    if (window.currentCategory) return window.currentCategory;
    
    // Detect from URL
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
    
    return pageToCategory[page] || 'accessories';
}

async function initializePage() {
    console.log('🚀 Initializing page...');
    
    // Load wishlist count
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    document.getElementById('wishlistCount').textContent = wishlist.length;
    
    // Update cart UI
    updateCartUI();
    
    // Load products if on category page
    const currentCategory = detectCurrentCategory();
    console.log(`Current category detected: ${currentCategory}`);
    
    if (document.getElementById('productsGrid')) {
        await loadProductsByCategory(currentCategory);
    }
    
    console.log('✅ Page initialized');
}

// ====================
// CART PANEL FUNCTIONS
// ====================
function loadCartPanel() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems || !cartTotal) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        cartTotal.textContent = '₦0';
        return;
    }
    
    let total = 0;
    let html = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₦${item.price.toLocaleString()} × ${item.quantity}</p>
                </div>
                <div class="cart-item-total">
                    <span>₦${itemTotal.toLocaleString()}</span>
                    <button onclick="removeFromCart(${item.product_id})" class="remove-item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
    cartTotal.textContent = `₦${total.toLocaleString()}`;
}

function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.product_id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    updateCartUI();
    loadCartPanel();
    showNotification('Item removed from cart', 'info');
}

// ====================
// GLOBAL EXPORTS
// ====================
window.toggleProductDetails = toggleProductDetails;
window.addToCart = addToCart;
window.toggleWishlist = toggleWishlist;
window.removeFromCart = removeFromCart;

// ====================
// START APPLICATION
// ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

console.log('✅ app.js loaded with correct image paths');
