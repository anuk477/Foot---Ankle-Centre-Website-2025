document.addEventListener('DOMContentLoaded', () => {

  // Clean URLs in address bar: hide .html when pages are served
  // Works on initial load; avoid for file:// protocol to prevent oddities
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
      // Strip '.html' at end of path (e.g., procedures/toe-shortening.html)
      else if (/\.html$/i.test(pathname)) {
        const clean = pathname.replace(/\.html$/i, '');
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
  const allNavLinks = document.querySelectorAll('nav a, #mobile-menu a, #procedures-menu a, #locations-menu a');
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
      // Give layout a tick, then scroll honoring scroll-margin-top
      setTimeout(() => {
        try { targetEl.scrollIntoView({ behavior: 'auto', block: 'start' }); }
        catch { targetEl.scrollIntoView(true); }
      }, 0);
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

  // Toggle “Procedures” dropdown on click
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

  // Toggle “Locations” dropdown on click
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
          const done = () => { if (!navigated) { navigated = true; go(); } };
          fadeEl.addEventListener('transitionend', done, { once: true });
          setTimeout(done, 280); // fallback
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
        targetEl.scrollIntoView({ behavior: 'smooth' });

        // Update active state: turn clicked link blue
        allNavLinks.forEach(a => a.removeAttribute('aria-current'));
        // Prefer setting on top nav, fall back to the clicked element
        const topNavMatch = document.querySelector(`nav a[href='#${targetId}']`);
        (topNavMatch || link).setAttribute('aria-current', 'page');

        // Close mobile menu if open
        if (panel && panel.classList.contains('open')) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden', 'true');
          toggle.setAttribute('aria-expanded', 'false');
        }
        // Close dropdown menus if navigating elsewhere
        if (typeof closeProceduresMenu === 'function' && targetId !== 'procedures') closeProceduresMenu();
        if (typeof closeLocationsMenu === 'function' && targetId !== 'locations') closeLocationsMenu();
        // Close mobile submenu when navigating
        if (mobileProcTrigger && mobileProcPanel) { mobileCloseSub(); }
        if (mobileLocTrigger && mobileLocPanel) { mobileCloseLocSub(); }
      }
      // If no target on this page, do not preventDefault and let browser handle
    }, { capture: true });
  });

  /* --------------------------
     Scroll spy: highlight nav on scroll
  -------------------------- */
  (function initScrollSpy() {
    const headerEl = document.querySelector('header');
    const headerOffset = () => (headerEl ? headerEl.offsetHeight : 0) + 8; // small buffer

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

    // Cache section positions (recompute on resize)
    let positions = [];
    const computePositions = () => {
      positions = sections.map(({ id, el }) => ({ id, top: Math.max(0, el.offsetTop) }));
      // Ensure sorted by top asc
      positions.sort((a, b) => a.top - b.top);
    };
    computePositions();
    window.addEventListener('resize', computePositions);

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
  const locations = ['Chingford', 'Wanstead', 'Westcliff-on-sea'];
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
      stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const dot = document.createElement('span');
      dot.setAttribute('aria-hidden','true');
      dot.textContent = '·';
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
    const speed = 0.4; // px per frame (~24px/sec at 60fps) as originally
    let paused = false;
    // Mobile interaction state
    let userInteracting = false;
    let idleTimer = null;
    const idleDelay = 2000; // resume 2s after last interaction

    const step = () => {
      if (!paused) {
        // Advance using fixed per-frame increment as originally
        const half = track.scrollWidth / 2;
        scrollPos += speed;
        if (half > 0 && scrollPos >= half) scrollPos = 0;
        track.scrollLeft = scrollPos;
      }
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
          const galleryCenter = galleryWidth / 2;
          return layoutCenter - galleryCenter;
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
     Contact form alert (demo only)
     - Do NOT block forms that post to a real endpoint (e.g., FormSubmit)
  -------------------------- */
  const contactForms = document.querySelectorAll('.contact-form');
  contactForms.forEach(form => {
    const action = (form.getAttribute('action') || '').trim();
    const isRealAction = /^https?:\/\//i.test(action) || action.startsWith('/');
    if (!isRealAction) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        alert("Thanks! We'll be in touch shortly.");
      });
    }

    // If using FormSubmit with CAPTCHA, ensure `_next` is an absolute URL
    // so the service can redirect back to this site after verification.
    if (/^https?:\/\/[^\s]*formsubmit\.co/i.test(action)) {
      // Enforce POST at runtime as a safeguard
      if ((form.getAttribute('method') || '').toUpperCase() !== 'POST') {
        form.setAttribute('method', 'POST');
      }

      const nextInput = form.querySelector("input[name='_next']");
      if (nextInput) {
        try {
          // Only convert if running under http(s); file:// cannot be redirected to
          if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            const absolute = new URL(nextInput.value || 'success/', window.location.href).toString();
            nextInput.value = absolute;
          }
        } catch { /* noop */ }
      }
    }
  });

  /* --------------------------
     Embed Google Map in placeholder
  -------------------------- */
  const mapContainer = document.querySelector('.map-placeholder');
  if (mapContainer) {
    const iframe = document.createElement('iframe');
    iframe.title = 'Map: Station House Medical Centre';
    iframe.setAttribute('aria-label', 'Map showing Station House Medical Centre location');
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    // Use a query-based embed for broad compatibility
    iframe.src = 'https://www.google.com/maps?q=Station+House+Medical+Centre&output=embed';
    // Replace placeholder content
    mapContainer.innerHTML = '';
    mapContainer.appendChild(iframe);
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
    const baseline = () => {
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

// TODO: Replace with your GA4 Measurement ID if needed
loadGoogleAnalytics('G-1PHVDX2CCK');






