// Complete Cloudflare Worker API Gateway - AI News App with Enhanced Debug Logging
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-n8n-webhook-secret',
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

      // Root endpoint - API information
      if (path === '/' && method === 'GET') {
        return jsonResponse({
          success: true,
          message: 'AI News API is running',
          version: '1.0.0',
          endpoints: {
            health: '/health',
            articles: '/api/articles',
            subscribe: '/api/subscribe',
            admin_login: '/api/auth/login',
            admin_stats: '/api/admin/stats'
          },
          documentation: 'https://your-docs-url.com',
          timestamp: new Date().toISOString()
        });
      }

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

      // GET /api/articles/:id - Get single article
      if (path.startsWith('/api/articles/') && method === 'GET' && !path.includes('/admin/')) {
        const id = path.split('/').pop();
        
        // Increment view count
        await supabase.rpc('increment_view_count', { article_id: id });
        
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .single();

        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      // POST /api/subscribe - Subscribe to newsletter
      if (path === '/api/subscribe' && method === 'POST') {
        const body = await request.json();
        const { email } = body;
        
        if (!email) {
          return errorResponse('Email is required', 400);
        }
        
        const { data, error } = await supabase
          .from('subscribers')
          .insert({ email })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            return errorResponse('Email already subscribed', 409);
          }
          throw error;
        }
        
        return jsonResponse({ success: true, message: 'Subscribed successfully' });
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
          
          const [articlesResult, subscribersResult, viewsResult, pendingResult] = await Promise.all([
            supabase.from('articles').select('*', { count: 'exact', head: true }),
            supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('articles').select('view_count'),
            supabase.from('articles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending')
          ]);

          const viewSum = viewsResult.data?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0;

          const responseData = {
            success: true,
            data: {
              totalArticles: articlesResult.count || 0,
              totalSubscribers: subscribersResult.count || 0,
              totalViews: viewSum,
              pendingApproval: pendingResult.count || 0,
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
              is_published: true,
              auto_generated: false,
              approval_status: 'approved',
              status: 'published'
            })
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data });
        }

        // PUT /api/admin/articles/:id - Update article
        if (path.startsWith('/api/admin/articles/') && method === 'PUT' && !path.includes('/approve') && !path.includes('/reject')) {
          const id = path.split('/')[4];
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
          const id = path.split('/')[4];
          
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
          const id = path.split('/')[4];
          
          const { error } = await supabase
            .from('subscribers')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return jsonResponse({ success: true, message: 'Subscriber deleted successfully' });
        }

        // ==================== ENHANCED APPROVE/REJECT ENDPOINTS WITH DEBUG LOGGING ====================
        
        // GET /api/admin/articles/pending - Get articles pending approval
        if (path === '/api/admin/articles/pending' && method === 'GET') {
          console.log('Fetching pending articles...');
          
          const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('approval_status', 'pending')
            .eq('auto_generated', true)
            .order('created_at', { ascending: false });

          console.log('Pending articles query result - error:', error, 'count:', data?.length);

          if (error) throw error;
          return jsonResponse({ success: true, data: data || [] });
        }

        // POST /api/admin/articles/:id/approve - Approve an article (ENHANCED WITH DEBUG)
        if (path.match(/^\/api\/admin\/articles\/[^\/]+\/approve$/) && method === 'POST') {
          console.log('=== APPROVE ENDPOINT DEBUG START ===');
          console.log('Full path:', path);
          console.log('Method:', method);
          console.log('Headers:', Object.fromEntries(request.headers.entries()));
          
          const articleId = path.split('/')[4];
          console.log('Extracted article ID:', articleId);
          
          let body;
          try {
            body = await request.json();
            console.log('Request body:', body);
          } catch (e) {
            console.error('Failed to parse JSON body:', e);
            return errorResponse('Invalid JSON in request body', 400);
          }
          
          const { scheduled_publish_at, auto_publish } = body;
          console.log('Parsed values - scheduled_publish_at:', scheduled_publish_at, 'auto_publish:', auto_publish);

          try {
            // First, check if the article exists
            console.log('Checking if article exists...');
            const { data: existingArticle, error: fetchError } = await supabase
              .from('articles')
              .select('*')
              .eq('id', articleId)
              .single();

            console.log('Article fetch result - error:', fetchError, 'data exists:', !!existingArticle);
            
            if (fetchError) {
              console.error('Article not found:', fetchError);
              return errorResponse(`Article not found: ${fetchError.message}`, 404);
            }

            // Prepare update data
            const updateData = {
              approval_status: 'approved',
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            if (scheduled_publish_at) {
              updateData.scheduled_publish_at = scheduled_publish_at;
              updateData.status = 'scheduled';
              console.log('Article will be scheduled for:', scheduled_publish_at);
            }

            if (auto_publish) {
              updateData.is_published = true;
              updateData.status = 'published';
              updateData.published_at = new Date().toISOString();
              console.log('Article will be published immediately');
            }

            console.log('Update data to be applied:', updateData);

            const { data, error } = await supabase
              .from('articles')
              .update(updateData)
              .eq('id', articleId)
              .select()
              .single();

            console.log('Supabase update result - error:', error, 'data:', data);

            if (error) {
              console.error('Supabase error details:', error);
              return errorResponse(`Database error: ${error.message}`, 500);
            }
            
            console.log('Article approved successfully:', data?.id);
            console.log('=== APPROVE ENDPOINT DEBUG END ===');
            return jsonResponse({ success: true, data });
            
          } catch (updateError) {
            console.error('Update operation failed:', updateError);
            console.log('=== APPROVE ENDPOINT DEBUG END (ERROR) ===');
            return errorResponse(`Update failed: ${updateError.message}`, 500);
          }
        }

        // POST /api/admin/articles/:id/reject - Reject an article (ENHANCED WITH DEBUG)
        if (path.match(/^\/api\/admin\/articles\/[^\/]+\/reject$/) && method === 'POST') {
          console.log('=== REJECT ENDPOINT DEBUG START ===');
          console.log('Full path:', path);
          console.log('Method:', method);
          
          const articleId = path.split('/')[4];
          console.log('Extracted article ID:', articleId);

          try {
            // First, check if the article exists
            console.log('Checking if article exists...');
            const { data: existingArticle, error: fetchError } = await supabase
              .from('articles')
              .select('*')
              .eq('id', articleId)
              .single();

            console.log('Article fetch result - error:', fetchError, 'data exists:', !!existingArticle);
            
            if (fetchError) {
              console.error('Article not found:', fetchError);
              return errorResponse(`Article not found: ${fetchError.message}`, 404);
            }

            const updateData = {
              approval_status: 'rejected',
              status: 'rejected',
              updated_at: new Date().toISOString()
            };

            console.log('Update data to be applied:', updateData);

            const { data, error } = await supabase
              .from('articles')
              .update(updateData)
              .eq('id', articleId)
              .select()
              .single();

            console.log('Supabase update result - error:', error, 'data:', data);

            if (error) {
              console.error('Supabase error details:', error);
              return errorResponse(`Database error: ${error.message}`, 500);
            }
            
            console.log('Article rejected successfully:', data?.id);
            console.log('=== REJECT ENDPOINT DEBUG END ===');
            return jsonResponse({ success: true, data });
            
          } catch (updateError) {
            console.error('Reject operation failed:', updateError);
            console.log('=== REJECT ENDPOINT DEBUG END (ERROR) ===');
            return errorResponse(`Reject failed: ${updateError.message}`, 500);
          }
        }

        // GET /api/admin/automation/settings - Get automation settings
        if (path === '/api/admin/automation/settings' && method === 'GET') {
          const { data, error } = await supabase
            .from('automation_settings')
            .select('*');

          if (error) throw error;
          
          // Convert to key-value object
          const settings = {};
          data.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
          });

          return jsonResponse({ success: true, data: settings });
        }

        // PUT /api/admin/automation/settings - Update automation settings
        if (path === '/api/admin/automation/settings' && method === 'PUT') {
          const body = await request.json();
          const updates = [];

          for (const [key, value] of Object.entries(body)) {
            updates.push(
              supabase
                .from('automation_settings')
                .upsert({
                  setting_key: key,
                  setting_value: value,
                  updated_at: new Date().toISOString()
                })
            );
          }

          await Promise.all(updates);
          return jsonResponse({ success: true, message: 'Settings updated' });
        }

        // GET /api/admin/test - Simple test endpoint for debugging
        if (path === '/api/admin/test' && method === 'GET') {
          return jsonResponse({ 
            success: true, 
            message: 'Admin API is working',
            timestamp: new Date().toISOString(),
            supabase_connected: !!supabase
          });
        }
      }

      // ==================== N8N WEBHOOK ENDPOINTS ====================
      
      // POST /api/n8n/webhook/article - Receive articles from n8n
      if (path === '/api/n8n/webhook/article' && method === 'POST') {
        console.log('N8N webhook received');
        
        // Verify webhook secret
        const webhookSecret = request.headers.get('x-n8n-webhook-secret');
        if (webhookSecret !== env.N8N_WEBHOOK_SECRET) {
          console.error('Invalid webhook secret');
          return errorResponse('Unauthorized webhook', 401);
        }

        const body = await request.json();
        console.log('N8N webhook payload:', body);
        
        const { 
          title, 
          summary, 
          original_url, 
          source, 
          category,
          image_url,
          n8n_workflow_id,
          ai_tags,
          validation_score 
        } = body;

        // Validate required fields
        if (!title || !summary || !original_url) {
          console.error('Missing required fields');
          return errorResponse('Missing required fields: title, summary, original_url', 400);
        }

        // Create draft article
        const { data, error } = await supabase
          .from('articles')
          .insert({
            title,
            summary,
            original_url,
            source: source || 'RSS Feed',
            category: category || 'AI News',
            image_url,
            status: 'draft',
            auto_generated: true,
            n8n_workflow_id,
            ai_tags: ai_tags ? ai_tags.split(',').map(tag => tag.trim()) : null,
            validation_score: validation_score ? parseFloat(validation_score) : null,
            approval_status: 'pending',
            is_published: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating draft article:', error);
          return errorResponse('Failed to create draft article', 500);
        }

        console.log('Draft article created successfully:', data.id);
        return jsonResponse({ 
          success: true, 
          message: 'Draft article created successfully',
          article_id: data.id 
        });
      }

      // POST /api/n8n/webhook/workflow-status - Track workflow execution
      if (path === '/api/n8n/webhook/workflow-status' && method === 'POST') {
        // Verify webhook secret
        const webhookSecret = request.headers.get('x-n8n-webhook-secret');
        if (webhookSecret !== env.N8N_WEBHOOK_SECRET) {
          return errorResponse('Unauthorized webhook', 401);
        }

        const body = await request.json();
        const { 
          workflow_id, 
          execution_id, 
          status, 
          articles_processed,
          error_message 
        } = body;

        const { data, error } = await supabase
          .from('workflow_runs')
          .insert({
            workflow_id,
            execution_id,
            status,
            articles_processed: articles_processed || 0,
            started_at: new Date().toISOString(),
            error_message
          })
          .select()
          .single();

        if (error) {
          console.error('Error tracking workflow:', error);
          return errorResponse('Failed to track workflow', 500);
        }

        return jsonResponse({ 
          success: true, 
          message: 'Workflow status tracked',
          run_id: data.id 
        });
      }

      // If no route matches, return 404
      return errorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse(`Internal server error: ${error.message}`, 500);
    }
  }
};