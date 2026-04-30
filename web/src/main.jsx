import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';  // create this component
import Users from './pages/Users.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import Inventory from './pages/Inventory.jsx';
import Ingredients from './pages/Ingredients';
import Discounts from './pages/Discounts';  
import Reports from './pages/Reports';

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
          <Route path="orders" element={<Orders />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="reports" element={<Reports />} />
          

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