'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (only on client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client only if we have the required environment variables
const supabase = typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// NTP Time utilities for IST with better error handling
const getNTPTime = async () => {
  // Try multiple time APIs for reliability
  const timeAPIs = [
    'https://worldtimeapi.org/api/timezone/Asia/Kolkata',
    'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata',
    'https://api.ipgeolocation.io/timezone?apiKey=free&tz=Asia/Kolkata'
  ];

  for (let i = 0; i < timeAPIs.length; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(timeAPIs[i], {
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Handle different API response formats
        const datetime = data.datetime || data.dateTime || data.date_time;
        if (datetime) {
          return new Date(datetime);
        }
      }
    } catch (error) {
      // Only log the error for the first API to reduce console noise
      if (i === 0) {
        console.warn('Primary time API unavailable, using fallback');
      }
      continue; // Try next API
    }
  }

  // Fallback to local time converted to IST
  console.info('Using local time converted to IST');
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5; // IST is UTC+5:30
  return new Date(utc + (istOffset * 3600000));
};

const formatISTTime = (date: Date) => {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Authentication Component with Supabase
function LoginForm({ onLogin }: { onLogin: (user: any) => void }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Configuration error: Supabase not initialized. Check environment variables.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Check if user has admin role in user_profiles table
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('email', credentials.email)
          .single();

        if (userError) {
          setError(`Role verification failed: ${userError.message}. This might be a database permissions issue.`);
          await supabase.auth.signOut();
        } else if (!userData) {
          setError('No user profile found. Please contact administrator.');
          await supabase.auth.signOut();
        } else if (userData?.role !== 'admin') {
          setError(`Access denied. Your role is: ${userData.role}. Admin role required.`);
          await supabase.auth.signOut();
        } else {
          onLogin(data.user);
        }
      }
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * {
          font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        }
      `}</style>
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold text-gray-900">AI News Admin Portal</h1>
          <p className="text-gray-600 mt-2">Sign in with your admin credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gmail Address
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your-email@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔐 Signing In...' : '🔓 Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Secure access to AI News management system
          </p>
        </div>
      </div>
    </div>
  );
}

// Interface definitions
interface Stats {
  totalArticles: number;
  totalSubscribers: number;
  totalViews: number;
  pendingApproval: number;
  lastUpdated: string;
}

interface PendingArticle {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  source: string;
  category: string;
  ai_tags: string[];
  validation_score: number;
  created_at: string;
  image_url?: string;
  n8n_workflow_id?: string;
  approval_status: string;
  auto_generated: boolean;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  source: string;
  category: string;
  is_published: boolean;
  created_at: string;
  published_at: string;
  scheduled_publish_at?: string;
  view_count: number;
  auto_generated: boolean;
  approval_status: string;
  status: string;
  image_url?: string;
}

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
}

// Edit Article Modal Component with Custom Categories
function EditArticleModal({ 
  isOpen, 
  onClose, 
  article, 
  onSave 
}: { 
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    original_url: '',
    category: '',
    source: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const defaultCategories = [
    'AI Models', 'Machine Learning', 'Policy', 'Research', 
    'Industry News', 'Startups', 'AI Security', 'AI Tools',
    'Computer Vision', 'Natural Language Processing', 'Robotics'
  ];

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        summary: article.summary || '',
        original_url: article.original_url || '',
        category: article.category || '',
        source: article.source || '',
        image_url: article.image_url || ''
      });
      
      // Check if category is custom (not in default list)
      if (article.category && !defaultCategories.includes(article.category)) {
        setShowCustomCategory(true);
        setCustomCategory(article.category);
        setFormData(prev => ({ ...prev, category: 'custom' }));
      }
    }
  }, [article]);

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: value });
    } else if (value === 'add-new') {
      setShowCustomCategory(true);
      setCustomCategory('');
      setFormData({ ...formData, category: 'custom' });
    } else {
      setShowCustomCategory(false);
      setCustomCategory('');
      setFormData({ ...formData, category: value });
    }
  };

  const handleSave = async () => {
    if (!article) return;
    
    const finalCategory = formData.category === 'custom' ? customCategory : formData.category;
    
    if (!finalCategory) {
      alert('Please select or enter a category');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/${article.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            category: finalCategory
          })
        }
      );

      if (response.ok) {
        alert('Article updated successfully!');
        onSave();
        onClose();
      } else {
        alert('Error updating article');
      }
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Error updating article');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Edit Article</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original URL</label>
              <input
                type="url"
                value={formData.original_url}
                onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {defaultCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="add-new">➕ Create New Category</option>
              </select>
              
              {showCustomCategory && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., TechCrunch, OpenAI Blog"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  articleTitle 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  articleTitle: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4 text-red-600">⚠️ Delete Article</h3>
        <p className="text-gray-700 mb-4">
          Are you sure you want to delete this article?
        </p>
        <p className="font-semibold text-gray-900 mb-6">
          "{articleTitle}"
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-red-800 text-sm">
            <strong>Warning:</strong> This action cannot be undone. The article will be permanently deleted.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            🗑️ Delete Article
          </button>
        </div>
      </div>
    </div>
  );
}

// Schedule Dialog Component with NTP Time
function ScheduleDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  articleTitle 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateTime: string) => void;
  articleTitle: string;
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [currentISTTime, setCurrentISTTime] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Update IST time when dialog opens
      const updateTime = async () => {
        const ntpTime = await getNTPTime();
        setCurrentISTTime(formatISTTime(ntpTime));
        
        // Set minimum date to current IST date
        const istDate = ntpTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        setSelectedDate(istDate);
      };
      updateTime();

      // Update time every second while dialog is open
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }
    
    // Create the scheduled time properly in IST
    const istDateTime = `${selectedDate}T${selectedTime}:00`;
    
    // Convert IST to UTC for storage
    // IST is UTC+5:30, so we subtract 5.5 hours to get UTC
    const istDate = new Date(istDateTime);
    const utcDateTime = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    const scheduledDateTime = utcDateTime.toISOString();
    
    onConfirm(scheduledDateTime);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">📅 Schedule Article</h3>
        <p className="text-gray-600 mb-4">Schedule "{articleTitle}" for later publication</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-sm">
            <strong>🕐 Current IST Time:</strong> {currentISTTime}
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date (IST)</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time (IST)</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📅 Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// Approval Dashboard Component
function ApprovalDashboard() {
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState<{
    isOpen: boolean;
    articleId: string;
    articleTitle: string;
  }>({
    isOpen: false,
    articleId: '',
    articleTitle: ''
  });

  useEffect(() => {
    fetchPendingArticles();
  }, []);

  const fetchPendingArticles = async () => {
    try {
      const response = await fetch(
        'https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/pending',
        {
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setPendingArticles(data.data);
      }
    } catch (error) {
      console.error('Error fetching pending articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (articleId: string, autoPublish: boolean = false) => {
    setProcessingId(articleId);
    try {
      const requestBody = {
        auto_publish: autoPublish,
        scheduled_publish_at: autoPublish ? null : new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };
      
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/${articleId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert(autoPublish ? 'Article approved and published!' : 'Article approved for scheduling!');
        await fetchPendingArticles();
        window.dispatchEvent(new CustomEvent('refreshStats'));
      } else {
        alert(`Error approving article: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving article:', error);
      alert('Error approving article: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSchedule = (articleId: string, articleTitle: string) => {
    setScheduleDialog({
      isOpen: true,
      articleId,
      articleTitle
    });
  };

  const handleScheduleConfirm = async (scheduledDateTime: string) => {
    const { articleId } = scheduleDialog;
    setProcessingId(articleId);
    
    try {
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/${articleId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            auto_publish: false,
            scheduled_publish_at: scheduledDateTime
          })
        }
      );

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        // Convert UTC back to IST for display
        const utcDate = new Date(scheduledDateTime);
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
        const istDisplayTime = istDate.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        alert(`Article scheduled for ${istDisplayTime} IST!`);
        await fetchPendingArticles();
        window.dispatchEvent(new CustomEvent('refreshStats'));
      } else {
        alert(`Error scheduling article: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error scheduling article:', error);
      alert('Error scheduling article: ' + error.message);
    } finally {
      setProcessingId(null);
      setScheduleDialog({ isOpen: false, articleId: '', articleTitle: '' });
    }
  };

  const handleReject = async (articleId: string) => {
    setProcessingId(articleId);
    try {
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/${articleId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert('Article rejected');
        await fetchPendingArticles();
        window.dispatchEvent(new CustomEvent('refreshStats'));
      } else {
        alert(`Error rejecting article: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error rejecting article:', error);
      alert('Error rejecting article: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading pending articles...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pending Approval</h2>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {pendingArticles.length} articles
            </span>
            <button
              onClick={fetchPendingArticles}
              className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {pendingArticles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles pending approval</h3>
            <p className="text-gray-500">New AI-generated articles will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingArticles.map((article) => (
              <div key={article.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-xl mb-3 text-gray-900 leading-tight">
                      {article.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                        📡 {article.source}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        🏷️ {article.category}
                      </span>
                      {article.validation_score && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          ⭐ Quality: {article.validation_score}/10
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 ml-4">
                    {new Date(article.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800 leading-relaxed">{article.summary}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <a 
                    href={article.original_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                  >
                    📖 View Original →
                  </a>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(article.id)}
                      disabled={processingId === article.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      {processingId === article.id ? '⏳' : '❌'} Reject
                    </button>
                    <button
                      onClick={() => handleSchedule(article.id, article.title)}
                      disabled={processingId === article.id}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      📅 Schedule
                    </button>
                    <button
                      onClick={() => handleApprove(article.id, true)}
                      disabled={processingId === article.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      {processingId === article.id ? '⏳' : '🚀'} Publish Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScheduleDialog
        isOpen={scheduleDialog.isOpen}
        onClose={() => setScheduleDialog({ isOpen: false, articleId: '', articleTitle: '' })}
        onConfirm={handleScheduleConfirm}
        articleTitle={scheduleDialog.articleTitle}
      />
    </>
  );
}

// Enhanced Articles List Component with Schedule Management
function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    article: Article | null;
  }>({
    isOpen: false,
    article: null
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    article: Article | null;
  }>({
    isOpen: false,
    article: null
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(
        'https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles',
        {
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );
      
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

  const handleEdit = (article: Article) => {
    setEditModal({
      isOpen: true,
      article: article
    });
  };

  const handleDelete = (article: Article) => {
    setDeleteModal({
      isOpen: true,
      article: article
    });
  };

  const handleManualPublish = async (article: Article) => {
    if (confirm(`Are you sure you want to publish "${article.title}" immediately? This will override any scheduled time.`)) {
      try {
        const response = await fetch(
          `https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/${article.id}/publish`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer demo-admin-token',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              override_schedule: true
            })
          }
        );

        if (response.ok) {
          alert('Article published successfully!');
          await fetchArticles();
          window.dispatchEvent(new CustomEvent('refreshStats'));
        } else {
          alert('Error publishing article');
        }
      } catch (error) {
        console.error('Error publishing article:', error);
        alert('Error publishing article');
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.article) return;

    try {
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/${deleteModal.article.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );

      if (response.ok) {
        alert('Article deleted successfully!');
        await fetchArticles();
        window.dispatchEvent(new CustomEvent('refreshStats'));
      } else {
        alert('Error deleting article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article');
    } finally {
      setDeleteModal({ isOpen: false, article: null });
    }
  };

  const formatScheduledTime = (scheduledTime: string) => {
    if (!scheduledTime) return null;
    
    const utcDate = new Date(scheduledTime);
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    
    return istDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusInfo = (article: Article) => {
    if (article.is_published) {
      return { text: 'Published', color: 'bg-green-100 text-green-800' };
    } else if (article.scheduled_publish_at) {
      const scheduledTime = formatScheduledTime(article.scheduled_publish_at);
      return { 
        text: 'Scheduled', 
        color: 'bg-blue-100 text-blue-800',
        subtitle: `For: ${scheduledTime} IST`
      };
    } else if (article.approval_status === 'pending') {
      return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'Draft', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading articles...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Articles</h2>
          <button
            onClick={fetchArticles}
            className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
        
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-500">Articles will appear here once created.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => {
                  const statusInfo = getStatusInfo(article);
                  return (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {article.title}
                            </div>
                            <div className="text-sm text-gray-500">{article.source}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                          {statusInfo.subtitle && (
                            <div className="text-xs text-gray-500 mt-1">
                              {statusInfo.subtitle}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.view_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(article.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {/* Manual Publish button for scheduled articles */}
                          {!article.is_published && article.scheduled_publish_at && (
                            <button
                              onClick={() => handleManualPublish(article)}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors text-xs"
                              title="Publish immediately (override schedule)"
                            >
                              🚀 Publish Now
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleEdit(article)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(article)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                          <a
                            href={article.original_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            👁️ View
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditArticleModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, article: null })}
        article={editModal.article}
        onSave={fetchArticles}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, article: null })}
        onConfirm={confirmDelete}
        articleTitle={deleteModal.article?.title || ''}
      />
    </>
  );
}

// Subscribers List Component
function SubscribersList() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const response = await fetch(
        'https://ai-news-api.skaybotlabs.workers.dev/api/admin/subscribers',
        {
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setSubscribers(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading subscribers...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Subscribers</h2>
      
      {subscribers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscribers yet</h3>
          <p className="text-gray-500">Subscribers will appear here when people sign up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {subscriber.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subscriber.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {subscriber.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(subscriber.subscribed_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Category Management Component
function CategoryManagement() {
  const [categories, setCategories] = useState<{name: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        'https://ai-news-api.skaybotlabs.workers.dev/api/admin/categories',
        {
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (categoryName: string) => {
    setEditingCategory({ old: categoryName, new: categoryName });
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.new.trim()) {
      alert('Category name cannot be empty');
      return;
    }

    if (editingCategory.old === editingCategory.new.trim()) {
      setEditingCategory(null);
      return;
    }

    try {
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/categories/${encodeURIComponent(editingCategory.old)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_name: editingCategory.new.trim()
          })
        }
      );

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert(`Category renamed from "${editingCategory.old}" to "${editingCategory.new}"`);
        setEditingCategory(null);
        await fetchCategories();
        window.dispatchEvent(new CustomEvent('refreshStats'));
      } else {
        alert(`Error renaming category: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error renaming category:', error);
      alert('Error renaming category');
    }
  };

  const handleDeleteCategory = async (categoryName: string, articleCount: number) => {
    if (articleCount > 0) {
      const confirmMessage = `Warning: "${categoryName}" is used by ${articleCount} article(s). Deleting this category will set those articles to "Uncategorized". Do you want to continue?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
        return;
      }
    }

    try {
      const response = await fetch(
        `https://ai-news-api.skaybotlabs.workers.dev/api/admin/categories/${encodeURIComponent(categoryName)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert(`Category "${categoryName}" deleted successfully`);
        await fetchCategories();
        window.dispatchEvent(new CustomEvent('refreshStats'));
      } else {
        alert(`Error deleting category: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Category name cannot be empty');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      alert('Category already exists');
      return;
    }

    try {
      const response = await fetch(
        'https://ai-news-api.skaybotlabs.workers.dev/api/admin/categories',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newCategoryName.trim()
          })
        }
      );

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert(`Category "${newCategoryName}" created successfully`);
        setNewCategoryName('');
        await fetchCategories();
      } else {
        alert(`Error creating category: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Category */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Add New Category</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter new category name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            ➕ Add Category
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Manage Categories</h2>
          <button
            onClick={fetchCategories}
            className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
        
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏷️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-500">Categories will appear here once articles are created.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Articles Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.old === category.name ? (
                        <input
                          type="text"
                          value={editingCategory.new}
                          onChange={(e) => setEditingCategory({
                            ...editingCategory,
                            new: e.target.value
                          })}
                          className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">{category.count}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {category.count === 1 ? 'article' : 'articles'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.count > 0 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.count > 0 ? 'In Use' : 'Unused'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingCategory?.old === category.name ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                          >
                            ✅ Save
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditCategory(category.name)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.name, category.count)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600 text-xl">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Category Management Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Editing:</strong> Click "Edit" to rename a category. This will update all articles using that category.</li>
                <li><strong>Deleting:</strong> Unused categories can be deleted safely. Used categories will move articles to "Uncategorized".</li>
                <li><strong>Adding:</strong> New categories are available immediately in article creation/editing forms.</li>
                <li><strong>Best Practice:</strong> Keep category names short and descriptive for better organization.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics Component
function Analytics() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Analytics Overview</h2>
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
          <p className="text-gray-500">Detailed analytics and insights will be available soon.</p>
        </div>
      </div>
    </div>
  );
}
function CreateArticleForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    original_url: '',
    category: '',
    source: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const defaultCategories = [
    'AI Models', 'Machine Learning', 'Policy', 'Research', 
    'Industry News', 'Startups', 'AI Security', 'AI Tools',
    'Computer Vision', 'Natural Language Processing', 'Robotics'
  ];

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: value });
    } else if (value === 'add-new') {
      setShowCustomCategory(true);
      setCustomCategory('');
      setFormData({ ...formData, category: 'custom' });
    } else {
      setShowCustomCategory(false);
      setCustomCategory('');
      setFormData({ ...formData, category: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCategory = formData.category === 'custom' ? customCategory : formData.category;
    
    if (!finalCategory) {
      alert('Please select or enter a category');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer demo-admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          category: finalCategory
        })
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert('Article created and published successfully!');
        setFormData({ title: '', summary: '', original_url: '', category: '', source: '', image_url: '' });
        setShowCustomCategory(false);
        setCustomCategory('');
        onSuccess();
      } else {
        alert(`Error creating article: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating article:', error);
      alert('Error creating article: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Article</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original URL</label>
            <input
              type="url"
              value={formData.original_url}
              onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Category</option>
              {defaultCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="add-new">➕ Create New Category</option>
            </select>
            
            {showCustomCategory && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                required
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., TechCrunch, OpenAI Blog"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? '⏳ Creating...' : '🚀 Create & Publish Article'}
        </button>
      </form>
    </div>
  );
}

// Main Dashboard Component with Supabase Authentication
export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Only run on client-side when supabase is available
    if (typeof window === 'undefined' || !supabase) return;

    // Check for existing session on load
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Verify admin role in user_profiles table
          const { data: userData } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('email', session.user.email)
            .single();

          if (userData?.role === 'admin') {
            setUser(session.user);
          } else {
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Update IST time every second
    const updateTime = async () => {
      const ntpTime = await getNTPTime();
      setCurrentTime(formatISTTime(ntpTime));
    };
    
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);
    
    if (user) {
      fetchStats();
      
      // Listen for stats refresh events
      const handleStatsRefresh = () => {
        fetchStats();
      };
      
      window.addEventListener('refreshStats', handleStatsRefresh);
      return () => {
        window.removeEventListener('refreshStats', handleStatsRefresh);
        clearInterval(timeInterval);
      };
    }

    return () => clearInterval(timeInterval);
  }, [user]);

  const checkSession = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Verify admin role in user_profiles table
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('email', session.user.email)
        .single();

      if (userData?.role === 'admin') {
        setUser(session.user);
      } else {
        await supabase.auth.signOut();
      }
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('https://ai-news-api.skaybotlabs.workers.dev/api/admin/stats', {
        headers: {
          'Authorization': 'Bearer demo-admin-token'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogin = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setStats(null);
    setActiveTab('dashboard');
  };

  // Show login form if not authenticated
  if (!user && !loading) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          * {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
          }
        `}</style>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * {
          font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤖 AI News Admin Portal</h1>
              <p className="text-gray-600 mt-1">Manage your AI news content and automation</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <span>🕐 IST Time:</span>
                  <span className="font-mono font-medium">{currentTime}</span>
                </div>
                <div className="text-xs mt-1">
                  Logged in as: {user?.email} | Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                🚪 Logout
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="mt-6">
            <div className="flex space-x-1 flex-wrap">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: '📊' },
                { id: 'approval', name: 'Pending Approval', icon: '✋', badge: stats?.pendingApproval },
                { id: 'articles', name: 'All Articles', icon: '📄' },
                { id: 'subscribers', name: 'Subscribers', icon: '👥' },
                { id: 'create', name: 'Create Article', icon: '✍️' },
                { id: 'categories', name: 'Categories', icon: '🏷️' },
                { id: 'analytics', name: 'Analytics', icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                  {tab.badge && tab.badge > 0 && (
                    <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { 
                  title: 'Total Articles', 
                  value: stats?.totalArticles || 0, 
                  icon: '📰', 
                  color: 'blue',
                  onClick: () => setActiveTab('articles')
                },
                { 
                  title: 'Subscribers', 
                  value: stats?.totalSubscribers || 0, 
                  icon: '👥', 
                  color: 'green',
                  onClick: () => setActiveTab('subscribers')
                },
                { 
                  title: 'Total Views', 
                  value: stats?.totalViews || 0, 
                  icon: '👁️', 
                  color: 'purple',
                  onClick: () => setActiveTab('analytics')
                },
                { 
                  title: 'Pending Approval', 
                  value: stats?.pendingApproval || 0, 
                  icon: '⏳', 
                  color: 'orange',
                  onClick: () => setActiveTab('approval')
                }
              ].map((stat, index) => (
                <button
                  key={index}
                  onClick={stat.onClick}
                  className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-all text-left w-full"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-600">{stat.title}</h3>
                      <p className={`text-3xl font-bold text-${stat.color}-600 mt-2`}>
                        {stat.value.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-4xl opacity-20">{stat.icon}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6 text-gray-900">⚡ Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => setActiveTab('approval')}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✋</div>
                  <div className="text-lg font-semibold text-gray-900">Review Pending Articles</div>
                  <div className="text-gray-600 mt-1">Check AI-generated content for approval</div>
                  {stats?.pendingApproval > 0 && (
                    <div className="mt-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium inline-block">
                      {stats.pendingApproval} waiting
                    </div>
                  )}
                </button>
                
                <button 
                  onClick={() => setActiveTab('create')}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-center group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✍️</div>
                  <div className="text-lg font-semibold text-gray-900">Create Manual Article</div>
                  <div className="text-gray-600 mt-1">Add article manually and publish immediately</div>
                </button>
                
                <button 
                  onClick={() => setActiveTab('articles')}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-center group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✏️</div>
                  <div className="text-lg font-semibold text-gray-900">Manage Articles</div>
                  <div className="text-gray-600 mt-1">Edit, delete, and organize existing articles</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approval' && <ApprovalDashboard />}
        {activeTab === 'articles' && <ArticlesList />}
        {activeTab === 'subscribers' && <SubscribersList />}
        {activeTab === 'create' && <CreateArticleForm onSuccess={() => { fetchStats(); setActiveTab('articles'); }} />}
        {activeTab === 'categories' && <CategoryManagement />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
}