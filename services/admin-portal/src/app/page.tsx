'use client';
import { useState, useEffect } from 'react';

interface Stats {
  totalArticles: number;
  totalSubscribers: number;
  totalViews: number;
  lastUpdated: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  category: string;
  image_url?: string;
  created_at: string;
  published_at: string;
  view_count: number;
  is_published: boolean;
}

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'articles' | 'subscribers' | 'analytics' | 'settings'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [articles, setArticles] = useState<Article[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [selectedSubscribers, setSelectedSubscribers] = useState<Set<string>>(new Set());

  // Form states
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Menu items with icons
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'articles', label: 'Articles', icon: '📝' },
    { id: 'subscribers', label: 'Subscribers', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const categories = ['All', 'AI Models', 'Machine Learning', 'Policy', 'Research', 'Industry', 'Startups', 'AI Security'];

  useEffect(() => {
    fetchStats();
    if (activeView === 'articles') {
      fetchArticles();
    } else if (activeView === 'subscribers') {
      fetchSubscribers();
    }
  }, [activeView]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/articles`);
      const data = await res.json();
      if (data.success) setArticles(data.data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/subscribers`);
      const data = await res.json();
      if (data.success) setSubscribers(data.data);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    }
  };

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingArticle 
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/articles/${editingArticle.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/articles`;
      
      const method = editingArticle ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          summary,
          original_url: originalUrl,
          category,
          image_url: imageUrl
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(editingArticle ? 'Article updated successfully!' : 'Article created successfully!');
        // Reset form
        resetForm();
        // Refresh data
        fetchStats();
        fetchArticles();
      }
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article');
    }
  };

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setOriginalUrl('');
    setCategory('');
    setImageUrl('');
    setShowArticleForm(false);
    setEditingArticle(null);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setTitle(article.title);
    setSummary(article.summary);
    setOriginalUrl(article.original_url);
    setCategory(article.category);
    setImageUrl(article.image_url || '');
    setShowArticleForm(true);
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/articles/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        fetchArticles();
        fetchStats();
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article');
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to remove this subscriber?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/subscribers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        fetchSubscribers();
        fetchStats();
      } else {
        alert('Failed to remove subscriber');
      }
    } catch (error) {
      console.error('Error removing subscriber:', error);
      alert('Error removing subscriber');
    }
  };

  const handleBulkDelete = async () => {
    if (activeView === 'articles' && selectedArticles.size > 0) {
      if (!confirm(`Delete ${selectedArticles.size} articles?`)) return;
      
      for (const id of selectedArticles) {
        await handleDeleteArticle(id);
      }
      setSelectedArticles(new Set());
    } else if (activeView === 'subscribers' && selectedSubscribers.size > 0) {
      if (!confirm(`Remove ${selectedSubscribers.size} subscribers?`)) return;
      
      for (const id of selectedSubscribers) {
        await handleDeleteSubscriber(id);
      }
      setSelectedSubscribers(new Set());
    }
  };

  const toggleSelectArticle = (id: string) => {
    const newSelection = new Set(selectedArticles);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedArticles(newSelection);
  };

  const toggleSelectSubscriber = (id: string) => {
    const newSelection = new Set(selectedSubscribers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSubscribers(newSelection);
  };

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredSubscribers = subscribers.filter(sub => 
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading AI Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-black/30 backdrop-blur-md border-r border-white/10 h-screen sticky top-0 z-20">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <h1 className="text-xl font-bold text-white">AI Admin</h1>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeView === item.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 relative z-10">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
          <div className="px-8 py-6">
            <h1 className="text-3xl font-bold text-white">
              {menuItems.find(item => item.id === activeView)?.label} Overview
            </h1>
            <p className="text-gray-300 mt-1">Manage your AI news platform</p>
          </div>
        </header>

        <main className="p-8">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm">Total Articles</h3>
                    <span className="text-2xl">📰</span>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.totalArticles || 0}</p>
                  <p className="text-green-400 text-sm mt-2">+12% from last month</p>
                </div>
                
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm">Subscribers</h3>
                    <span className="text-2xl">👥</span>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.totalSubscribers || 0}</p>
                  <p className="text-green-400 text-sm mt-2">+24% from last month</p>
                </div>
                
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm">Total Views</h3>
                    <span className="text-2xl">👁️</span>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats?.totalViews || 0}</p>
                  <p className="text-green-400 text-sm mt-2">+18% from last week</p>
                </div>
                
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm">Engagement Rate</h3>
                    <span className="text-2xl">📈</span>
                  </div>
                  <p className="text-4xl font-bold text-white">87%</p>
                  <p className="text-green-400 text-sm mt-2">+5% from last week</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => { setShowArticleForm(true); setActiveView('articles'); }}
                    className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-medium hover:shadow-lg transition"
                  >
                    ✨ Create New Article
                  </button>
                  <button
                    onClick={() => setActiveView('subscribers')}
                    className="p-4 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition"
                  >
                    📧 View Subscribers
                  </button>
                  <button
                    onClick={() => setActiveView('analytics')}
                    className="p-4 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition"
                  >
                    📊 View Analytics
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-300">
                    <span>New article published: "GPT-5 Announced"</span>
                    <span className="text-sm">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>5 new subscribers joined</span>
                    <span className="text-sm">4 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Article "AI Ethics" reached 1k views</span>
                    <span className="text-sm">Yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Articles Management */}
          {activeView === 'articles' && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    <button
                      onClick={() => { setShowArticleForm(!showArticleForm); resetForm(); }}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-medium hover:shadow-lg transition"
                    >
                      {showArticleForm ? '✖️ Cancel' : '➕ New Article'}
                    </button>
                    {(selectedArticles.size > 0) && (
                      <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition"
                      >
                        🗑️ Delete ({selectedArticles.size})
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="🔍 Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-64"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full transition-all ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Article Form */}
              {showArticleForm && (
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {editingArticle ? '✏️ Edit Article' : '✨ Create New Article'}
                  </h2>
                  <form onSubmit={handleSubmitArticle} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Summary (90+ characters)</label>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                        minLength={90}
                      />
                      <p className="text-xs text-gray-400 mt-1">{summary.length} characters</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Original Article URL</label>
                      <input
                        type="url"
                        value={originalUrl}
                        onChange={(e) => setOriginalUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="" className="bg-gray-800">Select Category</option>
                        {categories.slice(1).map(cat => (
                          <option key={cat} value={cat} className="bg-gray-800">{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Image URL (Optional)</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:shadow-lg transition"
                    >
                      {editingArticle ? '💾 Update Article' : '🚀 Publish Article'}
                    </button>
                  </form>
                </div>
              )}

              {/* Articles List */}
              <div className="space-y-3">
                {filteredArticles.map(article => (
                  <div key={article.id} className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedArticles.has(article.id)}
                          onChange={() => toggleSelectArticle(article.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{article.title}</h3>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{article.summary}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="bg-purple-600/20 px-2 py-1 rounded">{article.category}</span>
                            <span>👁️ {article.view_count} views</span>
                            <span>📅 {new Date(article.published_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditArticle(article)}
                          className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscribers Management */}
          {activeView === 'subscribers' && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold text-white">Subscriber Management</h2>
                    {selectedSubscribers.size > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition"
                      >
                        🗑️ Remove ({selectedSubscribers.size})
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="🔍 Search subscribers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                  />
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <h3 className="text-gray-400 text-sm mb-2">Active Subscribers</h3>
                  <p className="text-2xl font-bold text-white">{subscribers.filter(s => s.is_active).length}</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <h3 className="text-gray-400 text-sm mb-2">This Month</h3>
                  <p className="text-2xl font-bold text-green-400">+{Math.floor(Math.random() * 50) + 10}</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <h3 className="text-gray-400 text-sm mb-2">Engagement Rate</h3>
                  <p className="text-2xl font-bold text-blue-400">92%</p>
                </div>
              </div>

              {/* Subscribers List */}
              <div className="space-y-3">
                {filteredSubscribers.map(sub => (
                  <div key={sub.id} className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.has(sub.id)}
                          onChange={() => toggleSelectSubscriber(sub.id)}
                        />
                        <div>
                          <p className="text-white font-medium">{sub.email}</p>
                          <p className="text-xs text-gray-400">
                            Subscribed: {new Date(sub.subscribed_at).toLocaleDateString()} • 
                            Status: <span className={sub.is_active ? 'text-green-400' : 'text-red-400'}>
                              {sub.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSubscriber(sub.id)}
                        className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition"
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Performance Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-gray-300 mb-4">Article Performance</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Most Viewed</span>
                        <span className="text-white">AI Ethics Guide</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Avg. Read Time</span>
                        <span className="text-white">3.2 minutes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Click Rate</span>
                        <span className="text-green-400">24.5%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-gray-300 mb-4">Traffic Sources</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Direct</span>
                        <span className="text-white">45%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Social Media</span>
                        <span className="text-white">30%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Search</span>
                        <span className="text-white">25%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeView === 'settings' && (
            <div className="space-y-6">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Platform Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm">Site Name</label>
                    <input
                      type="text"
                      defaultValue="AI News Portal"
                      className="w-full mt-1 px-4 py-2 bg-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm">Admin Email</label>
                    <input
                      type="email"
                      defaultValue="admin@ainews.com"
                      className="w-full mt-1 px-4 py-2 bg-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm">Articles per Page</label>
                    <input
                      type="number"
                      defaultValue="12"
                      className="w-full mt-1 px-4 py-2 bg-white/10 rounded-lg text-white"
                    />
                  </div>
                  <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-medium hover:shadow-lg transition">
                    💾 Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
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