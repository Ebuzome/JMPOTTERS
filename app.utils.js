/**
 * JMPOTTERS App Utilities
 *
 * Pure/testable functions extracted from app.js.
 * These mirror the implementations used at runtime
 * and are importable for unit testing via CommonJS.
 */

// ---------- Configuration defaults ----------

const DEFAULT_IMAGES_CONFIG = {
  baseUrl: 'https://ebuzome.github.io/JMPOTTERS/assets/images/',
  paths: {
    mensfootwear: 'mensfootwear/',
    womensfootwear: '',
    bags: '',
    household: 'household2/',
    kids: 'kids/',
    accessories: 'accessories/',
    healthcare: '',
  },
};

const PAGE_TO_CATEGORY = {
  mensfootwear: 'mensfootwear',
  womensfootwear: 'womensfootwear',
  bags: 'bags',
  household: 'household',
  kids: 'kids',
  accessories: 'accessories',
  healthcare: 'healthcare',
  product: 'mensfootwear',
};

// ---------- Utility functions ----------

function getCurrentCategory(pathname, configCategory) {
  if (configCategory) return configCategory;
  const page = (pathname || '').split('/').pop().replace('.html', '');
  return PAGE_TO_CATEGORY[page] || 'mensfootwear';
}

function isProductPage(pathname) {
  return (pathname || '').includes('product.html');
}

function getSlugFromURL(pathname, searchParams) {
  if (!isProductPage(pathname)) return null;
  const slug = searchParams ? searchParams.get('slug') : null;
  return slug || null;
}

function getImageUrl(categorySlug, imageFilename, imagesConfig) {
  const config = imagesConfig || DEFAULT_IMAGES_CONFIG;
  if (!imageFilename) return config.baseUrl + 'placeholder.jpg';
  if (imageFilename.startsWith('https://tmpggeeuwdvlngvfncaa.supabase.co'))
    return imageFilename;
  if (imageFilename.startsWith('http')) return imageFilename;
  const folder = config.paths[categorySlug] || '';
  return config.baseUrl + folder + imageFilename;
}

function formatPrice(price) {
  if (!price && price !== 0) return '\u20A60';
  return `\u20A6${parseInt(price).toLocaleString()}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// ---------- Color/Size mappings ----------

function buildColorSizeMappings(colors, sizes) {
  const colorSizeMap = {};
  const sizeColorMap = {};

  (colors || []).forEach((color) => {
    colorSizeMap[color.id] = (sizes || []).filter(
      (size) => size.color_id === color.id
    );
  });

  const uniqueSizes = [...new Set((sizes || []).map((s) => s.size_value))];
  uniqueSizes.forEach((sizeValue) => {
    const sizeVariants = (sizes || []).filter((s) => s.size_value === sizeValue);
    sizeColorMap[sizeValue] = (colors || []).filter((color) =>
      sizeVariants.some((s) => s.color_id === color.id)
    );
  });

  return { colorSizeMap, sizeColorMap };
}

// ---------- Cart helpers ----------

function getCart(storage) {
  try {
    return JSON.parse(storage.getItem('jmpotters_cart')) || [];
  } catch {
    return [];
  }
}

function saveCartToStorage(cart, storage) {
  storage.setItem('jmpotters_cart', JSON.stringify(cart));
}

function buildCartItem(product, quantity, options) {
  return {
    product_id: product.id,
    quantity,
    name: product.name,
    price: product.price || 0,
    image_url: product.image_url,
    category_slug: options.category_slug || 'mensfootwear',
    color_name: options.color_name || null,
    size_value: options.size_value || null,
    added_at: new Date().toISOString(),
  };
}

function addItemToCart(cart, cartItem) {
  const existingIndex = cart.findIndex(
    (item) =>
      item.product_id === cartItem.product_id &&
      item.color_name === cartItem.color_name &&
      item.size_value === cartItem.size_value
  );

  const updatedCart = [...cart];
  let action;

  if (existingIndex !== -1) {
    updatedCart[existingIndex] = {
      ...updatedCart[existingIndex],
      quantity: updatedCart[existingIndex].quantity + cartItem.quantity,
    };
    action = 'updated';
  } else {
    updatedCart.push(cartItem);
    action = 'added';
  }

  return { cart: updatedCart, action };
}

function calculateCartTotal(cart) {
  return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
}

function calculateTotalItems(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function removeCartItem(cart, index) {
  if (index < 0 || index >= cart.length) return cart;
  const updatedCart = [...cart];
  updatedCart.splice(index, 1);
  return updatedCart;
}

// ---------- Order helpers ----------

function calculateShippingFee(subtotal) {
  return subtotal >= 50000 ? 0 : 2000;
}

function padOrderNumber(num) {
  return num.toString().padStart(4, '0');
}

function parseOrderNumber(orderNumberStr) {
  const numericPart = String(orderNumberStr).replace(/\D/g, '');
  return numericPart ? parseInt(numericPart, 10) : 0;
}

function getNextOrderNumberFromPrevious(previousOrderNumber) {
  const highest = previousOrderNumber
    ? parseOrderNumber(previousOrderNumber)
    : 0;
  return padOrderNumber(highest + 1);
}

function buildOrderInsert(orderData, cart, orderNumber) {
  const subtotal = calculateCartTotal(cart);
  const shippingFee = calculateShippingFee(subtotal);
  const grandTotal = subtotal + shippingFee;

  const items = cart.map((item) => ({
    product_id: item.product_id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    color_name: item.color_name,
    size_value: item.size_value,
    image_url: item.image_url,
  }));

  return {
    order_number: orderNumber,
    user_id: orderData.user_id,
    user_name: orderData.full_name,
    user_email: orderData.email,
    user_phone: orderData.phone,
    full_name: orderData.full_name,
    shipping_address: orderData.address,
    city: orderData.city,
    state: orderData.state,
    total_amount: subtotal,
    shipping_fee: shippingFee,
    grand_total: grandTotal,
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'card',
    items,
    created_at: new Date().toISOString(),
  };
}

// ---------- Wishlist helpers ----------

function getWishlist(storage) {
  try {
    return JSON.parse(storage.getItem('jmpotters_wishlist')) || [];
  } catch {
    return [];
  }
}

function toggleWishlistItem(wishlist, product) {
  const exists = wishlist.some((item) => item.id === product.id);
  if (exists) {
    return {
      wishlist: wishlist.filter((item) => item.id !== product.id),
      action: 'removed',
    };
  }
  return {
    wishlist: [
      ...wishlist,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        slug: product.slug,
      },
    ],
    action: 'added',
  };
}

// ---------- Stock helpers ----------

function getStockStatus(stock) {
  if (stock > 10) return { status: 'in-stock', text: 'In Stock' };
  if (stock > 0) return { status: 'low-stock', text: `Only ${stock} left` };
  return { status: 'out-of-stock', text: 'Out of Stock' };
}

function calculateDiscount(price, comparePrice) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

// ---------- Notification color map ----------

const NOTIFICATION_COLORS = {
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
};

// ---------- Checkout validation ----------

function validateCheckoutUser(user) {
  if (!user) return { valid: false, reason: 'no_user' };
  if (!user.address || !user.city || !user.state)
    return { valid: false, reason: 'incomplete_profile' };
  return { valid: true, reason: null };
}

// ---------- Exports ----------

module.exports = {
  DEFAULT_IMAGES_CONFIG,
  PAGE_TO_CATEGORY,
  NOTIFICATION_COLORS,
  getCurrentCategory,
  isProductPage,
  getSlugFromURL,
  getImageUrl,
  formatPrice,
  escapeHtml,
  buildColorSizeMappings,
  getCart,
  saveCartToStorage,
  buildCartItem,
  addItemToCart,
  calculateCartTotal,
  calculateTotalItems,
  removeCartItem,
  calculateShippingFee,
  padOrderNumber,
  parseOrderNumber,
  getNextOrderNumberFromPrevious,
  buildOrderInsert,
  getWishlist,
  toggleWishlistItem,
  getStockStatus,
  calculateDiscount,
  validateCheckoutUser,
};
