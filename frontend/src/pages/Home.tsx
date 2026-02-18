import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Search,
  DollarSign,
  Bell,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  Car,
  Eye,
  Globe,
} from 'lucide-react';

/* ── Animation helpers ── */
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: easeOutExpo },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: easeOutExpo },
  }),
};

/* ── Section wrapper with InView trigger ── */
const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  );
};

/* ── Pill Visualizer (abstract animated pills) ── */
const PILL_COLORS = [
  'bg-mint', 'bg-violet', 'bg-sky', 'bg-amber', 'bg-coral',
  'bg-mint', 'bg-sky', 'bg-violet',
];

const PillVisualizer: React.FC = () => (
  <div className="relative w-full max-w-lg mx-auto h-40 flex items-center justify-center gap-1.5">
    {PILL_COLORS.map((color, i) => (
      <motion.div
        key={i}
        className={`${color} rounded-full opacity-80`}
        style={{ width: 8 + Math.random() * 8 }}
        animate={{
          height: [20 + i * 6, 50 + Math.sin(i) * 30, 20 + i * 6],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 2 + i * 0.3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.15,
        }}
      />
    ))}
  </div>
);

/* ── Feature data ── */
const FEATURES = [
  {
    icon: Search,
    title: 'Multi-Platform Search',
    description: 'Aggregate listings from Facebook Marketplace and Craigslist in one unified feed.',
    accent: 'text-sky',
  },
  {
    icon: DollarSign,
    title: 'KBB Valuations',
    description: 'Instant Kelley Blue Book pricing so you know what every car is actually worth.',
    accent: 'text-mint',
  },
  {
    icon: Bell,
    title: 'Smart Deal Alerts',
    description: 'Get notified the moment a car matching your criteria drops below market value.',
    accent: 'text-amber',
  },
  {
    icon: TrendingUp,
    title: 'Deal Scoring',
    description: 'Every listing gets a 0–100 deal score calculated from price, condition, and mileage.',
    accent: 'text-coral',
  },
  {
    icon: Shield,
    title: 'VIN Decode & Red Flags',
    description: 'Decode any VIN to reveal history, specs, and potential red flags instantly.',
    accent: 'text-violet',
  },
  {
    icon: Zap,
    title: 'Real-Time Scraping',
    description: 'Our browser extension scrapes live pages and syncs new listings to your dashboard.',
    accent: 'text-mint',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Install the Extension',
    description: 'Add our Chrome extension to start scraping listings from Facebook & Craigslist.',
    icon: Globe,
  },
  {
    num: '02',
    title: 'Set Your Criteria',
    description: 'Create watchlists with make, model, year, price, and mileage filters.',
    icon: Eye,
  },
  {
    num: '03',
    title: 'Get Scored Deals',
    description: 'We auto-score every listing against KBB values and alert you on the best deals.',
    icon: BarChart3,
  },
];

const STATS = [
  { value: '50K+', label: 'LISTINGS TRACKED' },
  { value: '95%', label: 'PRICING ACCURACY' },
  { value: '< 5min', label: 'ALERT LATENCY' },
  { value: '2', label: 'PLATFORMS' },
];

/* ══════════════════════════════════════════════════
   HOME PAGE
   ══════════════════════════════════════════════════ */
const Home: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-surface-black text-white selection:bg-mint/30 selection:text-white">
      {/* ── Background layers ── */}
      <div className="pointer-events-none fixed inset-0 z-0 dot-matrix" />
      <div className="pointer-events-none fixed inset-0 z-0 grid-lines opacity-40" />
      {/* Glow orbs */}
      <div className="pointer-events-none fixed top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-mint/[0.06] blur-[160px] animate-float-slow z-0" />
      <div className="pointer-events-none fixed bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-violet/[0.07] blur-[140px] animate-float-slower z-0" />
      <div className="pointer-events-none fixed top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-sky/[0.04] blur-[120px] animate-pulse-glow z-0" />

      {/* ═══ HERO ═══ */}
      <Section className="relative z-10 pt-32 pb-24 md:pt-44 md:pb-36 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div custom={0} variants={fadeUp} className="inline-flex mb-8">
            <span className="glass-pill px-5 py-2 text-xs font-medium tracking-widest uppercase text-white/70 flex items-center gap-2">
              <Car className="w-3.5 h-3.5 text-mint" />
              <span>Smarter Car Shopping</span>
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extralight leading-[1.05] tracking-tight mb-6"
          >
            Find Your{' '}
            <span className="text-gradient-mint font-light">Perfect</span>
            <br />
            Car Deal
          </motion.h1>

          {/* Sub-heading */}
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
          >
            Aggregate car listings from Facebook Marketplace and Craigslist.
            Get KBB valuations, deal scores, and real-time alerts — all in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link
              to="/listings"
              className="glass-pill inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-mint/10 border-mint/30 text-mint font-medium text-base hover:bg-mint/20 transition-colors"
            >
              Browse Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/signup"
              className="glass-pill inline-flex items-center justify-center gap-2 px-8 py-3.5 text-white/70 font-medium text-base hover:text-white transition-colors"
            >
              Get Started Free
            </Link>
          </motion.div>

          {/* Pill Visualizer */}
          <motion.div custom={4} variants={scaleIn}>
            <PillVisualizer />
          </motion.div>
        </div>
      </Section>

      {/* ═══ SOCIAL PROOF / STATS ═══ */}
      <Section className="relative z-10 py-20 px-4 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} custom={i} variants={fadeUp} className="text-center">
                <p className="text-3xl md:text-4xl font-light text-white mb-1">{stat.value}</p>
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-mono">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FEATURES ═══ */}
      <Section className="relative z-10 py-28 md:py-40 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div custom={0} variants={fadeUp} className="text-center mb-20">
            <p className="text-[11px] tracking-[0.25em] uppercase text-mint/60 font-mono mb-4">CAPABILITIES</p>
            <h2 className="text-3xl md:text-5xl font-extralight leading-tight">
              Everything you need to find
              <br />
              <span className="text-gradient-mint font-light">underpriced cars</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  custom={i}
                  variants={fadeUp}
                  className="glass-card p-8 group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${feat.accent}`} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{feat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>


      {/* ═══ HOW IT WORKS ═══ */}
      <Section className="relative z-10 py-28 md:py-40 px-4 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <motion.div custom={0} variants={fadeUp} className="text-center mb-20">
            <p className="text-[11px] tracking-[0.25em] uppercase text-violet/60 font-mono mb-4">WORKFLOW</p>
            <h2 className="text-3xl md:text-5xl font-extralight leading-tight">
              Three steps to your next{' '}
              <span className="text-gradient-mint font-light">great deal</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.num} custom={i} variants={fadeUp} className="relative text-center md:text-left">
                  {/* Connector line (hidden on last) */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[calc(50%+40px)] right-[-40px] h-px border-t border-dashed border-white/10" />
                  )}
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
                    <Icon className="w-5 h-5 text-mint" />
                  </div>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-mint/40 font-mono mb-2">{step.num}</p>
                  <h3 className="text-xl font-medium text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══ CODE / DX SHOWCASE ═══ */}
      <Section className="relative z-10 py-28 md:py-40 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div custom={0} variants={fadeUp} className="text-center mb-16">
            <p className="text-[11px] tracking-[0.25em] uppercase text-sky/60 font-mono mb-4">DEVELOPER EXPERIENCE</p>
            <h2 className="text-3xl md:text-5xl font-extralight leading-tight">
              Built for power users
            </h2>
          </motion.div>

          {/* Code block mock */}
          <motion.div custom={1} variants={scaleIn} className="glass-card overflow-hidden">
            {/* Mac-style window header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-xs text-white/30 font-mono">watchlist-config.ts</span>
            </div>
            <div className="p-6 font-mono text-sm leading-7 text-white/60 overflow-x-auto">
              <div><span className="text-violet">const</span> <span className="text-sky">watchlist</span> = {`{`}</div>
              <div className="pl-6"><span className="text-mint">make</span>: <span className="text-amber">"Toyota"</span>,</div>
              <div className="pl-6"><span className="text-mint">model</span>: <span className="text-amber">"Camry"</span>,</div>
              <div className="pl-6"><span className="text-mint">yearRange</span>: [<span className="text-coral">2020</span>, <span className="text-coral">2024</span>],</div>
              <div className="pl-6"><span className="text-mint">maxPrice</span>: <span className="text-coral">25000</span>,</div>
              <div className="pl-6"><span className="text-mint">maxMileage</span>: <span className="text-coral">60000</span>,</div>
              <div className="pl-6"><span className="text-mint">alertOn</span>: <span className="text-amber">"deal_score &gt; 80"</span>,</div>
              <div>{`}`};</div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══ BOTTOM CTA ═══ */}
      <Section className="relative z-10 py-32 md:py-48 px-4 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            custom={0}
            variants={fadeUp}
            className="text-4xl md:text-6xl font-extralight leading-tight mb-6"
          >
            Stop overpaying.
            <br />
            <span className="text-gradient-mint font-light">Start scoring deals.</span>
          </motion.h2>
          <motion.p custom={1} variants={fadeUp} className="text-lg text-white/40 mb-10 font-light">
            Join thousands of buyers using data-driven car shopping.
          </motion.p>
          <motion.div custom={2} variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-mint text-surface-black font-semibold text-base hover:bg-mint-dim transition-colors"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/listings"
              className="glass-pill inline-flex items-center justify-center gap-2 px-10 py-4 text-white/70 font-medium text-base hover:text-white transition-colors"
            >
              Explore Listings
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-white/[0.04] py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-mint" />
            <span className="font-semibold text-white/70">Car Sales Lister</span>
          </div>
          <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} Car Sales Lister. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link to="/listings" className="hover:text-white/60 transition-colors">Listings</Link>
            <Link to="/login" className="hover:text-white/60 transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white/60 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;