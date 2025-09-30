import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/10">
      <header className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RankSmart AI
            </span>
          </div>
          <Button onClick={() => navigate("/auth")} size="lg">
            Get Started
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            AI-Powered Resume Ranking
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Streamline your recruitment with intelligent resume parsing and semantic matching
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Start Ranking
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-8 rounded-2xl bg-card/50 backdrop-blur-sm border shadow-card hover:shadow-elegant transition-all animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">AI Parsing</h3>
            <p className="text-muted-foreground">
              Automatically extract structured data from resumes using Google Gemini
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-card/50 backdrop-blur-sm border shadow-card hover:shadow-elegant transition-all animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Hybrid Ranking</h3>
            <p className="text-muted-foreground">
              Combine rule-based filters with semantic AI analysis for accurate matches
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-card/50 backdrop-blur-sm border shadow-card hover:shadow-elegant transition-all animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="bg-success/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Secure & Role-Based</h3>
            <p className="text-muted-foreground">
              Enterprise-grade security with admin and recruiter role management
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Powered by Supabase & Lovable AI Gateway (Gemini 2.5 Flash - FREE during promo)
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
