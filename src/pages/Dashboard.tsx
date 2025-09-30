import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, FileText, TrendingUp, Users, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalResumes: 0,
    avgScore: 0,
    recentActivity: 0
  });
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user role
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
            <p className="text-muted-foreground">Upload and analyze candidate resumes</p>
          </Card>

          <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer" onClick={() => navigate("/rankings")}>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-success/10 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold">View Rankings</h3>
            </div>
            <p className="text-muted-foreground">See AI-powered candidate rankings</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;