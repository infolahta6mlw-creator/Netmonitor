import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Traffic from "./pages/Traffic";
import Alerts from "./pages/Alerts";
import Topology from "./pages/Topology";
import Logs from "./pages/Logs";
import Users from "./pages/Users";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";

function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/devices" element={<Devices />} />
                        <Route path="/traffic" element={<Traffic />} />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/topology" element={<Topology />} />
                        <Route path="/logs" element={<Logs />} />
                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute roles={["superadmin", "admin"]}>
                                    <Users />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/agents"
                            element={
                                <ProtectedRoute roles={["superadmin", "admin"]}>
                                    <Agents />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AppProvider>
    );
}

export default App;
