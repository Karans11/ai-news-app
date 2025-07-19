// Complete Cloudflare Worker API Gateway - AI News App
// Replaces your Express.js server with all endpoints
import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env, ctx) {
    // Initialize Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Helper function for JSON responses
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    };

    // Helper function for error responses
    const errorResponse = (message, status = 500) => {
      console.error('API Error:', message);
      return jsonResponse({ success: false, error: message }, status);
    };

    try {
      // ==================== PUBLIC ENDPOINTS ====================

      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          environment: 'Cloudflare Workers'
        });
      }

      // GET /api/articles - Get all published articles
      if (path === '/api/articles' && method === 'GET') {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false });

        if (error) throw error;
        return jsonResponse({ success: true, data: data || [] });
      }

      // GET /api/articles/:id - Get single article and increment view count
      if (path.startsWith('/api/articles/') && method === 'GET' && !path.includes('/admin/')) {
        const id = path.split('/').pop();
        
        // Get article
        const { data: article, error: fetchError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        
        // Increment view count
        const { error: updateError } = await supabase
          .from('articles')
          .update({ view_count: (article.view_count || 0) + 1 })
          .eq('id', id);
        
        if (updateError) {
          console.error('Error updating view count:', updateError);
        }

        return jsonResponse({ success: true, data: article });
      }

      // POST /api/subscribe - Newsletter subscription
      if (path === '/api/subscribe' && method === 'POST') {
        const body = await request.json();
        const { email } = body;
        
        if (!email) {
          return errorResponse('Email required', 400);
        }

        const { error } = await supabase
          .from('subscribers')
          .insert({ email });

        if (error) {
          if (error.code === '23505') { // Duplicate email
            return errorResponse('Already subscribed', 400);
          }
          throw error;
        }

        return jsonResponse({ success: true, message: 'Successfully subscribed' });
      }

      // POST /api/auth/login - Admin login
      if (path === '/api/auth/login' && method === 'POST') {
        const body = await request.json();
        const { email, password } = body;
        
        // Check credentials
        if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
          return jsonResponse({ 
            success: true, 
            token: 'demo-admin-token',
            user: { email, role: 'admin' }
          });
        } else {
          return errorResponse('Invalid credentials', 401);
        }
      }

      // ==================== ADMIN ENDPOINTS ====================
      // All admin endpoints require authentication

      // Authentication check for admin routes
      if (path.startsWith('/api/admin/')) {
        const authHeader = request.headers.get('Authorization');
        const isAuthenticated = authHeader === 'Bearer demo-admin-token';

        if (!isAuthenticated) {
          return errorResponse('Unauthorized', 401);
        }

        // GET /api/admin/stats - Get dashboard statistics
        if (path === '/api/admin/stats' && method === 'GET') {
          console.log('Fetching admin stats...');
          
          const [articlesResult, subscribersResult, viewsResult] = await Promise.all([
            supabase.from('articles').select('*', { count: 'exact', head: true }),
            supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('articles').select('view_count')
          ]);

          const viewSum = viewsResult.data?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0;

          const responseData = {
            success: true,
            data: {
              totalArticles: articlesResult.count || 0,
              totalSubscribers: subscribersResult.count || 0,
              totalViews: viewSum,
              lastUpdated: new Date().toISOString()
            }
          };

          console.log('Sending stats response:', responseData);
          return jsonResponse(responseData);
        }

        // GET /api/admin/articles - Get all articles for admin
        if (path === '/api/admin/articles' && method === 'GET') {
          const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ success: true, data: data || [] });
        }

        // POST /api/admin/articles - Create new article
        if (path === '/api/admin/articles' && method === 'POST') {
          const body = await request.json();
          const { title, summary, original_url, category, image_url, source } = body;
          
          const { data, error } = await supabase
            .from('articles')
            .insert({
              title,
              summary,
              original_url,
              category,
              image_url,
              source,
              published_at: new Date().toISOString(),
              is_published: true
            })
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data });
        }

        // PUT /api/admin/articles/:id - Update article
        if (path.startsWith('/api/admin/articles/') && method === 'PUT') {
          const id = path.split('/').pop();
          const body = await request.json();
          const { title, summary, original_url, category, image_url, source } = body;
          
          const { data, error } = await supabase
            .from('articles')
            .update({
              title,
              summary,
              original_url,
              category,
              image_url,
              source,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data });
        }

        // DELETE /api/admin/articles/:id - Delete article
        if (path.startsWith('/api/admin/articles/') && method === 'DELETE') {
          const id = path.split('/').pop();
          
          const { error } = await supabase
            .from('articles')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return jsonResponse({ success: true, message: 'Article deleted successfully' });
        }

        // GET /api/admin/subscribers - Get all subscribers
        if (path === '/api/admin/subscribers' && method === 'GET') {
          const { data, error } = await supabase
            .from('subscribers')
            .select('*')
            .order('subscribed_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ success: true, data: data || [] });
        }

        // DELETE /api/admin/subscribers/:id - Delete subscriber
        if (path.startsWith('/api/admin/subscribers/') && method === 'DELETE') {
          const id = path.split('/').pop();
          
          const { error } = await supabase
            .from('subscribers')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return jsonResponse({ success: true, message: 'Subscriber removed successfully' });
        }
      }

      // ==================== 404 HANDLER ====================
      return jsonResponse({ success: false, error: 'Route not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }, 500);
    }
  }
};