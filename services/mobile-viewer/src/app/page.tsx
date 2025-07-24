'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import InstallPrompt from '@/components/InstallPrompt';
import NetworkStatus from '@/components/NetworkStatus';

interface Article {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  image_url?: string;
  category: string;
  published_at: string;
  view_count: number;
  source?: string;
}

interface UserStats {
  readArticles: Set<string>;
  bookmarkedArticles: Set<string>;
  readingTime: number;
  articlesReadToday: number;
  streak: number;
}

export default function MobileHome() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'all' | 'bookmarks'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [direction, setDirection] = useState(0);
  const [userStats, setUserStats] = useState<UserStats>({
    readArticles: new Set(),
    bookmarkedArticles: new Set(),
    readingTime: 0,
    articlesReadToday: 0,
    streak: 1
  });

  const categories = ['All', 'AI Models', 'Machine Learning', 'Policy', 'Research', 'Industry', 'Startups', 'Trending'];

  useEffect(() => {
    fetchArticles();
    loadUserStats();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/articles`);
      const data = await response.json();
      if (data.success) {
        const articlesWithSource = data.data.map((article: Article) => ({
          ...article,
          source: article.original_url.split('/')[2]?.replace('www.', '') || 'AI News'
        }));
        setArticles(articlesWithSource);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = () => {
    const saved = localStorage.getItem('userStats');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserStats({
        ...parsed,
        readArticles: new Set(parsed.readArticles),
        bookmarkedArticles: new Set(parsed.bookmarkedArticles)
      });
    }
  };

  const saveUserStats = (stats: UserStats) => {
    const toSave = {
      ...stats,
      readArticles: Array.from(stats.readArticles),
      bookmarkedArticles: Array.from(stats.bookmarkedArticles)
    };
    localStorage.setItem('userStats', JSON.stringify(toSave));
  };

  const markAsRead = useCallback((articleId: string) => {
    setUserStats(prev => {
      const newStats = {
        ...prev,
        readArticles: new Set(prev.readArticles).add(articleId),
        readingTime: prev.readingTime + 0.5,
        articlesReadToday: prev.articlesReadToday + 1
      };
      saveUserStats(newStats);
      return newStats;
    });
  }, []);

  const toggleBookmark = useCallback((articleId: string) => {
    setUserStats(prev => {
      const newBookmarks = new Set(prev.bookmarkedArticles);
      if (newBookmarks.has(articleId)) {
        newBookmarks.delete(articleId);
      } else {
        newBookmarks.add(articleId);
      }
      const newStats = { ...prev, bookmarkedArticles: newBookmarks };
      saveUserStats(newStats);
      return newStats;
    });
  }, []);

  const filteredArticles = useMemo(() => {
    let filtered = articles;
    
    // First filter by bookmark if in bookmark mode
    if (viewMode === 'bookmarks') {
      filtered = articles.filter(article => userStats.bookmarkedArticles.has(article.id));
    }
    
    // Then filter by category
    filtered = filtered.filter(article => 
      selectedCategory === 'All' || 
      selectedCategory === 'Trending' || 
      article.category === selectedCategory
    );
    
    // Sort articles
    return filtered.sort((a, b) => {
      if (selectedCategory === 'Trending') {
        return b.view_count - a.view_count;
      }
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  }, [articles, selectedCategory, viewMode, userStats.bookmarkedArticles]);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      const newIndex = prev + newDirection;
      if (newIndex >= 0 && newIndex < filteredArticles.length) {
        return newIndex;
      }
      return prev;
    });
  }, [filteredArticles.length]);

  const shareArticle = async (article: Article) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: article.original_url,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(article.original_url);
      alert('Link copied to clipboard!');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Touch handling
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;
    
    if (isUpSwipe && currentIndex < filteredArticles.length - 1) {
      paginate(1);
    }
    if (isDownSwipe && currentIndex > 0) {
      paginate(-1);
    }
  };

  // Reset index when view mode or category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [viewMode, selectedCategory]);
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        paginate(-1);
      } else if (e.key === 'ArrowDown' && currentIndex < filteredArticles.length - 1) {
        paginate(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, filteredArticles.length, paginate]);

  // Mark first article as read
  useEffect(() => {
    if (filteredArticles.length > 0 && filteredArticles[currentIndex]) {
      const articleId = filteredArticles[currentIndex].id;
      // Only mark as read if not already read
      if (!userStats.readArticles.has(articleId)) {
        markAsRead(articleId);
      }
    }
  }, [currentIndex]); // Only depend on currentIndex, not filteredArticles

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading AI insights...</p>
          <p className="text-sm text-gray-500 mt-2">Curating the best for you</p>
        </div>
      </div>
    );
  }

  const currentArticle = filteredArticles[currentIndex];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              AI Shorts
            </h1>
            {viewMode === 'bookmarks' && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full">
                Bookmarks
              </span>
            )}
            <span className="text-xs text-gray-400">
              {filteredArticles.length} {viewMode === 'bookmarks' ? 'saved' : 'stories'}
            </span>
          </div>
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 text-2xl"
          >
            ☰
          </button>
        </div>

        {/* Category Pills - Only show in 'all' mode */}
        {viewMode === 'all' && (
          <div className="px-4 pb-3 flex space-x-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentIndex(0);
                }}
                className={`px-4 py-1 rounded-full text-sm whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {cat === 'Trending' && '🔥'} {cat}
              </button>
            ))}
          </div>
        )}
        
        {/* Back to All Articles button when in bookmarks */}
        {viewMode === 'bookmarks' && (
          <div className="px-4 pb-3">
            <button
              onClick={() => {
                setViewMode('all');
                setCurrentIndex(0);
              }}
              className="bg-gray-800 text-gray-300 px-4 py-1 rounded-full text-sm hover:bg-gray-700 transition"
            >
              ← Back to All Articles
            </button>
          </div>
        )}
      </header>

      {/* Stats Bar */}
      <div className={`fixed left-0 right-0 z-40 bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm px-4 py-2 ${
        viewMode === 'bookmarks' ? 'top-20' : 'top-24'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <span>📖 {userStats.articlesReadToday} read</span>
          <span>⏱️ {userStats.readingTime.toFixed(1)}m saved</span>
          <span>🔥 {userStats.streak} day streak</span>
          <button
            onClick={() => {
              setViewMode(viewMode === 'bookmarks' ? 'all' : 'bookmarks');
              setCurrentIndex(0);
            }}
            className={`px-2 py-1 rounded transition ${
              viewMode === 'bookmarks' 
                ? 'bg-yellow-600 text-white' 
                : 'hover:bg-white/10'
            }`}
          >
            🔖 {userStats.bookmarkedArticles.size}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`h-screen ${viewMode === 'bookmarks' ? 'pt-32' : 'pt-36'} pb-20`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {filteredArticles.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center">
              {viewMode === 'bookmarks' ? (
                <>
                  <div className="text-6xl mb-4">🔖</div>
                  <p className="text-xl text-gray-400 mb-2">No bookmarked articles yet</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Articles you save will appear here
                  </p>
                  <button
                    onClick={() => {
                      setViewMode('all');
                      setCurrentIndex(0);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
                  >
                    Browse Articles
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-400">No articles available</p>
                </>
              )}
            </div>
          </div>
        ) : currentArticle ? (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ y: direction > 0 ? '100%' : '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction > 0 ? '-100%' : '100%', opacity: 0 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="h-full px-4 overflow-y-auto pb-4"
            >
              <ArticleCard
                article={currentArticle}
                isRead={userStats.readArticles.has(currentArticle.id)}
                isBookmarked={userStats.bookmarkedArticles.has(currentArticle.id)}
                onBookmark={() => toggleBookmark(currentArticle.id)}
                onShare={() => shareArticle(currentArticle)}
                formatTimeAgo={formatTimeAgo}
                index={currentIndex}
                total={filteredArticles.length}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 px-4 py-3 z-40">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {currentIndex + 1} of {filteredArticles.length}
            {viewMode === 'bookmarks' && ' saved'}
          </span>
          
          {/* Progress dots */}
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(filteredArticles.length, 10) }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  i === currentIndex % 10 
                    ? 'bg-blue-500 w-6' 
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => paginate(-1)}
              disabled={currentIndex === 0}
              className="text-gray-400 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => paginate(1)}
              disabled={currentIndex === filteredArticles.length - 1}
              className="text-gray-400 disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-gray-900 z-50 p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="text-gray-400 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-gray-400 mb-3">Your Stats</h3>
                  <div className="space-y-3 bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span>Articles Read</span>
                      <span className="font-bold">{userStats.readArticles.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Saved</span>
                      <span className="font-bold">{userStats.readingTime.toFixed(1)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Streak</span>
                      <span className="font-bold">{userStats.streak} days</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setViewMode('bookmarks');
                      setCurrentIndex(0);
                      setShowMenu(false);
                    }}
                    className="flex items-center justify-between w-full py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    <span>🔖 Bookmarks</span>
                    <span className="text-gray-400">{userStats.bookmarkedArticles.size}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setViewMode('all');
                      setCurrentIndex(0);
                      setShowMenu(false);
                    }}
                    className="flex items-center justify-between w-full py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    <span>📰 All Articles</span>
                    <span className="text-gray-400">{articles.length}</span>
                  </button>
                  <button className="flex items-center justify-between w-full py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <span>📊 Detailed Stats</span>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button className="flex items-center justify-between w-full py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <span>⚙️ Settings</span>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button className="flex items-center justify-between w-full py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <span>ℹ️ About</span>
                    <span className="text-gray-400">→</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Article Card Component
function ArticleCard({ 
  article, 
  isRead, 
  isBookmarked, 
  onBookmark, 
  onShare, 
  formatTimeAgo,
  index,
  total
}: {
  article: Article;
  isRead: boolean;
  isBookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
  formatTimeAgo: (date: string) => string;
  index: number;
  total: number;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 min-h-[calc(100vh-240px)] flex flex-col">
      {/* Source and Time */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400 font-medium">{article.source}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500">{formatTimeAgo(article.published_at)}</span>
        </div>
        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded-full text-xs">
          {article.category}
        </span>
      </div>

      {/* Image */}
      {article.image_url && (
        <div className="mb-4 rounded-xl overflow-hidden bg-gray-800 h-48 relative">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {isRead && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              ✓ Read
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h2 className="text-2xl font-bold mb-4 leading-tight">
        {article.title}
      </h2>

      {/* Summary */}
      <p className="text-gray-300 text-lg leading-relaxed mb-6 flex-grow">
        {article.summary}
      </p>

      {/* Stats */}
      <div className="flex items-center justify-between mb-6 text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>👁️ {article.view_count} views</span>
          <span>📖 30 sec read</span>
        </div>
        <span className="text-green-400">
          {Math.floor((article.summary.length / 500) * 2)} min saved
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        <a
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl text-center font-medium hover:from-blue-700 hover:to-blue-800 transition"
        >
          Read Full
        </a>
        <button
          onClick={onBookmark}
          className={`py-3 px-4 rounded-xl font-medium transition ${
            isBookmarked
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {isBookmarked ? '★ Saved' : '☆ Save'}
        </button>
        <button
          onClick={onShare}
          className="bg-gray-800 text-gray-300 py-3 px-4 rounded-xl font-medium hover:bg-gray-700 transition"
        >
          ↗ Share
        </button>
      </div>

      {/* Swipe Hint */}
      {index === 0 && (
        <div className="mt-4 text-center text-gray-500 text-sm animate-pulse">
          ↕ Swipe up/down or use arrows to navigate
        </div>
      )}
    </div>
  );
}