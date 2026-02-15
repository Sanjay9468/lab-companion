import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, FlaskConical, CheckCircle2, Clock, Code, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";

interface SubjectWithProgress {
  id: string;
  name: string;
  code: string | null;
  department: string | null;
  totalExperiments: number;
  submitted: number;
  evaluated: number;
}

const MySubjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get enrolled subject IDs
      const { data: enrollments } = await supabase
        .from("student_subjects")
        .select("subject_id")
        .eq("student_id", user.id);

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const subjectIds = enrollments.map((e) => e.subject_id);

      // Fetch subjects, experiments, and submissions in parallel
      const [subjectsRes, experimentsRes, submissionsRes] = await Promise.all([
        supabase.from("subjects").select("id, name, code, department").in("id", subjectIds),
        supabase.from("experiments").select("id, subject_id").in("subject_id", subjectIds),
        supabase
          .from("experiment_submissions")
          .select("experiment_id, status")
          .eq("student_id", user.id),
      ]);

      const subjectsData = subjectsRes.data || [];
      const experiments = experimentsRes.data || [];
      const submissions = submissionsRes.data || [];

      const mapped: SubjectWithProgress[] = subjectsData.map((s) => {
        const subExps = experiments.filter((e) => e.subject_id === s.id);
        const subExpIds = new Set(subExps.map((e) => e.id));
        const relevantSubs = submissions.filter((sub) => subExpIds.has(sub.experiment_id));

        return {
          id: s.id,
          name: s.name,
          code: s.code,
          department: s.department,
          totalExperiments: subExps.length,
          submitted: relevantSubs.filter((sub) => sub.status === "submitted").length,
          evaluated: relevantSubs.filter((sub) => sub.status === "evaluated").length,
        };
      });

      setSubjects(mapped);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const totalExps = subjects.reduce((a, s) => a + s.totalExperiments, 0);
  const totalDone = subjects.reduce((a, s) => a + s.submitted + s.evaluated, 0);
  const totalEvaluated = subjects.reduce((a, s) => a + s.evaluated, 0);
  const overallProgress = totalExps > 0 ? Math.round((totalDone / totalExps) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Subjects</h1>
        <p className="text-muted-foreground mt-1">Track your progress across enrolled lab subjects</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BookOpen, label: "Enrolled", value: subjects.length, glow: true },
          { icon: FlaskConical, label: "Total Experiments", value: totalExps },
          { icon: CheckCircle2, label: "Completed", value: totalDone },
          { icon: Clock, label: "Pending", value: totalExps - totalDone },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`p-4 shadow-card ${stat.glow ? "glow-border" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.glow ? "gradient-primary shadow-glow-sm" : "bg-secondary"}`}>
                  <stat.icon className={`w-4 h-4 ${stat.glow ? "text-primary-foreground" : "text-primary"}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Overall progress */}
      <Card className="p-5 shadow-card mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Overall Progress</span>
          <span className="text-sm font-bold text-primary">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2.5" />
        <p className="text-xs text-muted-foreground mt-2">
          {totalDone} of {totalExps} experiments completed · {totalEvaluated} evaluated
        </p>
      </Card>

      {/* Subjects grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground animate-pulse">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <Card className="p-8 text-center shadow-card">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No Subjects Enrolled</h3>
          <p className="text-sm text-muted-foreground mb-4">Enroll in subjects to start tracking your lab progress.</p>
          <Button onClick={() => navigate("/enroll")} className="gradient-primary text-primary-foreground">
            Enroll Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, i) => {
            const done = subject.submitted + subject.evaluated;
            const progress = subject.totalExperiments > 0 ? Math.round((done / subject.totalExperiments) * 100) : 0;

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-5 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">{subject.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {subject.code && <span className="text-xs text-muted-foreground">{subject.code}</span>}
                        {subject.department && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{subject.department}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{done}/{subject.totalExperiments} experiments</span>
                      <span className="text-foreground font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {/* Status chips */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      {subject.submitted} submitted
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                      {subject.evaluated} evaluated
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                      {subject.totalExperiments - done} pending
                    </span>
                  </div>

                  {/* Action button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-auto w-full justify-between text-primary hover:bg-primary/10"
                    onClick={() => navigate("/dashboard/editor")}
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Open in Editor
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MySubjects;
