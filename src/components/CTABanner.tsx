import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const CTABanner = () => (
  <section className="py-4 px-4 md:px-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-indigo-600 rounded-2xl py-16 text-center max-w-6xl mx-auto"
    >
      <h2 className="text-3xl font-bold text-white mb-2">
        Ready to simplify your billing?
      </h2>
      <p className="text-indigo-200 mt-2 mb-6">
        Join 2,000+ businesses billing smarter.
      </p>
      <Link
        to="/signup"
        className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
      >
        Start Free →
      </Link>
    </motion.div>
  </section>
);

export default CTABanner;
