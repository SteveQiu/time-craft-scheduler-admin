import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { APP_NAME } from '@/config/app';
import {
  Search, MapPin, Wrench, GraduationCap, Shield, Scissors, Dumbbell, Sparkles,
  CheckCircle, Clock, Bell, CreditCard, LinkIcon, Users, BarChart3, Star,
  Calendar,
} from 'lucide-react';
import { ProviderBrowseCard } from '@/components/BookingBrowse';
import type { ProviderAccount } from '@/types/browse';
import { COUNTRIES, PROVINCES_BY_COUNTRY } from '@/lib/address';
// landing.css is loaded globally via index.html — no import needed here

// ─── constants ───────────────────────────────────────────────────────
const ROTATING_TERMS = ['a technician', 'a tutor', 'a barber', 'a trainer', 'a cleaner'];
const ROTATION_INTERVAL_MS = 2800;

const CATEGORY_PILLS = [
  { label: 'Technicians', icon: Wrench },
  { label: 'Tutors', icon: GraduationCap },
  { label: 'Insurance', icon: Shield },
  { label: 'Barbers', icon: Scissors },
  { label: 'Trainers', icon: Dumbbell },
  { label: 'Cleaners', icon: Sparkles },
] as const;

const MOCK_PROVIDERS: (ProviderAccount & { rating?: { avg: number; count: number } })[] = [
  {
    user_id: 'mock-1',
    provider_name: 'Elena Rossi',
    provider_slug: null,
    avatar_url: null,
    opening_count: 3,
    services: ['Insurance Advisor', 'Financial Planning'],
    workers: [],
    is_custom_inquiry: false,
    is_active_listing: true,
    rating: { avg: 4.9, count: 128 },
  },
  {
    user_id: 'mock-2',
    provider_name: 'Marcus Bennett',
    provider_slug: null,
    avatar_url: null,
    opening_count: 5,
    services: ['Personal Training', 'Strength & Conditioning'],
    workers: [],
    is_custom_inquiry: false,
    is_active_listing: true,
    rating: { avg: 5.0, count: 204 },
  },
  {
    user_id: 'mock-3',
    provider_name: 'Amelia Chen',
    provider_slug: null,
    avatar_url: null,
    opening_count: 2,
    services: ['Maths Tutor', 'Science Tutor', 'Test Prep'],
    workers: [],
    is_custom_inquiry: true,
    is_active_listing: false,
    rating: { avg: 4.9, count: 86 },
  },
  {
    user_id: 'mock-4',
    provider_name: 'The Fade Room',
    provider_slug: null,
    avatar_url: null,
    opening_count: 8,
    services: ['Barber', 'Fades & Tapers', 'Beard Grooming'],
    workers: [],
    is_custom_inquiry: false,
    is_active_listing: true,
    rating: { avg: 4.8, count: 312 },
  },
] as const;

const CUSTOMER_STEPS = [
  { num: '01', title: 'Search your area', desc: 'Tell us what you need and where. Browse real-time availability from trusted local pros.' },
  { num: '02', title: 'Book in seconds', desc: 'Pick a slot that works, confirm, and pay securely if a deposit is needed. No phone tag.' },
  { num: '03', title: 'Get reminded', desc: 'We send the reminders and hold your spot. Just show up. Rebooking is one tap away.' },
] as const;

const BUSINESS_STEPS = [
  { num: '01', title: 'Create your page', desc: 'Sign up, add your services, and set your hours. Your booking page is live in minutes.' },
  { num: '02', title: 'Share your link', desc: 'Drop your link in your bio, on Google, or in a text. Clients book themselves.' },
  { num: '03', title: 'Get paid', desc: 'Collect deposits or payment at booking. Money hits your account before the appointment.' },
] as const;

const PRO_FEATURES = [
  { icon: Clock, title: 'Real-time availability', desc: 'Your calendar syncs instantly. Clients only ever see open slots, so double-bookings never happen.' },
  { icon: Bell, title: 'Automatic reminders', desc: 'Email reminders go out before every appointment. No-shows drop without you lifting a finger.' },
  { icon: CreditCard, title: 'Built-in payments', desc: 'Take cards, collect deposits, or charge in full at booking. Money lands before the appointment starts.' },
  { icon: LinkIcon, title: 'One shareable link', desc: 'Drop your booking link in your bio, on Google, or in a text. Clients book themselves in seconds.' },
  { icon: Users, title: 'Team management', desc: 'Add staff, set their hours, and run the whole schedule from a single dashboard.' },
  { icon: BarChart3, title: 'Reports & insights', desc: 'See busy days, top clients, and revenue trends, so you always know where your business stands.' },
] as const;

const PRICING_PLANS = [
  {
    name: 'Free', price: '$0', period: '/month', popular: false,
    features: [
      'Public provider listing & booking page',
      'Up to 3 profile photos',
      'Unlimited appointment bookings',
      'Openings schedulable up to 1 month ahead',
      'Bookmark providers',
      'Leave & receive reviews',
    ],
    cta: 'Start free', ctaStyle: 'border border-border hover:bg-muted',
  },
  {
    name: 'Premium', price: '$7', period: '/month', popular: true,
    features: [
      'Everything in Free',
      'Premium badge on your listing',
      'Up to 100 profile photos',
      'Openings up to 3 months ahead',
      'Custom Inquiry — clients contact you directly',
      'Active Listing — featured in Browse for ongoing visibility',
      'Booker attendance stats & no-show flagging',
      'Confirmation & denial emails to bookers',
      'Scheduler API — 2,000 requests/day',
      'Priority support',
    ],
    cta: 'Get Premium', ctaStyle: 'bg-[#1a7fba] text-white hover:bg-[#15689a]',
  },
] as const;

const TESTIMONIALS = [
  { quote: '"I used to lose $200 a week to no-shows. Now I barely get any, the reminders just work. I set it up on a Sunday and it was live by dinner."', name: 'Marcus T.', role: 'Personal trainer', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { quote: '"My clients always say the booking is so easy. I have a 5-star rating on Google now, and PikAppoint is a huge part of that."', name: 'Sara K.', role: 'Hair stylist', photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { quote: '"I manage four staff. Before this I had a whiteboard that was always wrong. Now it\'s all in one place and my team actually likes using it."', name: 'David R.', role: 'Barbershop owner', photo: 'https://randomuser.me/api/portraits/men/65.jpg' },
] as const;

// ─── sub-components (file-level, not nested) ────────────────────────

function RotatingTerm() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % ROTATING_TERMS.length);
        setVisible(true);
      }, 300);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="lp-rotating-term"
      style={{ opacity: visible ? 1 : 0 }}
      aria-live="polite"
    >
      {ROTATING_TERMS[index]}
    </span>
  );
}

function AppointmentMockup() {
  return (
    <div className="lp-mockup" aria-hidden="true">
      <div className="lp-mockup-header">
        <div className="lp-mockup-dots">
          <span className="lp-mockup-dot" />
          <span className="lp-mockup-dot" />
          <span className="lp-mockup-dot" />
        </div>
        <span className="lp-mockup-label">Today · 6 appointments</span>
      </div>
      {[
        { time: '', status: 'Paid' },
        { time: '10:30', status: '' },
        { time: '1:00', status: '' },
        { time: '', status: 'Paid' },
      ].map((slot, i) => (
        <div key={i} className="lp-mockup-row">
          <div className="lp-mockup-avatar" />
          <div className="lp-mockup-bar" />
          {slot.status ? (
            <span className="lp-mockup-pill lp-mockup-pill--green">{slot.status}</span>
          ) : (
            <span className="lp-mockup-time">{slot.time}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── main landing page ──────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const [serviceQuery, setServiceQuery] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [locationProvince, setLocationProvince] = useState('');
  const [howItWorksTab, setHowItWorksTab] = useState<'customer' | 'business'>('customer');

  const availableProvinces = locationCountry ? (PROVINCES_BY_COUNTRY[locationCountry] ?? []) : [];

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (serviceQuery.trim()) params.set('q', serviceQuery.trim());
    if (locationCountry) params.set('country', locationCountry);
    if (locationProvince) params.set('province', locationProvince);
    navigate(`${ROUTES.browse}${params.toString() ? '?' + params.toString() : ''}`);
  }, [serviceQuery, locationCountry, locationProvince, navigate]);

  return (
    <div className="lp">
      {/* Skip link */}
      <a href="#main-content" className="lp-skip">
        Skip to main content
      </a>

      {/* ─── Sticky Navbar ─── */}
      <nav className="lp-nav" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-nav-logo" aria-label={`${APP_NAME} home`}>
            <Calendar className="lp-nav-logo-icon" style={{ color: '#000' }} aria-hidden="true" />
            {APP_NAME}
          </Link>

          <div className="lp-nav-links">
            <a href="#for-professionals" className="lp-nav-link">For professionals</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
          </div>

          <div className="lp-nav-actions">
            <Link to={ROUTES.browse} className="lp-btn lp-btn--navy">
              Browse
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* ─── Hero ─── */}
        <section className="lp-hero" aria-labelledby="hero-heading">
          <div className="lp-hero-inner">
            <h1 id="hero-heading" className="lp-h1">
              Book <RotatingTerm /><br />near you.
            </h1>

            <p className="lp-hero-sub">
              {APP_NAME} is where your neighbourhood gets things done. Find a pro, see their real availability, and book on the spot.
            </p>

            {/* Search bar */}
            <div className="lp-search">
              <div className="lp-search-field">
                <Search className="lp-search-icon" aria-hidden="true" />
                <div className="lp-search-field-inner">
                  <label htmlFor="service-search" className="lp-search-label">Service</label>
                  <input
                    id="service-search"
                    type="text"
                    placeholder="e.g. barber or tutor"
                    value={serviceQuery}
                    onChange={e => setServiceQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="lp-search-input"
                  />
                </div>
              </div>
              <div className="lp-search-divider" aria-hidden="true" />
              <hr className="lp-search-sep" aria-hidden="true" />
              <div className="lp-search-field">
                <MapPin className="lp-search-icon" aria-hidden="true" />
                <div className="lp-search-field-inner">
                  <label htmlFor="location-country" className="lp-search-label">Where</label>
                  <div className="lp-location-selects">
                    <select
                      id="location-country"
                      value={locationCountry}
                      onChange={e => { setLocationCountry(e.target.value); setLocationProvince(''); }}
                      className="lp-search-select"
                      aria-label="Country"
                    >
                      <option value="">Country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={locationProvince}
                      onChange={e => setLocationProvince(e.target.value)}
                      className="lp-search-select"
                      disabled={!locationCountry}
                      aria-label="Province / State"
                    >
                      <option value="">Province / State</option>
                      {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSearch}
                className="lp-search-btn"
                aria-label="Search for services"
              >
                <Search className="lp-search-btn-icon" aria-hidden="true" />
                Search
              </button>
            </div>

            {/* Category pills */}
            <div className="lp-pills" role="list" aria-label="Popular categories">
              {CATEGORY_PILLS.map(({ label, icon: Icon }) => (
                <Link
                  key={label}
                  to={`${ROUTES.browse}?q=${label.toLowerCase()}`}
                  role="listitem"
                  className="lp-pill"
                >
                  <Icon className="lp-pill-icon" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Recommended Providers ─── */}
        <section className="lp-section lp-section--gray" aria-labelledby="recommended-heading">
          <div className="lp-section-inner">
            <div className="lp-section-header">
              <div>
                <h2 id="recommended-heading" className="lp-h2">Explore Services</h2>
              </div>
              <Link to={ROUTES.browse} className="lp-btn lp-btn--outline">
                See all pros
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MOCK_PROVIDERS.map(p => (
                <ProviderBrowseCard
                  key={p.user_id}
                  provider={p}
                  rating={p.rating}
                  onOpen={() => navigate(ROUTES.browse)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="lp-section" aria-labelledby="how-it-works-heading">
          <div className="lp-section-inner--md">
            <h2 id="how-it-works-heading" className="lp-h2">Getting Started</h2>

            <div className="lp-tabs" role="tablist" aria-label="How it works audience">
              <button
                role="tab"
                aria-selected={howItWorksTab === 'customer'}
                onClick={() => setHowItWorksTab('customer')}
                className={`lp-tab${howItWorksTab === 'customer' ? ' lp-tab--active' : ''}`}
              >
                I need a service
              </button>
              <button
                role="tab"
                aria-selected={howItWorksTab === 'business'}
                onClick={() => setHowItWorksTab('business')}
                className={`lp-tab${howItWorksTab === 'business' ? ' lp-tab--active' : ''}`}
              >
                I run a business
              </button>
            </div>
          </div>

          <div className="lp-section-inner--lg" role="tabpanel">
            <div className="lp-steps">
              {(howItWorksTab === 'customer' ? CUSTOMER_STEPS : BUSINESS_STEPS).map((step, i) => (
                <div key={step.num} className="lp-step">
                  <div className="lp-step-num-row">
                    <span className="lp-step-num">{step.num}</span>
                    {i < 2 && <div className="lp-step-connector" aria-hidden="true" />}
                  </div>
                  <h3 className="lp-step-title">{step.title}</h3>
                  <p className="lp-step-desc">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="lp-hiw-cta">
              <Link
                to={howItWorksTab === 'customer' ? ROUTES.browse : ROUTES.auth}
                className="lp-btn lp-btn--blue"
              >
                {howItWorksTab === 'customer' ? 'Find a pro' : 'Start for free'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── For Professionals ─── */}
        <section id="for-professionals" className="lp-section lp-section--gray" aria-labelledby="pro-heading">
          <div className="lp-section-inner">
            <div className="lp-pro-grid">
              <div>
                <h2 id="pro-heading" className="lp-h2">Manage Your Appointment</h2>
                <p className="lp-body-muted">
                  Behind every listing is a pro running their day on {APP_NAME}. Set your hours, share one link, and let clients book and pay themselves. Free to start.
                </p>

                <div className="lp-features">
                  {PRO_FEATURES.map(f => (
                    <div key={f.title} className="lp-feature">
                      <div className="lp-feature-icon">
                        <f.icon aria-hidden="true" />
                      </div>
                      <div>
                        <p className="lp-feature-title">{f.title}</p>
                        <p className="lp-body-muted">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lp-pro-ctas">
                  <Link to={ROUTES.auth} className="lp-btn lp-btn--blue">Start for free</Link>
                  <Link to={ROUTES.browse} className="lp-btn lp-btn--outline">See a live booking page</Link>
                </div>
              </div>

              <div className="lp-mockup-wrap">
                <AppointmentMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="lp-section" aria-labelledby="pricing-heading">
          <div className="lp-pricing-intro">
            <h2 id="pricing-heading" className="lp-h2">
              Start free. Scale when you&apos;re ready.
            </h2>
            <p className="lp-body-muted lp-body-muted--center">
              No contracts, no booking fees, cancel anytime. Clients always browse and book for free.
            </p>
          </div>

          <div className="lp-pricing-grid">
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                className={`lp-pricing-card${plan.popular ? ' lp-pricing-card--popular' : ''}`}
              >
                {plan.popular && (
                  <span className="lp-pricing-popular">Most popular</span>
                )}
                <h3 className="lp-pricing-name">{plan.name}</h3>
                <div className="lp-pricing-price-row">
                  <span className="lp-pricing-amount">{plan.price}</span>
                  <span className="lp-pricing-period">{plan.period}</span>
                </div>
                <ul className="lp-pricing-features" role="list">
                  {plan.features.map(f => (
                    <li key={f} className="lp-pricing-feature">
                      <CheckCircle className="lp-pricing-check" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={ROUTES.auth}
                  className={`lp-pricing-cta${plan.popular ? ' lp-pricing-cta--blue' : ' lp-pricing-cta--outline'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section className="lp-section lp-section--sky" aria-labelledby="testimonials-heading">
          <div className="lp-section-inner--md">
            <h2 id="testimonials-heading" className="lp-h2">Reviews</h2>
          </div>

          <div className="lp-testi-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp-testi-card">
                <div className="lp-stars" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="lp-star" aria-hidden="true" />
                  ))}
                </div>
                <p className="lp-testi-quote">{t.quote}</p>
                <div className="lp-testi-author">
                  <img src={t.photo} alt={t.name} className="lp-testi-avatar" />
                  <div>
                    <div className="lp-testi-name">{t.name}</div>
                    <div className="lp-testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="lp-section lp-section--navy" aria-labelledby="cta-heading">
          <div className="lp-cta-inner">
            <h2 id="cta-heading" className="lp-h2 lp-h2--white">Find professionals in your neighbourhood. Support locals.</h2>
            <p className="lp-cta-sub">
              Find a trusted local pro, or start taking bookings of your own. It&apos;s free to begin.
            </p>
            <div className="lp-cta-actions">
              <Link to={ROUTES.browse} className="lp-btn lp-btn--blue">Find a pro</Link>
              <Link to={ROUTES.auth} className="lp-btn lp-btn--outline-white">List your business</Link>
            </div>
            <p className="lp-cta-note">Free to start · No booking fees · 2-minute setup</p>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="lp-footer" aria-label="Site footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Link to="/" className="lp-footer-logo">
                <Calendar className="lp-footer-logo-icon" style={{ color: '#000' }} aria-hidden="true" />
                {APP_NAME}
              </Link>
              <p className="lp-footer-tagline">Scheduling that works as hard as you do.</p>
            </div>
            <div>
              <h3 className="lp-footer-col-title">Discover</h3>
              <ul className="lp-footer-links">
                <li><Link to={ROUTES.browse} className="lp-footer-link">Browse pros</Link></li>
                <li><a href="#for-professionals" className="lp-footer-link">For professionals</a></li>
              </ul>
            </div>
            <div>
              <h3 className="lp-footer-col-title">Product</h3>
              <ul className="lp-footer-links">
                <li><Link to={ROUTES.auth} className="lp-footer-link">Sign up</Link></li>
                <li><a href="#pricing" className="lp-footer-link">Pricing</a></li>
                <li><Link to={ROUTES.help} className="lp-footer-link">Help centre</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="lp-footer-col-title">Legal</h3>
              <ul className="lp-footer-links">
                <li><Link to={ROUTES.terms} className="lp-footer-link">Terms</Link></li>
                <li><Link to={ROUTES.privacy} className="lp-footer-link">Privacy</Link></li>
                <li><Link to={ROUTES.refund} className="lp-footer-link">Refund policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p className="lp-footer-copy">&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
            <p className="lp-footer-copy">Made for local business.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
