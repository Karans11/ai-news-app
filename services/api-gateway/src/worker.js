// Cloudflare Worker version of your API Gateway
import { createClient } from '@supabase/supabase-js';

// Environment variables will be set in Cloudflare
const supabaseUrl = SUPABASE_URL;
const supabaseServiceKey = SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple authentication check
function checkAuth(request) {
  const authHeader = request.headers.get('Authorization');
  // For now, check for admin token (we'll improve this)
  return authHeader === 'Bearer admin-secret-token';
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Public routes
    if (path === '/api/articles' && request.method === 'GET') {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Newsletter subscription
    if (path === '/api/subscribe' && request.method === 'POST') {
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('subscribers')
        .insert({ email });

      if (error) {
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ success: false, error: 'Already subscribed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Successfully subscribed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin routes (require authentication)
    if (path.startsWith('/api/admin/')) {
      if (!checkAuth(request)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Admin login
      if (path === '/api/admin/login' && request.method === 'POST') {
        const body = await request.json();
        const { email, password } = body;
        
        // Simple admin check (improve this in production)
        if (email === 'admin@skay.in' && password === 'yourSecurePassword123') {
          return new Response(
            JSON.stringify({ 
              success: true, 
              token: 'admin-secret-token',
              user: { email, role: 'admin' }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create article
      if (path === '/api/admin/articles' && request.method === 'POST') {
        const body = await request.json();
        const { title, summary, original_url, category, image_url } = body;
        
        const { data, error } = await supabase
          .from('articles')
          .insert({
            title,
            summary,
            original_url,
            category,
            image_url
          })
          .select();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data: data[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get analytics
      if (path === '/api/admin/analytics' && request.method === 'GET') {
        const { data: articles, error: articlesError } = await supabase
          .from('articles')
          .select('*');

        const { data: subscribers, error: subscribersError } = await supabase
          .from('subscribers')
          .select('*');

        if (articlesError || subscribersError) {
          throw articlesError || subscribersError;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              totalArticles: articles.length,
              totalSubscribers: subscribers.length,
              recentArticles: articles.slice(0, 5)
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ success: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export default {
  async fetch(request, env) {
    // Make environment variables global
    globalThis.SUPABASE_URL = env.SUPABASE_URL;
    globalThis.SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
    
    return handleRequest(request);
  }
};
