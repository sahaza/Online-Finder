import React from 'react';
import { motion } from 'motion/react';
import { LogIn, ArrowLeft, ShieldCheck, Zap, Globe } from 'lucide-react';

interface AuthPageProps {
  onSignIn: () => void;
  onBack: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSignIn, onBack }) => {
  return (
    <div className="min-h-screen bg-brutal-accent flex items-center justify-center p-6 selection:bg-brutal-black selection:text-brutal-white">
      <div className="absolute top-12 left-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 font-display uppercase tracking-widest hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all group"
        >
          <ArrowLeft className="w-6 h-6 group-hover:block" />
          Back to Home
        </button>
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-brutal-white border-8 border-brutal-black p-12 brutal-shadow relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-black/5 -translate-y-1/2 translate-x-1/2 rotate-45 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-brutal-black border-4 border-brutal-black flex items-center justify-center mb-8 brutal-shadow-sm rotate-3">
            <LogIn className="w-8 h-8 text-brutal-accent" />
          </div>

          <h1 className="text-5xl font-display uppercase leading-none mb-4">
            Security <br/>
            Check.
          </h1>
          <p className="text-sm font-bold uppercase tracking-tight text-gray-500 mb-10">
            Sign in to access the OfflineFinder dashboard and start auditing local leads.
          </p>

          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-4 p-4 border-2 border-brutal-black bg-brutal-yellow/10">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Secure Authentication</span>
            </div>
            <div className="flex items-center gap-4 p-4 border-2 border-brutal-black bg-brutal-accent/10">
              <Zap className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Instant Dashboard Access</span>
            </div>
          </div>

          <button
            onClick={onSignIn}
            className="w-full py-6 bg-brutal-black text-brutal-white font-display text-2xl uppercase tracking-[0.2em] hover:bg-brutal-accent hover:text-brutal-black transition-all brutal-border brutal-shadow flex items-center justify-center gap-4 group"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-6 h-6 invert group-hover:invert-0 transition-all"
            />
            Sign In with Google
          </button>

          <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-center text-gray-400">
            By signing in, you agree to our <br/>
            <span className="text-brutal-black underline decoration-2">Terms of Service</span> and <span className="text-brutal-black underline decoration-2">Privacy Policy</span>
          </p>
        </div>
      </motion.div>

      {/* Decorative floating elements */}
      <div className="absolute bottom-20 right-20 hidden lg:block">
        <div className="w-32 h-32 border-4 border-brutal-black bg-brutal-yellow brutal-shadow -rotate-12 flex items-center justify-center">
            <Globe className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
};
