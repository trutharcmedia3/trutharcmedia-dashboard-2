/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DayPlanner } from './pages/DayPlanner';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { Team } from './pages/Team';
import { Comments } from './pages/Comments';
import { Analytics } from './pages/Analytics';
import { ExpenditurePage } from './pages/Expenditure';
import { Payments } from './pages/Payments';
import { NetProfit } from './pages/NetProfit';
import { Settings } from './pages/Settings';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

import { Toaster } from 'react-hot-toast';

const AppRoutes = () => {
  const { loading: appLoading } = useApp();
  const { user, loading: authLoading } = useAuth();

  if (authLoading || appLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium animate-pulse">Connecting to Agency Vault...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/day-planner" element={<DayPlanner />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tasks" element={<Tasks />} />
        {user.role === 'admin' && (
          <>
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/expenditure" element={<ExpenditurePage />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/net-profit" element={<NetProfit />} />
          </>
        )}
        <Route path="/team" element={<Team />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}
