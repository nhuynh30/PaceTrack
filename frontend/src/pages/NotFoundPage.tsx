import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center bg-white px-6 text-center"
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <p className="text-8xl font-black text-orange-500" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-3 max-w-xs text-sm text-gray-400 leading-relaxed">
        Looks like this route doesn't exist. Maybe you took a wrong turn on your run.
      </p>
      <Link
        to="/dashboard"
        className="mt-8 rounded-full bg-orange-500 px-8 py-3 text-sm font-bold text-white hover:bg-orange-400 transition-colors"
      >
        Back to Dashboard
      </Link>
      <Link to="/" className="mt-3 text-sm text-gray-400 hover:text-gray-600">
        Go to home
      </Link>
    </div>
  );
}
