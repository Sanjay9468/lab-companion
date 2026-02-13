import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Users, BookOpen, FlaskConical, FileText,
  TrendingUp, Clock, CheckCircle2
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, glow }: { icon: any; label: string; value: string; glow?: boolean }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <Card className={`p-5 shadow-card hover:shadow-card-hover transition-all duration-300 ${glow ? "glow-border" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${glow ? "gradient-primary shadow-glow-sm" : "bg-secondary"}`}>
          <Icon className={`w-5 h-5 ${glow ? "text-primary-foreground" : "text-primary"}`} />
        </div>
      </div>
    </Card>
  </motion.div>
);

const AdminDashboard = () => (
  <>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-1">Overview of the lab record management system</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard icon={Users} label="Total Users" value="248" glow />
      <StatCard icon={BookOpen} label="Active Subjects" value="16" />
      <StatCard icon={FlaskConical} label="Experiments" value="142" />
      <StatCard icon={FileText} label="Submissions" value="1,847" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 shadow-card">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { text: "New student batch uploaded (CSE - 60 students)", time: "2 hours ago", icon: Users },
            { text: "Python Programming Lab - 5 new experiments added", time: "5 hours ago", icon: FlaskConical },
            { text: "Faculty Dr. Kumar assigned to Data Structures Lab", time: "1 day ago", icon: BookOpen },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
              <item.icon className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="text-sm text-foreground">{item.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 shadow-card">
        <h3 className="font-semibold text-foreground mb-4">Department Overview</h3>
        <div className="space-y-4">
          {[
            { dept: "CSE", students: 120, faculty: 8, color: "bg-primary" },
            { dept: "IT", students: 80, faculty: 6, color: "bg-accent" },
            { dept: "AIDS", students: 48, faculty: 4, color: "bg-warning" },
          ].map((d) => (
            <div key={d.dept} className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${d.color}`} />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{d.dept}</span>
                  <span className="text-xs text-muted-foreground">{d.students} students · {d.faculty} faculty</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${(d.students / 120) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>
);

const FacultyDashboard = () => (
  <>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
      <p className="text-muted-foreground mt-1">Manage your subjects and evaluate submissions</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard icon={BookOpen} label="My Subjects" value="3" glow />
      <StatCard icon={FileText} label="Pending Reviews" value="24" />
      <StatCard icon={CheckCircle2} label="Evaluated" value="156" />
      <StatCard icon={TrendingUp} label="Avg Score" value="78%" />
    </div>
    <Card className="p-6 shadow-card">
      <h3 className="font-semibold text-foreground mb-4">Assigned Subjects</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Data Structures Laboratory", dept: "CSE", pending: 8, total: 45 },
          { name: "Python Programming", dept: "IT", pending: 12, total: 38 },
          { name: "Database Management Systems", dept: "AIDS", pending: 4, total: 30 },
        ].map((s) => (
          <Card key={s.name} className="p-4 border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer">
            <h4 className="font-medium text-sm text-foreground">{s.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">{s.dept} Department</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{s.pending} pending</span>
              <span className="text-xs text-muted-foreground">{s.total} students</span>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  </>
);

const StudentDashboard = () => (
  <>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
      <p className="text-muted-foreground mt-1">View your subjects, submit lab work, and track progress</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard icon={BookOpen} label="Enrolled Subjects" value="5" glow />
      <StatCard icon={Clock} label="Pending" value="7" />
      <StatCard icon={CheckCircle2} label="Submitted" value="18" />
      <StatCard icon={TrendingUp} label="Avg Score" value="82%" />
    </div>
    <Card className="p-6 shadow-card">
      <h3 className="font-semibold text-foreground mb-4">My Subjects</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: "Problem Solving & Python Programming", exps: 10, done: 7, color: "bg-primary" },
          { name: "Data Structures Laboratory", exps: 12, done: 5, color: "bg-accent" },
          { name: "Object Oriented Programming", exps: 8, done: 3, color: "bg-warning" },
          { name: "Database Management Systems", exps: 10, done: 8, color: "bg-destructive" },
          { name: "Computer Networks", exps: 6, done: 3, color: "bg-primary" },
        ].map((s) => (
          <Card key={s.name} className="p-4 border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <h4 className="font-medium text-sm text-foreground">{s.name}</h4>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{s.done}/{s.exps} experiments</span>
                <span className="text-foreground font-medium">{Math.round((s.done / s.exps) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary">
                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.done / s.exps) * 100}%` }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  </>
);

const Dashboard = () => {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === "admin" && <AdminDashboard />}
      {role === "faculty" && <FacultyDashboard />}
      {role === "student" && <StudentDashboard />}
      {!role && (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
