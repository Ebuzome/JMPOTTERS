const {
  DEFAULT_IMAGES_CONFIG,
  PAGE_TO_CATEGORY,
  getCurrentCategory,
  isProductPage,
  getSlugFromURL,
  getImageUrl,
  formatPrice,
  escapeHtml,
  getStockStatus,
  calculateDiscount,
  NOTIFICATION_COLORS,
} = require('../app.utils');

// ────────────────────────────────────────────
// getCurrentCategory
// ────────────────────────────────────────────
describe('getCurrentCategory', () => {
  it('returns configCategory when provided', () => {
    expect(getCurrentCategory('/bags.html', 'accessories')).toBe('accessories');
  });

  it('maps known page names from pathname', () => {
    Object.entries(PAGE_TO_CATEGORY).forEach(([page, category]) => {
      expect(getCurrentCategory(`/${page}.html`)).toBe(category);
    });
  });

  it('defaults to mensfootwear for unknown pages', () => {
    expect(getCurrentCategory('/unknown.html')).toBe('mensfootwear');
    expect(getCurrentCategory('/')).toBe('mensfootwear');
    expect(getCurrentCategory('')).toBe('mensfootwear');
  });

  it('handles nested paths', () => {
    expect(getCurrentCategory('/shop/bags.html')).toBe('bags');
  });

  it('handles undefined pathname', () => {
    expect(getCurrentCategory(undefined)).toBe('mensfootwear');
  });

  it('handles null pathname', () => {
    expect(getCurrentCategory(null)).toBe('mensfootwear');
  });
});

// ────────────────────────────────────────────
// isProductPage
// ────────────────────────────────────────────
describe('isProductPage', () => {
  it('returns true for product.html paths', () => {
    expect(isProductPage('/product.html')).toBe(true);
    expect(isProductPage('/shop/product.html?slug=test')).toBe(true);
  });

  it('returns false for non-product pages', () => {
    expect(isProductPage('/index.html')).toBe(false);
    expect(isProductPage('/bags.html')).toBe(false);
    expect(isProductPage('/')).toBe(false);
  });

  it('handles empty or undefined pathname', () => {
    expect(isProductPage('')).toBe(false);
    expect(isProductPage(undefined)).toBe(false);
    expect(isProductPage(null)).toBe(false);
  });
});

// ────────────────────────────────────────────
// getSlugFromURL
// ────────────────────────────────────────────
describe('getSlugFromURL', () => {
  it('returns slug when on product page with slug param', () => {
    const params = new URLSearchParams('slug=cool-shoe');
    expect(getSlugFromURL('/product.html', params)).toBe('cool-shoe');
  });

  it('returns slug as-is (URLSearchParams already decodes)', () => {
    const params = new URLSearchParams('slug=cool%20shoe%20v2');
    // URLSearchParams.get() already decodes percent-encoded values
    expect(getSlugFromURL('/product.html', params)).toBe('cool shoe v2');
  });

  it('does not double-decode slugs containing percent characters', () => {
    // Simulating a slug that URLSearchParams already decoded to "50%off"
    const params = { get: () => '50%off' };
    // Should NOT throw URIError from double-decoding
    expect(getSlugFromURL('/product.html', params)).toBe('50%off');
  });

  it('returns null when not on product page', () => {
    const params = new URLSearchParams('slug=test');
    expect(getSlugFromURL('/bags.html', params)).toBeNull();
  });

  it('returns null when slug param is missing', () => {
    const params = new URLSearchParams('');
    expect(getSlugFromURL('/product.html', params)).toBeNull();
  });

  it('returns null when searchParams is null', () => {
    expect(getSlugFromURL('/product.html', null)).toBeNull();
  });
});

// ────────────────────────────────────────────
// getImageUrl
// ────────────────────────────────────────────
describe('getImageUrl', () => {
  it('returns placeholder when imageFilename is falsy', () => {
    expect(getImageUrl('bags', null)).toBe(
      DEFAULT_IMAGES_CONFIG.baseUrl + 'placeholder.jpg'
    );
    expect(getImageUrl('bags', '')).toBe(
      DEFAULT_IMAGES_CONFIG.baseUrl + 'placeholder.jpg'
    );
    expect(getImageUrl('bags', undefined)).toBe(
      DEFAULT_IMAGES_CONFIG.baseUrl + 'placeholder.jpg'
    );
  });

  it('returns supabase URL as-is', () => {
    const url = 'https://tmpggeeuwdvlngvfncaa.supabase.co/storage/img.jpg';
    expect(getImageUrl('bags', url)).toBe(url);
  });

  it('returns any http URL as-is', () => {
    const url = 'https://example.com/image.png';
    expect(getImageUrl('bags', url)).toBe(url);
  });

  it('constructs URL with category folder for mensfootwear', () => {
    expect(getImageUrl('mensfootwear', 'shoe.jpg')).toBe(
      DEFAULT_IMAGES_CONFIG.baseUrl + 'mensfootwear/shoe.jpg'
    );
  });

  it('constructs URL without folder for categories with empty path', () => {
    expect(getImageUrl('womensfootwear', 'heel.jpg')).toBe(
      DEFAULT_IMAGES_CONFIG.baseUrl + 'heel.jpg'
    );
  });

  it('constructs URL with custom config', () => {
    const custom = {
      baseUrl: 'https://cdn.example.com/',
      paths: { bags: 'bag-images/' },
    };
    expect(getImageUrl('bags', 'bag.jpg', custom)).toBe(
      'https://cdn.example.com/bag-images/bag.jpg'
    );
  });

  it('handles unknown category slug', () => {
    expect(getImageUrl('unknown', 'img.jpg')).toBe(
      DEFAULT_IMAGES_CONFIG.baseUrl + 'img.jpg'
    );
  });
});

// ────────────────────────────────────────────
// formatPrice
// ────────────────────────────────────────────
describe('formatPrice', () => {
  it('formats zero', () => {
    expect(formatPrice(0)).toBe('\u20A60');
  });

  it('formats positive integer', () => {
    expect(formatPrice(5000)).toMatch(/₦5[,.]?000/);
  });

  it('formats large number with locale separators', () => {
    const result = formatPrice(1500000);
    expect(result).toContain('₦');
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('000');
  });

  it('returns ₦0 for null/undefined', () => {
    expect(formatPrice(null)).toBe('\u20A60');
    expect(formatPrice(undefined)).toBe('\u20A60');
  });

  it('truncates decimals via parseInt', () => {
    expect(formatPrice(99.99)).toMatch(/₦99/);
  });

  it('handles string numbers', () => {
    expect(formatPrice('2500')).toMatch(/₦2[,.]?500/);
  });
});

// ────────────────────────────────────────────
// escapeHtml
// ────────────────────────────────────────────
describe('escapeHtml', () => {
  it('returns empty string for falsy input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes combined dangerous characters', () => {
    expect(escapeHtml('<img onerror="alert(\'xss\')">')).toBe(
      '&lt;img onerror=&quot;alert(&#039;xss&#039;)&quot;&gt;'
    );
  });

  it('passes through safe text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

// ────────────────────────────────────────────
// getStockStatus
// ────────────────────────────────────────────
describe('getStockStatus', () => {
  it('returns in-stock for stock > 10', () => {
    expect(getStockStatus(11)).toEqual({ status: 'in-stock', text: 'In Stock' });
    expect(getStockStatus(100)).toEqual({ status: 'in-stock', text: 'In Stock' });
  });

  it('returns low-stock for 1-10', () => {
    expect(getStockStatus(1)).toEqual({ status: 'low-stock', text: 'Only 1 left' });
    expect(getStockStatus(10)).toEqual({ status: 'low-stock', text: 'Only 10 left' });
  });

  it('returns out-of-stock for 0', () => {
    expect(getStockStatus(0)).toEqual({
      status: 'out-of-stock',
      text: 'Out of Stock',
    });
  });

  it('returns out-of-stock for negative', () => {
    expect(getStockStatus(-1)).toEqual({
      status: 'out-of-stock',
      text: 'Out of Stock',
    });
  });
});

// ────────────────────────────────────────────
// calculateDiscount
// ────────────────────────────────────────────
describe('calculateDiscount', () => {
  it('returns 0 when comparePrice is falsy', () => {
    expect(calculateDiscount(100, null)).toBe(0);
    expect(calculateDiscount(100, 0)).toBe(0);
    expect(calculateDiscount(100, undefined)).toBe(0);
  });

  it('returns 0 when comparePrice <= price', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
    expect(calculateDiscount(100, 50)).toBe(0);
  });

  it('calculates correct discount percentage', () => {
    expect(calculateDiscount(75, 100)).toBe(25);
    expect(calculateDiscount(50, 200)).toBe(75);
    expect(calculateDiscount(0, 100)).toBe(100);
  });

  it('rounds to nearest integer', () => {
    expect(calculateDiscount(67, 100)).toBe(33);
  });
});

// ────────────────────────────────────────────
// NOTIFICATION_COLORS
// ────────────────────────────────────────────
describe('NOTIFICATION_COLORS', () => {
  it('has all four notification types', () => {
    expect(NOTIFICATION_COLORS).toHaveProperty('success');
    expect(NOTIFICATION_COLORS).toHaveProperty('error');
    expect(NOTIFICATION_COLORS).toHaveProperty('warning');
    expect(NOTIFICATION_COLORS).toHaveProperty('info');
  });

  it('each type has bg, border, text properties', () => {
    Object.values(NOTIFICATION_COLORS).forEach((color) => {
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('text');
    });
  });
});
