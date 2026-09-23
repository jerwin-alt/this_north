// mobile/app/customer/cakeCustomization.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo  } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import axios from '@/api/axios';
import SvgDecoration, { prefetchSvg } from '@/components/SvgDecoration';
import { useAuth } from '@/contexts/auth-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '@/stores/appStore';
import { SvgXml } from 'react-native-svg';
import {
  buildCakeSvg,
  getTierGeometries,
  getIcingPosition,
  getIcingColorFromName,
  type CakeShape,
} from '@/constants/cakeBase';
const { width } = Dimensions.get('window');

// ---- Colors ----
const SAGE = '#4F5F52';
const SAGE_DARK = '#3e4c42';
const CREAM = '#F2EDE4';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';

// ---- Canvas size ----
const CANVAS_SIZE = Math.min(width * 0.85, 400);

// ---- Base cake price ----
const BASE_CAKE_PRICE = 850;

// ---- Local assets ----
const DECORATION_IMAGES: Record<string, any> = {
  strawberry: require('@/assets/images/CUSTOMIZE_CAKE5.jpg'),
};

// Fallback remote URLs
// DELETE the entire FALLBACK_URLS constant.

const getDecorationSource = (elementName?: string, imageUrl?: string) => {
  const key = elementName?.toLowerCase().replace(/\s/g, '') || '';
  if (DECORATION_IMAGES[key]) return DECORATION_IMAGES[key];
  if (imageUrl && imageUrl.startsWith('http')) return { uri: imageUrl };
  return null;   // No wrong fallbacks — let SvgDecoration handle it
};

// ---- Helper to get image source ----
// const getDecorationSource = (elementName: string, imageUrl?: string) => {
//   const key = elementName.toLowerCase().replace(/\s/g, '');
//   if (DECORATION_IMAGES[key]) return DECORATION_IMAGES[key];
//   if (imageUrl) {
//     if (imageUrl.startsWith('http')) return { uri: imageUrl };
//   }
//   if (FALLBACK_URLS[key]) return { uri: FALLBACK_URLS[key] };
//   return null;
// };

// ---- Cake background ----
//const CAKE_BACKGROUND = require('@/assets/images/CUSTOMIZE_CAKE7_YES.png');



// ---- Helper to get current time as "HH:MM:SS" ----
const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// ---- Helper format money ----
const formatMoney = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ---- Types ----
interface DecorationElement {
  id: number;
  element_name: string;
  element_type: string;
  category?: string;
  image_url?: string;
  svg_source?: string | null;        // NEW — URL or inline XML
  supports_color?: boolean;          // NEW
  color_parts?: string[] | null;     // NEW — e.g. ["petals", "center"]
  default_price: number;
}

interface PlacedDecoration {
  id: string;
  elementId: number;
  x: number;
  y: number;
  scale?: number;                    // NEW — default 1
  color?: string | null;             // NEW — single-color tint
  colors?: Record<string, string>;   // NEW — per-part tint
  tierIndex?: number;   
  element: DecorationElement;
}

interface CakeSize {
  id: number;
  size_name: string;
  size_inches: number;
  shape: CakeShape;
  tiers: number;
  base_size_inches: number;
  price_modifier: number;
  is_active: boolean;
}

interface CakeFlavor {
  id: number;
  flavor_name: string;
  is_active: boolean;
}

export default function CakeCustomization() {
  const router = useRouter();
  const { user } = useAuth();
  const { setRefreshOrders } = useAppStore();

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ---- Navigation helper ----
  const goBackToDashboard = () => {
    router.back();
  };

  // ---- State for cake design ----
  const [elements, setElements] = useState<Record<string, DecorationElement[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [placedDecorations, setPlacedDecorations] = useState<PlacedDecoration[]>([]);
  const [cakeSizes, setCakeSizes] = useState<CakeSize[]>([]);
  const [cakeFlavors, setCakeFlavors] = useState<CakeFlavor[]>([]);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<CakeShape>('round');
  const [tierCount, setTierCount] = useState<number>(1);
  const [activeTierIndex, setActiveTierIndex] = useState<number>(0);
  const activeTierIndexRef = useRef<number>(0);
  useEffect(() => {
    activeTierIndexRef.current = activeTierIndex;
  }, [activeTierIndex]);
  const [selectedFlavor, setSelectedFlavor] = useState<number | null>(null);
  const [frostingFlavor, setFrostingFlavor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- State for pickup schedule ----
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date());
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ---- Draft design (for order placement) ----
  const [customCakeDraft, setCustomCakeDraft] = useState<{
    designId: number;
    quantity: number;
    sizeName: string;
    flavorName: string | null;
    frostingFlavor: string;
    specialInstructions: string;
    totalPrice: number;
  } | null>(null);

  // ---- Ghost state ----
// const [ghostXml, setGhostXml] = useState<string | null>(null);

  const [isGhostVisible, setIsGhostVisible] = useState(false);

  // const [ghostElement, setGhostElement] = useState<{
  //   svgSource?: string | null;
  //   imageUrl?: any;
  // } | null>(null);

  // ---- Shared values for ghost position ----
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ghostX.value }, { translateY: ghostY.value }],
    opacity: isGhostVisible ? 0.7 : 0,
  }));

  // ---- Canvas ref and measure helper ----
  const canvasRef = useRef<View>(null);
  const summaryCanvasRef = useRef<View>(null);
  const [summaryScale, setSummaryScale] = useState(1);

  // ---- Safe state update helpers ----
  const safeSetPlacedDecorations = useCallback((updateFn: (prev: PlacedDecoration[]) => PlacedDecoration[]) => {
    if (isMounted.current) setPlacedDecorations(updateFn);
  }, []);

  // const safeSetGhostImage = useCallback((img: any) => {
  //   if (isMounted.current) setGhostImage(img);
  // }, []);

  // const safeSetGhostXml = useCallback((xml: string | null) => {
  //   if (isMounted.current) setGhostXml(xml);
  // }, []);

  const safeSetIsGhostVisible = useCallback((visible: boolean) => {
    if (isMounted.current) setIsGhostVisible(visible);
  }, []);

  // const safeSetGhostElement = useCallback((el: any) => {
  //   if (isMounted.current) setGhostElement(el);
  // }, []);

  const resetDrag = useCallback(() => {
    safeSetIsGhostVisible(false);
    ghostX.value = 0;
    ghostY.value = 0;
  }, []);



  
  // ── Helpers for icing (frosting) handling ──
  const isIcing = (element: DecorationElement) =>
    element?.element_type === 'icing';

  // Determine which frosting slot this element occupies.
  // Returns 0 for side frosting, 1 for top frosting, 2 for everything else.
  const frostingLayerPriority = (element: DecorationElement): number => {
    if (!element || element.element_type !== 'icing') return 2;
    // Side frostings render first (behind), top frostings render second (in front),
    // so the top frosting correctly covers the boundary between the two.
    const cat = (element.category || '').toLowerCase();
    if (cat.includes('side')) return 0;
    if (cat.includes('top')) return 1;
    return 1; // default icing = top
  };

  const sortFrostingsFirst = (decs: PlacedDecoration[]) => {
    return [...decs].sort((a, b) => {
      const aP = frostingLayerPriority(a.element);
      const bP = frostingLayerPriority(b.element);
      if (aP !== bP) return aP - bP;
      return 0; // stable — preserve insertion order within the same priority
    });
  };
  

  // ---- Core function: add decoration at drop position ----
  const addDecorationAtDrop = useCallback((absX: number, absY: number, element: DecorationElement) => {
    if (!canvasRef.current) {
      resetDrag();
      return;
    }
    const icing = isIcing(element);

    canvasRef.current.measure((x, y, width, height, pageX, pageY) => {
      const relX = absX - pageX;
      const relY = absY - pageY;
      const inside = relX >= 0 && relX <= width && relY >= 0 && relY <= height;
      if (!inside) { resetDrag(); return; }

      // Frostings snap to a fixed position (they cover the whole canvas anyway)
      const clampedX = icing ? 0 : Math.max(0, Math.min(relX, width));
      const clampedY = icing ? 0 : Math.max(0, Math.min(relY, height));

      const newDec: PlacedDecoration = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        elementId: element.id,
        x: clampedX,
        y: clampedY,
        tierIndex: icing ? activeTierIndexRef.current : undefined,
        element,
      };

      safeSetPlacedDecorations(prev => {
          if (icing) {
            const incomingCat = element.category ?? '__no_cat__';
            const incomingTier = activeTierIndexRef.current;
            const filtered = prev.filter(d => {
            if (d.element.element_type !== 'icing') return true;
            const existingCat = d.element.category ?? '__no_cat__';
            const existingTier = d.tierIndex ?? 0;
            // Drop only icings of the same category AND the same tier
            if (existingCat !== incomingCat) return true;
            if (existingTier !== incomingTier) return true;
            return false;
          });
          return [...filtered, newDec];
        }
        // Regular decoration — avoid exact-position duplicates
        const exists = prev.some(d =>
          d.elementId === element.id && d.x === clampedX && d.y === clampedY
        );
        if (exists) return prev;
        return [...prev, newDec];
      });

      resetDrag();
    });
  }, [resetDrag, safeSetPlacedDecorations]);

  // ---- Core function: move existing decoration ----
  const moveDecoration = useCallback((decId: string, absX: number, absY: number) => {
    if (!canvasRef.current) {
      resetDrag();
      return;
    }
    canvasRef.current.measure((x, y, width, height, pageX, pageY) => {
      const relX = absX - pageX;
      const relY = absY - pageY;
      const inside = relX >= 0 && relX <= width && relY >= 0 && relY <= height;
      if (inside) {
        const clampedX = Math.max(0, Math.min(relX, width));
        const clampedY = Math.max(0, Math.min(relY, height));
        safeSetPlacedDecorations(prev =>
          prev.map(d => d.id === decId ? { ...d, x: clampedX, y: clampedY } : d)
        );
      }
      resetDrag();
    });
  }, [resetDrag, safeSetPlacedDecorations]);

  // ---- Gesture creators ----
  const createAddGesture = (element: DecorationElement) => {
    return Gesture.Pan()
      .onStart(() => {
        runOnJS(safeSetIsGhostVisible)(true);
      })
      .onUpdate((event) => {
        ghostX.value = event.absoluteX - 25;
        ghostY.value = event.absoluteY - 25;
      })
      .onEnd((event) => {
        runOnJS(addDecorationAtDrop)(event.absoluteX, event.absoluteY, element);
      });
  };

  const createMoveGesture = (dec: PlacedDecoration) => {
    return Gesture.Pan()
      .onStart(() => {
        runOnJS(safeSetIsGhostVisible)(true);
      })
      .onUpdate((event) => {
        ghostX.value = event.absoluteX - 25;
        ghostY.value = event.absoluteY - 25;
      })
      .onEnd((event) => {
        runOnJS(moveDecoration)(dec.id, event.absoluteX, event.absoluteY);
      });
  };

  // ---- Fetch data ----
  useEffect(() => {
    fetchDesignElements();
    fetchCakeSizes();
    fetchCakeFlavors();
  }, []);

  useEffect(() => {
    if (!elements || Object.keys(elements).length === 0) return;
    const all = Object.values(elements).flat();
    all.forEach((el) => {
      if (el.svg_source) prefetchSvg(el.svg_source);
    });
  }, [elements]);

  const fetchDesignElements = async () => {
    try {
      const res = await axios.get('/design-elements');
      const data = res.data;
      if (data.elements && Object.keys(data.elements).length > 0) {
        // Inject category into each element so downstream code can rely on it
        // even if the API response omits the field.
        const withCategory: Record<string, DecorationElement[]> = {};
        Object.entries(data.elements).forEach(([category, items]: [string, any]) => {
          withCategory[category] = (items as any[]).map((it) => ({
            ...it,
            category: it.category || category,
          }));
        });

        setElements(withCategory);
        setCategories(data.categories || []);
        if (data.categories?.length > 0) setSelectedCategory(data.categories[0]);
      } else {
        // fallback default elements
        const defaultElements: Record<string, DecorationElement[]> = {
          Fruit: [
            { id: 1, element_name: 'Strawberry', element_type: 'fruit', default_price: 10 },
            { id: 2, element_name: 'Cherry', element_type: 'fruit', default_price: 10 },
            { id: 3, element_name: 'Blueberry', element_type: 'fruit', default_price: 10 },
          ],
          Chocolate: [
            { id: 4, element_name: 'Chocolate Piece', element_type: 'chocolate', default_price: 15 },
            { id: 5, element_name: 'Chocolate Drip', element_type: 'drip', default_price: 20 },
          ],
          Sprinkles: [
            { id: 6, element_name: 'Sprinkles', element_type: 'sprinkles', default_price: 5 },
          ],
          Flowers: [
            { id: 7, element_name: 'Flower', element_type: 'flower', default_price: 12 },
          ],
          Candles: [
            { id: 8, element_name: 'Candle', element_type: 'candle', default_price: 8 },
          ],
        };
        setElements(defaultElements);
        setCategories(Object.keys(defaultElements));
        setSelectedCategory('Fruit');
      }
    } catch (err) {
      console.error('Failed to fetch design elements', err);
    }
  };

  const fetchCakeSizes = async () => {
    try {
      const res = await axios.get('/cake-sizes');
      const sizes = (res.data || []).filter((s: CakeSize) => s.is_active);
      setCakeSizes(sizes);
      if (sizes.length > 0) setSelectedSize(sizes[0].id);
    } catch (err) {
      const fallback: CakeSize[] = [
        { id: 1, size_name: 'Junior',         shape: 'round',  tiers: 1, base_size_inches: 6,  size_inches: 6,  price_modifier: 900,  is_active: true },
        { id: 2, size_name: 'Regular',        shape: 'round',  tiers: 1, base_size_inches: 8,  size_inches: 8,  price_modifier: 1800, is_active: true },
        { id: 3, size_name: '10" Round',      shape: 'round',  tiers: 1, base_size_inches: 10, size_inches: 10, price_modifier: 2600, is_active: true },
        { id: 4, size_name: '12" Round',      shape: 'round',  tiers: 1, base_size_inches: 12, size_inches: 12, price_modifier: 3400, is_active: true },
        { id: 5, size_name: '6" Square',      shape: 'square', tiers: 1, base_size_inches: 6,  size_inches: 6,  price_modifier: 1200, is_active: true },
        { id: 6, size_name: '8" Square',      shape: 'square', tiers: 1, base_size_inches: 8,  size_inches: 8,  price_modifier: 2200, is_active: true },
        { id: 7, size_name: '10" Square',     shape: 'square', tiers: 1, base_size_inches: 10, size_inches: 10, price_modifier: 3200, is_active: true },
        { id: 8, size_name: '12" Square',     shape: 'square', tiers: 1, base_size_inches: 12, size_inches: 12, price_modifier: 4200, is_active: true },
      ];
      setCakeSizes(fallback);
      setSelectedSize(1);
    }
  };

  const fetchCakeFlavors = async () => {
    try {
      const res = await axios.get('/cake-flavors');
      const flavors = (res.data || []).filter((f: CakeFlavor) => f.is_active);
      setCakeFlavors(flavors);
      if (flavors.length > 0) setSelectedFlavor(flavors[0].id);
    } catch (err) {
      const fallback: CakeFlavor[] = [
        { id: 1, flavor_name: 'Chocolate', is_active: true },
        { id: 2, flavor_name: 'Vanilla', is_active: true },
        { id: 3, flavor_name: 'Red Velvet', is_active: true },
      ];
      setCakeFlavors(fallback);
      setSelectedFlavor(1);
    }
  };

  const removeDecoration = (id: string) => {
    setPlacedDecorations(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.filter(d => d.id !== id);
    });
  };

  // ---- Total price calculation ----
  const calculateTotal = () => {
    let total = BASE_CAKE_PRICE;
    const size = cakeSizes.find(s => s.id === selectedSize);
    if (size) {
      total += parseFloat(String(size.price_modifier)) || 0;
    }
    const decorations = Array.isArray(placedDecorations) ? placedDecorations : [];
    decorations.forEach(dec => {
      total += parseFloat(String(dec.element.default_price)) || 0;
    });
    const qty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10) || 1;
    return total * qty;
  };

  // ---- Confirm Order handler (saves design and opens pickup modal) ----
  const handleConfirmOrder = async () => {
    const sizeId = selectedSize ?? cakeSizes[0]?.id;
    if (!sizeId) {
      Alert.alert('Missing Selection', 'Please select a cake size.');
      return;
    }
    const decorations = Array.isArray(placedDecorations) ? placedDecorations : [];
    if (decorations.length === 0) {
      Alert.alert('Empty Cake', 'Please add at least one decoration.');
      return;
    }

    setSubmitting(true);
    try {
      // Build design payload
      const designPayload = {
        cake_size_id: sizeId,
        cake_flavor_id: selectedFlavor || null,
        frosting_flavor: frostingFlavor || null,
        tiers: tierCount,                                       // ← NEW
        custom_flavor: 'custom',
        decorations: decorations.map(d => ({
          element_id: d.elementId,
          x: d.x,
          y: d.y,
          scale: d.scale ?? 1,
          color: d.color ?? null,
          colors: d.colors ?? null,
          tier_index: d.tierIndex ?? 0,                          // ← NEW
        })),
        special_instructions: specialInstructions,
        total_price: calculateTotal(),
        design_name: 'Custom Cake',
      };

      // 1. Save the design
      const designRes = await axios.post('/custom-designs', designPayload);
      const designId = designRes.data.design_id;

      // 2. Prepare draft data
      const sizeName = cakeSizes.find(s => s.id === sizeId)?.size_name || '';
      const flavorName = cakeFlavors.find(f => f.id === selectedFlavor)?.flavor_name || null;

      const draft = {
        designId,
        quantity,
        sizeName,
        flavorName,
        frostingFlavor,
        specialInstructions,
        totalPrice: calculateTotal(),
      };

      // 3. Store in local state and open pickup modal
      setCustomCakeDraft(draft);
      setShowPickupModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save cake design.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Place custom cake order from pickup modal ----
  const placeCustomOrder = async () => {
    if (!customCakeDraft) return;
    if (!pickupDate) {
      Alert.alert('Missing schedule', 'Please select pickup date.');
      return;
    }
    setPlacingOrder(true);
    try {
      const pickupDateStr = `${pickupDate.getFullYear()}-${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(pickupDate.getDate()).padStart(2, '0')}`;
      const currentTime = getCurrentTimeString();
      const orderItems = [
        {
          cake_type: 'custom',
          custom_design_id: customCakeDraft.designId,
          quantity: customCakeDraft.quantity,
        },
      ];
      await axios.post('/customer/orders', {
        items: orderItems,
        pickup_date: pickupDateStr,
        pickup_time: currentTime,
        notes: `Custom cake: ${customCakeDraft.specialInstructions || 'No special instructions'}`,
      });
      Alert.alert(
        'Order Submitted!',
        'Your custom cake order has been placed and is pending admin approval. You will be able to pay once it is confirmed.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPickupModal(false);
              setCustomCakeDraft(null);
              // 👇 Set flag and go back to dashboard
              setRefreshOrders(true);
              goBackToDashboard();
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
        Alert.alert('Error', errorMessages.join('\n'));
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to create custom cake order.');
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  // ---- Handle summary canvas layout ----
  const onSummaryLayout = (event: LayoutChangeEvent) => {
    const { width: w } = event.nativeEvent.layout;
    if (w > 0) {
      const scale = w / CANVAS_SIZE;
      setSummaryScale(scale);
    }
  };


  const tierFrostings = useMemo(() => {
    const map: Record<number, { side?: string; top?: string }> = {};
    placedDecorations.forEach((dec) => {
      if (!isIcing(dec.element)) return;
      const tierIdx = dec.tierIndex ?? 0;
      const pos = getIcingPosition(dec.element.element_name);
      const color = getIcingColorFromName(dec.element.element_name);
      if (!map[tierIdx]) map[tierIdx] = {};
      map[tierIdx][pos] = color;
    });
    return map;
  }, [placedDecorations]);

  const baseCakeXml = useMemo(
    () => buildCakeSvg({
      shape: selectedShape,
      tierCount,
      tierFrostings,
    }),
    [selectedShape, tierCount, tierFrostings]
  );

  const visibleSizes = useMemo(
    () => cakeSizes.filter(s => s.shape === selectedShape && s.is_active),
    [cakeSizes, selectedShape]
  );


  
  // ---- Render canvas ----
  const renderCanvas = () => {
    const decorations = Array.isArray(placedDecorations) ? placedDecorations : [];
    return (
      <View ref={canvasRef} style={styles.canvasContainer}>
        <View style={styles.canvas}>
          <SvgXml xml={baseCakeXml} width="100%" height="100%" />

          {/* ── Icing X buttons — positioned per tier ── */}
          {decorations.filter((d) => isIcing(d.element)).map((dec) => {
            const geo = getTierGeometries(selectedShape, tierCount)[dec.tierIndex ?? 0];
            if (!geo) return null;
            const isTop = getIcingPosition(dec.element.element_name) === 'top';
            const xBtn = isTop
              ? geo.cx + geo.rx * 0.72
              : geo.cx + geo.rx * 0.82;
            const yBtn = isTop
              ? geo.cyTop - geo.ry * 0.78
              : geo.cyTop + geo.wallH * 0.55;
            return (
              <TouchableOpacity
                key={`icing-x-${dec.id}`}
                style={{
                  position: 'absolute',
                  left: xBtn - 12,
                  top: yBtn - 12,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                  zIndex: 10,
                }}
                onPress={() => removeDecoration(dec.id)}
              >
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </TouchableOpacity>
            );
          })}

          {/* ── Regular decorations ── */}
          {decorations.filter((d) => !isIcing(d.element)).map((dec) => {
            const gesture = createMoveGesture(dec);
            const decSize = 40 * (dec.scale ?? 1);
            return (
              <GestureDetector key={dec.id} gesture={gesture}>
                <Animated.View
                  style={[
                    styles.placedDecoration,
                    {
                      left: dec.x - decSize / 2,
                      top: dec.y - decSize / 2,
                      width: decSize,
                      height: decSize,
                    },
                  ]}
                >
                  <SvgDecoration
                    svgSource={dec.element.svg_source}
                    imageUrl={getDecorationSource(dec.element.element_name, dec.element.image_url)}
                    size={decSize}
                    color={dec.color}
                    colors={dec.colors}
                  />
                  <TouchableOpacity
                    style={styles.removeDecorationBtn}
                    onPress={() => removeDecoration(dec.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </Animated.View>
              </GestureDetector>
            );
          })}

          <Text style={styles.canvasHint}>Drag decorations here</Text>
        </View>
      </View>
    );
  };

  const renderGhost = () => {
    if (!isGhostVisible) return null;
    return (
      <Animated.View style={[styles.ghost, ghostStyle]} pointerEvents="none">
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 2.5,
            borderColor: '#4F5F52',
            backgroundColor: 'rgba(79,95,82,0.18)',
          }}
        />
      </Animated.View>
    );
  };

  const renderLibrary = () => {
    const items = elements[selectedCategory || ''] || [];
    if (items.length === 0) {
      return (
        <View style={styles.emptyLibrary}>
          <Text style={styles.emptyLibraryText}>No decorations in this category</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.libraryList}
        renderItem={({ item }) => {
          const gesture = createAddGesture(item);
          return (
            <GestureDetector gesture={gesture}>
              <Animated.View style={styles.libraryItem}>
                <SvgDecoration
                  svgSource={item.svg_source}
                  imageUrl={getDecorationSource(item.element_name, item.image_url)}
                  size={50}
                />
                <Text style={styles.libraryItemName} numberOfLines={1}>
                  {item.element_name}
                </Text>
              </Animated.View>
            </GestureDetector>
          );
        }}
      />
    );
  };

  const renderCategoryTabs = () => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map(cat => (
        <TouchableOpacity
          key={cat}
          onPress={() => setSelectedCategory(cat)}
          style={[
            styles.categoryTab,
            selectedCategory === cat && styles.categoryTabActive,
          ]}
        >
          <Text style={[
            styles.categoryTabText,
            selectedCategory === cat && styles.categoryTabTextActive,
          ]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ---- Main render ----
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={[SAGE, SAGE_DARK]} style={styles.header}>
          <TouchableOpacity onPress={goBackToDashboard} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={SOFT_WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cake Customization</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {renderCanvas()}
          {renderGhost()}

          <View style={styles.librarySection}>
            {renderCategoryTabs()}
            {renderLibrary()}
          </View>

          {/* Options */}
          <View style={styles.optionsSection}>
            <Text style={styles.optionsTitle}>Cake Options</Text>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Cake Shape</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['round', 'square'] as const).map((shape) => (
                  <TouchableOpacity
                    key={shape}
                    style={[
                      styles.optionChip,
                      { minWidth: 100, alignItems: 'center' },
                      selectedShape === shape && styles.optionChipActive,
                    ]}
                    onPress={() => {
                      setSelectedShape(shape);
                      // Square + multi-tier not supported in Phase 2a → force 1 tier
                      if (shape === 'square') {
                        setTierCount(1);
                        setActiveTierIndex(0);
                      }
                      const first = cakeSizes.find(s => s.shape === shape && s.is_active);
                      if (first) setSelectedSize(first.id);
                    }}
                  >
                    <Text style={[
                      styles.optionChipText,
                      selectedShape === shape && styles.optionChipTextActive,
                    ]}>
                      {shape === 'round' ? 'Round' : 'Square'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Tier count selector (Round only) ── */}
            {selectedShape === 'round' && (
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Cake Tiers</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.optionChip,
                        { minWidth: 80, alignItems: 'center' },
                        tierCount === n && styles.optionChipActive,
                      ]}
                      onPress={() => {
                        setTierCount(n);
                        setActiveTierIndex(n - 1);   // default to top tier
                      }}
                    >
                      <Text style={[
                        styles.optionChipText,
                        tierCount === n && styles.optionChipTextActive,
                      ]}>
                        {n} {n === 1 ? 'tier' : 'tiers'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Active tier selector (only when tierCount > 1) ── */}
            {tierCount > 1 && (
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Decorating Tier</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {Array.from({ length: tierCount }, (_, i) => i).reverse().map((idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.optionChip,
                        { minWidth: 90, alignItems: 'center' },
                        activeTierIndex === idx && styles.optionChipActive,
                      ]}
                      onPress={() => setActiveTierIndex(idx)}
                    >
                      <Text style={[
                        styles.optionChipText,
                        activeTierIndex === idx && styles.optionChipTextActive,
                      ]}>
                        Tier {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Size</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {visibleSizes.map(size => (
                  <TouchableOpacity
                    key={size.id}
                    style={[
                      styles.optionChip,
                      selectedSize === size.id && styles.optionChipActive,
                    ]}
                    onPress={() => setSelectedSize(size.id)}
                  >
                    <Text style={[
                      styles.optionChipText,
                      selectedSize === size.id && styles.optionChipTextActive,
                    ]}>
                      {size.size_name}
                    </Text>
                    <Text style={[
                      styles.optionChipSub,
                      selectedSize === size.id && { color: SOFT_WHITE },
                    ]}>
                      +₱{parseFloat(String(size.price_modifier)) || 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Cake Flavor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cakeFlavors.map(flavor => (
                  <TouchableOpacity
                    key={flavor.id}
                    style={[
                      styles.optionChip,
                      selectedFlavor === flavor.id && styles.optionChipActive,
                    ]}
                    onPress={() => setSelectedFlavor(flavor.id)}
                  >
                    <Text style={[
                      styles.optionChipText,
                      selectedFlavor === flavor.id && styles.optionChipTextActive,
                    ]}>
                      {flavor.flavor_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Frosting Flavor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Vanilla, Chocolate"
                value={frostingFlavor}
                onChangeText={setFrostingFlavor}
                placeholderTextColor={MUTED_GRAY}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Quantity</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="remove" size={20} color={SAGE} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="add" size={20} color={SAGE} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Special Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special requests..."
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={3}
                placeholderTextColor={MUTED_GRAY}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.summaryButton}
            onPress={() => setShowSummary(true)}
          >
            <LinearGradient
              colors={[SAGE, SAGE_DARK]}
              style={styles.summaryButtonGrad}
            >
              <Text style={styles.summaryButtonText}>Review Order</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Summary Modal ── */}
        <Modal visible={showSummary} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Order Summary</Text>

              <ScrollView style={styles.modalBody}>
                {/* Summary canvas */}
                <View style={styles.summaryCanvasWrapper}>
                  <View
                    ref={summaryCanvasRef}
                    style={styles.summaryCanvas}
                    onLayout={onSummaryLayout}
                  >
                    <SvgXml xml={baseCakeXml} width="100%" height="100%" />

                  {Array.isArray(placedDecorations) && placedDecorations
                    .filter((dec) => !isIcing(dec.element))
                    .map((dec) => {
                    const scaledX = dec.x * summaryScale;
                      const scaledY = dec.y * summaryScale;
                      const baseSize = 40 * (dec.scale ?? 1);
                      const scaledSize = baseSize * summaryScale;
                      return (
                        <View
                          key={dec.id}
                          style={[
                            styles.summaryDecoration,
                            {
                              left: scaledX - scaledSize / 2,
                              top: scaledY - scaledSize / 2,
                              width: scaledSize,
                              height: scaledSize,
                            },
                          ]}
                        >
                          <SvgDecoration
                            svgSource={dec.element.svg_source}
                            imageUrl={getDecorationSource(dec.element.element_name, dec.element.image_url)}
                            size={scaledSize}
                            color={dec.color}
                            colors={dec.colors}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Summary details */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Size</Text>
                  <Text style={styles.summaryValue}>
                    {cakeSizes.find(s => s.id === selectedSize)?.size_name || '—'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Flavor</Text>
                  <Text style={styles.summaryValue}>
                    {cakeFlavors.find(f => f.id === selectedFlavor)?.flavor_name || '—'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Frosting</Text>
                  <Text style={styles.summaryValue}>{frostingFlavor || '—'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quantity</Text>
                  <Text style={styles.summaryValue}>{quantity}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Decorations</Text>
                  <Text style={styles.summaryValue}>
                    {Array.isArray(placedDecorations) ? placedDecorations.length : 0}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>₱{calculateTotal().toFixed(2)}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowSummary(false)}
                >
                  <Text style={styles.modalBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleConfirmOrder}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnTextConfirm}>Confirm Order</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Pickup Schedule Modal (inside cake customization) ─── */}
        <Modal visible={showPickupModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.pickupModal}>
              <View style={styles.modalHandle} />

              <View style={styles.pickupHeader}>
                <Text style={styles.pickupTitle}>Set Pickup Schedule</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowPickupModal(false);
                    setCustomCakeDraft(null);
                  }}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={18} color={SOFT_WHITE} />
                </TouchableOpacity>
              </View>

              {customCakeDraft && (
                <ScrollView style={styles.pickupBody} showsVerticalScrollIndicator={false}>
                  {/* Custom cake summary */}
                  <View style={styles.pickupItemCard}>
                    <View
                      style={[
                        styles.pickupItemImage,
                        { position: 'relative', overflow: 'hidden', backgroundColor: CREAM },
                      ]}
                    >
                      {/* Base cake — shape-aware */}
                      <SvgXml xml={baseCakeXml} width="100%" height="100%" />

                      {/* Icing + decorations — reused from renderCanvas, scaled to 80px */}
                      {placedDecorations.filter((d) => !isIcing(d.element)).map((dec) => {
                        const previewScale = 80 / CANVAS_SIZE;
                        const decSize = 40 * (dec.scale ?? 1) * previewScale;
                        const x = dec.x * previewScale;
                        const y = dec.y * previewScale;

                        return (
                          <View
                            key={dec.id}
                            style={{
                              position: 'absolute',
                              left: x - decSize / 2,
                              top: y - decSize / 2,
                              width: decSize,
                              height: decSize,
                            }}
                            pointerEvents="none"
                          >
                            <SvgDecoration
                              svgSource={dec.element.svg_source}
                              imageUrl={getDecorationSource(dec.element.element_name, dec.element.image_url)}
                              size={decSize}
                              color={dec.color}
                              colors={dec.colors}
                            />
                          </View>
                        );
                      })}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.pickupItemName}>Custom Cake</Text>
                      <View style={styles.pickupItemDetails}>
                        <Text style={styles.pickupItemDetail}>Size: {customCakeDraft.sizeName}</Text>
                        {customCakeDraft.flavorName && (
                          <Text style={styles.pickupItemDetail}>Flavor: {customCakeDraft.flavorName}</Text>
                        )}
                        {customCakeDraft.frostingFlavor && (
                          <Text style={styles.pickupItemDetail}>Frosting: {customCakeDraft.frostingFlavor}</Text>
                        )}
                        <Text style={styles.pickupItemDetail}>Qty: {customCakeDraft.quantity}</Text>
                        {customCakeDraft.specialInstructions && (
                          <Text style={[styles.pickupItemDetail, { fontStyle: 'italic' }]}>
                            Instructions: {customCakeDraft.specialInstructions}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.pickupItemTotal}>
                        Total: ₱{formatMoney(customCakeDraft.totalPrice)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pickupDivider} />

                  <Text style={styles.scheduleLabel}>PICKUP SCHEDULE</Text>

                  {/* Date Picker */}
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.schedulePill}
                  >
                    <View style={styles.schedulePillLeft}>
                      <Ionicons name="calendar-outline" size={16} color={SAGE} />
                      <Text style={styles.schedulePillLabel}>Date</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.schedulePillValue}>{pickupDate.toDateString()}</Text>
                      <Ionicons name="chevron-forward" size={14} color={MUTED_GRAY} />
                    </View>
                  </TouchableOpacity>

                  <TextInput
                    placeholder="Special instructions (optional)"
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    multiline
                    placeholderTextColor={MUTED_GRAY}
                    style={styles.notesInput}
                  />

                  <TouchableOpacity
                    onPress={placeCustomOrder}
                    disabled={placingOrder}
                    activeOpacity={0.88}
                    style={[styles.placeOrderBtn, placingOrder && { opacity: 0.7 }]}
                  >
                    <LinearGradient
                      colors={[SAGE, SAGE_DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.placeOrderGrad}
                    >
                      {placingOrder ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.placeOrderText}>Place Order</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
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
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setPickupDate(selectedDate);
                Alert.alert('Date updated', `New pickup date: ${selectedDate.toDateString()}`);
              }
            }}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SOFT_WHITE,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  canvasContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SAGE,
    overflow: 'hidden',
    position: 'relative',
  },
  cakeBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  placedDecoration: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placedImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  placedPlaceholder: {
    width: 30,
    height: 30,
    backgroundColor: MUTED_GRAY,
    borderRadius: 15,
  },
  removeDecorationBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  canvasHint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    color: MUTED_GRAY,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
  ghost: {
    position: 'absolute',
    width: 50,
    height: 50,
    zIndex: 999,
  },
  ghostImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  librarySection: {
    marginBottom: 16,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryContainer: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.3)',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED_GRAY,
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  libraryList: {
    paddingVertical: 8,
  },
  libraryItem: {
    width: 70,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    padding: 4,
  },
  libraryImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  libraryImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryItemName: {
    fontSize: 10,
    color: SAGE,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyLibrary: {
    padding: 20,
    alignItems: 'center',
  },
  emptyLibraryText: {
    color: MUTED_GRAY,
    fontSize: 13,
  },
  optionsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SAGE,
    marginBottom: 12,
  },
  optionRow: {
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SAGE,
    marginBottom: 6,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.3)',
    backgroundColor: '#FAFAFA',
    marginRight: 8,
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED_GRAY,
  },
  optionChipTextActive: {
    color: '#fff',
  },
  optionChipSub: {
    fontSize: 10,
    color: MUTED_GRAY,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.3)',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: SAGE,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79,95,82,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SAGE,
    minWidth: 30,
    textAlign: 'center',
  },
  summaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryButtonGrad: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  summaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,28,22,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(166,162,154,0.3)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SAGE,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBody: {
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  summaryCanvasWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryCanvas: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 300,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.3)',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#fff',
  },
  summaryCakeBg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  summaryDecoration: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDecImage: {
    resizeMode: 'contain',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242,237,228,0.8)',
  },
  summaryLabel: {
    fontSize: 14,
    color: MUTED_GRAY,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(166,162,154,0.2)',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: SAGE,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: SAGE,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: CREAM,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: CREAM,
  },
  modalBtnConfirm: {
    backgroundColor: SAGE,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED_GRAY,
  },
  modalBtnTextConfirm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Pickup modal styles
  pickupModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 12,
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242,237,228,0.8)',
  },
  pickupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SAGE,
  },
  pickupBody: {
    padding: 20,
  },
  pickupItemCard: {
    flexDirection: 'row',
    backgroundColor: CREAM,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  pickupItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickupItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: SAGE,
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
    fontWeight: '700',
    color: SAGE,
    marginTop: 6,
  },
  pickupDivider: {
    height: 1,
    backgroundColor: 'rgba(166,162,154,0.2)',
    marginVertical: 12,
  },
  scheduleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED_GRAY,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CREAM,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(166,162,154,0.2)',
  },
  schedulePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schedulePillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SAGE,
  },
  schedulePillValue: {
    fontSize: 13,
    color: SAGE,
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(166,162,154,0.25)',
    padding: 12,
    minHeight: 70,
    fontSize: 13,
    color: SAGE,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  placeOrderBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  placeOrderGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});