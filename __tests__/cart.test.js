const {
  getCart,
  saveCartToStorage,
  buildCartItem,
  addItemToCart,
  calculateCartTotal,
  calculateTotalItems,
  removeCartItem,
} = require('../app.utils');

// Minimal localStorage mock
function createMockStorage(initial) {
  const store = { ...initial };
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, val) => {
      store[key] = val;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    _store: store,
  };
}

// ────────────────────────────────────────────
// getCart
// ────────────────────────────────────────────
describe('getCart', () => {
  it('returns empty array when storage has no cart', () => {
    const storage = createMockStorage({});
    expect(getCart(storage)).toEqual([]);
  });

  it('returns parsed cart from storage', () => {
    const items = [{ product_id: 1, quantity: 2 }];
    const storage = createMockStorage({
      jmpotters_cart: JSON.stringify(items),
    });
    expect(getCart(storage)).toEqual(items);
  });

  it('returns empty array for corrupted JSON', () => {
    const storage = createMockStorage({
      jmpotters_cart: '{bad json',
    });
    expect(getCart(storage)).toEqual([]);
  });

  it('returns empty array when stored value is null string', () => {
    const storage = createMockStorage({
      jmpotters_cart: 'null',
    });
    expect(getCart(storage)).toEqual([]);
  });
});

// ────────────────────────────────────────────
// saveCartToStorage
// ────────────────────────────────────────────
describe('saveCartToStorage', () => {
  it('stores cart as JSON', () => {
    const storage = createMockStorage({});
    const cart = [{ product_id: 1, quantity: 3 }];
    saveCartToStorage(cart, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      'jmpotters_cart',
      JSON.stringify(cart)
    );
  });

  it('stores empty cart', () => {
    const storage = createMockStorage({});
    saveCartToStorage([], storage);
    expect(storage.setItem).toHaveBeenCalledWith('jmpotters_cart', '[]');
  });
});

// ────────────────────────────────────────────
// buildCartItem
// ────────────────────────────────────────────
describe('buildCartItem', () => {
  const product = {
    id: 42,
    name: 'Test Shoe',
    price: 15000,
    image_url: 'shoe.jpg',
  };

  it('builds item with defaults', () => {
    const item = buildCartItem(product, 1, {});
    expect(item).toMatchObject({
      product_id: 42,
      quantity: 1,
      name: 'Test Shoe',
      price: 15000,
      image_url: 'shoe.jpg',
      category_slug: 'mensfootwear',
      color_name: null,
      size_value: null,
    });
    expect(item.added_at).toBeDefined();
  });

  it('uses provided options', () => {
    const item = buildCartItem(product, 3, {
      category_slug: 'bags',
      color_name: 'Red',
      size_value: '42',
    });
    expect(item.category_slug).toBe('bags');
    expect(item.color_name).toBe('Red');
    expect(item.size_value).toBe('42');
    expect(item.quantity).toBe(3);
  });

  it('defaults price to 0 when product has no price', () => {
    const item = buildCartItem({ ...product, price: undefined }, 1, {});
    expect(item.price).toBe(0);
  });
});

// ────────────────────────────────────────────
// addItemToCart
// ────────────────────────────────────────────
describe('addItemToCart', () => {
  const item = {
    product_id: 1,
    quantity: 2,
    name: 'Shoe',
    price: 5000,
    color_name: null,
    size_value: null,
  };

  it('adds new item to empty cart', () => {
    const result = addItemToCart([], item);
    expect(result.cart).toHaveLength(1);
    expect(result.action).toBe('added');
    expect(result.cart[0]).toEqual(item);
  });

  it('updates quantity when same product/color/size already exists', () => {
    const existing = [{ ...item, quantity: 3 }];
    const result = addItemToCart(existing, { ...item, quantity: 2 });
    expect(result.cart).toHaveLength(1);
    expect(result.action).toBe('updated');
    expect(result.cart[0].quantity).toBe(5);
  });

  it('adds as new item when color differs', () => {
    const existing = [{ ...item, color_name: 'Red' }];
    const result = addItemToCart(existing, { ...item, color_name: 'Blue' });
    expect(result.cart).toHaveLength(2);
    expect(result.action).toBe('added');
  });

  it('adds as new item when size differs', () => {
    const existing = [{ ...item, size_value: '40' }];
    const result = addItemToCart(existing, { ...item, size_value: '42' });
    expect(result.cart).toHaveLength(2);
    expect(result.action).toBe('added');
  });

  it('does not mutate the original cart array', () => {
    const original = [{ ...item, quantity: 1 }];
    const originalCopy = JSON.parse(JSON.stringify(original));
    addItemToCart(original, item);
    expect(original).toEqual(originalCopy);
  });
});

// ────────────────────────────────────────────
// calculateCartTotal
// ────────────────────────────────────────────
describe('calculateCartTotal', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateCartTotal([])).toBe(0);
  });

  it('sums price * quantity for all items', () => {
    const cart = [
      { price: 5000, quantity: 2 },
      { price: 3000, quantity: 1 },
    ];
    expect(calculateCartTotal(cart)).toBe(13000);
  });

  it('treats missing price as 0', () => {
    const cart = [
      { price: null, quantity: 5 },
      { price: 2000, quantity: 1 },
    ];
    expect(calculateCartTotal(cart)).toBe(2000);
  });

  it('handles single item', () => {
    expect(calculateCartTotal([{ price: 7500, quantity: 3 }])).toBe(22500);
  });
});

// ────────────────────────────────────────────
// calculateTotalItems
// ────────────────────────────────────────────
describe('calculateTotalItems', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateTotalItems([])).toBe(0);
  });

  it('sums all quantities', () => {
    const cart = [{ quantity: 2 }, { quantity: 3 }, { quantity: 1 }];
    expect(calculateTotalItems(cart)).toBe(6);
  });

  it('handles single item', () => {
    expect(calculateTotalItems([{ quantity: 5 }])).toBe(5);
  });
});

// ────────────────────────────────────────────
// removeCartItem
// ────────────────────────────────────────────
describe('removeCartItem', () => {
  const cart = [
    { product_id: 1, name: 'A' },
    { product_id: 2, name: 'B' },
    { product_id: 3, name: 'C' },
  ];

  it('removes item at given index', () => {
    const result = removeCartItem(cart, 1);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toEqual(['A', 'C']);
  });

  it('removes first item', () => {
    const result = removeCartItem(cart, 0);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('B');
  });

  it('removes last item', () => {
    const result = removeCartItem(cart, 2);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('B');
  });

  it('returns original cart for negative index', () => {
    expect(removeCartItem(cart, -1)).toEqual(cart);
  });

  it('returns original cart for out-of-bounds index', () => {
    expect(removeCartItem(cart, 10)).toEqual(cart);
  });

  it('does not mutate original cart', () => {
    const original = [...cart];
    removeCartItem(cart, 0);
    expect(cart).toEqual(original);
  });
});
