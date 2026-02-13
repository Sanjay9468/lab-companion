import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { motion } from "framer-motion";
import { Play, Loader2, Terminal, ChevronDown, RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const LANGUAGES = [
  { value: "python", label: "Python", monacoId: "python", template: 'print("Hello, World!")' },
  { value: "javascript", label: "JavaScript", monacoId: "javascript", template: 'console.log("Hello, World!");' },
  { value: "java", label: "Java", monacoId: "java", template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
  { value: "c", label: "C", monacoId: "c", template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { value: "cpp", label: "C++", monacoId: "cpp", template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
];

const CodeEditorPage = () => {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const monacoLang = LANGUAGES.find((l) => l.value === language)?.monacoId || "python";

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Code Editor</h1>
            <p className="text-sm text-muted-foreground">Write, run, and test your code</p>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInput(!showInput)}
              className="text-muted-foreground"
            >
              <Terminal className="w-4 h-4 mr-1" />
              Input
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showInput ? "rotate-180" : ""}`} />
            </Button>
            <Button
              onClick={runCode}
              disabled={isRunning}
              className="gradient-primary text-primary-foreground shadow-glow-sm"
            >
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? "Running..." : "Run Code"}
            </Button>
          </div>
        </div>

        {/* Editor + Output */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Editor */}
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

          {/* Output */}
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
