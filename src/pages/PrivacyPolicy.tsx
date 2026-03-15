import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
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
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 11, 2026</p>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            BillKar ("we", "our", "us") operates the billkar.co.in website and the BillKar invoicing platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. By using BillKar, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed mb-3">We collect the following types of information:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
            <li><strong>Business Information:</strong> Business name, GSTIN, PAN, address, bank details, and UPI ID that you provide in settings.</li>
            <li><strong>Invoice Data:</strong> Customer details, product/service descriptions, amounts, tax calculations, and payment records you create.</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, device type, browser information, and IP address.</li>
            <li><strong>Google Account Data:</strong> If you sign in with Google, we receive your name, email, and profile picture from Google.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>To provide and maintain the BillKar invoicing service.</li>
            <li>To generate invoices, estimates, and GST reports on your behalf.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To send transactional emails (invoices, receipts, password resets).</li>
            <li>To improve our service and fix bugs.</li>
            <li>To comply with legal obligations including GST regulations.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Storage & Security</h2>
          <p className="text-gray-600 leading-relaxed">
            Your data is stored securely on Cloudflare's global infrastructure. We use encryption in transit (HTTPS/TLS) and implement access controls to protect your information. Passwords are hashed and never stored in plain text. While we strive to use commercially acceptable means to protect your data, no method of electronic storage is 100% secure.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Third-Party Services</h2>
          <p className="text-gray-600 leading-relaxed mb-3">We use the following third-party services:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Cloudflare:</strong> Hosting, CDN, and database services.</li>
            <li><strong>Google OAuth:</strong> Optional sign-in authentication.</li>
            <li><strong>Razorpay:</strong> Payment processing for Pro and Business subscriptions. Razorpay handles your payment card details directly — we never store your card information.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            We use essential cookies and local storage to keep you logged in and store your preferences. We do not use advertising or tracking cookies. No data is shared with advertisers.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required by law to retain certain records (e.g., invoice data for GST compliance may be retained for up to 8 years as per Indian tax law).
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
          <p className="text-gray-600 leading-relaxed mb-3">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Export your invoice and business data.</li>
            <li>Withdraw consent for optional data processing.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children's Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            BillKar is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at{" "}
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

export default PrivacyPolicy;
