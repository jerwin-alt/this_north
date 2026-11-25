// src/lib/adminCustomers.js
import axios from '../../api/axios'; // Adjust this path if your axios is mapped differently (e.g., '/api/axios')

export async function getCustomerOrders(customerId, filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
  );
  const { data } = await axios.get(`/admin/customers/${customerId}/orders`, { params });
  return data;
}