# AI News Aggregator
# AI News App - Complete Beginner's Deployment Guide

## Table of Contents
1. [Overview - What We're Building](#overview)
2. [Prerequisites - What You Need](#prerequisites)
3. [Step 1: Setting Up Your Computer](#step-1-setting-up-your-computer)
4. [Step 2: Creating Required Accounts](#step-2-creating-required-accounts)
5. [Step 3: Setting Up the Database](#step-3-setting-up-the-database)
6. [Step 4: Creating Your Project Structure](#step-4-creating-your-project-structure)
7. [Step 5: Building the Backend API](#step-5-building-the-backend-api)
8. [Step 6: Building the Admin Portal](#step-6-building-the-admin-portal)
9. [Step 7: Building the Viewer Portal](#step-7-building-the-viewer-portal)
10. [Step 8: Setting Up AWS](#step-8-setting-up-aws)
11. [Step 9: Containerizing Your Application](#step-9-containerizing-your-application)
12. [Step 10: Setting Up Kubernetes](#step-10-setting-up-kubernetes)
13. [Step 11: Setting Up CI/CD](#step-11-setting-up-cicd)
14. [Step 12: Deploying Your Application](#step-12-deploying-your-application)
15. [Step 13: Setting Up Your Domain](#step-13-setting-up-your-domain)
16. [Troubleshooting Common Issues](#troubleshooting)

---

## Overview - What We're Building

We're creating an AI news aggregator application with:
- **Viewer Website**: Where users read AI news in short format
- **Admin Dashboard**: Where you manage articles and view statistics
- **API**: Backend that handles all data and logic
- **Database**: Stores all articles, users, and analytics

Think of it like building a house:
- Database = Foundation
- API = Plumbing and electrical
- Admin Portal = Control room
- Viewer Portal = Living spaces

---

## Prerequisites - What You Need

### Required Accounts (All Free to Start)
1. **GitHub Account** - For storing code
2. **AWS Account** - For hosting
3. **Supabase Account** - For database
4. **Domain Name** - For your website URL (optional initially)

### Required Knowledge
- Basic computer skills
- Ability to use command line/terminal
- Basic understanding of websites

Don't worry if you don't know everything - we'll explain as we go!

---

## Step 1: Setting Up Your Computer

### 1.1 Install Required Software

#### For Windows:

1. **Install Node.js** (JavaScript runtime)
   - Go to https://nodejs.org
   - Download "LTS" version
   - Run installer, click "Next" for all options
   - To verify: Open Command Prompt and type: `node --version`

2. **Install Git** (Version control)
   - Go to https://git-scm.com/download/win
   - Download and run installer
   - Use default options
   - To verify: Type `git --version` in Command Prompt

3. **Install Docker Desktop**
   - Go to https://www.docker.com/products/docker-desktop
   - Download and install
   - Restart computer when prompted
   - Open Docker Desktop and complete setup

4. **Install VS Code** (Code editor)
   - Go to https://code.visualstudio.com
   - Download and install
   - This is where you'll write code

5. **Install AWS CLI**
   ```cmd
   # Open Command Prompt as Administrator
   msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

#### For Mac:

1. **Install Homebrew** (Package manager)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Required Tools**
   ```bash
   # Install Node.js
   brew install node
   
   # Install Git
   brew install git
   
   # Install Docker Desktop
   # Download from https://www.docker.com/products/docker-desktop
   
   # Install AWS CLI
   brew install awscli
   
   # Install kubectl
   brew install kubectl
   
   # Install VS Code
   brew install --cask visual-studio-code
   ```

### 1.2 Verify Installation

Open Terminal (Mac) or Command Prompt (Windows) and run:
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show git version
docker --version  # Should show Docker version
aws --version     # Should show aws-cli version
```

---

## Step 2: Creating Required Accounts

### 2.1 Create GitHub Account
1. Go to https://github.com
2. Click "Sign up"
3. Choose username (e.g., "yourname-ai-news")
4. Verify email
5. Choose free plan

### 2.2 Create AWS Account
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Enter email and choose account name
4. Enter payment information (required but won't charge for free tier)
5. Verify phone number
6. Choose "Basic support - Free"
7. Complete signup

**Important**: AWS gives 12 months free tier for new accounts!

### 2.3 Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (easier) or email
4. Create new organization (e.g., "My AI News")
5. Create new project:
   - Name: "ai-news-db"
   - Database Password: Generate strong password and SAVE IT!
   - Region: Choose closest to you
   - Click "Create new project"
6. Wait 2-3 minutes for setup

---

## Step 3: Setting Up the Database

### 3.1 Access Supabase SQL Editor
1. In Supabase dashboard, click "SQL Editor" in left menu
2. Click "New query"

### 3.2 Create Database Tables

Copy and paste this ENTIRE code block into the SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for admin login
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    is_subscribed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create articles table for news
CREATE TABLE articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    original_url TEXT NOT NULL,
    source VARCHAR(255),
    category VARCHAR(100),
    image_url TEXT,
    published_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true
);

-- Create subscribers table
CREATE TABLE subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMP DEFAULT NOW()
);

-- Create ads table for promotional content
CREATE TABLE ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    image_url TEXT,
    target_url TEXT,
    position VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create analytics table for tracking
CREATE TABLE analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    article_id UUID REFERENCES articles(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_analytics_article_id ON analytics(article_id);

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@ainews.com', '$2b$10$rBV2JDeWW3.vKyeQcM8fFO4777l4bVeQgDL6VZkDtQqK7eQ8jTpHe', 'admin');

-- Insert sample articles
INSERT INTO articles (title, summary, original_url, category, source) VALUES
('OpenAI Releases GPT-5', 'OpenAI has announced the release of GPT-5, featuring improved reasoning capabilities and multimodal understanding.', 'https://openai.com/blog/gpt-5', 'AI Models', 'OpenAI'),
('Google''s Gemini Beats Benchmarks', 'Google''s latest Gemini model sets new records in various AI benchmarks, showing significant improvements in reasoning tasks.', 'https://deepmind.google/gemini', 'AI Models', 'Google'),
('AI Regulation Bill Passed in EU', 'The European Union has passed comprehensive AI regulation, setting standards for AI development and deployment.', 'https://europa.eu/ai-act', 'Policy', 'EU Commission');

-- Create views for statistics
CREATE VIEW article_stats AS
SELECT 
    COUNT(*) as total_articles,
    SUM(view_count) as total_views,
    COUNT(DISTINCT category) as total_categories
FROM articles
WHERE is_published = true;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Anyone can view published articles" ON articles
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can do everything with articles" ON articles
    FOR ALL USING (true);  -- We'll implement proper auth later

CREATE POLICY "Anyone can subscribe" ON subscribers
    FOR INSERT WITH CHECK (true);
```

3. Click "Run" button
4. You should see "Success. No rows returned"

### 3.3 Get Database Credentials

1. In Supabase, click "Settings" (gear icon) → "API"
2. Copy and save these values in a text file:
   ```
   Project URL: https://xxxxx.supabase.co
   Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Click "Settings" → "Database"
4. Copy the connection string

**IMPORTANT**: Keep these credentials safe and never share them!

---

## Step 4: Creating Your Project Structure

### 4.1 Create Project Folder

1. Open Terminal/Command Prompt
2. Navigate to where you want your project:
   ```bash
   # Windows
   cd C:\Users\YourName\Documents
   
   # Mac
   cd ~/Documents
   ```

3. Create project folder:
   ```bash
   mkdir ai-news-app
   cd ai-news-app
   ```

### 4.2 Initialize Git Repository

```bash
git init
```

### 4.3 Create Folder Structure

```bash
# Create all necessary folders
mkdir -p services/api-gateway
mkdir -p services/admin-portal  
mkdir -p services/viewer-portal
mkdir -p k8s/deployments
mkdir -p k8s/services
mkdir -p k8s/configmaps
mkdir -p k8s/secrets
mkdir -p .github/workflows
```

### 4.4 Create .gitignore File

Create a file named `.gitignore` in the root folder:
```bash
# Create file
echo "" > .gitignore
```

Open it in VS Code and add:
```
node_modules/
.env
.env.local
.DS_Store
*.log
dist/
build/
.next/
```

### 4.5 Create README.md

```bash
echo "# AI News Aggregator" > README.md
```

---

## Step 5: Building the Backend API

### 5.1 Navigate to API Gateway Folder
```bash
cd services/api-gateway
```

### 5.2 Initialize Node.js Project
```bash
npm init -y
```

### 5.3 Install Dependencies
```bash
npm install express cors helmet dotenv bcrypt jsonwebtoken
npm install @supabase/supabase-js express-rate-limit
npm install --save-dev @types/node @types/express typescript nodemon ts-node
```

### 5.4 Create TypeScript Configuration

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5.5 Update package.json Scripts

Edit `package.json` and update the scripts section:
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "test": "echo \"No tests yet\""
  }
}
```

### 5.6 Create Source Files

Create folder structure:
```bash
mkdir src
mkdir src/routes
mkdir src/middleware
```

Create `src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
app.use('/api/', limiter);

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
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
});

// Get single article
app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Increment view count
    await supabase.rpc('increment', { article_id: id, field: 'view_count' });
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
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
      if (error.code === '23505') { // Duplicate email
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
    
    // For demo purposes, check if it's the admin account
    if (email === 'admin@ainews.com' && password === 'admin123') {
      // In production, use proper JWT tokens
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

// Admin: Create article
app.post('/api/admin/articles', async (req, res) => {
  try {
    // TODO: Add proper authentication check
    const { title, summary, original_url, category, image_url } = req.body;
    
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        summary,
        original_url,
        category,
        image_url
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

// Admin: Get statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Get counts from different tables
    const [articles, subscribers, totalViews] = await Promise.all([
      supabase.from('articles').select('id', { count: 'exact' }),
      supabase.from('subscribers').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('articles').select('view_count')
    ]);

    const viewSum = totalViews.data?.reduce((sum, article) => sum + article.view_count, 0) || 0;

    res.json({
      success: true,
      data: {
        totalArticles: articles.count || 0,
        totalSubscribers: subscribers.count || 0,
        totalViews: viewSum,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
```

### 5.7 Create Environment File

Create `.env` file in the api-gateway folder:
```env
PORT=3001
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

Replace the values with your actual Supabase credentials.

### 5.8 Test the API

```bash
# Start the development server
npm run dev
```

Open another terminal and test:
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test articles endpoint
curl http://localhost:3001/api/articles
```

You should see JSON responses!

---

## Step 6: Building the Admin Portal

### 6.1 Navigate to Admin Portal Folder
```bash
cd ../../services/admin-portal
```

### 6.2 Create Next.js Application
```bash
npx create-next-app@latest . --typescript --tailwind --app
# When prompted:
# - Would you like to use ESLint? → Yes
# - Would you like to use `src/` directory? → Yes
```

### 6.3 Install Additional Dependencies
```bash
npm install @supabase/supabase-js axios recharts
npm install @types/node
```

### 6.4 Create Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 6.5 Create Layout Component

Replace `src/app/layout.tsx`:
```tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI News Admin Portal',
  description: 'Manage your AI news articles',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### 6.6 Create Admin Dashboard

Replace `src/app/page.tsx`:
```tsx
'use client';
import { useState, useEffect } from 'react';

interface Stats {
  totalArticles: number;
  totalSubscribers: number;
  totalViews: number;
  lastUpdated: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArticleForm, setShowArticleForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

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

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/articles`, {
        method: 'POST',
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
        alert('Article created successfully!');
        // Reset form
        setTitle('');
        setSummary('');
        setOriginalUrl('');
        setCategory('');
        setImageUrl('');
        setShowArticleForm(false);
        // Refresh stats
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating article:', error);
      alert('Failed to create article');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">AI News Admin Dashboard</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Articles</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalArticles || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Subscribers</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalSubscribers || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalViews || 0}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          <button
            onClick={() => setShowArticleForm(!showArticleForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {showArticleForm ? 'Cancel' : 'Add New Article'}
          </button>
        </div>

        {/* Article Form */}
        {showArticleForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Article</h2>
            <form onSubmit={handleSubmitArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary (Short description)
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Article URL
                </label>
                <input
                  type="url"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="AI Models">AI Models</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Policy">Policy</option>
                  <option value="Research">Research</option>
                  <option value="Industry">Industry</option>
                  <option value="Startups">Startups</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
              >
                Create Article
              </button>
            </form>
          </div>
        )}

        {/* Quick Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Info</h2>
          <p className="text-gray-600">
            Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Default login: admin@ainews.com / admin123
          </p>
        </div>
      </main>
    </div>
  );
}
```

### 6.7 Test Admin Portal

```bash
# Make sure your API is running in another terminal
# Start the admin portal
npm run dev
```

Open http://localhost:3000 in your browser. You should see the admin dashboard!

---

## Step 7: Building the Viewer Portal

### 7.1 Navigate to Viewer Portal Folder
```bash
cd ../../services/viewer-portal
```

### 7.2 Create Next.js Application
```bash
npx create-next-app@latest . --typescript --tailwind --app
```

### 7.3 Install Dependencies
```bash
npm install @supabase/supabase-js axios
```

### 7.4 Create Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 7.5 Create Main Page

Replace `src/app/page.tsx`:
```tsx
'use client';
import { useState, useEffect } from 'react';

interface Article {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  image_url?: string;
  category: string;
  published_at: string;
  view_count: number;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/articles`);
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

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Successfully subscribed!');
        setEmail('');
      } else {
        alert(data.error || 'Subscription failed');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              🤖 AI News Shorts
            </h1>
            <p className="text-sm text-gray-500">
              Your daily AI updates in bite-sized format
            </p>
          </div>
        </div>
      </header>

      {/* Subscribe Section */}
      <div className="bg-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">
              Stay Updated with AI News
            </h2>
            <p className="mb-6">
              Get the latest AI news delivered to your inbox daily
            </p>
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg text-gray-900"
                required
                disabled={subscribing}
              />
              <button
                type="submit"
                disabled={subscribing}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-500">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No articles available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2024 AI News Shorts. All rights reserved.</p>
          <p className="text-sm text-gray-400 mt-2">
            We aggregate AI news from various sources. All content belongs to original publishers.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {article.image_url && (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-600 uppercase">
            {article.category}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(article.published_at)}
          </span>
        </div>
        
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {article.title}
        </h2>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {article.summary}
        </p>
        
        <div className="flex items-center justify-between">
          <a
            href={article.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
          >
            Read full article
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <span className="text-xs text-gray-400">
            {article.view_count} views
          </span>
        </div>
      </div>
    </div>
  );
}
```

### 7.6 Test Viewer Portal

```bash
# Start the viewer portal (make sure API is running)
npm run dev
```

Open http://localhost:3002 in your browser (it will likely be on port 3002 since admin is on 3000).

---

## Step 8: Setting Up AWS

### 8.1 Configure AWS CLI

Open terminal and run:
```bash
aws configure
```

You'll need:
- AWS Access Key ID: (from AWS console)
- AWS Secret Access Key: (from AWS console)
- Default region: us-east-1
- Default output format: json

To get these:
1. Log into AWS Console
2. Click your username (top right) → Security credentials
3. Create new access key
4. Save both values securely

### 8.2 Install eksctl (EKS CLI)

**Windows:**
```powershell
# Download from https://github.com/weaveworks/eksctl/releases
# Add to PATH
```

**Mac:**
```bash
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl
```

### 8.3 Create ECR Repositories

```bash
# Create repositories for our Docker images
aws ecr create-repository --repository-name ai-news/api-gateway --region us-east-1
aws ecr create-repository --repository-name ai-news/admin-portal --region us-east-1  
aws ecr create-repository --repository-name ai-news/viewer-portal --region us-east-1
```

Save the repository URIs that are returned!

---

## Step 9: Containerizing Your Application

### 9.1 Create Dockerfiles

**For API Gateway** (`services/api-gateway/Dockerfile`):
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**For Admin Portal** (`services/admin-portal/Dockerfile`):
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage  
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV production

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**For Viewer Portal** (`services/viewer-portal/Dockerfile`):
```dockerfile
# Same as admin portal
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### 9.2 Update Next.js Config

For both admin and viewer portals, update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['*'], // In production, specify actual domains
  },
}

module.exports = nextConfig
```

### 9.3 Build Docker Images Locally

```bash
# Navigate to project root
cd ~/Documents/ai-news-app

# Build API Gateway
docker build -t ai-news-api-gateway ./services/api-gateway

# Build Admin Portal  
docker build -t ai-news-admin-portal ./services/admin-portal

# Build Viewer Portal
docker build -t ai-news-viewer-portal ./services/viewer-portal
```

### 9.4 Test Docker Images

```bash
# Test API Gateway
docker run -p 3001:3001 --env-file ./services/api-gateway/.env ai-news-api-gateway

# In new terminal, test admin portal
docker run -p 3000:3000 --env-file ./services/admin-portal/.env.local ai-news-admin-portal
```

---

## Step 10: Setting Up Kubernetes

### 10.1 Create EKS Cluster

**Note**: This will take 15-20 minutes and will incur AWS charges (~$0.10/hour for the cluster).

```bash
# Create a simple cluster
eksctl create cluster \
  --name ai-news-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.small \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 3
```

### 10.2 Verify Cluster

```bash
# Check cluster
kubectl get nodes

# Should see 2 nodes in Ready state
```

### 10.3 Create Kubernetes Configurations

**Create namespace** (`k8s/namespace.yaml`):
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-news
```

**Create secrets** (`k8s/secrets/app-secrets.yaml`):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ai-news
type: Opaque
stringData:
  SUPABASE_URL: "your_supabase_url"
  SUPABASE_ANON_KEY: "your_anon_key"  
  SUPABASE_SERVICE_KEY: "your_service_key"
  NEXT_PUBLIC_SUPABASE_URL: "your_supabase_url"
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "your_anon_key"
```

**Create API deployment** (`k8s/deployments/api-gateway.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: ai-news
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: YOUR_ECR_URI/ai-news/api-gateway:latest
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: SUPABASE_URL
        - name: SUPABASE_SERVICE_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: SUPABASE_SERVICE_KEY
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: ai-news
spec:
  selector:
    app: api-gateway
  ports:
  - port: 3001
    targetPort: 3001
  type: LoadBalancer
```

### 10.4 Apply Configurations

```bash
# Apply namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets (make sure to update with your values first!)
kubectl apply -f k8s/secrets/app-secrets.yaml

# Apply deployments
kubectl apply -f k8s/deployments/
```

---

## Step 11: Setting Up CI/CD

### 11.1 Create GitHub Repository

```bash
# In your project root
git add .
git commit -m "Initial commit"

# Create repo on GitHub
gh repo create ai-news-app --public --source=. --remote=origin --push
```

If you don't have `gh` CLI:
1. Go to GitHub.com
2. Click "New repository"
3. Name it "ai-news-app"
4. Don't initialize with README
5. Follow the push instructions

### 11.2 Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

env:
  AWS_REGION: us-east-1

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push API Gateway
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
      run: |
        docker build -t $ECR_REGISTRY/ai-news/api-gateway:latest ./services/api-gateway
        docker push $ECR_REGISTRY/ai-news/api-gateway:latest
    
    - name: Build and push Admin Portal
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
      run: |
        docker build -t $ECR_REGISTRY/ai-news/admin-portal:latest ./services/admin-portal
        docker push $ECR_REGISTRY/ai-news/admin-portal:latest
    
    - name: Build and push Viewer Portal
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
      run: |
        docker build -t $ECR_REGISTRY/ai-news/viewer-portal:latest ./services/viewer-portal
        docker push $ECR_REGISTRY/ai-news/viewer-portal:latest
    
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --name ai-news-cluster --region ${{ env.AWS_REGION }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl rollout restart deployment api-gateway -n ai-news
        kubectl rollout restart deployment admin-portal -n ai-news
        kubectl rollout restart deployment viewer-portal -n ai-news
```

### 11.3 Add GitHub Secrets

1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

## Step 12: Deploying Your Application

### 12.1 Push Docker Images to ECR

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI

# Tag and push images
docker tag ai-news-api-gateway:latest YOUR_ECR_URI/ai-news/api-gateway:latest
docker push YOUR_ECR_URI/ai-news/api-gateway:latest

docker tag ai-news-admin-portal:latest YOUR_ECR_URI/ai-news/admin-portal:latest  
docker push YOUR_ECR_URI/ai-news/admin-portal:latest

docker tag ai-news-viewer-portal:latest YOUR_ECR_URI/ai-news/viewer-portal:latest
docker push YOUR_ECR_URI/ai-news/viewer-portal:latest
```

### 12.2 Deploy to Kubernetes

```bash
# Update the image URIs in your deployment files first!
# Then apply all configurations
kubectl apply -f k8s/
```

### 12.3 Check Deployment Status

```bash
# Check pods
kubectl get pods -n ai-news

# Check services  
kubectl get svc -n ai-news

# Get load balancer URL
kubectl get svc -n ai-news -o wide
```

---

## Step 13: Setting Up Your Domain

### 13.1 Get Load Balancer URLs

```bash
kubectl get svc -n ai-news
```

You'll see something like:
```
NAME                  TYPE           EXTERNAL-IP
api-gateway-service   LoadBalancer   a1234...elb.amazonaws.com
admin-portal-service  LoadBalancer   a5678...elb.amazonaws.com  
viewer-portal-service LoadBalancer   a9012...elb.amazonaws.com
```

### 13.2 Option A: Use AWS Load Balancer URLs

You can access your services directly:
- API: http://a1234...elb.amazonaws.com:3001
- Admin: http://a5678...elb.amazonaws.com:3000
- Viewer: http://a9012...elb.amazonaws.com:3000

### 13.3 Option B: Set Up Custom Domain

1. Buy domain from Route53 or transfer existing
2. In Route53, create A records:
   - `api.yourdomain.com` → API load balancer
   - `admin.yourdomain.com` → Admin load balancer
   - `yourdomain.com` → Viewer load balancer

---

## Troubleshooting Common Issues

### Issue: "Cannot connect to database"
**Solution**: 
- Check Supabase credentials in `.env` files
- Ensure secrets are created in Kubernetes
- Verify Supabase project is active

### Issue: "Pods are crashing"
**Solution**:
```bash
# Check pod logs
kubectl logs -f pod-name -n ai-news

# Describe pod for events
kubectl describe pod pod-name -n ai-news
```

### Issue: "Cannot access website"
**Solution**:
- Check security groups in AWS
- Ensure load balancer is active
- Wait 2-3 minutes for DNS propagation

### Issue: "Build fails in GitHub Actions"
**Solution**:
- Check GitHub secrets are set correctly
- Verify AWS credentials have necessary permissions
- Check Docker build logs in Actions tab

---

## Next Steps

1. **Add Authentication**: Implement proper JWT authentication
2. **Add More Features**: 
   - User comments
   - Article search
   - Categories filter
   - Admin analytics charts
3. **Optimize Performance**:
   - Add caching with Redis
   - Implement CDN for images
   - Add database indexes
4. **Enhance Security**:
   - Add API rate limiting
   - Implement HTTPS certificates
   - Add Web Application Firewall

---

## Useful Commands Reference

```bash
# Kubernetes
kubectl get all -n ai-news          # See all resources
kubectl logs -f deployment/api-gateway -n ai-news  # View logs
kubectl scale deployment/api-gateway --replicas=3 -n ai-news  # Scale

# Docker
docker ps                           # List running containers
docker logs container-id            # View container logs
docker exec -it container-id sh     # Access container shell

# AWS
aws ecr describe-repositories       # List ECR repos
aws eks list-clusters              # List EKS clusters
```

---

## Cost Estimation

**Monthly costs (approximate):**
- EKS Cluster: $72 (runs 24/7)
- EC2 Instances (2x t3.small): $30
- Load Balancers (3x): $50
- ECR Storage: $1
- Data Transfer: $5-10
- **Total: ~$160/month**

**Cost Optimization Tips:**
1. Use single load balancer with path-based routing
2. Scale down to 1 node for development
3. Stop cluster when not in use
4. Use Fargate Spot for non-critical workloads

---

## Congratulations! 🎉

You've successfully deployed a microservices-based AI news application! Your app is now:
- ✅ Running in Kubernetes
- ✅ Auto-scaling based on load
- ✅ Continuously deployed via GitHub
- ✅ Accessible via web URLs
- ✅ Storing data in Supabase

Remember to monitor your AWS costs and scale resources based on actual usage.

For questions or issues, feel free to:
1. Check AWS documentation
2. Review Kubernetes docs
3. Consult Supabase guides
4. Ask in developer communities

Happy coding! 🚀