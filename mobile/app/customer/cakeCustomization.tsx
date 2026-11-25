// mobile/app/customer/cakeCustomization.tsx


import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';

import { Image as RNImage } from 'react-native';


// import { captureRef } from 'react-native-view-shot';
import { SvgUri } from 'react-native-svg';

// import { PanResponder } from 'react-native'; // Ensure this is added to your react-native imports

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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
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
import * as ImagePicker from 'expo-image-picker';


// Polyfill for React Three Fiber on React Native
if (typeof window !== 'undefined') {
  const perf = window.performance || ({} as any);
  
  if (!perf.clearMeasures) {
    perf.clearMeasures = () => {};
  }
  if (!perf.mark) {
    perf.mark = () => ({} as any);
  }
  if (!perf.measure) {
    perf.measure = () => ({} as any);
  }
  
  window.performance = perf as any;
}


if (typeof window !== 'undefined') {
  const perf = window.performance || ({} as any);
  if (!perf.clearMeasures) perf.clearMeasures = () => {};
  if (!perf.mark) perf.mark = () => ({} as any);
  if (!perf.measure) perf.measure = () => ({} as any);
  window.performance = perf as any;
}



// Polyfill for DOMParser in React Native to support THREE.SVGLoader
if (typeof global.DOMParser === 'undefined') {
  global.DOMParser = class {
    parseFromString(str: string) {
      return {
        documentElement: {
          nodeName: 'svg',
          getAttribute: () => null,
          childNodes: [],
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementsByTagName: () => [],
      };
    }
  } as any;
}


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

// const getDecorationSource = (elementName?: string, imageUrl?: string) => {
//   const key = elementName?.toLowerCase().replace(/\s/g, '') || '';
//   if (DECORATION_IMAGES[key]) return DECORATION_IMAGES[key];
//   if (imageUrl && imageUrl.startsWith('http')) return { uri: imageUrl };
//   return null;   // No wrong fallbacks — let SvgDecoration handle it
// };


// const API_BASE_URL = "https://thisnorth-production-backend.up.railway.app";

// const API_BASE_URL = "http://10.90.129.170:8000";   // ← change from Railway

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL 
  || "https://thisnorth-production-backend.up.railway.app";

const resolveUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // If already a full URL, trust it as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path — prepend the API host
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};


// const resolveUrl = (url: string | null | undefined) => {
//   if (!url) return url;
//   if (url.startsWith('http')) return url;
//   return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
// };



const getDecorationSource = (elementName?: string, imageUrl?: string) => {
  const key = elementName?.toLowerCase().replace(/\s/g, '') || '';
  if (DECORATION_IMAGES[key]) return DECORATION_IMAGES[key];
  
  if (imageUrl) {
    if (imageUrl.startsWith('http')) return { uri: imageUrl };
    // Prepend the Railway URL for relative paths
    const separator = imageUrl.startsWith("/") ? "" : "/";
    return { uri: `${API_BASE_URL}${separator}${imageUrl}` };
  }
  
  return null;   
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
  scale?: number;
  rotation?: number;   // ← ADD (degrees, 0..360)
  color?: string | null;
  colors?: Record<string, string>;
  tierIndex?: number;
  isTopPlacement?: boolean;
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


// --- OPTIMIZED PIPING COMPONENT (Instanced for 60fps) ---
const Piping = ({ shape, radius, yPos }: { shape: string, radius: number, yPos: number }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  const positions = useMemo(() => {
    const beadRadius = 0.08;
    const spacing = 0.12;
    const points: [number, number, number][] = [];

    if (shape === 'round') {
      const circumference = 2 * Math.PI * radius;
      const count = Math.floor(circumference / spacing);
      const angleStep = (Math.PI * 2) / count;
      for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        points.push([Math.cos(angle) * radius, yPos, Math.sin(angle) * radius]);
      }
    } else {
      // Square logic
      const sideLength = radius * 2;
      const countPerSide = Math.floor(sideLength / spacing);
      const actualSpacing = sideLength / countPerSide;

      
      // Top edge
      for (let i = 0; i <= countPerSide; i++) points.push([-radius + i * actualSpacing, yPos, -radius]);
      // Right edge
      for (let i = 1; i <= countPerSide; i++) points.push([radius, yPos, -radius + i * actualSpacing]);
      // Bottom edge
      for (let i = 1; i <= countPerSide; i++) points.push([radius - i * actualSpacing, yPos, radius]);
      // Left edge
      for (let i = 1; i < countPerSide; i++) points.push([-radius, yPos, radius - i * actualSpacing]);
    }
    return points;
  }, [shape, radius, yPos]);

  useEffect(() => {
    if (meshRef.current && positions.length > 0) {
      positions.forEach((pos, i) => {
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.scale.set(1, 1.2, 1); // Slightly stretch the spheres vertically
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]} raycast={() => null}>
      {/* Reduced geometry segments from 16x16 to 8x8 for peak mobile performance */}
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#FFF8E7" roughness={0.4} />
    </instancedMesh>
  );
};


  // --- DRAG AND DROP STATE ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragImage, setDragImage] = useState<any>(null);
  const [draggedElement, setDraggedElement] = useState<any>(null);

  //REFERENCE PHOTO
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);


  // This function handles the math when you let go of the finger
  const executeDrop = (x: number, y: number, element: any) => {
    // We will use the camera projection to find where (x, y) hit the cake
    // (This is handled by the onClick event in the 3D scene)
    setDraggedElement(element);
    setDragPos({ x, y });
    setIsDragging(false);
  };

  // Function to calculate 3D position and add decoration
  const handleDropDecoration = (point: THREE.Vector3, tierIndex: number, element: any, radius: number) => {
    if (!point) return;

    const isTopFrosting = 
      element?.element_name?.toLowerCase().includes('top') || 
      element?.category?.toLowerCase().includes('top') ||
      element?.element?.element_name?.toLowerCase().includes('top') ||
      element?.element?.category?.toLowerCase().includes('top');

    const tierH = 1.2; 
    // Check if the user tapped the top of the cake
    const isTopPlacement = Math.abs(point.y - tierH / 2) < 0.05;

    let normalizedX, normalizedY;

    if (isTopFrosting) {
      normalizedX = 200; 
      normalizedY = 200;
    } else if (isTopPlacement) {
      // Map the X and Z coordinates for flat top placement
      normalizedX = ((point.x / (radius * 2)) + 0.5) * 400;
      normalizedY = ((point.z / (radius * 2)) + 0.5) * 400;
    } else {
      // Map angle and height for side placement
      const angle = Math.atan2(point.x, point.z);
      normalizedX = (angle / (Math.PI * 2)) * 400;
      if (normalizedX < 0) normalizedX += 400;
      normalizedY = ((point.y / tierH) + 0.5) * 400;
    }

    const safeElement = {
      ...element,
      element_name: element.element_name || element.element?.element_name || 'unknown',
      element_type: element.element_type || element.element?.element_type || 'unknown',
      category: element.category || element.element?.category || '',
    };

    const newDec = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      elementId: element.id,
      x: normalizedX,
      y: normalizedY,
      tierIndex: tierIndex,
      isTopPlacement: isTopPlacement || isTopFrosting, // 
      element: safeElement,
      scale: 1.5,
      rotation: 0,
    };

    setPlacedDecorations(prev => [...prev, newDec]);
    setDraggedElement(null); 
  };









// --- UPDATED 3D CAKE COMPONENT ---
const Cake3D = ({ 
  shape, tierCount, sizeInches, tierFrostings, placedDecorations,
  isAutoRotating, rotationX, rotationY, zoomLevel, viewMode, activeTab, activeDraggedElement, onDropDecoration, 
  selectedDecorationId, 
  onSelectDecoration, 
  onRemoveDecoration
}: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const interactiveGroupRef = useRef<THREE.Group>(null); 
  const { camera, scene } = useThree(); 


  useEffect(() => {
    (global as any).cakeCamera = camera;
    (global as any).cakeScene = scene;
    if (interactiveGroupRef.current) {
      (global as any).cakeGroup = interactiveGroupRef.current;
    }
  }, [camera, scene, tierCount]); 


  const baseRadius = sizeInches / 8; 
  const tierHeight = 1.2; 
  const tierGap = 0.1;
  const totalHeight = (tierCount * tierHeight) + ((tierCount - 1) * tierGap);


  

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    
    // 1. Handle Y-axis rotation (auto-spin) regardless of view mode
    if (isAutoRotating) {
      groupRef.current.rotation.y += delta * 0.5; 
      rotationY.value = groupRef.current.rotation.y;
    } else {
      groupRef.current.rotation.y = rotationY.value;
    }

    // 2. Handle X-axis tilt based on view mode
    if (viewMode === 'top') {
      // Force flat in top view to avoid distortion
      groupRef.current.rotation.x = 0; 
      rotationX.value = 0;
    } else {
      if (isAutoRotating) {
        groupRef.current.rotation.x = 0.70; // Your preferred angle
        rotationX.value = 0.70;
      } else {
        groupRef.current.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotationX.value));
      }
    }

    // 3. Camera positioning
    const cakeWidth = baseRadius * 2;
    const dynamicZoom = (zoomLevel / 6.5) * (baseRadius * 2.5); 

    const targetY = viewMode === 'top' 
      ? totalHeight + (dynamicZoom * 0.8) 
      : (totalHeight / 2) - 0.3; 
      
    const targetZ = viewMode === 'top' 
      ? 0.1 
      : baseRadius + dynamicZoom; 

    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);
    camera.lookAt(0, totalHeight / 2, 0);
  });

  const tiers = Array.from({ length: tierCount }).map((_, index) => {
    const tierIndex = tierCount - 1 - index; 
    const scaleFactor = 1 - (index * 0.25); 
    const currentRadius = baseRadius * scaleFactor;
    const boardHeight = 0.1;
    const yPosition = (index * (tierHeight + tierGap)) + (tierHeight / 2) + (boardHeight / 2);

    // 1. Get the frosting colors from state
    const frosting = tierFrostings[tierIndex] || {};
    
    // 2. Side color only falls back to default cream
    const sideColor = frosting.side || '#F2EDE4'; 
    
    // 3. Top color ONLY exists if a Top Frosting was explicitly selected
    const topColor = frosting.top;

    // CREATE MATERIALS FOR THE CYLINDER
    // Three.js cylinderGeometry accepts an array of 3 materials: [Side, Top, Bottom]
    const sideMaterial = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.8 });
    // The top material is ONLY the topColor if a top frosting is selected, otherwise it stays cream
    const topMaterial = new THREE.MeshStandardMaterial({ 
      color: topColor || '#F2EDE4', 
      roughness: topColor ? 0.6 : 0.8 
    });
    const bottomMaterial = new THREE.MeshStandardMaterial({ color: '#F2EDE4', roughness: 0.8 });

    // Filter decorations for this tier
    const tierDecorations = (placedDecorations || []).filter((d: any) => 
      (d.tierIndex ?? 0) === tierIndex
    );

    return (
      <group key={index} position={[0, yPosition, 0]}>
        
        {/* 
          IF ROUND CAKE: Use the Cylinder with 3 materials 
          (Side, Top, Bottom) because it works perfectly.
        */}
        {shape === 'round' && (
        <mesh 
          castShadow 
          receiveShadow
          userData={{ isCakeBody: true, tierIndex: tierIndex, radius: currentRadius }} 
          onClick={(e) => {
            if (activeTab === 'decorate' && activeDraggedElement) {
              e.stopPropagation(); 
              if (groupRef.current) {
                const localPoint = groupRef.current.worldToLocal(e.point.clone());
                localPoint.y -= yPosition;
                onDropDecoration(localPoint, tierIndex, activeDraggedElement, currentRadius);
              }
            }
          }}
        >
          <cylinderGeometry args={[currentRadius, currentRadius, tierHeight, 64]} />
          <primitive object={sideMaterial} attach="material-0" />
          <primitive object={topMaterial} attach="material-1" />
          <primitive object={bottomMaterial} attach="material-2" />
        </mesh>
        )}

        {/* 
          IF SQUARE CAKE: Build it using 4 separate walls + 1 top plane.
        */}
        {shape === 'square' && (
          <group>
            {/* Front */}
            <mesh position={[0, 0, currentRadius]} castShadow receiveShadow
              userData={{ isCakeBody: true, tierIndex: tierIndex, radius: currentRadius }} 
              onClick={(e) => { 
                if (activeTab === 'decorate' && activeDraggedElement) { 
                  e.stopPropagation(); 
                  if (groupRef.current) {
                    const localPoint = groupRef.current.worldToLocal(e.point.clone());
                    localPoint.y -= yPosition;
                    onDropDecoration(localPoint, tierIndex, activeDraggedElement, currentRadius); 
                  }
                } 
              }}
            >
              <planeGeometry args={[currentRadius * 2, tierHeight]} />
              <meshStandardMaterial color={sideColor} roughness={0.8} />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0, -currentRadius]} rotation={[0, Math.PI, 0]} castShadow receiveShadow
              userData={{ isCakeBody: true, tierIndex: tierIndex }}
              onClick={(e) => { 
                if (activeTab === 'decorate' && activeDraggedElement) { 
                  e.stopPropagation(); 
                  if (groupRef.current) {
                    const localPoint = groupRef.current.worldToLocal(e.point.clone());
                    localPoint.y -= yPosition;
                    onDropDecoration(localPoint, tierIndex, activeDraggedElement, currentRadius); 
                  }
                } 
              }}
            >
              <planeGeometry args={[currentRadius * 2, tierHeight]} />
              <meshStandardMaterial color={sideColor} roughness={0.8} />
            </mesh>
            {/* Left */}
            <mesh position={[-currentRadius, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow
              userData={{ isCakeBody: true, tierIndex: tierIndex }}
              onClick={(e) => { 
                if (activeTab === 'decorate' && activeDraggedElement) { 
                  e.stopPropagation(); 
                  if (groupRef.current) {
                    const localPoint = groupRef.current.worldToLocal(e.point.clone());
                    localPoint.y -= yPosition;
                    onDropDecoration(localPoint, tierIndex, activeDraggedElement, currentRadius); 
                  }
                } 
              }}
            >
              <planeGeometry args={[currentRadius * 2, tierHeight]} />
              <meshStandardMaterial color={sideColor} roughness={0.8} />
            </mesh>
            {/* Right */}
            <mesh position={[currentRadius, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow
            userData={{ isCakeBody: true, tierIndex: tierIndex }}
              onClick={(e) => { 
                if (activeTab === 'decorate' && activeDraggedElement) { 
                  e.stopPropagation(); 
                  if (groupRef.current) {
                    const localPoint = groupRef.current.worldToLocal(e.point.clone());
                    localPoint.y -= yPosition;
                    onDropDecoration(localPoint, tierIndex, activeDraggedElement, currentRadius); 
                  }
                } 
              }}
            >
              <planeGeometry args={[currentRadius * 2, tierHeight]} />
              <meshStandardMaterial color={sideColor} roughness={0.8} />
            </mesh>

            {/* 2. Top Plane */}
            <mesh 
              position={[0, tierHeight / 2, 0]} 
              rotation={[-Math.PI / 2, 0, 0]} 
              receiveShadow
              userData={{ isCakeBody: true, tierIndex: tierIndex }} 
              onClick={(e) => { 
                if (activeTab === 'decorate' && activeDraggedElement) { 
                  e.stopPropagation(); 
                  if (groupRef.current) {
                    const localPoint = groupRef.current.worldToLocal(e.point.clone());
                    localPoint.y -= yPosition;
                    onDropDecoration(localPoint, tierIndex, activeDraggedElement, currentRadius); 
                  }
                } 
              }}
            >
              <planeGeometry args={[currentRadius * 2, currentRadius * 2]} />
              <meshStandardMaterial color={topColor || '#F2EDE4'} roughness={topColor ? 0.6 : 0.8} />
            </mesh>

            {/* 3. Bottom Plane (Always cream to hide the hole) */}
            <mesh 
              position={[0, -tierHeight / 2, 0]} 
              rotation={[Math.PI / 2, 0, 0]} 
              receiveShadow
            >
              <planeGeometry args={[currentRadius * 2, currentRadius * 2]} />
              <meshStandardMaterial color="#F2EDE4" roughness={0.8} />
            </mesh>
          </group>
        )}

        {/* Piping Beads (Top & Bottom of Tier) */}
        <Piping shape={shape} radius={currentRadius} yPos={tierHeight / 2} />
        <Piping shape={shape} radius={currentRadius} yPos={-tierHeight / 2} />

        {/* Individual 3D Decorations */}
        {tierDecorations.map((dec: any) => {
          let posX, posZ, localY;
          const scale = dec.scale ?? 1;
          const offset = 0.12 * scale; 

          if (dec.isTopPlacement) {
            posX = (dec.x / 400 - 0.5) * currentRadius * 2;
            posZ = (dec.y / 400 - 0.5) * currentRadius * 2;
            localY = tierHeight / 2 + 0.05;
          } else {
            const angle = (dec.x / 400) * Math.PI * 2;
            localY = ((dec.y / 400) - 0.5) * tierHeight;
            posX = Math.sin(angle) * (currentRadius + offset);
            posZ = Math.cos(angle) * (currentRadius + offset);
          }

          const isSelected = selectedDecorationId === dec.id;

          return (
            <group key={dec.id}>
              <Decoration3D
                position={[posX, localY, posZ]}
                rotation={[
                  0, 
                  // Base angle + manual rotation (converted from degrees to radians)
                  (dec.isTopPlacement ? 0 : (dec.x / 400) * Math.PI * 2) + (dec.rotation || 0) * Math.PI / 180, 
                  0
                ]}
                dec={dec}
                onSelect={onSelectDecoration}
                selectedDecorationId={selectedDecorationId}
              />

              {isSelected && (
                <ControlPanel
                  dec={dec}
                  scale={scale}
                  posX={posX}
                  localY={localY}
                  posZ={posZ}
                  rotationY={rotationY}
                  onRemoveDecoration={onRemoveDecoration}
                  onSelectDecoration={onSelectDecoration}
                  onResizeDecoration={resizeDecoration} 
                />
              )}
            </group>
          );
        })}
      </group>
    );
  });

  return (
    <group ref={groupRef}>
      {/* Two-Tiered Golden Cake Drum Board */}
      {/* Two-Tiered Golden Cake Drum Board (Reference Style) */}
      <group position={[0, -0.1, 0]}>
        {/* Bottom layer of board (Darker edge) */}
        <mesh receiveShadow castShadow>
          {shape === 'round' ? (
            <cylinderGeometry args={[baseRadius + 0.2, baseRadius + 0.2, 0.06, 64]} />
          ) : (
            <boxGeometry args={[baseRadius * 2 + 0.4, 0.06, baseRadius * 2 + 0.4]} />
          )}
          <meshStandardMaterial color="#DBC1A1" roughness={0.5} />
        </mesh>
        
        {/* Top layer of board (Lighter surface) */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          {shape === 'round' ? (
            <cylinderGeometry args={[baseRadius + 0.25, baseRadius + 0.25, 0.02, 64]} />
          ) : (
            <boxGeometry args={[baseRadius * 2 + 0.5, 0.02, baseRadius * 2 + 0.5]} />
          )}
          <meshStandardMaterial color="#E8D5B5" roughness={0.6} />
        </mesh>
      </group>

      {/* 👇 THIS IS THE NEW PART YOU NEED TO ADD 👇 */}
      <group ref={interactiveGroupRef}>
        {tiers}
      </group>
      {/* 👆 THIS IS THE NEW PART YOU NEED TO ADD 👆 */}
      
    </group>
  );
};



// --- COMPREHENSIVE 3D DECORATION COMPONENT ---
const Decoration3D = ({ 
  position, 
  rotation, 
  dec,
  onSelect,
  selectedDecorationId,
}: any) => {
  const name = (
    dec?.element?.element_name || 
    dec?.element_name || 
    dec?.element?.element_type || 
    ''
  ).toLowerCase().trim();
  
  const scale = dec.scale ?? 1;
  
  // 👇 Calculate if this decoration should be faded
  const isDimmed = selectedDecorationId !== null && selectedDecorationId !== dec.id;
  const opacity = isDimmed ? 0.5 : 1;
  const transparent = isDimmed;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onSelect) onSelect(dec.id);
  };

  // 1. FROSTINGS
  if (name.includes('frosting')) {
    return null; 
  }

  // 2. FRUITS
  if (name.includes('strawberry')) {
    const strawberryPoints = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = -0.25 + (t * 0.45); 
      let radius = 0;
      if (t < 0.7) {
        radius = Math.sin((t / 0.7) * (Math.PI / 2)) * 0.14;
      } else {
        radius = Math.cos(((t - 0.7) / 0.3) * (Math.PI / 2)) * 0.14;
      }
      if (t === 0 || t === 1) radius = 0;
      strawberryPoints.push(new THREE.Vector2(radius, y));
    }

    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <latheGeometry args={[strawberryPoints, 32]} />
          <meshStandardMaterial color="#D90429" roughness={0.4} side={THREE.DoubleSide} transparent={transparent} opacity={opacity} />
        </mesh>
        {Array.from({ length: 15 }).map((_, i) => {
          const angle = (i / 15) * Math.PI * 2;
          const yPos = -0.15 + (i % 4) * 0.08;
          const radiusAtHeight = Math.sin(((yPos + 0.25) / 0.45) * Math.PI) * 0.14;
          return (
            <mesh key={i} position={[Math.cos(angle) * (radiusAtHeight + 0.01), yPos, Math.sin(angle) * (radiusAtHeight + 0.01)]} onClick={handleClick}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#FFD700" roughness={0.5} transparent={transparent} opacity={opacity} />
            </mesh>
          );
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh key={`leaf-${i}`} position={[Math.cos(angle) * 0.05, 0.2, Math.sin(angle) * 0.05]} rotation={[0.4, angle, 0]} castShadow onClick={handleClick}>
              <coneGeometry args={[0.04, 0.1, 4]} />
              <meshStandardMaterial color="#2A9D8F" roughness={0.6} transparent={transparent} opacity={opacity} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (name.includes('cherry')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow scale={[1, 0.9, 1]} onClick={handleClick}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#9B111E" roughness={0.15} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh position={[0.04, 0.04, 0.04]} onClick={handleClick}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#FFCCCC" transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh position={[0.05, 0.15, 0]} rotation={[0, 0, -0.3]} onClick={handleClick}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color="#6B8E23" roughness={0.8} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh position={[0.1, 0.22, 0]} rotation={[0, 0, 0.5]} onClick={handleClick}>
          <sphereGeometry args={[0.02, 8, 8]} scale={[1, 0.2, 0.5]} />
          <meshStandardMaterial color="#6B8E23" roughness={0.8} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  if (name.includes('blueberry')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#2E4053" roughness={0.5} transparent={transparent} opacity={opacity} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh key={`crown-${i}`} position={[Math.cos(angle) * 0.04, 0.08, Math.sin(angle) * 0.04]} onClick={handleClick}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshStandardMaterial color="#1B263B" roughness={0.7} transparent={transparent} opacity={opacity} />
            </mesh>
          );
        })}
      </group>
    );
  }

  // 3. FLOWERS
  if (name.includes('flower')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#FFD700" roughness={0.4} transparent={transparent} opacity={opacity} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08]} rotation={[Math.PI / 2, 0, angle]} castShadow onClick={handleClick}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial color="#F5E1E8" roughness={0.6} transparent={transparent} opacity={opacity} />
            </mesh>
          );
        })}
      </group>
    );
  }

  // 4. SPRINKLES
  if (name.includes('sprinkle')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <boxGeometry args={[0.02, 0.08, 0.02]} />
          <meshStandardMaterial color="#FF4500" roughness={0.5} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // 5. CANDLES
  if (name.includes('candle')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <cylinderGeometry args={[0.03, 0.03, 0.25, 16]} />
          <meshStandardMaterial color="#4169E1" roughness={0.4} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.16, 0]} onClick={handleClick}>
          <coneGeometry args={[0.02, 0.06, 16]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFA500" emissiveIntensity={0.5} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // 6. CHOCOLATE
  if (name.includes('chocolate')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
          <meshStandardMaterial color="#4E342E" roughness={0.3} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // 7. MACARONS
  if (name.includes('macaron')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh position={[0, 0.03, 0]} castShadow onClick={handleClick}>
          <sphereGeometry args={[0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F4A6B8" roughness={0.6} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh position={[0, -0.03, 0]} rotation={[Math.PI, 0, 0]} castShadow onClick={handleClick}>
          <sphereGeometry args={[0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F4A6B8" roughness={0.6} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh castShadow onClick={handleClick}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
          <meshStandardMaterial color="#FFF8E7" roughness={0.4} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // 8. MODELING
  if (name.includes('fondant')) {
    if (name.includes('leaf')) {
      return (
        <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
          <mesh castShadow onClick={handleClick}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#8CBF7A" roughness={0.5} transparent={transparent} opacity={opacity} />
          </mesh>
        </group>
      );
    }
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#F5E1E8" roughness={0.5} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  if (name.includes('pearl') || name.includes('sugar')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
        <mesh castShadow onClick={handleClick}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.1} roughness={0.1} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // 9. DEFAULT FALLBACK
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ decId: dec.id }}>
      <mesh castShadow onClick={handleClick}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#D4A03D" roughness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>
    </group>
  );
};

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
  const [referenceImage, setReferenceImage] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- State for pickup schedule ----
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date());
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  //show decorations
  const [showDecorationDetails, setShowDecorationDetails] = useState(false);

  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(null);

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


  // --- PHASE 5: Camera & Rotation State ---
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(10);
  const [viewMode, setViewMode] = useState<'side' | 'top'>('side');
  
  // Shared values for smooth 60fps rotation
  const rotationX = useSharedValue(0.70);
  const rotationY = useSharedValue(0);
  const startRotationX = useSharedValue(0);
  const startRotationY = useSharedValue(0);
  const pinchStartZoom = useSharedValue(12);


    // 👇 ADD THE TWO LINES RIGHT HERE 👇
  // Static rotations for the Order Summary / Pickup Modals
  const summaryRotationX = useSharedValue(0.75); 
  const summaryRotationY = useSharedValue(Math.PI / 4); 


  const handleScreenTap = (x: number, y: number) => {
    if (!(global as any).cakeCamera || !(global as any).cakeGroup) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (x / CANVAS_SIZE) * 2 - 1;
    mouse.y = -(y / CANVAS_SIZE) * 2 + 1;

    raycaster.setFromCamera(mouse, (global as any).cakeCamera);
    
    const intersects = raycaster.intersectObject((global as any).cakeGroup, true);

    if (intersects.length > 0) {
      const firstHit = intersects[0];
      let obj: any = firstHit.object;

      // 1. Check if it's a specific decoration or remove button
      while (obj) {
        if (obj.userData && obj.userData.decId) {
          if (obj.userData.isRemoveBtn) {
            removeDecoration(obj.userData.decId);
            setSelectedDecorationId(null);
          } else if (obj.userData.isRotateBtn) {
            rotateDecoration(obj.userData.decId, obj.userData.delta);
          } else if (obj.userData.isResizeBtn) {
            resizeDecoration(obj.userData.decId, obj.userData.delta);
          } else {
            setSelectedDecorationId(obj.userData.decId);
          }
          return; 
        }
        obj = obj.parent;
      }

      // 2. Check if it's the cake body
      let cakeObj: any = firstHit.object;
      while (cakeObj) {
        if (cakeObj.userData && cakeObj.userData.isCakeBody) {
          const tierIdx = cakeObj.userData.tierIndex;
          const currentRadius = cakeObj.userData.radius;
          const tierH = 1.2;
          
          let tierGroup = cakeObj.parent;
          while (tierGroup && (tierGroup.position.y === undefined || tierGroup.position.y === 0)) {
            tierGroup = tierGroup.parent;
          }
          const tierY = tierGroup ? tierGroup.position.y : 0;
          
          // 👇 THE CRITICAL FIX: Convert the tap point to the cake's local space
          const cakeLocalPoint = (global as any).cakeGroup.worldToLocal(firstHit.point.clone());
          const localY = cakeLocalPoint.y - tierY;
          
          const isTopClick = Math.abs(localY - (tierH / 2)) < 0.15;

          // 3. Move the selected decoration if one is active
          if (selectedDecorationId) {
            let normalizedX, normalizedY;
            
            if (isTopClick) {
              // Use the local X and Z for accurate flat top placement
              normalizedX = ((cakeLocalPoint.x / (currentRadius * 2)) + 0.5) * 400;
              normalizedY = ((cakeLocalPoint.z / (currentRadius * 2)) + 0.5) * 400;
            } else {
              // Use the local X and Z for accurate side placement
              const angle = Math.atan2(cakeLocalPoint.x, cakeLocalPoint.z);
              normalizedX = (angle / (Math.PI * 2)) * 400;
              if (normalizedX < 0) normalizedX += 400;
              normalizedY = ((localY / tierH) + 0.5) * 400;
            }

            setPlacedDecorations(prev => prev.map(d => 
              d.id === selectedDecorationId 
                ? { ...d, x: normalizedX, y: normalizedY, tierIndex: tierIdx, isTopPlacement: isTopClick }
                : d
            ));
            return; 
          }

          // 4. Frosting selection logic
          const targetFrosting = placedDecorations.find(d => {
            if (d.tierIndex !== tierIdx) return false;
            if (d.element.element_type !== 'icing') return false;
            const cat = (d.element.category || '').toLowerCase();
            if (isTopClick && cat.includes('top')) return true;
            if (!isTopClick && cat.includes('side')) return true;
            return false;
          });

          if (targetFrosting) {
            setSelectedDecorationId(targetFrosting.id);
          } else {
            setSelectedDecorationId(null);
          }
          return;
        }
        cakeObj = cakeObj.parent;
      }
    }
    
    setSelectedDecorationId(null);
  };


  // 1. Pan Gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsAutoRotating)(false);
      startRotationX.value = rotationX.value;
      startRotationY.value = rotationY.value;
    })
    .onUpdate((event) => {
      rotationX.value = startRotationX.value + (event.translationY * 0.01);
      rotationY.value = startRotationY.value + (event.translationX * 0.01);
    });

  // 2. Pinch Gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(setIsAutoRotating)(false);
      pinchStartZoom.value = zoomLevel; 
    })
    .onUpdate((event) => {
      const newZoom = Math.max(4, Math.min(20, pinchStartZoom.value / event.scale));
      runOnJS(setZoomLevel)(newZoom);
    });

  // 3. Tap Gesture (Selection)
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      runOnJS(handleScreenTap)(event.x, event.y);
    });

  // 4. Combine them all
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);




  // Add this near your other useState variables
  const [activeTab, setActiveTab] = useState<'decorate' | 'cake' | 'flavor' | 'details'>('decorate');

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

// --- 3D ROTATE ICON COMPONENT ---
  const RotateIcon = ({ direction, color }: { direction: 'left' | 'right', color: string }) => {
    const isLeft = direction === 'left';
    
    return (
      // Mirror the entire icon horizontally for the Left button
      <group scale={[isLeft ? -1 : 1, 1, 1]}>
        
        {/* The curved arc (Gap is now at the top) */}
        <mesh rotation={[0, 0, Math.PI / 4]} renderOrder={1000} raycast={() => null}>
          <torusGeometry args={[0.03, 0.008, 8, 24, Math.PI * 1.5]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>

        {/* The triangular arrowhead (Positioned at the top-right of the arc) */}
        <mesh 
          position={[0.028, 0.028, 0]} 
          rotation={[0, 0, -Math.PI / 4]} 
          renderOrder={1000} 
          raycast={() => null}
        >
          <circleGeometry args={[0.025, 3]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>

      </group>
    );
  };


// --- CONTROL PANEL COMPONENT (Always faces camera) ---
 const ControlPanel = ({ 
    dec, scale, posX, localY, posZ, rotationY, 
    onRemoveDecoration, onSelectDecoration, onResizeDecoration
  }: any) => {
    const panelRef = useRef<THREE.Group>(null);

    useFrame(() => {
      if (panelRef.current) {
        panelRef.current.rotation.y = -rotationY.value;
      }
    });

    return (
      <group ref={panelRef} position={[posX, localY + 0.35 * scale, posZ]}>
        {/* 1. Dark Drop Shadow */}
        <mesh position={[0, -0.015, -0.01]} renderOrder={997} raycast={() => null}>
          <planeGeometry args={[0.75, 0.45]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.15} depthTest={false} />
        </mesh>

        {/* 2. Solid White Panel Background */}
        <mesh renderOrder={998} raycast={() => null}>
          <planeGeometry args={[0.7, 0.4]} />
          <meshBasicMaterial color="#ffffff" transparent={false} depthTest={false} />
        </mesh>

        {/* ROW 1: Rotate & Remove */}
        <group position={[0, 0.1, 0]}>
          {/* Left Rotate Button */}
          <mesh 
            position={[-0.22, 0, 0.01]} 
            userData={{ decId: dec.id, isRotateBtn: true, delta: -45 }}
            renderOrder={999}
          >
            <circleGeometry args={[0.08, 32]} />
            <meshBasicMaterial color="#DBEAFE" depthTest={false} />
          </mesh>
          <group position={[-0.22, 0, 0.02]}>
            <RotateIcon direction="left" color="#2563EB" />
          </group>

          {/* Remove Button */}
          <mesh 
            userData={{ decId: dec.id, isRemoveBtn: true }}
            renderOrder={999}
          >
            <circleGeometry args={[0.08, 32]} />
            <meshBasicMaterial color="#FEE2E2" depthTest={false} />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 4]} renderOrder={1000} raycast={() => null}>
            <planeGeometry args={[0.02, 0.08]} />
            <meshBasicMaterial color="#DC2626" depthTest={false} />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[0, 0, -Math.PI / 4]} renderOrder={1000} raycast={() => null}>
            <planeGeometry args={[0.02, 0.08]} />
            <meshBasicMaterial color="#DC2626" depthTest={false} />
          </mesh>

          {/* Right Rotate Button */}
          <mesh 
            position={[0.22, 0, 0.01]} 
            userData={{ decId: dec.id, isRotateBtn: true, delta: 45 }}
            renderOrder={999}
          >
            <circleGeometry args={[0.08, 32]} />
            <meshBasicMaterial color="#DBEAFE" depthTest={false} />
          </mesh>
          <group position={[0.22, 0, 0.02]}>
            <RotateIcon direction="right" color="#2563EB" />
          </group>
        </group>

        {/* ROW 2: Resize */}
        <group position={[0, -0.1, 0]}>
          {/* Scale Down (-) */}
          <mesh 
            position={[-0.1, 0, 0.01]} 
            userData={{ decId: dec.id, isResizeBtn: true, delta: -0.2 }}
            renderOrder={999}
          >
            <circleGeometry args={[0.08, 32]} />
            <meshBasicMaterial color="#E0E7FF" depthTest={false} />
          </mesh>
          <mesh position={[-0.1, 0, 0.02]} renderOrder={1000} raycast={() => null}>
            <planeGeometry args={[0.06, 0.015]} />
            <meshBasicMaterial color="#4F46E5" depthTest={false} />
          </mesh>

          {/* Scale Up (+) */}
          <mesh 
            position={[0.1, 0, 0.01]} 
            userData={{ decId: dec.id, isResizeBtn: true, delta: 0.2 }}
            renderOrder={999}
          >
            <circleGeometry args={[0.08, 32]} />
            <meshBasicMaterial color="#E0E7FF" depthTest={false} />
          </mesh>
          <mesh position={[0.1, 0, 0.02]} renderOrder={1000} raycast={() => null}>
            <planeGeometry args={[0.06, 0.015]} />
            <meshBasicMaterial color="#4F46E5" depthTest={false} />
          </mesh>
          <mesh position={[0.1, 0, 0.02]} renderOrder={1000} raycast={() => null}>
            <planeGeometry args={[0.015, 0.06]} />
            <meshBasicMaterial color="#4F46E5" depthTest={false} />
          </mesh>
        </group>

      </group>
    );
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

      // Normalize to a canonical 400×400 space so every renderer
      // (mobile customization, mobile CakePreview, web) interprets
      // the same stored coordinates the same way.
      const canonicalX = icing
        ? 0
        : (Math.max(0, Math.min(relX, width)) / width) * 400;
      const canonicalY = icing
        ? 0
        : (Math.max(0, Math.min(relY, height)) / height) * 400;

      const newDec: PlacedDecoration = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        elementId: element.id,
        x: canonicalX,
        y: canonicalY,
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
          d.elementId === element.id && d.x === canonicalX && d.y === canonicalY
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
        const canonicalX = (Math.max(0, Math.min(relX, width)) / width) * 400;
        const canonicalY = (Math.max(0, Math.min(relY, height)) / height) * 400;
        safeSetPlacedDecorations(prev =>
          prev.map(d => d.id === decId ? { ...d, x: canonicalX, y: canonicalY } : d)
        );
      }
      resetDrag();
    });
  }, [resetDrag, safeSetPlacedDecorations]);


  const rotateDecoration = useCallback((id: string, delta: number) => {
    safeSetPlacedDecorations((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, rotation: (((Number(d.rotation) || 0) + delta) % 360 + 360) % 360 }
          : d
      )
    );
  }, [safeSetPlacedDecorations]);


    const resizeDecoration = useCallback((id: string, delta: number) => {
    safeSetPlacedDecorations((prev) =>
      prev.map((d) =>
        d.id === id
          ? { 
              ...d, 
              // Clamp the size between 0.5x and 3.0x so it doesn't disappear or get huge
              scale: Math.max(0.5, Math.min(3.0, (Number(d.scale) || 1) + delta)) 
            }
          : d
      )
    );
  }, [safeSetPlacedDecorations]);

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
    const pan = Gesture.Pan()
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

    const tap = Gesture.Tap()
      .onEnd(() => {
        runOnJS(setSelectedDecorationId)(dec.id);
      });

    // Race: whichever finishes first wins.
    // Tap → select. Pan → move.
    return Gesture.Race(tap, pan);
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
      if (el.svg_source) {
        // Resolve relative URLs to the Railway backend
        const resolvedUrl = el.svg_source.startsWith('http')
          ? el.svg_source
          : `${API_BASE_URL}${el.svg_source.startsWith('/') ? '' : '/'}${el.svg_source}`;
        prefetchSvg(resolvedUrl);
      }
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



  



  const pickReferenceImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload a reference image.');
      return;
    }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],   // ← new API (was MediaTypeOptions.Images)
        allowsEditing: true,
        quality: 0.8,
      });
    if (!result.canceled) {
      const asset = result.assets[0];
      setReferenceImage({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `reference_${Date.now()}.jpg`,
      });
    }
  };

  const removeReferenceImage = () => setReferenceImage(null);


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
      // ─── Build multipart payload ───
      const formData = new FormData();
      formData.append('cake_size_id', String(sizeId));
      if (selectedFlavor) formData.append('cake_flavor_id', String(selectedFlavor));
      if (frostingFlavor) formData.append('frosting_flavor', frostingFlavor);
      formData.append('tiers', String(tierCount));
      formData.append('design_name', 'Custom Cake');
      if (specialInstructions) formData.append('special_instructions', specialInstructions);
      formData.append('total_price', String(calculateTotal()));
      formData.append('decorations', JSON.stringify(
        decorations.map(d => ({
          element_id: d.elementId,
          x: d.x,
          y: d.y,
          scale: d.scale ?? 1,
          rotation: d.rotation ?? 0,   // ← ADD
          color: d.color ?? null,
          colors: d.colors ?? null,
          tier_index: d.tierIndex ?? 0,
        }))
      ));
      if (referenceImage) {
        formData.append('reference_image', {
          uri: referenceImage.uri,
          name: referenceImage.name,
          type: referenceImage.type,
        } as any);
      }

      // ─── Submit ───
      const designRes = await axios.post('/custom-designs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const designId = designRes.data.design_id;

      // ─── Build draft (unchanged) ───
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
      // dec.x / dec.y are canonical (0..400), so scale by w/400.
      const scale = w / 400;
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


  
  // ---- Render 3D Canvas ----
  const renderCanvas = () => {
    const currentSizeObj = cakeSizes.find(s => s.id === selectedSize);
    const sizeInches = currentSizeObj?.size_inches || 8;

    return (
      <View style={styles.canvasContainer}>
        <View style={[styles.canvas, { borderWidth: 0, position: 'relative' }]}>
          
          {/* 1. The 3D Scene */}
          <Canvas>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} />
            
            <Cake3D
              shape={selectedShape}
              tierCount={tierCount}
              sizeInches={sizeInches}
              tierFrostings={tierFrostings}
              placedDecorations={placedDecorations}
              isAutoRotating={isAutoRotating}
              rotationX={rotationX} 
              rotationY={rotationY}
              zoomLevel={zoomLevel}
              viewMode={viewMode}
              activeTab={activeTab}
              activeDraggedElement={draggedElement}
              onDropDecoration={handleDropDecoration}
              selectedDecorationId={selectedDecorationId}    
              onSelectDecoration={setSelectedDecorationId}  
              onRemoveDecoration={removeDecoration} 
              onRotateDecoration={rotateDecoration}         
            />
          </Canvas>

          {/* 2. Invisible Overlay for Gestures */}
          {!draggedElement && (
            <GestureDetector gesture={composedGesture}>
              <View style={StyleSheet.absoluteFill} /> 
            </GestureDetector>
          )}

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
                  svgSource={resolveUrl(item.svg_source)} 
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
        
        {/* ── Header ── */}
        <LinearGradient colors={[SAGE, SAGE_DARK]} style={styles.header}>
          <TouchableOpacity onPress={goBackToDashboard} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={SOFT_WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Design Your Cake</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* ── 3D Canvas Area ── */}
        <View style={styles.canvasArea}>
          
          {renderCanvas()}

          {/* Floating UI Controls */}
          <View style={styles.floatingControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setZoomLevel(prev => Math.max(4, prev - 1))}>
              <Ionicons name="add" size={22} color={SAGE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setZoomLevel(prev => Math.min(20, prev + 1))}>
              <Ionicons name="remove" size={22} color={SAGE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setViewMode(prev => prev === 'side' ? 'top' : 'side')}>
              <Ionicons name="refresh-outline" size={22} color={SAGE} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: SAGE }]} onPress={() => setIsAutoRotating(!isAutoRotating)}>
              <Ionicons name={isAutoRotating ? "pause" : "play"} size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Drag & Drop Indicator */}
          {draggedElement && (
            <View style={{ 
              position: 'absolute', 
              top: 60, 
              alignSelf: 'center', 
              backgroundColor: SAGE, 
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16, 
              paddingVertical: 8, 
              borderRadius: 20,
              zIndex: 99,
              gap: 12
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                Tap cake to drop {draggedElement.element_name}
              </Text>
              <TouchableOpacity onPress={() => setDraggedElement(null)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* ── Bottom Sheet (Tab Content) ── */}
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          
          <View style={styles.sheetHeader}>
             <Text style={styles.sheetTitle}>
               {activeTab === 'decorate' && 'Add decorations'}
               {activeTab === 'cake' && 'Shape, tiers & size'}
               {activeTab === 'flavor' && 'Flavors'}
               {activeTab === 'details' && 'Order details'}
             </Text>
             <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setActiveTab('decorate')}>
               <Ionicons name="close" size={20} color={MUTED_GRAY} />
             </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            
            {/* ── TAB 1: DECORATE ── */}
            {activeTab === 'decorate' && (
              <View>
                {/* Decor Category Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Decor Items Grid */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(elements[selectedCategory || ''] || []).map(item => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={styles.decorCard}
                      onPress={() => {
                        // 1. Stop the camera from spinning
                        setIsAutoRotating(false);
                        // 2. Enter drop mode
                        setDraggedElement(item);
                      }}
                    >
                      <View style={styles.decorImgWrap}>
                        <SvgDecoration 
                          svgSource={resolveUrl(item.svg_source)} 
                          imageUrl={getDecorationSource(item.element_name, item.image_url)}
                          size={40} 
                        />
                      </View>
                      <Text style={styles.decorName} numberOfLines={1}>{item.element_name}</Text>
                      <Text style={styles.decorPrice}>₱{item.default_price}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.hintText}>Tap to choose how many & pattern • drag onto the cake</Text>
              </View>
            )}

            {/* ── TAB 2: CAKE ── */}
            {activeTab === 'cake' && (
              <View>
                <Text style={styles.sectionLabel}>SHAPE</Text>
                <View style={styles.row}>
                  {['round', 'square'].map(s => (
                    <TouchableOpacity key={s} style={[styles.optionBtn, selectedShape === s && styles.optionBtnActive]} onPress={() => setSelectedShape(s as CakeShape)}>
                      <Ionicons name={s === 'round' ? 'ellipse-outline' : 'square-outline'} size={16} color={selectedShape === s ? '#fff' : SAGE} />
                      <Text style={[styles.optionText, selectedShape === s && styles.optionTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>TIERS</Text>
                <View style={styles.row}>
                  {[1, 2, 3].map(n => (
                    <TouchableOpacity key={n} style={[styles.optionBtn, tierCount === n && styles.optionBtnActive]} onPress={() => setTierCount(n)}>
                      <Text style={[styles.optionText, tierCount === n && styles.optionTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>SIZE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {cakeSizes.filter(s => s.shape === selectedShape).map(size => (
                    <TouchableOpacity key={size.id} style={[styles.sizeCard, selectedSize === size.id && styles.sizeCardActive]} onPress={() => setSelectedSize(size.id)}>
                      <Text style={[styles.sizeName, selectedSize === size.id && { color: '#fff' }]}>{size.size_name}</Text>
                      <Text style={[styles.sizePrice, selectedSize === size.id && { color: 'rgba(255,255,255,0.8)' }]}>+₱{size.price_modifier}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── TAB 3: FLAVOR ── */}
            {activeTab === 'flavor' && (
              <View>
                <Text style={styles.sectionLabel}>CAKE FLAVOR</Text>
                <View style={styles.wrapRow}>
                  {cakeFlavors.map(f => (
                    <TouchableOpacity key={f.id} style={[styles.pillBtn, selectedFlavor === f.id && styles.pillBtnActive]} onPress={() => setSelectedFlavor(f.id)}>
                      <Text style={[styles.pillText, selectedFlavor === f.id && styles.pillTextActive]}>{f.flavor_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.sectionLabel}>FROSTING FLAVOR</Text>
                <View style={styles.wrapRow}>
                   {/* Example static frostings, you can map your actual data here */}
                   {['Vanilla', 'Chocolate', 'Strawberry', 'Ube', 'Mocha'].map(f => (
                    <TouchableOpacity key={f} style={[styles.pillBtn, frostingFlavor === f && styles.pillBtnActive]} onPress={() => setFrostingFlavor(f)}>
                      <Text style={[styles.pillText, frostingFlavor === f && styles.pillTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── TAB 4: DETAILS ── */}
            {activeTab === 'details' && (
              <View>
                <View style={styles.rowBetween}>
                  
                  {/* --- QUANTITY SECTION (UNCHANGED) --- */}
                  <View>
                    <Text style={styles.sectionLabel}>QUANTITY</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Ionicons name="remove" size={18} color={SAGE} />
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
                        <Ionicons name="add" size={18} color={SAGE} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* --- REFERENCE PHOTO SECTION (FIXED CRASH) --- */}
                  <View>
                    <Text style={styles.sectionLabel}>REFERENCE PHOTO</Text>
                    
                    {referenceImage ? (
                      // Wrap in TouchableOpacity to trigger the full-screen view
                      <TouchableOpacity 
                        style={styles.imagePreviewWrapper} 
                        activeOpacity={0.8}
                        onPress={() => setIsImageModalVisible(true)}
                      >
                        <Image
                          source={{ 
                            uri: typeof referenceImage === 'string' ? referenceImage : referenceImage?.uri 
                          }}
                          style={styles.imagePreview}
                          resizeMode="contain"
                        />
                        
                        {/* Remove button */}
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={(e) => {
                            e.stopPropagation(); // Stops the modal from opening when clicking the X
                            setReferenceImage(null);
                          }}
                        >
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.uploadBtn} onPress={pickReferenceImage}>
                        <Ionicons name="image-outline" size={18} color={SAGE} />
                        <Text style={styles.uploadText}>Add photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                </View>

                {/* --- SPECIAL INSTRUCTIONS (UNCHANGED) --- */}
                <Text style={styles.sectionLabel}>SPECIAL INSTRUCTIONS</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Message on cake, allergies, theme..."
                  placeholderTextColor={MUTED_GRAY}
                  multiline
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                />
              </View>

            )}

          </ScrollView>
        </View>

        {/* ── FULL SCREEN IMAGE MODAL ── */}
        <Modal
          visible={isImageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsImageModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsImageModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            
            {/* Full Size Image */}
            {referenceImage && (
              <Image
                source={{ 
                  uri: typeof referenceImage === 'string' ? referenceImage : referenceImage?.uri 
                }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        {/* ── Bottom Navigation Bar ── */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('decorate')}>
            <MaterialCommunityIcons name="palette" size={22} color={activeTab === 'decorate' ? SAGE : MUTED_GRAY} />
            <Text style={[styles.navText, activeTab === 'decorate' && styles.navTextActive]}>Decorate</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('cake')}>
            <MaterialCommunityIcons name="layers" size={22} color={activeTab === 'cake' ? SAGE : MUTED_GRAY} />
            <Text style={[styles.navText, activeTab === 'cake' && styles.navTextActive]}>Cake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('flavor')}>
            <MaterialCommunityIcons name="ice-cream" size={22} color={activeTab === 'flavor' ? SAGE : MUTED_GRAY} />
            <Text style={[styles.navText, activeTab === 'flavor' && styles.navTextActive]}>Flavor</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('details')}>
            <MaterialCommunityIcons name="pencil-outline" size={22} color={activeTab === 'details' ? SAGE : MUTED_GRAY} />
            <Text style={[styles.navText, activeTab === 'details' && styles.navTextActive]}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowSummary(true)}>
            <Text style={styles.reviewPrice}>₱{calculateTotal().toFixed(2)}</Text>
            <Text style={styles.reviewText}>Review →</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* YOUR EXISTING MODALS (UNTOUCHED) ARE INSERTED BELOW            */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* ── Summary Modal ── */}
      <Modal visible={showSummary} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Order Summary</Text>

            <ScrollView style={styles.modalBody}>
              {/* Summary canvas - NOW 3D */}
              <View style={styles.summaryCanvasWrapper}>
                <View
                  style={[styles.summaryCanvas, { borderWidth: 0, backgroundColor: '#F8F5F0' }]}
                >
                  <Canvas>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 10, 5]} intensity={1.5} />
                    <directionalLight position={[-5, 5, -5]} intensity={0.5} />
                    
                    <Cake3D
                      shape={selectedShape}
                      tierCount={tierCount}
                      sizeInches={cakeSizes.find(s => s.id === selectedSize)?.size_inches || 8}
                      tierFrostings={tierFrostings}
                      placedDecorations={placedDecorations}
                      
                      // 👇 USE STATIC VALUES HERE
                      isAutoRotating={false} 
                      rotationX={summaryRotationX} 
                      rotationY={summaryRotationY}
                      zoomLevel={10} 
                      viewMode="side"

                      // 👇 FIX THE FADED DECORATIONS
                      selectedDecorationId={null} 
                      
                      activeTab={activeTab}
                      activeDraggedElement={draggedElement}
                      onDropDecoration={handleDropDecoration}
                    />
                  </Canvas>
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
              {/* 1. The clickable row with the up/down chevron */}
              <TouchableOpacity
                style={styles.summaryRow}
                onPress={() => setShowDecorationDetails(!showDecorationDetails)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.summaryLabel}>Decorations</Text>
                  <Ionicons
                    name={showDecorationDetails ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={MUTED_GRAY}
                    style={{ marginLeft: 8 }}
                  />
                </View>
                <Text style={styles.summaryValue}>{placedDecorations?.length || 0}</Text>
              </TouchableOpacity>

              {/* 2. The expandable list of decorations (UPDATED WITH PRICES) */}
              {showDecorationDetails && placedDecorations && placedDecorations.length > 0 && (
                <View style={styles.decorationListContainer}>
                  {placedDecorations.map((dec, index) => (
                    <View key={index} style={styles.decorationListItem}>
                      
                      {/* Left Side: Icon and Name */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="ellipse" size={6} color={SAGE} style={{ marginRight: 8 }} />
                        <Text style={styles.decorationItemText}>
                          {dec.element?.element_name || 'Unknown Decoration'}
                        </Text>
                      </View>

                      {/* Right Side: Price */}
                      <Text style={styles.decorationItemPrice}>
                        ₱{Number(dec.element?.default_price || 0).toFixed(2)}
                      </Text>

                    </View>
                  ))}
                </View>
              )}
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
                      { position: 'relative', overflow: 'hidden', backgroundColor: '#F8F5F0', width: 80, height: 80 },
                    ]}
                  >
                    <Canvas>
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[5, 10, 5]} intensity={1.5} />
                      <Cake3D
                        shape={selectedShape}
                        tierCount={tierCount}
                        sizeInches={cakeSizes.find(s => s.id === selectedSize)?.size_inches || 8}
                        tierFrostings={tierFrostings}
                        placedDecorations={placedDecorations}
                        
                        // 👇 USE STATIC VALUES HERE
                        isAutoRotating={false}
                        rotationX={summaryRotationX} 
                        rotationY={summaryRotationY}
                        zoomLevel={12} 
                        viewMode="side"

                        // 👇 FIX THE FADED DECORATIONS
                        selectedDecorationId={null} 

                        activeTab={activeTab}
                        activeDraggedElement={draggedElement}
                        onDropDecoration={handleDropDecoration}
                      />
                    </Canvas>
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

    </GestureHandlerRootView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  // header: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   paddingHorizontal: 16,
  //   paddingVertical: 12,
  // },
  // backBtn: {
  //   padding: 4,
  // },
  // headerTitle: {
  //   fontSize: 18,
  //   fontWeight: '700',
  //   color: SOFT_WHITE,
  // },
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
  // textArea: {
  //   height: 80,
  //   textAlignVertical: 'top',
  // },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // qtyBtn: {
  //   width: 32,
  //   height: 32,
  //   borderRadius: 16,
  //   backgroundColor: 'rgba(79,95,82,0.08)',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // qtyValue: {
  //   fontSize: 18,
  //   fontWeight: '700',
  //   color: SAGE,
  //   minWidth: 30,
  //   textAlign: 'center',
  // },
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
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F0F0', // Adjust to match your exact divider color
},
summaryLabel: {
  fontSize: 15,
  color: MUTED_GRAY,
},
summaryValue: {
  fontSize: 15,
  fontWeight: '600',
  color: SAGE,
},
decorationListContainer: {
  paddingVertical: 10,
  paddingHorizontal: 16,
  backgroundColor: '#F9F9F9', // Light background to distinguish the list
  borderRadius: 8,
  marginBottom: 10,
},
decorationListItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between', // <-- ADD THIS to push price to the right
  paddingVertical: 6,
},
decorationItemText: {
  fontSize: 14,
  color: SAGE,
  textTransform: 'capitalize',
},
// ADD THIS NEW STYLE
decorationItemPrice: {
  fontSize: 14,
  fontWeight: '600',
  color: SAGE, // Matches your theme's green
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
  // modalCloseBtn: {
  //   width: 32,
  //   height: 32,
  //   borderRadius: 10,
  //   backgroundColor: 'rgba(255,255,255,0.12)',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },

  //   uploadBtn: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   gap: 8,
  //   paddingVertical: 12,
  //   borderRadius: 12,
  //   borderWidth: 1.5,
  //   borderColor: SAGE,
  //   borderStyle: 'dashed',
  //   backgroundColor: 'rgba(79,95,82,0.04)',
  // },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: SAGE,
  },


    selectedRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4F5F52',
    borderStyle: 'dashed',
  },
  rotateBtn: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F5F52',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
    controlBtnRight: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomControls: {
    position: 'absolute',
    right: 15,
    top: '40%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  zoomBtn: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(166,162,154,0.2)',
  },

    // Replace your old canvas and options styles with these:
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: SOFT_WHITE },
  
  canvasArea: { flex: 1.2, position: 'relative' },
  peekBtn: { 
    position: 'absolute', top: 15, left: 15, 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  peekText: { fontSize: 12, fontWeight: '600', color: SAGE },
  
  floatingControls: { position: 'absolute', top: 15, right: 15, gap: 10 },
  controlBtn: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },

  bottomSheet: { 
    flex: 1, backgroundColor: '#fff', 
    borderTopLeftRadius: 30, borderTopRightRadius: 30, 
    padding: 20, marginTop: -20, 
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 10
  },
  bottomSheetHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: SAGE },
  closeSheetBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },

  // Decorate Tab
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  categoryPillActive: { backgroundColor: SAGE, borderColor: SAGE },
  categoryText: { fontSize: 13, fontWeight: '600', color: MUTED_GRAY },
  categoryTextActive: { color: '#fff' },
  decorCard: { width: 90, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', alignItems: 'center', padding: 10, marginRight: 10 },
  decorImgWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F9F9F9', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  decorName: { fontSize: 11, fontWeight: '600', color: SAGE, textAlign: 'center' },
  decorPrice: { fontSize: 11, color: MUTED_GRAY, marginTop: 2 },
  hintText: { fontSize: 11, color: MUTED_GRAY, textAlign: 'center', marginTop: 15 },

  // Cake & Flavor Tabs
  sectionLabel: { fontSize: 11, fontWeight: '700', color: SAGE, letterSpacing: 0.5, marginBottom: 8, marginTop: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  optionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#F9F9F9' },
  optionBtnActive: { backgroundColor: SAGE, borderColor: SAGE },
  optionText: { fontSize: 14, fontWeight: '600', color: MUTED_GRAY },
  optionTextActive: { color: '#fff' },
  
  sizeCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', marginRight: 10, backgroundColor: '#F9F9F9', alignItems: 'center' },
  sizeCardActive: { backgroundColor: SAGE, borderColor: SAGE },
  sizeName: { fontSize: 13, fontWeight: '700', color: SAGE },
  sizePrice: { fontSize: 11, color: MUTED_GRAY, marginTop: 4 },
  
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#F9F9F9' },
  pillBtnActive: { backgroundColor: SAGE, borderColor: SAGE },
  pillText: { fontSize: 13, fontWeight: '600', color: MUTED_GRAY },
  pillTextActive: { color: '#fff' },

  // Details Tab
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 18, fontWeight: '700', color: SAGE },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: SAGE, backgroundColor: '#F9F9F9' },
  uploadText: { fontSize: 13, fontWeight: '600', color: SAGE },
  textArea: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', marginTop: 4 },

  // Bottom Nav Bar
  bottomNav: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, 
    borderTopWidth: 1, borderTopColor: '#EEE' 
  },
  navItem: { alignItems: 'center', gap: 4, padding: 5 },
  navText: { fontSize: 10, fontWeight: '600', color: MUTED_GRAY },
  navTextActive: { color: SAGE },
  reviewBtn: { 
    backgroundColor: SAGE, paddingHorizontal: 16, paddingVertical: 10, 
    borderRadius: 20, alignItems: 'flex-end' 
  },
  reviewPrice: { fontSize: 13, fontWeight: '800', color: '#fff' },
  reviewText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },


  imagePreviewWrapper: {
  width: 120,             // Matches the width of your upload button
  height: 45,             // Matches the height of your upload button
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#A6A29A', // Or your specific border color
  backgroundColor: '#F2EDE4', // Light background so transparent images are visible
  overflow: 'hidden',
  position: 'relative',
  marginTop: 4,           // Aligns with the design
},
imagePreview: {
  width: '100%',
  height: '100%',
},
removeImageBtn: {
  position: 'absolute',
  top: 2,
  right: 2,
  backgroundColor: 'rgba(0,0,0,0.6)',
  borderRadius: 10,
  width: 20,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
},

modalBackground: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.9)', // Dark overlay
  justifyContent: 'center',
  alignItems: 'center',
},
modalCloseBtn: {
  position: 'absolute',
  top: 50,
  right: 20,
  zIndex: 10,
  padding: 10,
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: 30,
},
fullScreenImage: {
  width: '100%',
  height: '100%',
},



});