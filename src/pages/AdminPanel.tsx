import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen, Plus, Users, UserPlus, Trash2, Search,
  GraduationCap, Upload, CheckCircle2, XCircle
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  department: string | null;
  description: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  department: string | null;
}

interface FacultyAssignment {
  id: string;
  faculty_id: string;
  subject_id: string;
  profiles?: { full_name: string | null } | null;
  subjects?: { name: string } | null;
}

const DEPARTMENTS = ["CSE", "IT", "AIDS"];

// ─── Subject Management ───
const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [newSubject, setNewSubject] = useState({ name: "", code: "", department: "CSE", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    if (data) setSubjects(data);
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleAdd = async () => {
    if (!newSubject.name.trim()) { toast.error("Subject name is required"); return; }
    setLoading(true);
    const { error } = await supabase.from("subjects").insert({
      name: newSubject.name.trim(),
      code: newSubject.code.trim() || null,
      department: newSubject.department,
      description: newSubject.description.trim() || null,
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success("Subject created");
      setNewSubject({ name: "", code: "", department: "CSE", description: "" });
      setDialogOpen(false);
      fetchSubjects();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Subject deleted"); fetchSubjects(); }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-glow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="text-foreground">Add New Subject</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-foreground">Name</Label>
                <Input className="mt-1 bg-background" value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Structures Laboratory" />
              </div>
              <div>
                <Label className="text-foreground">Code</Label>
                <Input className="mt-1 bg-background" value={newSubject.code} onChange={e => setNewSubject(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CS3301" />
              </div>
              <div>
                <Label className="text-foreground">Department</Label>
                <Select value={newSubject.department} onValueChange={v => setNewSubject(p => ({ ...p, department: v }))}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Description</Label>
                <Textarea className="mt-1 bg-background" value={newSubject.description} onChange={e => setNewSubject(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <Button onClick={handleAdd} disabled={loading} className="w-full gradient-primary text-primary-foreground">
                {loading ? "Creating..." : "Create Subject"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.code || "—"}</TableCell>
                <TableCell><Badge variant="secondary">{s.department || "—"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No subjects found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

// ─── Faculty Assignment ───
const FacultyAssignments = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    const [subRes, facRes, assRes] = await Promise.all([
      supabase.from("subjects").select("*").order("name"),
      supabase.from("profiles").select("*").eq("role", "faculty").order("full_name"),
      supabase.from("faculty_subjects").select("*, profiles:faculty_id(full_name), subjects:subject_id(name)"),
    ]);
    if (subRes.data) setSubjects(subRes.data);
    if (facRes.data) setFaculty(facRes.data);
    if (assRes.data) setAssignments(assRes.data as any);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAssign = async () => {
    if (!selectedFaculty || !selectedSubject) { toast.error("Select both faculty and subject"); return; }
    setLoading(true);
    const { error } = await supabase.from("faculty_subjects").insert({
      faculty_id: selectedFaculty,
      subject_id: selectedSubject,
    });
    if (error) toast.error(error.message?.includes("duplicate") ? "Already assigned" : error.message);
    else {
      toast.success("Faculty assigned to subject");
      setSelectedFaculty("");
      setSelectedSubject("");
      fetchAll();
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("faculty_subjects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Assignment removed"); fetchAll(); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 shadow-card">
        <h3 className="font-semibold text-foreground mb-4">Assign Faculty to Subject</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-foreground">Faculty</Label>
            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
              <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select faculty" /></SelectTrigger>
              <SelectContent>
                {faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name || f.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-foreground">Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={loading} className="gradient-primary text-primary-foreground shadow-glow-sm">
            <UserPlus className="w-4 h-4 mr-2" /> Assign
          </Button>
        </div>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faculty</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-foreground">{(a.profiles as any)?.full_name || a.faculty_id.slice(0, 8)}</TableCell>
                <TableCell className="text-muted-foreground">{(a.subjects as any)?.name || a.subject_id.slice(0, 8)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(a.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No assignments yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

// ─── Bulk Enroll Students ───
const BulkEnrollStudents = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [mode, setMode] = useState<"select" | "csv">("select");

  const fetchData = useCallback(async () => {
    const [subRes, stuRes] = await Promise.all([
      supabase.from("subjects").select("*").order("name"),
      supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
    ]);
    if (subRes.data) setSubjects(subRes.data);
    if (stuRes.data) setStudents(stuRes.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedStudents(filteredStudents.map(s => s.id));
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search);
    const matchDept = deptFilter === "all" || s.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleBulkEnroll = async () => {
    if (!selectedSubject) { toast.error("Select a subject"); return; }
    const ids = mode === "csv"
      ? csvText.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
      : selectedStudents;
    if (ids.length === 0) { toast.error("No students selected"); return; }

    setLoading(true);
    const enrollments = ids.map(student_id => ({ student_id, subject_id: selectedSubject }));
    const { error } = await supabase.from("student_subjects").insert(enrollments);
    if (error) toast.error(error.message);
    else {
      toast.success(`${ids.length} student(s) enrolled successfully`);
      setSelectedStudents([]);
      setCsvText("");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 shadow-card">
        <h3 className="font-semibold text-foreground mb-4">Bulk Enroll Students</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-foreground">Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select subject to enroll into" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.department})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant={mode === "select" ? "default" : "outline"} size="sm" onClick={() => setMode("select")}>
              <Users className="w-4 h-4 mr-1" /> Select Students
            </Button>
            <Button variant={mode === "csv" ? "default" : "outline"} size="sm" onClick={() => setMode("csv")}>
              <Upload className="w-4 h-4 mr-1" /> Paste IDs
            </Button>
          </div>

          {mode === "select" && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[130px] bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Depts</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={selectAll}>Select All ({filteredStudents.length})</Button>
              </div>

              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
                {filteredStudents.map(s => {
                  const selected = selectedStudents.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-border last:border-b-0 ${
                        selected ? "bg-primary/10" : "hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                      }`}>
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{s.department || "—"}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <p className="text-center text-muted-foreground py-6 text-sm">No students found</p>
                )}
              </div>
              {selectedStudents.length > 0 && (
                <p className="text-sm text-primary font-medium">{selectedStudents.length} student(s) selected</p>
              )}
            </div>
          )}

          {mode === "csv" && (
            <div>
              <Label className="text-foreground">Student IDs (one per line or comma-separated)</Label>
              <Textarea
                className="mt-1 bg-background font-mono text-xs"
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={6}
                placeholder={"paste-student-uuid-1\npaste-student-uuid-2\n..."}
              />
            </div>
          )}

          <Button onClick={handleBulkEnroll} disabled={loading || !selectedSubject} className="w-full gradient-primary text-primary-foreground shadow-glow-sm">
            {loading ? "Enrolling..." : "Enroll Students"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─── Main Admin Panel ───
const AdminPanel = () => {
  const { role } = useAuth();

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">Only admins can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage subjects, faculty assignments, and student enrollment</p>
        </div>

        <Tabs defaultValue="subjects" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="subjects" className="gap-2"><BookOpen className="w-4 h-4" /> Subjects</TabsTrigger>
            <TabsTrigger value="faculty" className="gap-2"><GraduationCap className="w-4 h-4" /> Faculty</TabsTrigger>
            <TabsTrigger value="enroll" className="gap-2"><Users className="w-4 h-4" /> Enroll Students</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects"><SubjectManagement /></TabsContent>
          <TabsContent value="faculty"><FacultyAssignments /></TabsContent>
          <TabsContent value="enroll"><BulkEnrollStudents /></TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
};

export default AdminPanel;
