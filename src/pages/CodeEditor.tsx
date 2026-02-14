import { useState, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, Terminal, ChevronDown, RotateCcw, Copy, Check, Send, BookOpen, FlaskConical, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const LANGUAGES = [
  { value: "python", label: "Python", monacoId: "python", template: 'print("Hello, World!")' },
  { value: "javascript", label: "JavaScript", monacoId: "javascript", template: 'console.log("Hello, World!");' },
  { value: "java", label: "Java", monacoId: "java", template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
  { value: "c", label: "C", monacoId: "c", template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { value: "cpp", label: "C++", monacoId: "cpp", template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
];

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface Experiment {
  id: string;
  title: string;
  description: string | null;
  experiment_number: number | null;
  subject_id: string;
}

interface Submission {
  experiment_id: string;
  status: string;
}

type View = "subjects" | "experiments" | "editor";

const CodeEditorPage = () => {
  const { user } = useAuth();
  const [view, setView] = useState<View>("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch enrolled subjects
  useEffect(() => {
    if (!user) return;
    const fetchSubjects = async () => {
      const { data: enrollments } = await supabase
        .from("student_subjects")
        .select("subject_id")
        .eq("student_id", user.id);

      if (enrollments && enrollments.length > 0) {
        const subjectIds = enrollments.map((e) => e.subject_id);
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("id, name, code")
          .in("id", subjectIds);
        if (subjectsData) setSubjects(subjectsData);
      }
    };
    fetchSubjects();
  }, [user]);

  // Fetch experiments when subject selected
  useEffect(() => {
    if (!selectedSubject || !user) return;
    const fetchExperiments = async () => {
      const { data: exps } = await supabase
        .from("experiments")
        .select("*")
        .eq("subject_id", selectedSubject.id)
        .order("experiment_number");
      if (exps) setExperiments(exps);

      const { data: subs } = await supabase
        .from("experiment_submissions")
        .select("experiment_id, status")
        .eq("student_id", user.id);
      if (subs) setSubmissions(subs);
    };
    fetchExperiments();
  }, [selectedSubject, user]);

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    const lang = LANGUAGES.find((l) => l.value === val);
    if (lang) setCode(lang.template);
    setOutput("");
  };

  const runCode = useCallback(async () => {
    setIsRunning(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("execute-code", {
        body: { code, language, stdin },
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
      toast.error("Execution failed");
    } finally {
      setIsRunning(false);
    }
  }, [code, language, stdin]);

  const submitCode = async () => {
    if (!user || !selectedExperiment) return;
    setIsSubmitting(true);
    try {
      // Check if already submitted
      const { data: existing } = await supabase
        .from("experiment_submissions")
        .select("id")
        .eq("student_id", user.id)
        .eq("experiment_id", selectedExperiment.id)
        .maybeSingle();

      if (existing) {
        // Update existing submission
        const { error } = await supabase
          .from("experiment_submissions")
          .update({ code, language, status: "submitted" })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Submission updated!");
      } else {
        // New submission
        const { error } = await supabase
          .from("experiment_submissions")
          .insert({
            student_id: user.id,
            experiment_id: selectedExperiment.id,
            code,
            language,
            status: "submitted",
          });
        if (error) throw error;
        toast.success("Code submitted for evaluation!");
      }

      // Refresh submissions
      const { data: subs } = await supabase
        .from("experiment_submissions")
        .select("experiment_id, status")
        .eq("student_id", user.id);
      if (subs) setSubmissions(subs);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSubmissionStatus = (expId: string) => {
    return submissions.find((s) => s.experiment_id === expId)?.status;
  };

  const monacoLang = LANGUAGES.find((l) => l.value === language)?.monacoId || "python";

  // Subject selection view
  if (view === "subjects") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Code Editor</h1>
          <p className="text-muted-foreground mt-1">Select a subject to view experiments</p>
        </div>
        {subjects.length === 0 ? (
          <Card className="p-8 text-center shadow-card">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Subjects Enrolled</h3>
            <p className="text-sm text-muted-foreground mb-4">You need to enroll in subjects first to access experiments.</p>
            <Button onClick={() => window.location.href = "/enroll"} className="gradient-primary text-primary-foreground">
              Enroll in Subjects
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject, i) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  onClick={() => {
                    setSelectedSubject(subject);
                    setView("experiments");
                  }}
                  className="p-5 cursor-pointer shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{subject.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{subject.code}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Experiments list view
  if (view === "experiments" && selectedSubject) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <button
            onClick={() => { setView("subjects"); setSelectedSubject(null); }}
            className="flex items-center gap-1 text-sm text-primary font-medium hover:underline mb-3"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Subjects
          </button>
          <h1 className="text-2xl font-bold text-foreground">{selectedSubject.name}</h1>
          <p className="text-muted-foreground mt-1">Select an experiment to start coding</p>
        </div>
        <div className="space-y-3">
          {experiments.map((exp, i) => {
            const status = getSubmissionStatus(exp.id);
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  onClick={() => {
                    setSelectedExperiment(exp);
                    setView("editor");
                    setCode(LANGUAGES.find((l) => l.value === language)?.template || "");
                    setOutput("");
                  }}
                  className="p-4 cursor-pointer shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                        {exp.experiment_number || "—"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{exp.title}</p>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{exp.description}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      {status === "submitted" && <Badge variant="secondary" className="bg-primary/15 text-primary">Submitted</Badge>}
                      {status === "evaluated" && <Badge variant="secondary" className="bg-accent/15 text-accent">Evaluated</Badge>}
                      {!status && <Badge variant="outline" className="text-muted-foreground">Not Started</Badge>}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </DashboardLayout>
    );
  }

  // Code editor view
  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <button
              onClick={() => { setView("experiments"); setSelectedExperiment(null); }}
              className="flex items-center gap-1 text-sm text-primary font-medium hover:underline mb-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Experiments
            </button>
            <h1 className="text-lg font-bold text-foreground">
              {selectedExperiment ? `Exp ${selectedExperiment.experiment_number}: ${selectedExperiment.title}` : "Code Editor"}
            </h1>
            {selectedExperiment?.description && (
              <p className="text-xs text-muted-foreground">{selectedExperiment.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setShowInput(!showInput)} className="text-muted-foreground">
              <Terminal className="w-4 h-4 mr-1" />
              Input
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showInput ? "rotate-180" : ""}`} />
            </Button>
            <Button onClick={runCode} disabled={isRunning} className="gradient-primary text-primary-foreground shadow-glow-sm">
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? "Running..." : "Run"}
            </Button>
            {selectedExperiment && (
              <Button
                onClick={submitCode}
                disabled={isSubmitting || !code.trim()}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit
              </Button>
            )}
          </div>
        </div>

        {/* Editor + Output */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="flex-1 rounded-lg overflow-hidden border border-border bg-card">
              <Editor
                height="100%"
                language={monacoLang}
                value={code}
                onChange={(val) => setCode(val || "")}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: "on",
                  renderLineHighlight: "gutter",
                  automaticLayout: true,
                }}
              />
            </div>
            {showInput && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Standard Input (stdin)</label>
                <Textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Enter input for your program..."
                  className="font-mono text-sm bg-card border-border h-20 resize-none"
                />
              </motion.div>
            )}
          </div>

          <div className="flex flex-col min-h-0">
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
            <div className="flex-1 rounded-lg border border-border bg-card p-4 overflow-auto font-mono text-sm">
              {isRunning ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing...</span>
                </div>
              ) : output ? (
                <pre className="whitespace-pre-wrap text-foreground">{output}</pre>
              ) : (
                <span className="text-muted-foreground">Run your code to see output here...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CodeEditorPage;
