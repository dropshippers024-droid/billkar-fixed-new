import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, MessageSquare, Send, CheckCircle } from "lucide-react";
import Footer from "@/components/Footer";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailTo = `mailto:support@billkar.co.in?subject=${encodeURIComponent(form.subject || "Contact from BillKar")}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailTo;
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-extrabold">
            Bill<span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">Kar</span>
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">&larr; Back to Home</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold mb-3">Contact Us</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Have a question, suggestion, or need help? We'd love to hear from you. Reach out and we'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-2xl mx-auto">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Mail size={18} className="text-indigo-600" />
            </div>
            <h3 className="font-bold text-sm mb-1">Email</h3>
            <a href="mailto:support@billkar.co.in" className="text-sm text-indigo-600 hover:underline">
              support@billkar.co.in
            </a>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <MapPin size={18} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-sm mb-1">Location</h3>
            <p className="text-sm text-gray-500">India</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare size={18} className="text-indigo-600" />
              <h2 className="text-lg font-bold">Send us a message</h2>
            </div>

            {sent && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 mb-6 text-sm font-medium">
                <CheckCircle size={16} />
                Your email client should open. If it doesn't, email us directly at support@billkar.co.in
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Your Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Email Address</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Subject</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="How can we help?"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us more about your question or issue..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={14} />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
