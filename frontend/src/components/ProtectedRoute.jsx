import React from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

export default function ProtectedRoute({ children, roles }) {
    const { user } = useApp();
    if (user === null) {
        return (
            <div className="min-h-screen flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2 pulse-dot text-primary" />
                Loading...
            </div>
        );
    }
    if (user === false) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
}
