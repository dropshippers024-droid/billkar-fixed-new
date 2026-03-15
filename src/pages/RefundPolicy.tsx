import { Link } from "react-router-dom";

const RefundPolicy = () => (
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
      <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 11, 2026</p>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Overview</h2>
          <p className="text-gray-600 leading-relaxed">
            At BillKar, we want you to be completely satisfied with our service. This Refund Policy explains how refunds work for our paid subscription plans (Pro and Business). The Free plan has no charges and therefore no refund implications.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. 7-Day Refund Window</h2>
          <p className="text-gray-600 leading-relaxed">
            If you are not satisfied with your paid plan, you can request a full refund within 7 days of your initial purchase or renewal. No questions asked. After 7 days from the billing date, refunds will not be issued for that billing cycle.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. How to Request a Refund</h2>
          <p className="text-gray-600 leading-relaxed mb-3">To request a refund:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Send an email to <a href="mailto:support@billkar.co.in" className="text-indigo-600 hover:underline">support@billkar.co.in</a> with the subject "Refund Request".</li>
            <li>Include your registered email address and the reason for the refund.</li>
            <li>We will process your request within 3-5 business days.</li>
            <li>Refunds will be credited to your original payment method via Razorpay.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Cancellation</h2>
          <p className="text-gray-600 leading-relaxed">
            You can cancel your subscription at any time from Settings → Billing in your dashboard. Upon cancellation, your paid features will remain active until the end of your current billing period. After that, your account will automatically revert to the Free plan. No partial refunds are issued for unused days unless within the 7-day refund window.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Plan Downgrades</h2>
          <p className="text-gray-600 leading-relaxed">
            If you downgrade from Business to Pro, or from any paid plan to Free, the change takes effect at the end of your current billing cycle. No refund is issued for the difference in plan pricing during the current cycle.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Exceptions</h2>
          <p className="text-gray-600 leading-relaxed mb-3">Refunds may be granted outside the 7-day window in these cases:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>You were charged due to a billing error or duplicate payment.</li>
            <li>The service experienced prolonged downtime (more than 48 consecutive hours) during your billing period.</li>
            <li>Your account was charged after you had already submitted a cancellation request.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Free Plan</h2>
          <p className="text-gray-600 leading-relaxed">
            The BillKar Free plan is completely free and includes 50 invoices/month, PDF downloads, WhatsApp sharing, and expense tracking. Since there are no charges for the Free plan, no refund applies. You can use the Free plan indefinitely.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            For any refund-related questions, reach out to us at{" "}
            <a href="mailto:support@billkar.co.in" className="text-indigo-600 hover:underline">support@billkar.co.in</a>. We typically respond within 24 hours on business days.
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

export default RefundPolicy;
