import { React, useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/dashboard";
import Team from "./scenes/team";
import Invoices from "./scenes/invoices";
import Contacts from "./scenes/contacts";
import Bar from "./scenes/bar";
import Form from "./scenes/form";
import Line from "./scenes/line";
import Pie from "./scenes/pie";
import FAQ from "./scenes/faq";
import LoginForm from "./scenes/Login";
import Geography from "./scenes/geography";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Calendar from "./scenes/calendar/calendar";
import SignUp from "./scenes/sign-up";
import HistoryPage from "./components/History";
import AddBoard from "./scenes/newBoard";
import Task from "./scenes/task";
import Boards from "./scenes/boards";
import EmployeeListPage from "./scenes/adminBoard";
import BoardDetailsPage from "./scenes/boardDetails";
import EmployeeBoardsPage from "./scenes/employeeBoards";

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthentication = () => {
    setIsAuthenticated(true);
    localStorage.setItem("isAuthenticated", "true");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
    navigate("/Login");
  };

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/Login" />;
    }
    return children;
  };

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <div className="app">
            {isAuthenticated && <Sidebar isSidebar={isSidebar} />}
            <main className={`content ${!isAuthenticated ? "w-full" : ""}`}>
              {isAuthenticated && (
                <Topbar setIsSidebar={setIsSidebar} onLogout={handleLogout} />
              )}
              <Routes>
                {/* Public routes */}
                <Route
                  path="/Login"
                  element={
                    isAuthenticated ? (
                      <Navigate to="/dashboard" />
                    ) : (
                      <LoginForm onAuthentication={handleAuthentication} />
                    )
                  }
                />
                <Route path="/sign-up" element={<SignUp />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team"
                  element={
                    <ProtectedRoute>
                      <Team />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contacts"
                  element={
                    <ProtectedRoute>
                      <Contacts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invoices"
                  element={
                    <ProtectedRoute>
                      <Invoices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/form"
                  element={
                    <ProtectedRoute>
                      <Form />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bar"
                  element={
                    <ProtectedRoute>
                      <Bar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pie"
                  element={
                    <ProtectedRoute>
                      <Pie />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/line"
                  element={
                    <ProtectedRoute>
                      <Line />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/faq"
                  element={
                    <ProtectedRoute>
                      <FAQ />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute>
                      <Calendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/geography"
                  element={
                    <ProtectedRoute>
                      <Geography />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <HistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Board-related routes */}
                <Route
                  path="/boards/:boardId"
                  element={
                    <ProtectedRoute>
                      <Task />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/boards"
                  element={
                    <ProtectedRoute>
                      <Boards />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/newBoard"
                  element={
                    <ProtectedRoute>
                      <AddBoard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/adminBoard"
                  element={
                    <ProtectedRoute>
                      <EmployeeListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/boards/:boardId"
                  element={
                    <ProtectedRoute>
                      <BoardDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employeeBoards/:employeeId"
                  element={
                    <ProtectedRoute>
                      <EmployeeBoardsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all route */}
                <Route
                  path="*"
                  element={
                    isAuthenticated ? (
                      <Navigate to="/dashboard" />
                    ) : (
                      <Navigate to="/Login" />
                    )
                  }
                />
              </Routes>
            </main>
          </div>
        </LocalizationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;