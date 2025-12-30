// app.js - COMPLETE WORKING VERSION
console.log('🎯 JMPOTTERS Supabase Integration');

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzIUI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMDE4ODUsImV4cCI6MjA1MDU3Nzg4NX0.9O44TzEV47M1qV0RlBfd7Tus0mpWxP35GR10l6MjwXo';

// Initialize Supabase
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

console.log('✅ Supabase initialized');

// ============================================
// GLOBAL STATE
// ============================================
let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];

// ============================================
// PRODUCT FUNCTIONS
// ============================================
async function loadProducts() {
    console.log('🔄 Loading products from database...');
    
    try {
        // Determine category from current page
        const category = getCurrentCategory();
        
        let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true);
        
        // Filter by category if not homepage
        if (category && category !== 'home') {
            query = query.eq('category', category);
        }
        
        const { data: products, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database error:', error);
            showError('Cannot load products. Please try again later.');
            return [];
        }
        
        console.log(`✅ Loaded ${products?.length || 0} products`);
        return products || [];
        
    } catch (error) {
        console.error('❌ Error:', error);
        return [];
    }
}

function getCurrentCategory() {
    const page = window.location.pathname.split('/').pop();
    
    if (page.includes('mensfootwear') || page.includes('womensfootwear')) return 'footwear';
    if (page.includes('bags')) return 'bags';
    if (page.includes('accessories')) return 'accessories';
    if (page.includes('household')) return 'household';
    if (page.includes('kids')) return 'kids';
    if (page.includes('healthcare')) return 'healthcare';
    
    return 'home'; // Homepage
}

function displayProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!container) {
        console.log('ℹ️ productsGrid not found on this page');
        return;
    }
    
    console.log(`🖼️ Displaying ${products.length} products`);
    
    // Clear container
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; grid-column: 1/-1;">
                <h3>No products available</h3>
                <p>New arrivals coming soon!</p>
            </div>
        `;
        return;
    }
    
    // Display each product
    products.forEach((product, index) => {
        // Generate display values
        const fakePrice = Math.round(product.price * 1.3);
        const discount = Math.floor((fakePrice - product.price) / fakePrice * 100);
        
        // Use first image or placeholder
        const imageUrl = product.image_urls && product.image_urls.length > 0 
            ? product.image_urls[0] 
            : 'https://placehold.co/400x300/cccccc/ffffff/png?text=No+Image';
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-aos', 'fade-up');
        productCard.setAttribute('data-aos-delay', (index % 10) * 100);
        
        productCard.innerHTML = `
            <div class="product-image">
                <div class="product-badge">-${discount}%</div>
                <img src="${imageUrl}" alt="${product.name}" loading="lazy"
                     onerror="this.onerror=null; this.src='https://placehold.co/400x300/cccccc/ffffff/png?text=Image+Error'">
                <button class="wishlist-btn" onclick="toggleWishlist('${product.id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">
                    <del class="price-fake">₦${fakePrice.toLocaleString()}</del>
                    <span class="price-real">₦${product.price.toLocaleString()}</span>
                </div>
                <div class="availability">
                    <i class="fas fa-check-circle"></i> 
                    ${product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                </div>
                <div class="sizes">
                    Sizes Available: <span>36 - 45</span>
                </div>
                
                <div class="quantity-selector">
                    <button class="toggle-bulk-options" onclick="toggleBulkOptions(this)">
                        Bulk Options <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="quantity-options" style="display: none;">
                        <div class="quantity-option selected" onclick="selectQuantity(this, 1)">1 Unit</div>
                        <div class="quantity-option" onclick="selectQuantity(this, 10)">10 Units</div>
                        <div class="quantity-option" onclick="selectQuantity(this, 25)">25 Units</div>
                        <div class="quantity-option" onclick="selectQuantity(this, 50)">50 Units</div>
                        <div class="quantity-option" onclick="selectQuantity(this, 100)">100 Units</div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn-add-cart" onclick="addToCart('${product.id}', 1, '${product.name}', ${product.price})">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="btn-view-details" onclick="viewProductDetails('${product.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(productCard);
    });
    
    console.log('✅ Products displayed successfully');
}

// ============================================
// CART FUNCTIONS
// ============================================
function addToCart(productId, quantity = 1, productName = '', productPrice = 0) {
    // Find if product already in cart
    const existingIndex = cart.findIndex(item => item.id === productId);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: quantity,
            addedAt: new Date().toISOString()
        });
    }
    
    // Save to localStorage
    localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
    
    // Update UI
    updateCartCount();
    
    // Show notification
    showNotification(`✅ ${productName || 'Item'} added to cart!`, 'success');
    
    // Animate cart icon
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        cartIcon.style.transform = 'scale(1.2)';
        setTimeout(() => cartIcon.style.transform = 'scale(1)', 300);
    }
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update all cart count elements
    document.querySelectorAll('#cartCount').forEach(element => {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
    
    // Update cart total if cart panel is open
    updateCartTotal();
}

function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (cartTotalElement) {
        cartTotalElement.textContent = `₦${total.toLocaleString()}`;
    }
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        return;
    }
    
    container.innerHTML = '';
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₦${item.price.toLocaleString()}</div>
                <div class="cart-item-quantity">
                    <button onclick="updateCartItemQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(cartItem);
    });
    
    updateCartTotal();
}

function updateCartItemQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
        const newQuantity = cart[itemIndex].quantity + change;
        
        if (newQuantity <= 0) {
            cart.splice(itemIndex, 1);
        } else {
            cart[itemIndex].quantity = newQuantity;
        }
        
        localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    showNotification('Item removed from cart', 'info');
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================
function showNotification(message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
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
        <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

function showError(message) {
    const container = document.getElementById('productsGrid');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                <h3 style="color: #e74c3c;">⚠️ Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #000; color: #fff; border: none; margin-top: 20px;">
                    ↻ Retry
                </button>
            </div>
        `;
    }
}

// ============================================
// INTERACTION FUNCTIONS
// ============================================
function toggleBulkOptions(button) {
    const options = button.nextElementSibling;
    options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
}

function selectQuantity(element, quantity) {
    // Remove selected class from all options in this container
    const container = element.closest('.quantity-options');
    container.querySelectorAll('.quantity-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    element.classList.add('selected');
    
    // Store selected quantity in data attribute
    element.closest('.product-card').dataset.selectedQuantity = quantity;
}

async function viewProductDetails(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        // Use your existing modal or show simple details
        alert(`
            🛍️ ${product.name}
            💰 Price: ₦${product.price.toLocaleString()}
            📦 Stock: ${product.stock_quantity} units
            📝 ${product.description || 'No description available.'}
        `);
        
    } catch (error) {
        console.error('Error loading product details:', error);
        showNotification('Cannot load product details', 'error');
    }
}

function toggleWishlist(productId) {
    let wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
    
    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
        showNotification('Removed from wishlist', 'info');
    } else {
        wishlist.push(productId);
        showNotification('Added to wishlist!', 'success');
    }
    
    localStorage.setItem('jmpotters_wishlist', JSON.stringify(wishlist));
    
    // Update wishlist icon
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
        wishlistCount.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
    }
}

// ============================================
// CART PANEL FUNCTIONS (Connect to your existing UI)
// ============================================
function setupCartPanel() {
    const cartIcon = document.getElementById('cartIcon');
    const cartPanel = document.getElementById('cartPanel');
    const closeCart = document.querySelector('.close-cart');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartIcon && cartPanel) {
        cartIcon.addEventListener('click', () => {
            renderCartItems();
            cartPanel.classList.add('active');
            if (cartOverlay) cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartPanel.classList.remove('active');
            if (cartOverlay) cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => {
            cartPanel.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================
async function initializePage() {
    console.log('🏠 Initializing page...');
    
    // Initialize cart count
    updateCartCount();
    
    // Initialize wishlist count
    const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
        wishlistCount.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
    }
    
    // Setup cart panel
    setupCartPanel();
    
    // Load and display products
    const products = await loadProducts();
    displayProducts(products);
    
    console.log('✅ Page initialized successfully');
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
async function uploadAllProducts() {
    if (!confirm('Upload all 82 products to Supabase?')) return;
    
    // Your product data
    const products = [
        { id: 1, name: "Adidas Black and Red Stripped", price: 27000, image: "Adidas-Black-and-Red-Stripped-27000.jpg" },
        // ... ALL 82 products here
        { id: 82, name: "Vangelo NND", price: 18000, image: "Vangelo-NND-18000.jpg" }
    ];
    
    console.log(`📤 Uploading ${products.length} products...`);
    
    const results = [];
    for (const product of products) {
        try {
            const imageUrl = `https://ebuzome.github.io/JMPOTTERS/assets/images/mensfootwear/${product.image}`;
            
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: product.name,
                    price: product.price,
                    image_urls: [imageUrl],
                    category: 'footwear',
                    stock_quantity: Math.floor(Math.random() * 100) + 20,
                    description: `Premium ${product.name} - High quality footwear from JMPOTTERS collection.`
                }])
                .select();
            
            if (error) throw error;
            
            results.push({ success: true, product: data[0] });
            console.log(`✅ ${product.name}`);
            
        } catch (error) {
            results.push({ success: false, error: error.message, product });
            console.error(`❌ ${product.name}: ${error.message}`);
        }
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`🎉 Upload complete: ${successCount}/${products.length} successful`);
    alert(`Uploaded ${successCount} products! Refresh to see them.`);
}

// ============================================
// START EVERYTHING
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready');
    
    // Small delay to ensure everything loads
    setTimeout(() => {
        initializePage();
    }, 300);
});

// ============================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================
window.supabaseClient = supabase;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.renderCartItems = renderCartItems;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.showNotification = showNotification;
window.toggleBulkOptions = toggleBulkOptions;
window.selectQuantity = selectQuantity;
window.viewProductDetails = viewProductDetails;
window.toggleWishlist = toggleWishlist;
window.uploadAllProducts = uploadAllProducts;

console.log('🚀 JMPOTTERS app.js ready!');
