import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import {
  BookOpen, ChevronLeft, Play, Loader2, CheckCircle2,
  MessageSquare, Send, User, Clock, FlaskConical, Terminal,
  Copy, Check, RotateCcw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface Submission {
  id: string;
  student_id: string;
  experiment_id: string;
  code: string | null;
  language: string | null;
  status: string;
  submitted_at: string;
  student_name: string;
  student_email: string;
  experiment_title: string;
  experiment_number: number | null;
  marks: number | null;
  feedback: string | null;
}

type View = "subjects" | "submissions" | "evaluate";

const FacultyEvaluate = () => {
  const { user } = useAuth();
  const [view, setView] = useState<View>("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [subjectStats, setSubjectStats] = useState<Record<string, { total: number; pending: number; evaluated: number }>>({});

  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch assigned subjects
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: assignments } = await supabase
        .from("faculty_subjects")
        .select("subject_id")
        .eq("faculty_id", user.id);

      if (!assignments || assignments.length === 0) {
        setLoading(false);
        return;
      }

      const subjectIds = assignments.map((a) => a.subject_id);
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, name, code")
        .in("id", subjectIds);

      if (subjectsData) setSubjects(subjectsData);

      // Get stats per subject
      const { data: experiments } = await supabase
        .from("experiments")
        .select("id, subject_id")
        .in("subject_id", subjectIds);

      if (experiments && experiments.length > 0) {
        const expIds = experiments.map((e) => e.id);
        const { data: subs } = await supabase
          .from("experiment_submissions")
          .select("id, experiment_id, status")
          .in("experiment_id", expIds);

        const stats: Record<string, { total: number; pending: number; evaluated: number }> = {};
        for (const s of subjectsData || []) {
          const subjectExpIds = new Set(experiments.filter((e) => e.subject_id === s.id).map((e) => e.id));
          const subjectSubs = (subs || []).filter((sub) => subjectExpIds.has(sub.experiment_id));
          stats[s.id] = {
            total: subjectSubs.length,
            pending: subjectSubs.filter((sub) => sub.status === "submitted").length,
            evaluated: subjectSubs.filter((sub) => sub.status === "evaluated").length,
          };
        }
        setSubjectStats(stats);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  // Fetch submissions for selected subject
  useEffect(() => {
    if (!selectedSubject || !user) return;
    const fetchSubmissions = async () => {
      // Get experiments for this subject
      const { data: experiments } = await supabase
        .from("experiments")
        .select("id, title, experiment_number")
        .eq("subject_id", selectedSubject.id)
        .order("experiment_number");

      if (!experiments || experiments.length === 0) {
        setSubmissions([]);
        return;
      }

      const expIds = experiments.map((e) => e.id);
      const { data: subs } = await supabase
        .from("experiment_submissions")
        .select("*")
        .in("experiment_id", expIds)
        .order("submitted_at", { ascending: false });

      if (!subs || subs.length === 0) {
        setSubmissions([]);
        return;
      }

      // Get student profiles
      const studentIds = [...new Set(subs.map((s) => s.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      // Get existing evaluations
      const subIds = subs.map((s) => s.id);
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select("submission_id, marks, feedback")
        .in("submission_id", subIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const evalMap = new Map((evaluations || []).map((e) => [e.submission_id, e]));
      const expMap = new Map(experiments.map((e) => [e.id, e]));

      const mapped: Submission[] = subs.map((s) => {
        const profile = profileMap.get(s.student_id);
        const exp = expMap.get(s.experiment_id);
        const eval_ = evalMap.get(s.id);
        return {
          ...s,
          student_name: profile?.full_name || "Unknown",
          student_email: s.student_id,
          experiment_title: exp?.title || "Unknown",
          experiment_number: exp?.experiment_number || null,
          marks: eval_?.marks ?? null,
          feedback: eval_?.feedback ?? null,
        };
      });

      setSubmissions(mapped);
    };
    fetchSubmissions();
  }, [selectedSubject, user]);

  const runCode = useCallback(async () => {
    if (!selectedSubmission?.code) return;
    setIsRunning(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("execute-code", {
        body: { code: selectedSubmission.code, language: selectedSubmission.language || "python", stdin: "" },
      });
      if (error) throw error;
      let result = "";
      if (data.compileError) result += `⚠️ Compile Error:\n${data.compileError}\n`;
      if (data.compileOutput) result += `Compile:\n${data.compileOutput}\n`;
      if (data.stdout) result += data.stdout;
      if (data.stderr) result += `\n⚠️ ${data.stderr}`;
      if (!result.trim()) result = "(No output)";
      setOutput(result);
    } catch (err: any) {
      setOutput(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedSubmission]);

  const submitEvaluation = async () => {
    if (!user || !selectedSubmission) return;
    const marksNum = parseInt(marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      toast.error("Marks must be between 0 and 100");
      return;
    }
    if (!feedback.trim()) {
      toast.error("Please provide feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if evaluation already exists
      const { data: existing } = await supabase
        .from("evaluations")
        .select("id")
        .eq("submission_id", selectedSubmission.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("evaluations")
          .update({ marks: marksNum, feedback: feedback.trim() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("evaluations")
          .insert({
            submission_id: selectedSubmission.id,
            faculty_id: user.id,
            marks: marksNum,
            feedback: feedback.trim(),
          });
        if (error) throw error;
      }

      // Update submission status
      await supabase
        .from("experiment_submissions")
        .update({ status: "evaluated" })
        .eq("id", selectedSubmission.id);

      toast.success("Evaluation submitted successfully!");

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id
            ? { ...s, status: "evaluated", marks: marksNum, feedback: feedback.trim() }
            : s
        )
      );
      setSelectedSubmission((prev) =>
        prev ? { ...prev, status: "evaluated", marks: marksNum, feedback: feedback.trim() } : prev
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evaluation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Subject selection view
  if (view === "subjects") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Evaluate Submissions</h1>
          <p className="text-muted-foreground mt-1">Select a subject to review student submissions</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground animate-pulse">Loading subjects...</p>
          </div>
        ) : subjects.length === 0 ? (
          <Card className="p-8 text-center shadow-card">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Subjects Assigned</h3>
            <p className="text-sm text-muted-foreground">You haven't been assigned to any subjects yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject, i) => {
              const stats = subjectStats[subject.id] || { total: 0, pending: 0, evaluated: 0 };
              const progress = stats.total > 0 ? Math.round((stats.evaluated / stats.total) * 100) : 0;

              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    onClick={() => {
                      setSelectedSubject(subject);
                      setView("submissions");
                    }}
                    className="p-5 cursor-pointer shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{subject.name}</h3>
                        {subject.code && <p className="text-xs text-muted-foreground mt-0.5">{subject.code}</p>}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{stats.evaluated}/{stats.total} evaluated</span>
                        <span className="text-foreground font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>

                    <div className="flex items-center gap-2">
                      {stats.pending > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                          {stats.pending} pending
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                        {stats.evaluated} evaluated
                      </span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Submissions list view
  if (view === "submissions" && selectedSubject) {
    const pending = submissions.filter((s) => s.status === "submitted");
    const evaluated = submissions.filter((s) => s.status === "evaluated");

    return (
      <DashboardLayout>
        <div className="mb-6">
          <button
            onClick={() => { setView("subjects"); setSelectedSubject(null); setSubmissions([]); }}
            className="flex items-center gap-1 text-sm text-primary font-medium hover:underline mb-3"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Subjects
          </button>
          <h1 className="text-2xl font-bold text-foreground">{selectedSubject.name}</h1>
          <p className="text-muted-foreground mt-1">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""} · {pending.length} pending review
          </p>
        </div>

        {submissions.length === 0 ? (
          <Card className="p-8 text-center shadow-card">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Submissions Yet</h3>
            <p className="text-sm text-muted-foreground">Students haven't submitted any experiments for this subject.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Review ({pending.length})
                </h3>
                <div className="space-y-2">
                  {pending.map((sub, i) => (
                    <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setMarks(sub.marks?.toString() || "");
                          setFeedback(sub.feedback || "");
                          setOutput("");
                          setView("evaluate");
                        }}
                        className="p-4 cursor-pointer shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                              {sub.experiment_number || "—"}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{sub.experiment_title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{sub.student_name}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{sub.language}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-primary/15 text-primary">Pending</Badge>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {evaluated.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Evaluated ({evaluated.length})
                </h3>
                <div className="space-y-2">
                  {evaluated.map((sub, i) => (
                    <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setMarks(sub.marks?.toString() || "");
                          setFeedback(sub.feedback || "");
                          setOutput("");
                          setView("evaluate");
                        }}
                        className="p-4 cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center text-sm font-bold text-accent">
                              {sub.experiment_number || "—"}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{sub.experiment_title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{sub.student_name}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs font-medium text-accent">{sub.marks}/100</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-accent/15 text-accent">Evaluated</Badge>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Evaluation view
  if (view === "evaluate" && selectedSubmission) {
    const monacoLang = selectedSubmission.language === "cpp" ? "cpp" :
      selectedSubmission.language === "c" ? "c" :
      selectedSubmission.language === "java" ? "java" :
      selectedSubmission.language === "javascript" ? "javascript" : "python";

    return (
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="mb-4">
            <button
              onClick={() => { setView("submissions"); setSelectedSubmission(null); setOutput(""); }}
              className="flex items-center gap-1 text-sm text-primary font-medium hover:underline mb-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Submissions
            </button>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Exp {selectedSubmission.experiment_number}: {selectedSubmission.experiment_title}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {selectedSubmission.student_name}
                  </span>
                  <Badge variant="outline" className="text-xs">{selectedSubmission.language}</Badge>
                  <Badge
                    variant="secondary"
                    className={selectedSubmission.status === "evaluated" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"}
                  >
                    {selectedSubmission.status === "evaluated" ? "Evaluated" : "Pending"}
                  </Badge>
                </div>
              </div>
              <Button onClick={runCode} disabled={isRunning || !selectedSubmission.code} className="gradient-primary text-primary-foreground shadow-glow-sm">
                {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                {isRunning ? "Running..." : "Run Code"}
              </Button>
            </div>
          </div>

          {/* Code + Output + Evaluation */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
            {/* Code viewer */}
            <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
              <div className="flex-1 rounded-lg overflow-hidden border border-border bg-card min-h-[300px]">
                <Editor
                  height="100%"
                  language={monacoLang}
                  value={selectedSubmission.code || "// No code submitted"}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    minimap: { enabled: false },
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Output */}
              <div className="rounded-lg border border-border bg-card p-4 max-h-48 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Output</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={copyOutput} disabled={!output}>
                      {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setOutput("")}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="font-mono text-sm">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing...</span>
                    </div>
                  ) : output ? (
                    <pre className="whitespace-pre-wrap text-foreground">{output}</pre>
                  ) : (
                    <span className="text-muted-foreground">Click "Run Code" to see output...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Evaluation panel */}
            <div className="flex flex-col gap-4 min-h-0">
              <Card className="p-5 shadow-card flex-1 flex flex-col">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Evaluation
                </h3>

                <div className="space-y-4 flex-1">
                  <div>
                    <Label className="text-foreground text-sm">Marks (0–100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      placeholder="Enter marks"
                      className="mt-1.5 bg-background border-border"
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <Label className="text-foreground text-sm">Feedback</Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide detailed feedback on the student's code..."
                      className="mt-1.5 bg-background border-border flex-1 min-h-[120px] resize-none"
                    />
                  </div>
                </div>

                <Button
                  onClick={submitEvaluation}
                  disabled={isSubmitting || !marks || !feedback.trim()}
                  className="w-full mt-4 gradient-primary text-primary-foreground shadow-glow-sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {selectedSubmission.status === "evaluated" ? "Update Evaluation" : "Submit Evaluation"}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return <DashboardLayout><div className="text-muted-foreground">Loading...</div></DashboardLayout>;
};

export default FacultyEvaluate;
