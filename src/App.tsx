import React, { useState, useEffect } from "react";
import { DEFAULT_PROFILE, THEMES, ThemeType, UserProfile } from "./types";
import Hero from "./components/Hero";
import About from "./components/About";
import PortfolioGrid from "./components/PortfolioGrid";
import ExperienceTimeline from "./components/ExperienceTimeline";
import ContactForm from "./components/ContactForm";
import InteractiveChatbot from "./components/InteractiveChatbot";
import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./components/AdminLogin";
import { Settings, Sparkles, MapPin, Layers, Briefcase, FileText } from "lucide-react";
import { AnimatePresence } from "motion/react";

export default function App() {
  // Pre-initialize Cloudflare configuration in localStorage if not set to enable auto-sync out-of-the-box!
  if (typeof window !== "undefined") {
    try {
      if (localStorage.getItem("cf_sync_enabled") === null) {
        localStorage.setItem("cf_sync_enabled", "true");
      }
      if (!localStorage.getItem("cf_base_url")) {
        localStorage.setItem("cf_base_url", "https://portfolio-api.dincenzo2.workers.dev");
      }
    } catch (e) {
      console.warn("Storage initialization failed", e);
    }
  }

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>("cinema");
  const [currentPage, setCurrentPage] = useState<"home" | "admin">("home");

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_logged_in") === "true";
    }
    return false;
  });

  // Simple SPA Routing based on window location pathname
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === "/admin" || window.location.hash === "#admin") {
        setCurrentPage("admin");
      } else {
        setCurrentPage("home");
      }
    };

    // Run once on load
    handleLocationChange();

    // Listen for popstate (back/forward browser buttons)
    window.addEventListener("popstate", handleLocationChange);
    // Listen for hashchange
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigateTo = (page: "home" | "admin") => {
    if (page === "admin") {
      window.history.pushState(null, "", "/admin");
    } else {
      window.history.pushState(null, "", "/");
    }
    setCurrentPage(page);
  };

  // Sync profile edits with browser local persistence (so if they reload, their edits aren't lost!)
  useEffect(() => {
    try {
      let stored = localStorage.getItem("portfolio_user_profile");

      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Migrate old experiences array to split arrays if needed
        if (parsed.experiences) {
          if (!parsed.workExperienceData) {
            parsed.workExperienceData = parsed.experiences.filter((e: any) => e.type !== "Education");
          }
          if (!parsed.educationData) {
            parsed.educationData = parsed.experiences.filter((e: any) => e.type === "Education");
          }
          delete parsed.experiences;
          try {
            localStorage.setItem("portfolio_user_profile", JSON.stringify(parsed));
          } catch (err) {
            console.error("Failed to sync migrated local storage", err);
          }
        }

        // Migrate old category spelling SOCÍAL to SOCIAL
        let migratedCategory = false;
        if (parsed.projects && Array.isArray(parsed.projects)) {
          parsed.projects.forEach((p: any) => {
            if (p.category && p.category.trim().toUpperCase() === "SOCÍAL") {
              p.category = "SOCIAL";
              migratedCategory = true;
            }
          });
        }
        if (migratedCategory) {
          try {
            localStorage.setItem("portfolio_user_profile", JSON.stringify(parsed));
          } catch (err) {
            console.error("Failed to sync migrated category local storage", err);
          }
        }

        // Silent correction for any old Loutus typos without wiping out user changes
        if (parsed.workExperienceData) {
          parsed.workExperienceData.forEach((x: any) => {
            if (x.company && x.company.toLowerCase().includes("loutus")) {
              x.company = x.company.replace(/loutus/gi, "Lotus");
            }
          });
        }

        // Ensure both arrays are set and fallback to defaults only if entirely missing
        if (!parsed.workExperienceData) {
          parsed.workExperienceData = DEFAULT_PROFILE.workExperienceData || [];
        }
        if (!parsed.educationData) {
          parsed.educationData = DEFAULT_PROFILE.educationData || [];
        }

        setProfile(parsed);
      } else {
        setProfile(DEFAULT_PROFILE);
      }
      const storedTheme = localStorage.getItem("portfolio_user_theme");
      if (storedTheme && storedTheme !== "slate") {
        setCurrentTheme(storedTheme as ThemeType);
      } else {
        setCurrentTheme("cinema");
      }
    } catch (e) {
      console.error("Local storage initialization failed", e);
    }
  }, []);

  // Load live data from Cloudflare Worker if enabled
  useEffect(() => {
    const isCfEnabled = localStorage.getItem("cf_sync_enabled") === "true";
    const cfBaseUrl = localStorage.getItem("cf_base_url");
    if (isCfEnabled && cfBaseUrl) {
      // Check if there are unsaved local changes to avoid overwriting them
      if (localStorage.getItem("portfolio_is_dirty") === "true") {
        console.log("☁️ Unsaved local changes detected in localStorage. Skipping overwrite from Cloudflare D1 fetch to prevent data loss.");
        return;
      }

      const fetchCfData = async () => {
        try {
          const authKey = localStorage.getItem("cf_auth_key") || "";
          const headers: Record<string, string> = {
            "Content-Type": "application/json"
          };
          if (authKey) {
            headers["Authorization"] = authKey.startsWith("Bearer ") ? authKey : `Bearer ${authKey}`;
          }
          
          console.log("☁️ Found Cloudflare Sync Config, pulling live DB from Cloudflare...", cfBaseUrl);
          const response = await fetch(`${cfBaseUrl.replace(/\/$/, "")}/api/all-data`, {
            headers
          });
          if (response.ok) {
            const data = await response.json();
            const { mapCloudflareToProfile } = await import("./utils/cloudflareMapper");
            const mappedProfile = mapCloudflareToProfile(data);
            setProfile(mappedProfile);
            
            // Sync theme from Cloudflare settings table if present!
            if (data.settings?.accentColor && ["cinema", "emerald", "coral", "violet", "nord"].includes(data.settings.accentColor)) {
              setCurrentTheme(data.settings.accentColor as ThemeType);
              localStorage.setItem("portfolio_user_theme", data.settings.accentColor);
            }

            // Cache to local storage so page feels responsive on next load
            localStorage.setItem("portfolio_user_profile", JSON.stringify(mappedProfile));
            console.log("✅ Successfully loaded real-time portfolio from Cloudflare D1 Database!");
          } else {
            console.error("❌ Cloudflare D1 fetch response error:", response.status);
          }
        } catch (err) {
          console.error("⚠️ Failed to synchronize live data from Cloudflare Worker API:", err);
        }
      };
      fetchCfData();
    }
  }, []);

  const handleSetProfile = (updatedProfile: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    setProfile((prev) => {
      const next = typeof updatedProfile === "function" ? updatedProfile(prev) : updatedProfile;
      try {
        localStorage.setItem("portfolio_user_profile", JSON.stringify(next));
      } catch (e) {
        console.error("Local storage profile sync failed", e);
      }
      return next;
    });
  };

  const handleSetTheme = (themeId: ThemeType) => {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem("portfolio_user_theme", themeId);
    } catch (e) {
      console.error("Local storage theme sync failed", e);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("admin_logged_in");
    navigateTo("home");
  };

  const themeVals = THEMES[currentTheme];

  if (currentPage === "admin") {
    if (!isLoggedIn) {
      return (
        <AdminLogin
          onLoginSuccess={() => {
            setIsLoggedIn(true);
            sessionStorage.setItem("admin_logged_in", "true");
          }}
          onCancel={() => navigateTo("home")}
        />
      );
    }
    return (
      <AdminDashboard
        profile={profile}
        setProfile={handleSetProfile}
        currentTheme={currentTheme}
        setTheme={handleSetTheme}
        onBackToPortfolio={() => navigateTo("home")}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${themeVals.bg}`}>
      
      {/* Universal Floating Navigation Header */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white/75 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo with dynamic style */}
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-mono text-[13px] font-bold tracking-wider uppercase text-slate-800">
              TRẦN QUỐC VINH • MEDIA PORTFOLIO
            </span>
          </div>

          {/* Nav Items menu (desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-semibold text-slate-600 select-none">
            <a href="#about-section" className="hover:text-sky-600 transition-colors">Giới thiệu</a>
            <a href="#projects-section" className="hover:text-sky-600 transition-colors">Dự án</a>
            <a href="#experience-section" className="hover:text-sky-600 transition-colors">Kinh nghiệm</a>
            <a href="#contact-section" className="hover:text-sky-600 transition-colors">Liên hệ</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              id="admin-dashboard-btn"
              onClick={() => navigateTo("admin")}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold font-mono bg-sky-50 border border-sky-200 hover:bg-sky-100/80 hover:border-sky-300 text-sky-650 rounded-full px-4 py-2 cursor-pointer shadow-1 transition-all duration-300"
            >
              <Settings className="h-3.5 w-3.5" />
              Admin Dashboard
            </button>
          </div>

        </div>
      </header>

      {/* Main Core Layout segments */}
      <main className="relative">
        <Hero 
          profile={profile} 
          theme={themeVals} 
          onOpenCustomizer={() => navigateTo("admin")} 
        />
        
        <About 
          profile={profile} 
          theme={themeVals} 
          // Note the AppTheme parameter structure is preserved exactly
        />
        
        <PortfolioGrid 
          projects={profile.projects} 
          theme={themeVals} 
        />
        
        <ExperienceTimeline 
          workExperienceData={profile.workExperienceData || []} 
          educationData={profile.educationData || []}
          theme={themeVals} 
        />
        
        <ContactForm />
      </main>

      {/* App bottom minimal footer */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 text-center mt-12 select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-slate-500">
          <p>© 2026 {profile.name} • Đã đăng ký bảo lưu quyền phát triển.</p>
          <div className="flex items-center gap-1">
            <span>Powered by Gemini 3.5-flash AI representative</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </footer>

      {/* Interactive Representative Chatbot */}
      <InteractiveChatbot profile={profile} />

    </div>
  );
}
