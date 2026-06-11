import { useState } from 'react';
import { Link } from 'react-router-dom';

const LEFT_PHOTO =
  'https://hips.hearstapps.com/hmg-prod/images/young-african-american-man-dressed-in-modern-royalty-free-image-1731433466.jpg?crop=0.668xw:1.00xh;0.248xw,0&resize=640:*';

const RIGHT_PHOTO =
  'https://cdn.mos.cms.futurecdn.net/v2/t:0,l:452,cw:1796,ch:1796,q:80,w:1796/WXZQnTcQHyt2igzrwhNUyW.jpg';

type ModalType = 'terms' | 'privacy' | null;

function LegalModal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  if (!type) return null;

  const isTerms = type === 'terms';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
        >
          ×
        </button>

        <h2 className="mb-1 text-2xl font-black text-gray-900">
          {isTerms ? 'Terms of Service' : 'Privacy Policy'}
        </h2>
        <p className="mb-6 text-xs text-gray-400">Last updated: June 2026</p>

        {isTerms ? (
          <div className="space-y-4 text-sm leading-relaxed text-gray-600">
            <p>Welcome to PaceTrack. By creating an account or using our service, you agree to these terms.</p>
            <h3 className="font-semibold text-gray-800">Use of Service</h3>
            <p>PaceTrack is a personal running tracker. You must be at least 13 years old to use this service. You are responsible for maintaining the confidentiality of your account credentials.</p>
            <h3 className="font-semibold text-gray-800">Your Data</h3>
            <p>You own your running data. We store it securely to power your dashboard, history, and club features. You may delete your account and all associated data at any time.</p>
            <h3 className="font-semibold text-gray-800">Acceptable Use</h3>
            <p>You agree not to misuse the platform, attempt unauthorized access, or interfere with other users' experience.</p>
            <h3 className="font-semibold text-gray-800">Changes</h3>
            <p>We may update these terms from time to time. Continued use of PaceTrack after changes constitutes acceptance of the new terms.</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed text-gray-600">
            <p>Your privacy matters. This policy explains what data we collect and how we use it.</p>
            <h3 className="font-semibold text-gray-800">What We Collect</h3>
            <p>We collect your name, email, and the running data you log — including GPS coordinates, distance, pace, and elevation when provided.</p>
            <h3 className="font-semibold text-gray-800">How We Use It</h3>
            <p>Your data is used solely to power your personal dashboard, run history, and club features. We do not sell your data to third parties.</p>
            <h3 className="font-semibold text-gray-800">Data Security</h3>
            <p>We use industry-standard encryption and secure cloud storage. Passwords are hashed and never stored in plain text.</p>
            <h3 className="font-semibold text-gray-800">Your Rights</h3>
            <p>You can request a copy of your data or ask us to delete your account at any time by contacting us.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <div className="flex min-h-svh flex-col bg-white">

      <LegalModal type={modal} onClose={() => setModal(null)} />

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white/90 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <span className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            <span className="text-gray-900">Pace</span>
            <span className="text-orange-500">Track</span>
          </span>
          {/* Tagline — Space Grotesk, light weight, spaced out */}
          <span
            className="hidden text-[11px] font-light uppercase tracking-[0.25em] text-gray-400 md:block"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Log your runs&nbsp;·&nbsp;Track your pace&nbsp;·&nbsp;Train smarter
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-full border border-gray-900 px-5 py-1.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-900 hover:text-white"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Log In
        </Link>
      </nav>

      {/* ── Three-column hero ── */}
      <div className="flex flex-1">

        {/* Left photo */}
        <div
          className="hidden flex-1 bg-center bg-no-repeat md:block"
          style={{ backgroundImage: `url(${LEFT_PHOTO})`, backgroundSize:'100%' }}
        />

        {/* Center card */}
        <div
          className="flex w-full flex-col items-center justify-center px-10 py-16 md:w-[460px] md:shrink-0"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {/* Eyebrow */}
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            Your Running Log
          </p>

          {/* Headline — Bebas Neue for that athletic punch */}
          <h1
            className="text-center text-6xl leading-none text-gray-900"
            style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.02em' }}
          >
            Run Further.
            <br />
            <span className="text-orange-500">Go Faster.</span>
          </h1>

          <p className="mt-5 max-w-[260px] text-center text-sm font-light leading-relaxed text-gray-500">
            Record every workout, watch your pace compute automatically, and own
            your entire training history — free.
          </p>

          <p className="mt-10 text-sm text-gray-400">
            Already a member?{' '}
            <Link
              to="/login"
              className="font-semibold text-orange-500 hover:text-orange-400"
            >
              Log In
            </Link>
          </p>

          <Link
            to="/signup"
            className="mt-4 w-full max-w-[260px] rounded-full bg-orange-500 py-3 text-center text-sm font-bold tracking-wide text-white transition-all hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-200"
          >
            Sign Up — It's Free
          </Link>

          <p className="mt-5 max-w-[260px] text-center text-[11px] leading-relaxed text-gray-300">
            By continuing you agree to our{' '}
            <button
              onClick={() => setModal('terms')}
              className="underline hover:text-orange-400"
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              onClick={() => setModal('privacy')}
              className="underline hover:text-orange-400"
            >
              Privacy Policy
            </button>.
          </p>
        </div>

        {/* Right photo */}
        <div
          className="hidden flex-1 bg-cover md:block"
          style={{ backgroundImage: `url(${RIGHT_PHOTO})`, backgroundPosition: '100% center' }}
        />
      </div>
    </div>
  );
}
