import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FlaskConical, LayoutDashboard, Users, BookOpen, FileText,
  Settings, LogOut, Code, GraduationCap, ChevronRight, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/users", icon: Users, label: "User Management" },
  { to: "/dashboard/subjects", icon: BookOpen, label: "Subjects" },
  { to: "/dashboard/experiments", icon: FlaskConical, label: "Experiments" },
  { to: "/dashboard/bulk-upload", icon: Upload, label: "Bulk Upload" },
];

const facultyLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/subjects", icon: BookOpen, label: "My Subjects" },
  { to: "/dashboard/submissions", icon: FileText, label: "Submissions" },
  { to: "/dashboard/evaluate", icon: GraduationCap, label: "Evaluate" },
];

const studentLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/subjects", icon: BookOpen, label: "My Subjects" },
  { to: "/dashboard/submissions", icon: FileText, label: "My Submissions" },
  { to: "/dashboard/editor", icon: Code, label: "Code Editor" },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = role === "admin" ? adminLinks : role === "faculty" ? facultyLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm">LabRecord</h1>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{role} Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLayout;
