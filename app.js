// app.js - ENHANCED VERSION WITH CATEGORIES, CART & CHECKOUT
console.log('🎯 Starting Supabase integration...');

// Your credentials
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMDE4ODUsImV4cCI6MjA1MDU3Nzg4NX0.9O44TzEV47M1qV0RlBfd7Tus0mpWxP35GR10l6MjwXo';

// Initialize
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

console.log('✅ Supabase ready');

// ============================================
// 1. PRODUCT FUNCTIONS - BY CATEGORY
// ============================================

async function loadProductsByCategory(categorySlug) {
    console.log(`📦 Loading products for category: ${categorySlug}`);
    
    try {
        // First, get the category ID from slug
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('slug', categorySlug)
            .single();
        
        if (catError) {
            console.error('❌ Category error:', catError);
            showError(catError);
            return;
        }
        
        if (!category) {
            console.error(`❌ Category "${categorySlug}" not found`);
            showError(new Error(`Category not found: ${categorySlug}`));
            return;
        }
        
        // Update page title if needed
        const pageTitle = document.getElementById('page-title');
        if (pageTitle && category.name) {
            pageTitle.textContent = category.name;
        }
        
        // Get products for this category
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Products error:', error);
            showError(error);
            return;
        }
        
        console.log(`✅ Found ${products?.length || 0} products for ${categorySlug}`);
        
        if (!products || products.length === 0) {
            showNoProducts();
            return;
        }
        
        // Show products
        showProducts(products, categorySlug);
        
    } catch (err) {
        console.error('❌ Fatal error:', err);
        showError(err);
    }
}

// Show products in your grid
function showProducts(products, categorySlug) {
    const grid = document.getElementById('productsGrid');
    if (!grid) {
        console.error('❌ #productsGrid not found!');
        return;
    }
    
    // Clear
    grid.innerHTML = '';
    
    // Add each product
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Build image URL based on your structure
        const imageUrl = product.image_url.startsWith('http') 
            ? product.image_url 
            : `https://ebuzome.github.io/JMPOTTERS/assets/images/${categorySlug}/${product.image_url}`;
        
        // Calculate discount (optional)
        const fakePrice = Math.round(product.price * 1.3);
        const discount = Math.floor((fakePrice - product.price) / fakePrice * 100);
        
        card.innerHTML = `
            <div class="product-image">
                <div class="product-badge">-${discount}%</div>
                <img src="${imageUrl}" alt="${product.name}" loading="lazy"
                     onerror="this.src='https://ebuzome.github.io/JMPOTTERS/assets/images/placeholder.jpg'">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
                <div class="product-price">
                    <del class="price-fake">₦${fakePrice.toLocaleString()}</del>
                    <span class="price-real">₦${product.price.toLocaleString()}</span>
                </div>
                <div class="availability ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    <i class="fas fa-${product.stock > 0 ? 'check-circle' : 'times-circle'}"></i>
                    ${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                </div>
                <div class="action-buttons">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})" 
                            ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="btn-view-details" onclick="viewDetails(${product.id})">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    console.log('✅ Products displayed');
}

// ============================================
// 2. CART FUNCTIONS - WITH SUPABASE BACKUP
// ============================================

// Generate session ID for guest
function getSessionId() {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
        sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
}

// Add to cart (local + Supabase backup)
window.addToCart = async function(productId) {
    console.log(`Adding product ${productId} to cart`);
    
    try {
        // Get product details
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        if (product.stock < 1) {
            alert('❌ Product out of stock!');
            return;
        }
        
        // 1. Add to localStorage (immediate)
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItem = cart.find(item => item.product_id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                product_id: productId,
                quantity: 1,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                added_at: new Date().toISOString()
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // 2. Backup to Supabase (guest_carts table)
        const sessionId = getSessionId();
        const { error: supabaseError } = await supabase
            .from('guest_carts')
            .upsert({
                session_id: sessionId,
                product_id: productId,
                quantity: existingItem ? existingItem.quantity + 1 : 1
            }, {
                onConflict: 'session_id,product_id'
            });
        
        if (supabaseError) {
            console.warn('Supabase cart backup failed:', supabaseError);
        }
        
        // Update UI
        updateCartUI();
        
        // Show success
        showNotification('✅ Added to cart!', 'success');
        
    } catch (err) {
        console.error('❌ Cart error:', err);
        showNotification('Failed to add to cart', 'error');
    }
};

// Update cart UI
function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Update cart count
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
    
    // Update cart dropdown if exists
    const cartDropdown = document.getElementById('cartDropdown');
    if (cartDropdown) {
        if (totalItems === 0) {
            cartDropdown.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        } else {
            let cartHTML = `
                <div class="cart-header">
                    <h4>Your Cart (${totalItems} items)</h4>
                    <small>₦${totalPrice.toLocaleString()}</small>
                </div>
                <div class="cart-items">
            `;
            
            cart.forEach(item => {
                cartHTML += `
                    <div class="cart-item">
                        <img src="https://ebuzome.github.io/JMPOTTERS/assets/images/mensfootwear/${item.image_url}" 
                             alt="${item.name}" width="50">
                        <div class="cart-item-info">
                            <strong>${item.name}</strong>
                            <div>₦${item.price.toLocaleString()} × ${item.quantity}</div>
                        </div>
                        <button onclick="removeFromCart(${item.product_id})" class="remove-item">×</button>
                    </div>
                `;
            });
            
            cartHTML += `
                </div>
                <div class="cart-footer">
                    <div class="cart-total">
                        <strong>Total:</strong>
                        <span>₦${totalPrice.toLocaleString()}</span>
                    </div>
                    <a href="checkout.html" class="checkout-btn">Proceed to Checkout</a>
                </div>
            `;
            
            cartDropdown.innerHTML = cartHTML;
        }
    }
}

// Remove from cart
window.removeFromCart = async function(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.product_id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Remove from Supabase too
    const sessionId = getSessionId();
    await supabase
        .from('guest_carts')
        .delete()
        .eq('session_id', sessionId)
        .eq('product_id', productId);
    
    updateCartUI();
    showNotification('Item removed from cart', 'info');
};

// View cart page
window.viewCart = function() {
    window.location.href = 'cart.html';
};

// ============================================
// 3. CHECKOUT FUNCTIONS
// ============================================

window.processCheckout = async function(checkoutForm) {
    event.preventDefault();
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Calculate total
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Get form data
    const formData = {
        customer_name: document.getElementById('name').value,
        customer_email: document.getElementById('email').value,
        customer_phone: document.getElementById('phone').value,
        shipping_address: document.getElementById('address').value,
        notes: document.getElementById('notes').value,
        total_amount: totalAmount
    };
    
    console.log('Processing checkout:', formData);
    
    try {
        // 1. Create order in Supabase
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([formData])
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        console.log('✅ Order created:', order);
        
        // 2. Add order items
        const orderItems = cart.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price
        }));
        
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
        
        if (itemsError) throw itemsError;
        
        // 3. Clear cart
        localStorage.removeItem('cart');
        
        // 4. Clear Supabase guest cart
        const sessionId = getSessionId();
        await supabase
            .from('guest_carts')
            .delete()
            .eq('session_id', sessionId);
        
        // 5. Show success
        showCheckoutSuccess(order);
        
    } catch (err) {
        console.error('❌ Checkout error:', err);
        alert('Checkout failed: ' + err.message);
    }
};

function showCheckoutSuccess(order) {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;
    
    checkoutForm.innerHTML = `
        <div class="success-message">
            <h2>🎉 Order Confirmed!</h2>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Total:</strong> ₦${order.total_amount.toLocaleString()}</p>
            <p>We've sent a confirmation email to ${order.customer_email}</p>
            <p>Thank you for shopping with us!</p>
            <a href="index.html" class="btn-continue">Continue Shopping</a>
        </div>
    `;
}

// ============================================
// 4. UTILITY FUNCTIONS
// ============================================

function showError(error) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
            <h3 style="color: #e74c3c;">⚠️ Database Error</h3>
            <p>${error.message || 'Cannot load products'}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; background: #000; color: #fff; border: none; margin-top: 20px;">
                ↻ Retry
            </button>
        </div>
    `;
}

function showNoProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
            <h3>📭 No Products Found</h3>
            <p>Add products in Supabase or run setup.</p>
        </div>
    `;
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

// Detect current category from page
function detectCurrentCategory() {
    const path = window.location.pathname;
    const pageName = path.split('/').pop();
    
    // Map page names to category slugs
    const categoryMap = {
        'mensfootwear.html': 'mensfootwear',
        'womensfootwear.html': 'womensfootwear',
        'bags.html': 'bags',
        'household.html': 'household',
        'healthcare.html': 'healthcare',
        'electronics.html': 'electronics'
    };
    
    return categoryMap[pageName] || 'mensfootwear'; // default
}

// ============================================
// 5. INITIALIZATION
// ============================================

// Start when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Page loaded, initializing...');
    
    // Initialize cart UI
    updateCartUI();
    
    // Load products for current category
    const currentCategory = detectCurrentCategory();
    console.log(`Detected category: ${currentCategory}`);
    
    if (document.getElementById('productsGrid')) {
        loadProductsByCategory(currentCategory);
    }
    
    // If on checkout page, load cart summary
    if (window.location.pathname.includes('checkout.html')) {
        loadCheckoutSummary();
    }
});

// Load cart summary on checkout page
async function loadCheckoutSummary() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const summaryEl = document.getElementById('cartSummary');
    const totalEl = document.getElementById('checkoutTotal');
    
    if (!summaryEl || !totalEl) return;
    
    if (cart.length === 0) {
        summaryEl.innerHTML = '<p>Your cart is empty</p>';
        totalEl.textContent = '₦0';
        return;
    }
    
    let summaryHTML = '';
    let total = 0;
    
    for (const item of cart) {
        total += item.price * item.quantity;
        summaryHTML += `
            <div class="checkout-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>₦${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `;
    }
    
    summaryEl.innerHTML = summaryHTML;
    totalEl.textContent = `₦${total.toLocaleString()}`;
}

// Add CSS animations for notifications
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
`;
document.head.appendChild(style);

console.log('🎯 app.js loaded and ready!');
