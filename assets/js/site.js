(() => {
  'use strict';

  const config = window.TOA_CONFIG || {};
  const root = document.documentElement;
  const lang = root.lang || 'en';
  const rtl = root.dir === 'rtl';
  const bookingBase = config.bookingUrl || 'https://be.synxis.com/?Hotel=37671';
  const fallbackImage = (type = 'resort') => `./assets/images/fallback-${type}.svg`;

  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => {
    window.dataLayer.push({ event, language: lang, ...data });
    document.dispatchEvent(new CustomEvent('toa:analytics', { detail: { event, ...data } }));
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const header = qs('.site-header');
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 32);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const menuToggle = qs('.menu-toggle');
  const nav = qs('.nav');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    nav?.classList.remove('mobile-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };
  menuToggle?.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    nav?.classList.toggle('mobile-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  qsa('.nav a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  const language = qs('.language');
  const languageTrigger = qs('.language-trigger');
  languageTrigger?.addEventListener('click', e => {
    e.stopPropagation();
    const open = language.classList.toggle('open');
    languageTrigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (language && !language.contains(e.target)) {
      language.classList.remove('open');
      languageTrigger?.setAttribute('aria-expanded', 'false');
    }
  });

  qsa('[data-track]').forEach(el => el.addEventListener('click', () => {
    track(el.dataset.track, { label: el.dataset.label || el.textContent.trim(), href: el.href || '' });
  }));

  const today = new Date();
  const pad = value => String(value).padStart(2, '0');
  const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const plusDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
  qsa('input[type="date"]').forEach(input => input.min = iso(today));
  qsa('.booking-form').forEach(form => {
    const arrival = qs('[name="arrival"]', form);
    const departure = qs('[name="departure"]', form);
    if (arrival && !arrival.value) arrival.value = iso(plusDays(today, 21));
    if (departure && !departure.value) departure.value = iso(plusDays(today, 25));
    arrival?.addEventListener('change', () => {
      const minDeparture = iso(plusDays(new Date(`${arrival.value}T12:00:00`), 1));
      departure.min = minDeparture;
      if (!departure.value || departure.value <= arrival.value) departure.value = minDeparture;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(form);
      const arrivalValue = String(data.get('arrival') || '');
      const departureValue = String(data.get('departure') || '');
      if (arrivalValue && departureValue && departureValue <= arrivalValue) {
        departure?.focus();
        return;
      }
      const url = new URL(bookingBase);
      if (arrivalValue) url.searchParams.set('arrive', arrivalValue);
      if (departureValue) url.searchParams.set('depart', departureValue);
      url.searchParams.set('adult', String(data.get('adults') || 2));
      url.searchParams.set('child', String(data.get('children') || 0));
      url.searchParams.set('locale', lang === 'he' ? 'he-IL' : `${lang}-${lang.toUpperCase()}`);
      track('booking_search', {
        arrival: arrivalValue,
        departure: departureValue,
        adults: String(data.get('adults') || 2),
        children: String(data.get('children') || 0)
      });
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    });
  });

  qsa('a[data-booking]').forEach(a => {
    a.href = bookingBase;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  qsa('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const answer = qs('.faq-answer', item);
      const open = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
      answer.style.height = open ? `${answer.scrollHeight}px` : '0px';
    });
  });

  const lightbox = qs('.lightbox');
  const lightboxImage = qs('.lightbox img');
  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  qsa('.gallery-item').forEach(item => item.addEventListener('click', () => {
    const image = qs('img', item);
    if (!image || !lightbox || !lightboxImage) return;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    track('gallery_open', { label: image.alt });
  }));
  qs('.lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  qsa('img[data-fallback]').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = 'true';
      img.src = fallbackImage(img.dataset.fallback || 'resort');
    }, { once: true });
  });

  const reveals = qsa('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -25px 0px' });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const contactForm = qs('#contact-form');
  contactForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const status = qs('.form-status', contactForm);
    const submit = qs('button[type="submit"]', contactForm);
    if (!contactForm.reportValidity()) return;
    submit.disabled = true;
    const data = Object.fromEntries(new FormData(contactForm).entries());
    track('contact_submit', { subject: data.subject || 'general' });
    try {
      if (config.formEndpoint) {
        const response = await fetch(config.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source: 'toa-hotel-website', language: lang })
        });
        if (!response.ok) throw new Error('Form endpoint rejected the request');
        status.textContent = contactForm.dataset.success;
        contactForm.reset();
      } else {
        const subject = encodeURIComponent(`[TOA Website] ${data.subject || 'Guest enquiry'} — ${data.name}`);
        const body = encodeURIComponent(`${data.message}\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || '-'}\nLanguage: ${lang}`);
        window.location.href = `mailto:info@toazanzibar.com?subject=${subject}&body=${body}`;
        status.textContent = contactForm.dataset.mailto;
      }
    } catch (error) {
      status.textContent = contactForm.dataset.error;
      console.error(error);
    } finally {
      submit.disabled = false;
    }
  });

  const consentKey = 'toa-consent-v1';
  const cookie = qs('.cookie');
  const safeStorage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (_) {} }
  };
  const consent = safeStorage.get(consentKey);
  if (!consent && cookie) window.setTimeout(() => cookie.classList.add('show'), 700);
  qsa('[data-consent]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.consent;
    safeStorage.set(consentKey, value);
    cookie?.classList.remove('show');
    track('consent_update', { value });
    if (value === 'all') document.dispatchEvent(new CustomEvent('toa:consent-granted'));
  }));

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  window.TOA = { track, openBooking: () => window.open(bookingBase, '_blank', 'noopener,noreferrer') };
})();
