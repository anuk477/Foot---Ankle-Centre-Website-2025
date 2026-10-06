(() => {
  'use strict';

  const root = new URL('../', document.currentScript.src);

  const endpoint =
    'https://ckg04u58w5.execute-api.eu-west-2.amazonaws.com/default/fac-chatbot-backend';

  const turnstileSiteKey = '1x00000000000000000000BB';

  const bookingEndpoint =
    'https://script.google.com/macros/s/AKfycbw3MGPbu32VMJp27QRKoJVrTbhHVCxMYVNv2zqMHcz11RWYqfj1I2eQP8OQb7CGSb3Kmg/exec';

  const bookingTurnstileSiteKey = '0x4AAAAAADAhLsC_5o7pYfM_';

  const storageKey = 'fac-appointment-preferences';
  const chatHistoryKey = 'fac-chat-history-v1';
  const bookingStateKey = 'fac-booking-state-v1';
  const maxChatMessages = 60;

  let knowledge;
  let aiReady = false;
  let busy = false;
  let generation = 0;
  let controller;
  let pendingSuggestedService = '';
  let pendingContactQuestion = '';

  let turnstileLoaded = false;
  let turnstileWidgetId = null;
  let currentTurnstileToken = null;
  let pendingTurnstileResolve = null;
  let pendingTurnstileReject = null;
  let bookingTurnstileWidgetId = null;
  let bookingTurnstileToken = '';
  let panelCloseTimer = null;
  let restoringChatHistory = false;

  const host = document.createElement('aside');
  host.className = 'fac-assistant';
  host.setAttribute('aria-label', 'Appointment help');

  host.innerHTML = `
    <button class="fac-teaser" type="button" aria-label="Open chat: Unsure about booking? Chat now">Unsure about booking? Chat now</button>
    <button class="fac-launch" aria-label="Help with appointments" aria-expanded="false" aria-controls="fac-assistant-panel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M20 11.5a8 8 0 0 1-8 8H5l-4 3v-11a9 9 0 0 1 19 0Z"/>
        <path d="M6 10h9M6 14h6"/>
      </svg>
      <span>Help with appointments</span>
    </button>

    <section id="fac-assistant-panel" class="fac-panel" role="dialog" aria-labelledby="fac-title" hidden>
      <div class="fac-head">
        <div>
          <strong id="fac-title">Your appointment assistant</strong>
          <small>Foot &amp; Ankle Centre · Automated help</small>
        </div>
        <button class="fac-close" aria-label="Close appointment assistant">×</button>
      </div>

      <div class="fac-body">
        <div class="fac-log" role="log" aria-live="polite" aria-relevant="additions"></div>
        <div class="fac-message fac-typing" role="status" hidden>
          <span class="fac-typing-dot" aria-hidden="true"></span>
          <span class="fac-typing-dot" aria-hidden="true"></span>
          <span class="fac-typing-dot" aria-hidden="true"></span>
          <span class="fac-sr-only">Assistant is preparing a reply.</span>
        </div>
        <div class="fac-controls"></div>
      </div>

      <div class="fac-foot">
        <p class="fac-status" role="status" hidden></p>

        <div class="fac-ai">
          <label class="fac-consent" hidden>
            <input type="checkbox">
            <span>I agree to send my messages to OpenAI.</span>
          </label>

          <form class="fac-compose">
            <input
              aria-label="Your appointment question"
              maxlength="800"
              placeholder="Type your question…"
              required
              autocomplete="off"
            >
            <button type="submit">Send</button>
          </form>

          <div class="fac-turnstile" aria-hidden="true"></div>

        </div>

        <div class="fac-toolbar">
          <button class="fac-text-button fac-reset">Clear chat</button>
          <button class="fac-text-button fac-guide">Appointment guide</button>
          <a class="fac-text-button" href="tel:+442085244516">Call reception</a>
        </div>

        <button class="fac-text-button fac-retry" hidden>
          Retry chat connection
        </button>

        <details class="fac-info">
          <summary>Safety &amp; privacy</summary>
          <div>
            <p>Please leave personal details and detailed medical history for the request form.</p>
            <p>
              This chat is not monitored by reception. For medical help now, call
              <a href="tel:111">NHS 111</a>; in a life-threatening emergency call
              <a href="tel:999">999</a>.
            </p>
            <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noopener">
              How OpenAI handles data
            </a>
          </div>
        </details>
      </div>
    </section>
  `;

  document.body.appendChild(host);

  const $ = (selector) => host.querySelector(selector);

  const panel = $('.fac-panel');
  const launch = $('.fac-launch');
  const teaser = $('.fac-teaser');
  const log = $('.fac-log');
  const typing = $('.fac-typing');
  const controls = $('.fac-controls');
  const body = $('.fac-body');
  const status = $('.fac-status');
  const consent = $('.fac-consent input');
  const input = $('.fac-compose input');
  const send = $('.fac-compose button');
  const turnstileContainer = $('.fac-turnstile');

  function setStatus(text = '') {
    status.textContent = text;
    status.hidden = !text;
  }

  function cleanAssistantText(text) {
    return String(text)
      .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
      .replace(/__([\s\S]*?)__/g, '$1')
      .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
      .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1$2');
  }

  function siteUrl(path) {
    const url = new URL(path, root);

    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      if (url.pathname === '/booking') {
        url.pathname = '/booking.html';
      } else if (!url.pathname.endsWith('.html') && /^\/insurance\/[^/]+$/.test(url.pathname)) {
        url.pathname += '.html';
      }
    }

    return url;
  }

  function message(text, user = false, persist = true) {
    const p = document.createElement('p');
    p.className = 'fac-message' + (user ? ' fac-message-user' : '');
    p.textContent = user ? text : cleanAssistantText(text);
    log.appendChild(p);
    if (persist && !restoringChatHistory) saveChatHistory();
    body.scrollTop = body.scrollHeight;
  }

  function scrollToLatestAssistantMessage() {
    const messages = log.querySelectorAll('.fac-message:not(.fac-message-user)');
    const latest = messages[messages.length - 1];
    if (!latest) return;
    body.scrollTop = Math.max(0, latest.offsetTop - 12);
  }

  function botMessage(text, delay = 500) {
    busy = true;
    updateComposer();
    return new Promise((resolve) => {
      window.setTimeout(() => {
        busy = false;
        updateComposer();
        message(text);
        resolve();
      }, delay);
    });
  }

  function readChatHistory() {
    try {
      const entries = JSON.parse(sessionStorage.getItem(chatHistoryKey) || '[]');
      return Array.isArray(entries)
        ? entries.filter((entry) => entry && typeof entry.text === 'string' && typeof entry.user === 'boolean').slice(-maxChatMessages)
        : [];
    } catch {
      return [];
    }
  }

  function saveChatHistory() {
    const entries = Array.from(log.querySelectorAll('.fac-message')).map((element) => ({
      text: element.textContent || '',
      user: element.classList.contains('fac-message-user')
    })).slice(-maxChatMessages);
    try {
      sessionStorage.setItem(chatHistoryKey, JSON.stringify(entries));
    } catch {
      // Browsers may disable session storage; the chat remains usable in-memory.
    }
  }

  function restoreChatHistory() {
    const entries = readChatHistory();
    if (!entries.length) return false;
    restoringChatHistory = true;
    entries.forEach((entry) => message(entry.text, entry.user));
    restoringChatHistory = false;
    return true;
  }

  function clearControls() {
    clearBookingVerification();
    controls.replaceChildren();
  }

  function clearBookingVerification() {
    bookingTurnstileToken = '';

    if (
      bookingTurnstileWidgetId !== null &&
      window.turnstile?.remove
    ) {
      try {
        window.turnstile.remove(bookingTurnstileWidgetId);
      } catch {
        // The containing step may already have been removed.
      }
    }

    bookingTurnstileWidgetId = null;
  }

  function setBookingMode(active) {
    host.classList.toggle('fac-booking-active', active);
  }

  function saveBookingState(step, choice = {}) {
    try { sessionStorage.setItem(bookingStateKey, JSON.stringify({ step, choice })); } catch { /* storage unavailable */ }
  }

  function readBookingState() {
    try { return JSON.parse(sessionStorage.getItem(bookingStateKey) || 'null'); } catch { return null; }
  }

  function clearBookingState() {
    try { sessionStorage.removeItem(bookingStateKey); } catch { /* storage unavailable */ }
  }

  function restoreBookingState() {
    const state = readBookingState();
    if (!state || !state.step) return;
    setBookingMode(true);
    if (state.step === 'location') chooseLocation(state.choice?.service || '');
    else if (state.step === 'date') collectPreferredDate(state.choice?.service || '', state.choice?.location || '');
    else if (state.step === 'name') collectName({ service: state.choice?.service || '', location: state.choice?.location || '', date: state.choice?.date || '' }, {});
    else chooseService();
  }

  function isBookingRequest(text) {
    const asksForInformation = /\b(?:info(?:rmation)?|price|pricing|cost|costs|how much|tell me about|what is|what are|do you offer)\b/i.test(text);
    const explicitlyBooks = /\b(?:book|booking|arrange|schedule|request an appointment|make an appointment)\b/i.test(text);
    if (asksForInformation && !explicitlyBooks) return false;
    const asksToBook = /\b(?:book|booking|arrange|schedule|request)\b/i.test(text);
    const namesService = /\b(?:appointment|consultation|visit|physiotherapy|physio|podiatry|chiropody|gait analysis|biomechanics|insoles|orthotics|shockwave|acupuncture|cupping|dry needling|electrotherapy|rehabilitation|massage|verruca|corn|fungal nail|ingrowing toenail|bunion|hammertoe|flat foot|surgery|surgical|cosmetic foot|injection|x-ray)\b/i.test(text);
    return (
      /\b(?:book|booking|arrange|schedule|request|need|want|make)\b.{0,50}\b(?:appointment|consultation|visit)\b/i.test(text) ||
      /\b(?:appointment|consultation|visit)\b.{0,50}\b(?:book|booking|arrange|schedule|request|need|want|make)\b/i.test(text) ||
      (asksToBook && namesService)
    );
  }

  function isUnknownReply(reply) {
    return !serviceFromText(reply) && /(?:i (?:do not|don't|cannot|can't) (?:have|answer|confirm)|not (?:listed|available|sure)|unable to answer|please contact reception|ask reception|reception can (?:confirm|advise))/i.test(reply);
  }

  function surgeryTypeFromText(text) {
    const normalised = String(text || '')
      .toLocaleLowerCase()
      .replace(/[–—-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const matches = [
      { terms: ['webbed toe', 'webbed toes', 'syndactyly', 'joined toes', 'partially joined toes', 'fused toes'], label: 'Webbed toe separation' },
      { terms: ['corn removal surgery'], label: 'Corn removal surgery' },
      { terms: ['bunion'], label: 'Bunion correction' },
      { terms: ['hammertoe', 'hammer toe'], label: 'Hammertoe correction' },
      { terms: ['flat foot', 'flat feet', 'fallen arch', 'fallen arches'], label: 'Flat foot correction' },
      { terms: ['lumps and bumps', 'lump', 'bump', 'ganglion', 'cyst'], label: 'Lumps and bumps removal' },
      { terms: ['toe shortening', 'shorten my toe', 'long toe', 'long toes'], label: 'Scar-free toe shortening' },
      { terms: ['ingrowing toenail', 'ingrown toenail', 'nail surgery', 'nail removal'], label: 'Ingrowing toenail removal' },
      { terms: ['foot botox'], label: 'Foot Botox' },
      { terms: ['cosmetic foot surgery', 'cosmetic surgery'], label: 'Cosmetic foot surgery' }
    ];

    const match = matches.find(({ terms }) => terms.some(term => normalised.includes(term)));
    return match ? match.label : 'Foot surgery';
  }

  function startContactRequest(question, requiresPhotos = false, existingSurgeryType = '', existingPhotoConsent = false, existingConsultationRequested = false) {
    setBookingMode(true);
    pendingContactQuestion = question || '';
    message('I can send a specialised request to reception. What is your full name?');
    clearControls();
    const form = document.createElement('form');
    form.className = 'fac-booking-step';
    form.innerHTML = `
      <label>Full name<input name="name" autocomplete="name" required maxlength="200"></label>
      <label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label>
      <label>Phone<input name="phone" type="tel" autocomplete="tel" required maxlength="80"></label>
      ${requiresPhotos ? '<label>Surgery type or procedure being considered<input name="surgeryType" autocomplete="off" required maxlength="200"></label>' : ''}
      <label>${requiresPhotos ? 'Notes for reception' : 'Message for reception'}<textarea name="message" rows="4" maxlength="2300" required></textarea></label>
      <label>Photos (optional)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
      ${requiresPhotos ? '<label class="fac-choice"><input name="photoConsent" type="checkbox" value="yes"> I am happy to send photos of my feet for examination.</label><label class="fac-choice"><input name="consultationRequested" type="checkbox" value="yes"> I would prefer a free 20-minute consultation so my feet can be examined in person.</label>' : ''}
      <p class="fac-note">${requiresPhotos ? 'Photos are optional. Please select one of the options above.' : 'Attach up to 3 clear photos (5 MB each).'} Please do not include people or documents.</p>
      <p class="fac-note">Reception will reply using the details you provide. Please do not include a detailed medical history.</p>
      <button type="submit" class="fac-option fac-primary">Review request</button>
    `;
    if (requiresPhotos && form.elements.surgeryType) {
      form.elements.surgeryType.value = existingSurgeryType || surgeryTypeFromText(question);
    }
    if (requiresPhotos) {
      const photoConsentInput = form.elements.photoConsent;
      const consultationRequestedInput = form.elements.consultationRequested;
      const syncSurgeryChoice = (changedInput) => {
        if (!changedInput.checked) return;
        const otherInput = changedInput === photoConsentInput ? consultationRequestedInput : photoConsentInput;
        otherInput.checked = false;
      };
      photoConsentInput.addEventListener('change', () => syncSurgeryChoice(photoConsentInput));
      consultationRequestedInput.addEventListener('change', () => syncSurgeryChoice(consultationRequestedInput));
      form.elements.photoConsent.checked = existingPhotoConsent;
      form.elements.consultationRequested.checked = existingConsultationRequested;
      if (existingPhotoConsent && existingConsultationRequested) {
        form.elements.consultationRequested.checked = false;
      }
    }
    form.elements.message.value = '';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (requiresPhotos && !form.elements.message.value.trim()) {
        setStatus('Please describe your problem to us');
        form.elements.message.focus();
        return;
      }
      if (!form.reportValidity()) return;
      const photos = Array.from(form.elements.photos.files || []);
      const photoConsent = requiresPhotos && Boolean(form.elements.photoConsent?.checked);
      const consultationRequested = requiresPhotos && Boolean(form.elements.consultationRequested?.checked);
      if (requiresPhotos && photoConsent === consultationRequested) {
        setStatus('Please confirm that you are happy to send photos, or choose the free 20-minute consultation.');
        form.elements.photoConsent?.focus();
        return;
      }
      if (requiresPhotos && photos.length && !photoConsent) {
        setStatus('Please tick the photo consent box if you would like to send photos.');
        form.elements.photoConsent?.focus();
        return;
      }
      if (photos.length > 3 || photos.some((file) => file.size > 5 * 1024 * 1024 || !/^image\/(?:jpeg|png|webp)$/i.test(file.type))) {
        setStatus('Please choose up to 3 JPG, PNG or WebP images, no larger than 5 MB each.');
        return;
      }
      reviewContact({ name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(), surgeryType: form.elements.surgeryType?.value.trim() || '', message: form.elements.message.value.trim(), photos, photoConsent, consultationRequested, requiresPhotos });
    });
    controls.appendChild(form);
    form.elements.name.focus();
    scrollToLatestAssistantMessage();
  }

  async function reviewContact(details) {
    message('Please check your request before sending it.');
    clearControls();
    const review = document.createElement('div');
    review.className = 'fac-booking-review';
    const list = document.createElement('dl');
    addReviewRow(list, 'Name', details.name); addReviewRow(list, 'Email', details.email); addReviewRow(list, 'Phone', details.phone); addReviewRow(list, 'Surgery type', details.surgeryType); addReviewRow(list, 'Message', details.message); addReviewRow(list, 'Photo consent', details.photoConsent ? 'Yes' : 'No'); addReviewRow(list, 'Consultation requested', details.consultationRequested ? 'Yes' : 'No'); addReviewRow(list, 'Photos', details.photos?.length ? details.photos.map((file) => file.name).join(', ') : 'None');
    review.appendChild(list);
    const verification = document.createElement('div'); verification.className = 'fac-booking-turnstile'; review.appendChild(verification);
    const verificationStatus = document.createElement('p'); verificationStatus.className = 'fac-note fac-booking-status'; verificationStatus.setAttribute('role', 'status'); review.appendChild(verificationStatus);
    const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'fac-option fac-primary'; submit.textContent = 'Send request to reception'; submit.disabled = true; review.appendChild(submit);
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'fac-option'; edit.textContent = 'Change details'; edit.addEventListener('click', () => startContactRequest(details.message, details.requiresPhotos, details.surgeryType, details.photoConsent, details.consultationRequested)); review.appendChild(edit);
    controls.appendChild(review); scrollToLatestAssistantMessage();
    try {
      await loadTurnstile();
      bookingTurnstileWidgetId = window.turnstile.render(verification, { sitekey: bookingTurnstileSiteKey, theme: 'light', callback: (token) => { bookingTurnstileToken = token; submit.disabled = false; verificationStatus.textContent = ''; }, 'expired-callback': () => { bookingTurnstileToken = ''; submit.disabled = true; verificationStatus.textContent = 'Please complete the spam check again.'; }, 'error-callback': () => { bookingTurnstileToken = ''; submit.disabled = true; verificationStatus.textContent = 'The spam check could not load. Please try again.'; } });
    } catch (error) { verificationStatus.textContent = 'The spam check could not load. Please call reception on 020 8524 4516.'; }
    submit.addEventListener('click', () => submitContact(details, submit, verificationStatus));
  }

  async function submitContact(details, submit, submissionStatus) {
    if (!bookingTurnstileToken || submit.disabled) return;
    if (details.requiresPhotos && details.photoConsent === details.consultationRequested) {
      submissionStatus.textContent = 'Please confirm that you are happy to send photos, or choose the free 20-minute consultation.';
      return;
    }
    submit.disabled = true; submit.textContent = 'Sending…';
    let attachments = [];
    try {
      attachments = await Promise.all((details.photos || []).map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result).split(',')[1] || '' });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
    } catch (error) {
      submissionStatus.textContent = 'The photos could not be read. Please try again.';
      submit.disabled = false; submit.textContent = 'Send request to reception';
      return;
    }
    const payload = new URLSearchParams({ formType: 'contact', source: 'Chatbot', subject: details.requiresPhotos ? 'Surgery enquiry from chatbot' : 'Specialised contact request', redirectUrl: '', website: '', pageUrl: window.location.href, 'cf-turnstile-response': bookingTurnstileToken, name: details.name, email: details.email, phone: details.phone, surgeryType: details.surgeryType || '', message: details.message, photoConsent: details.photoConsent ? 'yes' : '', consultationRequested: details.consultationRequested ? 'yes' : '', attachments: JSON.stringify(attachments) });
    try {
      await fetch(bookingEndpoint, { method: 'POST', mode: 'no-cors', body: payload });
      clearBookingState(); clearControls(); setBookingMode(false); message('Thanks — your request has been sent to reception. They will reply using the contact details you provided.'); button('Ask another question', () => { clearControls(); input.focus(); });
    } catch (error) { submissionStatus.textContent = 'The request could not be sent. Please try again or call reception on 020 8524 4516.'; submit.disabled = false; submit.textContent = 'Try sending again'; bookingTurnstileToken = ''; }
  }

  function isAppointmentRecommendationQuestion(text) {
    const asksWhichAppointment =
      /\b(?:what|which|recommend|suitable|right|best|should)\b[\s\S]{0,70}\b(?:appointment|consultation|book|booking|visit)\b/i.test(text) ||
      /\b(?:appointment|consultation|book|booking|visit)\b[\s\S]{0,70}\b(?:what|which|need|should|suit)\b/i.test(text);

    const includesSymptoms =
      /\b(?:pain|corn|callus|nail|verruca|injur|sprain|orthotic|flat foot|bunion|hammer|fungal|skin|ingrow|heel|ankle|walking|gait)\b/i.test(text);

    return asksWhichAppointment || (includesSymptoms && isBookingRequest(text));
  }

  function isAffirmativeBooking(text) {
    return /^(?:yes|yeah|yep|sure|okay|ok|please)(?:\s+please)?(?:\s+book(?:\s+it|\s+an?\s+appointment)?)?[.!?\s]*$|^(?:let(?:'|’)s do it|i(?:'|’)d like to book|book it|that(?:'|’)s fine)[.!?\s]*$/i.test(text.trim());
  }

  function serviceFromText(reply) {
    if (!knowledge) return '';
    const services = Array.isArray(knowledge.services) ? knowledge.services : [];
    const match = services
      .slice()
      .sort((a, b) => b.name.length - a.name.length)
      .find((service) => reply.toLocaleLowerCase().includes(service.name.toLocaleLowerCase()));

    if (match) return match.name;

    const lowerReply = reply.toLocaleLowerCase();
    const surgicalTerms = ['corn removal surgery', 'bunion correction', 'hammertoe correction', 'flat foot correction', 'lumps & bumps removal', 'scar-free toe shortening', 'webbed toe separation'];
    if (surgicalTerms.some((term) => lowerReply.includes(term)) && services.some((service) => service.name === 'Foot & Ankle Surgery')) {
      return 'Foot & Ankle Surgery';
    }

    const aliases = [
      { terms: ['gait analysis', 'biomechanics', 'walking mechanics', 'running analysis', 'insoles', 'orthotics', 'plantar fasciitis', 'foot pain', 'heel pain', 'ankle pain'], service: 'Musculoskeletal Health' },
      { terms: ['shockwave', 'acupuncture', 'cupping', 'dry needling', 'electrotherapy', 'exercise rehabilitation', 'myofascial release', 'sports massage', 'triggerpoint', 'trigger point'], service: 'Physiotherapy' },
      { terms: ['physiotherapy', 'physio', 'rehabilitation'], service: 'Physiotherapy' },
      { terms: ['verruca', 'hard skin', 'corn removal', 'fungal nail', 'ingrowing toenail', 'long nails', 'nail care', 'chiropody'], service: 'Chiropody Appointment (Routine Care)' },
      { terms: ['cosmetic foot'], service: 'Cosmetic Foot Surgery' },
      { terms: ['bunion', 'hammertoe', 'flat foot correction', 'lumps & bumps', 'scar-free toe', 'webbed toe', 'corn removal surgery', 'surgical', 'surgery'], service: 'Foot & Ankle Surgery' },
      { terms: ['foot botox'], service: 'Cosmetic Foot Surgery' },
      { terms: ['diagnostic injection', 'ultrasound guided injection', 'x-ray'], service: 'Musculoskeletal Health' }
    ];
    const alias = aliases.find((item) => item.terms.some((term) => lowerReply.includes(term)));
    return alias && services.some((service) => service.name === alias.service)
      ? alias.service
      : '';
  }

  function suggestedServiceFromReply(reply) {
    if (!/would you like to book an appointment\??/i.test(reply)) return '';
    return serviceFromText(reply);
  }

  function hasSpecificAppointmentReference(reply) {
    return Boolean(serviceFromText(reply)) || /\b(?:gait analysis|biomechanics|orthotics|insoles|shockwave|acupuncture|cupping|dry needling|sports massage|verruca|corn|callus|fungal nail|ingrowing toenail|long nails|bunion|hammertoe|flat foot|foot and ankle surgery|cosmetic foot surgery|injection|ultrasound|physiotherapy|podiatry|chiropody)\b/i.test(reply);
  }

  function prepareAssistantReply(reply) {
    if (hasSpecificAppointmentReference(reply)) return reply;
    return reply.replace(/\s*(?:Would you like to book an appointment\??)\s*$/i, '').trim();
  }

  function isTeamQuestion(text) {
    return /\b(?:who works here|who is on the team|team members?|staff|clinicians?|practitioners?|podiatrists?|chiropodists?|physiotherapists?|surgeons?)\b/i.test(text);
  }

  function isSurgeryQuoteRequest(text) {
    const normalised = String(text || '')
      .toLocaleLowerCase()
      .replace(/[–—-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // A quote request is about the cost, not simply a question containing
    // the word "surgery". Keep this as the first gate so normal treatment
    // questions do not open the specialist photo-upload form.
    const asksForPricing =
      /\b(?:quote|quotation|estimate|bespoke price|personalised price|how much|what(?:'|’)s the price|what would it cost|how much would it cost|price|pricing|cost|costs|fee|fees)\b/i.test(normalised);

    if (!asksForPricing) return false;

    // Recognise both explicit procedures and the way a patient may describe
    // the problem without knowing its clinical name (for example, "partially
    // joined toes" rather than "webbed toes" or "syndactyly").
    const explicitSurgicalContext =
      /\b(?:foot ?and? ?ankle surgery|foot surgery|ankle surgery|cosmetic foot surgery|cosmetic surgery|surgical procedure|surgery|operation|operative|bunion|hammertoe|hammer toe|flat foot|lumps? ?and bumps?|toe shortening|webbed toe|syndactyl(?:y|ies)|toe separation)\b/i.test(normalised);

    const footOrToeProblem =
      /\b(?:foot|feet|ankle|toe|toes|forefoot|skin between|joined|webbed|fused|partially joined|connected|stuck together|deformit(?:y|ies)|extra skin)\b/i.test(normalised);

    const requestsPhotoAssessment =
      /\b(?:send|attach|upload|share)\b[\s\S]{0,45}\b(?:photo(?:s)?|picture(?:s)?|image(?:s)?)\b/i.test(normalised) ||
      /\b(?:photo(?:s)?|picture(?:s)?|image(?:s)?)\b[\s\S]{0,45}\b(?:send|attach|upload|share)\b/i.test(normalised);

    return explicitSurgicalContext ||
      (requestsPhotoAssessment && footOrToeProblem);
  }

  function knownPriceReply(text) {
    const lower = text.toLocaleLowerCase();
    const asksPrice = /\b(?:price|pricing|cost|costs|fee|fees|how much)\b/i.test(lower);
    if (!asksPrice) return '';

    const duration = /\b(?:60|1)\s*(?:mins?|minutes?|hour|hr)\b/i.test(lower) ? '60' :
      /\b45\s*(?:mins?|minutes?)\b/i.test(lower) ? '45' : '30';

    if (/\bcupping\b/i.test(lower)) {
      return `Cupping Therapy is £${duration === '60' ? '120' : '65'} for ${duration === '60' ? '60 minutes' : '30 minutes'}. You can view the full pricing information on the prices page. Would you like to book an appointment?`;
    }
    if (/\bacupuncture\b/i.test(lower)) {
      return `Acupuncture is £${duration === '60' ? '120' : '65'} for ${duration === '60' ? '60 minutes' : '30 minutes'}. You can view the full pricing information on the prices page. Would you like to book an appointment?`;
    }
    if (/\bdry\s*needling\b/i.test(lower)) {
      return `Dry Needling is £${duration === '60' ? '120' : '65'} for ${duration === '60' ? '60 minutes' : '30 minutes'}. You can view the full pricing information on the prices page. Would you like to book an appointment?`;
    }
    if (/\belectrotherapy\b/i.test(lower)) {
      return 'Electrotherapy is £50 for 30 minutes. You can view the full pricing information on the prices page. Would you like to book an appointment?';
    }
    if (/\btrigger\s*point\b|\btriggerpoint\b/i.test(lower)) {
      const prices = { '30': '£50', '45': '£85', '60': '£100' };
      return `Triggerpoint Therapy is ${prices[duration]} for ${duration} minutes. You can view the full pricing information on the prices page. Would you like to book an appointment?`;
    }
    return '';
  }

  function teamReply() {
    const team = Array.isArray(knowledge?.team) ? knowledge.team : [];

    if (!team.length) {
      return 'I do not have the team list available right now. Please call reception on 020 8524 4516 and they can confirm who is available.';
    }

    return [
      'The Foot & Ankle Centre team includes:',
      '',
      ...team.map((member) => `${member.name} — ${member.title}`),
      '',
      'Reception can confirm availability and who will handle a particular appointment.'
    ].join('\n');
  }

  function button(label, action, description = '', primary = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fac-option' + (primary ? ' fac-primary' : '');
    b.textContent = label;

    if (description) {
      const small = document.createElement('small');
      small.textContent = description;
      b.appendChild(small);
    }

    b.addEventListener('click', action);
    controls.appendChild(b);

    return b;
  }

  function link(id) {
    const item = knowledge.links[id];
    if (!item) return;

    const a = document.createElement('a');
    a.className = 'fac-link';
    a.href = siteUrl(item.path);
    a.textContent = item.label;

    controls.appendChild(a);
  }

  function menu() {
    setBookingMode(false);
    clearControls();

    for (const [id, faq] of Object.entries(knowledge.faqs)) {
      button(faq.title, () => {
        message(faq.title, true);
        message(faq.answer);
        clearControls();

        faq.links.forEach(link);

        button('More options', menu);
      });
    }
  }

  function start() {
    controller?.abort();
    generation++;
    busy = false;

    log.replaceChildren();
    clearControls();

    input.value = '';
    consent.checked = false;
    setBookingMode(false);
    pendingSuggestedService = '';
    pendingContactQuestion = '';

    updateComposer();

    if (restoreChatHistory()) {
      restoreBookingState();
      return;
    }

    if (!knowledge) {
      message(
        'Appointment help could not load. Please call reception on 020 8524 4516, or use our appointment request form.'
      );

      const a = document.createElement('a');
      a.className = 'fac-link';
      a.href = siteUrl('booking');
      a.textContent = 'Open appointment request form';

      controls.appendChild(a);
      return;
    }

    message(
      'Hello! What would you like to know about appointments at the Foot & Ankle Centre?\n\n' +
      'To make an appointment request, type "I want to book an appointment". You can also ask about prices, insurance or preparing for your visit.\n\n' +
      'Reception will confirm your appointment date and time.'
    );

    body.scrollTop = 0;
  }

  function chooseService() {
    setBookingMode(true);
    saveBookingState('service');

    message(
      'Which option best matches what you would like to discuss? These are appointment categories; reception can check your choice.'
    );

    clearControls();

    knowledge.services.forEach((service) =>
      button(
        service.name,
        () => chooseLocation(service.name),
        service.description
      )
    );


    body.scrollTop = log.offsetHeight;
  }

  function chooseLocation(service) {
    saveBookingState('location', { service });
    message(service || 'Help choosing an appointment', true);

    message(
      'Which clinic would you prefer? Reception will check availability for your appointment type.'
    );

    clearControls();

    knowledge.locations.forEach((location) =>
      button(location, () => collectPreferredDate(service, location))
    );

    button('No preference', () => collectPreferredDate(service, ''));

    body.scrollTop = log.offsetHeight;
  }

  function today() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function collectPreferredDate(service, location) {
    saveBookingState('date', { service, location });
    message(location || 'No clinic preference', true);

    message(
      'Do you have a preferred date? This is a preference only, not an available appointment slot.'
    );

    clearControls();

    const form = document.createElement('form');
    form.className = 'fac-booking-step';

    form.innerHTML = `
      <label>
        Preferred date (optional)
        <input type="date" name="date">
      </label>
      <button type="submit" class="fac-option fac-primary">Continue</button>
      <button type="button" class="fac-option fac-flexible">I'm flexible</button>
    `;

    form.elements.date.min = today();

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.elements.date.value) {
        form.elements.date.focus();
        return;
      }

      message(`Preferred date: ${form.elements.date.value}`, true);
      saveBookingState('name', { service, location, date: form.elements.date.value });
      collectName({
        service,
        location,
        date: form.elements.date.value
      }, {});
    });

    form.querySelector('.fac-flexible').addEventListener('click', () => {
      message('My date is flexible', true);
      saveBookingState('name', { service, location, date: '' });
      collectName({ service, location, date: '' }, {});
    });

    controls.appendChild(form);
    form.elements.date.focus();
    scrollToLatestAssistantMessage();
  }

  function collectTextField(choice, details, config) {
    message(config.question);
    clearControls();

    const form = document.createElement('form');
    form.className = 'fac-booking-step';

    const label = document.createElement('label');
    label.textContent = config.label;

    const field = document.createElement('input');
    field.type = config.type || 'text';
    field.name = config.name;
    field.required = config.required !== false;
    field.maxLength = config.maxLength || 200;

    if (config.autocomplete) field.autocomplete = config.autocomplete;
    if (config.inputMode) field.inputMode = config.inputMode;
    if (config.max) field.max = config.max;
    if (config.placeholder) field.placeholder = config.placeholder;
    field.value = details[config.name] || '';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'fac-option fac-primary';
    submit.textContent = 'Continue';

    label.appendChild(field);
    form.append(label, submit);

    if (config.optional) {
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'fac-option';
      skip.textContent = 'Skip';
      skip.addEventListener('click', () => {
        message('Skip', true);
        config.next(choice, { ...details, [config.name]: '' });
      });
      form.appendChild(skip);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const value = field.value.trim();
      message(config.userLabel ? `${config.userLabel}: ${value}` : value, true);
      config.next(choice, { ...details, [config.name]: value });
    });

    controls.appendChild(form);
    field.focus();
    scrollToLatestAssistantMessage();
  }

  function collectName(choice, details) {
    collectTextField(choice, details, {
      name: 'name',
      label: 'Full name',
      question: 'What is your full name?',
      autocomplete: 'name',
      next: collectEmail
    });
  }

  function collectEmail(choice, details) {
    collectTextField(choice, details, {
      name: 'email',
      label: 'Email',
      question: 'What email address should reception use?',
      type: 'email',
      autocomplete: 'email',
      next: collectPhone
    });
  }

  function collectPhone(choice, details) {
    collectTextField(choice, details, {
      name: 'phone',
      label: 'Phone',
      question: 'What phone number should reception use?',
      type: 'tel',
      autocomplete: 'tel',
      inputMode: 'tel',
      next: collectPatientStatus
    });
  }

  function collectPatientStatus(choice, details) {
    message('Are you already a patient at the Foot & Ankle Centre?');
    clearControls();

    button('Yes, I am an existing patient', () => {
      message('Existing patient', true);
      collectNotes(choice, {
        ...details,
        existingPatient: 'yes'
      });
    });

    button('No, I am a new patient', () => {
      message('New patient', true);
      collectNewPatientDetails(choice, {
        ...details,
        existingPatient: 'no'
      });
    });

    button('Back to contact details', () => collectName(choice, details));
    scrollToLatestAssistantMessage();
  }

  function collectNewPatientDetails(choice, details) {
    collectTextField(choice, details, {
      name: 'dob',
      label: 'Date of birth',
      question: 'As a new patient, what is your date of birth?',
      type: 'date',
      autocomplete: 'bday',
      max: today(),
      userLabel: 'Date of birth',
      next: collectPostcode
    });
  }

  function collectPostcode(choice, details) {
    collectTextField(choice, details, {
      name: 'postcode',
      label: 'Postcode',
      question: 'What is your postcode?',
      autocomplete: 'postal-code',
      userLabel: 'Postcode',
      next: collectAddressLine1
    });
  }

  function collectAddressLine1(choice, details) {
    collectTextField(choice, details, {
      name: 'addressLine1',
      label: 'Address line 1',
      question: 'What is the first line of your address?',
      autocomplete: 'address-line1',
      next: collectAddressLine2
    });
  }

  function collectAddressLine2(choice, details) {
    collectTextField(choice, details, {
      name: 'addressLine2',
      label: 'Address line 2 (optional)',
      question: 'What is the second line of your address? You can skip this if it does not apply.',
      autocomplete: 'address-line2',
      required: false,
      optional: true,
      next: collectCity
    });
  }

  function collectCity(choice, details) {
    collectTextField(choice, details, {
      name: 'city',
      label: 'Town or city',
      question: 'What is your town or city?',
      autocomplete: 'address-level2',
      next: collectNotes
    });
  }

  function collectNotes(choice, details) {
    message(
      'Add a short note for reception if needed. Please do not include a detailed medical history.'
    );
    clearControls();

    const form = document.createElement('form');
    form.className = 'fac-booking-step';
    form.innerHTML = `
      <label>
        Notes (optional)
        <textarea name="notes" rows="3" maxlength="2300"></textarea>
      </label>
      <p class="fac-note">Submitting sends a request. Reception will contact you to confirm the appointment.</p>
      <button type="submit" class="fac-option fac-primary">Review request</button>
      <button type="button" class="fac-option fac-booking-back">Back</button>
    `;

    form.elements.notes.value = details.notes || '';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      reviewBooking(choice, {
        ...details,
        notes: form.elements.notes.value.trim()
      });
    });

    form.querySelector('.fac-booking-back').addEventListener('click', () => {
      if (details.existingPatient === 'no') {
        collectNewPatientDetails(choice, details);
      } else {
        collectPatientStatus(choice, details);
      }
    });

    controls.appendChild(form);
    form.elements.notes.focus();
    scrollToLatestAssistantMessage();
  }

  function addReviewRow(list, label, value) {
    if (!value) return;

    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  }

  async function reviewBooking(choice, details) {
    message('Please check your appointment request before sending it.');
    clearControls();

    const review = document.createElement('div');
    review.className = 'fac-booking-review';

    const list = document.createElement('dl');
    addReviewRow(list, 'Appointment', choice.service || 'Appointment category to be confirmed by reception');
    addReviewRow(list, 'Clinic', choice.location || 'No preference');
    addReviewRow(list, 'Preferred date', choice.date || 'Flexible');
    addReviewRow(list, 'Name', details.name);
    addReviewRow(list, 'Email', details.email);
    addReviewRow(list, 'Phone', details.phone);
    addReviewRow(
      list,
      'Patient',
      details.existingPatient === 'yes' ? 'Existing patient' : 'New patient'
    );

    if (details.existingPatient === 'no') {
      addReviewRow(list, 'Date of birth', details.dob);
      addReviewRow(
        list,
        'Address',
        [
          details.addressLine1,
          details.addressLine2,
          details.city,
          details.postcode
        ].filter(Boolean).join(', ')
      );
    }

    addReviewRow(list, 'Notes', details.notes);
    review.appendChild(list);

    const verification = document.createElement('div');
    verification.className = 'fac-booking-turnstile';
    review.appendChild(verification);

    const verificationStatus = document.createElement('p');
    verificationStatus.className = 'fac-note fac-booking-status';
    verificationStatus.setAttribute('role', 'status');
    review.appendChild(verificationStatus);

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'fac-option fac-primary';
    submit.textContent = 'Send appointment request';
    submit.disabled = true;
    review.appendChild(submit);

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'fac-option';
    edit.textContent = 'Change details';
    edit.addEventListener('click', () => collectName(choice, details));
    review.appendChild(edit);

    controls.appendChild(review);
    scrollToLatestAssistantMessage();

    try {
      await loadTurnstile();

      bookingTurnstileWidgetId = window.turnstile.render(
        verification,
        {
          sitekey: bookingTurnstileSiteKey,
          theme: 'light',
          callback: (token) => {
            bookingTurnstileToken = token;
            submit.disabled = false;
            verificationStatus.textContent = '';
          },
          'expired-callback': () => {
            bookingTurnstileToken = '';
            submit.disabled = true;
            verificationStatus.textContent = 'Please complete the spam check again.';
          },
          'error-callback': () => {
            bookingTurnstileToken = '';
            submit.disabled = true;
            verificationStatus.textContent = 'The spam check could not load. Please try again.';
          }
        }
      );
    } catch (error) {
      console.error('FAC booking verification failed:', error);
      verificationStatus.textContent =
        'The spam check could not load. Please use the booking page or call reception.';

      const fallback = document.createElement('a');
      fallback.className = 'fac-link';
      fallback.href = siteUrl('booking');
      fallback.textContent = 'Open booking page';
      review.appendChild(fallback);
    }

    submit.addEventListener('click', () => {
      submitBooking(choice, details, submit, verificationStatus);
    });
  }

  async function submitBooking(choice, details, submit, submissionStatus) {
    if (!bookingTurnstileToken || submit.disabled) return;

    submit.disabled = true;
    submit.textContent = 'Sending…';
    submissionStatus.textContent = '';

    const notes = details.notes || '';

    const payload = new URLSearchParams({
      formType: 'booking',
      source: 'Chatbot',
      subject: choice.date ? 'Booking Request' : 'Appointment Request',
      redirectUrl: '',
      website: '',
      pageUrl: window.location.href,
      'cf-turnstile-response': bookingTurnstileToken,
      name: details.name,
      email: details.email,
      phone: details.phone,
      existingPatient: details.existingPatient,
      service: choice.service || 'Appointment category to be confirmed by reception',
      location: choice.location || 'No preference',
      date: choice.date || '',
      dob: details.dob || '',
      postcode: details.postcode || '',
      addressLine1: details.addressLine1 || '',
      addressLine2: details.addressLine2 || '',
      city: details.city || '',
      notes
    });

    try {
      await fetch(bookingEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: payload
      });

      clearBookingState();
      clearControls();
      setBookingMode(false);
      message(
        'Thanks — your appointment request has been sent to reception. It is not booked yet; reception will contact you to confirm the date and time.'
      );
      button('Ask another question', () => {
        clearControls();
        input.focus();
      });
    } catch (error) {
      console.error('FAC booking request failed:', error);
      submissionStatus.textContent =
        'The request could not be sent. Please try again or call reception on 020 8524 4516.';
      submit.textContent = 'Try sending again';

      bookingTurnstileToken = '';

      if (
        bookingTurnstileWidgetId !== null &&
        window.turnstile
      ) {
        try {
          window.turnstile.reset(bookingTurnstileWidgetId);
        } catch {
          // The user can still use the booking page fallback.
        }
      }
    }
  }

  function fillBooking(form, choice) {
    for (const name of [
      'service',
      'location',
      'date'
    ]) {
      const field = form.elements[name];

      if (!field) continue;

      let value =
        typeof choice[name] === 'string'
          ? choice[name]
          : '';

      if (name === 'location' && !value) {
        value = 'No preference';
      }

      if (
        field.tagName === 'SELECT' &&
        !Array.from(field.options).some(
          (option) => option.value === value
        )
      ) {
        continue;
      }

      if (
        name === 'date' &&
        value &&
        (
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          value < today()
        )
      ) {
        continue;
      }

      field.value = value.slice(0, 100);

      field.dispatchEvent(
        new Event('change', {
          bubbles: true
        })
      );
    }

    const note = form.querySelector(
      '[data-assistant-handoff]'
    );

    if (note) {
      note.hidden = false;
    }
  }

  const bookingForm = document.querySelector(
    'form[data-form-type="booking"]'
  );

  if (bookingForm) {
    const date = bookingForm.elements.date;

    if (date) {
      date.min = today();
    }

    try {
      const choice = JSON.parse(
        sessionStorage.getItem(storageKey) || 'null'
      );

      sessionStorage.removeItem(storageKey);

      if (
        choice &&
        Number.isFinite(choice.createdAt) &&
        Date.now() - choice.createdAt < 30 * 60 * 1000
      ) {
        fillBooking(bookingForm, choice);
      }
    } catch {
      // A fresh request form remains usable.
    }
  }

  function updateComposer() {
    input.disabled = busy;
    send.disabled = busy;
    typing.hidden = !busy;

    if (busy) {
      body.scrollTop = body.scrollHeight;
    }

    $('.fac-consent').hidden = !aiReady;
    $('.fac-retry').hidden = true;

    setStatus(
      aiReady
        ? ''
        : 'AI chat is temporarily unavailable. Use the appointment guide or call reception.'
    );
  }

  consent.addEventListener('change', () => {
    updateComposer();

    if (consent.checked) {
      input.focus();
    }
  });

  function loadTurnstile() {
    if (turnstileLoaded && window.turnstile) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-fac-turnstile]'
      );

      if (existing) {
        const check = setInterval(() => {
          if (window.turnstile) {
            clearInterval(check);
            turnstileLoaded = true;
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(check);

          if (!window.turnstile) {
            reject(
              new Error('Turnstile failed to load.')
            );
          }
        }, 10000);

        return;
      }

      const script = document.createElement('script');

      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

      script.async = true;
      script.defer = true;
      script.dataset.facTurnstile = 'true';

      script.onload = () => {
        turnstileLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(
          new Error('Turnstile failed to load.')
        );
      };

      document.head.appendChild(script);
    });
  }

  async function ensureTurnstileWidget() {
    await loadTurnstile();

    if (turnstileWidgetId !== null) {
      return;
    }

    turnstileWidgetId = window.turnstile.render(
      turnstileContainer,
      {
        sitekey: turnstileSiteKey,

        execution: 'render',

        appearance: 'interaction-only',

        'refresh-expired': 'auto',

        retry: 'auto',

        callback: (token) => {
          currentTurnstileToken = token;

          if (pendingTurnstileResolve) {
            pendingTurnstileResolve(token);
          }

          pendingTurnstileResolve = null;
          pendingTurnstileReject = null;
        },

        'error-callback': (errorCode) => {
          currentTurnstileToken = null;

          console.warn(
            'FAC Turnstile error:',
            errorCode
          );

          if (pendingTurnstileReject) {
            pendingTurnstileReject(
              new Error(
                'Turnstile verification failed.'
              )
            );
          }

          pendingTurnstileResolve = null;
          pendingTurnstileReject = null;
        },

        'expired-callback': () => {
          currentTurnstileToken = null;
        },

        'timeout-callback': () => {
          currentTurnstileToken = null;
        }
      }
    );
  }

  async function getTurnstileToken() {
    await ensureTurnstileWidget();

    if (currentTurnstileToken) {
      return currentTurnstileToken;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (pendingTurnstileReject === reject) {
          pendingTurnstileResolve = null;
          pendingTurnstileReject = null;

          reject(
            new Error(
              'Turnstile verification timed out.'
            )
          );
        }
      }, 15000);

      pendingTurnstileResolve = (token) => {
        clearTimeout(timeout);
        resolve(token);
      };

      pendingTurnstileReject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  function refreshTurnstileToken() {
    currentTurnstileToken = null;

    if (
      turnstileWidgetId !== null &&
      window.turnstile
    ) {
      try {
        window.turnstile.reset(
          turnstileWidgetId
        );
      } catch (error) {
        console.warn(
          'FAC Turnstile reset failed:',
          error
        );
      }
    }
  }

  $('.fac-compose').addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const text = input.value.trim();

      if (busy || !text) return;

      if (aiReady && !consent.checked) {
        setStatus('Please tick the agreement above to send your question.');
        consent.focus();
        return;
      }

      if (knowledge && pendingSuggestedService && isAffirmativeBooking(text)) {
        const service = pendingSuggestedService;
        pendingSuggestedService = '';
        message(text, true);
        input.value = '';
        setStatus();
        setBookingMode(true);
        message(`Great — I’ll start your request with ${service}.`);
        chooseLocation(service);
        return;
      }

      if (knowledge && isTeamQuestion(text)) {
        message(text, true);
        input.value = '';
        clearControls();
        message(teamReply());
        return;
      }

      if (knowledge && isSurgeryQuoteRequest(text)) {
        message(text, true);
        input.value = '';
        clearControls();
        await botMessage('Yes — we can provide an initial surgery quotation based on clear photographs of your feet. Photos are optional: you can consent to send them through the enquiry form, or request a free 20-minute consultation so your feet can be examined in person. The clinical team will confirm the quotation or next steps.');
        startContactRequest(text, true);
        return;
      }

      const knownPrice = knowledge && knownPriceReply(text);
      if (knownPrice) {
        message(text, true);
        input.value = '';
        clearControls();
        await botMessage(knownPrice);
        button('Book an appointment', () => {
          setBookingMode(true);
          chooseLocation(serviceFromText(text) || 'Physiotherapy');
        }, 'Start an appointment request for this treatment.');
        return;
      }

      // A different question means any earlier recommendation is no longer pending.
      pendingSuggestedService = '';

      if (
        knowledge &&
        isBookingRequest(text) &&
        !isAppointmentRecommendationQuestion(text)
      ) {
        const requestedService = serviceFromText(text);
        message(text, true);
        input.value = '';
        setStatus();
        if (requestedService) {
          setBookingMode(true);
          message(`Great — I’ll start your request with ${requestedService}.`);
          chooseLocation(requestedService);
        } else {
          chooseService();
        }
        return;
      }

      if (!aiReady) {
        message(text, true);
        input.value = '';

        message(
          'I can’t answer free-text questions while AI chat is disconnected. You can still use the appointment guide below or call reception on 020 8524 4516. Your message has not been sent to reception or an AI service.'
        );

        return;
      }

      message(text, true);

      input.value = '';
      clearControls();

      busy = true;
      updateComposer();

      const current = generation;

      const requestController = new AbortController();
      controller = requestController;

      const timer = setTimeout(
        () => requestController.abort(),
        60000
      );

      try {
        setStatus('Verifying request…');

        const turnstileToken =
          await getTurnstileToken();

        if (current !== generation) return;

        setStatus();

        const response = await fetch(
          endpoint,
          {
            method: 'POST',
            signal: requestController.signal,

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              message: text,
              turnstileToken
            })
          }
        );

        if (!response.ok) {
          const errorText =
            await response.text();

          console.error(
            'FAC assistant API error:',
            response.status,
            errorText
          );

          throw new Error('unavailable');
        }

        const result = await response.json();

        if (current !== generation) {
          return;
        }

        if (
          typeof result.reply !== 'string' ||
          !result.reply.trim()
        ) {
          throw new Error('invalid');
        }

        const displayReply = prepareAssistantReply(result.reply);
        message(displayReply);
        pendingSuggestedService = suggestedServiceFromReply(displayReply);
        if (isUnknownReply(result.reply)) {
          pendingContactQuestion = text;
          button('Contact reception about this', () => startContactRequest(pendingContactQuestion), 'Send a specialised request without booking an appointment.');
        }
      } catch (error) {
        console.error(
          'FAC assistant request failed:',
          error
        );

        if (current !== generation) {
          return;
        }

        message(
          'AI replies are unavailable right now. Please try again, use the appointment guide below, or call reception on 020 8524 4516.'
        );
      } finally {
        clearTimeout(timer);

        if (current === generation) {
          refreshTurnstileToken();
          busy = false;
          updateComposer();
        }
      }
    }
  );

  let loaded = false;

  async function open() {
    if (panelCloseTimer) {
      clearTimeout(panelCloseTimer);
      panelCloseTimer = null;
    }
    panel.hidden = false;
    teaser.hidden = true;
    panel.classList.remove('fac-panel-closing');
    panel.classList.remove('fac-panel-opening');
    requestAnimationFrame(() => panel.classList.add('fac-panel-opening'));

    launch.setAttribute(
      'aria-expanded',
      'true'
    );

    $('.fac-close').focus();

    if (loaded) return;

    loaded = true;

    message('Loading appointment help…', false, false);

    try {
      const response = await fetch(
        new URL(
          'assistant/knowledge.json?v=2',
          root
        )
      );

      if (!response.ok) {
        throw new Error('unavailable');
      }

      knowledge = await response.json();
    } catch {
      knowledge = null;
    }

    aiReady = Boolean(knowledge);

    if (aiReady) {
      ensureTurnstileWidget().catch((error) => {
        console.warn(
          'FAC Turnstile could not start:',
          error
        );
      });
    }

    start();
    updateComposer();
  }

  function close() {
    panel.classList.remove('fac-panel-opening');
    panel.classList.add('fac-panel-closing');
    panelCloseTimer = setTimeout(() => {
      panel.hidden = true;
      panel.classList.remove('fac-panel-closing');
      panelCloseTimer = null;
    }, 180);

    launch.setAttribute(
      'aria-expanded',
      'false'
    );

    launch.focus();
  }

  launch.addEventListener(
    'click',
    () => panel.hidden ? open() : close()
  );

  teaser.addEventListener('click', open);

  $('.fac-close').addEventListener(
    'click',
    close
  );

  host.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Escape' &&
        !panel.hidden
      ) {
        event.preventDefault();
        close();
      }
    }
  );

  $('.fac-reset').addEventListener(
    'click',
    () => {
      try { sessionStorage.removeItem(chatHistoryKey); } catch { /* storage unavailable */ }
      clearBookingState();
      start();
    }
  );

  $('.fac-guide').addEventListener(
    'click',
    () => {
      if (knowledge) {
        menu();
        body.scrollTop =
          log.offsetHeight;
      }
    }
  );

})();

