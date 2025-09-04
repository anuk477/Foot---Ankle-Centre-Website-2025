document.addEventListener('DOMContentLoaded', () => {

  // Clean URLs in address bar: hide .html when pages are served
  // Works on initial load; avoid for file:// protocol to prevent oddities
  try {
    const { protocol, pathname, search, hash } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      // Strip trailing '/index.html' to '/'
      if (/\/index\.html$/i.test(pathname)) {
        const clean = pathname.replace(/index\.html$/i, '');
        history.replaceState(null, '', clean + search + hash);
      }
      // Strip '.html' at end of path (e.g., procedures/toe-shortening.html)
      else if (/\.html$/i.test(pathname)) {
        const clean = pathname.replace(/\.html$/i, '');
        history.replaceState(null, '', clean + search + hash);
      }
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

  // Detect iOS (including iPadOS masquerading as Mac) for telemetry/class only
  const isIOS = (() => {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const iOSDevice = /iP(hone|od|ad)/.test(platform);
    const iPadOS = ua.includes('Mac') && 'ontouchend' in document; // iPadOS reports as Mac
    return iOSDevice || iPadOS;
  })();
  if (isIOS) document.documentElement.classList.add('is-ios');

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
      }
    });

    // Close via "X" button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        if (mobileProcTrigger && mobileProcPanel) {
          mobileCloseSub();
        }
      });
    }
  }

  /* --------------------------
     Smooth scroll for nav links
  -------------------------- */
  const allNavLinks = document.querySelectorAll('nav a, #mobile-menu a');
  const proceduresTrigger = document.getElementById('procedures-trigger');
  const proceduresMenu = document.getElementById('procedures-menu');

  // Clicking the brand logo to go to top should clear any active nav state
  const brandLinks = document.querySelectorAll('a.brand');
  brandLinks.forEach(brand => {
    brand.addEventListener('click', (e) => {
      const href = brand.getAttribute('href') || '';
      // Only intercept same-page top jump (href="#")
      if (href === '#') {
        e.preventDefault();
        // Clear active state from all nav links
        allNavLinks.forEach(a => a.removeAttribute('aria-current'));
        // Close Procedures dropdown if open
        if (typeof closeProceduresMenu === 'function') closeProceduresMenu();
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
    const topNavMatch = document.querySelector(`nav a[href="${hash}"]`);
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

  // Toggle “Procedures” dropdown on click
  if (proceduresTrigger && proceduresMenu) {
    proceduresTrigger.addEventListener('click', e => {
      e.preventDefault();
      const isOpen = proceduresMenu.classList.contains('open');
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
  }

  allNavLinks.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href') || '';
      const isHashOnly = href.startsWith('#');

      // Cross-page links: fade-out then navigate
      if (!isHashOnly) {
        if (!link.target && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const go = () => { window.location.href = href; };
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

      // Let the dedicated handler manage Procedures
      if (targetId === 'procedures' && link === proceduresTrigger) {
        e.preventDefault();
        return;
      }

      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });

        // Update active state: turn clicked link blue
        allNavLinks.forEach(a => a.removeAttribute('aria-current'));
        // Prefer setting on top nav, fall back to the clicked element
        const topNavMatch = document.querySelector(`nav a[href="#${targetId}"]`);
        (topNavMatch || link).setAttribute('aria-current', 'page');

        // Close mobile menu if open
        if (panel && panel.classList.contains('open')) {
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden', 'true');
          toggle.setAttribute('aria-expanded', 'false');
        }
        // Close procedures menu if navigating elsewhere
        if (targetId !== 'procedures') {
          closeProceduresMenu();
        }
        // Close mobile submenu when navigating
        if (mobileProcTrigger && mobileProcPanel) {
          mobileCloseSub();
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
    const headerOffset = () => (headerEl ? headerEl.offsetHeight : 0) + 8; // small buffer

    // Map top nav links to on-page section elements
    const topNavLinks = Array.from(document.querySelectorAll('header nav a[href^="#"]'))
      // Exclude items that are not real sections (e.g. procedures dropdown)
      .filter(a => {
        const href = a.getAttribute('href') || '';
        return href.length > 1 && href !== '#procedures';
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
      const top = document.querySelector(`header nav a[href="#${id}"]`);
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
    // Animate to content height
    mobileProcPanel.style.maxHeight = mobileProcPanel.scrollHeight + 'px';
    mobileProcPanel.style.opacity = '1';
    mobileProcTrigger.setAttribute('aria-expanded', 'true');
    // iOS: initialize custom moving scrollbar
    ensureIOSScrollbar();
  }
  function mobileCloseSub() {
    if (!mobileProcTrigger || !mobileProcPanel) return;
    // Animate collapse first
    mobileProcPanel.style.maxHeight = '0px';
    mobileProcPanel.style.opacity = '0';
    mobileProcTrigger.setAttribute('aria-expanded', 'false');
    const onEnd = () => {
      mobileProcPanel.classList.remove('open');
      mobileProcPanel.hidden = true;
      mobileProcPanel.removeEventListener('transitionend', onEnd);
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
     Animated clinic locations in hero
  -------------------------- */
  const locations = ["Chingford", "Wanstead", "Westcliff-on-sea"];
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
    const speed = 0.4; // pixels per frame (~24px/sec at 60fps)
    let paused = false;

    const step = () => {
      if (!paused) {
        scrollPos += speed;
        // Reset seamlessly at halfway (after original content width)
        if (scrollPos >= track.scrollWidth / 2) {
          scrollPos = 0;
        }
        track.scrollLeft = scrollPos;
      }
      requestAnimationFrame(step);
    };

    // Pause on hover/focus for readability
    track.addEventListener('mouseenter', () => paused = true);
    track.addEventListener('mouseleave', () => paused = false);
    track.addEventListener('focusin', () => paused = true);
    track.addEventListener('focusout', () => paused = false);

    // Keep position consistent on resize
    window.addEventListener('resize', () => {
      // Clamp to current half-width loop
      scrollPos = track.scrollLeft % (track.scrollWidth / 2);
    });

    requestAnimationFrame(step);
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

      const nextInput = form.querySelector('input[name="_next"]');
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
