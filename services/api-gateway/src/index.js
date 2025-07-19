const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Check environment variables
console.log('Starting API Gateway...');
console.log('Environment check:');
console.log('- PORT:', process.env.PORT || '3001');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('\nERROR: Missing required environment variables!');
  console.error('Please create a .env file with:');
  console.error('SUPABASE_URL=your_supabase_url');
  console.error('SUPABASE_SERVICE_KEY=your_service_key');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all articles
app.get('/api/articles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
});

// Get single article
app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    const { error: updateError } = await supabase
      .from('articles')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating view count:', updateError);
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch article' });
  }
});

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const { error } = await supabase
      .from('subscribers')
      .insert({ email });

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, error: 'Already subscribed' });
      }
      throw error;
    }

    res.json({ success: true, message: 'Successfully subscribed' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
});

// Admin login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (email === 'admin@ainews.com' && password === 'admin123') {
      res.json({ 
        success: true, 
        token: 'demo-admin-token',
        user: { email, role: 'admin' }
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Admin: Get statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
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
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Admin: Create article
app.post('/api/admin/articles', async (req, res) => {
  try {
    const { title, summary, original_url, category, image_url } = req.body;
    
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        summary,
        original_url,
        category,
        image_url,
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, error: 'Failed to create article' });
  }
});
// Admin: Delete article by ID
app.delete('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ success: false, error: 'Failed to delete article' });
  }
});
// Admin: Get all articles (published & unpublished)
app.get('/api/admin/articles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching all articles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
});

// Admin: Get all subscribers
app.get('/api/admin/subscribers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscribers' });
  }
});
// ========== ADD THESE NEW ENDPOINTS ==========

// Admin: Update article (for edit functionality)
app.put('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, original_url, category, image_url } = req.body;
    
    const { data, error } = await supabase
      .from('articles')
      .update({
        title,
        summary,
        original_url,
        category,
        image_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, error: 'Failed to update article' });
  }
});

// Admin: Delete article
app.delete('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ success: false, error: 'Failed to delete article' });
  }
});

// Admin: Get all subscribers
app.get('/api/admin/subscribers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscribers' });
  }
});

// Admin: Delete subscriber
app.delete('/api/admin/subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Subscriber removed successfully' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ success: false, error: 'Failed to delete subscriber' });
  }
});

// ========== END OF NEW ENDPOINTS ==========

// Make sure this 404 handler stays at the end
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});
// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n✅ API Gateway running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Admin stats: http://localhost:${PORT}/api/admin/stats`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error('Try one of these solutions:');
    console.error('1. Kill the process using the port:');
    console.error(`   lsof -ti:${PORT} | xargs kill -9`);
    console.error('2. Or use a different port in your .env file');
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
