import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Compare", href: "#compare" },
  { label: "Blog", href: "/blog" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const isRoute = (href: string) => href.startsWith("/");
  const isHero = location.pathname === "/" && !scrolled;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || location.pathname !== "/"
        ? "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
        : "bg-transparent"
    }`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">

        {/* Logo — text only, no icon */}
        <Link to="/" className="flex items-center">
          <span className={`text-2xl font-extrabold tracking-tight ${isHero ? "text-white" : "text-gray-900"}`}>
            Bill<span className={isHero ? "text-yellow-300" : "text-gradient-primary"}>Kar</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((l) =>
            isRoute(l.href) ? (
              <Link key={l.label} to={l.href}
                className={`text-sm font-medium transition-colors ${isHero ? "text-indigo-100 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href}
                onClick={(e) => { if (location.pathname === "/") { e.preventDefault(); scrollTo(l.href); } }}
                className={`text-sm font-medium transition-colors ${isHero ? "text-indigo-100 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
                {l.label}
              </a>
            )
          )}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"
            className={`text-sm font-medium transition-colors ${isHero ? "text-indigo-100 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
            Login
          </Link>
          <Link to="/signup"
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              isHero
                ? "bg-white text-indigo-600 hover:bg-indigo-50"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
            style={{ boxShadow: isHero ? "0 4px 14px rgba(0,0,0,0.15)" : "0 4px 14px rgba(99,102,241,0.3)" }}>
            Start Free →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
            isHero ? "text-white hover:bg-white/10" : "text-gray-900 hover:bg-gray-100"
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden shadow-lg"
          >
            <div className="px-4 py-5 flex flex-col gap-1">
              {navLinks.map((l) =>
                isRoute(l.href) ? (
                  <Link key={l.label} to={l.href}
                    className="text-sm font-medium text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileOpen(false)}>
                    {l.label}
                  </Link>
                ) : (
                  <a key={l.label} href={l.href}
                    onClick={(e) => {
                      if (location.pathname === "/") { e.preventDefault(); scrollTo(l.href); }
                      else setMobileOpen(false);
                    }}
                    className="text-sm font-medium text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    {l.label}
                  </a>
                )
              )}
              <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-2">
                <Link to="/login"
                  className="text-sm font-medium text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-center transition-colors"
                  onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link to="/signup"
                  className="bg-indigo-600 text-white rounded-xl px-5 py-3 text-sm font-bold text-center hover:bg-indigo-700 transition-colors"
                  style={{ boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}
                  onClick={() => setMobileOpen(false)}>
                  Start Free →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;