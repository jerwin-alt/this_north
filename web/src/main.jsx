import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';  // create this component
import Users from './pages/Users.jsx';
import Products from './pages/Products.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<App />} />

        {/* Dashboard layout with nested routes */}
        <Route path="/pages/dashboard" element={<Dashboard />}>
        <Route path="products" element={<Products />} />
          {/* Index route (Overview) */}
          <Route index element={<DashboardOverview />} />

          {/* Users route */}
          <Route path="users" element={<Users />} />

          {/* You will add other routes here later */}
          {/* <Route path="orders" element={<Orders />} /> */}
          {/* <Route path="inventory" element={<Inventory />} /> */}
          {/* <Route path="reports" element={<Reports />} /> */}
          {/* <Route path="discounts" element={<Discounts />} /> */}
          {/* <Route path="settings" element={<Settings />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);