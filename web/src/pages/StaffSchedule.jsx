// web/src/pages/StaffSchedule.jsx

import React, { useState, useEffect } from 'react';
import axios from '/api/axios';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  Loader, AlertCircle, X
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

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function StaffSchedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrders, setModalOrders] = useState([]);
  const [modalDate, setModalDate] = useState('');

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/staff/orders', {
        params: {
          status: 'confirmed,preparing,ready',
          for_schedule: true
        }
      });
      setOrders(res.data.orders?.data || res.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const handleDateClick = async (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const clickedDate = new Date(year, month, day);
    const dateStr = toLocalDateString(clickedDate);

    try {
      const res = await axios.get('/staff/schedule', { params: { date: dateStr } });
      setModalDate(dateStr);
      setModalOrders(res.data.orders || []);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
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
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

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

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6"
        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '20px 24px' }}>
      <style>{`
        .calendar-wrapper {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
          border: 1.5px solid rgba(242,237,228,0.9);
          padding: 16px 18px;
        }
        .calendar-month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .month-title {
          font-size: 1rem;
          font-weight: 700;
          color: ${SAGE};
          letter-spacing: -0.02em;
        }
        .nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
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
          gap: 4px;
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 6px;
        }
        .weekday-label {
          text-align: center;
          font-size: 0.6rem;
          font-weight: 700;
          color: ${MUTED_GRAY};
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 0;
        }
        .day-cell {
          aspect-ratio: 1;
          background: #fff;
          border: 1.5px solid rgba(166,162,154,0.15);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          font-size: 0.85rem;
          font-weight: 500;
          color: ${SAGE};
          min-height: 44px;
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
          font-size: 0.85rem;
        }
        .order-count-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: ${SAGE};
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          min-width: 32px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(79,95,82,0.3);
          line-height: 1.4;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 16px;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          max-width: 640px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(79,95,82,0.18);
          border: none;
        }
        .modal-header {
          padding: 18px 24px;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          background: linear-gradient(135deg, ${SAGE}, #3e4c42);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-header-icon {
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-header-title {
          color: #fff;
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: -0.02em;
        }
        .modal-header-date {
          color: rgba(255,255,255,0.8);
          font-size: 0.85rem;
          font-weight: 500;
        }
        .modal-close-btn {
          color: rgba(255,255,255,0.8);
          padding: 6px;
          border-radius: 8px;
          transition: all 0.15s;
          cursor: pointer;
          background: transparent;
          border: none;
        }
        .modal-close-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
        .modal-body {
          padding: 20px 24px;
        }
        .order-card {
          background: #f8f7f4;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid rgba(242,237,228,0.8);
          transition: all 0.2s;
        }
        .order-card:hover {
          background: #fff;
          box-shadow: 0 4px 12px rgba(79,95,82,0.08);
        }
        .order-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .order-number {
          font-weight: 700;
          color: ${SAGE};
          font-size: 0.95rem;
        }
        .order-customer {
          color: ${MUTED_GRAY};
          font-size: 0.85rem;
          margin-top: 2px;
        }
        .order-time {
          display: flex;
          align-items: center;
          gap: 4px;
          color: ${MUTED_GRAY};
          font-size: 0.8rem;
          margin-top: 4px;
        }
        .order-items {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .order-item-tag {
          background: rgba(79,95,82,0.08);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: ${SAGE};
        }
        .order-status-badge {
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .no-orders {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 0;
          text-align: center;
        }
        .no-orders-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${CREAM};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border: 1.5px dashed rgba(166,162,154,0.3);
        }
        .no-orders-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: ${SAGE};
        }
        .no-orders-sub {
          font-size: 0.85rem;
          color: ${MUTED_GRAY};
          margin-top: 4px;
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
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
          <h1 style={{ color: SAGE, fontSize: '1.4rem', fontWeight: 700 }}>
            Order Schedule
          </h1>
        </div>

        <div className="calendar-wrapper">
          <div className="calendar-month-header">
            <button className="nav-btn" onClick={goToPrevMonth}>
              <ChevronLeft size={18} />
            </button>
            <h2 className="month-title">{monthName}</h2>
            <button className="nav-btn" onClick={goToNextMonth}>
              <ChevronRight size={18} />
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

              const ordersOnDate = ordersByDate[dateStr] || [];
              const orderCount = ordersOnDate.length;

              return (
                <div
                  key={day}
                  className={`day-cell ${isToday ? 'today' : ''}`}
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

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <CalendarIcon size={16} color="#fff" />
                </div>
                <div>
                  <div className="modal-header-title">Orders for</div>
                  <div className="modal-header-date">{modalDate}</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {modalOrders.length === 0 ? (
                <div className="no-orders">
                  <div className="no-orders-icon">
                    <CalendarIcon size={28} color={MUTED_GRAY} style={{ opacity: 0.5 }} />
                  </div>
                  <div className="no-orders-title">No scheduled orders</div>
                  <div className="no-orders-sub">There are no orders for this date.</div>
                </div>
              ) : (
                modalOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-top">
                      <div>
                        <div className="order-number">{order.order_number}</div>
                        <div className="order-customer">{order.customer_name}</div>
                        {order.pickup_time && (
                          <div className="order-time">
                            <Clock size={14} />
                            {order.pickup_time.slice(0, 5)}
                          </div>
                        )}
                      </div>
                      <span
                        className="order-status-badge"
                        style={{
                          backgroundColor: (statusColors[order.status] || '#A6A29A') + '20',
                          color: statusColors[order.status] || MUTED_GRAY,
                          border: `1px solid ${(statusColors[order.status] || '#A6A29A') + '40'}`,
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="order-items">
                      {order.items?.map(item => (
                        <span key={item.id} className="order-item-tag">
                          {item.menu?.name} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}