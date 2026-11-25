// src/components/Cake3DPreview.jsx
import React, { useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Helper functions (copied from your backend logic)
const getIcingPosition = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('side')) return 'side';
  return 'top';
};
const getIcingColorFromName = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('chocolate')) return '#4E342E';
  if (n.includes('strawberry') || n.includes('pink')) return '#F4A6B8';
  if (n.includes('vanilla') || n.includes('cream')) return '#FFF8E7';
  return '#F2EDE4';
};

// --- PIPING COMPONENT ---
const Piping = ({ shape, radius, yPos }) => {
  const meshRef = useRef();
  const dummy = new THREE.Object3D();

  const positions = useMemo(() => {
    const spacing = 0.12;
    const points = [];
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

  React.useLayoutEffect(() => {
    if (meshRef.current && positions.length > 0) {
      positions.forEach((pos, i) => {
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.scale.set(1, 1.2, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
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
const Decoration3D = ({ position, rotation, dec }) => {
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
        <mesh position={[0.05, 0.15, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
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
      </group>
    );
  }

  // Default fallback
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
const Cake3D = ({ shape, tierCount, sizeInches, tierFrostings, placedDecorations }) => {
  const groupRef = useRef();
  const { camera } = useThree();

  const baseRadius = sizeInches / 8;
  const tierHeight = 1.2;
  const tierGap = 0.1;
  const totalHeight = (tierCount * tierHeight) + ((tierCount - 1) * tierGap);

  // Static camera positioning (matches mobile)
  React.useLayoutEffect(() => {
    const dynamicZoom = (10 / 6.5) * (baseRadius * 2.5);
    const targetY = (totalHeight / 2) - 0.3;
    const targetZ = baseRadius + dynamicZoom;
    
    camera.position.y = targetY;
    camera.position.z = targetZ;
    camera.lookAt(0, totalHeight / 2, 0);
  }, [camera, totalHeight, baseRadius]);

  const tiers = Array.from({ length: tierCount }).map((_, index) => {
    const tierIndex = tierCount - 1 - index;
    const scaleFactor = 1 - (index * 0.25);
    const currentRadius = baseRadius * scaleFactor;
    const yPosition = (index * (tierHeight + tierGap)) + (tierHeight / 2) + 0.05;

    const frosting = tierFrostings[tierIndex] || {};
    const sideColor = frosting.side || '#F2EDE4';
    const topColor = frosting.top;

    const sideMaterial = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.8 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: topColor || '#F2EDE4', roughness: topColor ? 0.6 : 0.8 });
    const bottomMaterial = new THREE.MeshStandardMaterial({ color: '#F2EDE4', roughness: 0.8 });

    const tierDecorations = (placedDecorations || []).filter((d) => (d.tier_index ?? 0) === tierIndex);

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

        {tierDecorations.map((dec, i) => {
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
              rotation={[0, (dec.isTopPlacement ? 0 : (dec.x / 400) * Math.PI * 2) + (dec.rotation || 0) * Math.PI / 180, 0]}
              dec={dec}
            />
          );
        })}
      </group>
    );
  });

  return (
    <group ref={groupRef} rotation={[0.75, Math.PI / 4, 0]}>
      {/* Cake Board */}
      <group position={[0, -0.1, 0]}>
        <mesh receiveShadow castShadow>
          {shape === 'round' ? <cylinderGeometry args={[baseRadius + 0.2, baseRadius + 0.2, 0.06, 64]} /> : <boxGeometry args={[baseRadius * 2 + 0.4, 0.06, baseRadius * 2 + 0.4]} />}
          <meshStandardMaterial color="#DBC1A1" roughness={0.5} />
        </mesh>
      </group>
      <group>{tiers}</group>
    </group>
  );
};

// --- EXPORTED WRAPPER ---
export default function Cake3DPreview({ designData, size = 200 }) {
  const shape = designData?.cake_size?.shape || 'round';
  const sizeInches = designData?.cake_size?.size_inches || 8;
  const tierCount = designData?.tiers || 1;
  const placedDecorations = designData?.decorations_with_elements || [];

  const tierFrostings = useMemo(() => {
    const map = {};
    placedDecorations.forEach((dec) => {
      if ((dec.element_type || '').toLowerCase() !== 'icing') return;
      const tierIdx = dec.tier_index ?? 0;
      const pos = getIcingPosition(dec.element_name || '');
      const color = getIcingColorFromName(dec.element_name || '');
      if (!map[tierIdx]) map[tierIdx] = {};
      map[tierIdx][pos] = color;
    });
    return map;
  }, [placedDecorations]);

  return (
    <div style={{ width: size, height: size, overflow: 'hidden', borderRadius: 8, backgroundColor: '#F9F9F9', pointerEvents: 'none' }}>
      <Canvas>
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
          />
        </Suspense>
      </Canvas>
    </div>
  );
}