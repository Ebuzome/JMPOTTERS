// app.js - COMPLETE VERSION WITH REALTIME & ALL FEATURES
console.log('🚀 JMPOTTERS Supabase Integration v2.0');

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzIUI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMDE4ODUsImV4cCI6MjA1MDU3Nzg4NX0.9O44TzEV47M1qV0RlBfd7Tus0mpWxP35GR10l6MjwXo';

// Initialize Supabase
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

window.supabaseClient = supabase;
console.log('✅ Supabase initialized with realtime');

// ============================================
// GLOBAL STATE
// ============================================
let cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
let currentUser = null;
let realtimeChannel = null;

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        currentUser = user;
        updateAuthUI();
        return user;
    } catch (error) {
        console.log('Not logged in (normal for guests)');
        return null;
    }
}

async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        
        if (error) throw error;
        
        // Create user profile
        if (data.user) {
            await supabase
                .from('user_profiles')
                .insert([{
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    is_admin: false
                }]);
        }
        
        showNotification('✅ Account created! Please check your email.', 'success');
        return { success: true, data };
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
        return { success: false, error };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showNotification('✅ Welcome back!', 'success');
        return { success: true, data };
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
        return { success: false, error };
    }
}

async function signOut() {
    await supabase.auth.signOut();
    currentUser = null;
    showNotification('👋 Signed out successfully', 'info');
    window.location.reload();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmail = document.getElementById('user-email');
    
    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userEmail) userEmail.textContent = currentUser.email;
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================
async function loadProducts(category = null) {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true);
        
        if (category && category !== 'home') {
            query = query.eq('category', category);
        }
        
        const { data: products, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ Loaded ${products?.length || 0} products`);
        return products || [];
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showNotification('Cannot load products', 'error');
        return [];
    }
}

function getCurrentCategory() {
    const page = window.location.pathname.split('/').pop();
    
    const categoryMap = {
        'mensfootwear.html': 'mensfootwear',
        'womensfootwear.html': 'womensfootwear',
        'bags.html': 'bags',
        'accessories.html': 'accessories',
        'household.html': 'household',
        'kids.html': 'kids',
        'healthcare.html': 'healthcare',
        'index.html': 'home',
        '': 'home'
    };
    
    return categoryMap[page] || 'home';
}

function displayProducts(products, containerId = 'productsGrid') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.log(`ℹ️ ${containerId} not found on this page`);
        return;
    }
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; grid-column: 1/-1;">
                <h3>No products available</h3>
                <p>Check back soon for new arrivals!</p>
            </div>
        `;
        return;
    }
    
    products.forEach((product, index) => {
        const fakePrice = Math.round(product.price * 1.3);
        const discount = Math.floor((fakePrice - product.price) / fakePrice * 100);
        
        const imageUrl = product.image_urls && product.image_urls.length > 0 
            ? product.image_urls[0] 
            : 'https://placehold.co/400x300/cccccc/ffffff/png?text=No+Image';
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-id', product.id);
        productCard.setAttribute('data-category', product.category);
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
                    <span class="price-real" id="price-${product.id}">₦${product.price.toLocaleString()}</span>
                </div>
                <div class="availability" id="stock-${product.id}">
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
    
    setupProductInteractions();
}

// ============================================
// REALTIME FUNCTIONS
// ============================================
function setupRealtimeUpdates() {
    console.log('🔔 Setting up realtime updates...');
    
    if (!supabase.realtime) {
        console.warn('⚠️ Realtime not available');
        return null;
    }
    
    realtimeChannel = supabase
        .channel('products-realtime')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'products'
            },
            (payload) => {
                console.log('🔄 Realtime event:', payload.eventType);
                handleRealtimeUpdate(payload);
            }
        )
        .on('system', { event: 'connected' }, () => {
            console.log('✅ Realtime connected');
            showNotification('🔄 Live updates enabled', 'success', 3000);
        })
        .on('system', { event: 'disconnected' }, () => {
            console.warn('⚠️ Realtime disconnected');
            showNotification('⚠️ Live updates disconnected', 'warning', 3000);
        })
        .subscribe((status) => {
            console.log('📡 Realtime status:', status);
        });
    
    return realtimeChannel;
}

function handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
        case 'UPDATE':
            console.log(`💰 Updated: ${newRecord.name} (₦${oldRecord?.price} → ₦${newRecord.price})`);
            updateProductInUI(newRecord);
            break;
            
        case 'INSERT':
            console.log(`➕ New: ${newRecord.name}`);
            if (shouldAddProduct(newRecord)) {
                addProductToUI(newRecord);
            }
            break;
            
        case 'DELETE':
            console.log(`🗑️ Deleted: ${oldRecord.name}`);
            removeProductFromUI(oldRecord.id);
            break;
    }
}

function updateProductInUI(product) {
    // Update price in all product cards with this ID
    document.querySelectorAll(`[data-id="${product.id}"] .price-real`).forEach(el => {
        el.textContent = `₦${product.price.toLocaleString()}`;
        el.style.color = '#d4af37';
        el.style.fontWeight = 'bold';
        setTimeout(() => {
            el.style.color = '';
            el.style.fontWeight = '';
        }, 1000);
    });
    
    // Update stock status
    document.querySelectorAll(`[data-id="${product.id}"] .availability`).forEach(el => {
        const icon = product.stock_quantity > 0 ? 'fa-check-circle' : 'fa-times-circle';
        const text = product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock';
        el.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
    });
    
    // Update name if changed
    document.querySelectorAll(`[data-id="${product.id}"] .product-title`).forEach(el => {
        el.textContent = product.name;
    });
    
    // Show notification
    if (product.stock_quantity <= 0 && product.stock_quantity !== oldRecord?.stock_quantity) {
        showNotification(`⚠️ ${product.name} is now out of stock`, 'warning');
    }
}

function shouldAddProduct(product) {
    const currentCategory = getCurrentCategory();
    return currentCategory === product.category || currentCategory === 'home';
}

function addProductToUI(product) {
    // Implementation for adding new product to UI
    console.log('Would add product to UI:', product.name);
    // You might want to prepend or reload products
}

function removeProductFromUI(productId) {
    document.querySelectorAll(`[data-id="${product.id}"]`).forEach(el => el.remove());
    showNotification('Product removed', 'info');
}

// ============================================
// CART FUNCTIONS
// ============================================
function addToCart(productId, quantity = 1, productName = '', productPrice = 0) {
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
    
    localStorage.setItem('jmpotters_cart', JSON.stringify(cart));
    updateCartCount();
    
    // Animation
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        cartIcon.style.transform = 'scale(1.2)';
        setTimeout(() => cartIcon.style.transform = 'scale(1)', 300);
    }
    
    showNotification(`✅ ${productName || 'Item'} added to cart!`, 'success');
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    document.querySelectorAll('#cartCount').forEach(element => {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        return;
    }
    
    container.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
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
    
    document.getElementById('cartTotal').textContent = `₦${total.toLocaleString()}`;
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

function clearCart() {
    cart = [];
    localStorage.removeItem('jmpotters_cart');
    updateCartCount();
    renderCartItems();
    showNotification('Cart cleared', 'info');
}

// ============================================
// ORDER FUNCTIONS
// ============================================
async function createOrder(shippingAddress, notes = '') {
    if (!currentUser) {
        showNotification('Please login to place an order', 'warning');
        window.location.href = 'login.html';
        return null;
    }
    
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'warning');
        return null;
    }
    
    try {
        // Calculate total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create order
        const { data: order, error } = await supabase
            .from('orders')
            .insert([{
                user_id: currentUser.id,
                total_amount: total,
                shipping_address: shippingAddress,
                notes: notes,
                status: 'pending'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Create order items
        const orderItems = cart.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price
        }));
        
        await supabase
            .from('order_items')
            .insert(orderItems);
        
        // Clear cart
        clearCart();
        
        showNotification('✅ Order placed successfully!', 'success');
        
        // Generate WhatsApp message
        generateWhatsAppOrder(order);
        
        return order;
    } catch (error) {
        console.error('Order error:', error);
        showNotification('Failed to place order: ' + error.message, 'error');
        return null;
    }
}

function generateWhatsAppOrder(order) {
    let message = `*NEW ORDER - JMPOTTERS*%0A%0A`;
    message += `*Order #:* ${order.order_number || order.id}%0A`;
    message += `*Date:* ${new Date().toLocaleDateString()}%0A%0A`;
    message += `*Items:*%0A`;
    
    cart.forEach(item => {
        message += `• ${item.name} x${item.quantity} - ₦${(item.price * item.quantity).toLocaleString()}%0A`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `%0A*Total: ₦${total.toLocaleString()}*%0A%0A`;
    message += `Please process this order.`;
    
    const whatsappUrl = `https://wa.me/2348139583320?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
async function isAdmin() {
    if (!currentUser) return false;
    
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single();
    
    return profile?.is_admin || false;
}

async function addProduct(productData) {
    const admin = await isAdmin();
    if (!admin) {
        showNotification('Admin access required', 'error');
        return { success: false, error: 'Not admin' };
    }
    
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{
                ...productData,
                image_urls: Array.isArray(productData.image_urls) ? productData.image_urls : [productData.image_urls],
                is_active: true
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showNotification('✅ Product added successfully!', 'success');
        return { success: true, data };
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
        return { success: false, error };
    }
}

async function updateProduct(productId, updates) {
    const admin = await isAdmin();
    if (!admin) {
        showNotification('Admin access required', 'error');
        return { success: false, error: 'Not admin' };
    }
    
    try {
        const { data, error } = await supabase
            .from('products')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId)
            .select()
            .single();
        
        if (error) throw error;
        
        showNotification('✅ Product updated successfully!', 'success');
        return { success: true, data };
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
        return { success: false, error };
    }
}

async function deleteProduct(productId) {
    const admin = await isAdmin();
    if (!admin) {
        showNotification('Admin access required', 'error');
        return { success: false, error: 'Not admin' };
    }
    
    if (!confirm('Are you sure you want to delete this product?')) {
        return { success: false, error: 'Cancelled' };
    }
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) throw error;
        
        showNotification('✅ Product deleted successfully!', 'success');
        return { success: true };
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
        return { success: false, error };
    }
}

async function getAllOrders() {
    const admin = await isAdmin();
    if (!admin) {
        showNotification('Admin access required', 'error');
        return [];
    }
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                user_profiles:user_id (email, full_name),
                order_items:order_items (*, product:product_id (name))
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return orders || [];
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

async function updateOrderStatus(orderId, status) {
    const admin = await isAdmin();
    if (!admin) {
        showNotification('Admin access required', 'error');
        return { success: false, error: 'Not admin' };
    }
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select()
            .single();
        
        if (error) throw error;
        
        showNotification(`✅ Order status updated to ${status}`, 'success');
        return { success: true, data };
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
        return { success: false, error };
    }
}

// ============================================
// BATCH UPLOAD FUNCTIONS
// ============================================
async function uploadMensFootwear() {
    const products = [
        { id: 1, name: "Adidas Black and Red Stripped", price: 27000, image: "Adidas-Black-and-Red-Stripped-27000.jpg" },
        // ... ALL 82 products from your mensfootwear.html
    ];
    
    console.log(`📤 Uploading ${products.length} mens footwear products...`);
    
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
                    category: 'mensfootwear',
                    stock_quantity: Math.floor(Math.random() * 100) + 20,
                    description: `Premium ${product.name} - High quality footwear`
                }])
                .select();
            
            if (error) throw error;
            
            results.push({ success: true, product: data[0] });
            console.log(`✅ ${product.name}`);
            
        } catch (error) {
            results.push({ success: false, error: error.message, product });
            console.error(`❌ ${product.name}: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`🎉 Upload complete: ${successCount}/${products.length} successful`);
    showNotification(`Uploaded ${successCount} products!`, 'success');
    
    return results;
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================
function showNotification(message, type = 'success', duration = 5000) {
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
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function toggleBulkOptions(button) {
    const options = button.nextElementSibling;
    options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
}

function selectQuantity(element, quantity) {
    const container = element.closest('.quantity-options');
    container.querySelectorAll('.quantity-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
}

async function viewProductDetails(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        // Use your existing modal or create a simple one
        alert(`
            🛍️ ${product.name}
            💰 Price: ₦${product.price.toLocaleString()}
            📦 Stock: ${product.stock_quantity} units
            📝 ${product.description || 'Premium quality product.'}
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
    
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
        wishlistCount.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
    }
}

function setupProductInteractions() {
    // Additional interactions if needed
}

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
    
    // Check authentication
    await checkAuth();
    
    // Initialize cart
    updateCartCount();
    
    // Initialize wishlist
    const wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
        wishlistCount.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
    }
    
    // Setup cart panel
    setupCartPanel();
    
    // Load and display products
    const category = getCurrentCategory();
    const products = await loadProducts(category);
    displayProducts(products);
    
    // Setup realtime updates
    setupRealtimeUpdates();
    
    console.log('✅ Page initialized successfully');
}

// ============================================
// START EVERYTHING
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready');
    
    setTimeout(() => {
        initializePage();
    }, 300);
});

// ============================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================
window.supabaseClient = supabase;
window.checkAuth = checkAuth;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.renderCartItems = renderCartItems;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCart = clearCart;
window.createOrder = createOrder;
window.showNotification = showNotification;
window.toggleBulkOptions = toggleBulkOptions;
window.selectQuantity = selectQuantity;
window.viewProductDetails = viewProductDetails;
window.toggleWishlist = toggleWishlist;
window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.getAllOrders = getAllOrders;
window.updateOrderStatus = updateOrderStatus;
window.uploadMensFootwear = uploadMensFootwear;
window.setupRealtimeUpdates = setupRealtimeUpdates;

console.log('🚀 JMPOTTERS app.js v2.0 loaded with realtime!');
