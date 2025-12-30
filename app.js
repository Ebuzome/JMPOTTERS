// app.js - Include this in ALL your HTML files (bags.html, footwear.html, etc.)
// Place this file in your js/ folder and include it in all HTML files

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4'; // Replace with your anon key

// Initialize Supabase client (available globally)
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make it globally available
window.supabase = supabaseClient;

// ============================================
// ADMIN CHECK FUNCTION
// ============================================
async function isAdmin() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
    
    return profile?.is_admin || false;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

async function signOutUser() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ============================================
// PRODUCT MANAGEMENT FUNCTIONS
// ============================================

// 1. Load products for a specific category page
async function loadCategoryProducts(category) {
    try {
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('category', category.toLowerCase())
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return products || [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// 2. Upload products from your existing data to Supabase
async function uploadProductsToSupabase() {
    const admin = await isAdmin();
    if (!admin) {
        console.error('Admin access required');
        return { success: false, error: 'Admin access required' };
    }

    // Your existing product data from mensfootwear.html
    const products = [
        { id: 1, name: "Adidas Black and Red Stripped", price: 27000, image: "Adidas-Black-and-Red-Stripped-27000.jpg" },
        // ... Add all your other products here
        // Copy the entire 'products' array from your mensfootwear.html file
    ];

    const results = [];
    
    for (const product of products) {
        try {
            // Construct image URLs (adjust path based on your structure)
            const imageUrls = [`assets/images/menfootwear/${product.image}`];
            
            // Insert product into Supabase
            const { data, error } = await supabaseClient
                .from('products')
                .insert([{
                    name: product.name,
                    price: product.price,
                    image_urls: imageUrls,
                    category: 'footwear', // Adjust category based on page
                    stock_quantity: 100, // Default stock
                    description: `Premium ${product.name} crafted with attention to detail.`
                }])
                .select();
            
            if (error) throw error;
            
            results.push({ success: true, product: data[0] });
        } catch (error) {
            results.push({ success: false, error: error.message, product });
        }
    }
    
    return results;
}

// 3. Display products in your existing grid
function displayProductsInGrid(products, containerId = 'productsGrid') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }
    
    // Clear existing content (if any)
    container.innerHTML = '';
    
    // Generate HTML for each product
    products.forEach(product => {
        // Generate fake price for display (₦5,000–₦10,000 higher than real price)
        const fakePrice = product.price + Math.floor(Math.random() * 5000) + 5000;
        const discount = Math.floor(Math.random() * 25) + 10; // 10-35% discount
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-aos', 'fade-up');
        productCard.innerHTML = `
            <div class="product-image">
                <div class="product-badge">-${discount}%</div>
                <img src="${product.image_urls[0] || 'assets/images/no-image.jpg'}" alt="${product.name}" loading="lazy">
                <button class="wishlist-btn" data-id="${product.id}">
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
                    <i class="fas fa-check-circle"></i> ${product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </div>
                <div class="sizes">
                    Sizes Available: <span>36 - 45</span>
                </div>
                
                <!-- Quantity selector -->
                <div class="quantity-selector">
                    <button class="toggle-bulk-options">
                        Bulk Options <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="quantity-options">
                        <div class="quantity-option selected" data-qty="1">1 Unit</div>
                        <div class="quantity-option" data-qty="10">10 Units</div>
                        <div class="quantity-option" data-qty="25">25 Units</div>
                        <div class="quantity-option" data-qty="50">50 Units</div>
                        <div class="quantity-option" data-qty="100">100 Units</div>
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
        container.appendChild(productCard);
    });
    
    // Setup event listeners for the new products
    setupProductInteractions();
}

// ============================================
// CART MANAGEMENT (Updated for Supabase)
// ============================================

// 1. Get or create cart
async function getCart() {
    const user = await checkAuth();
    
    if (user) {
        // User is logged in - get cart from database
        const { data: cartItems, error } = await supabaseClient
            .from('cart_items')
            .select(`
                id,
                quantity,
                products:product_id (*)
            `)
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Error fetching cart:', error);
            return [];
        }
        
        return (cartItems || []).map(item => ({
            id: item.id,
            product_id: item.products.id,
            name: item.products.name,
            price: item.products.price,
            image: item.products.image_urls?.[0],
            quantity: item.quantity
        }));
    } else {
        // User not logged in - get cart from localStorage
        const cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        return cart;
    }
}

// 2. Add item to cart
async function addToCart(productId, quantity = 1) {
    const user = await checkAuth();
    
    if (!user) {
        // Guest user - store in localStorage
        let cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        
        const existingItem = cart.find(item => item.product_id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // Fetch product details
            const { data: product } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (product) {
                cart.push({
                    product_id: productId,
                    name: product.name,
                    price: product.price,
                    image: product.image_urls?.[0],
                    quantity: quantity
                });
            }
        }
        
        localStorage.setItem('guest_cart', JSON.stringify(cart));
        updateCartCount();
        showNotification('Added to cart!', 'success');
        return true;
    }
    
    // Logged in user - save to database
    const { error } = await supabaseClient
        .from('cart_items')
        .upsert({
            user_id: user.id,
            product_id: productId,
            quantity: quantity
        }, {
            onConflict: 'user_id, product_id'
        });
    
    if (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add to cart', 'error');
        return false;
    }
    
    updateCartCount();
    showNotification('Added to cart!', 'success');
    return true;
}

// 3. Update cart count in header
async function updateCartCount() {
    const count = await getCartCount();
    
    // Update cart count elements in your header
    const cartCountElements = document.querySelectorAll('#cartCount');
    cartCountElements.forEach(element => {
        element.textContent = count;
        element.style.display = count > 0 ? 'inline-block' : 'none';
    });
}

// 4. Get cart total items count
async function getCartCount() {
    const user = await checkAuth();
    
    if (user) {
        const { count, error } = await supabaseClient
            .from('cart_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        
        return count || 0;
    } else {
        const cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        return cart.length;
    }
}

// 5. Get cart total price
async function getCartTotal() {
    const cartItems = await getCart();
    let total = 0;
    
    cartItems.forEach(item => {
        total += item.quantity * item.price;
    });
    
    return total.toFixed(2);
}

// 6. Render cart items in cart panel
async function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;
    
    const cartItems = await getCart();
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        return;
    }
    
    cartItemsContainer.innerHTML = '';
    
    cartItems.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'assets/images/no-image.jpg'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₦${item.price.toLocaleString()}</div>
                <div class="cart-item-quantity">
                    <button class="decrease-quantity" data-id="${item.product_id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="increase-quantity" data-id="${item.product_id}">+</button>
                </div>
            </div>
            <button class="cart-item-remove" data-id="${item.product_id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        cartItemsContainer.appendChild(cartItem);
    });
    
    // Update cart total
    const total = await getCartTotal();
    const cartTotalElement = document.getElementById('cartTotal');
    if (cartTotalElement) {
        cartTotalElement.textContent = `₦${parseFloat(total).toLocaleString()}`;
    }
    
    // Setup event listeners
    setupCartItemListeners();
}

// ============================================
// ORDER MANAGEMENT
// ============================================

// Create order from cart
async function createOrder(shippingAddress, notes = '') {
    const user = await checkAuth();
    if (!user) {
        showNotification('Please login to place an order', 'error');
        window.location.href = 'login.html';
        return null;
    }
    
    try {
        // Call the PostgreSQL function to create order
        const { data, error } = await supabaseClient.rpc('create_order_simple', {
            p_user_id: user.id,
            p_shipping_address: shippingAddress,
            p_notes: notes
        });
        
        if (error) throw error;
        
        // Clear cart after successful order
        if (user) {
            await supabaseClient
                .from('cart_items')
                .delete()
                .eq('user_id', user.id);
        } else {
            localStorage.removeItem('guest_cart');
        }
        
        updateCartCount();
        showNotification('Order placed successfully!');
        
        return data;
    } catch (error) {
        console.error('Error creating order:', error);
        showNotification('Failed to place order: ' + error.message, 'error');
        return null;
    }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

// Show notification
function showNotification(message, type = 'success') {
    // Check if toast container exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
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
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide and remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 5000);
}

// Update auth UI
function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// ============================================
// PAGE-SPECIFIC INITIALIZATION
// ============================================

async function initializePage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    console.log('Initializing page:', page);
    
    // Always update cart count
    await updateCartCount();
    
    // Check authentication status
    const user = await checkAuth();
    updateAuthUI(user);
    
    // Page-specific initialization
    if (page === 'mensfootwear.html') {
        await initializeMensFootwearPage();
    } else if (page === 'womensfootwear.html') {
        await initializeWomensFootwearPage();
    } else if (page === 'bags.html') {
        await initializeBagsPage();
    } else if (page === 'index.html') {
        await initializeHomePage();
    }
    // Add more pages as needed
    
    // Setup cart panel listeners
    setupCartPanel();
    
    // Setup wishlist listeners
    setupWishlist();
}

// Initialize mens footwear page
async function initializeMensFootwearPage() {
    console.log('Loading men\'s footwear...');
    
    // Load products from Supabase
    const products = await loadCategoryProducts('footwear');
    
    // Display products in your existing grid
    displayProductsInGrid(products, 'productsGrid');
    
    // Update your existing cart functionality to use Supabase
    replaceCartFunctionality();
}

// Initialize other category pages similarly
async function initializeWomensFootwearPage() {
    const products = await loadCategoryProducts('footwear');
    // Filter for women's if needed, or create separate category
    displayProductsInGrid(products, 'productsGrid');
    replaceCartFunctionality();
}

async function initializeBagsPage() {
    const products = await loadCategoryProducts('bags');
    displayProductsInGrid(products, 'productsGrid');
    replaceCartFunctionality();
}

async function initializeHomePage() {
    // Load featured products
    const { data: featuredProducts } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true)
        .limit(8)
        .order('created_at', { ascending: false });
    
    if (featuredProducts) {
        displayProductsInGrid(featuredProducts, 'featured-products');
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================

function setupProductInteractions() {
    // Add to Cart buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            const card = this.closest('.product-card');
            const selectedQty = card.querySelector('.quantity-option.selected');
            const quantity = selectedQty ? parseInt(selectedQty.getAttribute('data-qty')) : 1;
            
            await addToCart(productId, quantity);
        });
    });
    
    // View Details buttons
    document.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            const { data: product } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (product) {
                // Use your existing modal function or create a new one
                openProductModal(product);
            }
        });
    });
    
    // Quantity options
    document.querySelectorAll('.toggle-bulk-options').forEach(btn => {
        btn.addEventListener('click', function() {
            const options = this.nextElementSibling;
            options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
        });
    });
    
    document.querySelectorAll('.quantity-option').forEach(option => {
        option.addEventListener('click', function() {
            const container = this.closest('.quantity-options');
            container.querySelectorAll('.quantity-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
}

function setupCartItemListeners() {
    // Decrease quantity
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            await updateCartItemQuantity(productId, -1);
        });
    });
    
    // Increase quantity
    document.querySelectorAll('.increase-quantity').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            await updateCartItemQuantity(productId, 1);
        });
    });
    
    // Remove item
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            await removeFromCart(productId);
        });
    });
}

async function updateCartItemQuantity(productId, change) {
    const user = await checkAuth();
    
    if (!user) {
        // Guest user
        let cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        const item = cart.find(item => item.product_id === productId);
        
        if (item) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) {
                cart = cart.filter(item => item.product_id !== productId);
            } else {
                item.quantity = newQuantity;
            }
            localStorage.setItem('guest_cart', JSON.stringify(cart));
            updateCartCount();
            renderCartItems();
        }
        return;
    }
    
    // Logged in user
    const { data: cartItem } = await supabaseClient
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();
    
    if (cartItem) {
        const newQuantity = cartItem.quantity + change;
        if (newQuantity <= 0) {
            await supabaseClient
                .from('cart_items')
                .delete()
                .eq('id', cartItem.id);
        } else {
            await supabaseClient
                .from('cart_items')
                .update({ quantity: newQuantity })
                .eq('id', cartItem.id);
        }
        
        updateCartCount();
        renderCartItems();
    }
}

async function removeFromCart(productId) {
    const user = await checkAuth();
    
    if (!user) {
        // Guest user
        let cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        cart = cart.filter(item => item.product_id !== productId);
        localStorage.setItem('guest_cart', JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
        return;
    }
    
    // Logged in user
    await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    
    updateCartCount();
    renderCartItems();
}

function setupCartPanel() {
    const cartIcon = document.getElementById('cartIcon');
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.querySelector('.close-cart');
    
    if (cartIcon && cartPanel) {
        cartIcon.addEventListener('click', async () => {
            await renderCartItems();
            cartPanel.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartPanel.classList.remove('active');
            cartOverlay.classList.remove('active');
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

function setupWishlist() {
    // Your existing wishlist functionality
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            await toggleWishlist(productId);
        });
    });
}

async function toggleWishlist(productId) {
    const user = await checkAuth();
    
    if (!user) {
        showNotification('Please login to use wishlist', 'warning');
        return;
    }
    
    // Check if product is already in wishlist
    const { data: existing } = await supabaseClient
        .from('wishlist') // You'll need to create this table
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();
    
    if (existing) {
        // Remove from wishlist
        await supabaseClient
            .from('wishlist')
            .delete()
            .eq('id', existing.id);
        
        showNotification('Removed from wishlist', 'info');
    } else {
        // Add to wishlist
        await supabaseClient
            .from('wishlist')
            .insert({
                user_id: user.id,
                product_id: productId
            });
        
        showNotification('Added to wishlist!', 'success');
    }
    
    updateWishlistCount();
}

async function updateWishlistCount() {
    const user = await checkAuth();
    if (!user) return;
    
    const { count } = await supabaseClient
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
    
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
        wishlistCount.textContent = count || 0;
        wishlistCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// ============================================
// REPLACE EXISTING CART FUNCTIONALITY
// ============================================

function replaceCartFunctionality() {
    // Replace your existing cart functions with Supabase versions
    window.addToCart = async function(product, quantity = 1) {
        await addToCart(product.id, quantity);
    };
    
    window.updateCartQuantity = async function(cartItemId, newQuantity) {
        await updateCartItemQuantity(cartItemId, newQuantity);
    };
    
    window.removeFromCart = async function(cartItemId) {
        await removeFromCart(cartItemId);
    };
    
    // Update your existing modal add to cart
    const modalAddCart = document.getElementById('modalAddCart');
    if (modalAddCart) {
        modalAddCart.addEventListener('click', async () => {
            if (!window.currentProduct) return;
            
            // Get selected quantity from modal
            const selectedQty = document.querySelector('.quantity-option-modal.selected');
            const quantity = selectedQty ? parseInt(selectedQty.dataset.quantity) : 1;
            
            await addToCart(window.currentProduct.id, quantity);
            showNotification(`${window.currentProduct.name} added to cart!`, 'success');
        });
    }
}

// ============================================
// ADMIN FUNCTIONS (For Admin Pages)
// ============================================

// Function to upload all your existing products to Supabase
async function uploadAllProducts() {
    const admin = await isAdmin();
    if (!admin) {
        alert('Admin access required');
        return;
    }
    
    if (confirm('This will upload all your products to Supabase. Continue?')) {
        const results = await uploadProductsToSupabase();
        console.log('Upload results:', results);
        alert(`Uploaded ${results.filter(r => r.success).length} products successfully!`);
    }
}

// ============================================
// INITIALIZE WHEN PAGE LOADS
// ============================================

// Make functions globally available
window.checkAuth = checkAuth;
window.signOut = signOutUser;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.getCart = getCart;
window.getCartTotal = getCartTotal;
window.loadCategoryProducts = loadCategoryProducts;
window.displayProductsInGrid = displayProductsInGrid;
window.showNotification = showNotification;
window.uploadAllProducts = uploadAllProducts; // For admin use

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializePage);

// Handle logout button
document.addEventListener('click', function(e) {
    if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
        e.preventDefault();
        signOutUser();
    }
});

console.log('Supabase integration loaded successfully!');
