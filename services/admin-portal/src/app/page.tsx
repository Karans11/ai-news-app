'use client';
import { useState, useEffect } from 'react';

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
  view_count: number;
  auto_generated: boolean;
  approval_status: string;
  status: string;
}

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
}

// Schedule Dialog Component
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

  const handleConfirm = () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }
    const scheduledDateTime = `${selectedDate}T${selectedTime}:00.000Z`;
    onConfirm(scheduledDateTime);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">Schedule Article</h3>
        <p className="text-gray-600 mb-4">Schedule "{articleTitle}" for later publication</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
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
            Schedule
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
      console.log('Fetching pending articles...');
      
      const response = await fetch(
        'https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles/pending',
        {
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );
      
      const data = await response.json();
      console.log('Pending articles response:', data);
      
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
        // Trigger stats refresh in parent
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
        alert(`Article scheduled for ${new Date(scheduledDateTime).toLocaleString()}!`);
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

// Articles List Component
function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-center py-8">Loading articles...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">All Articles</h2>
      
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{article.title}</div>
                        <div className="text-sm text-gray-500">{article.source}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      article.is_published 
                        ? 'bg-green-100 text-green-800'
                        : article.approval_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {article.is_published ? 'Published' : article.approval_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {article.view_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(article.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={article.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </a>
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

// Manual Article Creation Component
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://ai-news-api.skaybotlabs.workers.dev/api/admin/articles', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer demo-admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        alert('Article created and published successfully!');
        setFormData({ title: '', summary: '', original_url: '', category: '', source: '', image_url: '' });
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
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category</option>
              <option value="AI Models">AI Models</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Policy">Policy</option>
              <option value="Research">Research</option>
              <option value="Industry News">Industry News</option>
              <option value="Startups">Startups</option>
              <option value="AI Security">AI Security</option>
            </select>
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

// Main Dashboard Component
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchStats();
    
    // Listen for stats refresh events
    const handleStatsRefresh = () => {
      fetchStats();
    };
    
    window.addEventListener('refreshStats', handleStatsRefresh);
    return () => window.removeEventListener('refreshStats', handleStatsRefresh);
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤖 AI News Admin Portal</h1>
              <p className="text-gray-600 mt-1">Manage your AI news content and automation</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
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
                  onClick={() => setActiveTab('analytics')}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-center group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📈</div>
                  <div className="text-lg font-semibold text-gray-900">View Analytics</div>
                  <div className="text-gray-600 mt-1">Check performance metrics and trends</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approval' && <ApprovalDashboard />}
        {activeTab === 'articles' && <ArticlesList />}
        {activeTab === 'subscribers' && <SubscribersList />}
        {activeTab === 'create' && <CreateArticleForm onSuccess={() => { fetchStats(); setActiveTab('articles'); }} />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
}