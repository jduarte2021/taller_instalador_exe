import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import TaskPage from './pages/TaskPage'
import TaskFormPage from './pages/TaskFormPage'
import ProfilePage from './pages/ProfilePage'
import DashboardPage from './pages/DashboardPage'
import StatsPage from './pages/StatsPage'
import ClientsPage from './pages/ClientsPage'
import UsersAdminPage from './pages/UsersAdminPage'
import LogsPage from './pages/LogsPage'
import ProtectedRoute from './ProtectedRoute.jsx'
import { TaskProvider } from './context/TaskContext'
import TaskSearchPage from "./pages/TaskSearchPage"
import Sidebar from "./components/Sidebar"

function AppContent() {
  const location = useLocation();
  const hideSidebar = ["/", "/login", "/register"].includes(location.pathname);
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg,#060f1e)" }}>
      {!hideSidebar && <Sidebar />}
      <div className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TaskPage />} />
            <Route path="/add-task" element={<TaskFormPage />} />
            <Route path="/task/:id" element={<TaskFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/search-tasks" element={<TaskSearchPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/users-admin" element={<UsersAdminPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TaskProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TaskProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
