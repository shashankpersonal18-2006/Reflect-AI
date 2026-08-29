import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Shield,
  Lock,
  Compass,
  Target,
  BrainCircuit,
  ArrowRight,
  CheckCircle,
  FileText,
  Flame,
  Key,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-sky-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <nav className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Reflect<span className="text-sky-400">AI</span>
          </span>
        </div>

        <button
          id="landing-header-login-btn"
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-all shadow-sm"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 text-sky-400" />
        </button>
      </nav>

      {/* Hero Section */}
      <main className="w-full max-w-6xl mx-auto px-6 pt-12 pb-24 relative z-10 flex flex-col items-center text-center">
        {/* Brand Tagline Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold tracking-wide uppercase mb-8"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Write. Think. Reflect. Understand.</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl leading-[1.12]"
        >
          Your private space for{' '}
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
            AI-powered reflection
          </span>
        </motion.h1>

        {/* Hero Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed"
        >
          Write your thoughts, explore ideas, and understand your reflections with Gemini.
          Private, secure, and personal to you.
        </motion.p>

        {/* CTA: Continue with Google */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-3 w-full max-w-md"
        >
          <button
            id="landing-hero-google-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3.5 py-4 px-8 rounded-2xl font-semibold text-base text-slate-900 bg-white hover:bg-slate-100 shadow-xl shadow-white/10 hover:shadow-white/20 active:scale-98 transition-all duration-200"
          >
            {/* Google G Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
          </button>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg mt-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Isolated by Firebase UID
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-sky-400" />
              Passwordless &amp; Encrypted
            </span>
          </div>
        </motion.div>

        {/* Live Interface Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 w-full max-w-4xl rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden text-left"
        >
          {/* Mock Window Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-400 ml-2 font-mono">reflectai.app/journal/balancing-priorities</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Mode: Reflect
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Theme: Focused
              </span>
            </div>
          </div>

          {/* Mock Conversation Content */}
          <div className="p-6 space-y-4">
            {/* User turn */}
            <div className="flex items-start gap-3 max-w-2xl">
              <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold shrink-0 text-white">
                You
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none bg-slate-800/90 text-sm text-slate-200 border border-slate-700/50">
                I've been struggling to balance college assignments with learning modern cloud engineering.
                Whenever I start one, I feel guilty about neglecting the other.
              </div>
            </div>

            {/* AI turn */}
            <div className="flex items-start gap-3 max-w-2xl ml-auto flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 text-white shadow-md shadow-sky-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl rounded-tr-none bg-gradient-to-br from-slate-900 to-slate-950 text-sm text-slate-200 border border-sky-500/20 space-y-2">
                <p>
                  It sounds like you're carrying the weight of competing priorities rather than a lack of motivation.
                  Guilt often creeps in when goals are open-ended instead of time-bounded.
                </p>
                <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-xs text-sky-200 flex items-center justify-between">
                  <span>💡 <strong>AI detected a potential goal:</strong> "Timebox 45 minutes daily for cloud labs."</span>
                  <span className="font-semibold text-sky-400 underline cursor-default">+ Add as Goal</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="mt-28 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">6 Tailored AI Modes</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Switch seamlessly between Reflect, Brainstorm, Summarize, Solve a Problem, Plan, and Ask Gemini.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Goal &amp; Insight Synthesis</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Gemini identifies actionable commitments inside your reflections and extracts long-term patterns.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">True Zero-Knowledge Isolation</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Enforced by Firestore Security Rules scoped strictly to your authenticated Firebase UID.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-28 w-full max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How ReflectAI Works
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            A simple 3-step cycle designed to turn scattered daily thoughts into lasting clarity.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div className="p-5 rounded-xl border border-slate-800/60 bg-slate-900/20">
              <div className="text-2xl font-black text-sky-500 mb-2">01</div>
              <h4 className="font-semibold text-white text-base">Write Freely</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Pen your raw thoughts, respond to a daily prompt, or describe a dilemma in your own words.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800/60 bg-slate-900/20">
              <div className="text-2xl font-black text-indigo-500 mb-2">02</div>
              <h4 className="font-semibold text-white text-base">Engage with Gemini</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Receive multi-turn reflective questions, identify emotional themes, and brainstorm solutions.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800/60 bg-slate-900/20">
              <div className="text-2xl font-black text-teal-500 mb-2">03</div>
              <h4 className="font-semibold text-white text-base">Track Insights &amp; Goals</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Generate structured summaries, track your streak, and convert breakthroughs into active goals.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action */}
        <div className="mt-28 p-8 sm:p-12 w-full max-w-4xl rounded-3xl border border-sky-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/40 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to clarify your thoughts?
          </h2>
          <p className="mt-4 text-slate-300 max-w-md mx-auto text-sm">
            Join private journaling with Google Sign-In. Your data stays strictly yours.
          </p>

          <button
            id="landing-bottom-cta-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-950 bg-white hover:bg-slate-100 shadow-lg shadow-white/10 active:scale-98 transition-all"
          >
            <span>Start Your Private Journal</span>
            <ArrowRight className="w-4 h-4 text-sky-500" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500">
        <p>© 2026 ReflectAI. Built for genuine self-reflection with Google Gemini &amp; Firebase.</p>
        <p className="mt-1 text-[11px] text-slate-600">
          ReflectAI is an observational reflection companion, not a mental health or medical diagnostic tool.
        </p>
      </footer>
    </div>
  );
};
