import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎾</div>
        <h1 className="text-3xl font-semibold mb-2">404</h1>
        <p className="text-stone-600 mb-6">Diese Seite gibt es nicht.</p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors"
        >
          Zur Startseite →
        </Link>
      </div>
    </div>
  );
}
