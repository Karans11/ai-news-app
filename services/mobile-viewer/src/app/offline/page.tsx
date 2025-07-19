export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
        <p className="text-gray-400 mb-6">
          Check your internet connection to read the latest AI news
        </p>
        <a
          href="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}
