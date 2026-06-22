import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import axios from "@/api/axios";
import DateTimePicker from "@react-native-community/datetimepicker";

// ── Palette (matches suite) ──────────────────────
const SAGE = "#4F5F52";
const SAGE_DARK = "#3e4c42";
const CREAM = "#F2EDE4";
const SOFT_WHITE = "#FFF3D9";
const MUTED_GRAY = "#A6A29A";

const { width } = Dimensions.get("window");

// ── Helper to format date to YYYY-MM-DD ──────────
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-CA");
};

// ── Status config ────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  pending: "#D4A03D",
  confirmed: "#5B7A8A",
  preparing: "#7A5B8A",
  ready: "#5B8A5E",
  completed: "#4F5F52",
  cancelled: "#C75B5B",
};
const STATUS_BG: Record<string, string> = {
  pending: "rgba(212,160,61,0.1)",
  confirmed: "rgba(91,122,138,0.1)",
  preparing: "rgba(122,91,138,0.1)",
  ready: "rgba(91,138,94,0.1)",
  completed: "rgba(79,95,82,0.1)",
  cancelled: "rgba(199,91,91,0.1)",
};

// ── Interfaces ───────────────────────────────────
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
}
interface CartItem {
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
}
interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  pickup_date: string;
  created_at: string;
  notes?: string;
  items?: Array<{
    menu: { name: string; image_url?: string; base_price: number };
    quantity: number;
    unit_price: number;
  }>;
}

const getImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `http://10.67.144.170:8000${url}`;
};

// ── Small reusable status badge ──────────────────
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || MUTED_GRAY;
  const bg = STATUS_BG[status] || "rgba(166,162,154,0.1)";
  return (
    <View style={[s.statusBadge, { backgroundColor: bg, borderColor: color + "44" }]}>
      <View style={[s.statusDot, { backgroundColor: color }]} />
      <Text style={[s.statusText, { color }]}>{status}</Text>
    </View>
  );
}

// ── Product image with fallback ──────────────────
function ProductImage({ imageUrl, size = 100 }: { imageUrl?: string; size?: number }) {
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
}

// ── Main component ───────────────────────────────
export default function CustomerDashboard() {
  const { user, logout } = useAuth();
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
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [pickupTime, setPickupTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  // ── Payment modal state ──
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"down" | "full">("down");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // ── Stock error modal state ──
  const [stockErrorModalVisible, setStockErrorModalVisible] = useState(false);
  const [stockErrorMessages, setStockErrorMessages] = useState<string[]>([]);

  // ── Fetch functions ──
  const fetchCategories = async () => {
    try {
      const res = await axios.get("/categories");
      const activeCats = (res.data.categories || []).filter((c: Category) => c.is_active);
      setCategories(activeCats);
      if (activeCats.length && !selectedCategory) setSelectedCategory(activeCats[0].id);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load categories");
    }
  };
  const fetchProducts = async () => {
    if (!selectedCategory) return;
    setLoadingMenu(true);
    try {
      const res = await axios.get(`/menu?category=${selectedCategory}`);
      setProducts(res.data.products || []);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to load products");
    } finally {
      setLoadingMenu(false);
    }
  };
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await axios.get("/customer/orders");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };
  const fetchCakeSizes = async () => {
    try {
      const res = await axios.get("/cake-sizes");
      setCakeSizes((res.data || []).filter((s: CakeSize) => s.is_active));
    } catch (err) {
      console.error("Failed to fetch cake sizes", err);
    }
  };
  const fetchCakeFlavors = async () => {
    try {
      const res = await axios.get("/cake-flavors");
      setCakeFlavors((res.data || []).filter((f: CakeFlavor) => f.is_active));
    } catch (err) {
      console.error("Failed to fetch cake flavors", err);
    }
  };
  const fetchNotifications = async () => {
    setNotifications([]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchOrders(),
      fetchNotifications(),
      fetchCategories(),
      fetchCakeSizes(),
      fetchCakeFlavors(),
    ]);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "orders") fetchOrders();
    }, [activeTab])
  );
  useEffect(() => {
    fetchCategories();
    fetchOrders();
    fetchCakeSizes();
    fetchCakeFlavors();
  }, []);
  useEffect(() => {
    if (selectedCategory) fetchProducts();
  }, [selectedCategory]);

  // ── Cart helpers ──
  const removeFromCart = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index));
  const calculateTotal = () =>
    cart.reduce((sum, item) => {
      let price = item.product.base_price;
      if (item.sizePrice) price += item.sizePrice;
      if (item.cakeSizePrice) price += item.cakeSizePrice;
      return sum + price * item.quantity;
    }, 0);
  const addToCart = () => {
    if (!selectedProduct) return;
    const item: CartItem = {
      product: selectedProduct,
      quantity: addons.quantity,
      sizeId: selectedProduct.has_size_options ? addons.sizeId : undefined,
      sizeName:
        selectedProduct.has_size_options && addons.sizeId
          ? selectedProduct.drinkSizes?.find((s) => s.id === addons.sizeId)?.size_name
          : undefined,
      sizePrice:
        selectedProduct.has_size_options && addons.sizeId
          ? selectedProduct.drinkSizes?.find((s) => s.id === addons.sizeId)?.price_modifier || 0
          : 0,
      cakeSizeId: addons.cakeSizeId,
      cakeSizeName: cakeSizes.find((s) => s.id === addons.cakeSizeId)?.size_name,
      cakeSizePrice: cakeSizes.find((s) => s.id === addons.cakeSizeId)?.price_modifier || 0,
      flavorId: addons.flavorId,
      flavorName: cakeFlavors.find((f) => f.id === addons.flavorId)?.flavor_name,
    };
    setCart((prev) => [...prev, item]);
    setProductModalVisible(false);
    Alert.alert("Added to cart", `${selectedProduct.name} has been added.`);
  };

  // ── Submit payment ──
  const submitPayment = async () => {
    if (!pendingOrder) return;

    let amountToPay = 0;
    if (paymentOption === "down") {
      amountToPay = pendingOrder.total_amount * 0.3;
    } else {
      amountToPay = pendingOrder.total_amount;
    }

    if (!referenceNumber.trim()) {
      Alert.alert("Missing Reference", "Please enter the GCash reference number.");
      return;
    }

    setSubmittingPayment(true);
    try {
      await axios.post("/customer/payments", {
        order_id: pendingOrder.id,
        payment_method: paymentMethod,
        amount_paid: amountToPay,
        reference_number: referenceNumber,
      });

      Alert.alert(
        "Payment Successful 🎉",
        `Your ${paymentOption === "down" ? "30% down payment" : "full payment"} has been received. Your order is now pending approval.`
      );
      setShowPaymentModal(false);
      setPendingOrder(null);
      setReferenceNumber("");
      fetchOrders();
    } catch (err: any) {
      Alert.alert("Payment Failed", err.response?.data?.message || "Could not process payment. Please try again.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ── Place Order ──
  const placeOrder = async () => {
    if (cart.length === 0) {
      Alert.alert("Cart empty", "Please add items to your order");
      return;
    }
    if (!pickupDate || !pickupTime) {
      Alert.alert("Missing schedule", "Please select pickup date and time");
      return;
    }

    setPlacingOrder(true);
    const orderItems = cart.map((item) => ({
      menu_id: item.product.id,
      quantity: item.quantity,
      size_id: item.sizeId,
      cake_size_id: item.cakeSizeId,
      flavor_id: item.flavorId,
    }));

    const formattedTime = `${pickupTime.getHours().toString().padStart(2, "0")}:${pickupTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}:00`;
    const pickupDateStr = pickupDate.toISOString().split("T")[0];

    try {
      await axios.post("/customer/orders", {
        items: orderItems,
        pickup_date: pickupDateStr,
        pickup_time: formattedTime,
        notes: orderNotes,
      });

      Alert.alert(
        "Order Submitted!",
        "Your order has been placed and is pending admin approval. You will be able to pay once it is confirmed.",
        [
          {
            text: "OK",
            onPress: () => {
              setCart([]);
              setOrderNotes("");
              setShowCart(false);
              setActiveTab("orders");
              fetchOrders();
            },
          },
        ]
      );
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setStockErrorMessages(err.response.data.errors);
        setStockErrorModalVisible(true);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Failed to create order");
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Order Now ──
  const orderNow = async () => {
    if (!selectedProduct) return;
    if (!pickupDate || !pickupTime) {
      Alert.alert("Missing Schedule", "Please set a pickup date and time before ordering.");
      return;
    }

    setPlacingOrder(true);
    try {
      const orderItems = [
        {
          menu_id: selectedProduct.id,
          quantity: addons.quantity,
          size_id: selectedProduct.has_size_options ? addons.sizeId : undefined,
          cake_size_id: addons.cakeSizeId,
          flavor_id: addons.flavorId,
        },
      ];

      const formattedTime = `${pickupTime.getHours().toString().padStart(2, "0")}:${pickupTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}:00`;
      const pickupDateStr = pickupDate.toISOString().split("T")[0];

      await axios.post("/customer/orders", {
        items: orderItems,
        pickup_date: pickupDateStr,
        pickup_time: formattedTime,
        notes: orderNotes,
      });

      Alert.alert(
        "Order Submitted!",
        "Your order has been placed and is pending admin approval. You will be able to pay once it is confirmed.",
        [
          {
            text: "OK",
            onPress: () => {
              setProductModalVisible(false);
              setActiveTab("orders");
              fetchOrders();
            },
          },
        ]
      );
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setStockErrorMessages(err.response.data.errors);
        setStockErrorModalVisible(true);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Failed to create order");
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();

  // ── Tab content ──────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case "menu": {
        const filtered = products.filter((p) => p.category_id === selectedCategory);
        return (
          <View style={{ flex: 1 }}>
            <ScrollView
              horizontal
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

            {!loadingMenu && filtered.length > 0 && (
              <Text style={s.countLabel}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </Text>
            )}

            {loadingMenu ? (
              <View style={s.loaderWrap}>
                <ActivityIndicator size="large" color={SAGE} />
                <Text style={s.loaderText}>Loading menu…</Text>
              </View>
            ) : (
              <View style={s.productGrid}>
                {filtered.length === 0 ? (
                  <View style={s.emptyWrap}>
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
                  filtered.map((product) => (
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
                  ))
                )}
              </View>
            )}
          </View>
        );
      }
      case "orders": {
        const isPayable = (order: Order) => {
          return (
            order.status !== "pending" &&
            order.status !== "cancelled" &&
            order.payment_status !== "paid"
          );
        };

        return (
          <View style={s.tabContent}>
            <View style={s.tabHeader}>
              <View style={s.tabHeaderIcon}>
                <Ionicons name="receipt-outline" size={15} color="#fff" />
              </View>
              <Text style={s.tabTitle}>Your Orders</Text>
              {orders.length > 0 && (
                <View style={s.countPill}>
                  <Text style={s.countPillText}>{orders.length}</Text>
                </View>
              )}
            </View>

            {loadingOrders ? (
              <View style={s.loaderWrap}>
                <ActivityIndicator size="large" color={SAGE} />
                <Text style={s.loaderText}>Loading orders…</Text>
              </View>
            ) : orders.length === 0 ? (
              <View style={s.emptyWrap}>
                <View style={s.emptyIconBox}>
                  <Ionicons name="receipt-outline" size={30} color={MUTED_GRAY} style={{ opacity: 0.5 }} />
                </View>
                <Text style={s.emptyText}>No orders yet</Text>
                <Text style={s.emptySubText}>
                  Add items from the menu to place your first order
                </Text>
              </View>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={s.orderCard}>
                  <View
                    style={[s.orderCardAccent, { backgroundColor: STATUS_COLOR[order.status] || MUTED_GRAY }]}
                  />
                  <View style={s.orderCardTop}>
                    <View>
                      <Text style={s.orderNumber}>{order.order_number}</Text>
                      <Text style={s.orderDate}>Pickup: {formatDate(order.pickup_date)}</Text>
                    </View>
                    <StatusBadge status={order.status} />
                  </View>
                  {order.items && order.items.length > 0 && (
                    <View style={s.orderItems}>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={s.orderItemRow}>
                          <ProductImage imageUrl={item.menu.image_url} size={38} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={s.orderItemName}>{item.menu.name}</Text>
                            <Text style={s.orderItemQty}>
                              Qty: {item.quantity} × ₱{item.unit_price}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={s.orderDivider} />
                  <View style={s.orderCardBottom}>
                    <Text style={s.orderTotal}>
                      ₱{parseFloat(String(order.total_amount)).toLocaleString()}
                    </Text>
                    <Text style={s.orderTotalLabel}>Total</Text>
                  </View>

                  {order.status === 'cancelled' && order.notes && (
                    <View style={{ marginTop: 8, marginHorizontal: 14, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>Rejected</Text>
                      <Text style={{ fontSize: 13, color: SAGE, marginTop: 2 }}>{order.notes.replace('[REJECTED]: ', '')}</Text>
                    </View>
                  )}

                  {isPayable(order) && (
                    <TouchableOpacity
                      style={s.payButton}
                      onPress={() => {
                        setPendingOrder(order);
                        setShowPaymentModal(true);
                      }}
                    >
                      <Text style={s.payButtonText}>Pay Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        );
      }
      case "notifications":
        return (
          <View style={s.tabContent}>
            <View style={s.tabHeader}>
              <View style={s.tabHeaderIcon}>
                <Ionicons name="notifications-outline" size={15} color="#fff" />
              </View>
              <Text style={s.tabTitle}>Notifications</Text>
            </View>
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
          </View>
        );
      case "profile":
        return (
          <View style={s.tabContent}>
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
                  <MaterialCommunityIcons name="star-circle-outline" size={15} color={SAGE} />
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
                      user.verification_type === "senior_citizen" ? "account-star" : "wheelchair-accessibility"
                    }
                    size={20}
                    color={SAGE}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={s.verifType}>{user.verification_type.replace("_", " ")}</Text>
                    <Text style={s.verifLabel}>Verification type</Text>
                  </View>
                </View>
                <StatusBadge status={user.verification_status || "pending"} />
              </View>
            )}

            <View style={s.stampsCard}>
              <Text style={s.stampsTitle}>Loyalty Stamps</Text>
              <View style={s.stampsGrid}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const earned = i < (user?.signature_stamps || 0) % 10;
                  return (
                    <View key={i} style={[s.stamp, earned && s.stampEarned]}>
                      <MaterialCommunityIcons name="star" size={14} color={earned ? "#fff" : MUTED_GRAY} />
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
          </View>
        );
      default:
        return null;
    }
  };

  // ── Main render ────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <LinearGradient colors={[SAGE, SAGE_DARK]} style={s.header}>
        <View style={s.headerBlob1} />
        <View style={s.headerBlob2} />

        <View style={s.headerInner}>
          <View>
            <Text style={s.headerGreeting}>Hello, {user?.first_name || "Guest"} 👋</Text>
            <Text style={s.headerSub}>What would you like today?</Text>
          </View>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>{initials || "?"}</Text>
          </View>
        </View>

        <View style={s.headerStamps}>
          <MaterialCommunityIcons name="star-circle" size={14} color={SOFT_WHITE} />
          <Text style={s.headerStampsText}>{user?.signature_stamps || 0} loyalty stamps</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SAGE}
            colors={[SAGE]}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {renderContent()}
      </ScrollView>

      <View style={s.tabBar}>
        {[
          { key: "menu", label: "Menu", icon: "restaurant-outline", activeIcon: "restaurant" },
          { key: "orders", label: "Orders", icon: "receipt-outline", activeIcon: "receipt" },
          { key: "notifications", label: "Alerts", icon: "notifications-outline", activeIcon: "notifications" },
          { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
        ].map((tab) => {
          const active = activeTab === tab.key;
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
                  size={20}
                  color={active ? "#fff" : MUTED_GRAY}
                />
              </View>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {cart.length > 0 && (
        <TouchableOpacity onPress={() => setShowCart(true)} style={s.cartFab} activeOpacity={0.88}>
          <LinearGradient colors={[SAGE, SAGE_DARK]} style={s.cartFabGrad}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
          </LinearGradient>
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeText}>{cart.length}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Product Detail Modal */}
      <Modal visible={productModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.productModal}>
            <View style={s.modalHandle} />

            <LinearGradient colors={[SAGE, SAGE_DARK]} style={s.modalHeader}>
              <View style={s.modalHeaderBlob} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>{selectedProduct?.name}</Text>
                  <Text style={s.modalPrice}>
                    ₱{selectedProduct && parseFloat(String(selectedProduct.base_price)).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setProductModalVisible(false)} style={s.modalCloseBtn}>
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
                          <Text style={[s.optionChipSub, active && { color: "rgba(255,255,255,0.75)" }]}>
                            +₱{size.price_modifier}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {cakeFlavors.length > 0 && (
                <View style={s.optionSection}>
                  <Text style={s.optionTitle}>Flavor</Text>
                  <View style={s.optionWrap}>
                    {cakeFlavors.map((flavor) => {
                      const active = addons.flavorId === flavor.id;
                      return (
                        <TouchableOpacity
                          key={flavor.id}
                          onPress={() => setAddons({ ...addons, flavorId: flavor.id })}
                          style={[s.optionChip, active && s.optionChipActive]}
                        >
                          <Text style={[s.optionChipText, active && s.optionChipTextActive]}>
                            {flavor.flavor_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
                                style={[s.optionChipSub, active && { color: "rgba(255,255,255,0.75)" }]}
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
                    onPress={() =>
                      setAddons({ ...addons, quantity: Math.max(1, addons.quantity - 1) })
                    }
                    style={s.qtyBtn}
                  >
                    <Ionicons name="remove" size={18} color={SAGE} />
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{addons.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => setAddons({ ...addons, quantity: addons.quantity + 1 })}
                    style={s.qtyBtn}
                  >
                    <Ionicons name="add" size={18} color={SAGE} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 20, marginBottom: 10 }}>
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
                  onPress={orderNow}
                  disabled={placingOrder}
                  style={[s.modalOrderBtn, placingOrder && { opacity: 0.7 }]}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[SAGE, SAGE_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.modalOrderBtnGrad}
                  >
                    {placingOrder ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.modalOrderBtnText}>Order Now</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cart Modal */}
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
                  <Text style={s.countPillText}>{cart.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCart(false)} style={s.cartCloseBtn}>
                <Ionicons name="close" size={18} color={MUTED_GRAY} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cart}
              keyExtractor={(_, i) => i.toString()}
              style={{ maxHeight: "45%" }}
              renderItem={({ item, index }) => {
                let total = item.product.base_price;
                if (item.sizePrice) total += item.sizePrice;
                if (item.cakeSizePrice) total += item.cakeSizePrice;
                total *= item.quantity;
                return (
                  <View style={s.cartItem}>
                    <ProductImage imageUrl={item.product.image_url} size={42} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.cartItemName}>{item.product.name}</Text>
                      {item.sizeName && <Text style={s.cartItemMeta}>Size: {item.sizeName}</Text>}
                      {item.cakeSizeName && (
                        <Text style={s.cartItemMeta}>Cake: {item.cakeSizeName}</Text>
                      )}
                      {item.flavorName && (
                        <Text style={s.cartItemMeta}>Flavor: {item.flavorName}</Text>
                      )}
                      <Text style={s.cartItemMeta}>
                        Qty: {item.quantity} × ₱{item.product.base_price}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={s.cartItemTotal}>₱{total.toLocaleString()}</Text>
                      <TouchableOpacity onPress={() => removeFromCart(index)} style={s.cartRemoveBtn}>
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                <View style={{ padding: 16 }}>
                  <View style={s.cartTotal}>
                    <Text style={s.cartTotalLabel}>Total</Text>
                    <Text style={s.cartTotalValue}>₱{calculateTotal().toLocaleString()}</Text>
                  </View>

                  <View style={s.cartDivider} />

                  <Text style={s.scheduleLabel}>PICKUP SCHEDULE</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={s.schedulePill}>
                    <View style={s.schedulePillLeft}>
                      <Ionicons name="calendar-outline" size={16} color={SAGE} />
                      <Text style={s.schedulePillLabel}>Date</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.schedulePillValue}>{pickupDate.toDateString()}</Text>
                      <Ionicons name="chevron-forward" size={14} color={MUTED_GRAY} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowTimePicker(true)} style={s.schedulePill}>
                    <View style={s.schedulePillLeft}>
                      <Ionicons name="time-outline" size={16} color={SAGE} />
                      <Text style={s.schedulePillLabel}>Time</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.schedulePillValue}>
                        {pickupTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
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
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
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

            <View style={s.paymentBody}>
              <Text style={s.paymentAmountLabel}>Order Total</Text>
              <Text style={s.paymentAmount}>
                ₱{pendingOrder?.total_amount?.toLocaleString()}
              </Text>

              <Text style={s.paymentOptionLabel}>Choose Payment Option</Text>
              <View style={s.paymentOptionRow}>
                <TouchableOpacity
                  style={[s.paymentOptionChip, paymentOption === "down" && s.paymentOptionChipActive]}
                  onPress={() => setPaymentOption("down")}
                >
                  <Text style={[s.paymentOptionText, paymentOption === "down" && s.paymentOptionTextActive]}>
                    30% Down Payment
                  </Text>
                  <Text style={[s.paymentOptionPrice, paymentOption === "down" && { color: "#fff" }]}>
                    ₱{pendingOrder ? (pendingOrder.total_amount * 0.3).toLocaleString() : 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.paymentOptionChip, paymentOption === "full" && s.paymentOptionChipActive]}
                  onPress={() => setPaymentOption("full")}
                >
                  <Text style={[s.paymentOptionText, paymentOption === "full" && s.paymentOptionTextActive]}>
                    Full Payment
                  </Text>
                  <Text style={[s.paymentOptionPrice, paymentOption === "full" && { color: "#fff" }]}>
                    ₱{pendingOrder?.total_amount?.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={s.paymentMethodLabel}>Payment Method</Text>
              <View style={s.paymentMethodOptions}>
                <TouchableOpacity
                  style={[s.paymentMethodChip, paymentMethod === "gcash" && s.paymentMethodChipActive]}
                  onPress={() => setPaymentMethod("gcash")}
                >
                  <Text style={[s.paymentMethodText, paymentMethod === "gcash" && s.paymentMethodTextActive]}>
                    GCash
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="GCash Reference Number"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                style={s.paymentReferenceInput}
                placeholderTextColor={MUTED_GRAY}
              />

              <TouchableOpacity
                onPress={submitPayment}
                disabled={submittingPayment}
                style={[s.paymentButton, submittingPayment && { opacity: 0.7 }]}
                activeOpacity={0.88}
              >
                <LinearGradient colors={[SAGE, SAGE_DARK]} style={s.paymentButtonGrad}>
                  {submittingPayment ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.paymentButtonText}>
                      Pay ₱
                      {paymentOption === "down"
                        ? (pendingOrder?.total_amount * 0.3).toLocaleString()
                        : pendingOrder?.total_amount?.toLocaleString()}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stock Error Modal */}
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
              {stockErrorMessages.map((msg, idx) => (
                <Text key={idx} style={s.stockErrorText}>{msg}</Text>
              ))}
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

      {showTimePicker && (
        <DateTimePicker
          value={pickupTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setPickupTime(selectedTime);
              Alert.alert(
                "Time updated",
                `New pickup time: ${selectedTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              );
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // Header
  header: {
    paddingTop: 8,
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

  // Category tabs
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

  // Count label
  countLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED_GRAY,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  // Products grid
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
  productImgWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 6, position: "relative" },
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

  // Tab content wrapper
  tabContent: { padding: 16 },
  tabHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
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

  // Count pill
  countPill: {
    backgroundColor: "rgba(79,95,82,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(79,95,82,0.15)",
  },
  countPillText: { fontSize: 11, fontWeight: "700", color: SAGE },

  // Status badge
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

  // Order cards
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

  // Pay button
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

  // Loader / empty states
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

  // Image fallback
  imgFallback: { backgroundColor: CREAM, alignItems: "center", justifyContent: "center" },

  // Profile
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
  profileDivider: { height: 1, backgroundColor: "rgba(242,237,228,0.9)", width: "100%", marginVertical: 14 },
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

  // Bottom tab bar
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
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 4 },
  tabIconWrap: { width: 38, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabIconWrapActive: { backgroundColor: SAGE },
  tabLabel: { fontSize: 10, fontWeight: "500", color: MUTED_GRAY, marginTop: 3 },
  tabLabelActive: { color: SAGE, fontWeight: "700" },

  // Cart FAB
  cartFab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 8,
  },
  cartFabGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Modal shared
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
  modalPrice: { fontSize: 22, fontWeight: "800", color: "rgba(255,243,217,0.9)", letterSpacing: -0.5, marginTop: 2 },
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
    gap: 8,
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

  // Options
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

  // Cart sheet
  cartOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,28,22,0.5)" },
  cartSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
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
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  cartTotal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cartTotalLabel: { fontSize: 13, fontWeight: "600", color: MUTED_GRAY },
  cartTotalValue: { fontSize: 22, fontWeight: "800", color: SAGE, letterSpacing: -0.5 },
  cartDivider: { height: 1, backgroundColor: "rgba(242,237,228,0.8)", marginBottom: 14 },

  // Schedule
  scheduleLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED_GRAY,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  schedulePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CREAM,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(166,162,154,0.2)",
  },
  schedulePillLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  schedulePillLabel: { fontSize: 13, fontWeight: "600", color: SAGE },
  schedulePillValue: { fontSize: 13, color: SAGE, fontWeight: "500" },

  // Notes & place order
  notesInput: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    padding: 12,
    minHeight: 70,
    fontSize: 13,
    color: SAGE,
    textAlignVertical: "top",
    marginBottom: 16,
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
    paddingVertical: 16,
  },
  placeOrderText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  // Payment modal styles
  paymentSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "80%",
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
  paymentTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: SAGE,
  },
  paymentBody: {
    padding: 20,
  },
  paymentAmountLabel: {
    fontSize: 12,
    color: MUTED_GRAY,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: SAGE,
    marginBottom: 20,
  },
  paymentOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 10,
  },
  paymentOptionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  paymentOptionChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
  },
  paymentOptionChipActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED_GRAY,
    marginBottom: 4,
  },
  paymentOptionTextActive: {
    color: "#fff",
  },
  paymentOptionPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: SAGE,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: SAGE,
    marginBottom: 10,
  },
  paymentMethodOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    backgroundColor: "#FAFAFA",
  },
  paymentMethodChipActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "600",
    color: MUTED_GRAY,
  },
  paymentMethodTextActive: {
    color: "#fff",
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
  paymentButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  paymentButtonGrad: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Stock Error Modal Styles ──
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
  stockErrorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE,
  },
  stockErrorBody: {
    marginBottom: 20,
    gap: 6,
  },
  stockErrorText: {
    fontSize: 14,
    color: SAGE,
    lineHeight: 20,
  },
  stockErrorButton: {
    backgroundColor: SAGE,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  stockErrorButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});