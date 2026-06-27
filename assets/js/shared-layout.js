/**
 * JMPOTTERS Shared Layout JavaScript
 * Handles: mobile navigation, cart panel toggles, wishlist panel toggles,
 * WhatsApp float, and "wait for app.js" polling.
 */
(function () {
    'use strict';

    // ---- Mobile Navigation (Left Drawer) ----
    function initMobileNav() {
        var mobileToggle = document.getElementById('mobileToggle');
        var mobileNav = document.getElementById('mobileNav');
        var navOverlay = document.getElementById('navOverlay');
        var closeNavBtns = document.querySelectorAll('.close-nav');

        function openNav() {
            if (mobileNav) mobileNav.classList.add('active');
            if (navOverlay) navOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeNav() {
            if (mobileNav) mobileNav.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        if (mobileToggle) mobileToggle.addEventListener('click', openNav);
        closeNavBtns.forEach(function (btn) {
            btn.addEventListener('click', closeNav);
        });
        if (navOverlay) navOverlay.addEventListener('click', closeNav);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (mobileNav && mobileNav.classList.contains('active')) {
                    closeNav();
                }
            }
        });
    }

    // ---- Cart Panel Toggle ----
    function initCartPanel() {
        var cartIcon = document.getElementById('cartIcon');
        var cartPanel = document.getElementById('cartPanel');
        var cartOverlay = document.getElementById('cartOverlay');
        var closeCartBtn = document.querySelector('.close-cart');

        if (cartIcon && cartPanel && cartOverlay) {
            cartIcon.addEventListener('click', function (e) {
                e.preventDefault();
                cartPanel.classList.add('active');
                cartOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });

            function closeCart() {
                cartPanel.classList.remove('active');
                cartOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }

            if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
            cartOverlay.addEventListener('click', closeCart);

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && cartPanel.classList.contains('active')) {
                    closeCart();
                }
            });
        } else if (cartIcon && !cartPanel) {
            var newCartIcon = cartIcon.cloneNode(true);
            cartIcon.parentNode.replaceChild(newCartIcon, cartIcon);
            newCartIcon.addEventListener('click', function (e) {
                e.preventDefault();
                window.location.href = 'cart.html';
            });
        }
    }

    // ---- Wishlist Panel Toggle ----
    function initWishlistPanel() {
        var wishlistIcon = document.getElementById('wishlistIcon');
        var wishlistPanel = document.getElementById('wishlistPanel');
        var wishlistOverlay = document.getElementById('wishlistOverlay');
        var closeWishlist = document.querySelector('.close-wishlist');

        if (wishlistIcon && wishlistPanel && wishlistOverlay) {
            wishlistIcon.addEventListener('click', function () {
                wishlistPanel.classList.add('active');
                wishlistOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });

            function closeWishlistPanel() {
                wishlistPanel.classList.remove('active');
                wishlistOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }

            if (closeWishlist) closeWishlist.addEventListener('click', closeWishlistPanel);
            wishlistOverlay.addEventListener('click', closeWishlistPanel);
        }
    }

    // ---- Wait-for-App Loader ----
    // Polls for window.JMPOTTERS and loads products for the current category.
    function waitForAppAndLoadCategory(categorySlug, onLoaded) {
        var attempts = 0;
        var waitForApp = setInterval(function () {
            if (window.JMPOTTERS && window.JMPOTTERS.loadProductsByCategory) {
                clearInterval(waitForApp);
                window.JMPOTTERS_CONFIG = window.JMPOTTERS_CONFIG || {};
                window.JMPOTTERS_CONFIG.currentCategory = categorySlug;
                window.JMPOTTERS.loadProductsByCategory(categorySlug)
                    .then(function () {
                        if (typeof onLoaded === 'function') onLoaded();
                    })
                    .catch(function (err) {
                        console.error('Error loading ' + categorySlug + ':', err);
                    });
            }
            attempts++;
            if (attempts > 50) clearInterval(waitForApp);
        }, 200);
    }

    // ---- Shared Cart Count Updater ----
    function updateCartCount() {
        var cart = JSON.parse(localStorage.getItem('jmpotters_cart')) || [];
        var totalItems = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
        var cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        var wishlist = JSON.parse(localStorage.getItem('jmpotters_wishlist')) || [];
        var wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) {
            wishlistCount.textContent = wishlist.length;
            wishlistCount.style.display = wishlist.length > 0 ? 'flex' : 'none';
        }
    }

    // ---- Inject Shared HTML Components ----
    function injectHeader() {
        var placeholder = document.getElementById('shared-header');
        if (!placeholder) return;
        placeholder.outerHTML = [
            '<nav class="nav-bar">',
            '  <div class="nav-container">',
            '    <div class="nav-inner">',
            '      <div class="nav-left">',
            '        <button class="mobile-toggle" id="mobileToggle" aria-label="Menu">',
            "          <i class='bx bx-menu-alt-left'></i>",
            '        </button>',
            '      </div>',
            '      <div class="nav-center">',
            '        <a href="index.html">',
            '          <img src="assets/logos/logo1.png" alt="JMPOTTERS" class="logo-img">',
            '        </a>',
            '      </div>',
            '      <div class="nav-right">',
            '        <div class="header-icon" id="wishlistIcon">',
            "          <i class='bx bx-heart'></i>",
            '          <span class="icon-badge" id="wishlistCount" style="display: none;">0</span>',
            '        </div>',
            '        <div class="header-icon" id="cartIcon">',
            "          <i class='bx bx-shopping-bag'></i>",
            '          <span class="icon-badge" id="cartCount" style="display: none;">0</span>',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</nav>'
        ].join('\n');
    }

    function injectMobileNav() {
        var placeholder = document.getElementById('shared-mobile-nav');
        if (!placeholder) return;
        placeholder.outerHTML = [
            '<div class="overlay" id="navOverlay"></div>',
            '<div class="mobile-nav" id="mobileNav">',
            '  <div class="mobile-nav-header">',
            '    <img src="assets/logos/logo1.png" alt="JMPOTTERS" class="logo-img">',
            "    <button class=\"close-nav\" id=\"closeNavBtn\"><i class='bx bx-x'></i></button>",
            '  </div>',
            '  <ul class="mobile-nav-links">',
            "    <li><a href=\"index.html\"><i class='bx bx-home'></i> Home</a></li>",
            "    <li><a href=\"mensfootwear.html\"><i class='bx bx-male'></i> Men's Footwear</a></li>",
            "    <li><a href=\"womensfootwear.html\"><i class='bx bx-female'></i> Women's Footwear</a></li>",
            "    <li><a href=\"bags.html\"><i class='bx bx-briefcase'></i> Bags</a></li>",
            "    <li><a href=\"accessories.html\"><i class='bx bx-diamond'></i> Accessories</a></li>",
            "    <li><a href=\"household.html\"><i class='bx bx-home-smile'></i> Household</a></li>",
            "    <li><a href=\"kids.html\"><i class='bx bx-baby-carriage'></i> Kids & Babies</a></li>",
            "    <li><a href=\"healthcare.html\"><i class='bx bx-heart'></i> Healthcare</a></li>",
            "    <li><a href=\"contact.html\"><i class='bx bx-phone-call'></i> Contact</a></li>",
            '  </ul>',
            '</div>'
        ].join('\n');
    }

    function injectFooter() {
        var placeholder = document.getElementById('shared-footer');
        if (!placeholder) return;
        placeholder.outerHTML = [
            '<footer class="footer">',
            '  <div class="footer-container">',
            '    <div class="footer-column">',
            '      <img src="assets/logos/logo1.png" alt="JMPOTTERS" class="footer-logo-img">',
            '      <p style="font-size: 0.8rem; margin-top: 10px;">Premium quality products designed for those who value quality and style.</p>',
            '      <div class="social-links">',
            "        <a href=\"#\"><i class='bx bxl-instagram'></i></a>",
            "        <a href=\"#\"><i class='bx bxl-facebook'></i></a>",
            "        <a href=\"#\"><i class='bx bxl-twitter'></i></a>",
            '      </div>',
            '    </div>',
            '    <div class="footer-column">',
            '      <h3>Shop</h3>',
            '      <ul class="footer-links">',
            "        <li><a href=\"mensfootwear.html\"><i class='bx bx-chevron-right'></i> Men's Footwear</a></li>",
            "        <li><a href=\"womensfootwear.html\"><i class='bx bx-chevron-right'></i> Women's Footwear</a></li>",
            "        <li><a href=\"bags.html\"><i class='bx bx-chevron-right'></i> Bags</a></li>",
            "        <li><a href=\"accessories.html\"><i class='bx bx-chevron-right'></i> Accessories</a></li>",
            '      </ul>',
            '    </div>',
            '    <div class="footer-column">',
            '      <h3>Support</h3>',
            '      <ul class="footer-links">',
            "        <li><a href=\"contact.html\"><i class='bx bx-chevron-right'></i> Contact Us</a></li>",
            "        <li><a href=\"#\"><i class='bx bx-chevron-right'></i> Shipping Policy</a></li>",
            "        <li><a href=\"#\"><i class='bx bx-chevron-right'></i> Returns & Exchanges</a></li>",
            "        <li><a href=\"#\"><i class='bx bx-chevron-right'></i> FAQ</a></li>",
            '      </ul>',
            '    </div>',
            '    <div class="footer-column">',
            '      <h3>Contact</h3>',
            '      <ul class="footer-links">',
            "        <li><i class='bx bxl-whatsapp'></i> +234 813 958 3320</li>",
            "        <li><i class='bx bx-envelope'></i> hello@jmpotters.com</li>",
            '      </ul>',
            '    </div>',
            '  </div>',
            '  <div class="copyright">',
            '    &copy; 2025 JMPOTTERS. All rights reserved.',
            '  </div>',
            '</footer>',
            '',
            '<a href="https://wa.me/2348139583320" class="whatsapp-float" target="_blank">',
            "  <i class='bx bxl-whatsapp'></i>",
            '</a>'
        ].join('\n');
    }

    // ---- Initialize ----
    function init() {
        injectHeader();
        injectMobileNav();
        injectFooter();
        initMobileNav();
        initCartPanel();
        initWishlistPanel();
        updateCartCount();
    }

    // Expose for pages that need waitForAppAndLoadCategory
    window.JMPOTTERS_SHARED = {
        waitForAppAndLoadCategory: waitForAppAndLoadCategory,
        updateCartCount: updateCartCount,
        initMobileNav: initMobileNav,
        initCartPanel: initCartPanel,
        initWishlistPanel: initWishlistPanel
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
