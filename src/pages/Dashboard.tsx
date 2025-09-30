import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, FileText, TrendingUp, Users, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalResumes: 0,
    avgScore: 0,
    recentActivity: 0
  });
  const [analyticsData, setAnalyticsData] = useState({
    skillsGap: [] as { skill: string; count: number }[],
    scoreDistribution: [] as { range: string; count: number }[]
  });
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    checkAuth();
    loadStats();
    loadAnalytics();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (roles) {
      setUserRole(roles.role);
    }
  };

  const loadStats = async () => {
    try {
      const [jobsRes, resumesRes, scoresRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact" }),
        supabase.from("resumes").select("id", { count: "exact" }),
        supabase.from("resumes").select("ranking_score"),
      ]);

      const scores = scoresRes.data?.filter(r => r.ranking_score !== null) || [];
      const avgScore = scores.length > 0
        ? scores.reduce((sum, r) => sum + (r.ranking_score || 0), 0) / scores.length
        : 0;

      setStats({
        totalJobs: jobsRes.count || 0,
        totalResumes: resumesRes.count || 0,
        avgScore: Math.round(avgScore),
        recentActivity: scores.length
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      // Get all resumes with skills and scores
      const { data: resumes } = await supabase
        .from("resumes")
        .select("parsed_skills, ranking_score");

      if (!resumes) return;

      // Calculate skills gap (most needed skills across all candidates)
      const skillCounts: Record<string, number> = {};
      resumes.forEach(resume => {
        resume.parsed_skills?.forEach((skill: string) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });

      const skillsGap = Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count }));

      // Calculate score distribution
      const scoreDistribution = [
        { range: '0-20', count: 0 },
        { range: '21-40', count: 0 },
        { range: '41-60', count: 0 },
        { range: '61-80', count: 0 },
        { range: '81-100', count: 0 }
      ];

      resumes.forEach(resume => {
        const score = resume.ranking_score || 0;
        if (score <= 20) scoreDistribution[0].count++;
        else if (score <= 40) scoreDistribution[1].count++;
        else if (score <= 60) scoreDistribution[2].count++;
        else if (score <= 80) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      });

      setAnalyticsData({ skillsGap, scoreDistribution });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  const statCards = [
    {
      title: "Active Jobs",
      value: stats.totalJobs,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Total Resumes",
      value: stats.totalResumes,
      icon: FileText,
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      title: "Avg Match Score",
      value: `${stats.avgScore}%`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Recent Rankings",
      value: stats.recentActivity,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RankSmart AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Role: <span className="font-medium text-foreground capitalize">{userRole}</span>
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">AI-powered recruitment analytics at a glance</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, idx) => (
            <Card key={idx} className="p-6 hover:shadow-elegant transition-all animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {stats.totalResumes > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-2xl font-bold mb-4">Analytics & Insights</h3>
            <AnalyticsCharts
              resumeCount={stats.totalResumes}
              avgScore={stats.avgScore}
              skillsGap={analyticsData.skillsGap}
              scoreDistribution={analyticsData.scoreDistribution}
            />
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer" onClick={() => navigate("/jobs")}>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Manage Jobs</h3>
            </div>
            <p className="text-muted-foreground">Create and manage job postings</p>
          </Card>

          <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer" onClick={() => navigate("/resumes")}>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-accent/10 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Upload Resumes</h3>
            </div>
            <p className="text-muted-foreground">Batch upload and analyze candidate resumes</p>
          </Card>

          <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer" onClick={() => navigate("/rankings")}>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-success/10 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">View Rankings</h3>
            </div>
            <p className="text-muted-foreground">Advanced filtering, notes, and export</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;