// mobile/components/Cake3DPreview.tsx
import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { getIcingPosition, getIcingColorFromName } from '@/constants/cakeBase';

// --- PIPING COMPONENT ---
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
      const sideLength = radius * 2;
      const countPerSide = Math.floor(sideLength / spacing);
      const actualSpacing = sideLength / countPerSide;
      for (let i = 0; i <= countPerSide; i++) points.push([-radius + i * actualSpacing, yPos, -radius]);
      for (let i = 1; i <= countPerSide; i++) points.push([radius, yPos, -radius + i * actualSpacing]);
      for (let i = 1; i <= countPerSide; i++) points.push([radius - i * actualSpacing, yPos, radius]);
      for (let i = 1; i < countPerSide; i++) points.push([-radius, yPos, radius - i * actualSpacing]);
    }
    return points;
  }, [shape, radius, yPos]);

  useEffect(() => {
    if (meshRef.current && positions.length > 0) {
      positions.forEach((pos, i) => {
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.scale.set(1, 1.2, 1);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]} raycast={() => null}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#FFF8E7" roughness={0.4} />
    </instancedMesh>
  );
};

// --- 3D DECORATION COMPONENT ---
const Decoration3D = ({ position, rotation, dec }: any) => {
  const name = (dec?.element?.element_name || dec?.element_name || dec?.element?.element_type || '').toLowerCase().trim();
  const scale = dec.scale ?? 1;

  if (name.includes('frosting')) return null;

  if (name.includes('strawberry')) {
    const strawberryPoints = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = -0.25 + (t * 0.45);
      let radius = 0;
      if (t < 0.7) radius = Math.sin((t / 0.7) * (Math.PI / 2)) * 0.14;
      else radius = Math.cos(((t - 0.7) / 0.3) * (Math.PI / 2)) * 0.14;
      if (t === 0 || t === 1) radius = 0;
      strawberryPoints.push(new THREE.Vector2(radius, y));
    }
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <latheGeometry args={[strawberryPoints, 32]} />
          <meshStandardMaterial color="#D90429" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 15 }).map((_, i) => {
          const angle = (i / 15) * Math.PI * 2;
          const yPos = -0.15 + (i % 4) * 0.08;
          const radiusAtHeight = Math.sin(((yPos + 0.25) / 0.45) * Math.PI) * 0.14;
          return (
            <mesh key={i} position={[Math.cos(angle) * (radiusAtHeight + 0.01), yPos, Math.sin(angle) * (radiusAtHeight + 0.01)]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#FFD700" roughness={0.5} />
            </mesh>
          );
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh key={`leaf-${i}`} position={[Math.cos(angle) * 0.05, 0.2, Math.sin(angle) * 0.05]} rotation={[0.4, angle, 0]} castShadow>
              <coneGeometry args={[0.04, 0.1, 4]} />
              <meshStandardMaterial color="#2A9D8F" roughness={0.6} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (name.includes('cherry')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow scale={[1, 0.9, 1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#9B111E" roughness={0.15} />
        </mesh>
        <mesh position={[0.04, 0.04, 0.04]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#FFCCCC" />
        </mesh>
        <mesh position={[0.05, 0.15, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color="#6B8E23" roughness={0.8} />
        </mesh>
        <mesh position={[0.1, 0.22, 0]} rotation={[0, 0, 0.5]}>
          <sphereGeometry args={[0.02, 8, 8]} scale={[1, 0.2, 0.5]} />
          <meshStandardMaterial color="#6B8E23" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (name.includes('blueberry')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#2E4053" roughness={0.5} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh key={`crown-${i}`} position={[Math.cos(angle) * 0.04, 0.08, Math.sin(angle) * 0.04]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshStandardMaterial color="#1B263B" roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (name.includes('flower')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#FFD700" roughness={0.4} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08]} rotation={[Math.PI / 2, 0, angle]} castShadow>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial color="#F5E1E8" roughness={0.6} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (name.includes('sprinkle')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <boxGeometry args={[0.02, 0.08, 0.02]} />
          <meshStandardMaterial color="#FF4500" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (name.includes('candle')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.25, 16]} />
          <meshStandardMaterial color="#4169E1" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <coneGeometry args={[0.02, 0.06, 16]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFA500" emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }

  if (name.includes('chocolate')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
          <meshStandardMaterial color="#4E342E" roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (name.includes('macaron')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F4A6B8" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.03, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F4A6B8" roughness={0.6} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
          <meshStandardMaterial color="#FFF8E7" roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (name.includes('fondant')) {
    if (name.includes('leaf')) {
      return (
        <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
          <mesh castShadow>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#8CBF7A" roughness={0.5} />
          </mesh>
        </group>
      );
    }
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#F5E1E8" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (name.includes('pearl') || name.includes('sugar')) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.1} roughness={0.1} />
        </mesh>
      </group>
    );
  }

  // Fallback
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <mesh castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#D4A03D" roughness={0.5} />
      </mesh>
    </group>
  );
};

// --- MAIN 3D CAKE COMPONENT ---
const Cake3D = ({ 
  shape, tierCount, sizeInches, tierFrostings, placedDecorations,
  isAutoRotating, rotationX, rotationY, zoomLevel, viewMode
}: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree(); 

  const baseRadius = sizeInches / 8; 
  const tierHeight = 1.2; 
  const tierGap = 0.1;
  const totalHeight = (tierCount * tierHeight) + ((tierCount - 1) * tierGap);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    
    if (isAutoRotating) {
      groupRef.current.rotation.y += delta * 0.5; 
      rotationY.value = groupRef.current.rotation.y;
    } else {
      groupRef.current.rotation.y = rotationY.value;
    }

    if (viewMode === 'top') {
      groupRef.current.rotation.x = 0; 
      rotationX.value = 0;
    } else {
      if (isAutoRotating) {
        groupRef.current.rotation.x = 0.70;
        rotationX.value = 0.70;
      } else {
        groupRef.current.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotationX.value));
      }
    }

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

    const frosting = tierFrostings[tierIndex] || {};
    const sideColor = frosting.side || '#F2EDE4'; 
    const topColor = frosting.top;

    const sideMaterial = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.8 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: topColor || '#F2EDE4', roughness: topColor ? 0.6 : 0.8 });
    const bottomMaterial = new THREE.MeshStandardMaterial({ color: '#F2EDE4', roughness: 0.8 });

    const tierDecorations = (placedDecorations || []).filter((d: any) => 
      (d.tier_index ?? d.tierIndex ?? 0) === tierIndex
    );

    return (
      <group key={index} position={[0, yPosition, 0]}>
        {shape === 'round' ? (
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[currentRadius, currentRadius, tierHeight, 64]} />
            <primitive object={sideMaterial} attach="material-0" />
            <primitive object={topMaterial} attach="material-1" />
            <primitive object={bottomMaterial} attach="material-2" />
          </mesh>
        ) : (
          <group>
            <mesh position={[0, 0, currentRadius]} castShadow receiveShadow><planeGeometry args={[currentRadius * 2, tierHeight]} /><meshStandardMaterial color={sideColor} roughness={0.8} /></mesh>
            <mesh position={[0, 0, -currentRadius]} rotation={[0, Math.PI, 0]} castShadow receiveShadow><planeGeometry args={[currentRadius * 2, tierHeight]} /><meshStandardMaterial color={sideColor} roughness={0.8} /></mesh>
            <mesh position={[-currentRadius, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow><planeGeometry args={[currentRadius * 2, tierHeight]} /><meshStandardMaterial color={sideColor} roughness={0.8} /></mesh>
            <mesh position={[currentRadius, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow><planeGeometry args={[currentRadius * 2, tierHeight]} /><meshStandardMaterial color={sideColor} roughness={0.8} /></mesh>
            <mesh position={[0, tierHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[currentRadius * 2, currentRadius * 2]} /><meshStandardMaterial color={topColor || '#F2EDE4'} roughness={topColor ? 0.6 : 0.8} /></mesh>
            <mesh position={[0, -tierHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[currentRadius * 2, currentRadius * 2]} /><meshStandardMaterial color="#F2EDE4" roughness={0.8} /></mesh>
          </group>
        )}

        <Piping shape={shape} radius={currentRadius} yPos={tierHeight / 2} />
        <Piping shape={shape} radius={currentRadius} yPos={-tierHeight / 2} />

        {tierDecorations.map((dec: any, i: number) => {
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

          return (
            <Decoration3D
              key={dec.id || i}
              position={[posX, localY, posZ]}
              rotation={[
                0, 
                (dec.isTopPlacement ? 0 : (dec.x / 400) * Math.PI * 2) + (dec.rotation || 0) * Math.PI / 180, 
                0
              ]}
              dec={dec}
            />
          );
        })}
      </group>
    );
  });

  return (
    <group ref={groupRef}>
      <group position={[0, -0.1, 0]}>
        <mesh receiveShadow castShadow>
          {shape === 'round' ? (
            <cylinderGeometry args={[baseRadius + 0.2, baseRadius + 0.2, 0.06, 64]} />
          ) : (
            <boxGeometry args={[baseRadius * 2 + 0.4, 0.06, baseRadius * 2 + 0.4]} />
          )}
          <meshStandardMaterial color="#DBC1A1" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          {shape === 'round' ? (
            <cylinderGeometry args={[baseRadius + 0.25, baseRadius + 0.25, 0.02, 64]} />
          ) : (
            <boxGeometry args={[baseRadius * 2 + 0.5, 0.02, baseRadius * 2 + 0.5]} />
          )}
          <meshStandardMaterial color="#E8D5B5" roughness={0.6} />
        </mesh>
      </group>
      <group>{tiers}</group>
    </group>
  );
};

// --- EXPORTED PREVIEW COMPONENT ---
interface Cake3DPreviewProps {
  designData: any;
  size?: number;
}

export default function Cake3DPreview({ designData, size = 50 }: Cake3DPreviewProps) {
  const shape = designData?.cake_size?.shape || 'round';
  const sizeInches = designData?.cake_size?.size_inches || 8;
  const tierCount = designData?.tiers || 1;
  const placedDecorations = designData?.decorations_with_elements || [];

  const tierFrostings = useMemo(() => {
    const map: Record<number, { side?: string; top?: string }> = {};
    placedDecorations.forEach((dec: any) => {
      if ((dec.element_type || '').toLowerCase() !== 'icing') return;
      const tierIdx = dec.tier_index ?? 0;
      const pos = getIcingPosition(dec.element_name || '');
      const color = getIcingColorFromName(dec.element_name || '');
      if (!map[tierIdx]) map[tierIdx] = {};
      map[tierIdx][pos] = color;
    });
    return map;
  }, [placedDecorations]);

  // MOCK SHARED VALUES TO MATCH THE SUMMARY MODAL ROTATIONS EXACTLY
  const rotationX = useRef({ value: 0.75 });
  const rotationY = useRef({ value: Math.PI / 4 });

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', borderRadius: 8, backgroundColor: '#F9F9F9', pointerEvents: 'none' }}>
      <Canvas style={{ flex: 1 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <Cake3D
            shape={shape}
            tierCount={tierCount}
            sizeInches={sizeInches}
            tierFrostings={tierFrostings}
            placedDecorations={placedDecorations}
            isAutoRotating={false}   // 👈 TURNS OFF THE SPINNING
            rotationX={rotationX.current}
            rotationY={rotationY.current}
            zoomLevel={10}
            viewMode="side"
          />
        </Suspense>
      </Canvas>
    </View>
  );
}