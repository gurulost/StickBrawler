import { useEffect, useMemo } from "react";
import { ARENA_WIDTH, FLOOR_Y, PLATFORMS, ARENA_DEPTH } from "./Physics";
import {
  getArenaTheme,
  ARENA_THEMES,
  type ArenaTheme,
} from "./arenas";
import * as THREE from "three";

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
  const wallHeight = ARENA_WIDTH / 3;
  const decorationCount = Math.floor(ARENA_WIDTH / 3);

  const gridHelper = useMemo(() => {
    const helper = new THREE.GridHelper(
      ARENA_WIDTH,
      30,
      theme.colors.gridColor1,
      theme.colors.gridColor2,
    );
    (helper.material as THREE.Material).transparent = true;
    (helper.material as THREE.Material).opacity = 0.35;
    helper.position.y = FLOOR_Y + 0.01;
    return helper;
  }, [theme.colors.gridColor1, theme.colors.gridColor2]);

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

      {/* Platforms for multi-level combat */}
      {PLATFORMS.map((platform, index) => {
        const width = platform.x2 - platform.x1;
        const depth = platform.z2 - platform.z1;
        const centerX = (platform.x1 + platform.x2) / 2;
        const centerZ = (platform.z1 + platform.z2) / 2;

        return (
          <group key={`platform-${index}`}>
            <mesh
              position={[centerX, platform.y, centerZ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width, 0.3, depth]} />
              <meshStandardMaterial
                color={theme.platformColor}
                roughness={0.4}
              />
            </mesh>

            {/* Support columns */}
            <mesh
              position={[platform.x1 + 0.5, platform.y / 2, platform.z1 + 0.5]}
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color={theme.pillarColor} />
            </mesh>

            <mesh
              position={[platform.x2 - 0.5, platform.y / 2, platform.z1 + 0.5]}
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color={theme.pillarColor} />
            </mesh>

            <mesh
              position={[platform.x1 + 0.5, platform.y / 2, platform.z2 - 0.5]}
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color={theme.pillarColor} />
            </mesh>

            <mesh
              position={[platform.x2 - 0.5, platform.y / 2, platform.z2 - 0.5]}
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color={theme.pillarColor} />
            </mesh>
          </group>
        );
      })}

      {/* Background sky */}
      <mesh position={[0, ARENA_WIDTH / 2, -ARENA_WIDTH / 2]}>
        <planeGeometry args={[ARENA_WIDTH * 3, ARENA_WIDTH * 1.5]} />
        <meshBasicMaterial
          map={skylineTexture ?? undefined}
          color={theme.skyGradient[0]}
        />
      </mesh>

      {/* Boundaries */}
      <mesh position={[-ARENA_WIDTH / 2, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[1.2, wallHeight, ARENA_WIDTH / 2]} />
        <meshStandardMaterial color={theme.pillarColor} roughness={0.4} />
      </mesh>

      <mesh position={[ARENA_WIDTH / 2, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[1.2, wallHeight, ARENA_WIDTH / 2]} />
        <meshStandardMaterial color={theme.pillarColor} roughness={0.7} />
      </mesh>

      {/* Decorative elements along the edges */}
      {Array.from({ length: decorationCount }).map((_, i) => {
        const offset = -ARENA_WIDTH / 4 + (i * ARENA_WIDTH) / decorationCount;
        if (theme.id === "auroraFlux") {
          return (
            <group key={`decor-crystal-${i}`}>
              <mesh
                castShadow
                position={[-ARENA_WIDTH / 2 + 1, 1.5, offset]}
                rotation={[0, 0, Math.PI / 4]}
              >
                <coneGeometry args={[0.8, 3, 4]} />
                <meshStandardMaterial
                  color={theme.accentLeft}
                  emissive={theme.accentLeft}
                />
              </mesh>
              <mesh
                castShadow
                position={[ARENA_WIDTH / 2 - 1, 1.5, -offset]}
                rotation={[0, 0, -Math.PI / 4]}
              >
                <coneGeometry args={[0.8, 3, 4]} />
                <meshStandardMaterial
                  color={theme.accentRight}
                  emissive={theme.accentRight}
                />
              </mesh>
            </group>
          );
        }
        return (
          <group
            key={`decor-arch-${i}`}
            position={[-ARENA_WIDTH / 2 + 0.5, 0, offset]}
          >
            <mesh castShadow position={[0, 2, 0]}>
              <torusGeometry args={[1, 0.08, 16, 64, Math.PI]} />
              <meshStandardMaterial
                emissive={theme.accentLeft}
                color="#fef3ff"
              />
            </mesh>
            <mesh castShadow position={[ARENA_WIDTH - 1, 2, 0]}>
              <torusGeometry args={[1, 0.08, 16, 64, Math.PI]} />
              <meshStandardMaterial
                emissive={theme.accentRight}
                color="#ecfeff"
              />
            </mesh>
          </group>
        );
      })}

      {/* Enhanced lighting setup for the larger arena */}
      <hemisphereLight
        skyColor={theme.ambientColor}
        groundColor="#f0fdf4"
        intensity={0.8}
      />
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
    (g.material as THREE.Material).opacity = 0.35;
    g.position.y = FLOOR_Y + 0.012;
    return g;
  }, [wallRadius, theme.colors.gridColor1, theme.colors.gridColor2]);

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
        emissiveIntensity: 0.2,
      }),
    [theme.colors.decorBase1, theme.colors.decorEmissive1],
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
          opacity={0.55}
        />
      </mesh>

      {/* Containment wall: energy shield (no fall KOs) */}
      <mesh position={[0, FLOOR_Y + wallHeight / 2, 0]}>
        <cylinderGeometry
          args={[wallRadius, wallRadius, wallHeight, 64, 1, true]}
        />
        <meshPhysicalMaterial
          transparent
          transmission={0.75}
          thickness={0.15}
          roughness={0.2}
          metalness={0.0}
          color="#cfe0ff"
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
            opacity={0.25}
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
                opacity={0.35}
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