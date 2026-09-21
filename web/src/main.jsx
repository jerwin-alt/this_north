// web/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';
import Users from './pages/Users.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import Inventory from './pages/Inventory.jsx';
import Ingredients from './pages/Ingredients';
import Discounts from './pages/Discounts';  
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import AdminSchedule from './pages/AdminSchedule.jsx';
import Loyalty from './pages/Loyalty.jsx';
import LostAndDamages from './pages/LostAndDamages.jsx';


import StaffDashboard from './pages/StaffDashboard.jsx';
import StaffOverview from './pages/StaffOverview.jsx';
import StaffOrders from './pages/StaffOrders.jsx';
import StaffDiscounts from './pages/StaffDiscounts.jsx';
import StaffProducts from './pages/StaffProducts.jsx';
import StaffSchedule from './pages/StaffSchedule.jsx';
import StaffMenu from './pages/StaffMenu.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<App />} />

        {/* Admin routes */}
        <Route path="/pages/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardOverview />} />
          <Route path="users" element={<Users />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<Products />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="lost-and-damages" element={<LostAndDamages />} />  
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="loyalty" element={<Loyalty />} />
          
        </Route>

        {/* Staff routes */}
        <Route path="/pages/staff-dashboard" element={<StaffDashboard />}>
          <Route index element={<StaffMenu />} />
          <Route path="menu" element={<StaffMenu />} />
          <Route path="overview" element={<StaffOverview />} />
          <Route path="orders" element={<StaffOrders />} />
          <Route path="discounts" element={<StaffDiscounts />} />
          {/* ─── FIX: Ensure "products" points to StaffProducts ─── */}
          <Route path="products" element={<StaffProducts />} />
          <Route path="schedule" element={<StaffSchedule />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);