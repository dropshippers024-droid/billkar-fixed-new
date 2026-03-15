import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="bg-gray-900 pt-16 pb-8">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-1">
          <Link to="/" className="text-2xl font-extrabold text-white inline-block">
            Bill<span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">Kar</span>
          </Link>
          <p className="text-sm text-gray-400 mt-3 max-w-xs leading-relaxed">
            India's simplest GST invoicing platform. Create, share, and manage invoices in seconds.
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <MapPin size={14} className="flex-shrink-0" />
            <span>Made in India</span>
          </div>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-semibold text-sm text-white mb-4 uppercase tracking-wider">Product</h4>
          <ul className="space-y-3">
            <li><a href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a></li>
            <li><a href="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a></li>
            <li><a href="/#compare" className="text-sm text-gray-400 hover:text-white transition-colors">Compare</a></li>
            <li><a href="/#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-sm text-white mb-4 uppercase tracking-wider">Legal</h4>
          <ul className="space-y-3">
            <li><Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link to="/refund" className="text-sm text-gray-400 hover:text-white transition-colors">Refund Policy</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-sm text-white mb-4 uppercase tracking-wider">Contact</h4>
          <ul className="space-y-3">
            <li>
              <a href="mailto:support@billkar.co.in" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Mail size={14} className="flex-shrink-0" /> support@billkar.co.in
              </a>
            </li>
            <li>
              <Link to="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact Form</Link>
            </li>
          </ul>
          <div className="mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <span>© 2026 BillKar. All rights reserved.</span>
        <div className="flex gap-5">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/refund" className="hover:text-white transition-colors">Refunds</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
