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
import Customers from './pages/Customers';  // at top
import AdminSchedule from './pages/AdminSchedule.jsx';

import StaffDashboard from './pages/StaffDashboard.jsx';
import StaffOverview from './pages/StaffOverview.jsx'; // create this too
import StaffOrders from './pages/StaffOrders.jsx'; // create this too
import StaffDiscounts from './pages/StaffDiscounts.jsx'; 
import StaffProducts from './pages/StaffProducts.jsx';
import StaffSchedule from './pages/StaffSchedule.jsx';



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
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="schedule" element={<AdminSchedule />} />

        </Route>

          <Route path="/pages/staff-dashboard" element={<StaffDashboard />}>
            <Route index element={<StaffOverview />} />
            <Route path="orders" element={<StaffOrders />} />
            <Route path="discounts" element={<StaffDiscounts />} /> 
            <Route path="products" element={<StaffProducts />} />
            <Route path="schedule" element={<StaffSchedule />} />

        </Route>

      </Routes>
    </BrowserRouter>
  </StrictMode>
);