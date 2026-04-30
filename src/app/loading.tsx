export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-stone-500 text-sm">
        <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
        <span>Lade…</span>
      </div>
    </div>
  );
}
