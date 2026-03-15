import { useState } from "react";
import { MessageCircle, X, Mail, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "How do I create my first invoice?",
    a: "Go to Dashboard → Invoices → New Invoice. Fill in your customer details, add items, and click Send or Download PDF.",
  },
  {
    q: "How does GST calculation work?",
    a: "BillKar auto-calculates CGST + SGST for same-state transactions and IGST for inter-state. Set your business state in Settings.",
  },
  {
    q: "Can I share invoices on WhatsApp?",
    a: "Yes! WhatsApp sharing is free for all users. Send invoices directly to customers via WhatsApp with one tap.",
  },
  {
    q: "How do I change my business details?",
    a: "Go to Settings → Business tab to update your business name, GSTIN, address, bank details, and UPI ID.",
  },
  {
    q: "What's included in the Free plan?",
    a: "50 invoices/month, 3 templates, PDF download, WhatsApp sharing, expense tracking, and no watermark. Upgrade to Pro for unlimited invoices and premium features.",
  },
  {
    q: "How do I export GSTR-1 data?",
    a: "Pro and Business plans can export invoice data in GSTR-1 format from Reports → GST Report, ready to upload to the GST portal.",
  },
];

const SupportButton = () => {
  const [open, setOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showFaqs, setShowFaqs] = useState(false);

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-3 bg-background border border-border rounded-2xl shadow-xl w-72 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <h3 className="font-bold text-sm">Need Help?</h3>
              <p className="text-xs text-muted-foreground">We're here to assist you.</p>
            </div>

            <div className="p-2">
              <a
                href="mailto:support@billkar.co.in"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-secondary transition-colors"
              >
                <Mail size={16} className="text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Email Support</p>
                  <p className="text-xs text-muted-foreground">support@billkar.co.in</p>
                </div>
              </a>

              <button
                onClick={() => setShowFaqs(!showFaqs)}
                className="flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle size={16} className="text-primary flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-sm">FAQs</p>
                    <p className="text-xs text-muted-foreground">Quick answers</p>
                  </div>
                </div>
                {showFaqs ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
            </div>

            <AnimatePresence>
              {showFaqs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 max-h-64 overflow-y-auto space-y-1">
                    {faqs.map((faq, i) => (
                      <div key={i} className="rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-secondary/50 transition-colors flex items-center justify-between gap-2"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            size={12}
                            className={`text-muted-foreground flex-shrink-0 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence>
                          {expandedFaq === i && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="px-3 pb-2.5 text-xs text-muted-foreground leading-relaxed">
                                {faq.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => { setOpen(!open); if (open) { setShowFaqs(false); setExpandedFaq(null); } }}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center hover:scale-105 transition-all duration-200"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
};

export default SupportButton;
