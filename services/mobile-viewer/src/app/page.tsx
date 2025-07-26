'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UserStats {
  readArticles: Set<string>;
  bookmarkedArticles: Set<string>;
  readingTime: number;
  articlesReadToday: number;
  streak: number;
}

export default function EnhancedMobileHome() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'all' | 'bookmarks'>('all');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [direction, setDirection] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [userStats, setUserStats] = useState<UserStats>({
    readArticles: new Set(),
    bookmarkedArticles: new Set(),
    readingTime: 0,
    articlesReadToday: 0,
    streak: 1
  });

  // Safe environment variable access
  const API_URL = 'https://ai-news-api.skaybotlabs.workers.dev';

  const categories = ['All', 'AI Models', 'Machine Learning', 'Policy', 'Research', 'Industry', 'Startups', 'Trending'];

  useEffect(() => {
    fetchArticles();
    loadUserStats();

    // Auto-refresh when app becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchArticles();
      }
    };

    const handleFocus = () => {
      fetchArticles();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchArticles = async () => {
    try {
      const timestamp = Date.now();
      const apiUrl = `${API_URL}/api/articles?t=${timestamp}`;
      
      const response = await fetch(apiUrl, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const articlesWithSource = data.data.map((article: Article) => ({
          ...article,
          source: article.source || article.original_url.split('/')[2]?.replace('www.', '') || 'AI News'
        }));
        setArticles(articlesWithSource);
      } else {
        setArticles([]);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userStats');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserStats({
          ...parsed,
          readArticles: new Set(parsed.readArticles),
          bookmarkedArticles: new Set(parsed.bookmarkedArticles)
        });
      }
    }
  };

  const saveUserStats = (stats: UserStats) => {
    if (typeof window !== 'undefined') {
      const toSave = {
        ...stats,
        readArticles: Array.from(stats.readArticles),
        bookmarkedArticles: Array.from(stats.bookmarkedArticles)
      };
      localStorage.setItem('userStats', JSON.stringify(toSave));
    }
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
    
    if (viewMode === 'bookmarks') {
      filtered = articles.filter(article => userStats.bookmarkedArticles.has(article.id));
    }
    
    filtered = filtered.filter(article => 
      selectedCategory === 'All' || 
      selectedCategory === 'Trending' || 
      article.category === selectedCategory
    );
    
    return filtered.sort((a, b) => {
      if (selectedCategory === 'Trending') {
        return b.view_count - a.view_count;
      }
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  }, [articles, selectedCategory, viewMode, userStats.bookmarkedArticles]);

  const navigateArticle = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setSwipeDirection('horizontal');
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
    }
  };

  const bookmarkArticle = (articleId: string) => {
    toggleBookmark(articleId);
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

  // Touch handling for swipe gestures
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart.x || !touchStart.y) return;
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe left - next article
          if (currentIndex < filteredArticles.length - 1) {
            navigateArticle(1);
          }
        } else {
          // Swipe right - previous article
          if (currentIndex > 0) {
            navigateArticle(-1);
          }
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        const currentArticle = filteredArticles[currentIndex];
        if (currentArticle) {
          if (deltaY > 0) {
            // Swipe up - share
            shareArticle(currentArticle);
          } else {
            // Swipe down - bookmark
            bookmarkArticle(currentArticle.id);
          }
        }
      }
    }
  };

  // Reset index when view mode or category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [viewMode, selectedCategory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) navigateArticle(-1);
          break;
        case 'ArrowRight':
          if (currentIndex < filteredArticles.length - 1) navigateArticle(1);
          break;
        case 'ArrowUp':
          if (filteredArticles[currentIndex]) shareArticle(filteredArticles[currentIndex]);
          break;
        case 'ArrowDown':
          if (filteredArticles[currentIndex]) bookmarkArticle(filteredArticles[currentIndex].id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, filteredArticles, navigateArticle]);

  // Mark article as read
  useEffect(() => {
    if (filteredArticles.length > 0 && filteredArticles[currentIndex]) {
      const articleId = filteredArticles[currentIndex].id;
      if (!userStats.readArticles.has(articleId)) {
        markAsRead(articleId);
      }
    }
  }, [currentIndex, filteredArticles, userStats.readArticles, markAsRead]);

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
            {/* Category Menu Button */}
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="text-gray-400 text-xl hover:text-white transition-colors"
            >
              ☰
            </button>
            
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              AI Bytes
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
        </div>
        
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

      {/* Main Content */}
      <div 
        className={`h-screen ${viewMode === 'bookmarks' ? 'pt-20' : 'pt-16'} pb-20`}
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
                  <div className="text-6xl mb-4">📰</div>
                  <p className="text-xl text-gray-400 mb-2">No articles available</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Check back later for the latest AI news
                  </p>
                </>
              )}
            </div>
          </div>
        ) : currentArticle ? (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ 
                x: swipeDirection === 'horizontal' ? (direction > 0 ? '100%' : '-100%') : 0,
                opacity: 0 
              }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ 
                x: swipeDirection === 'horizontal' ? (direction > 0 ? '-100%' : '100%') : 0,
                opacity: 0 
              }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="h-full px-4 overflow-y-auto pb-4"
            >
              <ArticleCard
                article={currentArticle}
                isRead={userStats.readArticles.has(currentArticle.id)}
                isBookmarked={userStats.bookmarkedArticles.has(currentArticle.id)}
                onBookmark={() => bookmarkArticle(currentArticle.id)}
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
              onClick={() => navigateArticle(-1)}
              disabled={currentIndex === 0}
              className="text-gray-400 disabled:opacity-30"
            >
              ←
            </button>
            <button
              onClick={() => navigateArticle(1)}
              disabled={currentIndex === filteredArticles.length - 1}
              className="text-gray-400 disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Category Menu */}
      <AnimatePresence>
        {showCategoryMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowCategoryMenu(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween' }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-gray-900 z-50 p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Categories</h2>
                <button
                  onClick={() => setShowCategoryMenu(false)}
                  className="text-gray-400 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentIndex(0);
                      setShowCategoryMenu(false);
                    }}
                    className={`w-full text-left py-3 px-4 rounded-lg transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {cat === 'Trending' && '🔥 '}
                    {cat}
                    {cat === selectedCategory && ' ✓'}
                  </button>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                <button 
                  onClick={() => {
                    setViewMode('bookmarks');
                    setCurrentIndex(0);
                    setShowCategoryMenu(false);
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
                    setShowCategoryMenu(false);
                  }}
                  className="flex items-center justify-between w-full py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                >
                  <span>📰 All Articles</span>
                  <span className="text-gray-400">{articles.length}</span>
                </button>
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
      <div className="flex items-center justify-center mb-6 text-sm text-gray-500">
        <span>📖 2 min read</span>
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

      {/* Swipe Instructions */}
      {index === 0 && (
        <div className="mt-4 text-center text-gray-500 text-sm">
          <div className="bg-gray-800 rounded-lg p-3 space-y-1">
            <div className="font-medium text-gray-400 mb-2">Swipe Gestures:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>← Next • → Previous</div>
              <div>↑ Share • ↓ Save</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}