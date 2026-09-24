// mobile/app/customer/customerDashboard.tsx

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Dimensions,
  ImageBackground,
  StatusBar,
   AppState, 
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import axios from "@/api/axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNotificationStore } from "@/stores/notificationStore";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "@/stores/appStore";
import { useCartStore, CartItem } from "@/stores/cartStore";
import SvgDecoration from '@/components/SvgDecoration';
import { SvgXml } from 'react-native-svg';
import {
  buildCakeSvg,
  buildIcingSvg,
  getIcingPosition,
  getIcingColorFromName,
  type CakeShape,
} from '@/constants/cakeBase';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Polling error:']);


// ── Import QR Code image ──
import QRCodeImage from "@/assets/images/QR_CODE_SAMPLE.jpg";

// ── Palette ──
const SAGE = "#4F5F52";
const SAGE_DARK = "#3e4c42";
const CREAM = "#F2EDE4";
const SOFT_WHITE = "#FFF3D9";
const MUTED_GRAY = "#A6A29A";
const PENDING_COLOR = "#D4A03D";
const CONFIRMED_COLOR = "#5B7A8A";
const PREPARING_COLOR = "#7A5B8A";
const READY_COLOR = "#5B8A5E";
const COMPLETED_COLOR = "#4F5F52";
const CANCELLED_COLOR = "#C75B5B";
const REJECTED_COLOR = "#DC2626";

const { width } = Dimensions.get("window");

// Canonical reference — matches SVG viewBox and stored decoration coords.
const CANVAS_SIZE = 400;

// ── Helper functions ──

// Direct string formatters: assume timestamp is already in Asia/Manila
const formatTimeFromString = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const match = dateStr.match(/\d{2}:\d{2}/);
  if (!match) return "";
  const [h, m] = match[0].split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const formatDateFromString = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return "";
  const parts = match[0].split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ── Original date helpers (for UTC timestamps with 'Z') ──
const parseDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN);
  const trimmed = dateStr.trim();
  if (/[Zz]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(trimmed);
};

const formatDisplayDate = (dateStr: string | undefined): string => {
  return formatManilaDateShort(dateStr);
};

const formatTime = (dateStr: string | undefined): string => {
  return formatManilaTime(dateStr);
};

const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const datePart = formatManilaDateShort(dateStr);
  const timePart = formatManilaTime(dateStr);
  return datePart && timePart ? `${datePart}, ${timePart}` : datePart || timePart;
};

// ── NEW: Safely parse a timestamp (UTC) and return a Date object ──
const parseUtcDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/Z$/i.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed + 'Z');
  return isNaN(d.getTime()) ? null : d;
};

const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const formatPaymentMethod = (method: string | undefined): string => {
  if (!method) return "GCash";
  if (method.toLowerCase() === "gcash") return "GCash";
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
};

const formatMoney = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};



// ── Pure arithmetic Manila formatter (no Intl/Hermes dependency) ──
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const MANILA_MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MANILA_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Parses any timestamp the backend can emit into a UTC Date.
 * - With `Z` or an explicit offset → trusted as-is
 * - Naive datetime ("2026-09-21 10:11:00") → assumed UTC (Laravel Zulu contract)
 */
const parseToUtcDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  let d: Date;
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    d = new Date(s);
  } else {
    d = new Date(s.replace(' ', 'T') + 'Z');
  }
  return isNaN(d.getTime()) ? null : d;
};

/** Manila time, e.g. "10:11 AM" */
const formatManilaTime = (dateStr: string | undefined): string => {
  const d = parseToUtcDate(dateStr);
  if (!d) return '';
  const manila = new Date(d.getTime() + MANILA_OFFSET_MS);
  const h24 = manila.getUTCHours();
  const mins = manila.getUTCMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
};

/** Manila date long, e.g. "September 21, 2026" */
const formatManilaDateLong = (dateStr: string | undefined): string => {
  const d = parseToUtcDate(dateStr);
  if (!d) return '';
  const manila = new Date(d.getTime() + MANILA_OFFSET_MS);
  return `${MANILA_MONTHS_LONG[manila.getUTCMonth()]} ${manila.getUTCDate()}, ${manila.getUTCFullYear()}`;
};

/** Manila date short, e.g. "Sep 21, 2026" */
const formatManilaDateShort = (dateStr: string | undefined): string => {
  const d = parseToUtcDate(dateStr);
  if (!d) return '';
  const manila = new Date(d.getTime() + MANILA_OFFSET_MS);
  return `${MANILA_MONTHS_SHORT[manila.getUTCMonth()]} ${manila.getUTCDate()}, ${manila.getUTCFullYear()}`;
};



// ── Status config ──
const STATUS_COLOR: Record<string, string> = {
  pending: PENDING_COLOR,
  confirmed: CONFIRMED_COLOR,
  preparing: PREPARING_COLOR,
  ready: READY_COLOR,
  completed: COMPLETED_COLOR,
  cancelled: CANCELLED_COLOR,
  rejected: REJECTED_COLOR,
};
const STATUS_BG: Record<string, string> = {
  pending: "rgba(212,160,61,0.1)",
  confirmed: "rgba(91,122,138,0.1)",
  preparing: "rgba(122,91,138,0.1)",
  ready: "rgba(91,138,94,0.1)",
  completed: "rgba(79,95,82,0.1)",
  cancelled: "rgba(199,91,91,0.1)",
  rejected: "rgba(220,38,38,0.1)",
};

// ── Interfaces ──
interface Category {
  id: number;
  name: string;
  is_active: boolean;
}
interface CakeSize {
  id: number;
  size_name: string;
  size_inches: number;
  price_modifier: number;
  is_active: boolean;
}
interface CakeFlavor {
  id: number;
  flavor_name: string;
  is_active: boolean;
}
interface Product {
  id: number;
  name: string;
  description: string;
  base_price: number;
  menu_type: "standard" | "customizable";
  has_size_options: boolean;
  category_id: number;
  image_url?: string;
  drinkSizes?: { id: number; size_name: string; price_modifier: number }[];
  track_stock?: boolean;
  stock_quantity?: number;
  min_stock_level?: number;
}

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  subtotal?: number;
  discount_total?: number;
  status: string;
  payment_status: string;
  pickup_date: string;
  order_date: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  has_review?: boolean;
  payments?: Array<{
    payment_method: string;
    amount_paid: number;
    payment_date: string;
    reference_number?: string;
    proof_image_url?: string;
  }>;
  items?: Array<{
    menu: { id: number; name: string; image_url?: string; base_price: number } | null;
    quantity: number;
    unit_price: number;
    cake_type?: string;
    custom_design?: any;
  }>;
  pickup_method?: "customer" | "rider" | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  rider_photo?: string | null;
  rider_photo_url?: string | null;
  progress_images_with_urls?: Array<{
    path: string;
    uploaded_by: number;
    created_at: string;
    image_url: string;
  }>;
  pickup_proof_images_with_urls?: Array<{
    path: string;
    uploaded_by: number;
    created_at: string;
    image_url: string;
  }>;
}

// ── Timeline Event Interface ──
interface TimelineEvent {
  id: string;
  status: string;
  label: string;
  timestamp: string;
  displayTime: string;
  displayDate: string;
  details?: string;
  icon: string;
  color: string;
  isCurrent: boolean;
  isCompleted: boolean;
}

// ── Decoration source helper ──
const DECORATION_IMAGES: Record<string, any> = {
  strawberry: require("@/assets/images/CUSTOMIZE_CAKE5.jpg"),
};
const FALLBACK_URLS: Record<string, string> = {
  strawberry: "https://cdn-icons-png.flaticon.com/512/744/744528.png",
  cherry: "https://cdn-icons-png.flaticon.com/512/744/744530.png",
  blueberry: "https://cdn-icons-png.flaticon.com/512/744/744531.png",
  chocolate: "https://cdn-icons-png.flaticon.com/512/744/744532.png",
  sprinkles: "https://cdn-icons-png.flaticon.com/512/744/744533.png",
  flower: "https://cdn-icons-png.flaticon.com/512/744/744534.png",
  candle: "https://cdn-icons-png.flaticon.com/512/744/744535.png",
  macaron: "https://cdn-icons-png.flaticon.com/512/744/744536.png",
  drip: "https://cdn-icons-png.flaticon.com/512/744/744537.png",
  frosting: "https://cdn-icons-png.flaticon.com/512/744/744538.png",
};
//const CAKE_BACKGROUND = require("@/assets/images/CUSTOMIZE_CAKE7_YES.png");

function getDecorationSource(elementName: string, imageUrl?: string) {
  const key = elementName?.toLowerCase().replace(/\s/g, "") || "";
  if (DECORATION_IMAGES[key]) return DECORATION_IMAGES[key];
  if (imageUrl && imageUrl.startsWith("http")) return { uri: imageUrl };
  if (FALLBACK_URLS[key]) return { uri: FALLBACK_URLS[key] };
  return null;
}

// ── getImageUrl helper ──
// const getImageUrl = (url: string | undefined): string | undefined => {
//   if (!url) return undefined;
//   if (url.startsWith("http")) return url;
//   return `http://10.90.129.170:8000${url}`;
// };


// ── getImageUrl helper ──
const getImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  
  // Use the Railway production URL instead of local IP
  const API_BASE_URL = "https://thisnorth-production-backend.up.railway.app";
  const separator = url.startsWith("/") ? "" : "/";
  return `${API_BASE_URL}${separator}${url}`;
};



 
// ── Memoized Child Components ──
const CakePreview = memo(({ design, size = 100 }: { design: any; size?: number }) => {
  const decorations = design?.decorations_with_elements || [];

  // Shape comes from the linked cake size. Default to round for legacy orders.
  const shape: CakeShape = (design?.cake_size?.shape as CakeShape) || 'round';

  // Tier count comes from the design row. Defaults to 1 for legacy orders.
  const tierCount: number = design?.tiers ?? 1;

  // Build a tierFrostings map from the icing entries
  const tierFrostings: Record<number, { side?: string; top?: string }> = {};
  decorations.forEach((dec: any) => {
    if ((dec.element_type || '').toLowerCase() !== 'icing') return;
    const tierIdx = dec.tier_index ?? 0;
    const pos = getIcingPosition(dec.element_name || '');
    const color = getIcingColorFromName(dec.element_name || '');
    if (!tierFrostings[tierIdx]) tierFrostings[tierIdx] = {};
    tierFrostings[tierIdx][pos] = color;
  });

  // Build the base cake SVG with icing colors baked in — correct z-order
  const cakeXml = buildCakeSvg({ shape, tierCount, tierFrostings });

  // Split icing (drawn full-canvas) from regular decorations.
  // IMPORTANT: sort icings so SIDE renders first (behind) and TOP renders last (in front).
  // Without this, a top-then-side placement order would have the side wall paint
  // over most of the top ellipse, hiding the top frosting.
  // const icings = decorations
  //   .filter((d: any) => (d.element_type || '').toLowerCase() === 'icing')
  //   .sort((a: any, b: any) => {
  //     const pa = getIcingPosition(a.element_name || '') === 'side' ? 0 : 1;
  //     const pb = getIcingPosition(b.element_name || '') === 'side' ? 0 : 1;
  //     return pa - pb;
  //   });
  const normalDecs = decorations.filter(
    (d: any) => (d.element_type || '').toLowerCase() !== 'icing'
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        borderRadius: 8,
        position: 'relative',
      }}
    >
      {/* ── Base cake — shape-aware ── */}
      <SvgXml xml={cakeXml} width="100%" height="100%" />

      {/* ── Icing decorations — full-canvas overlays ── */}
      {/* {icings.map((dec: any, idx: number) => {
        const position = getIcingPosition(dec.element_name || '');
        const color = getIcingColorFromName(dec.element_name || '');
        const icingXml = buildIcingSvg({
          shape,
          position,
          color,
          tierIndex: dec.tier_index ?? 0,
          tierCount,
        });
        return (
          <View
            key={`icing-${idx}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
            pointerEvents="none"
          >
            <SvgXml xml={icingXml} width="100%" height="100%" />
          </View>
        );
      })} */}

      {/* ── Regular draggable decorations — correct scale ── */}
      {normalDecs.map((dec: any, idx: number) => {
        const scaleFactor = dec.scale ?? 1;
        // Base decoration is 40px in the 340px main canvas.
        // Scale proportionally to whatever size this preview is.
        const decSize = (40 / CANVAS_SIZE) * size * scaleFactor;
        const x = (dec.x / CANVAS_SIZE) * size;
        const y = (dec.y / CANVAS_SIZE) * size;
        const source = getDecorationSource(dec.element_name, dec.image_url);

        return (
          <View
            key={`dec-${idx}`}
            style={{
              position: 'absolute',
              left: x - decSize / 2,
              top: y - decSize / 2,
              width: decSize,
              height: decSize,
            }}
          >
            <SvgDecoration
              svgSource={getImageUrl(dec.svg_source) ?? dec.svg_source}
              imageUrl={source}
              size={decSize}
              color={dec.color}
              colors={dec.colors}
            />
          </View>
        );
      })}
    </View>
  );
});

const ProductImage = memo(({ imageUrl, size = 100 }: { imageUrl?: string; size?: number }) => {
  const [err, setErr] = useState(false);
  const uri = getImageUrl(imageUrl);
  if (!uri || err) {
    return (
      <View
        style={[s.imgFallback, { width: size, height: size, borderRadius: size * 0.16 }]}
      >
        <MaterialCommunityIcons name="cake-variant" size={size * 0.4} color={MUTED_GRAY} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size * 0.16 }}
      resizeMode="cover"
      onError={() => setErr(true)}
    />
  );
});

const StatusBadge = memo(({ status }: { status: string }) => {
  const color = STATUS_COLOR[status] || MUTED_GRAY;
  const bg = STATUS_BG[status] || "rgba(166,162,154,0.1)";
  return (
    <View style={[s.statusBadge, { backgroundColor: bg, borderColor: color + "44" }]}>
      <View style={[s.statusDot, { backgroundColor: color }]} />
      <Text style={[s.statusText, { color }]}>{status}</Text>
    </View>
  );
});

// ── OrderTimeline component ──
const OrderTimeline = memo(({ events }: { events: TimelineEvent[] }) => {
  if (!events || events.length === 0) {
    return (
      <View style={s.timelineEmpty}>
        <Text style={s.timelineEmptyText}>No tracking updates available</Text>
      </View>
    );
  }

  return (
    <View style={s.timelineContainer}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isFirst = index === 0;
        const isActive = event.isCurrent;

        return (
          <View key={event.id} style={s.timelineItem}>
            {!isFirst && (
              <View
                style={[
                  s.timelineLine,
                  {
                    backgroundColor: event.isCompleted ? event.color : MUTED_GRAY + "40",
                  },
                ]}
              />
            )}

            <View style={s.timelineRow}>
              <View style={s.timelineDotWrapper}>
                <View
                  style={[
                    s.timelineDot,
                    {
                      backgroundColor: event.isCompleted ? event.color : MUTED_GRAY + "40",
                      borderColor: event.isCompleted ? event.color : MUTED_GRAY + "40",
                    },
                    isActive && s.timelineDotActive,
                  ]}
                >
                  {event.isCompleted && (
                    <Ionicons
                      name="checkmark"
                      size={10}
                      color="#fff"
                      style={s.timelineDotIcon}
                    />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      s.timelineVerticalLine,
                      {
                        backgroundColor: event.isCompleted ? event.color : MUTED_GRAY + "30",
                      },
                    ]}
                  />
                )}
              </View>

              <View style={s.timelineContent}>
                <View style={s.timelineHeader}>
                  <Text style={[s.timelineStatus, { color: event.color }]}>
                    {event.label}
                  </Text>
                  <Text style={s.timelineTime}>{event.displayTime}</Text>
                </View>
                <Text style={s.timelineDate}>{event.displayDate}</Text>
                {event.details && (
                  <Text style={s.timelineDetails}>{event.details}</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
});

// ── Helper to get order amount display info ──
const getOrderAmountDisplay = (order: Order) => {
  const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
  const remaining = order.total_amount - totalPaid;
  if (order.payment_status === 'paid' || remaining <= 0) {
    return { displayAmount: order.total_amount, label: 'Paid', isPaid: true };
  } else if (order.payment_status === 'partially_paid') {
    return { displayAmount: remaining, label: 'Remaining Balance', isPaid: false };
  } else {
    return { displayAmount: order.total_amount, label: 'Total', isPaid: false };
  }
};

// ── Main component ──
export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const { refreshOrders, setRefreshOrders } = useAppStore();
  const insets = useSafeAreaInsets();

  // ── Cart store ──
  const cartStore = useCartStore();
  const cartItems = cartStore.items;

  // ── Selection state ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Computed from cart and selection ──
  const selectedItems = useMemo(() => {
    return cartItems.filter(item => selectedIds.has(item.id));
  }, [cartItems, selectedIds]);

  const selectedCount = selectedItems.length;

  const selectedTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [selectedItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [cartItems]);

  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const allSelected = cartItems.length > 0 && cartItems.every(item => selectedIds.has(item.id));

  // ── Loyalty settings state ──
  const [loyaltySettings, setLoyaltySettings] = useState({
    is_30_percent_active: true,
    is_10_star_active: true,
  });

  // ── NEW: Discount eligibility state ──
  const [discountEligibility, setDiscountEligibility] = useState({
    eligible: false,
    discount_percentage: 0,
    discount_id: null,
    already_used_today: false,
    next_available_date: null,
  });

  // ── Set user ID in cart store when auth user changes ──
  useEffect(() => {
    if (user?.id) {
      cartStore.setUserId(String(user.id));
    } else {
      cartStore.setUserId(null);
    }
  }, [user?.id]);

  // ── Clean up selectedIds when cart items are removed ──
  useEffect(() => {
    const validIds = new Set(cartItems.map(item => item.id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      for (const id of newSet) {
        if (!validIds.has(id)) {
          newSet.delete(id);
        }
      }
      return newSet;
    });
  }, [cartItems]);

  // ─── Toggle selection for a single item ───
  const toggleItemSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // ── Existing state ──
  const [activeTab, setActiveTab] = useState("menu");
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cakeSizes, setCakeSizes] = useState<CakeSize[]>([]);
  const [cakeFlavors, setCakeFlavors] = useState<CakeFlavor[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [addons, setAddons] = useState({
    sizeId: undefined as number | undefined,
    cakeSizeId: undefined as number | undefined,
    flavorId: undefined as number | undefined,
    quantity: 1,
  });
  const [pickupDate, setPickupDate] = useState(new Date());
  const [orderNotes, setOrderNotes] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  // ── Review Order Modal state ──
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<{
    product: Product;
    quantity: number;
    sizeId?: number;
    sizeName?: string;
    sizePrice?: number;
    cakeSizeId?: number;
    cakeSizeName?: string;
    cakeSizePrice?: number;
    flavorId?: number;
    flavorName?: string;
    unitPrice: number;
  } | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);

  // ── Pickup Schedule Modal ──
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupItem, setPickupItem] = useState<typeof reviewData | null>(null);

  // ── Date picker visibility ──
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Payment modal state ──
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"down" | "full">("down");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // ── Payment proof state ──
  const [proofImage, setProofImage] = useState<any>(null);

  // ── Stock error modal state ──
  const [stockErrorModalVisible, setStockErrorModalVisible] = useState(false);
  const [stockErrorMessages, setStockErrorMessages] = useState<string[]>([]);

  // ── Notification store ──
  const notificationStore = useNotificationStore();
  const notificationsList = notificationStore.notifications;
  const unreadCount = notificationStore.unreadCount;
  const markAsRead = notificationStore.markAsRead;
  const clearAllNotifications = notificationStore.clearAll;

  // ── Toast detection ──
  const prevNotifsRef = useRef<typeof notificationsList>(notificationsList);

  // ── Order detail modal state ──
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [orderActivityLogs, setOrderActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── Pickup Method state ──
  const [tempPickupMethod, setTempPickupMethod] = useState<"customer" | "rider" | null>(null);
  const [tempRiderName, setTempRiderName] = useState("");
  const [tempRiderPhone, setTempRiderPhone] = useState("");
  const [riderPhoto, setRiderPhoto] = useState<any>(null);
  const [riderPhotoPreview, setRiderPhotoPreview] = useState<string | null>(null);
  const [submittingPickup, setSubmittingPickup] = useState(false);
  const [editingPickup, setEditingPickup] = useState(false);

  // ── Order status filter ──
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterOptions = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

  // ── Refs for scroll restoration ──
  const menuScrollRef = useRef<ScrollView>(null);
  const ordersFlatListRef = useRef<FlatList>(null);
  const notificationsFlatListRef = useRef<FlatList>(null);
  const profileScrollRef = useRef<ScrollView>(null);
  const scrollOffsets = useRef({
    menu: 0,
    orders: 0,
    notifications: 0,
    profile: 0,
  });

  // ── Product cache per category ──
  const productCache = useRef<Record<number, Product[]>>({});

  // ── Memoized derived data ──
  const filteredOrders = useMemo(() => {
    return orderStatusFilter === 'all'
      ? orders
      : orders.filter(order => order.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const initials = useMemo(() => {
    return `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();
  }, [user?.first_name, user?.last_name]);

  // ── Feedback state ──
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedbackOrder, setSelectedFeedbackOrder] = useState<Order | null>(null);
  const [selectedFeedbackProduct, setSelectedFeedbackProduct] = useState<any>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState<'edit' | 'confirm'>('edit');

  // ── View Review state ──
  const [showViewReviewModal, setShowViewReviewModal] = useState(false);
  const [viewReviewData, setViewReviewData] = useState<any>(null);
  const [viewReviewOrder, setViewReviewOrder] = useState<Order | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // ── Fetch loyalty settings ──
  const fetchLoyaltySettings = async () => {
    try {
      const res = await axios.get('/loyalty/settings');
      setLoyaltySettings(res.data);
    } catch (err) {
      console.error('Failed to fetch loyalty settings', err);
      setLoyaltySettings({
        is_30_percent_active: true,
        is_10_star_active: true,
      });
    }
  };

  // ── NEW: Fetch discount eligibility ──
  const fetchDiscountEligibility = async () => {
    try {
      const res = await axios.get('/customer/discount-eligibility');
      setDiscountEligibility(res.data);
    } catch (err) {
      console.error('Failed to fetch discount eligibility', err);
      // Fallback: no discount
      setDiscountEligibility({
        eligible: false,
        discount_percentage: 0,
        discount_id: null,
        already_used_today: false,
        next_available_date: null,
      });
    }
  };

  // ── Fetch functions ──
  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get("/categories");
      const activeCats = (res.data.categories || []).filter((c: Category) => c.is_active);
      setCategories(activeCats);
      if (activeCats.length && !selectedCategory) setSelectedCategory(activeCats[0].id);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load categories");
    }
  }, [selectedCategory]);

  const fetchProducts = useCallback(async (categoryId: number) => {
    if (productCache.current[categoryId]) {
      setProducts(productCache.current[categoryId]);
      setLoadingMenu(false);
      return;
    }
    setLoadingMenu(true);
    try {
      const res = await axios.get(`/menu?category=${categoryId}`);
      const fetched = res.data.products || [];
      productCache.current[categoryId] = fetched;
      setProducts(fetched);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to load products");
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await axios.get("/customer/orders");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchCakeSizes = useCallback(async () => {
    try {
      const res = await axios.get("/cake-sizes");
      setCakeSizes((res.data || []).filter((s: CakeSize) => s.is_active));
    } catch (err) {
      console.error("Failed to fetch cake sizes", err);
    }
  }, []);

  const fetchCakeFlavors = useCallback(async () => {
    try {
      const res = await axios.get("/cake-flavors");
      setCakeFlavors((res.data || []).filter((f: CakeFlavor) => f.is_active));
    } catch (err) {
      console.error("Failed to fetch cake flavors", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {}, []);

  const fetchOrderLogs = useCallback(async (orderId: number) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`/orders/${orderId}/logs`);
      setOrderActivityLogs(res.data.logs || []);
    } catch (err) {
      console.error("Failed to fetch order logs", err);
      setOrderActivityLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // ── Helper to parse timeline events ──
  const parseTimelineEvents = useCallback((order: Order, logs: any[]): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const statusMap: Record<string, { label: string; icon: string; color: string }> = {
      pending: { label: "Order Placed", icon: "time-outline", color: PENDING_COLOR },
      confirmed: { label: "Order Confirmed", icon: "checkmark-circle-outline", color: CONFIRMED_COLOR },
      preparing: { label: "Preparing", icon: "cog-outline", color: PREPARING_COLOR },
      ready: { label: "Ready for Pickup", icon: "checkmark-done-outline", color: READY_COLOR },
      completed: { label: "Completed", icon: "flag-outline", color: COMPLETED_COLOR },
      cancelled: { label: "Cancelled", icon: "close-circle-outline", color: CANCELLED_COLOR },
      rejected: { label: "Rejected", icon: "ban-outline", color: REJECTED_COLOR },
    };

    const placedTimestamp = order.created_at || order.order_date || new Date().toISOString();
    const placedTime = formatTime(placedTimestamp);
    const placedDate = formatDisplayDate(placedTimestamp);
    events.push({
      id: "placed",
      status: "pending",
      label: "Order Placed",
      timestamp: placedTimestamp,
      displayTime: placedTime,
      displayDate: placedDate,
      details: `Order #${order.order_number}`,
      icon: "time-outline",
      color: PENDING_COLOR,
      isCurrent: order.status === "pending" && !logs.some((l) => l.details?.includes("approved") || l.details?.includes("confirmed")),
      isCompleted: true,
    });

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const processedStatuses = new Set<string>();
    const statusPatterns: Record<string, RegExp[]> = {
      confirmed: [/approved/, /confirmed/, /status changed from .* to confirmed/, /changed status from .* to confirmed/],
      preparing: [/preparing/, /status changed from .* to preparing/, /changed status from .* to preparing/],
      ready: [/ready/, /status changed from .* to ready/, /changed status from .* to ready/],
      completed: [/completed/, /status changed from .* to completed/, /changed status from .* to completed/],
      cancelled: [/cancelled/, /cancel/i, /status changed from .* to cancelled/, /changed status from .* to cancelled/],
      rejected: [/rejected/, /reject/i],
    };

    for (const log of sortedLogs) {
      const details = log.details || "";
      let foundStatus: string | null = null;
      let extraDetails = "";
      for (const [status, patterns] of Object.entries(statusPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(details)) {
            foundStatus = status;
            if (status === "rejected" || status === "cancelled") {
              const reasonMatch = details.match(/Reason:\s*(.+?)(?:\.|$)/);
              if (reasonMatch) extraDetails = reasonMatch[1];
              else {
                const match = details.match(/rejected[:\s]+(.+?)(?:\.|$)/i) ||
                             details.match(/cancelled[:\s]+(.+?)(?:\.|$)/i);
                if (match) extraDetails = match[1];
              }
            }
            break;
          }
        }
        if (foundStatus) break;
      }
      if (foundStatus && !processedStatuses.has(foundStatus)) {
        const statusInfo = statusMap[foundStatus];
        if (statusInfo) {
          const logTime = formatManilaTime(log.created_at);
          const logDate = formatManilaDateLong(log.created_at);

          events.push({
            id: log.id.toString(),
            status: foundStatus,
            label: statusInfo.label,
            timestamp: log.created_at,
            displayTime: logTime,
            displayDate: logDate,
            details: extraDetails || undefined,
            icon: statusInfo.icon,
            color: statusInfo.color,
            isCurrent: order.status === foundStatus,
            isCompleted: foundStatus !== "cancelled" && foundStatus !== "rejected" && order.status !== "pending",
          });
          processedStatuses.add(foundStatus);
        }
      }
    }

    const finalStatuses = ["confirmed", "preparing", "ready", "completed", "cancelled", "rejected"];
    if (finalStatuses.includes(order.status) && !processedStatuses.has(order.status)) {
      const statusInfo = statusMap[order.status];
      if (statusInfo) {
        let details = undefined;
        if (order.status === "rejected" && order.notes?.includes("[REJECTED]:")) {
          details = order.notes.replace(/\[REJECTED\]:\s*/, "");
        } else if (order.status === "cancelled" && order.notes?.includes("[CANCELLED]:")) {
          details = order.notes.replace(/\[CANCELLED\]:\s*/, "");
        }
        let fallbackTimestamp = order.updated_at || order.created_at || new Date().toISOString();
        if (sortedLogs.length > 0) {
          const lastLog = sortedLogs[sortedLogs.length - 1];
          fallbackTimestamp = lastLog.created_at;
        }
        const finalTime = formatManilaTime(fallbackTimestamp);
        const finalDate = formatManilaDateLong(fallbackTimestamp);

        events.push({
          id: "final-" + order.status,
          status: order.status,
          label: statusInfo.label,
          timestamp: fallbackTimestamp,
          displayTime: finalTime,
          displayDate: finalDate,
          details: details,
          icon: statusInfo.icon,
          color: statusInfo.color,
          isCurrent: true,
          isCompleted: order.status !== "cancelled" && order.status !== "rejected",
        });
      }
    }

    events.sort((a, b) => {
      const orderMap = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
      const orderA = orderMap.indexOf(a.status);
      const orderB = orderMap.indexOf(b.status);
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    if (events.length > 0) {
      events.forEach((e) => (e.isCurrent = false));
      events[events.length - 1].isCurrent = true;
    }

    return events;
  }, []);

  // ── Refresh function (pull‑to‑refresh) ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    productCache.current = {};
    await Promise.allSettled([
      fetchOrders(),
      fetchNotifications(),
      fetchCategories(),
      fetchCakeSizes(),
      fetchCakeFlavors(),
      fetchLoyaltySettings(),
      fetchDiscountEligibility(),
      selectedCategory ? fetchProducts(selectedCategory) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [fetchOrders, fetchNotifications, fetchCategories, fetchCakeSizes, fetchCakeFlavors, selectedCategory, fetchProducts]);

  // ── Initial data fetch on mount ──
  useEffect(() => {
    fetchCategories();
    fetchOrders();
    fetchCakeSizes();
    fetchCakeFlavors();
    fetchLoyaltySettings();
    fetchDiscountEligibility();
  }, [fetchCategories, fetchOrders, fetchCakeSizes, fetchCakeFlavors]);

  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory);
    }
  }, [selectedCategory, fetchProducts]);

  useEffect(() => {
    if (refreshOrders) {
      setActiveTab('orders');
      fetchOrders();
      setRefreshOrders(false);
    }
  }, [refreshOrders]);

  // ── Polling for notifications (60s interval, pauses when app is backgrounded) ──
  useEffect(() => {
    let isMounted = true;
    let currentAppState = AppState.currentState;
    let backoffUntil = 0;

    const appStateSub = AppState.addEventListener('change', (next) => {
      currentAppState = next;
    });

    const fetchActivityLogs = async () => {
      try {
        const res = await axios.get('/user/activity-logs', {
          params: { limit: 20, type: 'order_status_updated' },
        });
        return res.data.logs || [];
      } catch {
        return [];
      }
    };

    const generateNotificationsFromOrders = async () => {
      // Skip when app is backgrounded
      if (currentAppState !== 'active') return;
      // Skip if we're in a backoff window (after a 429)
      if (Date.now() < backoffUntil) return;

      try {
        const res = await axios.get('/customer/orders');
        const latestOrders: Order[] = res.data.orders || [];
        const store = useNotificationStore.getState();
        const existingNotifs = store.notifications;

        latestOrders.forEach((order) => {
          if (order.status === 'pending') return;
          let message = '';
          let type = order.status;
          switch (order.status) {
            case 'confirmed':
              message = `Your order #${order.order_number} has been confirmed.`;
              break;
            case 'preparing':
              message = `Your order #${order.order_number} is now being prepared.`;
              break;
            case 'ready':
              message = `Your order #${order.order_number} is ready for pickup.`;
              break;
            case 'completed':
              message = `Your order #${order.order_number} has been completed.`;
              break;
            case 'cancelled':
              if (order.notes && order.notes.includes('[REJECTED]:')) {
                const reason = order.notes.replace(/\[REJECTED\]:\s*/, '');
                message = `Your order #${order.order_number} has been rejected. Reason: ${reason}`;
                type = 'rejected';
              } else {
                message = `Your order #${order.order_number} has been cancelled.`;
              }
              break;
            default:
              return;
          }
          const alreadyNotified = existingNotifs.some(
            (n) => n.order_id === order.id && n.message === message
          );
          if (alreadyNotified) return;
          const timestamp = order.updated_at || order.created_at || new Date().toISOString();
          store.addNotification({
            order_id: order.id,
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            message,
            type,
            updated_at: timestamp,
          });
        });

        const logs = await fetchActivityLogs();
        logs.forEach((log: any) => {
          if (log.details && log.details.includes('pickup schedule')) {
            const order = latestOrders.find((o) => o.id === log.reference_id);
            if (!order) return;
            const message = log.details;
            const alreadyNotified = existingNotifs.some(
              (n) => n.order_id === order.id && n.message === message
            );
            if (alreadyNotified) return;
            store.addNotification({
              order_id: order.id,
              order_number: order.order_number,
              status: 'schedule_updated',
              payment_status: order.payment_status,
              message,
              type: 'schedule_updated',
              updated_at: log.created_at,
            });
          }
        });
      } catch (e: any) {
        // 429 → back off for 2 minutes before trying again
        if (e?.response?.status === 429) {
          backoffUntil = Date.now() + 2 * 60 * 1000;
        }
        // Silent — polling is best-effort
      }
    };

    // First poll after a small delay (don't hit the API during mount spike)
    const initialTimer = setTimeout(generateNotificationsFromOrders, 3000);

    const interval = setInterval(() => {
      if (isMounted) generateNotificationsFromOrders();
    }, 60000);   // ← 60 seconds instead of 5

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  // ── Toast pop‑up on new notification ──
  useEffect(() => {
    const current = notificationsList;
    const prev = prevNotifsRef.current;
    if (current.length > prev.length) {
      const newNotif = current.find((n) => !prev.some((p) => p.id === n.id));
      if (newNotif) {
        Toast.show({
          type: "info",
          text1: "📦 Order Update",
          text2: newNotif.message,
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 50,
        });
      }
    }
    prevNotifsRef.current = current;
  }, [notificationsList]);

  // ── Refresh orders when a relevant notification arrives ──
  const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
  const lastOrderFetchRef = useRef<number>(Date.now());
  useEffect(() => {
    const currentNotifs = notificationsList;
    const prevNotifs = prevNotifsRef.current;
    if (currentNotifs.length > prevNotifs.length) {
      const newNotif = currentNotifs.find((n) => !prevNotifs.some((p) => p.id === n.id));
      if (newNotif && (orderStatuses.includes(newNotif.type) || newNotif.type === 'schedule_updated' || newNotif.type === 'order_status_updated')) {
        const now = Date.now();
        if (now - lastOrderFetchRef.current > 2000) {
          lastOrderFetchRef.current = now;
          fetchOrders();
        }
      }
    }
    prevNotifsRef.current = currentNotifs;
  }, [notificationsList, fetchOrders]);

  // ── Cancel order handler ──
  const handleCancelOrder = useCallback(async (order: Order) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?\n\nThis action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.put(`/customer/orders/${order.id}/cancel`);
              fetchOrders();
              Alert.alert("Cancelled", "Your order has been cancelled.");
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Failed to cancel order.");
            }
          }
        }
      ]
    );
  }, [fetchOrders]);

  // ── Cart actions using store ──
  const removeFromCart = useCallback((itemId: string) => {
    if (user?.id) {
      const index = cartItems.findIndex(item => item.id === itemId);
      if (index !== -1) {
        cartStore.removeItem(String(user.id), index);
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    }
  }, [user?.id, cartItems]);

  const handleQuantityIncrement = useCallback(() => {
    if (!selectedProduct) return;
    const newQty = addons.quantity + 1;
    if (selectedProduct.track_stock && newQty > (selectedProduct.stock_quantity || 0)) {
      Alert.alert(
        "Insufficient Stock",
        `Insufficient stock for ${selectedProduct.name}.\nAvailable: ${selectedProduct.stock_quantity}\nRequested: ${newQty}`
      );
      return;
    }
    setAddons({ ...addons, quantity: newQty });
  }, [selectedProduct, addons]);

  const handleQuantityDecrement = useCallback(() => {
    const newQty = Math.max(1, addons.quantity - 1);
    setAddons({ ...addons, quantity: newQty });
  }, [addons]);

  // ── Add to Cart ──
  const addToCart = useCallback(() => {
    if (!selectedProduct) return;
    if (selectedProduct.track_stock && addons.quantity > (selectedProduct.stock_quantity || 0)) {
      Alert.alert(
        "Insufficient Stock",
        `Insufficient stock for ${selectedProduct.name}.\nAvailable: ${selectedProduct.stock_quantity}\nRequested: ${addons.quantity}`
      );
      return;
    }

    let unitPrice = Number(selectedProduct.base_price) || 0;
    if (selectedProduct.has_size_options && addons.sizeId) {
      const size = selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId);
      if (size) {
        unitPrice += Number(size.price_modifier) || 0;
      }
    }
    if (addons.cakeSizeId) {
      const cakeSize = cakeSizes.find(s => s.id === addons.cakeSizeId);
      if (cakeSize) {
        unitPrice += Number(cakeSize.price_modifier) || 0;
      }
    }

    const item: CartItem = {
      id: '',
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        description: selectedProduct.description,
        base_price: selectedProduct.base_price,
        has_size_options: selectedProduct.has_size_options,
        image_url: selectedProduct.image_url,
        drinkSizes: selectedProduct.drinkSizes,
        track_stock: selectedProduct.track_stock,
        stock_quantity: selectedProduct.stock_quantity,
      },
      quantity: addons.quantity,
      sizeId: selectedProduct.has_size_options ? addons.sizeId : undefined,
      sizeName: selectedProduct.has_size_options && addons.sizeId
        ? selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId)?.size_name
        : undefined,
      sizePrice: selectedProduct.has_size_options && addons.sizeId
        ? selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId)?.price_modifier || 0
        : 0,
      cakeSizeId: addons.cakeSizeId,
      cakeSizeName: cakeSizes.find(s => s.id === addons.cakeSizeId)?.size_name,
      cakeSizePrice: cakeSizes.find(s => s.id === addons.cakeSizeId)?.price_modifier || 0,
      flavorId: addons.flavorId,
      flavorName: cakeFlavors.find(f => f.id === addons.flavorId)?.flavor_name,
      unitPrice,
    };

    if (user?.id) {
      cartStore.addItem(String(user.id), item);
    } else {
      Alert.alert("Error", "You must be logged in to add to cart.");
      return;
    }

    setProductModalVisible(false);
    Alert.alert("Added to cart", `${selectedProduct.name} has been added.`);
  }, [selectedProduct, addons, cakeSizes, cakeFlavors, user?.id]);

  // ── Review Order ──
  const handleReviewOrder = useCallback(() => {
    if (!selectedProduct) return;
    if (selectedProduct.track_stock && addons.quantity > (selectedProduct.stock_quantity || 0)) {
      Alert.alert(
        "Insufficient Stock",
        `Insufficient stock for ${selectedProduct.name}.\nAvailable: ${selectedProduct.stock_quantity}\nRequested: ${addons.quantity}`
      );
      return;
    }

    let unitPrice = Number(selectedProduct.base_price) || 0;
    if (selectedProduct.has_size_options && addons.sizeId) {
      const size = selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId);
      if (size) {
        unitPrice += Number(size.price_modifier) || 0;
      }
    }
    if (addons.cakeSizeId) {
      const cakeSize = cakeSizes.find(s => s.id === addons.cakeSizeId);
      if (cakeSize) {
        unitPrice += Number(cakeSize.price_modifier) || 0;
      }
    }

    const data = {
      product: selectedProduct,
      quantity: addons.quantity,
      sizeId: selectedProduct.has_size_options ? addons.sizeId : undefined,
      sizeName: selectedProduct.has_size_options && addons.sizeId
        ? selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId)?.size_name
        : undefined,
      sizePrice: selectedProduct.has_size_options && addons.sizeId
        ? selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId)?.price_modifier || 0
        : 0,
      cakeSizeId: addons.cakeSizeId,
      cakeSizeName: cakeSizes.find(s => s.id === addons.cakeSizeId)?.size_name,
      cakeSizePrice: cakeSizes.find(s => s.id === addons.cakeSizeId)?.price_modifier || 0,
      flavorId: addons.flavorId,
      flavorName: cakeFlavors.find(f => f.id === addons.flavorId)?.flavor_name,
      unitPrice,
    };
    setReviewData(data);
    setIsEditingReview(false);
    setShowReviewModal(true);
  }, [selectedProduct, addons, cakeSizes, cakeFlavors]);

  const toggleEditMode = useCallback(() => {
    if (isEditingReview) {
      if (reviewData && selectedProduct) {
        if (selectedProduct.track_stock && addons.quantity > (selectedProduct.stock_quantity || 0)) {
          Alert.alert(
            "Insufficient Stock",
            `Insufficient stock for ${selectedProduct.name}.\nAvailable: ${selectedProduct.stock_quantity}\nRequested: ${addons.quantity}`
          );
          return;
        }
        let unitPrice = Number(selectedProduct.base_price) || 0;
        if (selectedProduct.has_size_options && addons.sizeId) {
          const size = selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId);
          if (size) unitPrice += Number(size.price_modifier) || 0;
        }
        if (addons.cakeSizeId) {
          const cakeSize = cakeSizes.find(s => s.id === addons.cakeSizeId);
          if (cakeSize) unitPrice += Number(cakeSize.price_modifier) || 0;
        }
        const updated = {
          ...reviewData,
          quantity: addons.quantity,
          sizeId: selectedProduct.has_size_options ? addons.sizeId : reviewData.sizeId,
          sizeName: selectedProduct.has_size_options && addons.sizeId
            ? selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId)?.size_name
            : reviewData.sizeName,
          sizePrice: selectedProduct.has_size_options && addons.sizeId
            ? Number(selectedProduct.drinkSizes?.find(s => s.id === addons.sizeId)?.price_modifier) || 0
            : reviewData.sizePrice || 0,
          cakeSizeId: addons.cakeSizeId || reviewData.cakeSizeId,
          cakeSizeName: cakeSizes.find(s => s.id === (addons.cakeSizeId || reviewData.cakeSizeId))?.size_name,
          cakeSizePrice: Number(cakeSizes.find(s => s.id === (addons.cakeSizeId || reviewData.cakeSizeId))?.price_modifier) || 0,
          flavorId: addons.flavorId || reviewData.flavorId,
          flavorName: cakeFlavors.find(f => f.id === (addons.flavorId || reviewData.flavorId))?.flavor_name,
          unitPrice,
        };
        setReviewData(updated);
      }
      setIsEditingReview(false);
    } else {
      if (reviewData) {
        setAddons({
          sizeId: reviewData.sizeId,
          cakeSizeId: reviewData.cakeSizeId,
          flavorId: reviewData.flavorId,
          quantity: reviewData.quantity,
        });
      }
      setIsEditingReview(true);
    }
  }, [isEditingReview, reviewData, selectedProduct, addons, cakeSizes, cakeFlavors]);

  const handleConfirmOrder = useCallback(() => {
    if (!reviewData) return;
    if (reviewData.product.track_stock && reviewData.quantity > (reviewData.product.stock_quantity || 0)) {
      Alert.alert(
        "Insufficient Stock",
        `Insufficient stock for ${reviewData.product.name}.\nAvailable: ${reviewData.product.stock_quantity}\nRequested: ${reviewData.quantity}`
      );
      return;
    }
    setShowReviewModal(false);
    setPickupItem(reviewData);
    setShowPickupModal(true);
  }, [reviewData]);

  // ── Place single order ──
  const placeSingleOrder = useCallback(async () => {
    if (!pickupItem) return;
    if (!pickupDate) {
      Alert.alert("Missing schedule", "Please select pickup date");
      return;
    }
    setPlacingOrder(true);
    try {
      const orderItems = [
        {
          menu_id: pickupItem.product.id,
          quantity: pickupItem.quantity,
          size_id: pickupItem.sizeId,
          cake_size_id: pickupItem.cakeSizeId,
          flavor_id: pickupItem.flavorId,
        },
      ];
      const pickupDateStr = `${pickupDate.getFullYear()}-${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(pickupDate.getDate()).padStart(2, '0')}`;
      const currentTime = getCurrentTimeString();

      const payload: any = {
        items: orderItems,
        pickup_date: pickupDateStr,
        pickup_time: currentTime,
        notes: orderNotes,
      };

      // 👇 Include discount if eligible and not already used today
      if (discountEligibility.eligible && !discountEligibility.already_used_today && discountEligibility.discount_id) {
        payload.discount_id = discountEligibility.discount_id;
      }

      await axios.post("/customer/orders", payload);

      Alert.alert(
        "Order Submitted!",
        "Your order has been placed and is pending admin approval. You will be able to pay once it is confirmed.",
        [
          {
            text: "OK",
            onPress: () => {
              setProductModalVisible(false);
              setSelectedProduct(null);
              setShowPickupModal(false);
              setPickupItem(null);
              setOrderNotes("");
              setActiveTab("orders");
              fetchOrders();
              fetchDiscountEligibility(); // Refresh eligibility after order
            },
          },
        ]
      );
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const errorData = err.response.data.errors;
        const errorMessages = Array.isArray(errorData)
          ? errorData
          : Object.values(errorData).flat();
        setStockErrorMessages(errorMessages);
        setStockErrorModalVisible(true);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Failed to create order");
      }
    } finally {
      setPlacingOrder(false);
    }
  }, [pickupItem, pickupDate, orderNotes, fetchOrders, discountEligibility]);

  // ── Image picker for payment proof ──
  const pickProofImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery permission to upload proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setProofImage({
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'proof_' + Date.now() + '.jpg',
      });
    }
  }, []);

  // ── submitPayment ──
  const submitPayment = useCallback(async () => {
    if (!pendingOrder) return;

    let amountToPay = 0;
    const total = pendingOrder.total_amount;
    if (pendingOrder.payment_status === "partially_paid") {
      amountToPay = Math.round(total * 0.5 * 100) / 100;
    } else if (paymentOption === "down") {
      amountToPay = Math.round(total * 0.5 * 100) / 100;
    } else {
      amountToPay = Math.round(total * 100) / 100;
    }

    if (!referenceNumber.trim()) {
      Alert.alert('Missing Reference', 'Please enter the GCash reference number.');
      return;
    }

    if (!proofImage) {
      Alert.alert('Missing Proof', 'Please upload a screenshot of your payment receipt.');
      return;
    }

    const formData = new FormData();
    formData.append('order_id', pendingOrder.id.toString());
    formData.append('payment_method', paymentMethod);
    formData.append('amount_paid', amountToPay.toString());
    formData.append('reference_number', referenceNumber.trim());

    formData.append('proof_image', {
      uri: proofImage.uri,
      name: proofImage.name,
      type: proofImage.type,
    } as any);

    setSubmittingPayment(true);
    try {
      await axios.post('/customer/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        "Payment Successful 🎉",
        `Your ${
          pendingOrder.payment_status === "partially_paid" ? "remaining balance" : paymentOption === "down" ? "50% down payment" : "full payment"
        } has been received.`
      );
      setShowPaymentModal(false);
      setPendingOrder(null);
      setReferenceNumber("");
      setProofImage(null);
      fetchOrders();
    } catch (err: any) {
      Alert.alert(
        "Payment Failed",
        err.response?.data?.message || "Could not process payment. Please try again."
      );
    } finally {
      setSubmittingPayment(false);
    }
  }, [pendingOrder, paymentOption, paymentMethod, referenceNumber, proofImage, fetchOrders]);

  // ── Place order from cart (selected items only) ──
  const placeOrder = useCallback(async () => {
    if (selectedItems.length === 0) {
      Alert.alert("No selection", "Please select at least one product to place an order.");
      return;
    }
    if (!pickupDate) {
      Alert.alert("Missing schedule", "Please select pickup date");
      return;
    }
    setPlacingOrder(true);
    const orderItems = selectedItems.map((item) => ({
      menu_id: item.product.id,
      quantity: item.quantity,
      size_id: item.sizeId,
      cake_size_id: item.cakeSizeId,
      flavor_id: item.flavorId,
    }));
    const pickupDateStr = `${pickupDate.getFullYear()}-${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(pickupDate.getDate()).padStart(2, '0')}`;
    const currentTime = getCurrentTimeString();

    const payload: any = {
      items: orderItems,
      pickup_date: pickupDateStr,
      pickup_time: currentTime,
      notes: orderNotes,
    };

    // 👇 Include discount if eligible and not already used today
    if (discountEligibility.eligible && !discountEligibility.already_used_today && discountEligibility.discount_id) {
      payload.discount_id = discountEligibility.discount_id;
    }

    try {
      await axios.post("/customer/orders", payload);

      Alert.alert(
        "Order Submitted!",
        "Your order has been placed and is pending admin approval. You will be able to pay once it is confirmed.",
        [
          {
            text: "OK",
            onPress: () => {
              const remainingItems = cartItems.filter(item => !selectedIds.has(item.id));
              if (user?.id) cartStore.setItems(String(user.id), remainingItems);
              setSelectedIds(new Set());
              setOrderNotes("");
              setShowCart(false);
              setActiveTab("orders");
              fetchOrders();
              fetchDiscountEligibility(); // Refresh eligibility after order
            },
          },
        ]
      );
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const errorData = err.response.data.errors;
        const errorMessages = Array.isArray(errorData)
          ? errorData
          : Object.values(errorData).flat();
        setStockErrorMessages(errorMessages);
        setStockErrorModalVisible(true);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Failed to create order");
      }
    } finally {
      setPlacingOrder(false);
    }
  }, [selectedItems, selectedIds, pickupDate, orderNotes, user?.id, cartItems, discountEligibility]);

  const handleOrderCardPress = useCallback((order: Order) => {
    setSelectedOrderForDetails(order);
    setShowOrderDetailModal(true);
    fetchOrderLogs(order.id);
    setEditingPickup(false);
    setTempPickupMethod(null);
    setTempRiderName("");
    setTempRiderPhone("");
    setRiderPhoto(null);
    setRiderPhotoPreview(null);
  }, [fetchOrderLogs]);

  const handleNotificationPress = useCallback((notification: any) => {
    markAsRead(notification.id);
    const order = orders.find((o) => o.id === notification.order_id);
    if (order) {
      setSelectedOrderForDetails(order);
      setShowOrderDetailModal(true);
      fetchOrderLogs(order.id);
    } else {
      Alert.alert("Order not found", "Could not find the order details.");
    }
  }, [orders, markAsRead, fetchOrderLogs]);

  // ── Take photo for rider information ──
  const takeRiderPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setRiderPhoto({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `rider_${Date.now()}.jpg`,
      });
      setRiderPhotoPreview(asset.uri);
    }
  }, []);

  const removeRiderPhoto = useCallback(() => {
    setRiderPhoto(null);
    setRiderPhotoPreview(null);
  }, []);

  // ── Updated submitPickupMethod ──
  const submitPickupMethod = useCallback(async () => {
    if (!selectedOrderForDetails) return;
    if (!tempPickupMethod) {
      Alert.alert("Selection required", "Please choose a pickup method.");
      return;
    }

    if (tempPickupMethod === "rider") {
      const hasName = tempRiderName.trim().length > 0;
      const hasPhone = tempRiderPhone.trim().length > 0;
      const hasPhoto = riderPhoto !== null;
      if (!hasName && !hasPhone && !hasPhoto) {
        Alert.alert("Missing Information", "Please provide rider's name, phone number, or take a photo.");
        return;
      }
    }

    setSubmittingPickup(true);
    try {
      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('pickup_method', tempPickupMethod);

      if (tempPickupMethod === 'rider') {
        if (tempRiderName.trim()) formData.append('rider_name', tempRiderName.trim());
        if (tempRiderPhone.trim()) formData.append('rider_phone', tempRiderPhone.trim());
        if (riderPhoto) {
          formData.append('rider_photo', {
            uri: riderPhoto.uri,
            name: riderPhoto.name,
            type: riderPhoto.type,
          } as any);
        }
      } else {
        formData.append('rider_name', '');
        formData.append('rider_phone', '');
      }

      await axios.post(`/customer/orders/${selectedOrderForDetails.id}/pickup-method`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const res = await axios.get(`/customer/orders`);
      setOrders(res.data.orders || []);
      const updatedOrder = res.data.orders.find((o: Order) => o.id === selectedOrderForDetails.id);
      if (updatedOrder) {
        setSelectedOrderForDetails(updatedOrder);
      }
      Alert.alert("Success", "Pickup method saved successfully.");
      setEditingPickup(false);
      setRiderPhoto(null);
      setRiderPhotoPreview(null);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save pickup method.");
    } finally {
      setSubmittingPickup(false);
    }
  }, [selectedOrderForDetails, tempPickupMethod, tempRiderName, tempRiderPhone, riderPhoto]);

  // ── Submit feedback (with step handling) ──
  const submitFeedback = useCallback(async () => {
    if (!selectedFeedbackOrder) return;
    if (feedbackRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await axios.post('/customer/feedback', {
        order_id: selectedFeedbackOrder.id,
        menu_id: selectedFeedbackProduct?.id || null,
        rating: feedbackRating,
        comment: feedbackComment,
        feedback_type: 'order',
      });

      Alert.alert('Thank You!', 'Your feedback has been submitted.');

      // Update the order's has_review flag locally
      setOrders(prev =>
        prev.map(o =>
          o.id === selectedFeedbackOrder.id ? { ...o, has_review: true } : o
        )
      );

      setShowFeedbackModal(false);
      setSelectedFeedbackOrder(null);
      setSelectedFeedbackProduct(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      setFeedbackStep('edit');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit feedback.';
      Alert.alert('Error', message);
    } finally {
      setSubmittingFeedback(false);
    }
  }, [selectedFeedbackOrder, selectedFeedbackProduct, feedbackRating, feedbackComment]);

  // ── View review handler ──
  const handleViewReview = useCallback(async (order: Order) => {
    setViewReviewOrder(order);
    setLoadingReview(true);
    setShowViewReviewModal(true);
    try {
      const res = await axios.get(`/customer/feedback/${order.id}`);
      setViewReviewData(res.data.review);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load review.');
      setShowViewReviewModal(false);
    } finally {
      setLoadingReview(false);
    }
  }, []);

  // ── Memoized discount calculations ──
  const {
    discountedCartTotal,
    discountAmount,
    discountedItemId,
    discountAppliedToAnyItem,
  } = useMemo(() => {
    if (!discountEligibility.eligible || discountEligibility.already_used_today || cartItems.length === 0) {
      return {
        discountedCartTotal: cartTotal,
        discountAmount: 0,
        discountedItemId: null,
        discountAppliedToAnyItem: false,
      };
    }

    // Find lowest-priced item (by unit price * quantity)
    let lowestItem = null;
    let lowestTotal = Infinity;
    let lowestIndex = -1;
    cartItems.forEach((item, index) => {
      const total = item.unitPrice * item.quantity;
      if (total < lowestTotal) {
        lowestTotal = total;
        lowestItem = item;
        lowestIndex = index;
      }
    });

    if (!lowestItem) {
      return {
        discountedCartTotal: cartTotal,
        discountAmount: 0,
        discountedItemId: null,
        discountAppliedToAnyItem: false,
      };
    }

    const discountPercent = discountEligibility.discount_percentage || 0;
    const discountAmountCalculated = Math.round(lowestTotal * (discountPercent / 100) * 100) / 100;
    const discountedTotal = cartTotal - discountAmountCalculated;

    return {
      discountedCartTotal: discountedTotal,
      discountAmount: discountAmountCalculated,
      discountedItemId: lowestItem.id,
      discountAppliedToAnyItem: true,
    };
  }, [cartItems, cartTotal, discountEligibility]);

  // ── Tab content renderers ──

  const CustomCakeEntry = useCallback(() => (
    <TouchableOpacity
      style={s.customCakeCard}
      onPress={() => {
        setTimeout(() => {
          router.push('/customer/cakeCustomization');
        }, 0);
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[SAGE, SAGE_DARK]}
        style={s.customCakeCardGrad}
      >
        <MaterialCommunityIcons name="cake-variant" size={28} color="#fff" />
        <View style={{ marginLeft: 12 }}>
          <Text style={s.customCakeTitle}>Design Your Own Cake</Text>
          <Text style={s.customCakeSub}>Customize with decorations, flavors, and more</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 'auto' }} />
      </LinearGradient>
    </TouchableOpacity>
  ), []);

  const renderMenuTab = useCallback(() => {
    const filtered = products.filter((p) => p.category_id === selectedCategory);
    const categoryId = selectedCategory;
    const isCached = categoryId ? !!productCache.current[categoryId] : false;
    const showLoading = loadingMenu && !isCached;

    return (
      <View style={s.tabContent}>
        <CustomCakeEntry />
        <ScrollView
          ref={menuScrollRef}
          key="menu-scroll"
          onScroll={(e) => {
            scrollOffsets.current.menu = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <ScrollView
            horizontal
            key="category-scroll"
            showsHorizontalScrollIndicator={false}
            style={s.catScroll}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[s.catPill, active && s.catPillActive]}
                >
                  <Text style={[s.catPillText, active && s.catPillTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {!showLoading && filtered.length > 0 && (
            <Text style={s.countLabel}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </Text>
          )}
          {showLoading ? (
            <View style={s.loaderWrap} key="loading-indicator">
              <ActivityIndicator size="large" color={SAGE} />
              <Text style={s.loaderText}>Loading menu…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyContainerCentered} key="empty-state">
              <View style={s.emptyIconBox}>
                <MaterialCommunityIcons
                  name="cake-variant-outline"
                  size={32}
                  color={MUTED_GRAY}
                  style={{ opacity: 0.5 }}
                />
              </View>
              <Text style={s.emptyText}>No items in this category</Text>
            </View>
          ) : (
            <View style={s.productGrid} key="product-grid">
              {filtered.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={s.productCard}
                  activeOpacity={0.88}
                  onPress={() => {
                    setAddons({
                      sizeId: undefined,
                      cakeSizeId: undefined,
                      flavorId: undefined,
                      quantity: 1,
                    });
                    setSelectedProduct(product);
                    setProductModalVisible(true);
                  }}
                >
                  <View style={s.productCardAccent} />
                  <View style={s.productImgWrap}>
                    <ProductImage imageUrl={product.image_url} size={90} />
                    {product.menu_type === "customizable" && (
                      <View style={s.customBadge}>
                        <Text style={s.customBadgeText}>Custom</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.productInfo}>
                    <Text style={s.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    {product.description ? (
                      <Text style={s.productDesc} numberOfLines={1}>
                        {product.description}
                      </Text>
                    ) : null}
                    <Text style={s.productPrice}>
                      ₱{parseFloat(String(product.base_price)).toLocaleString()}
                    </Text>
                  </View>
                  <View style={s.productAddBtn}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }, [products, selectedCategory, categories, loadingMenu, CustomCakeEntry]);

  const renderOrdersTab = useCallback(() => {
    const isPayable = (order: Order) => {
      return (
        order.status !== "pending" &&
        order.status !== "cancelled" &&
        order.payment_status !== "paid"
      );
    };

    const orderCount = filteredOrders.length;

    return (
      <View style={s.tabContent}>
        <View style={s.tabHeader}>
          <View style={s.tabHeaderIcon}>
            <Ionicons name="receipt-outline" size={15} color="#fff" />
          </View>
          <Text style={s.tabTitle}>Your Orders</Text>
          {orderCount > 0 && (
            <View style={s.countPill}>
              <Text style={s.countPillText}>{orderCount}</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.filterButton}
            onPress={() => setShowFilterDropdown(true)}
            activeOpacity={0.7}
          >
            <Text style={s.filterButtonText}>
              {orderStatusFilter === 'all' ? 'All Status' : orderStatusFilter.charAt(0).toUpperCase() + orderStatusFilter.slice(1)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={SAGE} />
          </TouchableOpacity>
        </View>

        {loadingOrders ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={SAGE} />
            <Text style={s.loaderText}>Loading orders…</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconBox}>
              <Ionicons name="receipt-outline" size={30} color={MUTED_GRAY} style={{ opacity: 0.5 }} />
            </View>
            <Text style={s.emptyText}>No orders found</Text>
            <Text style={s.emptySubText}>
              {orderStatusFilter !== 'all'
                ? `No ${orderStatusFilter} orders. Try a different filter.`
                : 'Add items from the menu to place your first order'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={ordersFlatListRef}
            data={filteredOrders}
            keyExtractor={(item) => item.id.toString()}
            onScroll={(e) => {
              scrollOffsets.current.orders = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            renderItem={({ item: order }) => {
              const amountDisplay = getOrderAmountDisplay(order);
              // Get the first product from the order (for Write Review button)
              const firstItem = order.items?.[0];
              return (
                <TouchableOpacity
                  key={order.id}
                  style={s.orderCard}
                  onPress={() => handleOrderCardPress(order)}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      s.orderCardAccent,
                      { backgroundColor: STATUS_COLOR[order.status] || MUTED_GRAY },
                    ]}
                  />
                  <View style={s.orderCardTop}>
                    <View>
                      <Text style={s.orderNumber}>{order.order_number}</Text>
                      <Text style={s.orderDate}>Pickup: {formatDisplayDate(order.pickup_date)}</Text>
                    </View>
                    <StatusBadge status={order.status} />
                  </View>
                  {order.items && order.items.length > 0 && (
                    <View style={s.orderItems}>
                      {order.items.map((item, idx) => {
                        const menu = item.menu;
                        const isCustom = item.cake_type === 'custom' && item.custom_design;
                        return (
                          <View key={idx} style={s.orderItemRow}>
                            {isCustom ? (
                              <CakePreview design={item.custom_design} size={50} />
                            ) : (
                              <ProductImage imageUrl={menu?.image_url} size={50} />
                            )}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={s.orderItemName}>
                                {isCustom ? 'Custom Cake' : menu?.name || 'Product'}
                              </Text>
                              <Text style={s.orderItemQty}>
                                Qty: {item.quantity} × ₱{item.unit_price}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  <View style={s.orderDivider} />
                  <View style={s.orderCardBottom}>
                    <View>
                      <Text style={s.orderTotal}>
                        ₱{parseFloat(String(amountDisplay.displayAmount)).toLocaleString()}
                      </Text>
                      <Text style={s.orderTotalLabel}>{amountDisplay.label}</Text>
                    </View>
                    {amountDisplay.isPaid && (
                      <View style={s.paidBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={s.paidBadgeText}>Paid</Text>
                      </View>
                    )}
                  </View>

                  {order.status === "cancelled" && order.notes && (
                    <View
                      style={{
                        marginTop: 8,
                        marginHorizontal: 14,
                        padding: 10,
                        backgroundColor: "#FEF2F2",
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#FEE2E2",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#DC2626" }}>Rejected</Text>
                      <Text style={{ fontSize: 13, color: SAGE, marginTop: 2 }}>
                        {order.notes.replace("[REJECTED]: ", "")}
                      </Text>
                    </View>
                  )}

                  {isPayable(order) && (
                    <TouchableOpacity
                      style={s.payButton}
                      onPress={() => {
                        setPendingOrder(order);
                        setPaymentOption(order.payment_status === "partially_paid" ? "down" : "down");
                        setPaymentMethod("gcash");
                        setReferenceNumber("");
                        setProofImage(null);
                        setShowPaymentModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.payButtonText}>Pay Now</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'pending' && (
                    <TouchableOpacity
                      style={s.cancelButton}
                      onPress={() => handleCancelOrder(order)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.cancelButtonText}>Cancel Order</Text>
                    </TouchableOpacity>
                  )}

                  {/* ─── Write Review / View Review ─── */}
                  {order.status === 'completed' && (
                    order.has_review ? (
                      <TouchableOpacity
                        style={s.viewReviewBtn}
                        onPress={() => handleViewReview(order)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.viewReviewBtnText}>View Review</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={s.writeReviewBtn}
                        onPress={() => {
                          setSelectedFeedbackOrder(order);
                          setSelectedFeedbackProduct(firstItem?.menu || null);
                          setFeedbackRating(0);
                          setFeedbackComment('');
                          setFeedbackStep('edit');
                          setShowFeedbackModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={s.writeReviewBtnText}>Write Review</Text>
                      </TouchableOpacity>
                    )
                  )}
                </TouchableOpacity>
              );
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={SAGE}
                colors={[SAGE]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    );
  }, [filteredOrders, loadingOrders, orderStatusFilter, refreshing, onRefresh, handleOrderCardPress, handleCancelOrder, handleViewReview]);

  const renderNotificationsTab = useCallback(() => {
    return (
      <FlatList
        ref={notificationsFlatListRef}
        data={notificationsList}
        keyExtractor={(item) => item.id}
        style={s.tabContent}
        onScroll={(e) => {
          scrollOffsets.current.notifications = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SAGE}
            colors={[SAGE]}
          />
        }
        ListHeaderComponent={
          <View style={s.tabHeader}>
            <View style={s.tabHeaderIcon}>
              <Ionicons name="notifications-outline" size={15} color="#fff" />
            </View>
            <Text style={s.tabTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={s.countPill}>
                <Text style={s.countPillText}>{unreadCount}</Text>
              </View>
            )}
            {notificationsList.length > 0 && (
              <TouchableOpacity onPress={clearAllNotifications} style={{ marginLeft: "auto" }}>
                <Text style={{ fontSize: 12, color: SAGE, fontWeight: "600" }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIconBox}>
              <Ionicons
                name="notifications-off-outline"
                size={30}
                color={MUTED_GRAY}
                style={{ opacity: 0.5 }}
              />
            </View>
            <Text style={s.emptyText}>No notifications yet</Text>
            <Text style={s.emptySubText}>Order updates and alerts will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              s.notificationItem,
              !item.read && { backgroundColor: "rgba(79,95,82,0.05)" },
            ]}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={s.notificationContent}>
              <Text style={s.notificationMessage}>{item.message}</Text>
              <Text style={s.notificationTime}>
                {formatDateTime(item.created_at)}
              </Text>
            </View>
            {!item.read && <View style={s.unreadDot} />}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    );
  }, [notificationsList, unreadCount, refreshing, onRefresh, clearAllNotifications, handleNotificationPress]);

  const renderProfileTab = useCallback(() => {
    const isLoyaltyInactive = !loyaltySettings.is_30_percent_active || !loyaltySettings.is_10_star_active;

    return (
      <ScrollView
        ref={profileScrollRef}
        onScroll={(e) => {
          scrollOffsets.current.profile = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        style={s.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SAGE}
            colors={[SAGE]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={s.tabHeader}>
          <View style={s.tabHeaderIcon}>
            <Ionicons name="person-outline" size={15} color="#fff" />
          </View>
          <Text style={s.tabTitle}>My Profile</Text>
        </View>

        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{initials || "?"}</Text>
          </View>
          <Text style={s.profileName}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={s.profileEmail}>{user?.email}</Text>

          <View style={s.profileDivider} />

          <View style={s.profileInfoRow}>
            <View style={s.profileInfoItem}>
              <Ionicons name="call-outline" size={14} color={MUTED_GRAY} />
              <Text style={s.profileInfoText}>{user?.phone || "—"}</Text>
            </View>
            <View style={s.profileInfoItem}>
              <MaterialCommunityIcons name="star-circle" size={15} color={SAGE} />
              <Text style={[s.profileInfoText, { color: SAGE, fontWeight: "700" }]}>
                {user?.signature_stamps || 0} stamps
              </Text>
            </View>
          </View>
        </View>

        {user?.verification_type && (
          <View style={s.verifCard}>
            <View style={s.verifCardLeft}>
              <MaterialCommunityIcons
                name={
                  user.verification_type === "senior_citizen"
                    ? "account-star"
                    : "wheelchair-accessibility"
                }
                size={20}
                color={SAGE}
              />
              <View style={{ marginLeft: 10 }}>
                <Text style={s.verifType}>
                  {user.verification_type.replace("_", " ")}
                </Text>
                <Text style={s.verifLabel}>Verification type</Text>
              </View>
            </View>
            <StatusBadge status={user.verification_status || "pending"} />
          </View>
        )}

        <View style={s.stampsCard}>
          <Text style={s.stampsTitle}>Loyalty Stamps</Text>
          {isLoyaltyInactive && (
            <View style={{
              backgroundColor: '#FEF3C7',
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: '#F59E0B',
            }}>
              <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600' }}>
                ⚠️ Loyalty rewards are currently inactive. Please contact the admin.
              </Text>
            </View>
          )}
          <View style={s.stampsGrid}>
            {Array.from({ length: 10 }).map((_, i) => {
              const earned = i < (user?.signature_stamps || 0) % 10;
              return (
                <View key={i} style={[s.stamp, earned && s.stampEarned]}>
                  <MaterialCommunityIcons
                    name="star"
                    size={14}
                    color={earned ? "#fff" : MUTED_GRAY}
                  />
                </View>
              );
            })}
          </View>
          <Text style={s.stampsHint}>Collect 10 stamps to earn a reward</Text>
        </View>

        <TouchableOpacity
          style={s.logoutBtn}
          activeOpacity={0.88}
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }, [initials, user, refreshing, onRefresh, logout, loyaltySettings]);

  // ── Main render ──
  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      <LinearGradient
        colors={[SAGE, SAGE_DARK]}
        style={[s.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.headerBlob1} />
        <View style={s.headerBlob2} />

        <View style={s.headerInner}>
          <View>
            <Text style={s.headerGreeting}>Hello, {user?.first_name || "Guest"} 👋</Text>
            <Text style={s.headerSub}>What would you like today?</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              onPress={() => setShowCart(true)}
              style={s.headerCartBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={24} color="#fff" />
              {cartItemsCount > 0 && (
                <View style={s.headerCartBadge}>
                  <Text style={s.headerCartBadgeText}>
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.headerAvatar}>
              <Text style={s.headerAvatarText}>{initials || "?"}</Text>
            </View>
          </View>
        </View>

        <View style={s.headerStamps}>
          <MaterialCommunityIcons name="star-circle" size={14} color={SOFT_WHITE} />
          <Text style={s.headerStampsText}>{user?.signature_stamps || 0} loyalty stamps</Text>
        </View>
      </LinearGradient>

      {/* ─── Tab container with CREAM background ─── */}
      <View style={{ flex: 1, backgroundColor: CREAM }}>
        <View style={{ flex: 1, display: activeTab === 'menu' ? 'flex' : 'none' }}>
          {renderMenuTab()}
        </View>
        <View style={{ flex: 1, display: activeTab === 'orders' ? 'flex' : 'none' }}>
          {renderOrdersTab()}
        </View>
        <View style={{ flex: 1, display: activeTab === 'notifications' ? 'flex' : 'none' }}>
          {renderNotificationsTab()}
        </View>
        <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none' }}>
          {renderProfileTab()}
        </View>
      </View>

      {/* ─── Filter Dropdown Modal ─── */}
      <Modal
        visible={showFilterDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterDropdown(false)}
      >
        <TouchableOpacity
          style={s.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterDropdown(false)}
        >
          <View style={s.dropdownContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    s.dropdownOption,
                    orderStatusFilter === option && s.dropdownOptionActive,
                  ]}
                  onPress={() => {
                    setOrderStatusFilter(option);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      s.dropdownOptionText,
                      orderStatusFilter === option && s.dropdownOptionTextActive,
                    ]}
                  >
                    {option === 'all' ? 'All Status' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Tab Bar ─── */}
      <View style={s.tabBar}>
        {[
          { key: "menu", label: "Menu", icon: "restaurant-outline", activeIcon: "restaurant" },
          { key: "orders", label: "Orders", icon: "receipt-outline", activeIcon: "receipt" },
          { key: "notifications", label: "Alerts", icon: "notifications-outline", activeIcon: "notifications" },
          { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const badgeCount = tab.key === "notifications" ? unreadCount : 0;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={s.tabItem}
              activeOpacity={0.75}
            >
              <View style={[s.tabIconWrap, active && s.tabIconWrapActive]}>
                <Ionicons
                  name={(active ? tab.activeIcon : tab.icon) as any}
                  size={22}
                  color={active ? SAGE : MUTED_GRAY}
                />
              </View>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
              {badgeCount > 0 && (
                <View style={s.tabBadge}>
                  <Text style={s.tabBadgeText}>{badgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Product Detail Modal ─── */}
      <Modal visible={productModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.productModal}>
            <View style={s.modalHandle} />

            <LinearGradient colors={[SAGE, SAGE_DARK]} style={s.modalHeader}>
              <View style={s.modalHeaderBlob} />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>{selectedProduct?.name}</Text>
                  <Text style={s.modalPrice}>
                    ₱
                    {selectedProduct &&
                      parseFloat(String(selectedProduct.base_price)).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setProductModalVisible(false)}
                  style={s.modalCloseBtn}
                >
                  <Ionicons name="close" size={18} color={SOFT_WHITE} />
                </TouchableOpacity>
              </View>
              {selectedProduct?.description ? (
                <Text style={s.modalDesc}>{selectedProduct.description}</Text>
              ) : null}
            </LinearGradient>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {cakeSizes.length > 0 && (
                <View style={s.optionSection}>
                  <Text style={s.optionTitle}>Cake Size</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {cakeSizes.map((size) => {
                      const active = addons.cakeSizeId === size.id;
                      return (
                        <TouchableOpacity
                          key={size.id}
                          onPress={() => setAddons({ ...addons, cakeSizeId: size.id })}
                          style={[s.optionChip, active && s.optionChipActive]}
                        >
                          <Text style={[s.optionChipText, active && s.optionChipTextActive]}>
                            {size.size_name}
                          </Text>
                          <Text
                            style={[
                              s.optionChipSub,
                              active && { color: "rgba(255,255,255,0.75)" },
                            ]}
                          >
                            +₱{size.price_modifier}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {selectedProduct?.has_size_options &&
                selectedProduct.drinkSizes &&
                selectedProduct.drinkSizes.length > 0 && (
                  <View style={s.optionSection}>
                    <Text style={s.optionTitle}>Size</Text>
                    <View style={s.optionWrap}>
                      {selectedProduct.drinkSizes.map((size) => {
                        const active = addons.sizeId === size.id;
                        return (
                          <TouchableOpacity
                            key={size.id}
                            onPress={() => setAddons({ ...addons, sizeId: size.id })}
                            style={[s.optionChip, active && s.optionChipActive]}
                          >
                            <Text style={[s.optionChipText, active && s.optionChipTextActive]}>
                              {size.size_name}
                            </Text>
                            {size.price_modifier > 0 && (
                              <Text
                                style={[
                                  s.optionChipSub,
                                  active && { color: "rgba(255,255,255,0.75)" },
                                ]}
                              >
                                +₱{size.price_modifier}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

              <View style={s.qtyRow}>
                <Text style={s.optionTitle}>Quantity</Text>
                <View style={s.qtyControls}>
                  <TouchableOpacity
                    onPress={handleQuantityDecrement}
                    style={s.qtyBtn}
                  >
                    <Ionicons name="remove" size={18} color={SAGE} />
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{addons.quantity}</Text>
                  <TouchableOpacity
                    onPress={handleQuantityIncrement}
                    style={s.qtyBtn}
                  >
                    <Ionicons name="add" size={18} color={SAGE} />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => setProductModalVisible(false)}
                  style={s.modalCancelBtn}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addToCart} style={s.modalAddBtn} activeOpacity={0.88}>
                  <LinearGradient
                    colors={[SAGE, SAGE_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.modalAddBtnGrad}
                  >
                    <Ionicons name="cart-outline" size={16} color="#fff" />
                    <Text style={s.modalAddBtnText}>Add to Cart</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReviewOrder}
                  style={s.modalOrderBtn}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[SAGE, SAGE_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.modalOrderBtnGrad}
                  >
                    <Text style={s.modalOrderBtnText}>Review Order</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Review Order Modal ─── */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.reviewModal}>
            <View style={s.modalHandle} />

            <View style={s.reviewHeader}>
              <Text style={s.reviewTitle}>Review Your Order</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setIsEditingReview(false);
                }}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={SOFT_WHITE} />
              </TouchableOpacity>
            </View>

            {reviewData && (
              <ScrollView style={s.reviewBody} showsVerticalScrollIndicator={false}>
                <View style={s.reviewItemCard}>
                  <Text style={s.reviewItemName}>{reviewData.product.name}</Text>
                  {reviewData.product.description && (
                    <Text style={s.reviewItemDesc}>{reviewData.product.description}</Text>
                  )}

                  <View style={s.reviewDivider} />

                  <View style={s.reviewRow}>
                    <Text style={s.reviewLabel}>Size</Text>
                    {isEditingReview ? (
                      <View style={s.reviewEditOptions}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {cakeSizes.map((size) => {
                            const active = addons.cakeSizeId === size.id;
                            return (
                              <TouchableOpacity
                                key={size.id}
                                onPress={() => setAddons({ ...addons, cakeSizeId: size.id })}
                                style={[
                                  s.reviewOptionChip,
                                  active && s.reviewOptionChipActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    s.reviewOptionText,
                                    active && s.reviewOptionTextActive,
                                  ]}
                                >
                                  {size.size_name}
                                </Text>
                                <Text
                                  style={[
                                    s.reviewOptionSub,
                                    active && { color: "rgba(255,255,255,0.75)" },
                                  ]}
                                >
                                  +₱{size.price_modifier}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    ) : (
                      <Text style={s.reviewValue}>
                        {reviewData.cakeSizeName || reviewData.sizeName || '—'}
                      </Text>
                    )}
                  </View>

                  <View style={s.reviewRow}>
                    <Text style={s.reviewLabel}>Quantity</Text>
                    {isEditingReview ? (
                      <View style={s.reviewQtyControls}>
                        <TouchableOpacity
                          onPress={handleQuantityDecrement}
                          style={s.reviewQtyBtn}
                        >
                          <Ionicons name="remove" size={18} color={SAGE} />
                        </TouchableOpacity>
                        <Text style={s.reviewQtyValue}>{addons.quantity}</Text>
                        <TouchableOpacity
                          onPress={handleQuantityIncrement}
                          style={s.reviewQtyBtn}
                        >
                          <Ionicons name="add" size={18} color={SAGE} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={s.reviewValue}>×{reviewData.quantity}</Text>
                    )}
                  </View>

                  <View style={s.reviewDivider} />

                  <View style={s.reviewRow}>
                    <Text style={s.reviewLabel}>Unit Price</Text>
                    <Text style={s.reviewValue}>
                      ₱{formatMoney(reviewData.unitPrice)}
                    </Text>
                  </View>

                  {((reviewData.cakeSizePrice || 0) > 0) && (
                    <View style={s.reviewRow}>
                      <Text style={s.reviewLabel}>Size Add‑on</Text>
                      <Text style={s.reviewValue}>+₱{formatMoney(reviewData.cakeSizePrice || 0)}</Text>
                    </View>
                  )}

                  {((reviewData.sizePrice || 0) > 0) && (
                    <View style={s.reviewRow}>
                      <Text style={s.reviewLabel}>Drink Size Add‑on</Text>
                      <Text style={s.reviewValue}>+₱{formatMoney(reviewData.sizePrice || 0)}</Text>
                    </View>
                  )}

                  <View style={s.reviewDivider} />

                  <View style={s.reviewTotalRow}>
                    <Text style={s.reviewTotalLabel}>Total</Text>
                    <Text style={s.reviewTotalValue}>
                      ₱{formatMoney(reviewData.unitPrice * reviewData.quantity)}
                    </Text>
                  </View>
                </View>

                <View style={s.reviewActions}>
                  <TouchableOpacity
                    onPress={toggleEditMode}
                    style={[s.reviewBtn, isEditingReview ? s.reviewBtnDone : s.reviewBtnEdit]}
                  >
                    <Text style={isEditingReview ? s.reviewBtnDoneText : s.reviewBtnEditText}>
                      {isEditingReview ? 'Done' : 'Edit Details'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmOrder}
                    style={[s.reviewBtn, s.reviewBtnConfirm]}
                  >
                    <Text style={s.reviewBtnConfirmText}>Confirm Order</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Pickup Schedule Modal ─── */}
      <Modal visible={showPickupModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.pickupModal}>
            <View style={s.modalHandle} />

            <View style={s.pickupHeader}>
              <Text style={s.pickupTitle}>Set Pickup Schedule</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPickupModal(false);
                  setPickupItem(null);
                }}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={SOFT_WHITE} />
              </TouchableOpacity>
            </View>

            {pickupItem && (
              <ScrollView style={s.pickupBody} showsVerticalScrollIndicator={false}>
                <View style={s.pickupItemCard}>
                  <View style={s.pickupItemImage}>
                    <ProductImage imageUrl={pickupItem.product.image_url} size={80} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.pickupItemName}>{pickupItem.product.name}</Text>
                    {pickupItem.product.description && (
                      <Text style={s.pickupItemDesc}>{pickupItem.product.description}</Text>
                    )}
                    <View style={s.pickupItemDetails}>
                      {pickupItem.cakeSizeName && (
                        <Text style={s.pickupItemDetail}>Size: {pickupItem.cakeSizeName}</Text>
                      )}
                      {pickupItem.flavorName && (
                        <Text style={s.pickupItemDetail}>Flavor: {pickupItem.flavorName}</Text>
                      )}
                      <Text style={s.pickupItemDetail}>Qty: {pickupItem.quantity}</Text>
                    </View>
                    <Text style={s.pickupItemTotal}>
                      Total: ₱{formatMoney(pickupItem.unitPrice * pickupItem.quantity)}
                    </Text>
                  </View>
                </View>

                <View style={s.pickupDivider} />

                <Text style={s.scheduleLabel}>PICKUP SCHEDULE</Text>

                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={s.schedulePill}
                >
                  <View style={s.schedulePillLeft}>
                    <Ionicons name="calendar-outline" size={16} color={SAGE} />
                    <Text style={s.schedulePillLabel}>Date</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.schedulePillValue}>{pickupDate.toDateString()}</Text>
                    <Ionicons name="chevron-forward" size={14} color={MUTED_GRAY} />
                  </View>
                </TouchableOpacity>

                <TextInput
                  placeholder="Special instructions (optional)"
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  multiline
                  placeholderTextColor={MUTED_GRAY}
                  style={s.notesInput}
                />

                <TouchableOpacity
                  onPress={placeSingleOrder}
                  disabled={placingOrder}
                  activeOpacity={0.88}
                  style={[s.placeOrderBtn, placingOrder && { opacity: 0.7 }]}
                >
                  <LinearGradient
                    colors={[SAGE, SAGE_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.placeOrderGrad}
                  >
                    {placingOrder ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.placeOrderText}>Place Order</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Cart Modal ─── */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View style={s.cartOverlay}>
          <View style={s.cartSheet}>
            <View style={s.modalHandle} />

            <View style={s.cartHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={s.cartHeaderIcon}>
                  <Ionicons name="cart-outline" size={15} color="#fff" />
                </View>
                <Text style={s.cartHeaderTitle}>Your Cart</Text>
                <View style={s.countPill}>
                  <Text style={s.countPillText}>{cartItems.length}</Text>
                </View>
                {cartItems.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (allSelected) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(cartItems.map(item => item.id)));
                      }
                    }}
                    style={s.selectAllBtn}
                  >
                    <Text style={s.selectAllBtnText}>
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowCart(false)} style={s.cartCloseBtn}>
                <Ionicons name="close" size={18} color={MUTED_GRAY} />
              </TouchableOpacity>
            </View>

            {cartItems.length === 0 ? (
              <View style={s.emptyCartContainer}>
                <Ionicons name="cart-outline" size={60} color={MUTED_GRAY} style={{ opacity: 0.5 }} />
                <Text style={s.emptyCartTitle}>Your cart is empty</Text>
                <Text style={s.emptyCartSub}>Add some delicious items from the menu</Text>
                <TouchableOpacity
                  style={s.emptyCartBtn}
                  onPress={() => setShowCart(false)}
                >
                  <Text style={s.emptyCartBtnText}>Browse Menu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.cartContainer}>
                <FlatList
                  data={cartItems}
                  keyExtractor={(item) => item.id}
                  style={{ flex: 1 }}
                  renderItem={({ item }) => {
                    const unitPrice = Number(item.unitPrice) || 0;
                    const total = unitPrice * item.quantity;
                    const isSelected = selectedIds.has(item.id);
                    const isDiscounted = discountAppliedToAnyItem && item.id === discountedItemId;
                    const displayTotal = isDiscounted ? total - discountAmount : total;

                    return (
                      <View style={s.cartItem}>
                        <TouchableOpacity
                          onPress={() => toggleItemSelection(item.id)}
                          style={s.checkboxContainer}
                        >
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? SAGE : MUTED_GRAY}
                          />
                        </TouchableOpacity>

                        <ProductImage imageUrl={item.product.image_url} size={42} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.cartItemName}>{item.product.name}</Text>
                          {item.cakeSizeName && (
                            <Text style={s.cartItemMeta}>Cake: {item.cakeSizeName}</Text>
                          )}
                          {item.sizeName && (
                            <Text style={s.cartItemMeta}>Size: {item.sizeName}</Text>
                          )}
                          {item.flavorName && (
                            <Text style={s.cartItemMeta}>Flavor: {item.flavorName}</Text>
                          )}
                          {isDiscounted && (
                            <Text style={{ fontSize: 11, color: '#D4A03D', fontWeight: '500' }}>
                              <Text style={{ textDecorationLine: 'line-through', color: MUTED_GRAY }}>
                                ₱{total.toFixed(2)}
                              </Text>
                              {' → '}
                              <Text style={{ fontWeight: '700', color: SAGE }}>
                                ₱{displayTotal.toFixed(2)}
                              </Text>
                              <Text style={{ color: '#16a34a', marginLeft: 4 }}>
                                (-₱{discountAmount.toFixed(2)})
                              </Text>
                            </Text>
                          )}
                          <Text style={s.cartItemMeta}>
                            Qty: {item.quantity} × ₱{unitPrice.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 6 }}>
                          <Text style={s.cartItemTotal}>₱{displayTotal.toLocaleString()}</Text>
                          <TouchableOpacity
                            onPress={() => removeFromCart(item.id)}
                            style={s.cartRemoveBtn}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  showsVerticalScrollIndicator={false}
                />

                <View style={s.cartFooter}>
                  <View style={s.cartSelectionInfo}>
                    <Text style={s.cartSelectionText}>
                      Selected: {selectedCount} item{selectedCount !== 1 ? 's' : ''}
                    </Text>
                    <Text style={s.cartSelectionTotal}>
                      ₱{selectedTotal.toLocaleString()}
                    </Text>
                  </View>

                  <View style={s.cartDivider} />

                  {/* ─── Discount Eligibility Banner ─── */}
                  {discountEligibility.already_used_today && (
                    <View style={{
                      backgroundColor: '#FEF3C7',
                      padding: 8,
                      borderRadius: 8,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#F59E0B',
                    }}>
                      <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '500' }}>
                        ⚠️ PWD/Senior discount already used today. Next available: {discountEligibility.next_available_date}
                      </Text>
                    </View>
                  )}

                  {discountAppliedToAnyItem && discountEligibility.eligible && !discountEligibility.already_used_today && (
                    <View style={{
                      backgroundColor: '#D1FAE5',
                      padding: 8,
                      borderRadius: 8,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#34D399',
                    }}>
                      <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '500' }}>
                        🎉 30% PWD/Senior discount applied to the lowest-priced item!
                      </Text>
                    </View>
                  )}

                  <Text style={s.scheduleLabel}>PICKUP SCHEDULE</Text>

                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={s.schedulePill}
                  >
                    <View style={s.schedulePillLeft}>
                      <Ionicons name="calendar-outline" size={16} color={SAGE} />
                      <Text style={s.schedulePillLabel}>Date</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.schedulePillValue}>{pickupDate.toDateString()}</Text>
                      <Ionicons name="chevron-forward" size={14} color={MUTED_GRAY} />
                    </View>
                  </TouchableOpacity>

                  <TextInput
                    placeholder="Special instructions (optional)"
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    multiline
                    placeholderTextColor={MUTED_GRAY}
                    style={s.notesInput}
                  />

                  <TouchableOpacity
                    onPress={placeOrder}
                    disabled={placingOrder || selectedCount === 0}
                    activeOpacity={0.88}
                    style={[
                      s.placeOrderBtn,
                      (placingOrder || selectedCount === 0) && { opacity: 0.5 },
                    ]}
                  >
                    <LinearGradient
                      colors={[SAGE, SAGE_DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={s.placeOrderGrad}
                    >
                      {placingOrder ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.placeOrderText}>
                          {selectedCount === 0 ? 'Select items to order' : 'Place Order'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Payment Modal ─── */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.paymentSheet}>
            <View style={s.modalHandle} />

            <View style={s.paymentHeader}>
              <Text style={s.paymentTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={MUTED_GRAY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.paymentContent} showsVerticalScrollIndicator={false}>
              <View style={s.paymentBody}>
                {/* ── Compute values ── */}
                {(() => {
                  const discount = pendingOrder?.discount_total ?? 0;
                  const subtotal = pendingOrder?.subtotal ?? 0;
                  const total = pendingOrder?.total_amount ?? 0;

                  return (
                    <>
                      {/* Subtotal */}
                      <View style={{ marginBottom: 4 }}>
                        <Text style={s.paymentAmountLabel}>Subtotal</Text>
                        <Text style={[s.paymentAmount, { fontSize: 18, color: SAGE }]}>
                          ₱{formatMoney(subtotal)}
                        </Text>
                      </View>

                      {/* Discount */}
                      <View style={{ marginBottom: 4 }}>
                        <Text style={s.paymentAmountLabel}>Discount</Text>
                        <Text style={[s.paymentAmount, { fontSize: 18, color: discount > 0 ? '#16a34a' : MUTED_GRAY }]}>
                          {discount > 0 ? `-₱${formatMoney(discount)}` : '₱0'}
                        </Text>
                      </View>

                      {/* Order Total */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={[s.paymentAmountLabel, { fontWeight: '700', color: SAGE }]}>Order Total</Text>
                        <Text style={[s.paymentAmount, { fontSize: 22, fontWeight: '800', color: SAGE }]}>
                          ₱{formatMoney(total)}
                        </Text>
                      </View>
                    </>
                  );
                })()}

                {(() => {
                  const isPartiallyPaid = pendingOrder?.payment_status === "partially_paid";
                  const total = pendingOrder?.total_amount || 0;
                  const remainingBalance = isPartiallyPaid
                    ? Math.round(total * 0.5 * 100) / 100
                    : 0;

                  return (
                    <>
                      {isPartiallyPaid && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={s.paymentAmountLabel}>Amount Already Paid</Text>
                          <Text style={[s.paymentAmount, { fontSize: 18, color: SAGE }]}>
                            ₱{formatMoney(total * 0.5)}
                          </Text>
                          <Text style={[s.paymentAmountLabel, { marginTop: 6 }]}>
                            Remaining Balance
                          </Text>
                          <Text style={[s.paymentAmount, { fontSize: 20, color: SAGE }]}>
                            ₱{formatMoney(remainingBalance)}
                          </Text>
                        </View>
                      )}

                      <Text style={s.paymentOptionLabel}>
                        {isPartiallyPaid ? "Pay Remaining Balance" : "Choose Payment Option"}
                      </Text>

                      {!isPartiallyPaid ? (
                        <View style={s.paymentOptionRow}>
                          <TouchableOpacity
                            style={[
                              s.paymentOptionChip,
                              paymentOption === "down" && s.paymentOptionChipActive,
                            ]}
                            onPress={() => setPaymentOption("down")}
                          >
                            <Text
                              style={[
                                s.paymentOptionText,
                                paymentOption === "down" && s.paymentOptionTextActive,
                              ]}
                            >
                              50% Down Payment
                            </Text>
                            <Text
                              style={[
                                s.paymentOptionPrice,
                                paymentOption === "down" && { color: "#fff" },
                              ]}
                            >
                              ₱{formatMoney(pendingOrder ? pendingOrder.total_amount * 0.5 : 0)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              s.paymentOptionChip,
                              paymentOption === "full" && s.paymentOptionChipActive,
                            ]}
                            onPress={() => setPaymentOption("full")}
                          >
                            <Text
                              style={[
                                s.paymentOptionText,
                                paymentOption === "full" && s.paymentOptionTextActive,
                              ]}
                            >
                              Full Payment
                            </Text>
                            <Text
                              style={[
                                s.paymentOptionPrice,
                                paymentOption === "full" && { color: "#fff" },
                              ]}
                            >
                              ₱{formatMoney(pendingOrder?.total_amount ?? 0)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[s.paymentOptionRow, { justifyContent: "center" }]}>
                          <View
                            style={[
                              s.paymentOptionChip,
                              s.paymentOptionChipActive,
                              { flex: 1 },
                            ]}
                          >
                            <Text style={[s.paymentOptionText, s.paymentOptionTextActive]}>
                              Remaining Balance (50%)
                            </Text>
                            <Text style={[s.paymentOptionPrice, { color: "#fff" }]}>
                              ₱{formatMoney(remainingBalance)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </>
                  );
                })()}

                <Text style={s.paymentMethodLabel}>Payment Method</Text>
                <View style={s.paymentMethodOptions}>
                  <TouchableOpacity
                    style={[
                      s.paymentMethodChip,
                      paymentMethod === "gcash" && s.paymentMethodChipActive,
                    ]}
                    onPress={() => setPaymentMethod("gcash")}
                  >
                    <Text
                      style={[
                        s.paymentMethodText,
                        paymentMethod === "gcash" && s.paymentMethodTextActive,
                      ]}
                    >
                      GCash
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={s.qrContainer}>
                  <Text style={s.paymentStepLabel}>Scan to Pay</Text>
                  <Image source={QRCodeImage} style={s.qrImage} resizeMode="contain" />
                  <Text style={s.paymentStepSub}>Use GCash app to scan this QR code</Text>
                </View>

                <View style={s.instructionsContainer}>
                  <Text style={s.instructionsTitle}>How to Pay:</Text>
                  {[
                    '1. Open GCash app – Tap "Pay QR"',
                    '2. Scan the QR code above',
                    `3. Enter amount: ₱${formatMoney(
                      pendingOrder
                        ? pendingOrder.payment_status === "partially_paid"
                          ? Math.round((pendingOrder.total_amount || 0) * 0.5 * 100) / 100
                          : paymentOption === "down"
                          ? Math.round((pendingOrder.total_amount || 0) * 0.5 * 100) / 100
                          : Math.round((pendingOrder.total_amount || 0) * 100) / 100
                        : 0
                    )}`,
                    '4. Complete payment & take a screenshot',
                    '5. Upload the screenshot below',
                  ].map((step, i) => (
                    <Text key={i} style={s.instructionText}>{step}</Text>
                  ))}
                </View>

                <View style={s.uploadSection}>
                  <Text style={s.uploadLabel}>Upload Payment Proof</Text>
                  <Text style={s.uploadHint}>
                    Take a screenshot of your GCash payment receipt and upload it here.
                  </Text>
                  {!proofImage ? (
                    <TouchableOpacity onPress={pickProofImage} style={s.uploadButton}>
                      <Ionicons name="cloud-upload-outline" size={20} color={SAGE} />
                      <Text style={s.uploadButtonText}>Choose Image</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.proofPreview}>
                      <Image source={{ uri: proofImage.uri }} style={s.proofImage} />
                      <TouchableOpacity onPress={() => setProofImage(null)} style={s.removeProofBtn}>
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={s.uploadHelper}>
                    Please upload a clear screenshot of your GCash payment receipt. This will be reviewed by our staff to confirm your booking.
                  </Text>
                </View>

                <TextInput
                  placeholder="GCash Reference Number"
                  value={referenceNumber}
                  onChangeText={(text) => {
                    const filtered = text.replace(/\D/g, '').slice(0, 100);
                    setReferenceNumber(filtered);
                  }}
                  style={s.paymentReferenceInput}
                  keyboardType="number-pad"
                  placeholderTextColor={MUTED_GRAY}
                  maxLength={100}
                />
              </View>
            </ScrollView>

            <View style={s.paymentFooter}>
              <TouchableOpacity
                onPress={submitPayment}
                disabled={submittingPayment}
                style={[s.paymentButton, submittingPayment && { opacity: 0.6 }]}
                activeOpacity={0.8}
              >
                {submittingPayment ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.paymentButtonText}>
                    {(() => {
                      const isPartiallyPaid = pendingOrder?.payment_status === "partially_paid";
                      const total = pendingOrder?.total_amount || 0;
                      let amount = 0;
                      if (isPartiallyPaid) {
                        amount = Math.round(total * 0.5 * 100) / 100;
                      } else if (paymentOption === "down") {
                        amount = Math.round(total * 0.5 * 100) / 100;
                      } else {
                        amount = Math.round(total * 100) / 100;
                      }
                      return `Pay ₱${formatMoney(amount)}`;
                    })()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Stock Error Modal ─── */}
      <Modal
        visible={stockErrorModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setStockErrorModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.stockErrorModal}>
            <View style={s.stockErrorHeader}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={s.stockErrorTitle}>Insufficient Stock</Text>
            </View>
            <View style={s.stockErrorBody}>
              {stockErrorMessages.length > 0 ? (
                stockErrorMessages.map((msg, idx) => (
                  <Text key={idx} style={s.stockErrorText}>
                    {msg}
                  </Text>
                ))
              ) : (
                <Text style={s.stockErrorText}>Stock validation failed.</Text>
              )}
            </View>
            <TouchableOpacity
              style={s.stockErrorButton}
              onPress={() => setStockErrorModalVisible(false)}
            >
              <Text style={s.stockErrorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Order Detail Modal ─── */}
      {showOrderDetailModal && selectedOrderForDetails && (
        <Modal
          visible={showOrderDetailModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowOrderDetailModal(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.orderDetailModal}>
              <View style={s.modalHandle} />

              <View style={s.orderDetailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.orderDetailTitle}>
                    Order #{selectedOrderForDetails.order_number}
                  </Text>
                  <Text style={s.orderDetailDate}>
                    Pickup: {formatDisplayDate(selectedOrderForDetails.pickup_date)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowOrderDetailModal(false)}
                  style={s.modalCloseBtn}
                >
                  <Ionicons name="close" size={18} color={SOFT_WHITE} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ padding: 16, maxHeight: "80%" }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
              >
                <View style={s.orderDetailInfoRow}>
                  <Text style={s.orderDetailInfoLabel}>Order Date</Text>
                  <Text style={s.orderDetailInfoValue}>
                    {formatDisplayDate(selectedOrderForDetails.order_date || selectedOrderForDetails.created_at)}
                  </Text>
                </View>
                <View style={s.orderDetailInfoRow}>
                  <Text style={s.orderDetailInfoLabel}>Pickup Date</Text>
                  <Text style={s.orderDetailInfoValue}>
                    {formatDisplayDate(selectedOrderForDetails.pickup_date)}
                  </Text>
                </View>
                <View style={s.orderDetailInfoRow}>
                  <Text style={s.orderDetailInfoLabel}>Payment Method</Text>
                  <Text style={s.orderDetailInfoValue}>
                    {selectedOrderForDetails.payments && selectedOrderForDetails.payments.length > 0
                      ? formatPaymentMethod(selectedOrderForDetails.payments[0].payment_method)
                      : 'GCash'}
                  </Text>
                </View>
                <View style={s.orderDetailInfoRow}>
                  <Text style={s.orderDetailInfoLabel}>Payment Status</Text>
                  <Text style={s.orderDetailInfoValue}>
                    {selectedOrderForDetails.payment_status?.toUpperCase() || 'UNPAID'}
                  </Text>
                </View>

                {selectedOrderForDetails.payments && selectedOrderForDetails.payments.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[s.orderDetailSectionTitle, { marginBottom: 6 }]}>Payment Details</Text>
                    {selectedOrderForDetails.payments.map((payment, idx) => (
                      <View key={idx} style={{ padding: 10, backgroundColor: CREAM, borderRadius: 8, marginBottom: 8 }}>
                        <Text><Text style={{ fontWeight: 'bold' }}>Amount:</Text> ₱{formatMoney(payment.amount_paid)}</Text>
                        <Text><Text style={{ fontWeight: 'bold' }}>Method:</Text> {formatPaymentMethod(payment.payment_method)}</Text>
                        <Text><Text style={{ fontWeight: 'bold' }}>Reference:</Text> {payment.reference_number || 'N/A'}</Text>
                        {payment.proof_image_url && (
                          <View>
                            <Text style={{ fontWeight: 'bold', marginTop: 4 }}>Payment Proof:</Text>
                            <Image
                              source={{ uri: payment.proof_image_url }}
                              style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 4 }}
                              resizeMode="contain"
                            />
                          </View>
                        )}
                        <Text><Text style={{ fontWeight: 'bold' }}>Date:</Text> {new Date(payment.payment_date).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={s.orderDetailDivider} />

                <View style={s.orderDetailStatusRow}>
                  <StatusBadge status={selectedOrderForDetails.status} />
                  <Text style={s.orderDetailStatusLabel}>Status</Text>
                </View>

                {loadingLogs ? (
                  <View style={s.timelineLoading}>
                    <ActivityIndicator size="small" color={SAGE} />
                    <Text style={s.timelineLoadingText}>Loading tracking...</Text>
                  </View>
                ) : (
                  <View style={s.timelineSection}>
                    <Text style={s.timelineSectionTitle}>Order Tracking</Text>
                    <OrderTimeline
                      events={parseTimelineEvents(selectedOrderForDetails, orderActivityLogs)}
                    />
                  </View>
                )}

                {selectedOrderForDetails.items?.some(item => item.cake_type === 'custom') && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={s.orderDetailSectionTitle}>Cake Progress</Text>
                    {selectedOrderForDetails.progress_images_with_urls && selectedOrderForDetails.progress_images_with_urls.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {selectedOrderForDetails.progress_images_with_urls.map((img, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: img.image_url }}
                            style={{ width: 120, height: 120, borderRadius: 8, marginRight: 8 }}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={{ color: MUTED_GRAY, fontSize: 13 }}>
                        No progress updates yet. Check back later.
                      </Text>
                    )}
                  </View>
                )}

                {(selectedOrderForDetails.pickup_method || ['confirmed', 'preparing', 'ready'].includes(selectedOrderForDetails.status)) && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={s.orderDetailSectionTitle}>Who will pick up the order?</Text>

                    {selectedOrderForDetails.pickup_method && !editingPickup ? (
                      <View style={{ padding: 12, backgroundColor: CREAM, borderRadius: 8 }}>
                        <Text style={{ fontSize: 14, color: SAGE }}>
                          {selectedOrderForDetails.pickup_method === 'customer' ? '👤 Customer Pickup' : '🏍️ Rider Pickup'}
                        </Text>
                        {selectedOrderForDetails.pickup_method === 'rider' && (
                          <View>
                            <Text style={{ fontSize: 14, color: SAGE, marginTop: 4 }}>Rider: {selectedOrderForDetails.rider_name || 'N/A'}</Text>
                            <Text style={{ fontSize: 14, color: SAGE }}>Phone: {selectedOrderForDetails.rider_phone || 'N/A'}</Text>
                            {selectedOrderForDetails.rider_photo_url && (
                              <View style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 12, color: MUTED_GRAY, marginBottom: 4 }}>Rider Photo:</Text>
                                <Image
                                  source={{ uri: selectedOrderForDetails.rider_photo_url }}
                                  style={{ width: 100, height: 100, borderRadius: 8 }}
                                  resizeMode="cover"
                                />
                              </View>
                            )}
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => {
                            setEditingPickup(true);
                            setTempPickupMethod(selectedOrderForDetails.pickup_method ?? null);
                            setTempRiderName(selectedOrderForDetails.rider_name || '');
                            setTempRiderPhone(selectedOrderForDetails.rider_phone || '');
                            setRiderPhoto(null);
                            setRiderPhotoPreview(null);
                          }}
                          style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(79,95,82,0.08)', borderRadius: 6, alignSelf: 'flex-start' }}
                        >
                          <Text style={{ color: SAGE, fontSize: 13, fontWeight: '600' }}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <View style={s.pickupOptions}>
                          <TouchableOpacity
                            style={[s.pickupOption, tempPickupMethod === 'customer' && s.pickupOptionActive]}
                            onPress={() => {
                              setTempPickupMethod('customer');
                              setTempRiderName('');
                              setTempRiderPhone('');
                              setRiderPhoto(null);
                              setRiderPhotoPreview(null);
                            }}
                          >
                            <Text style={[s.pickupOptionText, tempPickupMethod === 'customer' && s.pickupOptionTextActive]}>
                              Customer Pickup
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.pickupOption, tempPickupMethod === 'rider' && s.pickupOptionActive]}
                            onPress={() => setTempPickupMethod('rider')}
                          >
                            <Text style={[s.pickupOptionText, tempPickupMethod === 'rider' && s.pickupOptionTextActive]}>
                              Rider Pickup
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {tempPickupMethod === 'rider' && (
                          <View style={s.riderFields}>
                            <TouchableOpacity
                              onPress={takeRiderPhoto}
                              style={s.cameraButton}
                            >
                              <Ionicons name="camera-outline" size={20} color={SAGE} />
                              <Text style={s.cameraButtonText}>Take Photo</Text>
                            </TouchableOpacity>

                            {riderPhotoPreview && (
                              <View style={s.photoPreviewContainer}>
                                <Image source={{ uri: riderPhotoPreview }} style={s.photoPreview} />
                                <TouchableOpacity onPress={removeRiderPhoto} style={s.removePhotoBtn}>
                                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            )}

                            <TextInput
                              placeholder="Rider Full Name (optional)"
                              value={tempRiderName}
                              onChangeText={(text) => {
                                const filtered = text.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50);
                                setTempRiderName(filtered);
                              }}
                              style={s.inputField}
                              placeholderTextColor={MUTED_GRAY}
                              maxLength={50}
                            />
                            <TextInput
                              placeholder="Rider Phone Number (optional)"
                              value={tempRiderPhone}
                              onChangeText={(text) => {
                                const filtered = text.replace(/\D/g, '').slice(0, 11);
                                setTempRiderPhone(filtered);
                              }}
                              style={s.inputField}
                              keyboardType="phone-pad"
                              placeholderTextColor={MUTED_GRAY}
                              maxLength={11}
                            />
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={submitPickupMethod}
                          disabled={submittingPickup}
                          style={s.confirmPickupBtn}
                        >
                          <Text style={s.confirmPickupText}>
                            {submittingPickup ? 'Saving...' : 'Confirm Pickup Method'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {selectedOrderForDetails.pickup_proof_images_with_urls && selectedOrderForDetails.pickup_proof_images_with_urls.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={s.orderDetailSectionTitle}>Pickup Proof</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                      {selectedOrderForDetails.pickup_proof_images_with_urls.map((img, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: img.image_url }}
                          style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={s.orderDetailDivider} />

                <Text style={s.orderDetailSectionTitle}>Items</Text>
                {selectedOrderForDetails.items?.map((item, idx) => {
                  const menu = item.menu;
                  const isCustom = item.cake_type === 'custom' && item.custom_design;
                  return (
                    <View key={idx} style={s.orderDetailItem}>
                      {isCustom ? (
                        <CakePreview design={item.custom_design} size={60} />
                      ) : (
                        <ProductImage imageUrl={menu?.image_url} size={60} />
                      )}
                      <View style={s.orderDetailItemInfo}>
                        <Text style={s.orderDetailItemName}>
                          {isCustom ? 'Custom Cake' : menu?.name || 'Product'}
                        </Text>
                        <Text style={s.orderDetailItemQty}>
                          Qty: {item.quantity} × ₱{item.unit_price}
                        </Text>
                      </View>
                      <Text style={s.orderDetailItemTotal}>
                        ₱{(item.quantity * item.unit_price).toLocaleString()}
                      </Text>
                    </View>
                  );
                })}

                <View style={s.orderDetailTotalRow}>
                  <Text style={s.orderDetailTotalLabel}>Total Amount</Text>
                  <Text style={s.orderDetailTotalValue}>
                    ₱{selectedOrderForDetails.total_amount.toLocaleString()}
                  </Text>
                </View>

                {selectedOrderForDetails.notes && (
                  <View style={s.orderDetailNotes}>
                    <Text style={s.orderDetailNotesLabel}>Notes</Text>
                    <Text style={s.orderDetailNotesText}>
                      {selectedOrderForDetails.notes}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={s.orderDetailCloseBtn}
                onPress={() => setShowOrderDetailModal(false)}
              >
                <Text style={s.orderDetailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── Feedback Modal (Two‑step) ─── */}
      <Modal visible={showFeedbackModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.feedbackModal}>
            <View style={s.modalHandle} />

            {feedbackStep === 'edit' ? (
              // ── EDIT VIEW ──
              <>
                <View style={s.feedbackHeader}>
                  <Text style={s.feedbackTitle}>Rate Your Order</Text>
                  <TouchableOpacity
                    onPress={() => setShowFeedbackModal(false)}
                    style={s.modalCloseBtn}
                  >
                    <Ionicons name="close" size={18} color={SOFT_WHITE} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={s.feedbackBody} showsVerticalScrollIndicator={false}>
                  {selectedFeedbackOrder && (
                    <View style={s.feedbackOrderInfo}>
                      <Text style={s.feedbackOrderNumber}>Order #{selectedFeedbackOrder.order_number}</Text>
                      <Text style={s.feedbackOrderDate}>
                        {formatDisplayDate(selectedFeedbackOrder.pickup_date)}
                      </Text>
                    </View>
                  )}

                  {/* Product info */}
                  {selectedFeedbackProduct && (
                    <View style={s.feedbackProductContainer}>
                      <ProductImage imageUrl={selectedFeedbackProduct.image_url} size={60} />
                      <Text style={s.feedbackProductName}>{selectedFeedbackProduct.name}</Text>
                    </View>
                  )}

                  <Text style={s.feedbackLabel}>Your Rating</Text>
                  <View style={s.starsContainer}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setFeedbackRating(star)}
                        style={s.starButton}
                      >
                        <Ionicons
                          name={star <= feedbackRating ? 'star' : 'star-outline'}
                          size={36}
                          color={star <= feedbackRating ? '#F5A623' : MUTED_GRAY}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.feedbackLabel}>Comments (Optional)</Text>
                  <TextInput
                    style={s.feedbackInput}
                    placeholder="What did you think of your order?"
                    value={feedbackComment}
                    onChangeText={setFeedbackComment}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={MUTED_GRAY}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      if (feedbackRating === 0) {
                        Alert.alert('Rating Required', 'Please select a star rating.');
                        return;
                      }
                      setFeedbackStep('confirm');
                    }}
                    style={s.submitFeedbackBtn}
                  >
                    <LinearGradient
                      colors={[SAGE, SAGE_DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={s.submitFeedbackGrad}
                    >
                      <Text style={s.submitFeedbackText}>Submit Review</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : (
              // ── CONFIRM VIEW ──
              <>
                <View style={s.feedbackHeader}>
                  <Text style={s.feedbackTitle}>Review Summary</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowFeedbackModal(false);
                      setFeedbackStep('edit');
                    }}
                    style={s.modalCloseBtn}
                  >
                    <Ionicons name="close" size={18} color={SOFT_WHITE} />
                  </TouchableOpacity>
                </View>

                <View style={s.feedbackBody}>
                  {selectedFeedbackOrder && (
                    <View style={s.feedbackOrderInfo}>
                      <Text style={s.feedbackOrderNumber}>Order #{selectedFeedbackOrder.order_number}</Text>
                      <Text style={s.feedbackOrderDate}>
                        {formatDisplayDate(selectedFeedbackOrder.pickup_date)}
                      </Text>
                    </View>
                  )}

                  {/* Product info */}
                  {selectedFeedbackProduct && (
                    <View style={s.feedbackProductContainer}>
                      <ProductImage imageUrl={selectedFeedbackProduct.image_url} size={60} />
                      <Text style={s.feedbackProductName}>{selectedFeedbackProduct.name}</Text>
                    </View>
                  )}

                  <Text style={s.confirmRatingLabel}>Your Rating</Text>
                  <View style={s.starsContainer}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons
                        key={star}
                        name={star <= feedbackRating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= feedbackRating ? '#F5A623' : MUTED_GRAY}
                      />
                    ))}
                  </View>

                  <Text style={s.confirmCommentLabel}>Your Comment</Text>
                  <View style={s.confirmCommentBox}>
                    <Text style={s.confirmCommentText}>
                      {feedbackComment.trim() || 'No comment provided'}
                    </Text>
                  </View>

                  <View style={s.confirmActions}>
                    <TouchableOpacity
                      onPress={() => setFeedbackStep('edit')}
                      style={[s.confirmBtn, s.confirmBtnEdit]}
                    >
                      <Text style={s.confirmBtnEditText}>Edit Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submitFeedback}
                      disabled={submittingFeedback}
                      style={[s.confirmBtn, s.confirmBtnSubmit, submittingFeedback && { opacity: 0.6 }]}
                    >
                      <LinearGradient
                        colors={[SAGE, SAGE_DARK]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={s.confirmGrad}
                      >
                        {submittingFeedback ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={s.confirmBtnSubmitText}>Submit Anyway</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── View Review Modal ─── */}
      <Modal visible={showViewReviewModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.feedbackModal}>
            <View style={s.modalHandle} />

            <View style={s.feedbackHeader}>
              <Text style={s.feedbackTitle}>My Review</Text>
              <TouchableOpacity
                onPress={() => setShowViewReviewModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={SOFT_WHITE} />
              </TouchableOpacity>
            </View>

            {loadingReview ? (
              <View style={s.loaderWrap}>
                <ActivityIndicator size="large" color={SAGE} />
                <Text style={s.loaderText}>Loading review…</Text>
              </View>
            ) : viewReviewData ? (
              <ScrollView style={s.feedbackBody} showsVerticalScrollIndicator={false}>
                {viewReviewOrder && (
                  <View style={s.feedbackOrderInfo}>
                    <Text style={s.feedbackOrderNumber}>Order #{viewReviewOrder.order_number}</Text>
                    <Text style={s.feedbackOrderDate}>
                      {formatDisplayDate(viewReviewOrder.pickup_date)}
                    </Text>
                  </View>
                )}

                {/* Product info from feedback */}
                {viewReviewData?.menu && (
                  <View style={s.feedbackProductContainer}>
                    <ProductImage imageUrl={viewReviewData.menu.image_url} size={60} />
                    <Text style={s.feedbackProductName}>{viewReviewData.menu.name}</Text>
                  </View>
                )}

                <Text style={s.confirmRatingLabel}>Your Rating</Text>
                <View style={s.starsContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons
                      key={star}
                      name={star <= viewReviewData.rating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= viewReviewData.rating ? '#F5A623' : MUTED_GRAY}
                    />
                  ))}
                </View>

                {viewReviewData.comment && (
                  <>
                    <Text style={s.confirmCommentLabel}>Your Comment</Text>
                    <View style={s.confirmCommentBox}>
                      <Text style={s.confirmCommentText}>
                        {viewReviewData.comment}
                      </Text>
                    </View>
                  </>
                )}

                {/* ─── Admin Reply ─── */}
                {viewReviewData.admin_reply ? (
                  <View style={{ marginTop: 16, padding: 12, backgroundColor: '#E8F0E8', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: SAGE }}>
                    <Text style={{ fontWeight: '700', color: SAGE, fontSize: 13, marginBottom: 4 }}>Admin Reply :</Text>
                    <Text style={{ color: SAGE, fontSize: 13 }}>{viewReviewData.admin_reply}</Text>
                    {viewReviewData.admin_replied_at && (
                      <Text style={{ color: MUTED_GRAY, fontSize: 11, marginTop: 4 }}>
                        Replied: {formatDateTime(viewReviewData.admin_replied_at)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={{ marginTop: 16, padding: 10, backgroundColor: '#f8f7f4', borderRadius: 8 }}>
                    <Text style={{ color: MUTED_GRAY, fontSize: 13 }}>No reply from the admin yet.</Text>
                  </View>
                )}

                <Text style={s.reviewDateText}>
                  {formatDateTime(viewReviewData.created_at)}
                </Text>

                <TouchableOpacity
                  style={s.closeReviewBtn}
                  onPress={() => setShowViewReviewModal(false)}
                >
                  <Text style={s.closeReviewBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={s.emptyWrap}>
                <Text style={s.emptyText}>No review found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Date Picker ─── */}
      {showDatePicker && (
        <DateTimePicker
          value={pickupDate}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setPickupDate(selectedDate);
              Alert.alert("Date updated", `New pickup date: ${selectedDate.toDateString()}`);
            }
          }}
        />
      )}

      <Toast />
    </SafeAreaView>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  headerBlob1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -50,
  },
  headerBlob2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -30,
    left: -20,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerGreeting: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,243,217,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,243,217,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  headerStamps: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  headerStampsText: { fontSize: 12, fontWeight: "600", color: "rgba(255,243,217,0.85)" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCartBtn: {
    position: "relative",
    padding: 4,
  },
  headerCartBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  headerCartBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  selectAllBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(79,95,82,0.1)",
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: SAGE,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 4,
  },
  emptyContainerCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyCartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE,
    marginTop: 16,
  },
  emptyCartSub: {
    fontSize: 14,
    color: MUTED_GRAY,
    marginTop: 6,
    textAlign: "center",
  },
  emptyCartBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: SAGE,
  },
  emptyCartBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cartOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,28,22,0.5)" },
  cartSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    flex: 1,
    maxHeight: "92%",
  },
  cartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.8)",
  },
  cartHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SAGE,
    alignItems: "center",
    justifyContent: "center",
  },
  cartHeaderTitle: { fontSize: 16, fontWeight: "800", color: SAGE },
  cartCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(166,162,154,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartContainer: {
    flex: 1,
    flexDirection: "column",
  },
  cartFooter: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(242,237,228,0.8)",
    backgroundColor: "#fff",
  },
  cartSelectionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cartSelectionText: {
    fontSize: 13,
    fontWeight: "600",
    color: SAGE,
  },
  cartSelectionTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: SAGE,
    letterSpacing: -0.5,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.6)",
  },
  cartItemName: { fontSize: 13, fontWeight: "700", color: SAGE, marginBottom: 2 },
  cartItemMeta: { fontSize: 11, color: MUTED_GRAY, fontWeight: "500" },
  cartItemTotal: { fontSize: 14, fontWeight: "800", color: SAGE },
  cartRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartDivider: { height: 1, backgroundColor: "rgba(242,237,228,0.8)", marginBottom: 12 },
  scheduleLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED_GRAY,
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  schedulePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CREAM,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(166,162,154,0.2)",
  },
  schedulePillLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  schedulePillLabel: { fontSize: 13, fontWeight: "600", color: SAGE },
  schedulePillValue: { fontSize: 13, color: SAGE, fontWeight: "500" },
  notesInput: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    padding: 12,
    minHeight: 60,
    fontSize: 13,
    color: SAGE,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  placeOrderBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  placeOrderGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  placeOrderText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  // ── Existing styles ──
  catScroll: { paddingVertical: 14 },
  catPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.2)",
  },
  catPillActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  catPillText: { fontSize: 13, fontWeight: "600", color: MUTED_GRAY },
  catPillTextActive: { color: "#fff" },
  countLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED_GRAY,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  productCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(242,237,228,0.9)",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  productCardAccent: { height: 3, backgroundColor: SAGE, opacity: 0.6 },
  productImgWrap: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 6,
    position: "relative",
  },
  productInfo: { paddingHorizontal: 12, paddingBottom: 10 },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: SAGE,
    letterSpacing: -0.2,
    lineHeight: 18,
    marginBottom: 2,
  },
  productDesc: { fontSize: 11, color: MUTED_GRAY, marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: "800", color: SAGE, letterSpacing: -0.5 },
  customBadge: {
    position: "absolute",
    bottom: 2,
    right: 8,
    backgroundColor: SOFT_WHITE,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(212,160,61,0.3)",
  },
  customBadgeText: { fontSize: 9, fontWeight: "700", color: "#92670a" },
  productAddBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SAGE,
    alignItems: "center",
    justifyContent: "center",
  },
  customCakeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  customCakeCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  customCakeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  customCakeSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabContent: { padding: 16, flex: 1 },
  tabHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  tabHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SAGE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabTitle: { fontSize: 18, fontWeight: "800", color: SAGE, letterSpacing: -0.5 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(166,162,154,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginLeft: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: SAGE,
    marginRight: 4,
  },
  countPill: {
    backgroundColor: "rgba(79,95,82,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(79,95,82,0.15)",
  },
  countPillText: { fontSize: 11, fontWeight: "700", color: SAGE },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(242,237,228,0.9)",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardAccent: { height: 3 },
  orderCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 10,
  },
  orderNumber: { fontSize: 14, fontWeight: "800", color: SAGE, letterSpacing: -0.2 },
  orderDate: { fontSize: 11, color: MUTED_GRAY, marginTop: 2, fontWeight: "500" },
  orderItems: { paddingHorizontal: 14, paddingBottom: 8 },
  orderItemRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  orderItemName: { fontSize: 13, fontWeight: "600", color: SAGE },
  orderItemQty: { fontSize: 11, color: MUTED_GRAY, marginTop: 1 },
  orderDivider: { height: 1, backgroundColor: "rgba(242,237,228,0.9)", marginHorizontal: 14 },
  orderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingTop: 10,
  },
  orderTotal: { fontSize: 18, fontWeight: "800", color: SAGE, letterSpacing: -0.5 },
  orderTotalLabel: { fontSize: 11, color: MUTED_GRAY, fontWeight: "500" },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  payButton: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 10,
    backgroundColor: SAGE,
    borderRadius: 10,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  writeReviewBtn: {
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SAGE,
    alignItems: 'center',
  },
  writeReviewBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  viewReviewBtn: {
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SAGE,
    alignItems: 'center',
  },
  viewReviewBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loaderWrap: { alignItems: "center", paddingTop: 48, gap: 10 },
  loaderText: { fontSize: 13, color: MUTED_GRAY, fontWeight: "500" },
  emptyWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(166,162,154,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.2)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyText: { fontSize: 15, fontWeight: "700", color: SAGE, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: MUTED_GRAY, textAlign: "center", lineHeight: 18 },
  imgFallback: { backgroundColor: CREAM, alignItems: "center", justifyContent: "center" },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(242,237,228,0.9)",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: SAGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  profileAvatarText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  profileName: { fontSize: 18, fontWeight: "800", color: SAGE, letterSpacing: -0.5, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: MUTED_GRAY },
  profileDivider: {
    height: 1,
    backgroundColor: "rgba(242,237,228,0.9)",
    width: "100%",
    marginVertical: 14,
  },
  profileInfoRow: { flexDirection: "row", gap: 20 },
  profileInfoItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileInfoText: { fontSize: 13, color: MUTED_GRAY, fontWeight: "500" },
  verifCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(242,237,228,0.9)",
  },
  verifCardLeft: { flexDirection: "row", alignItems: "center" },
  verifType: { fontSize: 13, fontWeight: "700", color: SAGE, textTransform: "capitalize" },
  verifLabel: { fontSize: 10, color: MUTED_GRAY, marginTop: 2 },
  stampsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "rgba(242,237,228,0.9)",
  },
  stampsTitle: { fontSize: 13, fontWeight: "700", color: SAGE, marginBottom: 12, letterSpacing: -0.1 },
  stampsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  stamp: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(166,162,154,0.12)",
    borderWidth: 1,
    borderColor: "rgba(166,162,154,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stampEarned: {
    backgroundColor: SAGE,
    borderColor: SAGE,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  stampsHint: { fontSize: 11, color: MUTED_GRAY },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.2)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(242,237,228,0.9)",
    paddingBottom: 4,
    paddingTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    position: "relative",
  },
  tabIconWrap: {
    width: 38,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: {
    // no background, icon colour applied inline
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: MUTED_GRAY,
    marginTop: 3,
  },
  tabLabelActive: {
    color: SAGE,
    fontWeight: "700",
  },
  tabBadge: {
    position: "absolute",
    top: 0,
    right: 10,
    backgroundColor: "#EF4444",
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(166,162,154,0.3)",
    alignSelf: "center",
    marginBottom: 8,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,28,22,0.5)" },
  modalHeader: {
    padding: 20,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeaderBlob: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -40,
    right: -30,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  modalPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "rgba(255,243,217,0.9)",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  modalDesc: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 18 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: MUTED_GRAY },
  modalAddBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalAddBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  modalAddBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalOrderBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOrderBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  modalOrderBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  productModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingTop: 12,
  },
  reviewModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingTop: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.8)",
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE,
  },
  reviewBody: {
    padding: 20,
  },
  reviewItemCard: {
    backgroundColor: CREAM,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reviewItemName: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 4,
  },
  reviewItemDesc: {
    fontSize: 13,
    color: MUTED_GRAY,
    marginBottom: 12,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: "rgba(166,162,154,0.2)",
    marginVertical: 8,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    flexWrap: "wrap",
  },
  reviewLabel: {
    fontSize: 14,
    color: MUTED_GRAY,
    minWidth: 90,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "600",
    color: SAGE,
  },
  reviewEditOptions: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  reviewOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    backgroundColor: "#FAFAFA",
    marginLeft: 6,
    marginBottom: 4,
    alignItems: "center",
  },
  reviewOptionChipActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
  },
  reviewOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED_GRAY,
  },
  reviewOptionTextActive: {
    color: "#fff",
  },
  reviewOptionSub: {
    fontSize: 9,
    color: MUTED_GRAY,
    marginTop: 1,
  },
  reviewQtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(79,95,82,0.08)",
    borderWidth: 1,
    borderColor: "rgba(79,95,82,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewQtyValue: {
    fontSize: 16,
    fontWeight: "700",
    color: SAGE,
    minWidth: 24,
    textAlign: "center",
  },
  reviewTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(166,162,154,0.2)",
  },
  reviewTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: SAGE,
  },
  reviewTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: SAGE,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  reviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  reviewBtnEdit: {
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
  },
  reviewBtnEditText: {
    fontSize: 15,
    fontWeight: "600",
    color: MUTED_GRAY,
  },
  reviewBtnDone: {
    backgroundColor: SAGE,
    borderWidth: 1.5,
    borderColor: SAGE,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewBtnDoneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  reviewBtnConfirm: {
    backgroundColor: SAGE,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewBtnConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  pickupModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingTop: 12,
  },
  pickupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.8)",
  },
  pickupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE,
  },
  pickupBody: {
    padding: 20,
  },
  pickupItemCard: {
    flexDirection: "row",
    backgroundColor: CREAM,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  pickupItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
  },
  pickupItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: SAGE,
  },
  pickupItemDesc: {
    fontSize: 12,
    color: MUTED_GRAY,
    marginTop: 2,
  },
  pickupItemDetails: {
    marginTop: 4,
  },
  pickupItemDetail: {
    fontSize: 12,
    color: MUTED_GRAY,
  },
  pickupItemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: SAGE,
    marginTop: 6,
  },
  pickupDivider: {
    height: 1,
    backgroundColor: "rgba(166,162,154,0.2)",
    marginVertical: 12,
  },
  timelineSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 12,
  },
  timelineLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  timelineLoadingText: {
    fontSize: 13,
    color: MUTED_GRAY,
  },
  timelineEmpty: {
    padding: 16,
    alignItems: "center",
  },
  timelineEmptyText: {
    fontSize: 13,
    color: MUTED_GRAY,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    marginBottom: 4,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 2,
  },
  timelineDotWrapper: {
    width: 28,
    alignItems: "center",
    position: "relative",
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timelineDotActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineDotIcon: {
    marginTop: 1,
  },
  timelineVerticalLine: {
    position: "absolute",
    top: 16,
    bottom: -12,
    left: 13,
    width: 2,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 12,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: "700",
  },
  timelineTime: {
    fontSize: 12,
    color: MUTED_GRAY,
    fontWeight: "500",
  },
  timelineDate: {
    fontSize: 12,
    color: MUTED_GRAY,
    marginTop: 1,
  },
  timelineDetails: {
    fontSize: 13,
    color: SAGE,
    marginTop: 4,
    padding: 6,
    backgroundColor: "rgba(166,162,154,0.08)",
    borderRadius: 6,
  },
  orderDetailModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "92%",
    width: "100%",
    alignSelf: "center",
  },
  orderDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.8)",
  },
  orderDetailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE,
  },
  orderDetailDate: {
    fontSize: 12,
    color: MUTED_GRAY,
    marginTop: 2,
  },
  orderDetailStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  orderDetailStatusLabel: {
    fontSize: 12,
    color: MUTED_GRAY,
    fontWeight: "500",
  },
  orderDetailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 10,
    marginTop: 4,
  },
  orderDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.6)",
  },
  orderDetailItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderDetailItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: SAGE,
  },
  orderDetailItemQty: {
    fontSize: 12,
    color: MUTED_GRAY,
  },
  orderDetailItemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: SAGE,
  },
  orderDetailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(242,237,228,0.8)",
    marginTop: 8,
  },
  orderDetailTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: SAGE,
  },
  orderDetailTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: SAGE,
  },
  orderDetailPaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  orderDetailPaymentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED_GRAY,
  },
  orderDetailPaymentValue: {
    fontSize: 13,
    fontWeight: "700",
    color: SAGE,
  },
  orderDetailNotes: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "rgba(242,237,228,0.5)",
    borderRadius: 8,
  },
  orderDetailNotesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED_GRAY,
    marginBottom: 4,
  },
  orderDetailNotesText: {
    fontSize: 13,
    color: SAGE,
  },
  orderDetailCloseBtn: {
    backgroundColor: SAGE,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  orderDetailCloseBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  orderDetailInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,237,228,0.8)",
  },
  orderDetailInfoLabel: {
    fontSize: 14,
    color: MUTED_GRAY,
  },
  orderDetailInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: SAGE,
  },
  orderDetailDivider: {
    height: 1,
    backgroundColor: "rgba(242,237,228,0.8)",
    marginVertical: 12,
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(166,162,154,0.3)',
    marginBottom: 16,
  },
  filterDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
    textTransform: 'capitalize',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    width: '80%',
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: SAGE,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: SAGE,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dropdownOptionTextActive: {
    color: '#fff',
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(242,237,228,0.9)",
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: SAGE,
    fontWeight: "500",
  },
  notificationTime: {
    fontSize: 11,
    color: MUTED_GRAY,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SAGE,
    marginLeft: 8,
  },
  optionSection: { marginBottom: 18 },
  optionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: SAGE,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    backgroundColor: "#FAFAFA",
    marginRight: 8,
  },
  optionChipActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  optionChipText: { fontSize: 13, fontWeight: "600", color: MUTED_GRAY },
  optionChipTextActive: { color: "#fff" },
  optionChipSub: { fontSize: 10, color: MUTED_GRAY, marginTop: 1, fontWeight: "500" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(242,237,228,0.8)",
  },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(79,95,82,0.08)",
    borderWidth: 1,
    borderColor: "rgba(79,95,82,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { fontSize: 18, fontWeight: "800", color: SAGE, minWidth: 28, textAlign: "center" },
  paymentSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "90%",
    flex: 1,
    flexDirection: "column",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: CREAM,
  },
  paymentTitle: { fontSize: 18, fontWeight: "800", color: SAGE },
  paymentContent: { flex: 1 },
  paymentBody: { padding: 20, paddingBottom: 10 },
  paymentAmountLabel: { fontSize: 12, color: MUTED_GRAY, marginBottom: 4 },
  paymentAmount: { fontSize: 22, fontWeight: "800", color: SAGE, marginBottom: 20 },
  paymentOptionLabel: { fontSize: 14, fontWeight: "700", color: SAGE, marginBottom: 10 },
  paymentOptionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  paymentOptionChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
  },
  paymentOptionChipActive: { backgroundColor: SAGE, borderColor: SAGE },
  paymentOptionText: { fontSize: 13, fontWeight: "600", color: MUTED_GRAY, marginBottom: 4 },
  paymentOptionTextActive: { color: "#fff" },
  paymentOptionPrice: { fontSize: 15, fontWeight: "800", color: SAGE },
  paymentMethodLabel: { fontSize: 14, fontWeight: "700", color: SAGE, marginBottom: 10 },
  paymentMethodOptions: { flexDirection: "row", gap: 12, marginBottom: 20 },
  paymentMethodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    backgroundColor: "#FAFAFA",
  },
  paymentMethodChipActive: { backgroundColor: SAGE, borderColor: SAGE },
  paymentMethodText: { fontSize: 14, fontWeight: "600", color: MUTED_GRAY },
  paymentMethodTextActive: { color: "#fff" },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: CREAM,
    borderRadius: 12,
  },
  qrImage: {
    width: 150,
    height: 150,
    marginVertical: 8,
  },
  paymentStepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SAGE,
    marginBottom: 4,
  },
  paymentStepSub: {
    fontSize: 12,
    color: MUTED_GRAY,
  },
  instructionsContainer: {
    backgroundColor: CREAM,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SAGE,
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 13,
    color: SAGE,
    lineHeight: 22,
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SAGE,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: MUTED_GRAY,
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: SAGE,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(79,95,82,0.04)',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
  },
  proofPreview: {
    position: 'relative',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeProofBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  uploadHelper: {
    fontSize: 11,
    color: MUTED_GRAY,
    marginTop: 6,
    fontStyle: 'italic',
  },
  paymentReferenceInput: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    padding: 12,
    fontSize: 14,
    color: SAGE,
    marginBottom: 24,
  },
  paymentFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CREAM,
  },
  paymentButton: {
    backgroundColor: SAGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentButtonText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  stockErrorModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 340,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  stockErrorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stockErrorTitle: { fontSize: 18, fontWeight: "700", color: SAGE },
  stockErrorBody: { marginBottom: 20, gap: 6 },
  stockErrorText: { fontSize: 14, color: SAGE, lineHeight: 20 },
  stockErrorButton: { backgroundColor: SAGE, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  stockErrorButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  pickupSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#F8F7F4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(79,95,82,0.15)",
  },
  pickupMethodTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 12,
  },
  pickupOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  pickupOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
  },
  pickupOptionActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
  },
  pickupOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: MUTED_GRAY,
  },
  pickupOptionTextActive: {
    color: "#fff",
  },
  riderFields: {
    marginBottom: 12,
    gap: 8,
  },
  inputField: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    padding: 10,
    fontSize: 14,
    color: SAGE,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: SAGE,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(79,95,82,0.05)',
    marginBottom: 8,
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
  },
  photoPreviewContainer: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.3)',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 2,
  },
  confirmPickupBtn: {
    backgroundColor: SAGE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmPickupText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  pickupInfo: {
    paddingVertical: 8,
  },
  pickupMethodText: {
    fontSize: 16,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 4,
  },
  riderDetail: {
    fontSize: 14,
    color: SAGE,
    marginTop: 2,
  },
  editPickupBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(79,95,82,0.08)",
  },
  editPickupText: {
    fontSize: 13,
    color: SAGE,
    fontWeight: "600",
  },
  cancelButton: {
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Feedback Modal Styles ──
  feedbackModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242,237,228,0.8)',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SAGE,
  },
  feedbackBody: {
    padding: 20,
  },
  feedbackOrderInfo: {
    marginBottom: 16,
  },
  feedbackOrderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: SAGE,
  },
  feedbackOrderDate: {
    fontSize: 13,
    color: MUTED_GRAY,
    marginTop: 2,
  },

  feedbackProductContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  feedbackProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: SAGE,
    marginLeft: 12,
    flex: 1,
  },

  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    paddingHorizontal: 4,
  },
  feedbackInput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(166,162,154,0.25)',
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: SAGE,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitFeedbackBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitFeedbackGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitFeedbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Confirm View Styles ──
  confirmRatingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
    marginBottom: 8,
    marginTop: 4,
  },
  confirmCommentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
    marginTop: 12,
    marginBottom: 6,
  },
  confirmCommentBox: {
    backgroundColor: CREAM,
    borderRadius: 10,
    padding: 12,
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.2)',
  },
  confirmCommentText: {
    fontSize: 14,
    color: SAGE,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  confirmBtn: {
    flex: 1,
    height: 50,                     // fixed height for consistency
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnEdit: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: SAGE,
  },
  confirmBtnEditText: {
    fontSize: 16,
    fontWeight: '600',
    color: SAGE,
  },
  confirmBtnSubmit: {
    overflow: 'hidden',              // ensures gradient respects borderRadius
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmGrad: {
    width: '100%',
    height: '100%',                  // fills the entire button
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,               // matches parent
  },
  confirmBtnSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── View Review Styles ──
  reviewDateText: {
    fontSize: 12,
    color: MUTED_GRAY,
    marginTop: 12,
    textAlign: 'center',
  },
  closeReviewBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CREAM,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(166,162,154,0.3)',
  },
  closeReviewBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: SAGE,
  },
});