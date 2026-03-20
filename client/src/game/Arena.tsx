import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ARENA_WIDTH, FLOOR_Y, PLATFORMS, ARENA_DEPTH } from "./Physics";
import {
  getArenaTheme,
  ARENA_THEMES,
  type ArenaTheme,
  type OpenArenaPresentationTuning,
  type ContainedArenaPresentationTuning,
} from "./arenas";
import * as THREE from "three";
import { useFighting } from "../lib/stores/useFighting";

const createGradientTexture = (top: string, bottom: string) => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

type ArenaProps = {
  variant?: string;
};

const OPEN_PLATFORM_TOP_THICKNESS = 0.3;
const OPEN_PLATFORM_OCCLUSION_BLEND = 7.5;
const FIGHT_PRESENTATION_PHASES = new Set(["fighting", "round_end", "match_end"]);

const DEFAULT_OPEN_PRESENTATION_TUNING: OpenArenaPresentationTuning = {
  laneWidth: 2.1,
  laneOpacity: 0.16,
  gridOpacity: 0.1,
  backdropOpacity: 0.05,
  focusBackdropOpacity: 0.03,
  decorationCount: 2,
  decorationScale: 0.8,
  decorationOpacity: 0.18,
  pillarOpacity: 0.34,
  pillarWidthScale: 0.82,
  pillarDepthScale: 0.74,
  platformGlowOpacity: 0.09,
  undersideGlowOpacity: 0.12,
  supportOpacity: 0.24,
  supportOccludedOpacity: 0.02,
  topOpacity: 0.58,
  topOccludedOpacity: 0.12,
};

const DEFAULT_CONTAINED_PRESENTATION_TUNING: ContainedArenaPresentationTuning = {
  gridOpacity: 0.18,
  ringGlowOpacity: 0.48,
  wallOpacity: 0.34,
  wallTransmission: 0.8,
  railOpacity: 0.1,
  platformHaloOpacity: 0.12,
  spawnPadGlow: 0.2,
};

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

type PlatformOcclusionState = {
  support: number;
  top: number;
};

type OpenArenaPlatformProps = {
  platform: {
    x1: number;
    x2: number;
    z1: number;
    z2: number;
    y: number;
  };
  theme: ArenaTheme;
  tuning: OpenArenaPresentationTuning;
};

const Arena = ({ variant }: ArenaProps) => {
  const theme = getArenaTheme(variant);
  const gradientTexture = useMemo(
    () => createGradientTexture(theme.floorGradient[0], theme.floorGradient[1]),
    [theme.floorGradient],
  );
  const skylineTexture = useMemo(
    () => createGradientTexture(theme.skyGradient[0], theme.skyGradient[1]),
    [theme.skyGradient],
  );

  useEffect(() => {
    return () => {
      gradientTexture?.dispose();
      skylineTexture?.dispose();
    };
  }, [gradientTexture, skylineTexture]);

  // Render containment arena (energy shield design)
  if (theme.style === "contained") {
    return (
      <ContainmentArena
        theme={theme}
        gradientTexture={gradientTexture}
        skylineTexture={skylineTexture}
      />
    );
  }

  // Render open arena (platform-based design)
  return (
    <OpenArena
      theme={theme}
      gradientTexture={gradientTexture}
      skylineTexture={skylineTexture}
    />
  );
};

// Open Arena Component (Sunset Bloom, Aurora Flux)
const OpenArena = ({
  theme,
  gradientTexture,
  skylineTexture,
}: {
  theme: ArenaTheme;
  gradientTexture: THREE.CanvasTexture | null;
  skylineTexture: THREE.CanvasTexture | null;
}) => {
  const tuning = theme.openPresentation ?? DEFAULT_OPEN_PRESENTATION_TUNING;
  const wallHeight = ARENA_WIDTH / 3;
  const decorationCount = tuning.decorationCount;
  const decorationDepthOffsets = Array.from({ length: decorationCount }).map((_, index) => {
    const pairIndex = Math.floor(index / 2);
    const sign = index % 2 === 0 ? -1 : 1;
    return sign * (ARENA_DEPTH * (0.31 + pairIndex * 0.08));
  });
  const laneCoreWidth = Math.max(1.12, tuning.laneWidth * 0.48);

  const gridHelper = useMemo(() => {
    const helper = new THREE.GridHelper(
      ARENA_WIDTH,
      30,
      theme.colors.gridColor1,
      theme.colors.gridColor2,
    );
    (helper.material as THREE.Material).transparent = true;
    (helper.material as THREE.Material).opacity = tuning.gridOpacity;
    helper.position.y = FLOOR_Y + 0.01;
    return helper;
  }, [theme.colors.gridColor1, theme.colors.gridColor2, tuning.gridOpacity]);

  useEffect(() => {
    return () => {
      gridHelper.geometry.dispose();
    };
  }, [gridHelper]);

  return (
    <group>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        receiveShadow
      >
        <planeGeometry args={[ARENA_WIDTH, ARENA_DEPTH]} />
        <meshStandardMaterial
          map={gradientTexture ?? undefined}
          color={theme.floorGradient[1]}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      <primitive object={gridHelper} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.025, 0]}>
        <planeGeometry args={[ARENA_WIDTH * 0.88, tuning.laneWidth]} />
        <meshBasicMaterial
          color={theme.accentLeft}
          transparent
          opacity={tuning.laneOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.032, 0]}>
        <planeGeometry args={[ARENA_WIDTH * 0.78, laneCoreWidth]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={tuning.focusBackdropOpacity * 1.8}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, wallHeight * 0.42, -ARENA_WIDTH * 0.44]}>
        <planeGeometry args={[ARENA_WIDTH * 1.18, wallHeight * 0.82]} />
        <meshBasicMaterial
          color={theme.accentRight}
          transparent
          opacity={tuning.backdropOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, wallHeight * 0.42, -ARENA_WIDTH * 0.439]}>
        <planeGeometry args={[ARENA_WIDTH * 0.42, wallHeight * 0.56]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={tuning.focusBackdropOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Platforms for multi-level combat */}
      {PLATFORMS.map((platform, index) => (
        <ReadableOpenArenaPlatform
          key={`platform-${index}`}
          platform={platform}
          theme={theme}
          tuning={tuning}
        />
      ))}

      {/* Background sky */}
      <mesh position={[0, ARENA_WIDTH / 2, -ARENA_WIDTH / 2]}>
        <planeGeometry args={[ARENA_WIDTH * 3, ARENA_WIDTH * 1.5]} />
        <meshBasicMaterial
          map={skylineTexture ?? undefined}
          color={theme.skyGradient[0]}
        />
      </mesh>

      {/* Boundaries */}
      <mesh position={[-ARENA_WIDTH / 2 + 0.25, wallHeight * 0.42, 0]} castShadow>
        <boxGeometry args={[0.75 * tuning.pillarWidthScale, wallHeight * 0.84, (ARENA_WIDTH / 3.6) * tuning.pillarDepthScale]} />
        <meshStandardMaterial color={theme.pillarColor} roughness={0.48} transparent opacity={tuning.pillarOpacity} />
      </mesh>

      <mesh position={[ARENA_WIDTH / 2 - 0.25, wallHeight * 0.42, 0]} castShadow>
        <boxGeometry args={[0.75 * tuning.pillarWidthScale, wallHeight * 0.84, (ARENA_WIDTH / 3.6) * tuning.pillarDepthScale]} />
        <meshStandardMaterial color={theme.pillarColor} roughness={0.58} transparent opacity={tuning.pillarOpacity} />
      </mesh>

      {/* Decorative elements along the edges */}
      {decorationDepthOffsets.map((offset, i) => {
        if (theme.id === "auroraFlux") {
          return (
            <group key={`decor-crystal-${i}`}>
              <mesh
                position={[-ARENA_WIDTH / 2 + 0.85, 1.3, offset]}
                rotation={[0, 0, Math.PI / 4]}
                scale={tuning.decorationScale}
              >
                <coneGeometry args={[0.52, 2.2, 4]} />
                <meshStandardMaterial
                  color={theme.accentLeft}
                  emissive={theme.accentLeft}
                  emissiveIntensity={0.42}
                  transparent
                  opacity={tuning.decorationOpacity}
                />
              </mesh>
              <mesh
                position={[ARENA_WIDTH / 2 - 0.85, 1.3, -offset]}
                rotation={[0, 0, -Math.PI / 4]}
                scale={tuning.decorationScale}
              >
                <coneGeometry args={[0.52, 2.2, 4]} />
                <meshStandardMaterial
                  color={theme.accentRight}
                  emissive={theme.accentRight}
                  emissiveIntensity={0.42}
                  transparent
                  opacity={tuning.decorationOpacity}
                />
              </mesh>
            </group>
          );
        }
        return (
          <group
            key={`decor-arch-${i}`}
            position={[-ARENA_WIDTH / 2 + 0.25, 0, offset]}
            scale={tuning.decorationScale}
          >
            <mesh position={[0, 1.9, 0]}>
              <torusGeometry args={[0.86, 0.06, 16, 64, Math.PI]} />
              <meshStandardMaterial
                emissive={theme.accentLeft}
                color="#fef3ff"
                emissiveIntensity={0.34}
                transparent
                opacity={tuning.decorationOpacity}
              />
            </mesh>
            <mesh position={[ARENA_WIDTH - 0.5, 1.9, 0]}>
              <torusGeometry args={[0.86, 0.06, 16, 64, Math.PI]} />
              <meshStandardMaterial
                emissive={theme.accentRight}
                color="#ecfeff"
                emissiveIntensity={0.34}
                transparent
                opacity={tuning.decorationOpacity}
              />
            </mesh>
          </group>
        );
      })}

      {/* Enhanced lighting setup for the larger arena */}
      <hemisphereLight args={[theme.ambientColor, "#f0fdf4", 0.8]} />
      <directionalLight
        intensity={theme.lighting.directionalIntensity}
        position={[ARENA_WIDTH / 2, ARENA_WIDTH / 1.8, ARENA_WIDTH / 2]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-ARENA_WIDTH / 2}
        shadow-camera-right={ARENA_WIDTH / 2}
        shadow-camera-top={ARENA_WIDTH / 2}
        shadow-camera-bottom={-ARENA_WIDTH / 2}
      />

      <pointLight
        intensity={theme.fillLight.intensity}
        position={[
          theme.fillLight.position[0],
          theme.fillLight.position[1],
          theme.fillLight.position[2],
        ]}
        color={theme.fillLight.color}
      />
      <pointLight
        intensity={theme.rimLight.intensity}
        position={[
          theme.rimLight.position[0],
          theme.rimLight.position[1],
          theme.rimLight.position[2],
        ]}
        color={theme.rimLight.color}
      />
    </group>
  );
};

const ReadableOpenArenaPlatform = ({
  platform,
  theme,
  tuning,
}: OpenArenaPlatformProps) => {
  const { camera } = useThree();
  const topMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const supportMaterialsRef = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const occlusionStateRef = useRef<PlatformOcclusionState>({ support: 0, top: 0 });
  const rayRef = useRef(new THREE.Ray());
  const intersectionRef = useRef(new THREE.Vector3());
  const subjectRef = useRef(new THREE.Vector3());

  const width = platform.x2 - platform.x1;
  const depth = platform.z2 - platform.z1;
  const centerX = (platform.x1 + platform.x2) / 2;
  const centerZ = (platform.z1 + platform.z2) / 2;
  const supportInset = width <= 4 || depth <= 4 ? 0.42 : 0.58;
  const reducedSupports =
    platform.y >= 4 || (Math.abs(centerX) <= 4.5 && Math.abs(centerZ) <= 2.5);
  const supportSize =
    platform.y >= 6 ? 0.22 : platform.y >= 4 ? 0.28 : 0.34;
  const platformBox = useMemo(
    () =>
      new THREE.Box3(
        new THREE.Vector3(
          platform.x1,
          FLOOR_Y,
          platform.z1,
        ),
        new THREE.Vector3(
          platform.x2,
          platform.y + OPEN_PLATFORM_TOP_THICKNESS / 2,
          platform.z2,
        ),
      ),
    [platform.x1, platform.x2, platform.y, platform.z1, platform.z2],
  );
  const supportPositions = useMemo<[number, number, number][]>(
    () => [
      [platform.x1 + supportInset, platform.y / 2, platform.z1 + supportInset],
      [platform.x2 - supportInset, platform.y / 2, platform.z1 + supportInset],
      [platform.x1 + supportInset, platform.y / 2, platform.z2 - supportInset],
      [platform.x2 - supportInset, platform.y / 2, platform.z2 - supportInset],
    ],
    [platform.x1, platform.x2, platform.y, platform.z1, platform.z2, supportInset],
  );
  const visibleSupportPositions = useMemo<[number, number, number][]>(
    () =>
      reducedSupports
        ? [...supportPositions].sort((left, right) => left[2] - right[2]).slice(0, 2)
        : supportPositions,
    [reducedSupports, supportPositions],
  );

  useFrame((_, delta) => {
    const { player, cpu, gamePhase } = useFighting.getState();
    const blend = 1 - Math.exp(-delta * OPEN_PLATFORM_OCCLUSION_BLEND);

    let nextSupportOcclusion = 0;
    let nextTopOcclusion = 0;

    if (FIGHT_PRESENTATION_PHASES.has(gamePhase)) {
      const subjects: [number, number, number][] = [player.position, cpu.position];
      for (const subjectPosition of subjects) {
        subjectRef.current.set(
          subjectPosition[0],
          subjectPosition[1] + 1.1,
          subjectPosition[2],
        );
        const toSubject = intersectionRef.current.subVectors(
          subjectRef.current,
          camera.position,
        );
        const distanceToSubject = toSubject.length();
        if (distanceToSubject <= 0.001) continue;
        toSubject.divideScalar(distanceToSubject);
        rayRef.current.set(camera.position, toSubject);
        const hit = rayRef.current.intersectBox(platformBox, intersectionRef.current);
        if (!hit) continue;
        const hitDistance = hit.distanceTo(camera.position);
        if (hitDistance >= distanceToSubject - 0.3) continue;

        const clearance = clampValue(
          (distanceToSubject - hitDistance) / Math.max(distanceToSubject, 1),
          0,
          1,
        );
        const subjectBelowTop = subjectPosition[1] <= platform.y + 0.35;
        nextSupportOcclusion = Math.max(
          nextSupportOcclusion,
          clampValue(0.45 + clearance * 2.2, 0, 1),
        );
        if (subjectBelowTop) {
          nextTopOcclusion = Math.max(
            nextTopOcclusion,
            clampValue(0.35 + clearance * 2.8, 0, 1),
          );
        }
      }
    }

    occlusionStateRef.current.support +=
      (nextSupportOcclusion - occlusionStateRef.current.support) * blend;
    occlusionStateRef.current.top +=
      (nextTopOcclusion - occlusionStateRef.current.top) * blend;

    const topOpacity = THREE.MathUtils.lerp(
      tuning.topOpacity,
      tuning.topOccludedOpacity,
      occlusionStateRef.current.top,
    );
    const supportOpacity = THREE.MathUtils.lerp(
      tuning.supportOpacity,
      tuning.supportOccludedOpacity,
      occlusionStateRef.current.support,
    );

    if (topMaterialRef.current) {
      topMaterialRef.current.opacity = topOpacity;
      topMaterialRef.current.transparent = topOpacity < 0.999;
      topMaterialRef.current.depthWrite = topOpacity > 0.5;
    }

    for (const material of supportMaterialsRef.current) {
      if (!material) continue;
      material.opacity = supportOpacity;
      material.transparent = supportOpacity < 0.999;
      material.depthWrite = supportOpacity > 0.35;
    }
  });

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, platform.y - 0.14, centerZ]}
      >
        <planeGeometry args={[width * 0.82, depth * 0.64]} />
        <meshBasicMaterial
          color={theme.accentRight}
          transparent
          opacity={reducedSupports ? tuning.undersideGlowOpacity : tuning.platformGlowOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[centerX, platform.y, centerZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, OPEN_PLATFORM_TOP_THICKNESS, depth]} />
        <meshStandardMaterial
          ref={topMaterialRef}
          color={theme.platformColor}
          roughness={0.4}
          emissive={theme.accentLeft}
          emissiveIntensity={0.08}
          transparent
          opacity={tuning.topOpacity}
        />
      </mesh>

      {visibleSupportPositions.map((position, index) => (
        <mesh
          key={`support-${index}`}
          position={position}
          castShadow
        >
          <boxGeometry args={[supportSize, platform.y, supportSize]} />
          <meshStandardMaterial
            ref={(material) => {
              supportMaterialsRef.current[index] = material;
            }}
            color={theme.pillarColor}
            roughness={0.55}
            emissive={theme.accentRight}
            emissiveIntensity={0.04}
            transparent
            opacity={tuning.supportOpacity}
          />
        </mesh>
      ))}
    </group>
  );
};

// Containment Arena Component (no fall KOs)
const ContainmentArena = ({
  theme,
  gradientTexture,
  skylineTexture,
}: {
  theme: ArenaTheme;
  gradientTexture: THREE.CanvasTexture | null;
  skylineTexture: THREE.CanvasTexture | null;
}) => {
  const tuning = theme.containedPresentation ?? DEFAULT_CONTAINED_PRESENTATION_TUNING;
  const baseSize = Math.min(ARENA_WIDTH, ARENA_DEPTH);
  const ringRadius = baseSize * 0.34;
  const wallRadius = baseSize * 0.47;
  const ringThickness = 0.08;
  const wallHeight = baseSize * 0.22;
  const wallSegments = 16;
  const railThickness = Math.max(0.15, baseSize * 0.006);

  const polarGrid = useMemo(() => {
    const g = new THREE.PolarGridHelper(
      wallRadius * 1.02,
      16,
      8,
      96,
      theme.colors.gridColor1,
      theme.colors.gridColor2,
    );
    (g.material as THREE.Material).transparent = true;
    (g.material as THREE.Material).opacity = tuning.gridOpacity;
    g.position.y = FLOOR_Y + 0.012;
    return g;
  }, [wallRadius, theme.colors.gridColor1, theme.colors.gridColor2, tuning.gridOpacity]);

  useEffect(
    () => () => {
      polarGrid.geometry.dispose();
    },
    [polarGrid],
  );

  const spawnPadGeom = useMemo(
    () => new THREE.CylinderGeometry(0.9, 0.9, 0.04, 32),
    [],
  );
  const spawnPadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: theme.colors.decorBase1,
        roughness: 0.4,
        metalness: 0.05,
        emissive: theme.colors.decorEmissive1,
        emissiveIntensity: tuning.spawnPadGlow,
      }),
    [theme.colors.decorBase1, theme.colors.decorEmissive1, tuning.spawnPadGlow],
  );
  useEffect(
    () => () => {
      spawnPadGeom.dispose();
      spawnPadMat.dispose?.();
    },
    [spawnPadGeom, spawnPadMat],
  );

  const spawnPoints = useMemo<[number, number, number][]>(() => {
    const r = ringRadius * 0.72;
    return [
      [-r, FLOOR_Y + 0.022, 0],
      [r, FLOOR_Y + 0.022, 0],
      [0, FLOOR_Y + 0.022, -r],
      [0, FLOOR_Y + 0.022, r],
    ];
  }, [ringRadius]);

  const railInstances = useMemo(() => {
    const segAngle = (Math.PI * 2) / wallSegments;
    const chord = 2 * wallRadius * Math.sin(segAngle / 2);
    const pieces = [];
    for (let i = 0; i < wallSegments; i++) {
      const a = i * segAngle;
      const x = wallRadius * Math.cos(a);
      const z = wallRadius * Math.sin(a);
      pieces.push({ x, z, rotY: a, chord });
    }
    return pieces;
  }, [wallRadius, wallSegments]);

  return (
    <group>
      {/* Sky dome */}
      <mesh>
        <sphereGeometry
          args={[Math.max(ARENA_WIDTH, ARENA_DEPTH) * 2.2, 32, 32]}
        />
        <meshBasicMaterial
          map={skylineTexture ?? undefined}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        receiveShadow
      >
        <planeGeometry args={[ARENA_WIDTH, ARENA_DEPTH]} />
        <meshStandardMaterial
          map={gradientTexture ?? undefined}
          color={theme.floorGradient[1]}
          roughness={0.9}
          metalness={0.03}
        />
      </mesh>

      <primitive object={polarGrid} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.024, 0]}>
        <planeGeometry args={[wallRadius * 1.58, 1.88]} />
        <meshBasicMaterial
          color={theme.colors.decorEmissive1}
          transparent
          opacity={tuning.platformHaloOpacity * 0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.03, 0]}>
        <planeGeometry args={[wallRadius * 1.32, 0.92]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={tuning.platformHaloOpacity * 0.72}
          depthWrite={false}
        />
      </mesh>

      {/* Central octagonal ring lip */}
      <mesh
        position={[0, FLOOR_Y + ringThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[ringRadius, ringRadius, ringThickness, 8]} />
        <meshStandardMaterial
          color={theme.colors.decorBase2}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y + ringThickness + 0.005, 0]}
      >
        <ringGeometry args={[ringRadius * 0.92, ringRadius * 0.98, 64]} />
        <meshBasicMaterial
          color={theme.colors.gridColor1}
          transparent
          opacity={tuning.ringGlowOpacity}
        />
      </mesh>

      {/* Containment wall: energy shield (no fall KOs) */}
      <mesh position={[0, FLOOR_Y + wallHeight / 2, 0]}>
        <cylinderGeometry
          args={[wallRadius, wallRadius, wallHeight, 64, 1, true]}
        />
        <meshPhysicalMaterial
          transparent
          transmission={tuning.wallTransmission}
          thickness={0.15}
          roughness={0.2}
          metalness={0.0}
          color="#cfe0ff"
          opacity={tuning.wallOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Top and bottom rails */}
      <mesh position={[0, FLOOR_Y + wallHeight + 0.02, 0]}>
        <torusGeometry args={[wallRadius, railThickness * 0.6, 8, 128]} />
        <meshStandardMaterial
          color={theme.pillarColor}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.02, 0]}>
        <torusGeometry args={[wallRadius, railThickness * 0.6, 8, 128]} />
        <meshStandardMaterial
          color={theme.pillarColor}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Segmented collider rails */}
      {railInstances.map(({ x, z, rotY, chord }, i) => (
        <mesh
          key={`rail-${i}`}
          position={[x, FLOOR_Y + wallHeight / 2, z]}
          rotation={[0, rotY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              railThickness,
              wallHeight,
              Math.max(chord * 0.98, railThickness * 2),
            ]}
          />
          <meshStandardMaterial
            color={theme.pillarColor}
            transparent
            opacity={tuning.railOpacity}
            metalness={0.3}
            roughness={0.6}
          />
        </mesh>
      ))}

      {/* Platforms from PLATFORMS (no occluding posts) */}
      {PLATFORMS.map((p, i) => {
        const w = p.x2 - p.x1;
        const d = p.z2 - p.z1;
        const cx = (p.x1 + p.x2) / 2;
        const cz = (p.z1 + p.z2) / 2;
        const y = p.y;
        const haloR = Math.min(w, d) * 0.49;

        return (
          <group key={`platform-${i}`}>
            <mesh position={[cx, y, cz]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.24, d]} />
              <meshStandardMaterial
                color={theme.platformColor}
                roughness={0.45}
                metalness={0.05}
              />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[cx, y + 0.13, cz]}
            >
              <ringGeometry args={[haloR * 0.93, haloR, 48]} />
              <meshBasicMaterial
                color={theme.colors.decorEmissive2}
                transparent
                opacity={tuning.platformHaloOpacity}
              />
            </mesh>
          </group>
        );
      })}

      {/* Spawn pads */}
      {spawnPoints.map((pos, i) => (
        <mesh
          key={`spawn-${i}`}
          position={pos}
          castShadow
          receiveShadow
          geometry={spawnPadGeom}
          material={spawnPadMat}
        />
      ))}

      {/* Lighting */}
      <hemisphereLight
        args={[
          theme.lighting.hemisphereTop,
          theme.lighting.hemisphereBottom,
          theme.lighting.hemisphereIntensity,
        ]}
      />
      <directionalLight
        intensity={theme.lighting.directionalIntensity}
        position={[
          ARENA_WIDTH * 0.35,
          Math.max(ARENA_WIDTH, ARENA_DEPTH) * 0.6,
          ARENA_DEPTH * 0.35,
        ]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-wallRadius}
        shadow-camera-right={wallRadius}
        shadow-camera-top={wallRadius}
        shadow-camera-bottom={-wallRadius}
      />
      <pointLight
        intensity={theme.fillLight.intensity}
        position={[
          theme.fillLight.position[0],
          theme.fillLight.position[1],
          theme.fillLight.position[2],
        ]}
        color={theme.fillLight.color}
      />
      <pointLight
        intensity={theme.rimLight.intensity}
        position={[
          theme.rimLight.position[0],
          theme.rimLight.position[1],
          theme.rimLight.position[2],
        ]}
        color={theme.rimLight.color}
      />
    </group>
  );
};

export default Arena;
