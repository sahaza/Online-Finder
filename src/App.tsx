import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Search, MapPin, Globe, Phone, AlertCircle, CheckCircle2, XCircle, Loader2, ExternalLink, Filter, Info, Code, Copy, Eye, X, Sparkles, Save, RotateCcw, Smartphone, Tablet, Monitor, LogIn, LogOut, User as UserIcon, Check, Download, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism.css';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';
import { Business, SearchState } from './types';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  getDocs,
  orderBy,
  deleteDoc,
  serverTimestamp,
  User
} from './firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) errorMessage = `Firebase Error: ${parsed.error}`;
      } catch (e) {
        if (this.state.error?.message) errorMessage = this.state.error.message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h2>
            <p className="text-gray-600 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
// --- End Error Handling ---

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BUSINESS_CATEGORIES = [
  "Plumbers",
  "Bakeries",
  "Restaurants",
  "Dentists",
  "Electricians",
  "Gyms",
  "Hair Salons",
  "Auto Repair",
  "Landscaping",
  "HVAC",
  "Lawyers",
  "Accountants",
  "Real Estate",
  "Roofing",
  "Cleaning Services",
  "Pet Grooming",
  "Local Handymen",
  "Small Cafes",
  "Independent Florists",
  "Boutique Shops"
];

const CATEGORY_SPECIFIC_SECTIONS: Record<string, string[]> = {
  "Plumbers": ["Services List (Emergency repairs, pipe installation, etc.)", "Service Area Map", "Request a Quote Form"],
  "Bakeries": ["Menu (Breads, Pastries, Cakes)", "Gallery of baked goods", "Order Online button"],
  "Restaurants": ["Menu (Appetizers, Mains, Desserts)", "Reservation Form", "Gallery of dishes"],
  "Dentists": ["List of Dental Services", "Meet the Team", "Book an Appointment"],
  "Electricians": ["Services (Residential, Commercial, Industrial)", "Safety Certifications", "Request a Quote"],
  "Gyms": ["Membership Plans", "Class Schedule", "Trainer Profiles"],
  "Hair Salons": ["Service Menu (Haircuts, Coloring, Styling)", "Stylist Portfolio", "Book Online"],
  "Auto Repair": ["Services (Oil Change, Brake Repair, etc.)", "Warranty Information", "Schedule Service"],
  "Landscaping": ["Portfolio of Projects", "Seasonal Services", "Free Estimate Form"],
  "HVAC": ["Heating & Cooling Services", "Maintenance Plans", "Emergency Service Info"],
  "Lawyers": ["Practice Areas", "Attorney Profiles", "Free Consultation Form"],
  "Accountants": ["Tax Services", "Bookkeeping", "Consultation Request"],
  "Real Estate": ["Property Listings", "Meet the Agents", "Home Valuation Form"],
  "Roofing": ["Roofing Services (Repair, Replacement)", "Materials Used", "Free Inspection Form"],
  "Cleaning Services": ["Cleaning Packages (Standard, Deep, Move-in/out)", "Checklist of services", "Get a Quote"],
  "Pet Grooming": ["Grooming Services (Bath, Haircut, Nail Trim)", "Gallery of happy pets", "Book Appointment"],
};

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [state, setState] = useState<SearchState>({
    query: '',
    location: '',
    radius: '10 miles',
    isSearching: false,
    results: [],
    error: null,
    recentSearches: [],
  });

  const [filter, setFilter] = useState<'all' | 'no-website' | 'unreachable' | 'offline'>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [htmlCode, setHtmlCode] = useState<string>('<!-- Your HTML will appear here -->');
  const [showPreview, setShowPreview] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [userInstructions, setUserInstructions] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'search' | 'builder' | 'saved' | 'admin'>('landing');
  const [userProfile, setUserProfile] = useState<{ credits: number, hasUsedFreeSearch: boolean, isAdmin: boolean, email: string } | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const fetchAllUsers = async () => {
    if (!userProfile?.isAdmin) return;
    setIsAdminLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('email'));
      const snapshots = await getDocs(q);
      setAllUsers(snapshots.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Admin fetch error:", error);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleAddCredits = async (targetUserId: string, amount: number) => {
    try {
      const userRef = doc(db, 'users', targetUserId);
      const targetUser = allUsers.find(u => u.id === targetUserId);
      if (!targetUser) return;
      
      const newCredits = (targetUser.credits || 0) + amount;
      await setDoc(userRef, { credits: newCredits }, { merge: true });
      
      const txnRef = doc(collection(db, 'transactions'));
      await setDoc(txnRef, {
        userId: targetUserId,
        amount: amount,
        type: 'admin_add',
        description: `Admin added ${amount} credits`,
        timestamp: serverTimestamp()
      });

      toast.success(`Added ${amount} credits to ${targetUser.email}`);
      fetchAllUsers(); // Refresh
      if (targetUserId === user?.uid) {
        setUserProfile(prev => prev ? { ...prev, credits: newCredits } : null);
      }
    } catch (error) {
      toast.error("Failed to add credits");
    }
  };

  const loadUserProfile = useCallback(async (uid: string, email: string) => {
    const userDocRef = doc(db, 'users', uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as any);
      } else {
        // Initialize user profile
        const initialProfile = {
          credits: 0,
          hasUsedFreeSearch: false,
          isAdmin: email === "contact@sahaza.mg",
          email: email,
          updatedAt: serverTimestamp()
        };
        await setDoc(userDocRef, initialProfile);
        setUserProfile(initialProfile as any);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        toast.error("Sign-in popup blocked. Trying redirect method...", {
          duration: 3000,
        });
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          console.error("Redirect sign-in error:", redirectError);
          toast.error("Direct sign-in failed. Please allow popups or use a different browser.");
        }
      } else {
        console.error("Sign in error:", error);
        toast.error(`Sign in error: ${error.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleSaveHTML = async () => {
    if (!editingBusiness || !user) {
      if (!user) toast.error("Please sign in to save your HTML.");
      return;
    }

    setIsSaving(true);
    const path = `users/${user.uid}/websites/${editingBusiness.id}`;
    try {
      await setDoc(doc(db, path), {
        html: htmlCode,
        businessId: editingBusiness.id,
        businessName: editingBusiness.name,
        userId: user.uid,
        customTitle: customTitle,
        updatedAt: serverTimestamp()
      });
      const now = new Date().toLocaleTimeString();
      setLastSaved(now);
      setIsDraftLoaded(true);
      
      // Generate share URL
      const url = `${window.location.origin}/share/${user.uid}/${editingBusiness.id}`;
      setShareUrl(url);
      toast.success("Website published successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingBusiness?.name || 'website'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML file downloaded!");
  };

  useEffect(() => {
    // Handle redirect result
    getRedirectResult(auth).catch(error => {
      console.error("Redirect result error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        loadUserProfile(currentUser.uid, currentUser.email || "");
        setCurrentView(prev => (prev === 'landing' || prev === 'auth') ? 'search' : prev);
      } else {
        setUserProfile(null);
        setCurrentView('landing');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCopyPitchPrompt = (b: Business) => {
    const statusText = b.status === 'offline' 
      ? "ZERO online presence (no website and no social media)" 
      : b.status === 'no-website' 
        ? "no website listed" 
        : "a broken website link";
    
    const socialText = b.hasSocialMedia === false ? "no social media presence" : "limited social media";
    const unclaimedText = b.isUnclaimed ? "an UNCLAIMED Google Maps profile" : "";
    
    const prompt = `Act as a high-ticket digital sales expert. Write a professional, persuasive, and empathetic sales pitch for "${b.name}". 
      
      CONTEXT:
      - Business: ${b.name}
      - Location: ${b.address || 'Not specified'}
      - Current Status: They have ${statusText}${unclaimedText ? ` and ${unclaimedText}` : ''}.
      - Social Media: ${socialText}.
      
      GOAL:
      Convince them that they are losing significant local revenue to competitors who are easier to find online.
      
      PITCH REQUIREMENTS:
      1. Hook: Start with a compliment about their business/reviews (${b.rating ? `${b.rating} stars!` : 'their local reputation'}).
      2. Problem: Explain that 80%+ of local customers search online before visiting, and currently, ${b.name} is "invisible" to them.
      3. Solution: Mention that I've already designed a modern, mobile-responsive "Digital Storefront" specifically for them to capture this missed traffic.
      4. Benefit: Focus on "Trust" and "Convenience" for the customer.
      5. Call to Action: Ask for a 5-minute chat to show them the draft.
      
      TONE:
      Professional, helpful, not "salesy" or aggressive. Focus on being a local partner.
      
      Return ONLY the text for the pitch.`;
    
    navigator.clipboard.writeText(prompt);
    toast.success(`Optimized pitch prompt for ${b.name} copied!`);
  };

  const handleCopyPrompt = () => {
    if (!editingBusiness) return;
    
    const category = state.query;
    const specificSections = CATEGORY_SPECIFIC_SECTIONS[category] || ["A detailed Services section"];
    
    const prompt = `Generate a complete, modern, and responsive one-page HTML/CSS landing page for a business named "${editingBusiness.name}".
      Details:
      - Address: ${editingBusiness.address || 'Not specified'}
      - Phone: ${editingBusiness.phone || 'Not specified'}
      - Category: ${category}
      ${userInstructions ? `- Additional Instructions: ${userInstructions}` : ''}
      
      The website should include:
      - A hero section with a clear call to action.
      - An "About Us" section.
      ${specificSections.map(section => `- A ${section} section.`).join('\n      ')}
      - A contact section with the provided address and phone.
      - Modern typography (use Google Fonts like Inter).
      - Responsive design using Tailwind CSS (via CDN).
      - High-quality placeholder images from Unsplash.
      
      Return ONLY the complete HTML code inside a markdown code block.`;
    
    navigator.clipboard.writeText(prompt);
    toast.success("AI Prompt copied to clipboard!");
  };

  const onCreateWebsite = async (b: Business) => {
    setEditingBusiness(b);
    setShareUrl(null);
    setCustomTitle(b.name);
    setUserInstructions('');
    setCurrentView('builder');
    
    if (user) {
      const path = `users/${user.uid}/websites/${b.id}`;
      try {
        const docSnap = await getDoc(doc(db, path));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHtmlCode(data.html);
          if (data.customTitle) setCustomTitle(data.customTitle);
          setIsDraftLoaded(true);
          setLastSaved(data.updatedAt?.toDate().toLocaleTimeString() || 'Previously saved');
          
          // Generate share URL
          const url = `${window.location.origin}/share/${user.uid}/${b.id}`;
          setShareUrl(url);
          return;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }

    // Fallback to default template
    setIsDraftLoaded(false);
    setLastSaved(null);
    setHtmlCode(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${b.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <!-- Click "Copy AI Prompt" above to generate a full site -->
    <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">${b.name}</h1>
        <p class="text-xl text-gray-600 mb-8">Coming Soon</p>
        <div class="space-y-2 text-gray-500">
            <p>${b.address || ''}</p>
            <p>${b.phone || ''}</p>
        </div>
    </div>
</body>
</html>`);
  };

  useEffect(() => {
    const saved = localStorage.getItem('offlinefinder-recent-searches');
    if (saved) {
      try {
        const recentSearches = JSON.parse(saved);
        setState(prev => ({ ...prev, recentSearches }));
      } catch (e) {
        console.error("Failed to load recent searches", e);
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  }, []);

  const checkWebsite = async (business: Business) => {
    if (!business.website) {
      // If no website and no social media, mark as offline
      if (business.hasSocialMedia === false) {
        return { ...business, status: 'offline' as const };
      }
      return { ...business, status: 'no-website' as const };
    }

    try {
      const response = await fetch('/api/check-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: business.website }),
      });
      const data = await response.json();
      
      const status = data.reachable ? 'reachable' as const : 'unreachable' as const;
      
      // Merge social media info from backend if found
      const hasSocialMedia = business.hasSocialMedia || data.hasSocialMedia;
      const socialMediaPlatforms = Array.from(new Set([
        ...(business.socialMediaPlatforms || []),
        ...(data.socialMediaPlatforms || [])
      ]));
      
      // If unreachable and no social media, mark as offline
      if (!data.reachable && !hasSocialMedia) {
        return { 
          ...business, 
          status: 'offline' as const, 
          checkError: data.error,
          hasSocialMedia: false,
          socialMediaPlatforms: []
        };
      }

      return {
        ...business,
        status,
        checkError: data.error,
        hasSocialMedia,
        socialMediaPlatforms
      };
    } catch (err) {
      return { ...business, status: 'unreachable' as const, checkError: 'Check failed' };
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.query || !userProfile) return;

    const isFree = !userProfile.hasUsedFreeSearch;
    const availableCredits = userProfile.credits;

    if (!isFree && availableCredits < 1) {
      toast.error("Low Credits", {
        description: "You need at least 1 credit to perform a search. Please add more credits in the dashboard."
      });
      return;
    }

    // Check cache first
    const cacheKey = `${state.query.toLowerCase()}-${(state.location || 'nearby').toLowerCase()}-${state.radius}`;
    const cached = state.recentSearches.find(s => `${s.query.toLowerCase()}-${s.location.toLowerCase()}-${s.radius}` === cacheKey);
    
    if (cached) {
      setState(prev => ({ ...prev, results: cached.results, error: null }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true, error: null, results: [] }));

    try {
      const prompt = `Find businesses matching "${state.query}" in "${state.location || 'nearby'}" within a radius of ${state.radius}. 
      PRIORITIZE finding businesses that have NO online presence (no website, no social media, or unclaimed profiles).
      For each business, provide: name, address, phone number, website URL (if any), rating, and total user ratings.
      Also include:
      - 'isUnclaimed' (boolean): true if the business profile on Google Maps seems unclaimed.
      - 'hasSocialMedia' (boolean): true if you can find any evidence of social media presence on Facebook, Instagram, Twitter, or LinkedIn.
      - 'socialMediaPlatforms' (string[]): list of platforms found (e.g., ["facebook", "instagram"]).
      Return the data as a JSON array of objects inside a markdown code block like this:
      \`\`\`json
      [
        { 
          "name": "...", 
          "address": "...", 
          "phone": "...", 
          "website": "...", 
          "rating": 4.5, 
          "userRatingsTotal": 100, 
          "mapsUrl": "...",
          "isUnclaimed": true,
          "hasSocialMedia": false,
          "socialMediaPlatforms": []
        }
      ]
      \`\`\``;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userLocation ? {
                latitude: userLocation.lat,
                longitude: userLocation.lng
              } : undefined
            }
          }
        },
      });

      const text = response.text || '';
      let jsonStr = text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to find anything that looks like an array
        const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
        }
      }
      
      let rawBusinesses: any[] = [];
      try {
        rawBusinesses = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Original text:", text);
        setState(prev => ({ ...prev, isSearching: false, error: "The search returned data in an unexpected format. Please try again or refine your search." }));
        return;
      }

      let cost = 0;
      let businessesToProcess = rawBusinesses;

      if (!isFree) {
        const baseCost = 1;
        const perLeadCost = 2;
        const maxLeads = Math.floor((availableCredits - baseCost) / perLeadCost);
        
        if (rawBusinesses.length > maxLeads) {
          businessesToProcess = rawBusinesses.slice(0, Math.max(0, maxLeads));
          if (maxLeads <= 0) {
            toast.warning("Credits exhausted", { description: "You only had 1 credit. No lead data can be unlocked." });
          } else {
            toast.info("Credits limit reached", { description: `Found ${rawBusinesses.length} leads, but showing ${maxLeads} based on your balance.` });
          }
        }
        cost = baseCost + (businessesToProcess.length * perLeadCost);
      }

      const businesses: Business[] = businessesToProcess.map((b: any, index: number) => ({
        ...b,
        id: `biz-${index}-${Date.now()}`,
        status: 'checking'
      }));

      setState(prev => ({ ...prev, results: businesses }));

      // Audit websites in parallel
      const auditedResults = await Promise.all(
        businesses.map(async (biz) => {
          const updated = await checkWebsite(biz);
          setState(prev => ({
            ...prev,
            results: prev.results.map(r => r.id === biz.id ? updated : r)
          }));
          return updated;
        })
      );

      // Deduct credits or mark free search used
      try {
        const userRef = doc(db, 'users', user.uid);
        if (isFree) {
          await setDoc(userRef, { hasUsedFreeSearch: true }, { merge: true });
          setUserProfile(prev => prev ? { ...prev, hasUsedFreeSearch: true } : null);
          const txnRef = doc(collection(db, 'transactions'));
          await setDoc(txnRef, {
            userId: user.uid,
            amount: 0,
            type: 'search',
            description: 'First search (free)',
            timestamp: serverTimestamp()
          });
        } else {
          const newCredits = availableCredits - cost;
          await setDoc(userRef, { credits: newCredits }, { merge: true });
          setUserProfile(prev => prev ? { ...prev, credits: newCredits } : null);
          const txnRef = doc(collection(db, 'transactions'));
          await setDoc(txnRef, {
            userId: user.uid,
            amount: -cost,
            type: 'search',
            description: `Search: ${state.query} (${businesses.length} leads)`,
            timestamp: serverTimestamp()
          });
          toast.success(`Search completed. Used ${cost} credits.`);
        }
      } catch (err) {
        console.error("Failed to update credits:", err);
      }


      setState(prev => {
        const newRecent = [
          { query: state.query, location: state.location || 'nearby', radius: state.radius, results: auditedResults, timestamp: Date.now() },
          ...prev.recentSearches.filter(s => `${s.query.toLowerCase()}-${s.location.toLowerCase()}-${s.radius}` !== cacheKey)
        ].slice(0, 10); // Keep last 10 searches
        
        localStorage.setItem('offlinefinder-recent-searches', JSON.stringify(newRecent));
        
        return { ...prev, isSearching: false, results: auditedResults, recentSearches: newRecent };
      });
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, isSearching: false, error: "Failed to fetch businesses. Please try again." }));
    }
  };

  const filteredResults = state.results.filter(biz => {
    if (filter === 'no-website') return !biz.website;
    if (filter === 'unreachable') return biz.status === 'unreachable';
    if (filter === 'offline') return biz.status === 'offline';
    return true;
  });

  return (
    <div className="min-h-screen bg-brutal-white text-brutal-black font-sans selection:bg-brutal-accent overflow-x-hidden">
      <Toaster position="top-right" richColors />
      <AnimatePresence mode="wait">
        {isAuthLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-brutal-white z-50"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 border-8 border-brutal-black border-t-brutal-accent rounded-full animate-spin" />
              <p className="text-2xl font-display uppercase tracking-widest">Loading Finder...</p>
            </div>
          </motion.div>
        ) : !user ? (
          <AnimatePresence mode="wait">
            {currentView === 'landing' ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <LandingPage onSignIn={() => setCurrentView('auth')} />
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AuthPage onSignIn={handleSignIn} onBack={() => setCurrentView('landing')} />
              </motion.div>
            )}
          </AnimatePresence>
        ) : currentView === 'admin' ? (
          <motion.div
            key="admin-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen"
          >
            <MainHeader 
              user={user}
              userProfile={userProfile}
              isAuthLoading={isAuthLoading}
              handleSignIn={handleSignIn}
              handleSignOut={handleSignOut}
              currentView={currentView}
              setCurrentView={setCurrentView}
              onAdminClick={() => { fetchAllUsers(); setCurrentView('admin'); }}
            />
            <AdminView 
              users={allUsers} 
              isLoading={isAdminLoading} 
              onAddCredits={handleAddCredits}
              onBack={() => setCurrentView('search')}
            />
          </motion.div>
        ) : currentView === 'search' ? (
          <motion.div
            key="search-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col min-h-screen"
          >
            <MainHeader 
              user={user}
              userProfile={userProfile}
              isAuthLoading={isAuthLoading}
              handleSignIn={handleSignIn}
              handleSignOut={handleSignOut}
              currentView={currentView}
              setCurrentView={setCurrentView}
              onAdminClick={() => { fetchAllUsers(); setCurrentView('admin'); }}
            />

            <main className="max-w-7xl mx-auto p-6 w-full">
              {/* Search Bar in Page */}
              <div className="mb-12">
                <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-stretch lg:items-center bg-brutal-white border-4 border-brutal-black p-2 brutal-shadow focus-within:translate-x-[-4px] focus-within:translate-y-[-4px] focus-within:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="relative flex-1 group border-b-2 lg:border-b-0 lg:border-r-2 border-brutal-black">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brutal-black z-10" />
                    <select
                      className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 text-lg appearance-none cursor-pointer font-display uppercase tracking-widest"
                      value={state.query}
                      onChange={e => setState(prev => ({ ...prev, query: e.target.value }))}
                    >
                      <option value="" disabled>Select Business Type</option>
                      {BUSINESS_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative flex-1 group border-b-2 lg:border-b-0 lg:border-r-2 border-brutal-black">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brutal-black" />
                    <input
                      type="text"
                      placeholder="Location"
                      className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 text-lg font-bold uppercase tracking-tight"
                      value={state.location}
                      onChange={e => setState(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div className="relative w-full lg:w-48 group border-b-2 lg:border-b-0 lg:border-r-2 border-brutal-black">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brutal-black pointer-events-none" />
                    <select
                      className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 text-lg appearance-none cursor-pointer font-bold uppercase"
                      value={state.radius}
                      onChange={e => setState(prev => ({ ...prev, radius: e.target.value }))}
                    >
                      <option value="1 mile">1 mile</option>
                      <option value="5 miles">5 miles</option>
                      <option value="10 miles">10 miles</option>
                      <option value="20 miles">20 miles</option>
                      <option value="50 miles">50 miles</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={state.isSearching}
                    className="bg-brutal-black text-brutal-white px-10 py-4 font-display text-xl uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 hover:bg-brutal-accent hover:text-brutal-black"
                  >
                    {state.isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Audit Leads'}
                  </button>
                </form>
              </div>

              {/* Stats & Filters */}
              {state.results.length > 0 && (
                <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <StatCard label="Total Found" value={state.results.length} color="blue" />
                    <StatCard label="Offline (No Presence)" value={state.results.filter(b => b.status === 'offline').length} color="purple" />
                    <StatCard label="No Website" value={state.results.filter(b => !b.website && b.status !== 'offline').length} color="amber" />
                    <StatCard label="Broken Links" value={state.results.filter(b => b.status === 'unreachable').length} color="red" />
                  </div>

                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
                    <FilterButton active={filter === 'offline'} onClick={() => setFilter('offline')} label="Offline" />
                    <FilterButton active={filter === 'no-website'} onClick={() => setFilter('no-website')} label="No Website" />
                    <FilterButton active={filter === 'unreachable'} onClick={() => setFilter('unreachable')} label="Broken" />
                  </div>
                </div>
              )}

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredResults.map((biz) => (
                    <BusinessCard 
                      key={biz.id} 
                      business={biz} 
                      onCreateWebsite={onCreateWebsite}
                      onCopyPitch={handleCopyPitchPrompt}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Empty State / Recent Results */}
              {!state.isSearching && state.results.length === 0 && !state.error && (
                <div className="space-y-12">
                  {state.recentSearches.length > 0 ? (
                    <div className="space-y-12">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Recent Lead Searches</h2>
                          <p className="text-gray-500">Pick up where you left off with your previous offline business searches.</p>
                        </div>
                        <button 
                          onClick={() => {
                            localStorage.removeItem('offlinefinder-recent-searches');
                            setState(prev => ({ ...prev, recentSearches: [] }));
                          }}
                          className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                          CLEAR ALL
                        </button>
                      </div>

                      {/* Grouped Recent Results */}
                      {Object.entries(
                        state.recentSearches.reduce((acc, search) => {
                          const key = search.query;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(search);
                          return acc;
                        }, {} as Record<string, typeof state.recentSearches>)
                      ).map(([category, searches]) => (
                        <div key={category} className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-gray-200" />
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{category}</h3>
                            <div className="h-px flex-1 bg-gray-200" />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(searches as typeof state.recentSearches).map((search) => (
                              <button
                                key={`${search.query}-${search.location}-${search.timestamp}`}
                                onClick={() => setState(prev => ({ ...prev, query: search.query, location: search.location, radius: search.radius, results: search.results }))}
                                className="text-left bg-white brutal-border p-6 brutal-shadow-hover transition-all group"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-brutal-accent border border-brutal-black flex items-center justify-center text-brutal-black">
                                      <Search className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-black text-brutal-black uppercase tracking-widest">{search.location || 'Nearby'}</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase">{search.radius}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {new Date(search.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="flex flex-col">
                                    <span className="text-2xl font-display">{search.results.length}</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Found</span>
                                  </div>
                                  <div className="w-0.5 h-10 bg-brutal-black" />
                                  <div className="flex flex-col">
                                    <span className="text-2xl font-display text-brutal-yellow">{search.results.filter(b => !b.website).length}</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Site</span>
                                  </div>
                                  <div className="w-0.5 h-10 bg-brutal-black" />
                                  <div className="flex flex-col">
                                    <span className="text-2xl font-display text-red-500">{search.results.filter(b => b.status === 'unreachable').length}</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Broken</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-32 h-32 bg-brutal-accent border-4 border-brutal-black flex items-center justify-center mb-8 brutal-shadow rotate-3">
                        <Search className="w-16 h-16 text-brutal-black" />
                      </div>
                      <h2 className="text-6xl font-display uppercase mb-4 leading-none">Find Offline<br/>Businesses</h2>
                      <p className="text-xl font-bold text-brutal-black max-w-md uppercase tracking-tight">
                        Search for local businesses that have no website or social media presence.
                      </p>
                      <div className="mt-12 marquee bg-brutal-black text-brutal-accent py-2 w-full max-w-2xl border-2 border-brutal-black brutal-shadow">
                        <div className="marquee-content">
                          {[...Array(10)].map((_, i) => (
                            <span key={i} className="mx-8 font-display uppercase tracking-widest">High Value Leads • Zero Presence • Unclaimed Profiles • </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error State */}
              {state.error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center max-w-lg mx-auto mt-10">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-red-900 mb-1">Search Failed</h3>
                  <p className="text-red-700">{state.error}</p>
                </div>
              )}
            </main>
          </motion.div>
        ) : currentView === 'saved' ? (
          <SavedWebsites 
            user={user!} 
            onBack={() => setCurrentView('search')} 
            onEdit={(b, html, title) => {
              setEditingBusiness(b);
              setHtmlCode(html);
              setCustomTitle(title);
              setCurrentView('builder');
              setIsDraftLoaded(true);
              setShareUrl(`${window.location.origin}/share/${user!.uid}/${b.id}`);
            }}
            // Pass header props
            headerProps={{
              user,
              userProfile,
              isAuthLoading,
              handleSignIn,
              handleSignOut,
              currentView,
              setCurrentView,
              onAdminClick: () => { fetchAllUsers(); setCurrentView('admin'); }
            }}
          />
        ) : (
          <motion.div
            key="builder-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col min-h-screen bg-white overflow-hidden"
          >
            {/* Builder Header */}
            <header className="h-20 px-6 border-b-4 border-brutal-black flex items-center justify-between bg-brutal-white sticky top-0 z-50 shrink-0">
              <div className="flex items-center gap-4">
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => {
                    setEditingBusiness(null);
                    setCurrentView('search');
                  }}
                >
                  <div className="w-10 h-10 bg-brutal-accent border-2 border-brutal-black flex items-center justify-center brutal-shadow-sm group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <Globe className="text-brutal-black w-6 h-6" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-display uppercase leading-none">OfflineFinder</h1>
                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Website Builder</p>
                  </div>
                </div>
                
                <div className="w-0.5 h-8 bg-brutal-black mx-2" />
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="text-lg font-display uppercase text-brutal-black focus:outline-none bg-transparent border-b-2 border-transparent hover:border-brutal-black focus:border-brutal-accent transition-all px-0 py-0.5 max-w-[120px] sm:max-w-[200px] truncate"
                      placeholder="Website Title"
                    />
                    <span className="hidden xs:inline-block text-[10px] font-black text-brutal-black uppercase tracking-widest bg-brutal-accent px-1.5 py-0.5 brutal-border-sm">Draft</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider truncate max-w-[150px] sm:max-w-none">
                    Editing: <span className="text-brutal-black">{editingBusiness.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden md:block">
                  <CreditBadge profile={userProfile} />
                </div>
                <div className="flex items-center bg-brutal-white border-2 border-brutal-black p-1 brutal-shadow-sm mr-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      !showPreview ? "bg-brutal-black text-brutal-white" : "text-brutal-black hover:bg-brutal-accent"
                    )}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Code</span>
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      showPreview ? "bg-brutal-black text-brutal-white" : "text-brutal-black hover:bg-brutal-accent"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Preview</span>
                  </button>
                </div>

                {showPreview && (
                  <div className="hidden lg:flex items-center bg-brutal-white border-2 border-brutal-black p-1 brutal-shadow-sm mr-2">
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={cn(
                        "p-1.5 transition-all",
                        previewDevice === 'mobile' ? "bg-brutal-black text-brutal-white" : "text-brutal-black hover:bg-brutal-accent"
                      )}
                      title="Mobile View"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('tablet')}
                      className={cn(
                        "p-1.5 transition-all",
                        previewDevice === 'tablet' ? "bg-brutal-black text-brutal-white" : "text-brutal-black hover:bg-brutal-accent"
                      )}
                      title="Tablet View"
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={cn(
                        "p-1.5 transition-all",
                        previewDevice === 'desktop' ? "bg-brutal-black text-brutal-white" : "text-brutal-black hover:bg-brutal-accent"
                      )}
                      title="Desktop View"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {lastSaved && (
                  <span className="hidden md:inline-block text-[10px] text-gray-400 font-black uppercase tracking-widest mr-2">
                    Saved {lastSaved}
                  </span>
                )}

                <button
                  onClick={handleCopyPrompt}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brutal-white brutal-border text-[10px] font-black uppercase tracking-widest hover:bg-brutal-accent transition-all brutal-shadow-sm"
                  title="Copy AI Pitch Prompt"
                >
                  <Sparkles className="w-4 h-4 text-brutal-black" />
                  <span className="hidden xl:inline">AI Prompt</span>
                </button>

                <button
                  onClick={handleSaveHTML}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-brutal-black text-brutal-white text-[10px] font-black uppercase tracking-widest hover:bg-brutal-accent hover:text-brutal-black transition-all brutal-border brutal-shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Publish</span>
                </button>

                <button
                  onClick={() => {
                    setEditingBusiness(null);
                    setCurrentView('search');
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-all"
                  title="Close Editor"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </header>

            {/* Builder Content */}
            <div className="flex-1 flex overflow-hidden bg-gray-50 relative">
              <AnimatePresence mode="wait">
                {!showPreview ? (
                  <motion.div 
                    key="editor"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col bg-white"
                  >
                    <div className="h-10 px-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Source Code</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(htmlCode);
                            toast.success("HTML copied to clipboard!");
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        <button
                          onClick={handleDownloadHTML}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto font-mono text-sm">
                      <Editor
                        value={htmlCode}
                        onValueChange={code => setHtmlCode(code)}
                        highlight={code => highlight(code, languages.markup, 'markup')}
                        padding={24}
                        className="min-h-full"
                        style={{
                          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                          fontSize: '13px',
                          lineHeight: '1.6',
                        }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <div className="h-10 px-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live View</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {shareUrl && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              navigator.clipboard.writeText(shareUrl);
                              toast.success("Share link copied!");
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            Copy Link
                          </motion.button>
                        )}
                        <button
                          onClick={handleDownloadHTML}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 bg-gray-100/30">
                      <div 
                        className={cn(
                          "bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all duration-500 ease-in-out h-full rounded-2xl overflow-hidden border border-gray-200/50",
                          previewDevice === 'mobile' ? "w-[375px] max-h-[667px]" : 
                          previewDevice === 'tablet' ? "w-[768px] max-h-[1024px]" : 
                          "w-full"
                        )}
                      >
                        <div className="h-6 bg-gray-50 border-b border-gray-100 flex items-center px-3 gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-300" />
                          <div className="w-2 h-2 rounded-full bg-amber-300" />
                          <div className="w-2 h-2 rounded-full bg-emerald-300" />
                        </div>
                        <iframe
                          title="Preview"
                          className="w-full h-[calc(100%-24px)] border-none"
                          srcDoc={htmlCode}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Builder Footer */}
            <footer className="h-12 px-6 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI-Powered Generation
                </div>
                <div className="w-px h-4 bg-gray-100" />
                <button
                  onClick={() => {
                    if (confirm("Reset to default template?")) {
                      setHtmlCode(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${editingBusiness.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">${editingBusiness.name}</h1>
        <p class="text-xl text-gray-600 mb-8">Coming Soon</p>
        <div class="space-y-2 text-gray-500">
            <p>${editingBusiness.address || ''}</p>
            <p>${editingBusiness.phone || ''}</p>
        </div>
    </div>
</body>
</html>`);
                    }
                  }}
                  className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider"
                >
                  Reset Template
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setEditingBusiness(null);
                    setCurrentView('search');
                  }}
                  className="text-[10px] font-bold text-gray-900 uppercase tracking-widest hover:underline"
                >
                  Close Editor
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="py-12 bg-brutal-white border-t-4 border-brutal-black mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-xl font-display uppercase tracking-widest text-brutal-black">
              OfflineFinder
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">
              High-Impact Lead Generation Toolkit
            </p>
          </div>
          <p className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest text-center md:text-right">
            Crafted for performance by <br/>
            <a 
              href="https://sahazamarline.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-brutal-black underline decoration-2 underline-offset-4 hover:bg-brutal-accent transition-all px-1 text-sm font-display uppercase"
            >
              Sahaza Marline R.
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function CreditBadge({ profile }: { profile: any }) {
  if (!profile) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1 bg-brutal-black text-brutal-white brutal-border-sm text-xs font-black uppercase tracking-widest">
        <Zap className="w-3 h-3 text-brutal-accent fill-brutal-accent" />
        {profile.credits} Credits
      </div>
      {!profile.hasUsedFreeSearch && (
        <span className="text-[10px] bg-brutal-accent px-2 py-0.5 font-black uppercase tracking-tighter animate-pulse">
          Free Search Available
        </span>
      )}
    </div>
  );
}

function AdminView({ users, isLoading, onAddCredits, onBack }: { 
  users: any[], 
  isLoading: boolean, 
  onAddCredits: (id: string, amt: number) => void,
  onBack: () => void 
}) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-6xl font-display uppercase italic">Admin Panel</h1>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-brutal-white border-4 border-brutal-black brutal-shadow-sm font-display uppercase hover:translate-x-[-2px] transition-all"
        >
          Back
        </button>
      </div>

      <div className="bg-brutal-white border-8 border-brutal-black brutal-shadow overflow-hidden">
        <div className="p-6 bg-brutal-black text-brutal-white flex items-center justify-between">
          <h3 className="font-display uppercase tracking-widest">User Management</h3>
          <span className="text-xs font-bold uppercase">{users.length} Users Found</span>
        </div>

        {isLoading ? (
          <div className="p-20 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="font-display uppercase">Loading User List...</p>
          </div>
        ) : (
          <div className="divide-y-4 divide-brutal-black">
            {users.map(u => (
              <div key={u.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 border-4 border-brutal-black flex items-center justify-center font-black text-xl ${u.isAdmin ? 'bg-brutal-accent' : 'bg-brutal-yellow'}`}>
                    {u.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black uppercase text-lg">{u.email}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-[10px] font-bold uppercase text-gray-500">ID: {u.id.substring(0, 8)}...</span>
                      <span className="text-[10px] font-black uppercase text-brutal-accent">{u.credits || 0} CREDITS</span>
                      {u.isAdmin && <span className="text-[10px] font-black uppercase text-red-500">ADMIN</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => onAddCredits(u.id, 10)}
                    className="px-4 py-2 bg-brutal-white border-2 border-brutal-black font-black text-xs uppercase hover:bg-brutal-accent transition-all"
                  >
                    +10
                  </button>
                  <button 
                    onClick={() => onAddCredits(u.id, 100)}
                    className="px-4 py-2 bg-brutal-white border-2 border-brutal-black font-black text-xs uppercase hover:bg-brutal-accent transition-all"
                  >
                    +100
                  </button>
                  <button 
                    onClick={() => onAddCredits(u.id, 500)}
                    className="px-4 py-2 bg-brutal-black text-brutal-white border-2 border-brutal-black font-black text-xs uppercase hover:bg-brutal-accent transition-all"
                  >
                    +500
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MainHeader({ 
  user, 
  userProfile,
  isAuthLoading, 
  handleSignIn, 
  handleSignOut, 
  currentView, 
  setCurrentView,
  onAdminClick
}: { 
  user: User | null; 
  userProfile: any;
  isAuthLoading: boolean; 
  handleSignIn: () => void; 
  handleSignOut: () => void; 
  currentView: 'landing' | 'auth' | 'search' | 'builder' | 'saved' | 'admin'; 
  setCurrentView: (view: 'landing' | 'auth' | 'search' | 'builder' | 'saved' | 'admin') => void;
  onAdminClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 bg-brutal-white border-b-4 border-brutal-black px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
          onClick={() => setCurrentView('search')}
        >
          <div className="w-12 h-12 bg-brutal-accent border-2 border-brutal-black flex items-center justify-center brutal-shadow-sm group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
            <Globe className="text-brutal-black w-7 h-7" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-display uppercase leading-none">OfflineFinder</h1>
            <p className="text-[10px] text-brutal-black font-black uppercase tracking-[0.2em] mt-1">Lead Gen Tool</p>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4 shrink-0">
          {isAuthLoading ? (
            <div className="w-8 h-8 border-2 border-brutal-black border-t-transparent rounded-full animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <CreditBadge profile={userProfile} />
              
              <div className="flex items-center gap-3">
                {userProfile?.isAdmin && (
                  <button
                    onClick={() => {
                      if (onAdminClick) onAdminClick();
                    }}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all brutal-border-sm",
                      currentView === 'admin' ? "bg-brutal-black text-brutal-white" : "bg-brutal-accent text-brutal-black hover:bg-brutal-black hover:text-brutal-white"
                    )}
                  >
                    Admin
                  </button>
                )}
                
                <button
                  onClick={() => setCurrentView(currentView === 'saved' ? 'search' : 'saved')}
                  className={cn(
                    "px-6 py-2 text-xs font-black uppercase tracking-widest transition-all brutal-border brutal-shadow-sm",
                    currentView === 'saved' ? "bg-brutal-black text-brutal-white" : "bg-brutal-white text-brutal-black hover:bg-brutal-accent"
                  )}
                >
                  {currentView === 'saved' ? 'Search Leads' : 'My Leads'}
                </button>
                
                <div className="flex items-center gap-3 pl-4 border-l-2 border-brutal-black">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-brutal-black uppercase leading-none">{user.displayName}</p>
                    <button 
                      onClick={handleSignOut}
                      className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 brutal-border brutal-shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 bg-brutal-accent brutal-border brutal-shadow-sm flex items-center justify-center font-display text-xl">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="px-8 py-3 bg-brutal-black text-brutal-white font-display uppercase tracking-widest hover:bg-brutal-accent hover:text-brutal-black transition-all brutal-border brutal-shadow"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'amber' | 'red' | 'purple' }) {
  const colors = {
    blue: 'bg-brutal-accent',
    amber: 'bg-brutal-yellow',
    red: 'bg-red-500 text-white',
    purple: 'bg-brutal-accent'
  };
  return (
    <div className={cn("px-6 py-3 brutal-border brutal-shadow flex items-center gap-4", colors[color])}>
      <span className="text-4xl font-display">{value}</span>
      <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{label}</span>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2 text-xs font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-brutal-black text-brutal-white" 
          : "text-brutal-black hover:bg-brutal-accent"
      )}
    >
      {label}
    </button>
  );
}

function SavedWebsites({ 
  user, 
  onBack, 
  onEdit,
  headerProps
}: { 
  user: User; 
  onBack: () => void; 
  onEdit: (b: Business, html: string, title: string) => void;
  headerProps: any;
}) {
  const [websites, setWebsites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWebsites = async () => {
      const path = `users/${user.uid}/websites`;
      try {
        const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setWebsites(docs);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebsites();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this website?")) return;
    
    const path = `users/${user.uid}/websites/${id}`;
    try {
      await deleteDoc(doc(db, path));
      setWebsites(prev => prev.filter(w => w.id !== id));
      toast.success("Website deleted successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader {...headerProps} />
      
      <motion.div
        key="saved-view"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full"
      >
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="p-4 bg-brutal-white brutal-border hover:bg-brutal-accent transition-all brutal-shadow-sm group"
            >
              <RotateCcw className="w-6 h-6 group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <div>
              <h1 className="text-5xl font-display uppercase leading-none">My Sales Leads</h1>
              <p className="text-xs font-black text-brutal-black uppercase tracking-[0.2em] mt-2">Websites built for offline businesses</p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading your websites...</p>
          </div>
        ) : websites.length === 0 ? (
          <div className="bg-brutal-white border-4 border-brutal-black p-12 text-center brutal-shadow">
            <div className="w-24 h-24 bg-brutal-accent border-4 border-brutal-black flex items-center justify-center mx-auto mb-8 brutal-shadow rotate-3">
              <Globe className="w-12 h-12 text-brutal-black" />
            </div>
            <h2 className="text-4xl font-display uppercase mb-4">No websites yet</h2>
            <p className="text-xl font-bold text-gray-500 mb-10 max-w-md mx-auto uppercase tracking-tight">You haven't saved any websites yet. Start by searching for a business and clicking "Build Website".</p>
            <button
              onClick={onBack}
              className="px-10 py-4 bg-brutal-black text-brutal-white font-display text-xl uppercase tracking-[0.2em] hover:bg-brutal-accent hover:text-brutal-black transition-all brutal-border brutal-shadow"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {websites.map((site) => (
              <motion.div
                key={site.id}
                layout
                className="bg-white brutal-border p-6 brutal-shadow-hover transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-brutal-accent border border-brutal-black flex items-center justify-center text-brutal-black">
                    <Globe className="w-7 h-7" />
                  </div>
                  <button
                    onClick={() => handleDelete(site.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <h3 className="text-2xl font-display uppercase leading-none mb-2 truncate">{site.customTitle || site.businessName}</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6">Business: {site.businessName}</p>
                
                <div className="mt-auto pt-6 border-t-2 border-brutal-black flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {site.updatedAt?.toDate().toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(
                        { id: site.businessId, name: site.businessName, status: 'no-website' } as Business,
                        site.html,
                        site.customTitle || site.businessName
                      )}
                      className="px-4 py-2 bg-brutal-black text-brutal-white text-[10px] font-black uppercase tracking-widest hover:bg-brutal-accent hover:text-brutal-black transition-all brutal-border brutal-shadow-sm"
                    >
                      Edit
                    </button>
                    <a
                      href={`${window.location.origin}/share/${user.uid}/${site.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-brutal-white text-brutal-black brutal-border hover:bg-brutal-accent transition-all brutal-shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function BusinessCard({ business, onCreateWebsite, onCopyPitch }: { business: Business; key?: string; onCreateWebsite: (b: Business) => void; onCopyPitch: (b: Business) => void }) {
  const isOffline = business.status === 'offline';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "brutal-border p-6 flex flex-col brutal-shadow-hover bg-white transition-all",
        isOffline && "bg-brutal-yellow/10"
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className={cn(
          "px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] brutal-border brutal-shadow-sm",
          isOffline ? "bg-brutal-black text-brutal-accent" : "bg-brutal-accent text-brutal-black"
        )}>
          {isOffline ? 'ZERO PRESENCE' : business.status?.replace('-', ' ')}
        </div>
        
        {business.isUnclaimed && (
          <div className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] brutal-border brutal-shadow-sm bg-brutal-white text-brutal-black">
            Unclaimed
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-display uppercase leading-none mb-2">{business.name}</h3>
        <div className="flex items-center gap-2">
          {business.rating && (
            <div className="flex items-center gap-1 bg-brutal-black text-brutal-white px-2 py-0.5 text-xs font-bold">
              <span>★</span>
              <span>{business.rating}</span>
            </div>
          )}
          {business.userRatingsTotal && (
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">({business.userRatingsTotal} reviews)</span>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-8 flex-1 font-mono text-xs">
        {business.address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-bold">{business.address}</span>
          </div>
        )}
        {business.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="font-bold">{business.phone}</span>
          </div>
        )}
        {business.website ? (
          <div className="flex items-center gap-3 text-brutal-black">
            <Globe className="w-4 h-4 shrink-0" />
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="underline font-black">
              {business.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-400 italic">
            <Globe className="w-4 h-4 shrink-0 opacity-50" />
            <span>No website listed</span>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          {business.hasSocialMedia === false ? (
            <div className="flex items-center gap-3 text-red-500 font-black uppercase tracking-widest">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>No social media</span>
            </div>
          ) : business.hasSocialMedia === true ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-brutal-black font-black uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Social detected</span>
              </div>
              {business.socialMediaPlatforms && business.socialMediaPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-7">
                  {business.socialMediaPlatforms.map(p => (
                    <span key={p} className="px-2 py-0.5 brutal-border bg-brutal-accent text-brutal-black text-[10px] font-black uppercase tracking-widest">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pt-6 border-t-2 border-brutal-black flex items-center justify-between">
        {business.mapsUrl ? (
          <a
            href={business.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black text-gray-400 hover:text-brutal-black flex items-center gap-1 transition-colors uppercase tracking-widest"
          >
            VIEW ON MAPS <ExternalLink className="w-3 h-3" />
          </a>
        ) : <div />}

        {(business.status === 'no-website' || business.status === 'unreachable' || business.status === 'offline') && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onCopyPitch(business)}
              className="brutal-border px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-brutal-black hover:text-brutal-white transition-all brutal-shadow-sm"
              title="Copy Pitch"
            >
              PITCH
            </button>
            <button 
              onClick={() => onCreateWebsite(business)}
              className={cn(
                "brutal-border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 brutal-shadow-sm",
                business.status === 'offline' 
                  ? "bg-brutal-accent text-brutal-black hover:bg-brutal-black hover:text-brutal-accent" 
                  : "bg-brutal-black text-brutal-white hover:bg-brutal-accent hover:text-brutal-black"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              BUILD SITE
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
