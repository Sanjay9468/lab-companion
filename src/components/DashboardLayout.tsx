import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, LayoutDashboard, Users, BookOpen, FileText,
  LogOut, Code, GraduationCap, ChevronRight, Upload, Menu, X
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = role === "admin" ? adminLinks : role === "faculty" ? facultyLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const SidebarContent = () => (
    <>
      <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
          <FlaskConical className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-sidebar-foreground">LabRecord</h1>
          <p className="text-xs text-sidebar-foreground/40 capitalize">{role} Panel</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary/15 text-primary glow-border"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-glow-sm">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-sidebar-foreground">{user?.email}</p>
            <p className="text-xs text-sidebar-foreground/40 capitalize">{role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar flex-col fixed inset-y-0 left-0 z-30 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
            <FlaskConical className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-sidebar-foreground">LabRecord</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 w-64 bg-sidebar z-50 flex flex-col border-r border-sidebar-border"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLayout;
