// Clean production version - replace your page.tsx with this

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import UserMenu from '@/components/auth/UserMenu';

// Add this right after your imports in page.tsx, before the Supabase initialization

// Debug all environment variables
console.log('🔍 ALL ENVIRONMENT VARIABLES:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All process.env keys:', Object.keys(process.env));

// Debug Supabase specific variables
console.log('🔑 SUPABASE ENVIRONMENT VARIABLES:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('URL length:', process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
console.log('Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);

// Also check if there are any variations in naming
console.log('🔍 CHECKING ALTERNATIVE NAMING:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('NEXT_PUBLIC_SUPABASE_PROJECT_URL:', process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL);

// Replace your existing Supabase initialization with this enhanced version:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔧 SUPABASE INITIALIZATION:');
console.log('Final URL:', supabaseUrl);
console.log('Final Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
console.log('Both values present:', !!(supabaseUrl && supabaseAnonKey));
console.log('Window exists:', typeof window !== 'undefined');

// Create Supabase client with detailed logging
const supabase = typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey 
  ? (() => {
      console.log('✅ Creating Supabase client...');
      try {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        console.log('✅ Supabase client created successfully!');
        return client;
      } catch (error) {
        console.error('❌ Error creating Supabase client:', error);
        return null;
      }
    })()
  : (() => {
      console.log('❌ Cannot create Supabase client');
      console.log('Window undefined:', typeof window === 'undefined');
      console.log('URL missing:', !supabaseUrl);
      console.log('Key missing:', !supabaseAnonKey);
      return null;
    })();

console.log('🏁 FINAL RESULT: Supabase client exists:', !!supabase);

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

interface UserPreferences {
  selectedCategories: string[];
  filterMode: 'all' | 'selected';
}

const AVAILABLE_CATEGORIES = [
  'AI Models',
  'Machine Learning',
  'Policy',
  'Research',
  'Industry News',
  'Startups',
  'AI Security',
  'AI Tools',
  'Computer Vision',
  'Natural Language Processing',
  'Robotics'
];

export default function EnhancedMobileHome() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'all' | 'bookmarks'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [direction, setDirection] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [userStats, setUserStats] = useState<UserStats>({
    readArticles: new Set(),
    bookmarkedArticles: new Set(),
    readingTime: 0,
    articlesReadToday: 0,
    streak: 1
  });
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    selectedCategories: [...AVAILABLE_CATEGORIES],
    filterMode: 'all'
  });
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const { user, profile, loading: authLoading } = useAuth();
  const API_URL = 'https://ai-news-api.skaybotlabs.workers.dev';

  useEffect(() => {
    if (!authLoading && user) {
      fetchArticles();
      loadUserStats();
      loadUserPreferences();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user]);

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
          source: article.source || article.original_url.split('/')[2]?.replace('www.', '') || 'AI News',
          published_at: article.published_at
        }));
        setArticles(articlesWithSource);
      } else {
        setArticles([]);
      }
    } catch (error) {
      // Log error for debugging but don't expose details
      console.error('Failed to fetch articles');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to load user stats');
        return;
      }

      const readArticles = new Set(
        data.filter(stat => stat.action === 'read').map(stat => stat.article_id)
      );
      const bookmarkedArticles = new Set(
        data.filter(stat => stat.action === 'bookmark').map(stat => stat.article_id)
      );

      setUserStats({
        readArticles,
        bookmarkedArticles,
        readingTime: data.filter(stat => stat.action === 'read').length * 2,
        articlesReadToday: data.filter(stat => 
          stat.action === 'read' && 
          new Date(stat.created_at).toDateString() === new Date().toDateString()
        ).length,
        streak: 1
      });

    } catch (error) {
      console.error('Failed to load user stats');
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load preferences');
        setPreferencesLoaded(true);
        return;
      }

      if (data) {
        setUserPreferences({
          selectedCategories: data.selected_categories || [...AVAILABLE_CATEGORIES],
          filterMode: data.filter_mode || 'all'
        });
      }
      setPreferencesLoaded(true);
    } catch (error) {
      console.error('Failed to load preferences');
      setPreferencesLoaded(true);
    }
  };

  const saveUserPreferences = async (preferences: UserPreferences) => {
    if (!user || !preferencesLoaded) return;

    try {
      const { data: updateData, error: updateError } = await supabase
        .from('user_preferences')
        .update({
          selected_categories: preferences.selectedCategories,
          filter_mode: preferences.filterMode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select();

      if (updateError) {
        console.error('Failed to update preferences');
        return;
      }

      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            selected_categories: preferences.selectedCategories,
            filter_mode: preferences.filterMode,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to create preferences');
        }
      }
    } catch (error) {
      console.error('Failed to save preferences');
    }
  };

   const toggleCategorySelection = (category: string) => {
  setUserPreferences(prev => {
    const newSelectedCategories = prev.selectedCategories.includes(category)
      ? prev.selectedCategories.filter(c => c !== category)
      : [...prev.selectedCategories, category];
    
    const newPreferences: UserPreferences = {
      ...prev,
      selectedCategories: newSelectedCategories
    };
    
    saveUserPreferences(newPreferences);
    return newPreferences;
  });
};

  const toggleFilterMode = () => {
  setUserPreferences(prev => {
    const newPreferences: UserPreferences = {
      ...prev,
      filterMode: prev.filterMode === 'all' ? 'selected' : 'all'
    };
    
    saveUserPreferences(newPreferences);
    return newPreferences;
  });
};

  const selectAllCategories = () => {
  setUserPreferences(prev => {
    const newPreferences = {
      ...prev,
      selectedCategories: [...AVAILABLE_CATEGORIES]
    };
    
    saveUserPreferences(newPreferences);
    return newPreferences;
  });
};
  const deselectAllCategories = () => {
  setUserPreferences(prev => {
    const newPreferences: UserPreferences = {
      ...prev,
      selectedCategories: []
    };
    
    saveUserPreferences(newPreferences);
    return newPreferences;
  });
};

  const updateUserAction = async (articleId: string, action: 'read' | 'bookmark' | 'share') => {
    if (!user) return;

    try {
      if (action === 'bookmark') {
        const exists = userStats.bookmarkedArticles.has(articleId);
        if (exists) {
          await supabase
            .from('user_stats')
            .delete()
            .eq('user_id', user.id)
            .eq('article_id', articleId)
            .eq('action', 'bookmark');
        } else {
          await supabase
            .from('user_stats')
            .insert({
              user_id: user.id,
              article_id: articleId,
              action: 'bookmark'
            });
        }
      } else {
        await supabase
          .from('user_stats')
          .upsert({
            user_id: user.id,
            article_id: articleId,
            action: action
          }, {
            onConflict: 'user_id,article_id,action'
          });
      }
    } catch (error) {
      console.error('Failed to update user action');
    }
  };

  const markAsRead = useCallback(async (articleId: string) => {
    if (userStats.readArticles.has(articleId)) return;

    setUserStats(prev => {
      const newStats = {
        ...prev,
        readArticles: new Set(prev.readArticles).add(articleId),
        readingTime: prev.readingTime + 2,
        articlesReadToday: prev.articlesReadToday + 1
      };
      return newStats;
    });

    await updateUserAction(articleId, 'read');
  }, [userStats.readArticles, user]);

  const toggleBookmark = useCallback(async (articleId: string) => {
    setUserStats(prev => {
      const newBookmarks = new Set(prev.bookmarkedArticles);
      if (newBookmarks.has(articleId)) {
        newBookmarks.delete(articleId);
      } else {
        newBookmarks.add(articleId);
      }
      const newStats = { ...prev, bookmarkedArticles: newBookmarks };
      return newStats;
    });

    await updateUserAction(articleId, 'bookmark');
  }, [user]);

  const filteredArticles = useMemo(() => {
    let filtered = articles;
    
    if (viewMode === 'bookmarks') {
      filtered = articles.filter(article => userStats.bookmarkedArticles.has(article.id));
    }
    
    if (userPreferences.filterMode === 'selected' && userPreferences.selectedCategories.length > 0) {
      filtered = filtered.filter(article => 
        userPreferences.selectedCategories.includes(article.category)
      );
    }
    
    return filtered.sort((a, b) => {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  }, [articles, viewMode, userStats.bookmarkedArticles, userPreferences]);

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
    await updateUserAction(article.id, 'share');

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: article.original_url,
        });
      } catch (err) {
        // Share failed - silent fail
      }
    } else {
      navigator.clipboard.writeText(article.original_url);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      let date: Date;
      
      if (dateString.includes('T') || dateString.includes('Z')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
        if (isNaN(date.getTime())) {
          date = new Date(dateString + 'Z');
        }
      }
      
      const now = new Date();
      
      if (isNaN(date.getTime())) {
        return 'just now';
      }
      
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (seconds < 0) {
        return 'just now';
      }
      
      if (seconds < 60) return 'just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    } catch (error) {
      return 'just now';
    }
  };

  const openArticle = (article: Article) => {
    if (!userStats.readArticles.has(article.id)) {
      markAsRead(article.id);
    }
    window.open(article.original_url, '_blank', 'noopener,noreferrer');
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
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        if (currentIndex < filteredArticles.length - 1) {
          navigateArticle(1);
        }
      } else {
        if (currentIndex > 0) {
          navigateArticle(-1);
        }
      }
    }
  };

  // Reset index when view mode changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [viewMode, userPreferences]);

  // Mark article as read when viewing
  useEffect(() => {
    if (filteredArticles.length > 0 && filteredArticles[currentIndex]) {
      const articleId = filteredArticles[currentIndex].id;
      if (!userStats.readArticles.has(articleId)) {
        const timer = setTimeout(() => {
          markAsRead(articleId);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, filteredArticles, userStats.readArticles, markAsRead]);

  if (authLoading || (loading && user)) {
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

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  const currentArticle = filteredArticles[currentIndex];
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }) : 'Recently';

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Mobile-Optimized Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-b border-gray-800"
              style={{ 
                paddingTop: 'env(safe-area-inset-top)', 
                paddingLeft: 'env(safe-area-inset-left)', 
                paddingRight: 'env(safe-area-inset-right)' 
              }}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 text-xl hover:text-white transition-colors p-2 -ml-2"
            >
              ☰
            </button>
            
            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xs">🤖</span>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              AI Bytes
            </h1>
          </div>

          <div className="flex items-center space-x-1">
            {viewMode === 'bookmarks' && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full">
                Bookmarks
              </span>
            )}
            {userPreferences.filterMode === 'selected' && (
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                Filtered
              </span>
            )}
            <UserMenu />
          </div>
        </div>
        
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{filteredArticles.length} articles</span>
            {(viewMode !== 'all' || userPreferences.filterMode === 'selected') && (
              <button
                onClick={() => {
                  setViewMode('all');
                  setUserPreferences(prev => ({
                    ...prev,
                    filterMode: 'all' as const
                  }));
                  setCurrentIndex(0);
                }}
                className="text-blue-400 hover:text-blue-300"
              >
                ← Show All
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div 
        className="h-screen pt-20 pb-16"
        style={{ paddingTop: `calc(5rem + env(safe-area-inset-top))` }}
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
                    className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition text-sm font-medium"
                  >
                    Browse Articles
                  </button>
                </>
              ) : userPreferences.filterMode === 'selected' && userPreferences.selectedCategories.length === 0 ? (
                <>
                  <div className="text-6xl mb-4">🔧</div>
                  <p className="text-xl text-gray-400 mb-2">No categories selected</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Select categories from the menu to see articles
                  </p>
                  <button
                    onClick={() => setShowMenu(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition text-sm font-medium"
                  >
                    Select Categories
                  </button>
                </>
              ) : userPreferences.filterMode === 'selected' ? (
                <>
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-xl text-gray-400 mb-2">No articles in selected categories</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Try selecting more categories or switch to all articles
                  </p>
                  <button
                    onClick={toggleFilterMode}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition text-sm font-medium"
                  >
                    Show All Articles
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
              className="h-full px-3 overflow-y-auto pb-4"
            >
              <ArticleCard
                article={currentArticle}
                isRead={userStats.readArticles.has(currentArticle.id)}
                isBookmarked={userStats.bookmarkedArticles.has(currentArticle.id)}
                onBookmark={() => toggleBookmark(currentArticle.id)}
                onShare={() => shareArticle(currentArticle)}
                onOpen={() => openArticle(currentArticle)}
                formatTimeAgo={formatTimeAgo}
                index={currentIndex}
                total={filteredArticles.length}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 px-3 py-2 z-40"
           style={{ 
             paddingBottom: 'env(safe-area-inset-bottom)', 
             paddingLeft: 'env(safe-area-inset-left)', 
             paddingRight: 'env(safe-area-inset-right)' 
           }}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {currentIndex + 1} of {filteredArticles.length}
          </span>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(filteredArticles.length, 8) }).map((_, i) => (
              <div
                key={i}
                className={`h-1 w-1 rounded-full transition-all ${
                  i === currentIndex % 8 
                    ? 'bg-blue-500 w-4' 
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateArticle(-1)}
              disabled={currentIndex === 0}
              className="text-gray-400 disabled:opacity-30 p-2 text-lg"
            >
              ←
            </button>
            <button
              onClick={() => navigateArticle(1)}
              disabled={currentIndex === filteredArticles.length - 1}
              className="text-gray-400 disabled:opacity-30 p-2 text-lg"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Menu */}
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
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween' }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-gray-900 z-50 overflow-y-auto"
              style={{ 
                paddingTop: `calc(1rem + env(safe-area-inset-top))`, 
                paddingLeft: `calc(1rem + env(safe-area-inset-left))`,
                paddingBottom: `calc(1rem + env(safe-area-inset-bottom))`
              }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">Menu</h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="text-gray-400 text-2xl p-1"
                  >
                    ×
                  </button>
                </div>
                
                {/* User Profile Section */}
                <div className="mb-6 p-3 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {user?.user_metadata?.full_name || 'AI Enthusiast'}
                      </p>
                      <p className="text-gray-300 text-xs truncate">{user?.email}</p>
                      <p className="text-gray-400 text-xs">Member since {joinDate}</p>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-blue-400 font-bold text-sm">{userStats.readArticles.size}</p>
                      <p className="text-gray-400 text-xs">Articles Read</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-yellow-400 font-bold text-sm">{userStats.bookmarkedArticles.size}</p>
                      <p className="text-gray-400 text-xs">Bookmarked</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-green-400 font-bold text-sm">{userStats.streak}</p>
                      <p className="text-gray-400 text-xs">Day Streak</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-purple-400 font-bold text-sm">{userStats.readingTime}m</p>
                      <p className="text-gray-400 text-xs">Reading Time</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="bg-gray-800/30 rounded-lg p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-300">Today's Progress</span>
                      <span className="text-xs text-blue-400">{userStats.articlesReadToday}/5</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((userStats.articlesReadToday / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* View Mode Section */}
                <div className="space-y-2 mb-4">
                  <h3 className="text-sm font-semibold text-white mb-2">View Options</h3>
                  <button 
                    onClick={() => {
                      setViewMode('all');
                      setUserPreferences(prev => ({
                         ...prev,
                         filterMode: 'all' as const
                      }));
                      setCurrentIndex(0);
                      setShowMenu(false);
                    }}
                    className={`flex items-center justify-between w-full py-2 px-3 rounded-lg hover:bg-gray-700 transition text-sm ${
                      viewMode === 'all' && userPreferences.filterMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span>📰 All Articles</span>
                    <span className="text-gray-400 text-xs">{articles.length}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setViewMode('bookmarks');
                      setCurrentIndex(0);
                      setShowMenu(false);
                    }}
                    className={`flex items-center justify-between w-full py-2 px-3 rounded-lg hover:bg-gray-700 transition text-sm ${
                      viewMode === 'bookmarks' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span>🔖 Bookmarks</span>
                    <span className="text-gray-400 text-xs">{userStats.bookmarkedArticles.size}</span>
                  </button>
                </div>

                {/* Category Filter Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Category Filters</h3>
                    <button
                      onClick={() => setShowCategorySettings(!showCategorySettings)}
                      className="text-blue-400 text-xs hover:text-blue-300"
                    >
                      {showCategorySettings ? 'Hide' : 'Customize'}
                    </button>
                  </div>

                  {/* Filter Mode Toggle */}
                  <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <span className="text-gray-300 text-sm">Category Filtering</span>
                    <button
                      onClick={toggleFilterMode}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                        userPreferences.filterMode === 'selected'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {userPreferences.filterMode === 'selected' ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Category Selection */}
                  <AnimatePresence>
                    {showCategorySettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                          {/* Select All/None buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllCategories}
                              className="flex-1 bg-green-600 text-white py-1 px-2 rounded-lg text-xs hover:bg-green-700 transition"
                            >
                              Select All
                            </button>
                            <button
                              onClick={deselectAllCategories}
                              className="flex-1 bg-red-600 text-white py-1 px-2 rounded-lg text-xs hover:bg-red-700 transition"
                            >
                              Clear All
                            </button>
                          </div>

                          {/* Category checkboxes */}
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {AVAILABLE_CATEGORIES.map(category => (
                              <label
                                key={category}
                                className="flex items-center space-x-2 p-1 hover:bg-gray-700 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={userPreferences.selectedCategories.includes(category)}
                                  onChange={() => toggleCategorySelection(category)}
                                  className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-300 text-xs flex-1">{category}</span>
                                <span className="text-gray-500 text-xs">
                                  {articles.filter(a => a.category === category).length}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selected Categories Summary */}
                  {userPreferences.filterMode === 'selected' && (
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-2">
                      <p className="text-purple-300 text-xs mb-1">
                        Showing {userPreferences.selectedCategories.length} categories:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {userPreferences.selectedCategories.slice(0, 4).map(category => (
                          <span key={category} className="bg-purple-600 text-white text-xs px-1 py-0.5 rounded-full">
                            {category}
                          </span>
                        ))}
                        {userPreferences.selectedCategories.length > 4 && (
                          <span className="bg-gray-600 text-white text-xs px-1 py-0.5 rounded-full">
                            +{userPreferences.selectedCategories.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
  onOpen,
  formatTimeAgo,
  index,
  total
}: {
  article: Article;
  isRead: boolean;
  isBookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
  onOpen: () => void;
  formatTimeAgo: (date: string) => string;
  index: number;
  total: number;
}) {
  return (
    <div 
      className="bg-gray-900 rounded-2xl p-4 min-h-[calc(100vh-200px)] flex flex-col cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400 font-medium">{article.source}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500">{formatTimeAgo(article.published_at)}</span>
        </div>
        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded-full text-xs">
          {article.category}
        </span>
      </div>

      {article.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-800 h-40 relative">
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

      <h2 className="text-xl font-bold mb-3 leading-tight">
        {article.title}
      </h2>

      <p className="text-gray-300 text-base leading-relaxed mb-4 flex-grow">
        {article.summary}
      </p>

      <div className="flex items-center justify-center mb-4 text-sm text-gray-500">
        <span>📖 2 min read</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
          className={`py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm ${
            isBookmarked
              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <span className="text-base">{isBookmarked ? '⭐' : '🤍'}</span>
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="bg-gray-800 text-gray-300 py-3 px-4 rounded-xl font-medium hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm"
        >
          <span className="text-base">📤</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}