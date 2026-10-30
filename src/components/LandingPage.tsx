import React from 'react';
import { Search, MapPin, Globe, Sparkles, ArrowRight, CheckCircle2, Zap, Target, Users, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <main className="min-h-screen bg-brutal-white text-brutal-black font-sans selection:bg-brutal-accent selection:text-brutal-black">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 border-b-4 border-brutal-black overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brutal-accent/10 -skew-x-12 translate-x-1/2 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block px-4 py-1 bg-brutal-black text-brutal-white text-xs font-black uppercase tracking-[0.3em] mb-6 brutal-border-sm">
                V.1.0 Lead Generation
              </div>
              <h1 className="text-7xl sm:text-8xl lg:text-9xl font-display uppercase leading-[0.8] mb-8">
                Find <span className="text-brutal-accent text-outline-brutal">Invisible</span> <br/>
                Businesses.
              </h1>
              <p className="text-2xl font-bold uppercase tracking-tight max-w-2xl mb-12">
                Stop chasing the same leads as everyone else. Find local businesses with <span className="bg-brutal-yellow px-2">Zero Online Presence</span> and convert them with AI-generated pitches.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-6"
            >
              <button
                onClick={onSignIn}
                className="group relative px-10 py-6 bg-brutal-black text-brutal-white font-display text-2xl uppercase tracking-widest hover:bg-brutal-accent hover:text-brutal-black transition-all brutal-border brutal-shadow"
              >
                <div className="flex items-center gap-4">
                  Start Finding Leads
                  <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>
              <div className="flex items-center gap-4 px-6 py-4 bg-brutal-white border-4 border-brutal-black brutal-shadow-sm">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-brutal-black bg-brutal-accent flex items-center justify-center font-black">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest leading-none">
                  Joined by <br/>
                  <span className="text-lg">500+ Freelancers</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Decorative Grid Icons */}
        <div className="absolute right-12 bottom-12 hidden lg:grid grid-cols-2 gap-4">
          <div className="w-24 h-24 bg-brutal-white border-4 border-brutal-black brutal-shadow flex items-center justify-center rotate-3">
            <Search className="w-12 h-12" />
          </div>
          <div className="w-24 h-24 bg-brutal-accent border-4 border-brutal-black brutal-shadow flex items-center justify-center -rotate-6">
            <Target className="w-12 h-12" />
          </div>
          <div className="w-24 h-24 bg-brutal-yellow border-4 border-brutal-black brutal-shadow flex items-center justify-center -rotate-3">
            <Zap className="w-12 h-12" />
          </div>
          <div className="w-24 h-24 bg-brutal-white border-4 border-brutal-black brutal-shadow flex items-center justify-center rotate-12">
            <Sparkles className="w-12 h-12" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-brutal-black py-4 border-b-4 border-brutal-black">
        <div className="marquee">
          <div className="marquee-content text-brutal-accent font-display text-2xl uppercase tracking-[0.2em]">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="mx-12">No Website Found • Unclaimed Profiles • Broken Links • Zero Social Media • Ready to Convert • No Website Found • </span>
            ))}
          </div>
        </div>
      </div>

      {/* Problem Section */}
      <section className="py-32 px-6 bg-brutal-white border-b-4 border-brutal-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-6xl sm:text-7xl font-display uppercase mb-12 leading-none">
                The <span className="bg-red-500 text-white px-4">Local Goldmine</span> <br/>
                Hidden in Plain Sight.
              </h2>
              <p className="text-xl font-bold uppercase tracking-tight mb-8">
                Every town has hundreds of high-quality local businesses that are completely invisible online. No website, no social media, no unclaimed Google profiles.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-brutal-white border-4 border-brutal-black brutal-shadow-sm">
                  <div className="w-12 h-12 bg-red-100 border-2 border-brutal-black flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase mb-1">Zero Competition</h4>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">Most agencies only chase businesses with existing ads. We help you find the ones nobody is talking to.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 bg-brutal-white border-4 border-brutal-black brutal-shadow-sm">
                  <div className="w-12 h-12 bg-brutal-accent/20 border-2 border-brutal-black flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-brutal-black" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase mb-1">Instant Value</h4>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">Show them exactly how invisible they are and provide a solution in minutes, not days.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-brutal-accent border-4 border-brutal-black brutal-shadow relative overflow-hidden flex items-center justify-center">
                 <div className="text-center p-12">
                    <div className="text-[120px] font-display leading-none mb-4">46%</div>
                    <div className="text-3xl font-black uppercase tracking-tighter">Of local searches have no results for high-value services.</div>
                 </div>
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-brutal-yellow border-4 border-brutal-black brutal-shadow flex flex-col items-center justify-center rotate-6 p-4">
                 <div className="text-4xl font-display">6.5B</div>
                 <div className="text-[10px] font-black uppercase text-center tracking-widest mt-2">Daily local searches on google maps</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 px-6 bg-brutal-accent border-b-4 border-brutal-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-6xl sm:text-8xl font-display uppercase mb-6 leading-none">How it works.</h2>
            <p className="text-xl font-bold uppercase tracking-widest">Three simple steps to close your next client.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                icon: Search,
                title: "Deep Audit",
                desc: "Search any niche and location. Our tool scans for businesses with no websites, broken links, or abandoned social media."
              },
              {
                step: "02",
                icon: Sparkles,
                title: "AI Pitching",
                desc: "Generate professional, data-driven sales pitches tailored to that specific business's weaknesses."
              },
              {
                step: "03",
                icon: Globe,
                title: "Build Preview",
                desc: "Create a draft website in seconds with our AI builder to show them what they're missing."
              }
            ].map((item, index) => (
              <div key={index} className="bg-brutal-white border-4 border-brutal-black p-8 brutal-shadow relative group hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-brutal-yellow border-4 border-brutal-black flex items-center justify-center font-display text-2xl group-hover:rotate-12 transition-transform">
                  {item.step}
                </div>
                <item.icon className="w-12 h-12 mb-8" />
                <h3 className="text-3xl font-display uppercase mb-4">{item.title}</h3>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-brutal-black text-brutal-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-7xl sm:text-9xl font-display uppercase leading-[0.8] mb-12">
              Start Closing <br/>
              Leads Today.
            </h2>
            <p className="text-2xl font-bold uppercase tracking-widest text-brutal-accent mb-16">
              Free to access. No credit card required. Pure leads.
            </p>
            <button
              onClick={onSignIn}
              className="px-16 py-8 bg-brutal-accent text-brutal-black font-display text-4xl uppercase tracking-[0.2em] hover:bg-brutal-white hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all brutal-border"
            >
              Get Started
            </button>
          </motion.div>
        </div>

        {/* Abstract shapes for CTA */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-brutal-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brutal-yellow/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
      </section>
    </main>
  );
};
