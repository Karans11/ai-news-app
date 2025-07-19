'use client';
import { useState, useEffect } from 'react';

interface Article {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  image_url?: string;
  category: string;
  published_at: string;
  view_count: number;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  
  // Rotating quotes state
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isQuoteVisible, setIsQuoteVisible] = useState(true);
  
  // AI Quotes array
  const aiQuotes = [
    "AI won't replace you — but ignoring it just might.",
    "Humans won't be replaced by AI, but by humans who use it better.",
    "Master AI — before it becomes your competition.",
    "Those who embrace AI will outpace those who fear it.",
    "Stay ahead: AI won't steal your job, but someone using AI could.",
    "The future belongs to humans who learn AI, not those who fight it.",
    "It's not AI vs. you — it's AI with you, or AI without you.",
    "Don't fear AI — fear falling behind it.",
    "Humans with AI are unstoppable; humans without it are replaceable.",
    "AI won't replace talent — but it will amplify those who adapt."
  ];

  useEffect(() => {
    fetchArticles();
  }, []);

  // Rotating quotes effect
  useEffect(() => {
    // Start with random quote
    const randomIndex = Math.floor(Math.random() * aiQuotes.length);
    setCurrentQuoteIndex(randomIndex);

    // Set up interval for rotating quotes
    const interval = setInterval(() => {
      // Fade out current quote
      setIsQuoteVisible(false);
      
      // After fade out, change quote and fade in
      setTimeout(() => {
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % aiQuotes.length);
        setIsQuoteVisible(true);
      }, 500); // Half second for fade transition
    }, 6000); // Change every 60 seconds (1 minute)

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [aiQuotes.length]);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles`);
      const data = await response.json();
      if (data.success) {
        setArticles(data.data);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Successfully subscribed!');
        setEmail('');
      } else {
        alert(data.error || 'Subscription failed');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const categories = ['All', 'AI Models', 'Machine Learning', 'Policy', 'Research', 'Industry', 'Startups', 'AI Security'];
  const categoryIcons: { [key: string]: string } = {
    'All': '🌐',
    'AI Models': '🤖',
    'Machine Learning': '🧠',
    'Policy': '⚖️',
    'Research': '🔬',
    'Industry': '🏭',
    'Startups': '🚀',
    'AI Security': '🔒'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-md bg-black/30 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🤖</span>
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                  AI News Portal
                </h1>
              </div>
              <p className="text-sm text-gray-300 hidden md:block">
                Cutting-edge AI updates • Real-time insights
              </p>
            </div>
          </div>
        </header>

        {/* Hero Section with Subscribe */}
        <div className="relative overflow-hidden py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Welcome to the AI Revolution
              </h2>
              <div className="min-h-[32px] mb-8">
                <p className={`text-xl text-gray-300 italic transition-all duration-500 transform ${
                  isQuoteVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                }`}>
                  "{aiQuotes[currentQuoteIndex]}"
                </p>
              </div>
              
              {/* Subscribe Form */}
              <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email for AI insights"
                      className="flex-1 px-6 py-4 bg-black/90 backdrop-blur-xl rounded-l-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                      disabled={subscribing}
                    />
                    <button
                      type="submit"
                      disabled={subscribing}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-r-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition duration-200 disabled:opacity-50"
                    >
                      {subscribing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Subscribing...
                        </span>
                      ) : 'Subscribe'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-full backdrop-blur-md transition-all duration-300 flex items-center space-x-2 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20'
                }`}
              >
                <span className="text-lg">{categoryIcons[cat]}</span>
                <span className="font-medium">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-purple-600 rounded-full animate-pulse"></div>
                <div className="w-20 h-20 border-4 border-pink-600 rounded-full animate-pulse absolute top-0 left-0 animate-ping"></div>
              </div>
              <p className="mt-4 text-gray-300">Loading AI insights...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No articles available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles
                .filter((article) => selectedCategory === 'All' || article.category === selectedCategory)
                .map((article, index) => (
                  <ArticleCard key={article.id} article={article} index={index} />
                ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="backdrop-blur-md bg-black/30 border-t border-white/10 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 mb-6">
              <a href="#" className="text-gray-400 hover:text-white transition">About</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Contact</a>
            </div>
            <p className="text-gray-400">&copy; 2024 AI News Portal. Powered by the future.</p>
            <p className="text-sm text-gray-500 mt-2">
              Aggregating intelligence from the world's leading AI sources.
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

function ArticleCard({ article, index }: { article: Article; index: number }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatSummary = (summary: string) => {
    const minChars = 90;
    const maxChars = 200;
    
    if (summary.length <= maxChars) {
      return summary;
    }
    
    let cutoff = summary.lastIndexOf(' ', maxChars);
    if (cutoff < minChars) {
      cutoff = maxChars;
    }
    
    return summary.substring(0, cutoff).trim() + '...';
  };

  return (
    <div 
      className="group relative animate-fadeIn"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-1000"></div>
      
      {/* Card content */}
      <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300">
        {article.image_url && (
          <div className="h-48 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="p-6">
          {/* Category and Date */}
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              {article.category}
            </span>
            <span className="text-xs text-gray-400">
              {formatDate(article.published_at)}
            </span>
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition duration-300">
            {article.title}
          </h2>
          
          {/* Summary */}
          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
            {formatSummary(article.summary)}
          </p>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <a
              href={article.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-purple-400 hover:text-pink-400 transition group/link"
            >
              <span className="text-sm font-medium">Explore full article</span>
              <svg className="w-4 h-4 transform group-hover/link:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{article.view_count}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}