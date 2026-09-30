import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import CreateTicket from './pages/CreateTicket';
import Tickets from './pages/Tickets';
import MyTickets from './pages/MyTickets';
import TicketDetails from './pages/TicketDetails';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PlaceholderPage from './pages/PlaceholderPage';

// Admin Modules
import UserManagement from './pages/admin/UserManagement';
import UserDetails from './pages/admin/UserDetails';
import CategoryManagement from './pages/admin/CategoryManagement';
import SlaManagement from './pages/admin/SlaManagement';
import AuditLogs from './pages/admin/AuditLogs';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes: App Shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Personal Queue for all authenticated users */}
              <Route path="/my-tickets" element={<MyTickets />} />

              {/* Dedicated Ticket Creation Routes (must be defined BEFORE dynamic /tickets/:id) */}
              <Route element={<ProtectedRoute allowedRoles={['Employee', 'Admin', 'Support Engineer']} />}>
                <Route path="/tickets/new" element={<CreateTicket />} />
                <Route path="/tickets/create" element={<CreateTicket />} />
                <Route path="/create-ticket" element={<CreateTicket />} />
              </Route>

              {/* Dynamic Single Ticket Details */}
              <Route path="/tickets/:id" element={<TicketDetails />} />

              {/* Support Engineer + Admin Global Queue */}
              <Route element={<ProtectedRoute allowedRoles={['Support Engineer', 'Admin']} />}>
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/analytics" element={<Dashboard />} />
              </Route>

              {/* User Profile & Settings */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />

              {/* Notifications */}
              <Route 
                path="/notifications" 
                element={<PlaceholderPage title="Notifications" description="User alerts and SLA notifications" />} 
              />

              {/* Admin-Only Management Modules */}
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/users/:id" element={<UserDetails />} />
                <Route path="/admin/categories" element={<CategoryManagement />} />
                <Route path="/admin/sla" element={<SlaManagement />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />

                {/* Legacy/convenience path aliases */}
                <Route path="/users" element={<UserManagement />} />
                <Route path="/users/:id" element={<UserDetails />} />
                <Route path="/categories" element={<CategoryManagement />} />
                <Route path="/sla" element={<SlaManagement />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
