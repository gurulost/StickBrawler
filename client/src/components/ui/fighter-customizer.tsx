import React, { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Separator } from './separator';
import { useCustomization, colorThemes, figureStyles, accessories, animationStyles } from '../../lib/stores/useCustomization';
import StickFigure from '../../game/StickFigure';
import { useFighting } from '../../lib/stores/useFighting';
import { Palette, User, Zap, Crown, Save, RotateCcw, Eye } from 'lucide-react';
import * as THREE from 'three';

// Character preview component
const CharacterPreview = ({ 
  isPlayer, 
  className = "" 
}: { 
  isPlayer: boolean; 
  className?: string;
}) => {
  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerAccessory,
    getCPUColors,
    getCPUStyle,
    getCPUAccessory
  } = useCustomization();

  // Create a dummy character state for preview
  const previewState = {
    health: 100,
    position: [0, 0, 0] as [number, number, number],
    direction: 1 as 1 | -1,
    isJumping: false,
    isAttacking: false,
    isBlocking: false,
    isDodging: false,
    isGrabbing: false,
    isTaunting: false,
    isAirAttacking: false,
    airJumpsLeft: 2,
    attackCooldown: 0,
    dodgeCooldown: 0,
    grabCooldown: 0,
    moveCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    lastMoveType: '',
    velocity: [0, 0, 0] as [number, number, number]
  };

  return (
    <div className={`h-64 w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          <StickFigure
            isPlayer={isPlayer}
            characterState={previewState}
            onPositionChange={() => {}}
            onVelocityChange={() => {}}
            onDirectionChange={() => {}}
            onJumpingChange={() => {}}
            onAttackingChange={() => {}}
            onBlockingChange={() => {}}
          />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true}
            minDistance={2}
            maxDistance={6}
            target={[0, 0.5, 0]}
          />
          
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
};

// Color palette selector
const ColorSelector = ({ 
  label, 
  value, 
  onChange, 
  className = "" 
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(colorThemes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 ${
              value === key 
                ? 'border-white ring-2 ring-blue-400' 
                : 'border-gray-600 hover:border-gray-400'
            }`}
            style={{ 
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` 
            }}
            title={key.charAt(0).toUpperCase() + key.slice(1)}
          />
        ))}
      </div>
    </div>
  );
};

// Style selector
const StyleSelector = ({ 
  label, 
  value, 
  onChange, 
  options,
  className = "" 
}: {
  label: string;
  value: string;
  onChange: (style: string) => void;
  options: Record<string, any>;
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-1 gap-2">
        {Object.keys(options).map((key) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`p-3 rounded-lg border text-left transition-all hover:bg-gray-700 ${
              value === key 
                ? 'border-blue-400 bg-blue-900/30 text-blue-200' 
                : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <div className="text-xs text-gray-400 mt-1">
              {key === 'normal' && 'Balanced fighter with standard proportions'}
              {key === 'bulky' && 'Heavy fighter with increased durability'}
              {key === 'slim' && 'Fast fighter with quick movements'}
              {key === 'cartoonish' && 'Fun fighter with exaggerated features'}
              {key === 'robot' && 'Mechanical fighter with metallic finish'}
              {key === 'fast' && 'Quick attacks and enhanced mobility'}
              {key === 'powerful' && 'Slower but devastating strikes'}
              {key === 'acrobatic' && 'Enhanced jumping and air control'}
              {key === 'robotic' && 'Precise mechanical movements'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Accessory selector
const AccessorySelector = ({ 
  label, 
  value, 
  color,
  onChange, 
  onColorChange,
  className = "" 
}: {
  label: string;
  value: string;
  color: string;
  onChange: (accessory: string) => void;
  onColorChange: (color: string) => void;
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(accessories).map(([key, accessory]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`p-3 rounded-lg border text-left transition-all hover:bg-gray-700 ${
              value === key 
                ? 'border-blue-400 bg-blue-900/30 text-blue-200' 
                : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-medium text-sm">{accessory.name}</div>
          </button>
        ))}
      </div>
      
      {value !== 'none' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Accessory Color</label>
          <div className="flex gap-2">
            {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#000000', '#ffa500'].map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={`w-8 h-8 rounded border-2 ${
                  color === c ? 'border-white' : 'border-gray-600'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Preset characters
const presetCharacters = [
  {
    name: "Blue Warrior",
    colorTheme: 'blue' as const,
    figureStyle: 'normal' as const,
    accessory: 'sword' as const,
    accessoryColor: '#c0c0c0',
    animationStyle: 'normal'
  },
  {
    name: "Red Berserker",
    colorTheme: 'red' as const,
    figureStyle: 'bulky' as const,
    accessory: 'none' as const,
    accessoryColor: '#ffffff',
    animationStyle: 'powerful'
  },
  {
    name: "Green Ninja",
    colorTheme: 'green' as const,
    figureStyle: 'slim' as const,
    accessory: 'none' as const,
    accessoryColor: '#ffffff',
    animationStyle: 'fast'
  },
  {
    name: "Purple Mage",
    colorTheme: 'purple' as const,
    figureStyle: 'cartoonish' as const,
    accessory: 'hat' as const,
    accessoryColor: '#4a148c',
    animationStyle: 'acrobatic'
  },
  {
    name: "Robot Fighter",
    colorTheme: 'black' as const,
    figureStyle: 'robot' as const,
    accessory: 'glasses' as const,
    accessoryColor: '#00ff00',
    animationStyle: 'robotic'
  },
  {
    name: "Knight Champion",
    colorTheme: 'white' as const,
    figureStyle: 'normal' as const,
    accessory: 'shield' as const,
    accessoryColor: '#ffd700',
    animationStyle: 'normal'
  }
];

export function FighterCustomizer() {
  const [activeTab, setActiveTab] = useState('player');
  const [savedCharacters, setSavedCharacters] = useState<any[]>([]);
  
  const {
    playerColorTheme, playerFigureStyle, playerAccessory, playerAccessoryColor, playerAnimationStyle,
    cpuColorTheme, cpuFigureStyle, cpuAccessory, cpuAccessoryColor, cpuAnimationStyle,
    setPlayerColorTheme, setPlayerFigureStyle, setPlayerAccessory, setPlayerAnimationStyle,
    setCPUColorTheme, setCPUFigureStyle, setCPUAccessory, setCPUAnimationStyle,
    resetCustomizations
  } = useCustomization();

  const { startGame } = useFighting();

  // Save current character configuration
  const saveCharacter = () => {
    const characterConfig = {
      id: Date.now(),
      name: `Fighter ${savedCharacters.length + 1}`,
      type: activeTab,
      colorTheme: activeTab === 'player' ? playerColorTheme : cpuColorTheme,
      figureStyle: activeTab === 'player' ? playerFigureStyle : cpuFigureStyle,
      accessory: activeTab === 'player' ? playerAccessory : cpuAccessory,
      accessoryColor: activeTab === 'player' ? playerAccessoryColor : cpuAccessoryColor,
      animationStyle: activeTab === 'player' ? playerAnimationStyle : cpuAnimationStyle,
      createdAt: new Date().toISOString()
    };
    
    setSavedCharacters(prev => [...prev, characterConfig]);
  };

  // Load a preset character
  const loadPreset = (preset: typeof presetCharacters[0]) => {
    if (activeTab === 'player') {
      setPlayerColorTheme(preset.colorTheme);
      setPlayerFigureStyle(preset.figureStyle);
      setPlayerAccessory(preset.accessory, preset.accessoryColor);
      setPlayerAnimationStyle(preset.animationStyle);
    } else {
      setCPUColorTheme(preset.colorTheme);
      setCPUFigureStyle(preset.figureStyle);
      setCPUAccessory(preset.accessory, preset.accessoryColor);
      setCPUAnimationStyle(preset.animationStyle);
    }
  };

  // Start fighting with customized characters
  const enterBattle = () => {
    startGame();
  };

  // Go back to main menu
  const backToMenu = () => {
    window.location.reload(); // Simple way to return to menu
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Fighter Customization
          </h1>
          <p className="text-gray-300">Design your ultimate fighter and dominate the arena</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Character Preview Section */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                    <TabsTrigger value="player" className="data-[state=active]:bg-blue-600">
                      Player
                    </TabsTrigger>
                    <TabsTrigger value="cpu" className="data-[state=active]:bg-red-600">
                      CPU
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="player">
                    <CharacterPreview isPlayer={true} className="mb-4" />
                    <div className="text-center space-y-2">
                      <Badge variant="outline" className="bg-blue-900/30 text-blue-200 border-blue-600">
                        Player Fighter
                      </Badge>
                      <p className="text-sm text-gray-400">This is how your fighter will look in battle</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="cpu">
                    <CharacterPreview isPlayer={false} className="mb-4" />
                    <div className="text-center space-y-2">
                      <Badge variant="outline" className="bg-red-900/30 text-red-200 border-red-600">
                        CPU Opponent
                      </Badge>
                      <p className="text-sm text-gray-400">This is how your opponent will look</p>
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator className="bg-gray-600" />

                <div className="space-y-3">
                  <Button 
                    onClick={saveCharacter} 
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Character
                  </Button>
                  
                  <Button 
                    onClick={resetCustomizations} 
                    variant="outline" 
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                  
                  <Button 
                    onClick={enterBattle} 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Enter Battle!
                  </Button>
                  
                  <Button 
                    onClick={backToMenu} 
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customization Controls */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  {activeTab === 'player' ? 'Player' : 'CPU'} Customization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Color Theme */}
                  <ColorSelector
                    label="Color Theme"
                    value={activeTab === 'player' ? playerColorTheme : cpuColorTheme}
                    onChange={(color) => 
                      activeTab === 'player' 
                        ? setPlayerColorTheme(color as any)
                        : setCPUColorTheme(color as any)
                    }
                  />

                  {/* Figure Style */}
                  <StyleSelector
                    label="Body Style"
                    value={activeTab === 'player' ? playerFigureStyle : cpuFigureStyle}
                    onChange={(style) =>
                      activeTab === 'player'
                        ? setPlayerFigureStyle(style as any)
                        : setCPUFigureStyle(style as any)
                    }
                    options={figureStyles}
                  />

                  {/* Accessories */}
                  <AccessorySelector
                    label="Accessories"
                    value={activeTab === 'player' ? playerAccessory : cpuAccessory}
                    color={activeTab === 'player' ? playerAccessoryColor : cpuAccessoryColor}
                    onChange={(accessory) =>
                      activeTab === 'player'
                        ? setPlayerAccessory(accessory as any, playerAccessoryColor)
                        : setCPUAccessory(accessory as any, cpuAccessoryColor)
                    }
                    onColorChange={(color) =>
                      activeTab === 'player'
                        ? setPlayerAccessory(playerAccessory, color)
                        : setCPUAccessory(cpuAccessory, color)
                    }
                  />

                  {/* Animation Style */}
                  <StyleSelector
                    label="Fighting Style"
                    value={activeTab === 'player' ? playerAnimationStyle : cpuAnimationStyle}
                    onChange={(style) =>
                      activeTab === 'player'
                        ? setPlayerAnimationStyle(style)
                        : setCPUAnimationStyle(style)
                    }
                    options={animationStyles}
                  />
                </div>

                <Separator className="my-6 bg-gray-600" />

                {/* Preset Characters */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Preset Characters
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {presetCharacters.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => loadPreset(preset)}
                        className="p-4 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500 transition-all text-left"
                      >
                        <div className="font-medium text-white text-sm">{preset.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {preset.figureStyle} • {preset.colorTheme}
                        </div>
                        <div 
                          className="w-full h-2 rounded mt-2"
                          style={{ 
                            background: `linear-gradient(90deg, ${colorThemes[preset.colorTheme].primary}, ${colorThemes[preset.colorTheme].secondary})` 
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}