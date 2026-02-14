import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { BookOpen, FlaskConical, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  department: string | null;
  description: string | null;
}

const SubjectEnrollment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (department) {
      supabase
        .from("subjects")
        .select("*")
        .eq("department", department)
        .then(({ data }) => {
          if (data) setSubjects(data);
        });
    }
  }, [department]);

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!user || selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }
    setLoading(true);
    try {
      // Update profile with year
      await supabase
        .from("profiles")
        .update({ year: parseInt(year), department })
        .eq("id", user.id);

      // Enroll in subjects
      const enrollments = selectedSubjects.map((subject_id) => ({
        student_id: user.id,
        subject_id,
      }));

      const { error } = await supabase.from("student_subjects").insert(enrollments);
      if (error) throw error;

      toast.success("Subjects enrolled successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/6 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <FlaskConical className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Select Your Subjects</h1>
            <p className="text-sm text-muted-foreground">Choose your department, year, and lab subjects</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step >= 1 ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            1. Department & Year
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step >= 2 ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            2. Choose Subjects
          </div>
        </div>

        {step === 1 && (
          <Card className="p-6 shadow-card">
            <div className="space-y-5">
              <div>
                <Label className="text-foreground">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="mt-1.5 bg-card border-border">
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSE">Computer Science & Engineering (CSE)</SelectItem>
                    <SelectItem value="IT">Information Technology (IT)</SelectItem>
                    <SelectItem value="AIDS">AI & Data Science (AIDS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="mt-1.5 bg-card border-border">
                    <SelectValue placeholder="Select your year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!department || !year}
                className="w-full gradient-primary text-primary-foreground shadow-glow-sm"
              >
                Next: Choose Subjects
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-primary font-medium hover:underline mb-2"
            >
              ← Back to Department & Year
            </button>
            <p className="text-sm text-muted-foreground mb-4">
              Showing subjects for <span className="font-semibold text-foreground">{department}</span> department. Select the labs you want to enroll in.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((subject, i) => {
                const isSelected = selectedSubjects.includes(subject.id);
                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      onClick={() => toggleSubject(subject.id)}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-glow-sm"
                          : "hover:border-primary/30 hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "gradient-primary" : "bg-secondary"
                        }`}>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-primary-foreground" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{subject.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{subject.code}</p>
                          {subject.description && (
                            <p className="text-xs text-muted-foreground mt-1">{subject.description}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {subjects.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No subjects found for this department.</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading || selectedSubjects.length === 0}
              className="w-full gradient-primary text-primary-foreground shadow-glow-sm mt-4"
            >
              {loading ? "Enrolling..." : `Enroll in ${selectedSubjects.length} Subject${selectedSubjects.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SubjectEnrollment;
