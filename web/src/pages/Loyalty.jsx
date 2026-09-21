// web/src/pages/Loyalty.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from '/api/axios';
import {
  Loader, AlertCircle, Check, X, RefreshCw,
  Star, Coffee, Cake, Gift, Percent, Award, Settings, CheckCircle2,
} from 'lucide-react';

const SAGE = '#4F5F52';
const CREAM = '#F2EDE4';
const MUTED_GRAY = '#A6A29A';
const SOFT_WHITE = '#FFF3D9';

export default function Loyalty() {
  const [rewards, setRewards] = useState({});
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({
    is_30_percent_active: true,
    is_10_star_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // ── Toast (auto-dismissing notification) ──
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, type, message });
  }, []);

  // ── Toggle-all confirmation modal ──
  const [toggleAllConfirm, setToggleAllConfirm] = useState({ show: false, nextValue: null });
  const [toggleAllLoading, setToggleAllLoading] = useState(false);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/loyalty');
      setRewards(response.data.rewards || {});
      setStats(response.data.stats || null);
      setSettings(response.data.settings || {
        is_30_percent_active: true,
        is_10_star_active: true,
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching loyalty data:', err);
      setError(err.response?.data?.message || 'Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const toggleSetting = async (setting, currentValue) => {
    setUpdating(true);
    try {
      await axios.post('/admin/loyalty/settings/toggle', {
        setting: setting,
        value: !currentValue,
      });
      await fetchLoyaltyData();
      showToast('Loyalty setting updated successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update setting', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // ── Toggle all settings at once (modal flow) ──
  const toggleAllSettings = () => {
    const bothActive = settings.is_30_percent_active && settings.is_10_star_active;
    setToggleAllConfirm({ show: true, nextValue: !bothActive });
  };

  const confirmToggleAll = async () => {
    const newValue = toggleAllConfirm.nextValue;
    if (newValue === null) return;

    setToggleAllLoading(true);
    try {
      await axios.post('/admin/loyalty/settings/toggle-all', { active: newValue });
      await fetchLoyaltyData();
      setToggleAllConfirm({ show: false, nextValue: null });
      showToast(
        newValue
          ? 'All loyalty rewards activated.'
          : 'All loyalty rewards deactivated.',
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update settings', 'error');
    } finally {
      setToggleAllLoading(false);
    }
  };

  const toggleReward = async (id) => {
    setUpdating(true);
    try {
      await axios.put(`/admin/loyalty/${id}/toggle`);
      await fetchLoyaltyData();
      showToast('Reward status updated successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update reward status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getRewardLabel = (type) => {
    const labels = {
      '30_percent': '30% Discount',
      'free_slice': 'Free Cake Slice',
      'free_coffee': 'Free Coffee',
      'free_non_coffee': 'Free Non-Coffee',
    };
    return labels[type] || type;
  };

  const getRewardIcon = (type) => {
    const icons = {
      '30_percent': Percent,
      'free_slice': Cake,
      'free_coffee': Coffee,
      'free_non_coffee': Coffee,
    };
    return icons[type] || Gift;
  };

  const getRewardColor = (type) => {
    const colors = {
      '30_percent': '#D4A03D',
      'free_slice': '#7A5B8A',
      'free_coffee': '#5B7A8A',
      'free_non_coffee': '#5B8A5E',
    };
    return colors[type] || SAGE;
  };

  if (loading) {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }} className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin" style={{ color: SAGE }} size={36} />
          <p style={{ color: MUTED_GRAY, fontSize: '0.85rem' }}>Loading loyalty data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl flex items-center gap-3 m-6" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const rewardTypes = Object.keys(rewards);

  // Check if both rewards are active
  const bothActive = settings.is_30_percent_active && settings.is_10_star_active;

  return (
    <div style={{ background: CREAM, minHeight: '100vh', padding: '36px 28px' }}>
      <style>{`
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,95,82,0.15), transparent);
        }
        .stat-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(79,95,82,0.14) !important;
        }
        .panel {
          background: #fff;
          border-radius: 20px;
          border: 1.5px solid rgba(242,237,228,0.9);
          box-shadow: 0 2px 12px rgba(79,95,82,0.06);
        }
        .reward-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .reward-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(79,95,82,0.14) !important;
        }
        .toggle-track {
          width: 42px;
          height: 24px;
          border-radius: 999px;
          position: relative;
          cursor: pointer;
          transition: background 0.25s ease;
          border: 1.5px solid transparent;
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation: fadeInUp 0.4s 0.05s ease both; }
        .fade-in-2 { animation: fadeInUp 0.4s 0.10s ease both; }
        .toggle-all-btn {
          transition: all 0.2s ease;
        }
        .toggle-all-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79,95,82,0.15);
        }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
        .anim-modal { animation: modalIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94); }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .toast-anim { animation: toastIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both; }
      `}</style>

      <div className="grain-overlay" />

      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,95,82,0.25)',
                flexShrink: 0,
              }}>
                <Award size={18} color="#fff" />
              </div>
              <h1 style={{ color: SAGE, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Loyalty Management
              </h1>
            </div>
            <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', letterSpacing: '0.03em', marginLeft: 48 }}>
              Manage customer loyalty rewards and settings
            </p>
          </div>

          <button
            onClick={fetchLoyaltyData}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: '#fff',
              color: SAGE,
              border: '1.5px solid rgba(79,95,82,0.2)',
              boxShadow: '0 2px 8px rgba(79,95,82,0.06)',
            }}
          >
            <RefreshCw size={16} className={updating ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="divider-line mb-7" />

        {/* ── Global Settings Section ── */}
        <div className="fade-in-1 mb-7">
          <div className="panel" style={{ padding: '20px 24px' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 28, height: 28,
                  background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
                }}>
                  <Settings size={13} color="#fff" />
                </div>
                <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Global Loyalty Settings
                </h2>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
                  background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
                  borderRadius: 999, padding: '2px 8px',
                }}>
                  Applies to all customers
                </span>
              </div>

              {/* ── Toggle All Button ── */}
              <button
                onClick={toggleAllSettings}
                disabled={updating}
                className="toggle-all-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: bothActive ? 'rgba(239,68,68,0.08)' : 'rgba(52,196,104,0.08)',
                  color: bothActive ? '#DC2626' : '#16A34A',
                  border: `1.5px solid ${bothActive ? 'rgba(239,68,68,0.2)' : 'rgba(52,196,104,0.2)'}`,
                }}
              >
                {bothActive ? (
                  <>
                    <X size={14} />
                    Deactivate All
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Activate All
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 30% Discount Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(242,237,228,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `linear-gradient(135deg, #D4A03D, #b8872e)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Percent size={15} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: SAGE, fontSize: '0.9rem' }}>
                      30% Discount Reward
                    </p>
                    <p style={{ color: MUTED_GRAY, fontSize: '0.7rem' }}>
                      Earned at 5 stamps
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600,
                    color: settings.is_30_percent_active ? '#1a7a3c' : MUTED_GRAY,
                  }}>
                    {settings.is_30_percent_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleSetting('is_30_percent_active', settings.is_30_percent_active)}
                    disabled={updating}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <div
                      className="toggle-track"
                      style={{
                        background: settings.is_30_percent_active ? SAGE : 'rgba(166,162,154,0.3)',
                        borderColor: settings.is_30_percent_active ? 'rgba(79,95,82,0.2)' : 'rgba(166,162,154,0.2)',
                      }}
                    >
                      <div
                        className="toggle-thumb"
                        style={{ transform: settings.is_30_percent_active ? 'translateX(18px)' : 'translateX(0)' }}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* 10-Star Reward Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(242,237,228,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `linear-gradient(135deg, #7A5B8A, #5B3A6A)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Star size={15} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: SAGE, fontSize: '0.9rem' }}>
                      10-Star Reward
                    </p>
                    <p style={{ color: MUTED_GRAY, fontSize: '0.7rem' }}>
                      Free Slice + Free Beverage
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600,
                    color: settings.is_10_star_active ? '#1a7a3c' : MUTED_GRAY,
                  }}>
                    {settings.is_10_star_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleSetting('is_10_star_active', settings.is_10_star_active)}
                    disabled={updating}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <div
                      className="toggle-track"
                      style={{
                        background: settings.is_10_star_active ? SAGE : 'rgba(166,162,154,0.3)',
                        borderColor: settings.is_10_star_active ? 'rgba(79,95,82,0.2)' : 'rgba(166,162,154,0.2)',
                      }}
                    >
                      <div
                        className="toggle-thumb"
                        style={{ transform: settings.is_10_star_active ? 'translateX(18px)' : 'translateX(0)' }}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(166,162,154,0.05)', border: '1px solid rgba(166,162,154,0.15)' }}>
              <p style={{ color: MUTED_GRAY, fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 600 }}>Note:</span> When a reward is set to <strong>Inactive</strong>, customers will see a warning in their profile and will not be able to earn or redeem that reward.
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7 fade-in-2">
            {[
              { label: 'Total Rewards', value: stats.total_rewards, icon: Gift },
              { label: 'Active Rewards', value: stats.active_rewards, icon: Check },
              { label: 'Used Rewards', value: stats.used_rewards, icon: X },
              { label: '30% Discounts', value: stats.by_type?.['30_percent'] || 0, icon: Percent },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="stat-card" style={{
                  background: '#fff',
                  borderRadius: 20,
                  border: '1.5px solid rgba(242,237,228,0.9)',
                  boxShadow: '0 2px 12px rgba(79,95,82,0.06)',
                  padding: '22px 22px 18px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${SAGE}, #3e4c42)`,
                  }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ color: MUTED_GRAY, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                        {card.label}
                      </p>
                      <p style={{ color: SAGE, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {card.value}
                      </p>
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(79,95,82,0.12), rgba(79,95,82,0.06))',
                      border: '1.5px solid rgba(79,95,82,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={20} style={{ color: SAGE }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Rewards Section ── */}
        <div className="fade-in-2">
          <div className="flex items-center gap-3 mb-4">
            <div style={{
              width: 28, height: 28,
              background: `linear-gradient(135deg, ${SAGE}, #3e4c42)`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79,95,82,0.2)',
            }}>
              <Award size={13} color="#fff" />
            </div>
            <h2 style={{ color: SAGE, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Customer Rewards
            </h2>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, color: MUTED_GRAY,
              background: 'rgba(166,162,154,0.12)', border: '1px solid rgba(166,162,154,0.2)',
              borderRadius: 999, padding: '2px 8px',
            }}>
              {rewardTypes.length} types
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rewardTypes.length === 0 ? (
              <div className="col-span-2 text-center py-12" style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(242,237,228,0.9)' }}>
                <div style={{ opacity: 0.4 }}>
                  <Award size={48} color={MUTED_GRAY} />
                </div>
                <p style={{ color: MUTED_GRAY, fontSize: '0.95rem', marginTop: 12 }}>
                  No customer rewards have been earned yet.
                </p>
                <p style={{ color: MUTED_GRAY, fontSize: '0.8rem' }}>
                  Rewards will appear here when customers reach milestones.
                </p>
              </div>
            ) : (
              rewardTypes.map((type) => {
                const rewardList = rewards[type] || [];
                const Icon = getRewardIcon(type);
                const color = getRewardColor(type);
                const total = rewardList.length;
                const active = rewardList.filter(r => r.is_active).length;
                const used = rewardList.filter(r => r.is_used).length;

                return (
                  <div key={type} className="reward-card panel" style={{ overflow: 'hidden' }}>
                    <div style={{
                      padding: '16px 20px',
                      borderBottom: `1px solid ${CREAM}`,
                      background: `linear-gradient(135deg, rgba(79,95,82,0.04), rgba(255,243,217,0.3))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={15} color="#fff" />
                        </div>
                        <div>
                          <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '0.95rem' }}>
                            {getRewardLabel(type)}
                          </h3>
                          <p style={{ color: MUTED_GRAY, fontSize: '0.7rem' }}>
                            {total} total · {active} active · {used} used
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px 20px', maxHeight: 280, overflowY: 'auto' }}>
                      {rewardList.length === 0 ? (
                        <p style={{ color: MUTED_GRAY, fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
                          No rewards of this type
                        </p>
                      ) : (
                        rewardList.map((reward) => (
                          <div key={reward.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: `1px solid rgba(242,237,228,0.6)`,
                          }}>
                            <div>
                              <p style={{ fontWeight: 600, color: SAGE, fontSize: '0.85rem' }}>
                                #{reward.id} — {reward.user_name}
                              </p>
                              <p style={{ color: MUTED_GRAY, fontSize: '0.7rem' }}>
                                {reward.claimed_at ? new Date(reward.claimed_at).toLocaleDateString() : 'N/A'}
                                {reward.is_used && ' · Used'}
                                {reward.is_used && reward.used_at && ` ${new Date(reward.used_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 999,
                                fontSize: '0.6rem', fontWeight: 600,
                                background: reward.is_used ? 'rgba(166,162,154,0.1)' : 'rgba(52,196,104,0.1)',
                                color: reward.is_used ? MUTED_GRAY : '#1a7a3c',
                                border: `1px solid ${reward.is_used ? 'rgba(166,162,154,0.2)' : 'rgba(52,196,104,0.2)'}`,
                              }}>
                                {reward.is_used ? 'Used' : 'Available'}
                              </span>
                              <button
                                onClick={() => toggleReward(reward.id)}
                                disabled={updating}
                                title={reward.is_active ? 'Deactivate' : 'Activate'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                <div
                                  className="toggle-track"
                                  style={{
                                    background: reward.is_active ? SAGE : 'rgba(166,162,154,0.3)',
                                    borderColor: reward.is_active ? 'rgba(79,95,82,0.2)' : 'rgba(166,162,154,0.2)',
                                  }}
                                >
                                  <div
                                    className="toggle-thumb"
                                    style={{ transform: reward.is_active ? 'translateX(18px)' : 'translateX(0)' }}
                                  />
                                </div>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ══ Toggle All Confirmation Modal ══ */}
      {toggleAllConfirm.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,35,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60, padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div className="anim-modal" style={{
            background: '#fff', borderRadius: 22, padding: '32px 28px',
            maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(79,95,82,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(242,237,228,0.8)',
          }}>
            <div style={{
              width: 60, height: 60,
              background: toggleAllConfirm.nextValue
                ? 'rgba(52,196,104,0.1)'
                : 'rgba(239,68,68,0.08)',
              borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              border: `1.5px solid ${toggleAllConfirm.nextValue ? 'rgba(52,196,104,0.2)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              {toggleAllConfirm.nextValue
                ? <Check size={26} style={{ color: '#1a7a3c' }} />
                : <X size={26} style={{ color: '#EF4444' }} />
              }
            </div>
            <h3 style={{ color: SAGE, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
              {toggleAllConfirm.nextValue
                ? 'Activate all loyalty rewards?'
                : 'Deactivate all loyalty rewards?'}
            </h3>
            <p style={{ color: MUTED_GRAY, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 22 }}>
              {toggleAllConfirm.nextValue
                ? 'Customers will be able to earn and redeem all loyalty rewards.'
                : 'Customers will no longer be able to earn or redeem any loyalty rewards. Existing rewards remain in their accounts but will be unusable.'}
            </p>
            <div className="divider-line mb-6" />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setToggleAllConfirm({ show: false, nextValue: null })}
                className="sec-btn px-5 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'rgba(166,162,154,0.3)', color: MUTED_GRAY, background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleAll}
                disabled={toggleAllLoading}
                className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{
                  background: toggleAllConfirm.nextValue
                    ? 'linear-gradient(135deg, #34c468, #1a7a3c)'
                    : 'linear-gradient(135deg, #EF4444, #DC2626)',
                  boxShadow: toggleAllConfirm.nextValue
                    ? '0 4px 14px rgba(52,196,104,0.3)'
                    : '0 4px 14px rgba(239,68,68,0.3)',
                }}
              >
                {toggleAllLoading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                {toggleAllLoading
                  ? 'Updating…'
                  : toggleAllConfirm.nextValue
                    ? 'Yes, activate all'
                    : 'Yes, deactivate all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Toast (auto-dismissing notification) ══ */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          className="toast-anim"
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 14,
            background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: toast.type === 'error' ? '#DC2626' : '#059669',
            border: `1px solid ${toast.type === 'error' ? '#FEE2E2' : '#D1FAE5'}`,
            boxShadow: '0 12px 32px rgba(79,95,82,0.18)',
            fontSize: '0.9rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            pointerEvents: 'none',
            maxWidth: '90vw',
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}