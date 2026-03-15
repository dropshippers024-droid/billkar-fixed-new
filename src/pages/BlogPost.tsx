import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPostBySlug, getRelatedPosts } from "@/data/blogPosts";

const categoryBadge: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
};
const categoryBg: Record<string, string> = {
  indigo: "bg-indigo-50",
  emerald: "bg-emerald-50",
  amber: "bg-amber-50",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — BillKar Blog`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", post.excerpt);
    }
    window.scrollTo(0, 0);
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post.related);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/blog" className="hover:text-gray-700 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-gray-500">{post.category}</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-[2.5rem] font-bold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryBadge[post.categoryColor] || "bg-gray-100 text-gray-600"}`}>
            {post.category}
          </span>
          <span className="text-sm text-gray-400">{post.date}</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-400">{post.readTime} read</span>
        </div>

        {/* Content */}
        <article
          className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-strong:text-gray-900 prose-table:text-sm prose-th:bg-gray-50 prose-th:text-gray-700 prose-th:font-semibold prose-td:border-gray-200 prose-th:border-gray-200 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 bg-indigo-50 rounded-2xl p-8 md:p-10 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Create Your First GST Invoice — Free
          </h3>
          <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
            50 free invoices/month. Auto GST calculation. WhatsApp sharing. No credit card needed.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Start Free →
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-14">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Related Articles</h3>
            <div className="grid sm:grid-cols-2 gap-5">
              {related.slice(0, 2).map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
                >
                  <div className={`h-20 ${categoryBg[r.categoryColor] || "bg-gray-50"}`} />
                  <div className="p-4">
                    <h4 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1">
                      {r.title}
                    </h4>
                    <span className="text-xs text-gray-400">{r.date} · {r.readTime} read</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
