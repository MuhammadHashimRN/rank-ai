# RankSmart AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)

> AI-Powered Resume Ranking System for Modern Recruitment

RankSmart AI is a comprehensive recruitment management platform that leverages artificial intelligence to streamline candidate screening, intelligent ranking, and collaborative hiring decisions. Built with modern web technologies and cloud infrastructure, it reduces manual screening time by up to 80% while improving candidate matching accuracy.

## ✨ Features

### Core Functionality
- **🤖 AI-Powered Resume Parsing** - Automatically extract structured data from PDF, DOC, DOCX, and TXT files
- **🎯 Intelligent Candidate Ranking** - Semantic matching between job requirements and candidate profiles with detailed AI analysis
- **📊 Advanced Analytics Dashboard** - Visualize score distributions, skills gaps, and hiring metrics
- **🔍 Smart Filtering & Search** - Filter by skills, experience, score ranges, and full-text search
- **📁 Batch Upload Processing** - Upload multiple resumes with real-time progress tracking

### Collaboration Tools
- **📝 Candidate Notes** - Team collaboration with context-specific comments
- **⭐ Favorites System** - Shortlist and star top candidates
- **📤 Export to CSV** - Generate detailed reports of ranked candidates
- **👥 Role-Based Access** - Admin, recruiter, and viewer permissions

### Advanced Features
- **🔤 Skills Taxonomy** - Intelligent skill normalization (e.g., "React.js" → "React")
- **📄 Resume Viewer** - Built-in PDF viewer with download options
- **🎨 Responsive Design** - Optimized for desktop, tablet, and mobile
- **🌓 Dark/Light Mode** - System-aware theme support

## 🚀 Tech Stack

### Frontend
- **React 18.3** - Component-based UI framework
- **TypeScript** - Static typing and improved developer experience
- **Vite** - Fast build tool with HMR
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality UI components
- **TanStack Query** - Data fetching and caching
- **React Router v6** - Client-side routing
- **Recharts** - Data visualization

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database with auto-generated APIs
  - Row-Level Security (RLS) for data protection
  - Authentication & user management
  - File storage with CDN
  - Edge Functions (Deno runtime)

### AI & Processing
- AI-powered document parsing and semantic analysis
- Custom skill normalization engine
- Vector-based similarity scoring

## 📋 Prerequisites

- **Node.js** 16.x or higher
- **npm** or **yarn**
- **Supabase Account** (for backend services)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ranksmart-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
The `.env` file contains the Supabase configuration:
```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="your-supabase-url"
```

4. **Run the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🏗️ Project Structure

```
ranksmart-ai/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── AnalyticsCharts.tsx
│   │   ├── CandidateNotes.tsx
│   │   ├── ExportButton.tsx
│   │   ├── ResumeViewer.tsx
│   │   └── SkillInput.tsx
│   ├── pages/              # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── Jobs.tsx
│   │   ├── Rankings.tsx
│   │   └── Resumes.tsx
│   ├── integrations/       # External service integrations
│   │   └── supabase/
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── main.tsx            # Application entry point
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── parse-resume/
│   │   └── rank-resume/
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── index.html             # HTML template
```

## 🗄️ Database Schema

### Core Tables
- **profiles** - User information and metadata
- **user_roles** - Role-based access control
- **jobs** - Job postings with requirements
- **resumes** - Uploaded candidate resumes with parsed data
- **resume_rankings** - AI-generated scores and analysis
- **candidate_notes** - Collaborative notes
- **candidate_favorites** - Team member favorites
- **skill_synonyms** - Skill normalization taxonomy

All tables implement Row-Level Security (RLS) for data protection.

## 🔐 Security Features

- ✅ Row-Level Security (RLS) on all database tables
- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Secure file storage with signed URLs
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Encrypted API keys and secrets

## 🎯 Usage Guide

### 1. Create a Job Posting
- Navigate to the **Jobs** page
- Click "Create New Job"
- Enter job title, description, and required skills
- Skills are automatically normalized for better matching

### 2. Upload Resumes
- Go to the **Resumes** page
- Upload single or multiple resume files
- AI automatically parses and extracts candidate information
- View parsed data and make manual corrections if needed

### 3. Rank Candidates
- Navigate to the **Rankings** page
- Select a job from the dropdown
- Click "Rank Resumes" to generate AI-powered rankings
- View detailed match scores and analysis

### 4. Collaborate with Team
- Add notes to candidates for team context
- Star favorite candidates for quick access
- Filter and search to find the best matches
- Export ranked candidates to CSV

### 5. Analyze Hiring Data
- Visit the **Dashboard** for analytics
- View score distributions and skills gap analysis
- Track key metrics and trends

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Backend powered by [Supabase](https://supabase.com)
- Icons from [Lucide](https://lucide.dev)

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for better recruitment**
