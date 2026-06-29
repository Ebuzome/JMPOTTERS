const {
  calculateShippingFee,
  padOrderNumber,
  parseOrderNumber,
  getNextOrderNumberFromPrevious,
  buildOrderInsert,
} = require('../app.utils');

// ────────────────────────────────────────────
// calculateShippingFee
// ────────────────────────────────────────────
describe('calculateShippingFee', () => {
  it('returns 0 for subtotal >= 50000', () => {
    expect(calculateShippingFee(50000)).toBe(0);
    expect(calculateShippingFee(100000)).toBe(0);
  });

  it('returns 2000 for subtotal < 50000', () => {
    expect(calculateShippingFee(0)).toBe(2000);
    expect(calculateShippingFee(49999)).toBe(2000);
    expect(calculateShippingFee(1)).toBe(2000);
  });

  it('boundary: exactly 50000', () => {
    expect(calculateShippingFee(50000)).toBe(0);
  });

  it('boundary: one below threshold', () => {
    expect(calculateShippingFee(49999)).toBe(2000);
  });
});

// ────────────────────────────────────────────
// padOrderNumber
// ────────────────────────────────────────────
describe('padOrderNumber', () => {
  it('pads single digit to 4 chars', () => {
    expect(padOrderNumber(1)).toBe('0001');
  });

  it('pads double digit to 4 chars', () => {
    expect(padOrderNumber(42)).toBe('0042');
  });

  it('pads triple digit to 4 chars', () => {
    expect(padOrderNumber(999)).toBe('0999');
  });

  it('does not pad 4-digit numbers', () => {
    expect(padOrderNumber(1234)).toBe('1234');
  });

  it('handles numbers > 4 digits', () => {
    expect(padOrderNumber(12345)).toBe('12345');
  });

  it('handles 0', () => {
    expect(padOrderNumber(0)).toBe('0000');
  });
});

// ────────────────────────────────────────────
// parseOrderNumber
// ────────────────────────────────────────────
describe('parseOrderNumber', () => {
  it('parses numeric string', () => {
    expect(parseOrderNumber('0042')).toBe(42);
  });

  it('strips non-numeric characters', () => {
    expect(parseOrderNumber('ORD-0042')).toBe(42);
    expect(parseOrderNumber('#100')).toBe(100);
  });

  it('returns 0 for empty or all non-numeric', () => {
    expect(parseOrderNumber('')).toBe(0);
    expect(parseOrderNumber('abc')).toBe(0);
  });

  it('handles plain number', () => {
    expect(parseOrderNumber('5')).toBe(5);
  });

  it('handles number input', () => {
    expect(parseOrderNumber(123)).toBe(123);
  });
});

// ────────────────────────────────────────────
// getNextOrderNumberFromPrevious
// ────────────────────────────────────────────
describe('getNextOrderNumberFromPrevious', () => {
  it('returns 0001 when no previous order', () => {
    expect(getNextOrderNumberFromPrevious(null)).toBe('0001');
    expect(getNextOrderNumberFromPrevious(undefined)).toBe('0001');
  });

  it('increments from previous order number', () => {
    expect(getNextOrderNumberFromPrevious('0001')).toBe('0002');
    expect(getNextOrderNumberFromPrevious('0099')).toBe('0100');
    expect(getNextOrderNumberFromPrevious('9999')).toBe('10000');
  });

  it('handles prefixed order numbers', () => {
    expect(getNextOrderNumberFromPrevious('ORD-0050')).toBe('0051');
  });
});

// ────────────────────────────────────────────
// buildOrderInsert
// ────────────────────────────────────────────
describe('buildOrderInsert', () => {
  const orderData = {
    user_id: 'user-1',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+234000000',
    address: '123 Main St',
    city: 'Lagos',
    state: 'Lagos',
  };

  const cart = [
    {
      product_id: 1,
      name: 'Shoe',
      price: 30000,
      quantity: 2,
      color_name: 'Red',
      size_value: '42',
      image_url: 'shoe.jpg',
    },
  ];

  it('calculates subtotal, shipping, and grand total', () => {
    const order = buildOrderInsert(orderData, cart, '0001');
    expect(order.total_amount).toBe(60000);
    expect(order.shipping_fee).toBe(0); // >= 50000
    expect(order.grand_total).toBe(60000);
  });

  it('adds shipping fee for orders under 50000', () => {
    const smallCart = [
      { product_id: 2, name: 'Hat', price: 5000, quantity: 1, color_name: null, size_value: null, image_url: 'hat.jpg' },
    ];
    const order = buildOrderInsert(orderData, smallCart, '0002');
    expect(order.total_amount).toBe(5000);
    expect(order.shipping_fee).toBe(2000);
    expect(order.grand_total).toBe(7000);
  });

  it('maps user data correctly', () => {
    const order = buildOrderInsert(orderData, cart, '0001');
    expect(order.user_id).toBe('user-1');
    expect(order.user_name).toBe('John Doe');
    expect(order.user_email).toBe('john@example.com');
    expect(order.user_phone).toBe('+234000000');
    expect(order.full_name).toBe('John Doe');
    expect(order.shipping_address).toBe('123 Main St');
    expect(order.city).toBe('Lagos');
    expect(order.state).toBe('Lagos');
  });

  it('sets correct default statuses', () => {
    const order = buildOrderInsert(orderData, cart, '0001');
    expect(order.status).toBe('pending');
    expect(order.payment_status).toBe('pending');
    expect(order.payment_method).toBe('card');
  });

  it('includes order_number', () => {
    const order = buildOrderInsert(orderData, cart, '0042');
    expect(order.order_number).toBe('0042');
  });

  it('maps cart items correctly', () => {
    const order = buildOrderInsert(orderData, cart, '0001');
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toEqual({
      product_id: 1,
      name: 'Shoe',
      price: 30000,
      quantity: 2,
      color_name: 'Red',
      size_value: '42',
      image_url: 'shoe.jpg',
    });
  });

  it('includes created_at timestamp', () => {
    const order = buildOrderInsert(orderData, cart, '0001');
    expect(order.created_at).toBeDefined();
    expect(() => new Date(order.created_at)).not.toThrow();
  });

  it('handles multi-item cart', () => {
    const multiCart = [
      { product_id: 1, name: 'A', price: 20000, quantity: 1, color_name: null, size_value: null, image_url: 'a.jpg' },
      { product_id: 2, name: 'B', price: 15000, quantity: 2, color_name: null, size_value: null, image_url: 'b.jpg' },
    ];
    const order = buildOrderInsert(orderData, multiCart, '0003');
    expect(order.total_amount).toBe(50000);
    expect(order.shipping_fee).toBe(0);
    expect(order.grand_total).toBe(50000);
    expect(order.items).toHaveLength(2);
  });

  it('handles empty cart', () => {
    const order = buildOrderInsert(orderData, [], '0004');
    expect(order.total_amount).toBe(0);
    expect(order.shipping_fee).toBe(2000);
    expect(order.grand_total).toBe(2000);
    expect(order.items).toEqual([]);
  });
});
