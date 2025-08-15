'use client';
import { useState, useEffect } from 'react';

export default function WeeklyArticlesManager() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    topic_category: '',
    featured_image_url: '',
    reading_time_minutes: 10,
    publish_date: '',
    week_number: 1,
    year: new Date().getFullYear(),
    tags: '',
    author_name: 'NineT Editorial Team'
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-news-api.skaybotlabs.workers.dev';

  const TOPIC_CATEGORIES = [
    'AI Breakthroughs',
    'Industry Analysis', 
    'Technology Trends',
    'Research Deep Dive',
    'Policy & Ethics',
    'Startup Spotlight',
    'Future Predictions'
  ];

  useEffect(() => {
    fetchWeeklyArticles();
  }, []);

  const fetchWeeklyArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/weekly-articles`, {
        headers: {
          'Authorization': 'Bearer demo-admin-token'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        reading_time_minutes: Number(formData.reading_time_minutes),
        week_number: Number(formData.week_number),
        year: Number(formData.year)
      };

      const url = editingArticle 
        ? `${API_URL}/api/admin/weekly-articles/${editingArticle.id}`
        : `${API_URL}/api/admin/weekly-articles`;
      
      const method = editingArticle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-admin-token'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await fetchWeeklyArticles();
        resetForm();
        alert(editingArticle ? 'Breakdown article updated successfully!' : 'Breakdown article created successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      summary: '',
      topic_category: '',
      featured_image_url: '',
      reading_time_minutes: 10,
      publish_date: '',
      week_number: 1,
      year: new Date().getFullYear(),
      tags: '',
      author_name: 'NineT Editorial Team'
    });
    setEditingArticle(null);
    setShowCreateForm(false);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      summary: article.summary,
      topic_category: article.topic_category,
      featured_image_url: article.featured_image_url || '',
      reading_time_minutes: article.reading_time_minutes,
      publish_date: article.publish_date,
      week_number: article.week_number,
      year: article.year,
      tags: article.tags.join(', '),
      author_name: article.author_name
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this breakdown article?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/weekly-articles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer demo-admin-token'
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchWeeklyArticles();
        alert('Breakdown article deleted successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
    }
  };

  const togglePublishStatus = async (article) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/weekly-articles/${article.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-admin-token'
        },
        body: JSON.stringify({
          is_published: !article.is_published
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchWeeklyArticles();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      alert('Failed to update publish status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">The Breakdown</h1>
          <p className="text-gray-600 mt-2">Manage in-depth weekly content</p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Create Breakdown Article
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {editingArticle ? 'Edit Breakdown Article' : 'Create New Breakdown Article'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Topic Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic Category *
                </label>
                <select
                  value={formData.topic_category}
                  onChange={(e) => setFormData({...formData, topic_category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {TOPIC_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Reading Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.reading_time_minutes}
                  onChange={(e) => setFormData({...formData, reading_time_minutes: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="60"
                />
              </div>

              {/* Week Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Number
                </label>
                <input
                  type="number"
                  value={formData.week_number}
                  onChange={(e) => setFormData({...formData, week_number: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="52"
                />
              </div>

              {/* Publish Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publish Date
                </label>
                <input
                  type="date"
                  value={formData.publish_date}
                  onChange={(e) => setFormData({...formData, publish_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Summary */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary *
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({...formData, summary: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              {/* Content */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={15}
                  required
                  placeholder="Write your detailed breakdown article content here..."
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                {editingArticle ? 'Update Article' : 'Create Article'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Articles List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">The Breakdown Articles ({articles.length})</h2>
          
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No breakdown articles yet</h3>
              <p className="text-gray-500">Create your first breakdown article to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {article.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {article.reading_time_minutes} min read
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {article.topic_category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Week {article.week_number}, {article.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          article.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {article.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(article)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => togglePublishStatus(article)}
                          className={`${
                            article.is_published 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {article.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
