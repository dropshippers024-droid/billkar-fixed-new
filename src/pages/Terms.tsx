import { Link } from "react-router-dom";

const Terms = () => (
  <div className="min-h-screen bg-white text-gray-900">
    <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-extrabold">
          Bill<span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">Kar</span>
        </Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">&larr; Back to Home</Link>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 11, 2026</p>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing or using BillKar (billkar.co.in), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. These terms apply to all users, including free and paid subscribers.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Service Description</h2>
          <p className="text-gray-600 leading-relaxed">
            BillKar is a cloud-based GST invoicing and billing platform designed for Indian businesses. The service allows you to create invoices, estimates, track expenses, manage customers and products, generate GST reports, and share documents via PDF, WhatsApp, and email.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>You must provide accurate and complete information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must be at least 18 years old to use BillKar.</li>
            <li>One person or business may not maintain more than one free account.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Plan Tiers & Pricing</h2>
          <p className="text-gray-600 leading-relaxed mb-3">BillKar offers the following plans:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Free Plan:</strong> 50 invoices/month, 3 templates, PDF download, WhatsApp & email sharing, expense tracking, 1 business, 1 user.</li>
            <li><strong>Pro Plan (₹399/month):</strong> Unlimited invoices, all templates, UPI QR on invoices, payment reminders, recurring invoices, GSTR-1 export, 3 team members.</li>
            <li><strong>Business Plan (₹799/month):</strong> Everything in Pro plus 10 team members, Excel + PDF report exports, multi-business (up to 5), priority WhatsApp support.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            Prices are in Indian Rupees (INR) and exclusive of applicable taxes. We reserve the right to change pricing with 30 days advance notice.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payment Terms</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Paid plans are billed monthly via Razorpay.</li>
            <li>Payment is due at the beginning of each billing cycle.</li>
            <li>Failed payments may result in service suspension after a 7-day grace period.</li>
            <li>You can cancel your subscription at any time from your account settings.</li>
            <li>Refunds are governed by our <Link to="/refund" className="text-indigo-600 hover:underline">Refund Policy</Link>.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Acceptable Use</h2>
          <p className="text-gray-600 leading-relaxed mb-3">You agree not to:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Use BillKar for any unlawful purpose or to generate fraudulent invoices.</li>
            <li>Attempt to gain unauthorized access to the service or other users' accounts.</li>
            <li>Reverse engineer, decompile, or disassemble any part of the service.</li>
            <li>Use automated tools to scrape or overload the service.</li>
            <li>Upload malicious content or attempt to compromise the platform's security.</li>
            <li>Resell or redistribute the service without prior written consent.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Data</h2>
          <p className="text-gray-600 leading-relaxed">
            You retain ownership of all data you create on BillKar (invoices, customer records, business information). We do not claim any intellectual property rights over your content. You grant us a limited license to store and process your data solely to provide the service. You can export or delete your data at any time.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            The BillKar name, logo, website design, software code, and all related intellectual property are owned by BillKar. You may not copy, modify, or distribute any part of our platform without written permission. Invoice templates provided are licensed for your business use only.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Service Availability</h2>
          <p className="text-gray-600 leading-relaxed">
            We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice. We are not liable for any loss arising from service downtime, including inability to generate invoices during outages.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">10. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            BillKar is provided "as is" without warranties of any kind. We are not responsible for the accuracy of GST calculations — you are responsible for verifying all tax amounts before filing. Our total liability shall not exceed the amount you have paid us in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">11. Termination</h2>
          <p className="text-gray-600 leading-relaxed">
            We may suspend or terminate your account if you violate these terms. You may close your account at any time. Upon termination, your data will be retained for 30 days to allow export, after which it will be permanently deleted (subject to legal retention requirements).
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">12. Governing Law</h2>
          <p className="text-gray-600 leading-relaxed">
            These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, India. We encourage resolving disputes through discussion before pursuing legal remedies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">13. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update these terms from time to time. Material changes will be communicated via email or in-app notification at least 15 days before they take effect. Continued use of the service after changes constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">14. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            For questions about these Terms, contact us at{" "}
            <a href="mailto:support@billkar.co.in" className="text-indigo-600 hover:underline">support@billkar.co.in</a>.
          </p>
        </div>
      </div>
    </main>

    <footer className="border-t border-gray-100 py-8 mt-12">
      <div className="max-w-3xl mx-auto px-4 text-center text-sm text-gray-500">
        © 2026 BillKar. All rights reserved.
      </div>
    </footer>
  </div>
);

export default Terms;
