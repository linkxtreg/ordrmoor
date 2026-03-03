import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f9faf3] flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-stone-200">404</h1>
        <h2 className="text-2xl font-semibold text-[#101010] mt-4">Page not found</h2>
        <p className="text-[#52525c] mt-2">The tenant or page you're looking for doesn't exist.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-[#101010] text-[#cfff5e] rounded-lg font-medium hover:bg-[#cfff5e] hover:text-[#101010] transition-colors"
          >
            Go to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
