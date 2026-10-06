document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.js-email-link[data-user][data-domain]').forEach(link => {
    const address = `${link.dataset.user}@${link.dataset.domain}`;
    link.href = `mailto:${address}`;
    if (!link.textContent.trim() || link.textContent.trim().toLowerCase() === 'email reception') {
      link.textContent = 'Email reception';
    }
  });

  // Live Server does not apply the production .htaccess extensionless-URL
  // rewrite. Keep clean URLs in production, but use the flat .html files in
  // local previews for booking and insurer pages.
  const mapLocalPreviewLink = link => {
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return;

    try {
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === '/booking') url.pathname = '/booking.html';
      else if (!url.pathname.endsWith('.html') && /^\/insurance\/[^/]+$/.test(url.pathname)) url.pathname += '.html';
      else return;
      link.href = url.href;
    } catch {
      // Leave malformed or non-HTTP links unchanged.
    }
  };

  document.querySelectorAll('a[href]').forEach(mapLocalPreviewLink);

  document.querySelectorAll('footer').forEach(footer => {
    const scriptEl = document.querySelector('script[src*="script.js"]');
    const siteRoot = scriptEl ? new URL('.', scriptEl.src) : new URL('./', window.location.href);

    const footerGrid = footer.querySelector('.grid');
    if (footerGrid) {
      const columns = [
        {
          title: 'Treatments',
          links: [
            ['Routine care', 'procedures/hard-skin-removal/'],
            ['Fungal nails', 'procedures/fungal-nails/'],
            ['Verruca treatment', 'procedures/verruca-treatment/'],
            ['Ingrowing toenails', 'procedures/ingrowing-toenails/'],
            ['Gait analysis', 'procedures/gait-analysis/']
          ]
        },
        {
          title: 'Surgery',
          links: [
            ['Bunion correction', 'procedures/bunion-correction/'],
            ['Hammertoe correction', 'procedures/hammertoe-correction/'],
            ['Corn removal', 'procedures/corn-removal-surgery/'],
            ['Toe shortening', 'procedures/scar-free-toe-shortening/'],
            ['Webbed toe separation', 'procedures/webbed-toe-separation/']
          ]
        },
        {
          title: 'Clinics',
          links: [
            ['Chingford', 'https://www.google.com/maps/search/?api=1&query=Stationhouse%20Medical%20Centre%2C%2066%20Station%20Road%2C%20London%20E4%207BA'],
            ['Wanstead', 'https://www.google.com/maps/search/?api=1&query=11-13%20Cambridge%20Park%2C%20Wanstead%2C%20London%20E11%202PU'],
            ['Westcliff-on-Sea', 'https://www.google.com/maps/search/?api=1&query=51%20Milton%20Road%2C%20Westcliff-on-Sea%20SS0%207JP'],
            ['Book online', document.querySelector('main a[href*="booking?service="], main a[href*="booking.html?service="]')?.href || 'booking'],
            ['Insurance', 'prices/#insurance']
          ]
        }
      ];

      const existingColumnTitles = new Set(
        Array.from(footerGrid.querySelectorAll('.footer-extra-column strong'))
          .map(heading => heading.textContent.trim().toLowerCase())
      );

      columns.forEach(column => {
        if (existingColumnTitles.has(column.title.toLowerCase())) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'footer-extra-column';
        wrapper.dataset.footerColumn = column.title.toLowerCase();

        const heading = document.createElement('strong');
        heading.textContent = column.title;
        wrapper.appendChild(heading);

        const list = document.createElement('ul');
        list.className = 'footer-links';
        column.links.forEach(([label, href]) => {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = href.startsWith('http') ? href : new URL(href, siteRoot).href;
          link.textContent = label;
          if (href.startsWith('http')) {
            link.target = '_blank';
            link.rel = 'noopener';
          }
          item.appendChild(link);
          list.appendChild(item);
        });
        wrapper.appendChild(list);
        footerGrid.appendChild(wrapper);
      });
    }

    if (!footer.querySelector('.footer-social')) {
      const footerText = footer.querySelector('.footer-text');
      if (footerText) {
        footerText.insertAdjacentHTML('afterend', `
          <div class="footer-social" aria-label="Social media">
            <a class="social-link" href="https://www.instagram.com/foot.ankle" target="_blank" rel="noopener">
              <span class="sr-only">Instagram</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c2.7 0 3 .01 4.1.06 1 .05 1.6.22 1.9.37.5.19.9.43 1.3.82.4.4.63.8.82 1.3.15.3.32.9.37 1.9.05 1.1.06 1.4.06 4.1s-.01 3-.06 4.1c-.05 1-.22 1.6-.37 1.9-.19.5-.43.9-.82 1.3-.4.4-.8.63-1.3.82-.3.15-.9.32-1.9.37-1.1.05-1.4.06-4.1.06s-3-.01-4.1-.06c-1-.05-1.6-.22-1.9-.37-.5-.19-.9-.43-1.3-.82-.4-.4-.63-.8-.82-1.3-.15-.3-.32-.9-.37-1.9C4.21 15 4.2 14.7 4.2 12s.01-3 .06-4.1c.05-1 .22-1.6.37-1.9.19-.5.43-.9.82-1.3.4-.4.8-.63 1.3-.82.3-.15.9-.32 1.9-.37 1.1-.05 1.4-.06 4.1-.06ZM12 0C9.2 0 8.9.01 7.8.06c-1.1.05-1.9.23-2.6.49-.7.27-1.4.64-2 1.26-.62.62-.99 1.3-1.26 2C1.67 4.49 1.49 5.3 1.44 6.4 1.39 7.5 1.38 7.8 1.38 10.6v2.8c0 2.8.01 3.1.06 4.2.05 1.1.23 1.9.49 2.6.27.7.64 1.4 1.26 2 .62.62 1.3.99 2 .26.7.26 1.5.44 2.6.49 1.1.05 1.4.06 4.2.06s3.1-.01 4.2-.06c1.1-.05 1.9-.23 2.6-.49.7-.27 1.4-.64 2-.26.62-.62.99-1.3 1.26-2 .26-.7.44-1.5.49-2.6.05-1.1.06-1.4.06-4.2s-.01-3.1-.06-4.2c-.05-1.1-.23-1.9-.49-2.6-.27-.7-.64-1.4-1.26-2-.62-.62-1.3-.99-2-.26-.7-.26-1.5-.44-2.6-.49C15.1.01 14.8 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 10.2a4 4 0 1 1 0-8.01 4 4 0 0 1 0 8Zm5.9-11.4a1.45 1.45 0 1 1-2.9 0 1.45 1.45 0 0 1 2.9 0Z"/></svg>
            </a>
            <a class="social-link" href="https://www.tiktok.com/@foot.ankle" target="_blank" rel="noopener">
              <span class="sr-only">TikTok</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.75 2c.14 1.13.66 2.08 1.49 2.8.73.63 1.67 1.04 2.76 1.14v3.07a6.7 6.7 0 0 1-3.32-.9v7.13c0 3.78-2.65 6.76-6.68 6.76-3.2 0-5.8-2.14-6.43-5.02-.17-.78-.22-1.57-.09-2.35.43-2.76 2.74-4.77 5.5-4.93.54-.03 1.08.01 1.6.12v3.24c-.36-.12-.74-.2-1.14-.2-1.7 0-3.08 1.38-3.08 3.08s1.38 3.08 3.08 3.08c1.7 0 3.07-1.38 3.07-3.08V2h3.24Z"/></svg>
            </a>
          </div>
        `);
      }
    }

  });

  // Footer columns can be inserted dynamically above.
  document.querySelectorAll('a[href]').forEach(mapLocalPreviewLink);

  const loadTurnstile = (() => {
    let requested = false;
    return () => {
      if (requested || window.turnstile || !document.querySelector('.cf-turnstile')) return;
      requested = true;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };
  })();

  const contactArea = document.getElementById('contact');
  if (contactArea && 'IntersectionObserver' in window) {
    const turnstileObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        loadTurnstile();
        turnstileObserver.disconnect();
      }
    }, { rootMargin: '500px 0px' });
    turnstileObserver.observe(contactArea);
  }
  document.querySelectorAll('.contact-form').forEach(form => {
    form.addEventListener('focusin', loadTurnstile, { once: true });
    form.addEventListener('pointerenter', loadTurnstile, { once: true });
  });

  // Directory indexes can safely use their containing directory URL.
  // Leave other .html URLs intact: production redirects handle clean URLs,
  // while static preview servers need the extension for navigation and reloads.
  try {
    const { protocol, pathname, search, hash } = window.location;
    let didClean = false;
    if (protocol === 'http:' || protocol === 'https:') {
      // Strip trailing '/index.html' to '/'
      if (/\/index\.html$/i.test(pathname)) {
        const clean = pathname.replace(/index\.html$/i, '');
        history.replaceState(null, '', clean + search + hash);
        didClean = true;
      }
    }
    // If we changed the URL before the SPA hooks were installed, request a manual page_view.
    if (didClean) {
      trackPageView();
    }
  } catch {}

  /* --------------------------
     Page fade transitions (fade-out only)
  -------------------------- */
  document.body.classList.add('fade-transition');

  // On booking page, fade in only the main content, not the navbar
  const isBookingPage = !!document.getElementById('b-heading');
  const contentFadeEl = isBookingPage ? document.querySelector('main') : null;
  if (contentFadeEl) {
    contentFadeEl.classList.add('content-fade');
    requestAnimationFrame(() => contentFadeEl.classList.add('ready'));
  }

  // Back/Forward can restore a faded-out page without rerunning DOMContentLoaded.
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('leaving');
    if (contentFadeEl) {
      contentFadeEl.classList.remove('leaving');
      contentFadeEl.classList.add('ready');
    }
  });

  if (isBookingPage) {
    const params = new URLSearchParams(window.location.search || '');
    const requestedService = params.get('service');
    if (requestedService) {
      const serviceSelect = document.querySelector("select[name='service']");
      if (serviceSelect) {
        const normalize = (input) => (input || '')
          .replace(/\+/g, ' ')
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        const target = normalize(requestedService);
        if (target) {
          const options = Array.from(serviceSelect.options || []);
          const match = options.find(opt => !opt.disabled && normalize(opt.value || opt.textContent) === target);
          if (match) {
            options.forEach(opt => { opt.selected = false; });
            match.selected = true;
            serviceSelect.value = match.value;
            // Fire change event for any listeners or validation styling
            serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }
  }

  /* --------------------------
     Mobile menu toggle
  -------------------------- */
  const toggle = document.querySelector('.menu-toggle');
  const panel = document.getElementById('mobile-menu');
  const closeBtn = document.querySelector('.mobile-panel .menu-close');
  const mobileProcTrigger = document.getElementById('mobile-procedures-trigger');
  const mobileProcPanel = document.getElementById('mobile-procedures-menu');
  const mobileSubContent = document.querySelector('#mobile-procedures-menu .mobile-subcontent');
  // Mobile Locations submenu elements
  const mobileLocTrigger = document.getElementById('mobile-locations-trigger');
  const mobileLocPanel = document.getElementById('mobile-locations-menu');

  // Detect iOS (including iPadOS masquerading as Mac) for telemetry/class only
  const isIOS = (() => {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const iOSDevice = /iP(hone|od|ad)/.test(platform);
    const iPadOS = ua.includes('Mac') && 'ontouchend' in document; // iPadOS reports as Mac
    return iOSDevice || iPadOS;
  })();
  if (isIOS) document.documentElement.classList.add('is-ios');

  // iOS Safari: keep native date input visible; show non-blocking dd/mm/yyyy hint
  if (isIOS) {
    const inputs = document.querySelectorAll("label.date-field > input[type='date'].date-native");
    inputs.forEach(input => {
      const label = input.closest('label.date-field');
      if (!label) return;
      const sync = () => {
        if (input.value) label.classList.add('has-value');
        else label.classList.remove('has-value');
      };
      sync();
      input.addEventListener('change', sync, { passive: true });
      input.addEventListener('input', sync, { passive: true });
      input.addEventListener('blur', sync, { passive: true });
      input.addEventListener('focus', () => label.classList.add('has-value'), { passive: true });

      // Ensure the picker opens on tap/click reliably on iOS
      const openPicker = () => {
        try {
          if (typeof input.showPicker === 'function') {
            input.showPicker();
          } else {
            input.focus();
          }
        } catch { input.focus(); }
      };
      // Call on various interactions to be robust
      input.addEventListener('click', openPicker);
      input.addEventListener('touchend', openPicker, { passive: true });
    });
  }

  // iOS custom scrollbar elements + helpers
  let iosScrollBar = null;
  let iosScrollThumb = null;
  let iosScrollHandlersBound = false;
  let iosRAF = null;
  const destroyIOSScrollbar = () => {
    if (iosScrollBar && iosScrollBar.parentNode) iosScrollBar.parentNode.removeChild(iosScrollBar);
    iosScrollBar = null;
    iosScrollThumb = null;
    if (iosScrollHandlersBound && mobileSubContent) {
      mobileSubContent.removeEventListener('scroll', updateIOSScrollbar, { passive: true });
      window.removeEventListener('resize', updateIOSScrollbar);
    }
    iosScrollHandlersBound = false;
    if (iosRAF) { cancelAnimationFrame(iosRAF); iosRAF = null; }
  };
  const updateIOSScrollbar = () => {
    if (!isIOS || !mobileSubContent || !iosScrollBar || !iosScrollThumb) return;
    // Use panel height for track sizing to decouple from content
    const panelView = mobileProcPanel ? mobileProcPanel.clientHeight : 0;
    const contentView = mobileSubContent.clientHeight;
    const view = panelView || contentView;
    const scroll = mobileSubContent.scrollHeight;
    const topPad = 8; const bottomPad = 8; // keep in sync with CSS
    const trackHeight = Math.max(0, view - topPad - bottomPad);
    if (scroll <= view + 1 || trackHeight <= 0) {
      iosScrollBar.style.display = 'none';
      return;
    }
    iosScrollBar.style.display = 'block';
    // Thumb size proportional to visible area
    const minThumb = 20; // px minimum for usability
    const thumbHeight = Math.max(minThumb, Math.round((contentView / scroll) * trackHeight));
    iosScrollThumb.style.height = thumbHeight + 'px';
    // Thumb position based on scrollTop
    const maxScroll = scroll - contentView;
    const maxThumbTop = trackHeight - thumbHeight;
    const ratio = maxScroll > 0 ? (mobileSubContent.scrollTop / maxScroll) : 0;
    const thumbTop = Math.round(ratio * maxThumbTop);
    iosScrollThumb.style.transform = `translateY(${topPad + thumbTop}px)`;
  };
  const ensureIOSScrollbar = () => {
    if (!isIOS || !mobileSubContent) return;
    if (!iosScrollBar) {
      iosScrollBar = document.createElement('div');
      iosScrollBar.className = 'custom-scrollbar';
      iosScrollThumb = document.createElement('div');
      iosScrollThumb.className = 'custom-scrollbar-thumb';
      iosScrollBar.appendChild(iosScrollThumb);
      // Append to non-scrolling panel so it doesn't move with content
      mobileProcPanel.appendChild(iosScrollBar);
    }
    if (!iosScrollHandlersBound) {
      iosScrollHandlersBound = true;
      mobileSubContent.addEventListener('scroll', updateIOSScrollbar, { passive: true });
      window.addEventListener('resize', updateIOSScrollbar);
      // Also update on touch move for better responsiveness
      mobileSubContent.addEventListener('touchmove', updateIOSScrollbar, { passive: true });
      // Start a lightweight RAF loop to keep in sync during momentum scrolling
      const tick = () => {
        updateIOSScrollbar();
        iosRAF = requestAnimationFrame(tick);
      };
      if (!iosRAF) iosRAF = requestAnimationFrame(tick);
    }
    // Defer update to next frame so layout is final
    requestAnimationFrame(updateIOSScrollbar);
  };

  if (toggle && panel) {
    // Ensure menu is hidden on load
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');

    // Open/close via hamburger
    toggle.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');
      panel.classList.toggle('open');
      panel.setAttribute('aria-hidden', String(isOpen));
      toggle.setAttribute('aria-expanded', String(!isOpen));

      // Reset mobile submenu on close
      if (isOpen) {
        if (mobileProcTrigger && mobileProcPanel) {
          mobileCloseSub();
        }
        if (mobileLocTrigger && mobileLocPanel) {
          mobileCloseLocSub();
        }
      }
    });

    // Close via 'X' button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        if (mobileProcTrigger && mobileProcPanel) { mobileCloseSub(); }
        if (mobileLocTrigger && mobileLocPanel) { mobileCloseLocSub(); }
      });
    }
  }

  /* --------------------------
     Smooth scroll for nav links
  -------------------------- */
  // Include links inside the desktop mega panels so their relative hrefs
  // resolve correctly from any subpage (e.g., procedures/*)
  const allNavLinks = document.querySelectorAll('nav a, #mobile-menu a, #procedures-menu a, #locations-menu a, a[data-scroll-snippet]');
  const proceduresTrigger = document.getElementById('procedures-trigger');
  const proceduresMenu = document.getElementById('procedures-menu');
  // Desktop Locations dropdown refs
  const locationsTrigger = document.getElementById('locations-trigger');
  const locationsMenu = document.getElementById('locations-menu');

  // Clicking the brand logo to go to top should clear any active nav state
  const brandLinks = document.querySelectorAll('a.brand');
  brandLinks.forEach(brand => {
    brand.addEventListener('click', (e) => {
      const href = brand.getAttribute('href') || '';
      // Only intercept same-page top jump (href='#')
      if (href === '#') {
        e.preventDefault();
        // Clear active state from all nav links
        allNavLinks.forEach(a => a.removeAttribute('aria-current'));
        // Close dropdowns if open
        if (typeof closeProceduresMenu === 'function') closeProceduresMenu();
        if (typeof closeLocationsMenu === 'function') closeLocationsMenu();
        // Close mobile menu if open
        if (panel && panel.classList.contains('open')) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden', 'true');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
        // Smooth scroll to the very top
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch { window.scrollTo(0, 0); }
      }
    });
  });

  // If landing with a hash (e.g., index.html#team), highlight the nav and ensure scroll
  (function setActiveFromHashOnLoad(){
    const { hash } = window.location;
    if (!hash) return;
    const targetId = hash.slice(1);
    const targetEl = document.getElementById(targetId);
    const topNavMatch = document.querySelector(`nav a[href='${hash}']`);
    if (topNavMatch) {
      allNavLinks.forEach(a => a.removeAttribute('aria-current'));
      topNavMatch.setAttribute('aria-current', 'page');
    }
    if (targetEl) {
      const scrollToTarget = () => {
        try { targetEl.scrollIntoView({ behavior: 'auto', block: 'start' }); }
        catch { targetEl.scrollIntoView(true); }
      };
      requestAnimationFrame(scrollToTarget);
      setTimeout(scrollToTarget, 150);
      setTimeout(scrollToTarget, 350);
    }
  })();

  // Helper to close the procedures dropdown
  const openProceduresMenu = () => {
    if (!proceduresMenu) return;
    proceduresMenu.classList.remove('closing');
    proceduresMenu.classList.add('open');
    proceduresMenu.setAttribute('aria-hidden', 'false');
    if (proceduresTrigger) proceduresTrigger.setAttribute('aria-expanded', 'true');
  };

  const closeProceduresMenu = () => {
    if (!proceduresMenu) return;
    if (proceduresMenu.classList.contains('open')) {
      // Start closing animation: keep visible but transition out
      proceduresMenu.classList.add('closing');
      proceduresMenu.classList.remove('open');
      proceduresMenu.setAttribute('aria-hidden', 'true');
      if (proceduresTrigger) proceduresTrigger.setAttribute('aria-expanded', 'false');
      const cleanup = () => proceduresMenu.classList.remove('closing');
      proceduresMenu.addEventListener('transitionend', cleanup, { once: true });
      // Fallback cleanup in case transitionend doesn't fire
      setTimeout(cleanup, 300);
    }
  };

  // Locations dropdown helpers
  const openLocationsMenu = () => {
    if (!locationsMenu) return;
    locationsMenu.classList.remove('closing');
    locationsMenu.classList.add('open');
    locationsMenu.setAttribute('aria-hidden', 'false');
    if (locationsTrigger) locationsTrigger.setAttribute('aria-expanded', 'true');
  };

  const closeLocationsMenu = () => {
    if (!locationsMenu) return;
    if (locationsMenu.classList.contains('open')) {
      // Start closing animation
      locationsMenu.classList.add('closing');
      locationsMenu.classList.remove('open');
      locationsMenu.setAttribute('aria-hidden', 'true');
      if (locationsTrigger) locationsTrigger.setAttribute('aria-expanded', 'false');
      const cleanup = () => locationsMenu.classList.remove('closing');
      locationsMenu.addEventListener('transitionend', cleanup, { once: true });
      setTimeout(cleanup, 300);
    }
  };

  // Toggle â€œProceduresâ€ dropdown on click
  if (proceduresTrigger && proceduresMenu) {
    proceduresTrigger.addEventListener('click', e => {
      e.preventDefault();
      const isOpen = proceduresMenu.classList.contains('open');
      // Ensure Locations is closed when opening Procedures
      if (typeof closeLocationsMenu === 'function') closeLocationsMenu();
      if (isOpen) {
        closeProceduresMenu();
      } else {
        openProceduresMenu();
      }
      // Mark as active in nav
      allNavLinks.forEach(a => a.removeAttribute('aria-current'));
      proceduresTrigger.setAttribute('aria-current', 'page');
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!proceduresMenu.classList.contains('open')) return;
      const target = e.target;
      if (target !== proceduresTrigger && !proceduresMenu.contains(target)) {
        closeProceduresMenu();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeProceduresMenu();
    });

    // Desktop hover: open on hover, close on leave (keep mobile click intact)
    try {
      const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (supportsHover) {
        let closeTimer = null;
        const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
        const scheduleClose = () => {
          cancelClose();
          closeTimer = setTimeout(() => { closeProceduresMenu(); }, 120);
        };

        // Open when hovering trigger or menu; also close Locations if open
        ['mouseenter','mousemove','mouseover','focusin'].forEach(evt => {
          proceduresTrigger.addEventListener(evt, () => {
            cancelClose();
            if (typeof closeLocationsMenu === 'function') closeLocationsMenu();
            openProceduresMenu();
          }, { passive: true });
          proceduresMenu.addEventListener(evt, () => {
            cancelClose();
            openProceduresMenu();
          }, { passive: true });
        });

        // Close when pointer leaves both trigger and panel
        ['mouseleave','mouseout'].forEach(evt => {
          proceduresTrigger.addEventListener(evt, scheduleClose, { passive: true });
          proceduresMenu.addEventListener(evt, scheduleClose, { passive: true });
        });

        // Keyboard: keep open while focus is within; close when it leaves
        document.addEventListener('focusin', (e) => {
          if (proceduresTrigger.contains(e.target) || proceduresMenu.contains(e.target)) {
            cancelClose();
            openProceduresMenu();
          }
        });
        document.addEventListener('focusout', () => {
          setTimeout(() => {
            const a = document.activeElement;
            if (!proceduresTrigger.contains(a) && !proceduresMenu.contains(a)) {
              scheduleClose();
            }
          }, 0);
        });
      }
    } catch {}
  }

  // Toggle â€œLocationsâ€ dropdown on click
  if (locationsTrigger && locationsMenu) {
    locationsTrigger.addEventListener('click', e => {
      e.preventDefault();
      // Ensure Procedures is closed when opening Locations
      if (typeof closeProceduresMenu === 'function') closeProceduresMenu();
      const isOpen = locationsMenu.classList.contains('open');
      if (isOpen) {
        closeLocationsMenu();
      } else {
        openLocationsMenu();
      }
      // Mark as active in nav
      allNavLinks.forEach(a => a.removeAttribute('aria-current'));
      locationsTrigger.setAttribute('aria-current', 'page');
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!locationsMenu.classList.contains('open')) return;
      const target = e.target;
      if (target !== locationsTrigger && !locationsMenu.contains(target)) {
        closeLocationsMenu();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeLocationsMenu();
    });

    // Desktop hover: open on hover, close on leave (keep mobile click intact)
    try {
      const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (supportsHover) {
        let closeTimer = null;
        const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
        const scheduleClose = () => {
          cancelClose();
          closeTimer = setTimeout(() => { closeLocationsMenu(); }, 120);
        };

        ['mouseenter','mousemove','mouseover','focusin'].forEach(evt => {
          locationsTrigger.addEventListener(evt, () => {
            cancelClose();
            if (typeof closeProceduresMenu === 'function') closeProceduresMenu();
            openLocationsMenu();
          }, { passive: true });
          locationsMenu.addEventListener(evt, () => {
            cancelClose();
            openLocationsMenu();
          }, { passive: true });
        });

        ['mouseleave','mouseout'].forEach(evt => {
          locationsTrigger.addEventListener(evt, scheduleClose, { passive: true });
          locationsMenu.addEventListener(evt, scheduleClose, { passive: true });
        });

        document.addEventListener('focusin', (e) => {
          if (locationsTrigger.contains(e.target) || locationsMenu.contains(e.target)) {
            cancelClose();
            openLocationsMenu();
          }
        });
        document.addEventListener('focusout', () => {
          setTimeout(() => {
            const a = document.activeElement;
            if (!locationsTrigger.contains(a) && !locationsMenu.contains(a)) {
              scheduleClose();
            }
          }, 0);
        });
      }
    } catch {}
  }

  allNavLinks.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href') || '';
      const isHashOnly = href.startsWith('#');

      // Cross-page links: fade-out then navigate
      if (!isHashOnly) {
        if (!link.target && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          const resolveHref = (url) => {
            try {
              // Absolute URLs and root-relative paths: use as-is
              if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url) || url.startsWith('/')) return url;
              // Normalize any other relative path against site root
              return new URL(url, window.location.href).toString();
            } catch { return url; }
          };
          const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const targetUrl = resolveHref(href);
          const go = () => { window.location.href = targetUrl; };
          if (prefersReduced) { go(); return; }
          // Trigger fade-out animation (content-only on booking page)
          const fadeEl = contentFadeEl || document.body;
          if (fadeEl === document.body) {
            document.body.classList.add('leaving');
          } else {
            fadeEl.classList.add('leaving');
          }
          let navigated = false;
          let navigationTimer;
          const done = () => {
            if (navigated) return;
            navigated = true;
            clearTimeout(navigationTimer);
            fadeEl.removeEventListener('transitionend', done);
            go();
          };
          fadeEl.addEventListener('transitionend', done, { once: true });
          navigationTimer = setTimeout(done, 280); // fallback
        }
        return;
      }

      const targetId = href.slice(1);
      const targetEl = document.getElementById(targetId);

      // Let the dedicated handlers manage dropdown triggers
      if (targetId === 'procedures' && link === proceduresTrigger) {
        e.preventDefault();
        return;
      }
      if (targetId === 'locations' && link === locationsTrigger) {
        e.preventDefault();
        return;
      }
      if (targetEl) {
        e.preventDefault();

        const headerEl = document.querySelector('header');
        const anchorSelector = targetEl.dataset.scrollAnchor || null;
        let scrollNode = anchorSelector ? targetEl.querySelector(anchorSelector) : null;
        if (!scrollNode) scrollNode = targetEl;
        if (targetId === 'contact') {
          const kicker = targetEl.querySelector('.kicker');
          if (kicker) scrollNode = kicker;
        }
        const computeTop = () => {
          const headerHeight = headerEl ? headerEl.offsetHeight : 0;
          const offset = headerHeight + 16;
          const rect = scrollNode.getBoundingClientRect();
          return Math.max(0, window.pageYOffset + rect.top - offset);
        };
        const performScroll = (behavior = 'smooth') => {
          const top = computeTop();
          try { window.scrollTo({ top, behavior }); }
          catch { window.scrollTo(0, top); }
          return top;
        };

        // Update active state: turn clicked link blue
        allNavLinks.forEach(a => a.removeAttribute('aria-current'));
        const topNavMatch = document.querySelector("nav a[href='#" + targetId + "']");
        (topNavMatch || link).setAttribute('aria-current', 'page');

        const wasMobileMenuOpen = panel && panel.classList.contains('open');
        if (wasMobileMenuOpen) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden', 'true');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
        if (typeof closeProceduresMenu === 'function' && targetId !== 'procedures') closeProceduresMenu();
        if (typeof closeLocationsMenu === 'function' && targetId !== 'locations') closeLocationsMenu();
        if (mobileProcTrigger && mobileProcPanel) { mobileCloseSub(); }
        if (mobileLocTrigger && mobileLocPanel) { mobileCloseLocSub(); }

        const allowSnap = targetId === 'contact';
        let executed = false;
        const executeScroll = () => {
          if (executed) return;
          executed = true;
          // Wait two frames so layout can settle after menu transitions, then scroll once.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              performScroll('smooth');
              if (allowSnap) {
                setTimeout(() => {
                  const desired = computeTop();
                  if (Math.abs(window.pageYOffset - desired) > 12) {
                    performScroll('auto');
                  }
                }, 420);
              }
            });
          });
        };

        if (wasMobileMenuOpen) {
          const onPanelTransition = (event) => {
            if (event && event.target !== panel) return;
            if (panel) panel.removeEventListener('transitionend', onPanelTransition);
            executeScroll();
          };
          if (panel) panel.addEventListener('transitionend', onPanelTransition);
          setTimeout(() => {
            if (panel) panel.removeEventListener('transitionend', onPanelTransition);
            executeScroll();
          }, 360);
        } else {
          executeScroll();
        }
      }
      // If no target on this page, do not preventDefault and let browser handle
    }, { capture: true });
  });

  /* --------------------------
     Scroll spy: highlight nav on scroll
  -------------------------- */
  (function initScrollSpy() {
    const headerEl = document.querySelector('header');
    // Match the smooth-scroll offset so sections highlight when the anchor is at the top.
    const headerOffset = () => (headerEl ? headerEl.offsetHeight : 0) + 16;

    // Map top nav links to on-page section elements
    const topNavLinks = Array.from(document.querySelectorAll("header nav a[href^='#']"))
      // Exclude items that are not real sections (dropdown triggers)
      .filter(a => {
        const href = a.getAttribute('href') || '';
        return href.length > 1 && href !== '#procedures' && href !== '#locations';
      });

    const sections = topNavLinks
      .map(a => ({ id: a.getAttribute('href').slice(1), link: a }))
      .map(({ id, link }) => ({ id, link, el: document.getElementById(id) }))
      .filter(x => !!x.el);

    if (!sections.length) return; // nothing to track on this page

    const getAnchorEl = ({ id, el }) => {
      const anchorSelector = el.dataset.scrollAnchor || null;
      let anchorEl = anchorSelector ? el.querySelector(anchorSelector) : null;
      if (!anchorEl && id === 'contact') {
        anchorEl = el.querySelector('.kicker');
      }
      return anchorEl || el;
    };

    // Cache section positions (recompute on resize)
    let positions = [];
    const computePositions = () => {
      positions = sections.map(({ id, el }) => {
        const targetEl = getAnchorEl({ id, el });
        const rect = targetEl.getBoundingClientRect();
        const top = Math.max(0, window.pageYOffset + rect.top);
        return { id, top };
      });
      // Ensure sorted by top asc
      positions.sort((a, b) => a.top - b.top);
    };
    computePositions();
    window.addEventListener('resize', computePositions);
    window.addEventListener('load', computePositions);

    let ticking = false;
    let lastActiveId = null;
    const setActive = (id) => {
      // If no id, clear any active state and remember cleared
      if (!id) {
        if (lastActiveId !== null) {
          allNavLinks.forEach(a => a.removeAttribute('aria-current'));
          lastActiveId = null;
        }
        return;
      }
      if (id === lastActiveId) return;
      // Clear only when changing to a new section to avoid flicker
      allNavLinks.forEach(a => a.removeAttribute('aria-current'));
      const top = document.querySelector(`header nav a[href='#${id}']`);
      if (top) top.setAttribute('aria-current', 'page');
      lastActiveId = id;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pos = window.scrollY + headerOffset();
        // If we're above the first section, clear active
        if (positions.length && pos < positions[0].top) {
          setActive(null);
          ticking = false;
          return;
        }
        // Find the last section whose top is above the current position
        let currentId = positions[0]?.id;
        for (let i = 0; i < positions.length; i++) {
          if (positions[i].top <= pos) currentId = positions[i].id;
          else break;
        }
        // If a section anchor is in view, prefer the one closest to the header.
        const headerPad = headerOffset();
        let closestId = null;
        let closestDistance = Infinity;
        for (const section of sections) {
          const anchorEl = getAnchorEl(section);
          if (!anchorEl) continue;
          const rect = anchorEl.getBoundingClientRect();
          const inView = rect.top <= (window.innerHeight - 1) && rect.bottom >= headerPad;
          if (!inView) continue;
          const distance = Math.abs(rect.top - headerPad);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestId = section.id;
          }
        }
        if (closestId) currentId = closestId;
        // Ensure the last section can activate near the page bottom
        if (positions.length) {
          const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight + headerOffset();
          const last = positions[positions.length - 1];
          if (pos >= Math.min(last.top, maxScrollTop)) {
            currentId = last.id;
          }
        }
        setActive(currentId);
        ticking = false;
      });
    };

    // Initialize now and bind scroll
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* --------------------------
     Mobile Procedures submenu
  -------------------------- */
  function mobileOpenSub() {
    if (!mobileProcTrigger || !mobileProcPanel) return;
    mobileProcPanel.hidden = false;
    mobileProcPanel.classList.add('open');
    // Reset starting point so the transition always plays
    mobileProcPanel.style.maxHeight = '0px';
    mobileProcPanel.style.opacity = '0';
    // Force reflow before expanding
    void mobileProcPanel.offsetHeight;
    const targetHeight = mobileProcPanel.scrollHeight;
    requestAnimationFrame(() => {
      if (!mobileProcPanel.classList.contains('open')) return;
      mobileProcPanel.style.maxHeight = targetHeight + 'px';
      mobileProcPanel.style.opacity = '1';
      // iOS: initialize custom moving scrollbar once height is set
      ensureIOSScrollbar();
    });
    mobileProcTrigger.setAttribute('aria-expanded', 'true');
  }
  function mobileCloseSub() {
    if (!mobileProcTrigger || !mobileProcPanel) return;
    // Animate collapse first
    mobileProcPanel.style.maxHeight = '0px';
    mobileProcPanel.style.opacity = '0';
    mobileProcTrigger.setAttribute('aria-expanded', 'false');
    let cleaned = false;
    const onEnd = () => {
      if (cleaned) return;
      cleaned = true;
      mobileProcPanel.removeEventListener('transitionend', onEnd);
      mobileProcPanel.classList.remove('open');
      mobileProcPanel.hidden = true;
      mobileProcPanel.style.maxHeight = '';
      mobileProcPanel.style.opacity = '';
      // iOS: remove custom scrollbar
      destroyIOSScrollbar();
    };
    mobileProcPanel.addEventListener('transitionend', onEnd);
    // Fallback cleanup
    setTimeout(onEnd, 350);
  }
  if (mobileProcTrigger && mobileProcPanel) {
    mobileProcTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = mobileProcTrigger.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        mobileCloseSub();
      } else {
        mobileOpenSub();
      }
    });
  }

  /* --------------------------
     Mobile Locations submenu
  -------------------------- */
  function mobileOpenLocSub() {
    if (!mobileLocTrigger || !mobileLocPanel) return;
    mobileLocPanel.hidden = false;
    mobileLocPanel.classList.add('open');
    mobileLocPanel.style.maxHeight = '0px';
    mobileLocPanel.style.opacity = '0';
    void mobileLocPanel.offsetHeight;
    const targetHeight = mobileLocPanel.scrollHeight;
    requestAnimationFrame(() => {
      if (!mobileLocPanel.classList.contains('open')) return;
      mobileLocPanel.style.maxHeight = targetHeight + 'px';
      mobileLocPanel.style.opacity = '1';
    });
    mobileLocTrigger.setAttribute('aria-expanded', 'true');
  }
  function mobileCloseLocSub() {
    if (!mobileLocTrigger || !mobileLocPanel) return;
    mobileLocPanel.style.maxHeight = '0px';
    mobileLocPanel.style.opacity = '0';
    mobileLocTrigger.setAttribute('aria-expanded', 'false');
    let cleaned = false;
    const onEnd = () => {
      if (cleaned) return;
      cleaned = true;
      mobileLocPanel.removeEventListener('transitionend', onEnd);
      mobileLocPanel.classList.remove('open');
      mobileLocPanel.hidden = true;
      mobileLocPanel.style.maxHeight = '';
      mobileLocPanel.style.opacity = '';
    };
    mobileLocPanel.addEventListener('transitionend', onEnd);
    setTimeout(onEnd, 350);
  }
  if (mobileLocTrigger && mobileLocPanel) {
    mobileLocTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = mobileLocTrigger.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        mobileCloseLocSub();
      } else {
        // Close the other mobile submenu if open
        if (mobileProcTrigger && mobileProcPanel) mobileCloseSub();
        mobileOpenLocSub();
      }
    });
  }

  /* --------------------------
     Animated clinic locations in hero
  -------------------------- */
  const locations = ['Chingford', 'Wanstead', 'Westcliff-on-Sea'];
  const locationEl = document.getElementById('clinic-location');
  let locIndex = 0;

  if (locationEl) {
    setInterval(() => {
      // Fade out
      locationEl.classList.add('fade-out');

      setTimeout(() => {
        // Update text and fade in
        locIndex = (locIndex + 1) % locations.length;
        locationEl.textContent = locations[locIndex];
        locationEl.classList.remove('fade-out');
        locationEl.classList.add('fade-in');

        // Remove fade-in class after animation
        setTimeout(() => locationEl.classList.remove('fade-in'), 500);
      }, 500);
    }, 3000); // change every 3 seconds
  }

  /* --------------------------
     Team image rotator
  -------------------------- */
  const teamFigure = document.querySelector('.team-rotator');
  if (teamFigure) {
    const teamImg = teamFigure.querySelector('.team-image');
    const teamCaption = teamFigure.querySelector('.team-caption');
    const attrValue = (teamFigure.dataset.teamImages || '').split(',').map(name => name.trim()).filter(Boolean);
    const captionsAttr = teamFigure.dataset.teamCaptions || '';
    const currentSrc = teamImg ? (teamImg.getAttribute('src') || '').replace(/\\/g, '/').split('/').pop() : '';
    if (currentSrc && !attrValue.includes(currentSrc)) {
      attrValue.unshift(currentSrc);
    }

    const seenFiles = new Set();
    const normalizeName = (input) => {
      if (!input) return '';
      return input.replace(/\\/g, '/').split('/').pop() || '';
    };
    const toLabel = (file) => {
      const base = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      if (!base) return 'Team member';
      return base.split(' ').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    };

    const buildCaptionMap = (input) => {
      const map = new Map();
      if (!input) return map;
      input.split(';').forEach((pair) => {
        const trimmed = pair.trim();
        if (!trimmed) return;
        const idx = trimmed.indexOf(':');
        if (idx === -1) return;
        const keyRaw = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!keyRaw || !value) return;
        const normalized = normalizeName(keyRaw);
        if (!normalized) return;
        map.set(normalized, value);
        const bare = normalized.replace(/\.[^.]+$/, '');
        if (bare && !map.has(bare)) map.set(bare, value);
      });
      return map;
    };

    const captionsMap = buildCaptionMap(captionsAttr);

    const files = [];
    attrValue.forEach((entry) => {
      const file = normalizeName(entry);
      if (!file || seenFiles.has(file)) return;
      seenFiles.add(file);
      files.push(file);
    });

    if (!files.length && currentSrc) {
      files.push(currentSrc);
    }

    if (teamImg && files.length) {
      const items = files.map((file) => {
        const key = normalizeName(file);
        const bare = key.replace(/\.[^.]+$/, '');
        const caption = captionsMap.get(key) || captionsMap.get(bare) || toLabel(file);
        return {
          src: 'images/team/' + file,
          caption,
          alt: caption + ' - Foot & Ankle Centre team'
        };
      });

      const applyItem = (item, immediate) => {
        teamImg.src = item.src;
        teamImg.alt = item.alt;
        if (teamCaption) {
          teamCaption.textContent = item.caption;
        }
        if (immediate) {
          teamImg.classList.remove('is-hidden');
          if (teamCaption) teamCaption.classList.remove('is-hidden');
        }
      };

      applyItem(items[0], true);
      let teamIndex = 0;

      if (items.length > 1) {
        const fadeDuration = 800;
        const holdDuration = 5000;
        let animating = false;

        // Preload remaining images so swaps are instant on slower connections
        items.slice(1).forEach((item) => {
          const preloadImg = new Image();
          preloadImg.src = item.src;
        });

        const goNext = () => {
          if (animating) return;
          animating = true;
          const nextIndex = (teamIndex + 1) % items.length;

          teamImg.classList.add('is-hidden');
          if (teamCaption) teamCaption.classList.add('is-hidden');

          setTimeout(() => {
            teamIndex = nextIndex;
            applyItem(items[teamIndex]);
            requestAnimationFrame(() => {
              teamImg.classList.remove('is-hidden');
              if (teamCaption) teamCaption.classList.remove('is-hidden');
            });
            animating = false;
          }, fadeDuration);
        };

        setInterval(goNext, holdDuration);
      }
    }
  }

  /* --------------------------
     Dynamic year
  -------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* --------------------------
     Testimonials enrich + auto-scroll
  -------------------------- */
  const track = document.getElementById('quotes');
  if (track) {
    // Enrich each quote with avatar, name, rating, and posted date
    const fallback = [
      { name: 'Georgia W', rating: 5, posted: '2024-05', label: 'May 2024' },
      { name: 'Linda Lancaster', rating: 5, posted: '2024-03', label: 'Mar 2024' },
      { name: 'Stacey Wood', rating: 4, posted: '2023-11', label: 'Nov 2023' },
    ];
    const figs = track.querySelectorAll('figure.quote');
    figs.forEach((fig, i) => {
      const bq = fig.querySelector('blockquote');
      // Pull data from dataset if present, else fallback
      const name = fig.dataset.name || fallback[i]?.name || 'Google User';
      const rating = parseInt(fig.dataset.rating || fallback[i]?.rating || 5, 10);
      const posted = fig.dataset.posted || fallback[i]?.posted || '';
      const label = fig.dataset.postedLabel || fallback[i]?.label || '';
      const initials = (name.match(/\b\w/g) || []).slice(0,2).join('').toUpperCase();

      // Build header
      const header = document.createElement('div');
      header.className = 'reviewer';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      if (fig.dataset.avatar) {
        const img = document.createElement('img');
        img.src = fig.dataset.avatar;
        img.alt = `${name} profile photo`;
        img.loading = 'lazy';
        avatar.appendChild(img);
      } else {
        avatar.textContent = initials;
      }

      const info = document.createElement('div');
      info.className = 'info';
      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = name;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const stars = document.createElement('span');
      stars.className = 'rating';
      stars.setAttribute('aria-label', `${rating} out of 5 stars`);
      stars.textContent = '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating);
      const dot = document.createElement('span');
      dot.textContent = '\u00b7';
      const time = document.createElement('time');
      if (posted) time.setAttribute('datetime', posted);
      time.textContent = label || posted;
      const g = document.createElement('span');
      g.className = 'g-badge';
      g.setAttribute('aria-label','Google review');
      g.textContent = 'G';

      meta.appendChild(stars);
      meta.appendChild(dot);
      meta.appendChild(time);
      meta.appendChild(g);
      info.appendChild(nameEl);
      info.appendChild(meta);
      header.appendChild(avatar);
      header.appendChild(info);

      // Insert header before the blockquote (or at top)
      if (bq) {
        fig.insertBefore(header, bq);
      } else {
        fig.prepend(header);
      }

      // Remove any old figcaption if present (we show name in header)
      const cap = fig.querySelector('figcaption');
      if (cap) cap.remove();

      // Make card interactive if a link is provided
      if (fig.dataset.link) {
        fig.setAttribute('role', 'link');
        fig.setAttribute('tabindex', '0');
        fig.style.cursor = 'pointer';
        // Title for hover context
        if (!fig.getAttribute('title')) fig.setAttribute('title', 'Open full Google review');
      }
    });

    // Duplicate content for seamless loop
    const originalHTML = track.innerHTML;
    track.insertAdjacentHTML('beforeend', originalHTML);

    // Delegate click/keyboard to handle both original and duplicated cards
    const openFigLink = (fig) => {
      const url = fig?.dataset?.link;
      if (!url) return;
      window.open(url, '_blank', 'noopener');
    };
    track.addEventListener('click', (e) => {
      const fig = e.target.closest('figure.quote[data-link]');
      if (fig) openFigLink(fig);
    });
    track.addEventListener('keydown', (e) => {
      const fig = e.target.closest('figure.quote[data-link]');
      if (!fig) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFigLink(fig);
      }
    });

    let scrollPos = 0;
    const speed = 24; // px per second for fluid, time-based motion
    let paused = false;
    let lastTime = null;
    // Mobile interaction state
    let userInteracting = false;
    let idleTimer = null;
    const idleDelay = 2000; // resume 2s after last interaction

    const step = (now) => {
      if (lastTime === null) lastTime = now;
      if (!paused) {
        // Advance using time delta so the loop stays smooth even on variable frame rates
        const half = track.scrollWidth / 2;
        if (half > 0) {
          const delta = Math.min(now - lastTime, 120); // cap large jumps after tab throttling
          scrollPos = (scrollPos + (speed * delta) / 1000) % half;
          track.scrollLeft = scrollPos;
        }
      }
      lastTime = now;
      requestAnimationFrame(step);
    };

    // Pause on hover/focus for readability
    track.addEventListener('mouseenter', () => { paused = true; });
    track.addEventListener('mouseleave', () => { if (!userInteracting) paused = false; });
    track.addEventListener('focusin', () => { paused = true; });
    track.addEventListener('focusout', () => { if (!userInteracting) paused = false; });

    // Mobile-only: allow user to swipe/scroll and pause auto-scroll during interaction
    const isCoarse = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
    if (isCoarse) {
      const pauseAuto = () => { paused = true; userInteracting = true; };
      const resumeAutoSoon = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          // Continue from the current position to avoid a jump
          scrollPos = track.scrollLeft;
          lastTime = null;
          paused = false;
          userInteracting = false;
        }, idleDelay);
      };

      ['touchstart','pointerdown'].forEach(evt => {
        track.addEventListener(evt, (e) => {
          // Only react to touch pointers for pointerdown
          if (evt === 'pointerdown' && e.pointerType && e.pointerType !== 'touch') return;
          pauseAuto();
        }, { passive: true });
      });

      // While user scrolls, keep resetting the idle timer
      track.addEventListener('scroll', () => {
        if (!userInteracting) return; // only when user initiated
        if (idleTimer) clearTimeout(idleTimer);
        resumeAutoSoon();
      }, { passive: true });

      ['touchend','touchcancel','pointerup'].forEach(evt => {
        track.addEventListener(evt, () => {
          resumeAutoSoon();
        }, { passive: true });
      });
    }

    // Keep position consistent on resize
    window.addEventListener('resize', () => {
      // Clamp to current half-width loop and avoid jump
      const half = track.scrollWidth / 2;
      if (half > 0) scrollPos = track.scrollLeft % half;
    });

    // Start loop
    requestAnimationFrame(step);
  }

  /* --------------------------
     Vimazi carousel
  -------------------------- */
  const vimaziGallery = document.querySelector('.vimazi-gallery');
  if (vimaziGallery) {
    const vimaziTrack = vimaziGallery.querySelector('.vimazi-track');
    const vimaziSlides = vimaziTrack ? Array.from(vimaziTrack.children) : [];
    const vimaziPrev = vimaziGallery.querySelector('.vimazi-prev');
    const vimaziNext = vimaziGallery.querySelector('.vimazi-next');
    const totalSlides = vimaziSlides.length;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getSlidesPerView = () => {
      const width = window.innerWidth || document.documentElement.clientWidth || 0;
      if (width <= 620) return Math.min(1, totalSlides || 1);
      if (width <= 960) return Math.min(2, totalSlides || 1);
      return Math.min(3, totalSlides || 1);
    };

    if (!vimaziTrack || totalSlides === 0) {
      vimaziGallery.classList.add('vimazi-static');
    } else {
      let slideWidthPx = 0;
      let slideGapPx = 0;
      let galleryWidth = 0;
      let galleryPadLeft = 0;
      let galleryPadRight = 0;
      let galleryOffsetLeft = 0;
      let slidesPerView = getSlidesPerView();
      let autoplayId = null;
      let isAnimating = false;

      const measure = () => {
        const first = vimaziSlides[0];
        if (!first) return;
        slideWidthPx = first.offsetWidth;
        const styles = getComputedStyle(vimaziTrack);
        const gapRaw = styles.gap || styles.columnGap || '0';
        const gapValue = parseFloat(gapRaw);
        slideGapPx = Number.isNaN(gapValue) ? 0 : gapValue;
        const galleryRect = vimaziGallery.getBoundingClientRect();
        galleryWidth = galleryRect.width;
        const galleryStyles = getComputedStyle(vimaziGallery);
        galleryPadLeft = parseFloat(galleryStyles.paddingLeft || '0') || 0;
        galleryPadRight = parseFloat(galleryStyles.paddingRight || '0') || 0;
        galleryOffsetLeft = vimaziTrack.offsetLeft || 0;
      };

      const applyLayout = () => {
        slidesPerView = getSlidesPerView();
        const percent = 100 / slidesPerView;
        Array.from(vimaziTrack.children).forEach(slide => {
          slide.style.flex = `0 0 ${percent}%`;
          slide.style.maxWidth = `${percent}%`;
        });
        measure();
      };

      const offsetForIndex = index => {
        if (!galleryWidth) measure();
        const slide = vimaziTrack.children[index];
        if (slide) {
          const layoutCenter = slide.offsetLeft + slide.offsetWidth / 2;
          const usableWidth = Math.max(0, galleryWidth - galleryPadLeft - galleryPadRight);
          const galleryCenter = galleryPadLeft + usableWidth / 2;
          const galleryCenterInTrack = galleryCenter - galleryOffsetLeft;
          return layoutCenter - galleryCenterInTrack;
        }
        const spacing = slideWidthPx + slideGapPx;
        return spacing * index;
      };

      const cloneSlide = original => {
        const clone = original.cloneNode(true);
        clone.classList.add('vimazi-clone');
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      };

      const hasLoop = totalSlides > 1;
      if (hasLoop && !vimaziTrack.dataset.loopReady) {
        const beforeClones = vimaziSlides.slice().reverse().map(cloneSlide);
        beforeClones.forEach(clone => {
          vimaziTrack.insertBefore(clone, vimaziTrack.firstChild);
        });
        const afterClones = vimaziSlides.map(cloneSlide);
        afterClones.forEach(clone => {
          vimaziTrack.appendChild(clone);
        });
        vimaziTrack.dataset.loopReady = 'true';
      }

      const beforeCloneCount = hasLoop ? totalSlides : 0;
      const firstOriginalIndex = beforeCloneCount;
      const lastOriginalIndex = firstOriginalIndex + totalSlides - 1;
      let currentIndex = firstOriginalIndex;

      const getLogicalIndex = () => {
        if (!totalSlides) return 0;
        const raw = currentIndex - firstOriginalIndex;
        const mod = raw % totalSlides;
        return mod < 0 ? mod + totalSlides : mod;
      };

      const clampIndex = () => {
        if (!hasLoop || !totalSlides) return;
        if (currentIndex > lastOriginalIndex) {
          currentIndex -= totalSlides;
        } else if (currentIndex < firstOriginalIndex) {
          currentIndex += totalSlides;
        } else {
          return;
        }
        vimaziTrack.style.transition = 'none';
        const offsetPx = offsetForIndex(currentIndex);
        vimaziTrack.style.transform = `translateX(-${offsetPx}px)`;
        void vimaziTrack.offsetWidth;
        vimaziTrack.style.transition = '';
      };

      const setIndex = (target, options = {}) => {
        const { animate = true } = options;
        if (animate && isAnimating) return;

        if (!slideWidthPx || !galleryWidth) measure();

        if (!animate) {
          vimaziTrack.style.transition = 'none';
        } else {
          isAnimating = true;
        }

        currentIndex = target;
        const offsetPx = offsetForIndex(currentIndex);
        vimaziTrack.style.transform = `translateX(-${offsetPx}px)`;

        if (!animate) {
          void vimaziTrack.offsetWidth;
          vimaziTrack.style.transition = '';
          return;
        }

        let finished = false;
        const finalize = event => {
          if (event && (event.target !== vimaziTrack || (event.propertyName && event.propertyName !== 'transform'))) return;
          if (finished) return;
          finished = true;
          vimaziTrack.removeEventListener('transitionend', finalize);
          isAnimating = false;
          clampIndex();
        };

        vimaziTrack.addEventListener('transitionend', finalize);
        setTimeout(finalize, 520);
      };

      const setLogical = (target, options = {}) => {
        if (!totalSlides) return;
        const normalized = ((target % totalSlides) + totalSlides) % totalSlides;
        const base = hasLoop ? firstOriginalIndex + normalized : normalized;
        setIndex(base, options);
      };

      const goNext = () => setIndex(currentIndex + 1);
      const goPrev = () => setIndex(currentIndex - 1);

      const stopAutoplay = () => {
        if (autoplayId) {
          clearInterval(autoplayId);
          autoplayId = null;
        }
      };

      const startAutoplay = () => {
        stopAutoplay();
        if (reduceMotion || totalSlides <= 1) return;
        autoplayId = setInterval(goNext, 4500);
      };

      const restartAutoplay = () => {
        if (reduceMotion) return;
        stopAutoplay();
        startAutoplay();
      };

      if (vimaziPrev) {
        vimaziPrev.addEventListener('click', () => {
          stopAutoplay();
          goPrev();
          restartAutoplay();
        });
      }

      if (vimaziNext) {
        vimaziNext.addEventListener('click', () => {
          stopAutoplay();
          goNext();
          restartAutoplay();
        });
      }

      const handleResize = () => {
        const preserve = getLogicalIndex();
        applyLayout();
        setLogical(preserve, { animate: false });
        startAutoplay();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('load', handleResize);

      vimaziGallery.addEventListener('mouseenter', stopAutoplay);
      vimaziGallery.addEventListener('mouseleave', startAutoplay);
      vimaziGallery.addEventListener('focusin', stopAutoplay);
      vimaziGallery.addEventListener('focusout', startAutoplay);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
      });

      applyLayout();
      setLogical(0, { animate: false });
      startAutoplay();
    }
  }

  /* --------------------------
     Contact and booking forms
     - Forms now post to a Google Apps Script web app.
     - Set `data-form-endpoint` on each form to the deployed `/exec` URL.
  -------------------------- */
  const contactForms = document.querySelectorAll('.contact-form');
  contactForms.forEach(form => {
    const phoneInput = form.querySelector("input[name='phone']");
    if (phoneInput) {
      phoneInput.setAttribute('autocomplete', 'tel');
      phoneInput.setAttribute('inputmode', 'tel');
    }

    const existingPatientRadios = form.querySelectorAll("input[name='existingPatient']");
    const newPatientFields = form.querySelector('[data-new-patient-fields]');
    if (existingPatientRadios.length && newPatientFields) {
      const controlledFields = newPatientFields.querySelectorAll('input, select, textarea, button');
      const requiredFields = newPatientFields.querySelectorAll('[data-new-patient-required]');
      const syncPatientDetails = () => {
        const selectedStatus = form.querySelector("input[name='existingPatient']:checked")?.value || '';
        const needsPatientDetails = selectedStatus === 'no';

        newPatientFields.hidden = !needsPatientDetails;
        newPatientFields.setAttribute('aria-hidden', String(!needsPatientDetails));
        controlledFields.forEach(field => {
          field.disabled = !needsPatientDetails;
        });
        requiredFields.forEach(field => {
          field.required = needsPatientDetails;
        });
      };

      syncPatientDetails();
      existingPatientRadios.forEach(radio => {
        radio.addEventListener('change', syncPatientDetails);
      });
    }

    const postcodeLookup = form.querySelector('[data-postcode-lookup]');
    if (postcodeLookup) {
      const postcodeInput = postcodeLookup.querySelector("input[name='postcode']");
      const lookupButton = postcodeLookup.querySelector('[data-postcode-button]');
      const status = form.querySelector('[data-postcode-status]');
      const addressResultsEl = postcodeLookup.querySelector('[data-address-results]');
      const addressLine1 = form.querySelector("input[name='addressLine1']");
      const addressLine2 = form.querySelector("input[name='addressLine2']");
      const city = form.querySelector("input[name='city']");
      let addressResults = [];

      const setPostcodeStatus = message => {
        if (status) status.textContent = message || '';
      };

      const setAddressPickerVisible = isVisible => {
        if (!addressResultsEl) return;
        addressResultsEl.hidden = !isVisible;
        if (!isVisible) {
          addressResultsEl.replaceChildren(new Option('Select address', ''));
          addressResults = [];
        }
      };

      const fillAddress = address => {
        if (!address) return;
        const town = String(address.town || '').trim();
        const postcode = String(address.postcode || postcodeInput?.value || '').trim().toUpperCase();
        const formattedParts = String(address.address || '')
          .split(',')
          .map(part => part.trim())
          .filter(Boolean);
        const withoutPostcode = formattedParts.filter(part => part.toUpperCase() !== postcode);
        const withoutTown = town
          ? withoutPostcode.filter(part => part.toLowerCase() !== town.toLowerCase())
          : withoutPostcode;
        const premise = [address.building_name, address.building_number]
          .map(part => String(part || '').trim())
          .filter(Boolean)
          .join(' ');
        const street = String(address.street || '').trim();

        const line1 = premise && street ? `${premise} ${street}` : (premise || withoutTown[0] || address.address || '');
        const line2 = withoutTown
          .filter(part => part.toLowerCase() !== String(line1).toLowerCase())
          .join(', ');

        if (addressLine1) {
          addressLine1.value = line1;
        }
        if (addressLine2) {
          addressLine2.value = line2;
        }
        if (city) {
          city.value = town || withoutPostcode[withoutPostcode.length - 2] || '';
        }
        if (postcodeInput && postcode) {
          postcodeInput.value = postcode;
        }
      };

      const formatAddressOption = address => {
        const postcode = String(address.postcode || '').trim().toUpperCase();
        return String(address.address || '')
          .split(',')
          .map(part => part.trim())
          .filter(part => part && part.toUpperCase() !== postcode)
          .join(', ');
      };

      const renderAddressResults = addresses => {
        if (!addressResultsEl) return;
        const defaultOption = new Option('Select address', '');
        const addressOptions = addresses.map((address, index) =>
          new Option(formatAddressOption(address), String(index))
        );
        addressResultsEl.replaceChildren(defaultOption, ...addressOptions);
        addressResultsEl.hidden = addressOptions.length === 0;
      };

      const fetchAddressLookup = postcode => new Promise((resolve, reject) => {
        const endpoint = (form.dataset.formEndpoint || form.getAttribute('action') || '').trim();
        if (!endpoint) {
          reject(new Error('Address lookup is not configured.'));
          return;
        }

        const callbackName = `addressLookupCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        const cleanup = () => {
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error('Address lookup timed out.'));
        }, 10000);

        window[callbackName] = payload => {
          window.clearTimeout(timeout);
          cleanup();
          resolve(payload);
        };

        script.onerror = () => {
          window.clearTimeout(timeout);
          cleanup();
          reject(new Error('Address lookup failed.'));
        };

        const url = new URL(endpoint, window.location.href);
        url.searchParams.set('action', 'addressLookup');
        url.searchParams.set('postcode', postcode);
        url.searchParams.set('callback', callbackName);
        script.src = url.toString();
        document.head.appendChild(script);
      });

      const lookupPostcode = async () => {
        if (!postcodeInput) return;
        const postcode = postcodeInput.value.replace(/\s+/g, '').trim();
        if (!postcode) {
          setPostcodeStatus('Enter a postcode to find the address.');
          postcodeInput.focus();
          return;
        }

        if (lookupButton) lookupButton.disabled = true;
        setPostcodeStatus('Finding address...');
        setAddressPickerVisible(false);

        try {
          const payload = await fetchAddressLookup(postcode);
          if (!payload || payload.ok === false) {
            throw new Error(payload && payload.error ? payload.error : 'Postcode not found.');
          }
          addressResults = Array.isArray(payload.addresses) ? payload.addresses : [];
          if (!addressResults.length) throw new Error('Postcode not found.');

          if (postcodeInput) postcodeInput.value = (payload.postcode || postcodeInput.value).toUpperCase();

          renderAddressResults(addressResults);

          if (addressResults.length === 1) {
            fillAddress(addressResults[0]);
            setAddressPickerVisible(false);
            setPostcodeStatus('Address added.');
            if (addressLine1) addressLine1.focus();
          } else {
            setPostcodeStatus(`${addressResults.length} addresses found. Please select yours.`);
            if (addressResultsEl) addressResultsEl.focus();
          }
        } catch (error) {
          setPostcodeStatus(error && error.message ? error.message : 'We could not find that postcode. Please enter the address manually.');
        } finally {
          if (lookupButton) lookupButton.disabled = false;
        }
      };

      if (lookupButton) {
        lookupButton.addEventListener('click', lookupPostcode);
      }
      if (postcodeInput) {
        postcodeInput.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            lookupPostcode();
          } else if (event.key === 'Escape') {
            setAddressPickerVisible(false);
          }
        });
      }
      if (addressResultsEl) {
        addressResultsEl.addEventListener('change', () => {
          const index = Number(addressResultsEl.value);
          if (!Number.isInteger(index) || !addressResults[index]) return;
          fillAddress(addressResults[index]);
          setAddressPickerVisible(false);
          setPostcodeStatus('Address added.');
          if (addressLine1) addressLine1.focus();
        });
      }
      document.addEventListener('click', event => {
        if (!postcodeLookup.contains(event.target)) {
          setAddressPickerVisible(false);
        }
      });
    }

    const pageUrlInput = form.querySelector("input[name='pageUrl']");
    if (pageUrlInput) {
      pageUrlInput.value = window.location.href;
    }

    const redirectInput = form.querySelector("input[name='redirectUrl']");
    if (redirectInput) {
      try {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
          redirectInput.value = new URL(redirectInput.value || 'success/', window.location.href).toString();
        }
      } catch { /* noop */ }
    }

    const serviceSelect = form.querySelector("select[name='service']");
    const surgeryPhotoField = form.querySelector('[data-surgery-photo-field]');
    const surgeryPhotoInput = form.querySelector('[data-surgery-photos]');
    const surgeryPhotoStatus = form.querySelector('[data-surgery-photo-status]');
    const photoConsentInput = form.querySelector('[data-photo-consent]');
    const consultationRequestedInput = form.querySelector('[data-consultation-requested]');
    const surgeryNotesInput = form.querySelector('[data-surgery-notes]');
    const surgeryNotesStatus = form.querySelector('[data-surgery-notes-status]');
    const syncSurgeryChoice = (changedInput) => {
      if (!changedInput?.checked) return;
      const otherInput = changedInput === photoConsentInput ? consultationRequestedInput : photoConsentInput;
      if (otherInput) otherInput.checked = false;
      if (surgeryPhotoStatus) {
        surgeryPhotoStatus.hidden = true;
        surgeryPhotoStatus.textContent = '';
      }
    };
    const normaliseSurgeryChoices = () => {
      // Browsers can restore both checkbox values from the previous page state.
      // Keep the first choice in that case and require the user to choose the
      // alternative explicitly.
      if (photoConsentInput?.checked && consultationRequestedInput?.checked) {
        consultationRequestedInput.checked = false;
      }
    };
    photoConsentInput?.addEventListener('change', () => syncSurgeryChoice(photoConsentInput));
    consultationRequestedInput?.addEventListener('change', () => syncSurgeryChoice(consultationRequestedInput));
    normaliseSurgeryChoices();
    window.addEventListener('pageshow', normaliseSurgeryChoices);
    const isSurgeryService = () => {
      const service = String(serviceSelect?.value || '').trim().toLowerCase();
      return service === 'foot & ankle surgery' || service === 'cosmetic foot surgery';
    };
    const syncSurgeryPhotoField = () => {
      const visible = isSurgeryService();
      if (surgeryPhotoField) surgeryPhotoField.hidden = !visible;
      if (surgeryPhotoInput) surgeryPhotoInput.disabled = !visible;
      if (surgeryNotesInput) {
        surgeryNotesInput.placeholder = visible ? 'Describe your problem' : 'Notes (optional)';
        surgeryNotesInput.setAttribute('aria-label', visible ? 'Describe your problem' : 'Notes (optional)');
      }
      if (!visible && surgeryPhotoStatus) {
        surgeryPhotoStatus.hidden = true;
        surgeryPhotoStatus.textContent = '';
      }
      if (!visible && surgeryPhotoInput) surgeryPhotoInput.value = '';
      if (!visible && photoConsentInput) photoConsentInput.checked = false;
      if (!visible && consultationRequestedInput) consultationRequestedInput.checked = false;
      if (!visible && surgeryNotesStatus) {
        surgeryNotesStatus.hidden = true;
        surgeryNotesStatus.textContent = '';
      }
    };
    if (serviceSelect) {
      serviceSelect.addEventListener('change', syncSurgeryPhotoField);
      syncSurgeryPhotoField();
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const endpoint = (form.dataset.formEndpoint || form.getAttribute('action') || '').trim();
      if (!endpoint) {
        alert('This form is not connected yet. Add your Google Apps Script web app URL to data-form-endpoint first.');
        return;
      }

      const phoneField = form.querySelector("input[name='phone']");
      if (phoneField) {
        phoneField.value = phoneField.value.trim();
      }

      const submitButton = form.querySelector("button[type='submit']");
      const surgeryFiles = isSurgeryService() ? Array.from(surgeryPhotoInput?.files || []) : [];
      if (isSurgeryService() && !String(surgeryNotesInput?.value || '').trim()) {
        if (surgeryNotesStatus) {
          surgeryNotesStatus.textContent = 'Please describe your problem to us';
          surgeryNotesStatus.hidden = false;
        }
        surgeryNotesInput?.focus();
        return;
      }
      const photoConsent = isSurgeryService() && Boolean(photoConsentInput?.checked);
      const consultationRequested = isSurgeryService() && Boolean(consultationRequestedInput?.checked);
      if (isSurgeryService() && photoConsent === consultationRequested) {
        if (surgeryPhotoStatus) {
          surgeryPhotoStatus.textContent = 'Please confirm that you are happy to send photos, or choose the free 20-minute consultation.';
          surgeryPhotoStatus.hidden = false;
        }
        photoConsentInput?.focus();
        return;
      }
      if (isSurgeryService() && surgeryFiles.length && !photoConsent) {
        if (surgeryPhotoStatus) {
          surgeryPhotoStatus.textContent = 'Please tick the photo consent box if you would like to send photos.';
          surgeryPhotoStatus.hidden = false;
        }
        photoConsentInput?.focus();
        return;
      }
      if (isSurgeryService() && (surgeryFiles.length > 3 || surgeryFiles.some(file => file.size > 5 * 1024 * 1024 || !/^image\/(?:jpeg|png|webp)$/i.test(file.type)))) {
        if (surgeryPhotoStatus) {
          surgeryPhotoStatus.textContent = 'Please choose up to 3 JPG, PNG or WebP images, no larger than 5 MB each.';
          surgeryPhotoStatus.hidden = false;
        }
        surgeryPhotoInput?.focus();
        return;
      }
      const redirectUrl = (form.querySelector("input[name='redirectUrl']")?.value || '').trim();
      let turnstileField = form.querySelector("input[name='cf-turnstile-response']");
      const turnstileWidget = form.querySelector('.cf-turnstile');
      const turnstileToken =
        (window.turnstile && turnstileWidget ? window.turnstile.getResponse(turnstileWidget) : '') ||
        (turnstileField ? turnstileField.value.trim() : '');

      if (!turnstileToken) {
        alert('Please complete the spam check before submitting.');
        return;
      }

      if (!turnstileField) {
        turnstileField = document.createElement('input');
        turnstileField.type = 'hidden';
        turnstileField.name = 'cf-turnstile-response';
        form.appendChild(turnstileField);
      }
      turnstileField.value = turnstileToken;
      form.action = endpoint;

      let photoAttachments = [];
      if (surgeryFiles.length) {
        try {
          photoAttachments = await Promise.all(surgeryFiles.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
              name: file.name,
              type: file.type,
              data: String(reader.result).split(',')[1] || ''
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })));
        } catch {
          if (surgeryPhotoStatus) {
            surgeryPhotoStatus.textContent = 'The photos could not be read. Please try again.';
            surgeryPhotoStatus.hidden = false;
          }
          return;
        }
      }

      const formData = new FormData(form);
      // Preserve compatibility with the current Apps Script email and Sheet:
      const body = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        body.append(key, typeof value === 'string' ? value : '');
      }
      if (photoAttachments.length) body.set('attachments', JSON.stringify(photoAttachments));
      if (isSurgeryService()) {
        body.set('photoConsent', photoConsent ? 'yes' : '');
        body.set('consultationRequested', consultationRequested ? 'yes' : '');
      }

      if (submitButton) {
        submitButton.dataset.originalText = submitButton.textContent.trim();
        submitButton.disabled = true;
        submitButton.classList.add('is-loading');
        submitButton.setAttribute('aria-busy', 'true');
        submitButton.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span>Sending...</span>';
      }

      try {
        await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          body
        });

        if (redirectUrl) {
          window.location.assign(redirectUrl);
          return;
        }

        alert("Thanks! We'll be in touch shortly.");
      } catch {
        alert('There was a problem sending the form. Please try again or call the clinic.');
        if (window.turnstile && turnstileWidget) {
          try { window.turnstile.reset(turnstileWidget); } catch { /* noop */ }
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove('is-loading');
          submitButton.removeAttribute('aria-busy');
          submitButton.textContent = submitButton.dataset.originalText || 'Submit';
        }
      }
    });
  });

  /* --------------------------
     Embed Google Map in placeholder
  -------------------------- */
  const mapContainer = document.querySelector('.map-placeholder');
  if (mapContainer) {
    const loadMap = () => {
      if (mapContainer.dataset.mapLoaded === 'true') return;
      mapContainer.dataset.mapLoaded = 'true';
    const iframe = document.createElement('iframe');
    iframe.title = 'Map: Station House Medical Centre';
    iframe.setAttribute('aria-label', 'Map showing Station House Medical Centre location');
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    // Include the Chingford address and coordinates so Google does not resolve
    // the shared clinic name to another UK "Station House" location on mobile.
    iframe.src = 'https://www.google.com/maps?q=Station+House+Medical+Centre,+66+Station+Road,+Chingford,+London+E4+7BA&ll=51.632601,0.006613&z=16&hl=en-GB&gl=GB&output=embed';
    // Replace placeholder content
    mapContainer.innerHTML = '';
    mapContainer.appendChild(iframe);
    };
    if ('IntersectionObserver' in window) {
      const mapObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          loadMap();
          mapObserver.disconnect();
        }
      }, { rootMargin: '400px 0px' });
      mapObserver.observe(mapContainer);
    } else {
      loadMap();
    }
  }

  /* --------------------------
     Before & Afters carousel (looping)
  -------------------------- */
  const baTrack = document.getElementById('ba-carousel');
  const baPrev = document.querySelector('.ba-prev');
  const baNext = document.querySelector('.ba-next');
  if (baTrack && baPrev && baNext) {
    let animating = false;
    const wrapper = baTrack.parentElement;
    const slideOffset = () => {
      const first = baTrack.children[0];
      const second = baTrack.children[1];
      if (!first || !second) return 0;
      const r1 = first.getBoundingClientRect();
      const r2 = second.getBoundingClientRect();
      return Math.round(r2.left - r1.left);
    };
    const getGap = () => {
      const cs = getComputedStyle(baTrack);
      const g = parseFloat(cs.gap || cs.columnGap || '0');
      return isNaN(g) ? 0 : g;
    };
    const cardWidth = () => {
      const dx = slideOffset();
      const gap = getGap();
      return Math.max(0, dx - gap);
    };
    const computePeek = () => {
      if (!wrapper) return 0;
      const ws = getComputedStyle(wrapper);
      const pl = parseFloat(ws.paddingLeft || '0');
      return isNaN(pl) ? 0 : Math.round(pl);
    };
    const shouldCenter = () => {
      if (!wrapper) return false;
      const first = baTrack.children[0];
      if (!first) return false;
      const trackRect = first.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const gap = getGap();
      // When the visible card already fills the wrapper (mobile stack), avoid peeking offset.
      return wrapperRect.width - trackRect.width <= gap + 2;
    };
    const baseline = () => {
      if (window.matchMedia && window.matchMedia('(max-width: 620px)').matches) return 0;
      if (shouldCenter()) return 0;
      const gap = getGap();
      const peek = computePeek();
      // Shift by gap + peek so the card edge (not the gap) is visible at both sides
      return -(Math.max(0, gap + peek));
    };
    const initFilm = () => {
      if (baTrack.children.length < 2) return;
      const last = baTrack.lastElementChild;
      const base = baseline();
      baTrack.style.transition = 'none';
      baTrack.insertBefore(last, baTrack.firstElementChild);
      baTrack.style.transform = `translateX(${base}px)`;
      void baTrack.offsetHeight;
      baTrack.style.transition = '';
    };
    initFilm();
    window.addEventListener('resize', () => {
      // Re-apply baseline peek without animation on resize
      if (animating) return;
      const base = baseline();
      baTrack.style.transition = 'none';
      baTrack.style.transform = `translateX(${base}px)`;
      void baTrack.offsetHeight;
      baTrack.style.transition = '';
    });

    const goNext = () => {
      if (animating) return;
      const first = baTrack.firstElementChild;
      if (!first) return;
      const dx = slideOffset();
      const base = baseline();
      animating = true;
      // Animate track left by one card width (plus the peek already applied)
      baTrack.style.transition = 'transform 320ms ease';
      baTrack.style.transform = `translateX(${base - dx}px)`;
      const onEnd = () => {
        baTrack.removeEventListener('transitionend', onEnd);
        // Reorder DOM and reset transform without animation
        baTrack.style.transition = 'none';
        baTrack.appendChild(first);
        baTrack.style.transform = `translateX(${base}px)`;
        // Force reflow, then restore transition
        void baTrack.offsetHeight;
        baTrack.style.transition = '';
        animating = false;
      };
      baTrack.addEventListener('transitionend', onEnd);
      // Fallback in case transitionend doesn't fire
      setTimeout(onEnd, 420);
    };

    const goPrev = () => {
      if (animating) return;
      const last = baTrack.lastElementChild;
      if (!last) return;
      const dx = slideOffset();
      const base = baseline();
      animating = true;
      // Instantly position track one card left, then animate back to 0
      baTrack.style.transition = 'none';
      baTrack.insertBefore(last, baTrack.firstElementChild);
      baTrack.style.transform = `translateX(${base - dx}px)`;
      // Next frame, animate to 0
      requestAnimationFrame(() => {
        baTrack.style.transition = 'transform 320ms ease';
        baTrack.style.transform = `translateX(${base}px)`;
        const onEnd = () => {
          baTrack.removeEventListener('transitionend', onEnd);
          baTrack.style.transition = '';
          animating = false;
        };
        baTrack.addEventListener('transitionend', onEnd);
        setTimeout(onEnd, 420);
      });

    };
    baNext.addEventListener('click', goNext);
    baPrev.addEventListener('click', goPrev);
  }

});

/* ======================================
   GA4 helpers: manual page_view tracking
   ====================================== */
function trackPageView() {
  if (typeof window.gtag !== 'function') return; // if GA not ready, do nothing
  const page_location = window.location.href;
  const page_path = window.location.pathname + window.location.search + window.location.hash;
  const page_title = document.title;
  window.gtag('event', 'page_view', {
    page_location,
    page_path,
    page_title
  });
}

(function hookSpaNavigation() {
  const fire = () => {
    // If you want to ignore pure hash changes, you could guard here.
    // Example: if (location.hash) return;
    setTimeout(trackPageView, 0);
  };

  ['pushState', 'replaceState'].forEach((method) => {
    const orig = history[method];
    history[method] = function () {
      const ret = orig.apply(this, arguments);
      fire();
      return ret;
    };
  });

  window.addEventListener('popstate', fire);
})();

function loadGoogleAnalytics(id) {
  if (window.__gaLoaded) return;        // guard
  window.__gaLoaded = true;

  const s = document.createElement('script');
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.async = true;
  document.head.appendChild(s);

  s.onload = () => {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);} // function declaration for hoisting
    window.gtag = gtag;
    gtag('js', new Date());
    // Disable automatic page_view; we will send them manually
    gtag('config', id, { send_page_view: false });
    // Send initial page_view once GA is ready
    trackPageView();
  };
}

const FAC_GA_MEASUREMENT_ID = 'G-1PHVDX2CCK';
const FAC_CONSENT_KEY = 'fac-consent-v1';

function readFacConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(FAC_CONSENT_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function saveFacConsent(analytics) {
  const value = { essential: true, analytics: Boolean(analytics), savedAt: new Date().toISOString() };
  try { localStorage.setItem(FAC_CONSENT_KEY, JSON.stringify(value)); } catch { /* storage unavailable */ }
  return value;
}

function initFacConsentManager() {
  const existing = readFacConsent();
  if (existing) {
    if (existing.analytics) loadGoogleAnalytics(FAC_GA_MEASUREMENT_ID);
    return;
  }

  const banner = document.createElement('section');
  banner.className = 'fac-consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie and data consent');
  banner.innerHTML = `
    <div class="fac-consent-banner-copy">
      <strong>Cookies and your data</strong>
      <p>We use essential storage to keep the website and chatbot working. With your permission, Google Analytics helps us understand how visitors use the site. Chat messages are sent to OpenAI only when you agree in the chatbot.</p>
    </div>
    <div class="fac-consent-banner-actions">
      <button type="button" class="fac-consent-button fac-consent-essential">Essential only</button>
      <button type="button" class="fac-consent-button fac-consent-accept">Accept analytics</button>
    </div>
  `;
  document.body.appendChild(banner);

  const finish = (analytics) => {
    saveFacConsent(analytics);
    if (analytics) loadGoogleAnalytics(FAC_GA_MEASUREMENT_ID);
    banner.classList.add('fac-consent-banner-hidden');
    window.setTimeout(() => banner.remove(), 220);
  };
  banner.querySelector('.fac-consent-essential').addEventListener('click', () => finish(false));
  banner.querySelector('.fac-consent-accept').addEventListener('click', () => finish(true));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFacConsentManager, { once: true });
} else {
  initFacConsentManager();
}

















// Load appointment help independently of the page navigation and booking scripts.
(() => {
  const script = document.currentScript;
  if (!script || document.querySelector('[data-fac-assistant-loader]')) return;
  const siteRoot = new URL('.', script.src);
  const style = document.createElement('link');
    style.rel = 'stylesheet'; style.href = new URL('assistant/assistant.css?v=19', siteRoot);
  document.head.appendChild(style);
  const assistant = document.createElement('script');
    assistant.src = new URL('assistant/assistant.js?v=42', siteRoot);
  assistant.dataset.facAssistantLoader = 'true';
  assistant.defer = true;
  const load = () => document.body.appendChild(assistant);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true});
  else load();
})();








