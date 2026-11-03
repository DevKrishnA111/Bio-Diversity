import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, useGLTF, useAnimations, Float } from '@react-three/drei';
import * as THREE from 'three';

const FOX_MODEL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
const EARTH_TEXTURE = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

function latLng(lat, lng, radius = 1.02) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return [-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)];
}

function EarthSphere() {
  const group = useRef();
  const material = useRef();
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(EARTH_TEXTURE, (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      setTexture(map);
    }, undefined, () => setTexture(null));
    return () => { /* texture is owned by the scene material for this view */ };
  }, []);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.035; });
  const points = useMemo(() => [
    { name: 'Western Ghats', lat: 11.5, lng: 76.5 },
    { name: 'Himalaya', lat: 29.7, lng: 82.5 },
    { name: 'Sundarbans', lat: 21.9, lng: 89.2 },
    { name: 'Indo-Burma', lat: 24.2, lng: 94.0 },
    { name: 'Andaman Islands', lat: 11.7, lng: 92.7 },
  ], []);
  return <group ref={group}>
    <mesh>
      <sphereGeometry args={[1.45, 96, 96]} />
      <meshStandardMaterial ref={material} map={texture || null} color={texture ? '#ffffff' : '#1c6957'} roughness={0.88} metalness={0.05} />
    </mesh>
    {!texture && <mesh scale={1.001}><sphereGeometry args={[1.45, 64, 64]} /><meshStandardMaterial color="#1c6957" wireframe transparent opacity={0.12} /></mesh>}
    <mesh scale={1.025}><sphereGeometry args={[1.45, 64, 64]} /><meshBasicMaterial color="#65c6a1" transparent opacity={0.055} side={THREE.BackSide} /></mesh>
    {points.map((p) => <group key={p.name} position={latLng(p.lat, p.lng, 1.465)}>
      <mesh><sphereGeometry args={[0.022, 16, 16]} /><meshBasicMaterial color="#e7c978" /></mesh>
      <mesh scale={2.6}><sphereGeometry args={[0.022, 12, 12]} /><meshBasicMaterial color="#d9e9a4" transparent opacity={0.17} /></mesh>
    </group>)}
  </group>;
}

export function GlobeCanvas() {
  return <Canvas camera={{ position: [0, 0, 4.3], fov: 38 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
    <ambientLight intensity={1.05} />
    <directionalLight position={[3, 2, 4]} intensity={2.1} color="#d8f3dc" />
    <pointLight position={[-3, -2, -2]} intensity={1.4} color="#4cba91" />
    <Stars radius={90} depth={45} count={1800} factor={2.5} saturation={0} fade speed={0.3} />
    <EarthSphere />
    <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.15} minPolarAngle={0.65} maxPolarAngle={2.45} />
  </Canvas>;
}

function Tree({ position, scale = 1, tint = '#194c3c' }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[0.07, 0.13, 1.3, 7]} /><meshStandardMaterial color="#634a35" roughness={1} /></mesh>
    <mesh position={[0, 1.55, 0]} castShadow><coneGeometry args={[0.72, 1.65, 8]} /><meshStandardMaterial color={tint} roughness={0.94} /></mesh>
    <mesh position={[0.1, 2.0, 0.05]} castShadow><coneGeometry args={[0.49, 1.25, 8]} /><meshStandardMaterial color="#28634b" roughness={0.95} /></mesh>
    <mesh position={[-0.05, 2.36, 0.02]} castShadow><coneGeometry args={[0.28, 0.85, 8]} /><meshStandardMaterial color="#3b7856" roughness={0.95} /></mesh>
  </group>;
}

function FoxModel() {
  const gltf = useGLTF(FOX_MODEL);
  const { actions, names } = useAnimations(gltf.animations, gltf.scene);
  useEffect(() => {
    const action = actions[names.includes('Survey') ? 'Survey' : names[0]];
    action?.reset().fadeIn(0.4).play();
    return () => action?.fadeOut(0.2);
  }, [actions, names]);
  return <primitive object={gltf.scene} position={[0.3, 0.05, 0.25]} rotation={[0, -0.65, 0]} scale={0.014} />;
}

class SceneErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function FallbackAnimal() {
  return <group position={[0.1, 0.25, 0.2]}>
    <mesh castShadow position={[0, 0.32, 0]}><capsuleGeometry args={[0.22, 0.55, 5, 8]} /><meshStandardMaterial color="#b8753f" roughness={0.9} /></mesh>
    <mesh castShadow position={[0.02, 0.67, 0.26]}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#c98c51" /></mesh>
    {[[-0.13, 0.1, -0.12], [0.13, 0.1, -0.12], [-0.13, 0.1, 0.16], [0.13, 0.1, 0.16]].map((p, i) => <mesh key={i} position={p}><cylinderGeometry args={[0.045, 0.05, 0.28, 8]} /><meshStandardMaterial color="#8f5834" /></mesh>)}
    <mesh position={[-0.08, 0.92, 0.21]} rotation={[0, 0, -0.4]}><coneGeometry args={[0.065, 0.2, 8]} /><meshStandardMaterial color="#b8753f" /></mesh>
    <mesh position={[0.12, 0.92, 0.21]} rotation={[0, 0, 0.4]}><coneGeometry args={[0.065, 0.2, 8]} /><meshStandardMaterial color="#b8753f" /></mesh>
  </group>;
}

function ForestContent() {
  const trees = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const angle = i * 2.399;
    const radius = 2.5 + (i % 4) * 0.52;
    return { position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], scale: 0.7 + (i % 5) * 0.13, tint: ['#173d32', '#20523c', '#2d6547', '#174a3b'][i % 4] };
  }), []);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><circleGeometry args={[8, 64]} /><meshStandardMaterial color="#173a2b" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}><ringGeometry args={[3.2, 4.6, 64]} /><meshStandardMaterial color="#31563a" roughness={1} /></mesh>
    {trees.map((tree, i) => <Tree key={i} {...tree} />)}
    {Array.from({ length: 26 }, (_, i) => <mesh key={`fern-${i}`} position={[(Math.sin(i * 7.2)) * 3.6, 0.12, Math.cos(i * 4.3) * 3.6]} rotation={[0, i * 1.8, 0]}>
      <coneGeometry args={[0.18, 0.42, 5]} /><meshStandardMaterial color={i % 2 ? '#4e8c55' : '#347448'} roughness={1} />
    </mesh>)}
    <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.07}>
      <SceneErrorBoundary fallback={<FallbackAnimal />}><Suspense fallback={<FallbackAnimal />}><FoxModel /></Suspense></SceneErrorBoundary>
    </Float>
    <fog attach="fog" args={['#0b241c', 8, 18]} />
  </>;
}

export function ForestCanvas() {
  return <Canvas shadows camera={{ position: [5.5, 4.2, 7.3], fov: 44 }} dpr={[1, 1.5]}>
    <color attach="background" args={['#0b241c']} />
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#b8d6bd', '#173322', 1.1]} />
    <directionalLight castShadow position={[4, 8, 4]} intensity={2.2} color="#f6dcaa" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[-4, 3, -2]} color="#6db58c" intensity={1.3} />
    <ForestContent />
    <OrbitControls enablePan={false} minDistance={5} maxDistance={11} minPolarAngle={0.55} maxPolarAngle={1.3} target={[0, 0.5, 0]} />
  </Canvas>;
}
