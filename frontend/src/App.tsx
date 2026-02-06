import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Page components
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Listings from './pages/Listings';
import ListingDetails from './pages/ListingDetails';
import Watchlists from './pages/Watchlists';
import Alerts from './pages/Alerts';

const AppRouter: React.FC = () => {
  return (
    <AuthProvider>
      <Header />
      <main id="main-content" className="min-h-screen">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetails />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlists"
            element={
              <ProtectedRoute>
                <Watchlists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Alerts />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </AuthProvider>
  );
};

function App() {
  return <AppRouter />;
}

export default App;
