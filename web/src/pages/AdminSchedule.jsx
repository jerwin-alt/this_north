// web/src/pages/AdminSchedule.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  CheckCircle, XCircle, AlertCircle, Loader, Info
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';

const statusColors = {
  pending: '#D4A03D',
  confirmed: '#5B7A8A',
  preparing: '#7A5B8A',
  ready: '#5B8A5E',
  completed: '#4F5F52',
  cancelled: '#C75B5B',
};

// Helper to format a date as YYYY-MM-DD in LOCAL time (Philippines)
const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function AdminSchedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dateOrders, setDateOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/orders', {
        params: {
          status: 'pending,confirmed,preparing,ready',
          for_schedule: true
        }
      });
      setOrders(res.data.orders?.data || res.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const fetchDateOrders = async (dateStr) => {
    try {
      const res = await axios.get('/admin/schedule', { params: { date: dateStr } });
      setDateOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const clickedDate = new Date(year, month, day);
    const dateStr = toLocalDateString(clickedDate);

    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setDateOrders([]);
    } else {
      setSelectedDate(dateStr);
      fetchDateOrders(dateStr);
    }
  };

  const handleApprove = async (orderId) => {
    setActionLoading(true);
    try {
      await axios.put(`/admin/orders/${orderId}/approve`);
      setNotification({ type: 'success', message: 'Order approved and schedule confirmed.' });
      await fetchAllOrders();
      if (selectedDate) fetchDateOrders(selectedDate);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Approval failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm('Are you sure you want to reject this order?')) return;
    setActionLoading(true);
    try {
      await axios.put(`/admin/orders/${orderId}/reject`);
      setNotification({ type: 'info', message: 'Order rejected.' });
      await fetchAllOrders();
      if (selectedDate) fetchDateOrders(selectedDate);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const buildCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let day = 1; day <= totalDays; day++) cells.push(day);
    return cells;
  };

  // Group orders by pickup date (only confirmed, preparing, ready)
  const ordersByDate = {};
  orders.forEach(o => {
    if (o.pickup_date) {
      const datePart = o.pickup_date.split('T')[0] || o.pickup_date;
      if (['confirmed', 'preparing', 'ready'].includes(o.status)) {
        if (!ordersByDate[datePart]) ordersByDate[datePart] = [];
        ordersByDate[datePart].push(o);
      }
    }
  });

  const calendarCells = buildCalendar();
  const monthName = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center">
        <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .calendar-wrapper {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          border: 1.5px solid rgba(242,237,228,0.9);
          padding: 24px;
        }
        .calendar-month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .month-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: ${SAGE};
          letter-spacing: -0.02em;
        }
        .nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: ${SAGE};
          transition: all 0.15s;
          cursor: pointer;
          border: none;
        }
        .nav-btn:hover {
          background: rgba(79,95,82,0.08);
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 8px;
        }
        .weekday-label {
          text-align: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: ${MUTED_GRAY};
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 0;
        }
        .day-cell {
          aspect-ratio: 1;
          background: #fff;
          border: 1.5px solid rgba(166,162,154,0.15);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          font-size: 0.95rem;
          font-weight: 500;
          color: ${SAGE};
        }
        .day-cell:hover {
          background: rgba(79,95,82,0.06);
          border-color: ${SAGE};
          transform: scale(1.03);
          box-shadow: 0 4px 10px rgba(79,95,82,0.08);
        }
        .day-cell.today {
          background: ${CREAM};
          border-color: ${SAGE};
          box-shadow: 0 0 0 2px ${SAGE}40;
        }
        .day-cell.selected {
          background: ${SAGE};
          color: #fff;
          font-weight: 700;
          border-color: #3e4c42;
          box-shadow: 0 6px 16px rgba(79,95,82,0.2);
        }
        .day-cell.selected .day-number {
          color: #fff;
        }
        .day-cell.empty {
          background: transparent;
          border: none;
          cursor: default;
        }
        .day-cell.empty:hover {
          background: transparent;
          transform: none;
          box-shadow: none;
        }
        .day-number {
          position: relative;
          z-index: 1;
        }
        .order-count-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: ${SAGE};
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          min-width: 22px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(79,95,82,0.25);
          line-height: 1.4;
          white-space: nowrap;
        }
        .day-cell.selected .order-count-badge {
          background: #fff;
          color: ${SAGE};
        }
        .order-card {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid rgba(242,237,228,0.9);
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          transition: all 0.2s;
        }
        .order-card:hover {
          box-shadow: 0 4px 16px rgba(79,95,82,0.1);
        }
        .btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .btn-approve {
          background: ${SAGE};
          color: white;
        }
        .btn-approve:hover {
          background: #3e4c42;
          box-shadow: 0 4px 12px rgba(79,95,82,0.3);
        }
        .btn-reject {
          background: #EF4444;
          color: white;
        }
        .btn-reject:hover {
          background: #DC2626;
          box-shadow: 0 4px 12px rgba(239,68,68,0.3);
        }
        .notification {
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
              }}
            >
              <CalendarIcon size={18} color="#fff" />
            </div>
            <h1 style={{ color: SAGE, fontSize: '1.6rem', fontWeight: 700 }}>
              Schedule Management
            </h1>
          </div>
        </div>

        {notification && (
          <div
            className="notification"
            style={{
              background:
                notification.type === 'error'
                  ? '#FEF2F2'
                  : notification.type === 'success'
                  ? '#ECFDF5'
                  : '#EFF6FF',
              color:
                notification.type === 'error'
                  ? '#DC2626'
                  : notification.type === 'success'
                  ? '#059669'
                  : '#2563EB',
              border: `1px solid ${
                notification.type === 'error'
                  ? '#FEE2E2'
                  : notification.type === 'success'
                  ? '#D1FAE5'
                  : '#BFDBFE'
              }`,
            }}
          >
            {notification.type === 'error' && <AlertCircle size={18} />}
            {notification.type === 'success' && <CheckCircle size={18} />}
            {notification.type === 'info' && <Info size={18} />}
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="calendar-wrapper">
              <div className="calendar-month-header">
                <button className="nav-btn" onClick={goToPrevMonth}>
                  <ChevronLeft size={20} />
                </button>
                <h2 className="month-title">{monthName}</h2>
                <button className="nav-btn" onClick={goToNextMonth}>
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="weekday-label">{d}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarCells.map((day, idx) => {
                  if (day === null)
                    return <div key={`empty-${idx}`} className="day-cell empty" />;

                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const dateStr = toLocalDateString(new Date(year, month, day));
                  const isToday = dateStr === toLocalDateString(new Date());
                  const isSelected = selectedDate === dateStr;

                  const ordersOnDate = ordersByDate[dateStr] || [];
                  const orderCount = ordersOnDate.length;

                  return (
                    <div
                      key={day}
                      className={`day-cell ${isToday ? 'today' : ''} ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => handleDateClick(day)}
                    >
                      <span className="day-number">{day}</span>
                      {orderCount > 0 && (
                        <span className="order-count-badge">
                          {orderCount} {orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div
              className="bg-white rounded-2xl shadow-sm border p-6"
              style={{ borderColor: 'rgba(242,237,228,0.9)' }}
            >
              <h3 className="font-bold mb-4" style={{ color: SAGE }}>
                {selectedDate ? `Orders for ${selectedDate}` : '📅 Select a date'}
              </h3>

              {dateOrders.length === 0 ? (
                <p style={{ color: MUTED_GRAY }}>No confirmed orders on this date.</p>
              ) : (
                dateOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold" style={{ color: SAGE }}>
                        {order.order_number}
                      </span>
                      <span
                        style={{
                          background: statusColors[order.status] + '20',
                          color: statusColors[order.status],
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p style={{ marginBottom: 4 }}>{order.customer_name}</p>
                    {order.pickup_time && (
                      <p style={{ fontSize: '0.85rem', color: MUTED_GRAY }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {order.pickup_time.slice(0, 5)}
                      </p>
                    )}
                    <div className="mt-2">
                      {order.items?.map(item => (
                        <span
                          key={item.id}
                          style={{
                            background: 'rgba(79,95,82,0.06)',
                            padding: '2px 6px',
                            borderRadius: 5,
                            fontSize: '0.75rem',
                            marginRight: 4,
                            color: SAGE,
                          }}
                        >
                          {item.menu?.name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                    {order.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          className="btn btn-approve"
                          onClick={() => handleApprove(order.id)}
                          disabled={actionLoading}
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          className="btn btn-reject"
                          onClick={() => handleReject(order.id)}
                          disabled={actionLoading}
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}