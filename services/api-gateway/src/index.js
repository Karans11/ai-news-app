// Complete Cloudflare Worker API Gateway - AI News App with Enhanced Debug Logging
import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env, ctx) {
    // Initialize Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    
    // ✅ ADD THIS CODE BLOCK HERE ✅

    // Simple rate limiting for login attempts
    const loginAttempts = new Map();

    const checkLoginRateLimit = (ip) => {
      const now = Date.now();
      const windowMs = 5 * 60 * 1000; // 5 minutes
      const maxAttempts = 5;
      
      if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
      }
      
      const attempts = loginAttempts.get(ip);
      
      // Reset if window expired
      if (now > attempts.resetTime) {
        loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
      }
      
      // Check if exceeded limit
      if (attempts.count >= maxAttempts) {
        return false;
      }
      
      attempts.count++;
      return true;
    };
    // ✅ END OF CODE BLOCK ✅

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

    // Helper function for JSON responses with security headers
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      });
    };

    // Helper function for error responses
    const errorResponse = (message, status = 500) => {
      console.error('API Error:', message);
      return jsonResponse({ success: false, error: message }, status);
    };

    // ✅ ADD THESE VALIDATION FUNCTIONS ✅
    // Input validation helpers
    const validateEmail = (email) => {
      if (!email || typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) && email.length <= 254;
    };

    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return '';
      return input.trim().substring(0, 1000); // Limit length and trim
    };



    const validateRequired = (value, fieldName) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
      }
      return null;
    };
    // ✅ END OF VALIDATION FUNCTIONS ✅

    // Security logging function
    const logSecurityEvent = (event, details, request) => {
      const timestamp = new Date().toISOString();
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      
      console.log(`SECURITY: ${timestamp} - ${event} - IP: ${ip} - ${JSON.stringify(details)}`);
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

      // ==================== WEEKLY ARTICLES PUBLIC ENDPOINTS ====================
      
      // GET /api/weekly-articles - Get published weekly articles
      if (path === '/api/weekly-articles' && method === 'GET') {
        const { data, error } = await supabase
          .from('weekly_articles')
          .select('*')
          .eq('is_published', true)
          .order('publish_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        return jsonResponse({ success: true, data: data || [] });
      }

      // GET /api/weekly-articles/:id - Get specific weekly article
      if (path.startsWith('/api/weekly-articles/') && method === 'GET' && !path.includes('/admin/')) {
        const id = path.split('/')[3];
        
        const { data, error } = await supabase
          .from('weekly_articles')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return errorResponse('Weekly article not found', 404);
          }
          throw error;
        }

        // Increment view count
        await supabase
          .from('weekly_articles')
          .update({ view_count: data.view_count + 1 })
          .eq('id', id);

        return jsonResponse({ 
          success: true, 
          data: { ...data, view_count: data.view_count + 1 } 
        });
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

      // POST /api/auth/login - Admin login with rate limiting and validation
      if (path === '/api/auth/login' && method === 'POST') {
        const clientIP = request.headers.get('CF-Connecting-IP') || 
                        request.headers.get('X-Forwarded-For') || 
                        'unknown';
        
        try {
          // Check rate limit (keep your existing logic)
          if (!checkLoginRateLimit(clientIP)) {
            logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP }, request);
            return errorResponse('Too many login attempts. Please try again in 5 minutes.', 429);
          }
          
          const body = await request.json();
          const { email, password } = body;
          
          // ✅ NEW: Input validation
          if (!email || !password) {
            logSecurityEvent('LOGIN_MISSING_FIELDS', { email: email || 'missing' }, request);
            return errorResponse('Email and password are required', 400);
          }
          
          if (!validateEmail(email)) {
            logSecurityEvent('LOGIN_INVALID_EMAIL', { email }, request);
            return errorResponse('Invalid email format', 400);
          }
          
          // ✅ NEW: Sanitize inputs
          const cleanEmail = sanitizeInput(email);
          const cleanPassword = sanitizeInput(password);
          
          if (cleanPassword.length < 3) {
            logSecurityEvent('LOGIN_WEAK_PASSWORD', { email: cleanEmail }, request);
            return errorResponse('Invalid credentials', 401);
          }
          
          // Check credentials (using cleaned inputs)
          if (cleanEmail === env.ADMIN_EMAIL && cleanPassword === env.ADMIN_PASSWORD) {
            logSecurityEvent('LOGIN_SUCCESS', { email: cleanEmail }, request);
            return jsonResponse({ 
              success: true, 
              token: 'demo-admin-token',
              user: { email: cleanEmail, role: 'admin' }
            });
          } else {
            logSecurityEvent('LOGIN_FAILED', { email: cleanEmail }, request);
            return errorResponse('Invalid credentials', 401);
          }
          
        } catch (e) {
          logSecurityEvent('LOGIN_ERROR', { error: e.message }, request);
          return errorResponse('Invalid request format', 400);
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
          
          const [articlesResult, usersResult, viewsResult, pendingResult] = await Promise.all([
            supabase.from('articles').select('*', { count: 'exact', head: true }),
            supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('articles').select('view_count'),
            supabase.from('articles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending')
          ]);

          const viewSum = viewsResult.data?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0;

          const responseData = {
            success: true,
            data: {
              totalArticles: articlesResult.count || 0,
              totalUsers: usersResult.count || 0,
              totalViews: viewSum,
              pendingApproval: pendingResult.count || 0,
              lastUpdated: new Date().toISOString()
            }
          };

          console.log('Sending stats response:', responseData);
          return jsonResponse(responseData);
        }

        // GET /api/admin/articles - Get all articles for admin with pagination and filters
        if (path === '/api/admin/articles' && method === 'GET') {
          const urlParams = new URLSearchParams(url.search);
          const page = parseInt(urlParams.get('page') || '1');
          const limit = parseInt(urlParams.get('limit') || '50');
          const search = urlParams.get('search') || '';
          const status = urlParams.get('status') || '';
          const category = urlParams.get('category') || '';
          const dateFrom = urlParams.get('dateFrom') || '';
          const dateTo = urlParams.get('dateTo') || '';
          
          const offset = (page - 1) * limit;
          
          // Build query
          let query = supabase
            .from('articles')
            .select('*', { count: 'exact' });
          
          // Apply filters
          if (search) {
            query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,source.ilike.%${search}%`);
          }
          
          if (status) {
            if (status === 'published') {
              query = query.eq('is_published', true);
            } else if (status === 'scheduled') {
              query = query.eq('is_published', false).not('scheduled_publish_at', 'is', null);
            } else if (status === 'pending') {
              query = query.eq('approval_status', 'pending');
            } else if (status === 'rejected') {
              query = query.eq('approval_status', 'rejected');
            } else if (status === 'draft') {
              query = query.eq('is_published', false).is('scheduled_publish_at', null);
            }
          }
          
          if (category) {
            query = query.eq('category', category);
          }
          
          if (dateFrom) {
            query = query.gte('created_at', dateFrom);
          }
          
          if (dateTo) {
            query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
          }
          
          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) throw error;
          
          return jsonResponse({ 
            success: true, 
            data: data || [], 
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          });
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

        // GET /api/admin/users - Get all users
        if (path === '/api/admin/users' && method === 'GET') {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, role, is_active, created_at, last_login')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ success: true, data: data || [] });
        }

        // PUT /api/admin/users/:id/toggle-status - Activate/deactivate users
        if (path.match(/^\/api\/admin\/users\/[^\/]+\/toggle-status$/) && method === 'PUT') {
          const userId = path.split('/')[4];
          const body = await request.json();
          const { is_active } = body;
          
          const { data, error } = await supabase
            .from('user_profiles')
            .update({ 
              is_active,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data });
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

        // GET /api/admin/categories - Get categories with article counts
        if (path === '/api/admin/categories' && method === 'GET') {
          const { data, error } = await supabase
            .from('articles')
            .select('category')
            .not('category', 'is', null);

          if (error) throw error;
          
          // Count articles by category
          const categoryCounts = {};
          data.forEach(article => {
            const cat = article.category;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
          
          const categories = Object.entries(categoryCounts).map(([name, count]) => ({
            name,
            count
          }));
          
          return jsonResponse({ success: true, data: categories });
        }

        // POST /api/admin/categories - Create new category
        if (path === '/api/admin/categories' && method === 'POST') {
          const body = await request.json();
          const { name } = body;
          
          return jsonResponse({ 
            success: true, 
            message: 'Category will be created when first article uses it',
            category: name 
          });
        }

        // PUT /api/admin/categories/:name - Rename category
        if (path.match(/^\/api\/admin\/categories\/[^\/]+$/) && method === 'PUT') {
          const oldName = decodeURIComponent(path.split('/')[4]);
          const body = await request.json();
          const { new_name } = body;
          
          const { data, error } = await supabase
            .from('articles')
            .update({ category: new_name })
            .eq('category', oldName)
            .select();

          if (error) throw error;
          
          return jsonResponse({ 
            success: true, 
            message: `Updated ${data.length} articles from "${oldName}" to "${new_name}"` 
          });
        }

        // DELETE /api/admin/categories/:name - Delete category
        if (path.match(/^\/api\/admin\/categories\/[^\/]+$/) && method === 'DELETE') {
          const categoryName = decodeURIComponent(path.split('/')[4]);
          
          const { data, error } = await supabase
            .from('articles')
            .update({ category: 'Uncategorized' })
            .eq('category', categoryName)
            .select();

          if (error) throw error;
          
          return jsonResponse({ 
            success: true, 
            message: `Moved ${data.length} articles to "Uncategorized"` 
          });
        }

        // ==================== WEEKLY ARTICLES ADMIN ENDPOINTS ====================

        // GET /api/admin/weekly-articles - Get all weekly articles (published and drafts)
        if (path === '/api/admin/weekly-articles' && method === 'GET') {
          const { data, error } = await supabase
            .from('weekly_articles')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ success: true, data: data || [] });
        }

        // POST /api/admin/weekly-articles - Create new weekly article
        if (path === '/api/admin/weekly-articles' && method === 'POST') {
          const body = await request.json();
          const {
            title,
            content,
            summary,
            topic_category,
            featured_image_url,
            reading_time_minutes,
            publish_date,
            week_number,
            year,
            tags,
            meta_description,
            author_name
          } = body;

          const { data, error } = await supabase
            .from('weekly_articles')
            .insert({
              title,
              content,
              summary,
              topic_category,
              featured_image_url,
              reading_time_minutes: reading_time_minutes || 10,
              publish_date,
              week_number,
              year: year || new Date().getFullYear(),
              tags: tags || [],
              meta_description,
              author_name: author_name || 'NineT Editorial Team',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data }, 201);
        }

        // PUT /api/admin/weekly-articles/:id - Update weekly article
        if (path.startsWith('/api/admin/weekly-articles/') && method === 'PUT') {
          const id = path.split('/')[4];
          const body = await request.json();
          
          const { data, error } = await supabase
            .from('weekly_articles')
            .update({
              ...body,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data });
        }

        // DELETE /api/admin/weekly-articles/:id - Delete weekly article
        if (path.startsWith('/api/admin/weekly-articles/') && method === 'DELETE') {
          const id = path.split('/')[4];
          
          const { error } = await supabase
            .from('weekly_articles')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return jsonResponse({ success: true, message: 'Weekly article deleted successfully' });
        }

        // POST /api/admin/articles/:id/publish - Manual publish override
        if (path.match(/^\/api\/admin\/articles\/[^\/]+\/publish$/) && method === 'POST') {
          const articleId = path.split('/')[4];
          
          const { data, error } = await supabase
            .from('articles')
            .update({
              is_published: true,
              status: 'published',
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId)
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ success: true, data });
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

        // ==================== ANALYTICS ENDPOINTS ====================
        
        // GET /api/admin/analytics/overview - Dashboard overview
        if (path === '/api/admin/analytics/overview' && method === 'GET') {
          try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const [
              categoryStats,
              topArticles,
              dailyViews,
              userGrowth,
              totalStats
            ] = await Promise.all([
              // Category performance
              supabase
                .from('articles')
                .select('category, view_count')
                .eq('is_published', true)
                .not('category', 'is', null),
              
              // Top articles this week
              supabase
                .from('articles')
                .select('title, view_count, published_at, category')
                .eq('is_published', true)
                .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('view_count', { ascending: false })
                .limit(5),
              
              // Daily views for chart (last 30 days)
              supabase
                .from('articles')
                .select('published_at, view_count')
                .eq('is_published', true)
                .gte('published_at', thirtyDaysAgo.toISOString()),
              
              // User growth (last 30 days)
              supabase
                .from('user_profiles')
                .select('created_at')
                .gte('created_at', thirtyDaysAgo.toISOString()),
              
              // Total stats
              Promise.all([
                supabase.from('articles').select('*', { count: 'exact', head: true }),
                supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('articles').select('view_count').eq('is_published', true)
              ])
            ]);

            // Process category stats
            const categoryData = {};
            categoryStats.data?.forEach(article => {
              const cat = article.category;
              if (!categoryData[cat]) {
                categoryData[cat] = { count: 0, views: 0 };
              }
              categoryData[cat].count += 1;
              categoryData[cat].views += article.view_count || 0;
            });

            const categoryChart = Object.entries(categoryData).map(([name, data]) => ({
              category: name,
              articles: data.count,
              views: data.views
            }));

            // Process daily views
            const dailyData = {};
            dailyViews.data?.forEach(article => {
              const date = article.published_at.split('T')[0];
              dailyData[date] = (dailyData[date] || 0) + (article.view_count || 0);
            });

            const viewsChart = Object.entries(dailyData)
              .map(([date, views]) => ({ date, views }))
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            // Process user growth
            const userGrowthData = {};
            userGrowth.data?.forEach(user => {
              const date = user.created_at.split('T')[0];
              userGrowthData[date] = (userGrowthData[date] || 0) + 1;
            });

            const growthChart = Object.entries(userGrowthData)
              .map(([date, users]) => ({ date, users }))
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate total views
            const totalViews = totalStats[2].data?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0;

            return jsonResponse({
              success: true,
              data: {
                categoryPerformance: categoryChart,
                topArticles: topArticles.data || [],
                dailyViews: viewsChart,
                userGrowth: growthChart,
                totals: {
                  articles: totalStats[0].count || 0,
                  users: totalStats[1].count || 0,
                  views: totalViews
                }
              }
            });

          } catch (error) {
            console.error('Analytics error:', error);
            return errorResponse(`Analytics failed: ${error.message}`, 500);
          }
        }

        // ✅ NEW: POST /api/admin/publish-scheduled - Automatically publish scheduled articles
        if (path === '/api/admin/publish-scheduled' && method === 'POST') {
          console.log('=== AUTO-PUBLISH SCHEDULED ARTICLES START ===');
          
          const currentUTC = new Date().toISOString();
          console.log('Current UTC time:', currentUTC);
          
          try {
            // Find articles that should be published now
            const { data: scheduledArticles, error: fetchError } = await supabase
              .from('articles')
              .select('*')
              .eq('status', 'scheduled')
              .eq('is_published', false)
              .lte('scheduled_publish_at', currentUTC);

            if (fetchError) {
              console.error('Error fetching scheduled articles:', fetchError);
              return errorResponse('Database error while fetching scheduled articles', 500);
            }

            console.log(`Found ${scheduledArticles?.length || 0} articles ready to publish`);

            if (scheduledArticles && scheduledArticles.length > 0) {
              const publishResults = [];
              
              for (const article of scheduledArticles) {
                try {
                  console.log(`Publishing article: ${article.title} (ID: ${article.id})`);
                  console.log(`Scheduled for: ${article.scheduled_publish_at}, Current: ${currentUTC}`);
                  
                  const { data, error } = await supabase
                    .from('articles')
                    .update({
                      is_published: true,
                      status: 'published',
                      published_at: currentUTC,
                      updated_at: currentUTC
                    })
                    .eq('id', article.id)
                    .select()
                    .single();

                  if (error) {
                    console.error(`Error publishing article ${article.id}:`, error);
                    publishResults.push({ 
                      id: article.id, 
                      title: article.title,
                      success: false, 
                      error: error.message 
                    });
                  } else {
                    console.log(`✅ Successfully published: ${article.title}`);
                    publishResults.push({ 
                      id: article.id, 
                      title: article.title,
                      success: true 
                    });
                  }
                } catch (err) {
                  console.error(`Exception publishing article ${article.id}:`, err);
                  publishResults.push({ 
                    id: article.id, 
                    title: article.title,
                    success: false, 
                    error: err.message 
                  });
                }
              }

              const successCount = publishResults.filter(r => r.success).length;
              const failureCount = publishResults.filter(r => !r.success).length;
              
              console.log(`✅ Published ${successCount} articles, ${failureCount} failed`);
              console.log('=== AUTO-PUBLISH SCHEDULED ARTICLES END ===');

              return jsonResponse({ 
                success: true, 
                message: `Published ${successCount} articles${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
                published_count: successCount,
                failed_count: failureCount,
                results: publishResults
              });
            }

            console.log('No articles ready for publishing');
            console.log('=== AUTO-PUBLISH SCHEDULED ARTICLES END ===');
            return jsonResponse({ 
              success: true, 
              message: 'No articles ready for publishing',
              published_count: 0,
              failed_count: 0
            });

          } catch (error) {
            console.error('Unhandled error in auto-publish:', error);
            console.log('=== AUTO-PUBLISH SCHEDULED ARTICLES END (ERROR) ===');
            return errorResponse(`Auto-publish failed: ${error.message}`, 500);
          }
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
      
      // SIMPLE TEST - Add this line
      if (path === '/api/simple-test') {
        return jsonResponse({ success: true, message: 'Simple test endpoint works' });
      }

      // GET version for testing Telegram endpoint
      if (path === '/api/telegram/callback' && method === 'GET') {
        return jsonResponse({ success: true, message: 'Telegram endpoint exists - GET test' });
      }

      // DEBUG: Simple webhook test
      if (path === '/api/telegram/debug' && method === 'POST') {
        console.log('DEBUG: Any POST request received');
        const body = await request.json();
        console.log('DEBUG: Request body:', body);
        return jsonResponse({ success: true, message: 'Webhook received', body: body });
      }

      // ==================== TELEGRAM WEBHOOK ENDPOINTS ====================
      
      // POST /api/telegram/callback - Handle Telegram button clicks
      if (path === '/api/telegram/callback' && method === 'POST') {
        console.log('Telegram callback received');
        
        const body = await request.json();
        console.log('Telegram callback payload:', body);
        
        const callbackQuery = body.callback_query;
        if (!callbackQuery) {
          console.error('No callback query found');
          return errorResponse('No callback query found', 400);
        }

        const callbackData = callbackQuery.data; // e.g., "action:reject:123"
        console.log('Callback data:', callbackData);
        
        const [action, operation, articleId] = callbackData.split(':');
        console.log('Parsed data - operation:', operation, 'articleId:', articleId);

        try {
          // Handle the button click based on operation
          if (operation === 'reject') {
            console.log('Processing reject for article:', articleId);
            
            const { data, error } = await supabase
              .from('articles')
              .update({ 
                approval_status: 'rejected',
                status: 'rejected',
                updated_at: new Date().toISOString()
              })
              .eq('id', articleId)
              .select()
              .single();
              
            if (error) {
              console.error('Error rejecting article:', error);
              return errorResponse('Failed to reject article', 500);
            }
            
            console.log('Article rejected successfully:', articleId);
            return jsonResponse({ success: true, message: 'Article rejected', data });
          }

          if (operation === 'schedule') {
          console.log('Processing schedule for article:', articleId);
          
          // Calculate 1 hour from current IST time
          const nowUTC = new Date();
          const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
          const nowIST = new Date(nowUTC.getTime() + istOffset);
          const oneHourLaterIST = new Date(nowIST.getTime() + 60 * 60 * 1000);
          const scheduledTimeUTC = new Date(oneHourLaterIST.getTime() - istOffset);
          
          console.log('Current UTC time:', nowUTC.toISOString());
          console.log('Current IST time:', nowIST.toISOString());
          console.log('Scheduled IST time:', oneHourLaterIST.toISOString());
          console.log('Scheduled UTC time (for DB):', scheduledTimeUTC.toISOString());
          
          const { data, error } = await supabase
            .from('articles')
            .update({ 
              approval_status: 'approved',
              status: 'scheduled',
              scheduled_publish_at: scheduledTimeUTC.toISOString(),
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId)
            .select()
            .single();
            
          if (error) {
            console.error('Error scheduling article:', error);
            return errorResponse('Failed to schedule article', 500);
          }
          
          console.log('Article scheduled successfully:', articleId);
          const istDisplay = oneHourLaterIST.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
          return jsonResponse({ success: true, message: `Article scheduled for ${istDisplay} IST`, data });
        }
          
          if (operation === 'publish') {
            console.log('Processing publish for article:', articleId);
            
            const { data, error } = await supabase
              .from('articles')
              .update({ 
                approval_status: 'approved',
                status: 'published',
                is_published: true,
                published_at: new Date().toISOString(),
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', articleId)
              .select()
              .single();
              
            if (error) {
              console.error('Error publishing article:', error);
              return errorResponse('Failed to publish article', 500);
            }
            
            console.log('Article published successfully:', articleId);
            return jsonResponse({ success: true, message: 'Article published', data });
          }

          return errorResponse('Unknown operation: ' + operation, 400);
          
        } catch (error) {
          console.error('Error processing Telegram callback:', error);
          return errorResponse('Internal error processing callback', 500);
        }
      }

      // TEST ENDPOINT - Remove after testing
      if (path === '/api/test-telegram' && method === 'GET') {
        return jsonResponse({ success: true, message: 'Telegram endpoint area is working' });
      }

      // If no route matches, return 404
      return errorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse(`Internal server error: ${error.message}`, 500);
    }
  }
};