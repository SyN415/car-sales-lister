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

/* ── Gauge bar visualizer ── */
const GAUGE_BARS = Array.from({ length: 12 }, (_, i) => i);

const GaugeVisualizer: React.FC = () => (
  <div className="relative w-full max-w-md mx-auto h-28 flex items-end justify-center gap-1">
    {GAUGE_BARS.map((i) => (
      <motion.div
        key={i}
        className="rounded-sm bg-cyan-500/70"
        style={{ width: 6 }}
        animate={{
          height: [12, 24 + Math.sin(i * 0.8) * 40, 12],
          opacity: [0.35, 0.85, 0.35],
        }}
        transition={{
          duration: 2.4 + i * 0.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.1,
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
    accent: 'text-cyan-400',
  },
  {
    icon: DollarSign,
    title: 'KBB Valuations',
    description: 'Instant Kelley Blue Book pricing so you know what every car is actually worth.',
    accent: 'text-emerald-400',
  },
  {
    icon: Bell,
    title: 'Smart Deal Alerts',
    description: 'Get notified the moment a car matching your criteria drops below market value.',
    accent: 'text-amber-400',
  },
  {
    icon: TrendingUp,
    title: 'Deal Scoring',
    description: 'Every listing gets a 0–100 deal score calculated from price, condition, and mileage.',
    accent: 'text-cyan-400',
  },
  {
    icon: Shield,
    title: 'VIN Decode & Red Flags',
    description: 'Decode any VIN to reveal history, specs, and potential red flags instantly.',
    accent: 'text-slate-400',
  },
  {
    icon: Zap,
    title: 'Real-Time Scraping',
    description: 'Our browser extension scrapes live pages and syncs new listings to your dashboard.',
    accent: 'text-emerald-400',
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
    <div className="relative overflow-hidden bg-surface-black text-white selection:bg-cyan-500/30 selection:text-white">
      {/* ── Background layers ── */}
      <div className="pointer-events-none fixed inset-0 z-0 grid-surface" />
      <div className="pointer-events-none fixed inset-0 z-0 noise-overlay" />
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.04] blur-[180px] animate-drift z-0" />
      <div className="pointer-events-none fixed bottom-[-200px] right-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[160px] animate-drift z-0" style={{ animationDelay: '-10s' }} />

      {/* ═══ HERO ═══ */}
      <Section className="relative z-10 pt-32 pb-20 md:pt-44 md:pb-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Tag */}
          <motion.div custom={0} variants={fadeUp} className="inline-flex mb-8">
            <span className="pill-btn pill-btn--ghost text-[11px] tracking-[0.15em] uppercase cursor-default">
              Data-driven car shopping
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl font-extralight leading-[1.08] tracking-tight mb-6"
          >
            Find underpriced cars{' '}
            <span className="text-gradient-cyan font-normal">before anyone else</span>
          </motion.h1>

          {/* Sub-heading */}
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-base md:text-lg text-white/45 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Aggregate listings from Facebook Marketplace and Craigslist.
            Get KBB valuations, deal scores, and real-time alerts — all in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-3 mb-16">
            <Link to="/listings" className="pill-btn pill-btn--primary">
              Browse Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/signup" className="pill-btn pill-btn--ghost">
              Get Started Free
            </Link>
          </motion.div>

          {/* Gauge Visualizer */}
          <motion.div custom={4} variants={scaleIn}>
            <GaugeVisualizer />
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
      <Section className="relative z-10 py-24 md:py-36 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div custom={0} variants={fadeUp} className="text-center mb-16">
            <p className="text-[11px] tracking-[0.2em] uppercase text-cyan-500/50 font-mono mb-3">CAPABILITIES</p>
            <h2 className="text-3xl md:text-4xl font-extralight leading-tight">
              Everything you need to find{' '}
              <span className="text-gradient-cyan font-normal">underpriced cars</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  custom={i}
                  variants={fadeUp}
                  className="card-surface p-7 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className={`w-4 h-4 ${feat.accent}`} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{feat.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{feat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>


      {/* ═══ HOW IT WORKS ═══ */}
      <Section className="relative z-10 py-24 md:py-36 px-4 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <motion.div custom={0} variants={fadeUp} className="text-center mb-16">
            <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-mono mb-3">WORKFLOW</p>
            <h2 className="text-3xl md:text-4xl font-extralight leading-tight">
              Three steps to your next{' '}
              <span className="text-gradient-cyan font-normal">great deal</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.num} custom={i} variants={fadeUp} className="relative text-center md:text-left">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[calc(50%+40px)] right-[-40px] h-px border-t border-dashed border-white/[0.06]" />
                  )}
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] mb-5">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-cyan-500/40 font-mono mb-2">{step.num}</p>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══ CODE / DX SHOWCASE ═══ */}
      <Section className="relative z-10 py-24 md:py-36 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div custom={0} variants={fadeUp} className="text-center mb-12">
            <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-mono mb-3">DEVELOPER EXPERIENCE</p>
            <h2 className="text-3xl md:text-4xl font-extralight leading-tight">
              Built for power users
            </h2>
          </motion.div>

          <motion.div custom={1} variants={scaleIn} className="card-surface overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="ml-3 text-[11px] text-white/25 font-mono">watchlist-config.ts</span>
            </div>
            <div className="p-5 font-mono text-sm leading-7 text-white/50 overflow-x-auto">
              <div><span className="text-blue-400">const</span> <span className="text-cyan-400">watchlist</span> = {`{`}</div>
              <div className="pl-6"><span className="text-emerald-400">make</span>: <span className="text-amber-400">"Toyota"</span>,</div>
              <div className="pl-6"><span className="text-emerald-400">model</span>: <span className="text-amber-400">"Camry"</span>,</div>
              <div className="pl-6"><span className="text-emerald-400">yearRange</span>: [<span className="text-cyan-300">2020</span>, <span className="text-cyan-300">2024</span>],</div>
              <div className="pl-6"><span className="text-emerald-400">maxPrice</span>: <span className="text-cyan-300">25000</span>,</div>
              <div className="pl-6"><span className="text-emerald-400">maxMileage</span>: <span className="text-cyan-300">60000</span>,</div>
              <div className="pl-6"><span className="text-emerald-400">alertOn</span>: <span className="text-amber-400">"deal_score &gt; 80"</span>,</div>
              <div>{`}`};</div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══ BOTTOM CTA ═══ */}
      <Section className="relative z-10 py-28 md:py-40 px-4 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            custom={0}
            variants={fadeUp}
            className="text-3xl md:text-5xl font-extralight leading-tight mb-6"
          >
            Stop overpaying.{' '}
            <span className="text-gradient-cyan font-normal">Start scoring deals.</span>
          </motion.h2>
          <motion.p custom={1} variants={fadeUp} className="text-base text-white/35 mb-10">
            Join thousands of buyers using data-driven car shopping.
          </motion.p>
          <motion.div custom={2} variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/signup" className="pill-btn pill-btn--primary text-base px-10 py-3.5">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/listings" className="pill-btn pill-btn--ghost text-base px-10 py-3.5">
              Explore Listings
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-cyan-500">CSL</span>
            <span className="text-sm text-white/40">Car Sales Lister</span>
          </div>
          <p className="text-[11px] text-white/15">&copy; {new Date().getFullYear()} Car Sales Lister</p>
          <div className="flex items-center gap-6 text-xs text-white/25">
            <Link to="/listings" className="hover:text-white/50 transition-colors">Listings</Link>
            <Link to="/login" className="hover:text-white/50 transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white/50 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;