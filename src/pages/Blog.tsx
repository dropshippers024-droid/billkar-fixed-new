import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogPosts } from "@/data/blogPosts";

const categoryBg: Record<string, string> = {
  indigo: "bg-indigo-50",
  emerald: "bg-emerald-50",
  amber: "bg-amber-50",
};
const categoryBadge: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
};

const Blog = () => {
  useEffect(() => {
    document.title = "BillKar Blog — GST Guides, Billing Tips & Business Insights";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "GST guides, billing tips, and business insights for Indian entrepreneurs. Learn about GST invoicing, CGST/SGST/IGST, GSTR-1 filing, and more.");
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">BillKar Blog</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            GST guides, billing tips, and business insights for Indian entrepreneurs.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
            >
              <div className={`h-32 ${categoryBg[post.categoryColor] || "bg-gray-50"} relative flex items-end p-4`}>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${categoryBadge[post.categoryColor] || "bg-gray-100 text-gray-600"}`}>
                  {post.category}
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{post.date} · {post.readTime} read</span>
                  <span className="text-sm font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                    Read →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
