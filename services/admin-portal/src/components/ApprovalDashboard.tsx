'use client';
import { useState, useEffect } from 'react';

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
}

export default function ApprovalDashboard() {
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingArticles();
  }, []);

  const fetchPendingArticles = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/articles/pending`,
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
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/articles/${articleId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            auto_publish: autoPublish,
            scheduled_publish_at: autoPublish ? null : new Date(Date.now() + 30 * 60 * 1000).toISOString()
          })
        }
      );

      if (response.ok) {
        alert(autoPublish ? 'Article approved and published!' : 'Article approved for scheduling!');
        fetchPendingArticles();
      }
    } catch (error) {
      console.error('Error approving article:', error);
      alert('Error approving article');
    }
  };

  const handleReject = async (articleId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/articles/${articleId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer demo-admin-token'
          }
        }
      );

      if (response.ok) {
        alert('Article rejected');
        fetchPendingArticles();
      }
    } catch (error) {
      console.error('Error rejecting article:', error);
      alert('Error rejecting article');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending articles...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Pending Approval</h2>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {pendingArticles.length} articles
        </span>
      </div>

      {pendingArticles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No articles pending approval
        </div>
      ) : (
        <div className="space-y-4">
          {pendingArticles.map((article) => (
            <div key={article.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {article.source}
                    </span>
                    <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                      {article.category}
                    </span>
                    {article.validation_score && (
                      <span className="bg-green-100 px-2 py-1 rounded text-sm">
                        Quality: {article.validation_score}/10
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(article.created_at).toLocaleDateString()}
                </div>
              </div>

              <p className="text-gray-700 mb-4">{article.summary}</p>

              {article.ai_tags && article.ai_tags.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Tags: </span>
                  {article.ai_tags.map((tag, index) => (
                    <span key={index} className="bg-yellow-100 px-2 py-1 rounded text-sm mr-2">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <a 
                  href={article.original_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Original Article →
                </a>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(article.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(article.id, false)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Approve & Schedule
                  </button>
                  <button
                    onClick={() => handleApprove(article.id, true)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve & Publish Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
