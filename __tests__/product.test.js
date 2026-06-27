const {
  buildColorSizeMappings,
  getWishlist,
  toggleWishlistItem,
  validateCheckoutUser,
} = require('../app.utils');

// ────────────────────────────────────────────
// buildColorSizeMappings
// ────────────────────────────────────────────
describe('buildColorSizeMappings', () => {
  const colors = [
    { id: 1, color_name: 'Red', color_code: '#ff0000' },
    { id: 2, color_name: 'Blue', color_code: '#0000ff' },
  ];

  const sizes = [
    { id: 10, color_id: 1, size_value: '40', stock_quantity: 5 },
    { id: 11, color_id: 1, size_value: '42', stock_quantity: 3 },
    { id: 12, color_id: 2, size_value: '42', stock_quantity: 8 },
    { id: 13, color_id: 2, size_value: '44', stock_quantity: 0 },
  ];

  it('maps colors to their available sizes', () => {
    const { colorSizeMap } = buildColorSizeMappings(colors, sizes);
    expect(colorSizeMap[1]).toHaveLength(2);
    expect(colorSizeMap[1].map((s) => s.size_value)).toEqual(['40', '42']);
    expect(colorSizeMap[2]).toHaveLength(2);
    expect(colorSizeMap[2].map((s) => s.size_value)).toEqual(['42', '44']);
  });

  it('maps sizes to their available colors', () => {
    const { sizeColorMap } = buildColorSizeMappings(colors, sizes);
    expect(sizeColorMap['40']).toHaveLength(1);
    expect(sizeColorMap['40'][0].color_name).toBe('Red');
    expect(sizeColorMap['42']).toHaveLength(2);
    expect(sizeColorMap['44']).toHaveLength(1);
    expect(sizeColorMap['44'][0].color_name).toBe('Blue');
  });

  it('returns empty maps for empty arrays', () => {
    const { colorSizeMap, sizeColorMap } = buildColorSizeMappings([], []);
    expect(Object.keys(colorSizeMap)).toHaveLength(0);
    expect(Object.keys(sizeColorMap)).toHaveLength(0);
  });

  it('handles colors with no sizes', () => {
    const { colorSizeMap } = buildColorSizeMappings(colors, []);
    expect(colorSizeMap[1]).toEqual([]);
    expect(colorSizeMap[2]).toEqual([]);
  });

  it('handles sizes with no matching colors', () => {
    const orphanSizes = [{ id: 99, color_id: 999, size_value: '38', stock_quantity: 1 }];
    const { colorSizeMap, sizeColorMap } = buildColorSizeMappings(colors, orphanSizes);
    expect(colorSizeMap[1]).toEqual([]);
    expect(colorSizeMap[2]).toEqual([]);
    expect(sizeColorMap['38']).toEqual([]);
  });

  it('handles null/undefined inputs gracefully', () => {
    const { colorSizeMap, sizeColorMap } = buildColorSizeMappings(null, null);
    expect(Object.keys(colorSizeMap)).toHaveLength(0);
    expect(Object.keys(sizeColorMap)).toHaveLength(0);
  });

  it('handles single color single size', () => {
    const { colorSizeMap, sizeColorMap } = buildColorSizeMappings(
      [{ id: 1, color_name: 'Black' }],
      [{ id: 10, color_id: 1, size_value: '41' }]
    );
    expect(colorSizeMap[1]).toHaveLength(1);
    expect(sizeColorMap['41']).toHaveLength(1);
  });
});

// ────────────────────────────────────────────
// Wishlist helpers
// ────────────────────────────────────────────
describe('getWishlist', () => {
  function createMockStorage(initial) {
    const store = { ...initial };
    return {
      getItem: jest.fn((key) => (key in store ? store[key] : null)),
      setItem: jest.fn((key, val) => { store[key] = val; }),
    };
  }

  it('returns empty array when storage has no wishlist', () => {
    expect(getWishlist(createMockStorage({}))).toEqual([]);
  });

  it('returns parsed wishlist', () => {
    const items = [{ id: 1, name: 'Test' }];
    const storage = createMockStorage({
      jmpotters_wishlist: JSON.stringify(items),
    });
    expect(getWishlist(storage)).toEqual(items);
  });

  it('returns empty array for invalid JSON', () => {
    const storage = createMockStorage({ jmpotters_wishlist: 'not json' });
    expect(getWishlist(storage)).toEqual([]);
  });
});

describe('toggleWishlistItem', () => {
  const product = {
    id: 1,
    name: 'Cool Bag',
    price: 25000,
    image_url: 'bag.jpg',
    slug: 'cool-bag',
  };

  it('adds product to empty wishlist', () => {
    const result = toggleWishlistItem([], product);
    expect(result.action).toBe('added');
    expect(result.wishlist).toHaveLength(1);
    expect(result.wishlist[0]).toEqual({
      id: 1,
      name: 'Cool Bag',
      price: 25000,
      image_url: 'bag.jpg',
      slug: 'cool-bag',
    });
  });

  it('removes product already in wishlist', () => {
    const existing = [{ id: 1, name: 'Cool Bag' }];
    const result = toggleWishlistItem(existing, product);
    expect(result.action).toBe('removed');
    expect(result.wishlist).toHaveLength(0);
  });

  it('does not remove other items when toggling', () => {
    const existing = [
      { id: 1, name: 'Cool Bag' },
      { id: 2, name: 'Nice Shoe' },
    ];
    const result = toggleWishlistItem(existing, product);
    expect(result.wishlist).toHaveLength(1);
    expect(result.wishlist[0].id).toBe(2);
  });

  it('adds when different products already in wishlist', () => {
    const existing = [{ id: 2, name: 'Nice Shoe' }];
    const result = toggleWishlistItem(existing, product);
    expect(result.action).toBe('added');
    expect(result.wishlist).toHaveLength(2);
  });

  it('does not mutate original wishlist', () => {
    const existing = [{ id: 5, name: 'Hat' }];
    const copy = JSON.parse(JSON.stringify(existing));
    toggleWishlistItem(existing, product);
    expect(existing).toEqual(copy);
  });
});

// ────────────────────────────────────────────
// validateCheckoutUser
// ────────────────────────────────────────────
describe('validateCheckoutUser', () => {
  it('returns invalid for null user', () => {
    expect(validateCheckoutUser(null)).toEqual({
      valid: false,
      reason: 'no_user',
    });
  });

  it('returns invalid for undefined user', () => {
    expect(validateCheckoutUser(undefined)).toEqual({
      valid: false,
      reason: 'no_user',
    });
  });

  it('returns invalid when address is missing', () => {
    expect(
      validateCheckoutUser({ city: 'Lagos', state: 'Lagos' })
    ).toEqual({ valid: false, reason: 'incomplete_profile' });
  });

  it('returns invalid when city is missing', () => {
    expect(
      validateCheckoutUser({ address: '123 St', state: 'Lagos' })
    ).toEqual({ valid: false, reason: 'incomplete_profile' });
  });

  it('returns invalid when state is missing', () => {
    expect(
      validateCheckoutUser({ address: '123 St', city: 'Lagos' })
    ).toEqual({ valid: false, reason: 'incomplete_profile' });
  });

  it('returns invalid for empty strings', () => {
    expect(
      validateCheckoutUser({ address: '', city: 'Lagos', state: 'Lagos' })
    ).toEqual({ valid: false, reason: 'incomplete_profile' });
  });

  it('returns valid for complete user', () => {
    expect(
      validateCheckoutUser({
        address: '123 Main St',
        city: 'Lagos',
        state: 'Lagos',
      })
    ).toEqual({ valid: true, reason: null });
  });

  it('returns valid even with extra fields', () => {
    expect(
      validateCheckoutUser({
        id: 'u1',
        email: 'test@test.com',
        address: '123 St',
        city: 'Abuja',
        state: 'FCT',
        phone: '000',
      })
    ).toEqual({ valid: true, reason: null });
  });
});
