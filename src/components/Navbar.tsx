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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || location.pathname !== "/"
          ? "bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="text-2xl md:text-xl font-extrabold tracking-tight text-gray-900">
          Bill<span className="text-gradient-primary">Kar</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) =>
            isRoute(l.href) ? (
              <Link
                key={l.label}
                to={l.href}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => {
                  if (location.pathname === "/") {
                    e.preventDefault();
                    scrollTo(l.href);
                  }
                }}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {l.label}
              </a>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link
            to="/signup"
            className="bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start Free →
          </Link>
        </div>

        <button className="md:hidden text-gray-900" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-4">
              {navLinks.map((l) =>
                isRoute(l.href) ? (
                  <Link
                    key={l.label}
                    to={l.href}
                    className="text-sm text-gray-600"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={(e) => {
                      if (location.pathname === "/") {
                        e.preventDefault();
                        scrollTo(l.href);
                      } else {
                        setMobileOpen(false);
                      }
                    }}
                    className="text-sm text-gray-600"
                  >
                    {l.label}
                  </a>
                )
              )}
              <Link to="/login" className="text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold text-center"
                onClick={() => setMobileOpen(false)}
              >
                Start Free →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
