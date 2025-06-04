import React, { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Separator } from './separator';
import { Input } from './input';
import { useCustomization, colorThemes, figureStyles, accessories, animationStyles, SavedCharacter } from '../../lib/stores/useCustomization';
import StickFigure from '../../game/StickFigure';
import { useFighting } from '../../lib/stores/useFighting';
import { ParticleEffect, AuraEffect } from './particle-effects';
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
    getCPUColors,
    getCPUStyle
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

  const colors = isPlayer ? getPlayerColors() : getCPUColors();
  const style = isPlayer ? getPlayerStyle() : getCPUStyle();

  return (
    <div className={`h-64 w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg overflow-hidden ${className} relative`}>
      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          {/* Character particle effects based on theme */}
          {colors?.specialEffect && (
            <ParticleEffect 
              theme={colors.specialEffect} 
              count={style?.particleCount || 5}
              intensity={style?.glowIntensity || 0.5}
            />
          )}
          
          {/* Character aura effect */}
          {colors?.glow && (
            <AuraEffect 
              color={colors.glow} 
              intensity={style?.glowIntensity || 0.5}
              radius={1.2}
            />
          )}
          
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
      
      {/* Character theme name overlay */}
      {colors?.name && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-60 rounded px-2 py-1">
          <span className="text-xs text-white font-medium">{colors.name}</span>
        </div>
      )}
      
      {/* Style name overlay */}
      {style?.name && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded px-2 py-1">
          <span className="text-xs text-white font-medium">{style.name}</span>
        </div>
      )}
    </div>
  );
};

// Enhanced color palette selector with theme names
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
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(colorThemes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
              value === key 
                ? 'border-white ring-2 ring-blue-400 bg-gray-700' 
                : 'border-gray-600 hover:border-gray-400 bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full border border-gray-500"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  boxShadow: `0 0 8px ${theme.glow}40`
                }}
              />
              <div className="text-left">
                <div className="text-sm font-medium text-white">{theme?.name || key}</div>
                <div className="text-xs text-gray-400">{theme?.specialEffect || 'Default'}</div>
              </div>
            </div>
          </button>
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

// Enhanced accessory selector with visual effects
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
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
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
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm">{accessory.name}</div>
              {accessory.effect && (
                <div className="flex gap-1">
                  {accessory.emissive && (
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Glowing Effect" />
                  )}
                  {accessory.animated && (
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-spin" title="Animated Effect" />
                  )}
                </div>
              )}
            </div>
            {accessory.effect && (
              <div className="text-xs text-gray-400 mt-1 capitalize">
                {accessory.effect.replace('_', ' ')} effect
              </div>
            )}
          </button>
        ))}
      </div>
      
      {value !== 'none' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Accessory Color</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { color: '#ffffff', name: 'White' },
              { color: '#ff4444', name: 'Fire Red' },
              { color: '#44ff44', name: 'Nature Green' },
              { color: '#4444ff', name: 'Ocean Blue' },
              { color: '#ffff44', name: 'Solar Gold' },
              { color: '#ff44ff', name: 'Magic Purple' },
              { color: '#444444', name: 'Shadow Black' },
              { color: '#ff8844', name: 'Ember Orange' },
              { color: '#44ffff', name: 'Cyber Cyan' },
              { color: '#ff88ff', name: 'Sakura Pink' },
              { color: '#88ff88', name: 'Crystal Green' },
              { color: '#8888ff', name: 'Mystic Blue' }
            ].map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => onColorChange(colorOption.color)}
                className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                  color === colorOption.color ? 'border-white ring-2 ring-blue-400' : 'border-gray-600'
                }`}
                style={{ 
                  backgroundColor: colorOption.color,
                  boxShadow: color === colorOption.color ? `0 0 8px ${colorOption.color}60` : 'none'
                }}
                title={colorOption.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced preset characters with new accessories
const presetCharacters = [
  {
    name: "Ocean Warrior",
    colorTheme: 'blue' as const,
    figureStyle: 'normal' as const,
    accessory: 'crystal_shield' as const,
    accessoryColor: '#87ceeb',
    animationStyle: 'normal'
  },
  {
    name: "Fire Champion",
    colorTheme: 'red' as const,
    figureStyle: 'bulky' as const,
    accessory: 'flame_sword' as const,
    accessoryColor: '#ff4444',
    animationStyle: 'powerful'
  },
  {
    name: "Shadow Ninja",
    colorTheme: 'black' as const,
    figureStyle: 'slim' as const,
    accessory: 'ninja_mask' as const,
    accessoryColor: '#2c3e50',
    animationStyle: 'fast'
  },
  {
    name: "Mystic Sorcerer",
    colorTheme: 'purple' as const,
    figureStyle: 'cartoonish' as const,
    accessory: 'wizard_hat' as const,
    accessoryColor: '#8e44ad',
    animationStyle: 'acrobatic'
  },
  {
    name: "Cyber Ninja",
    colorTheme: 'cyber' as const,
    figureStyle: 'robot' as const,
    accessory: 'cyber_visor' as const,
    accessoryColor: '#00ffff',
    animationStyle: 'robotic'
  },
  {
    name: "Light Paladin",
    colorTheme: 'white' as const,
    figureStyle: 'normal' as const,
    accessory: 'halo' as const,
    accessoryColor: '#ffffff',
    animationStyle: 'normal'
  },
  {
    name: "Angel Guardian",
    colorTheme: 'white' as const,
    figureStyle: 'ethereal' as const,
    accessory: 'wings' as const,
    accessoryColor: '#f0f8ff',
    animationStyle: 'acrobatic'
  },
  {
    name: "Demon Lord",
    colorTheme: 'red' as const,
    figureStyle: 'bulky' as const,
    accessory: 'demon_horns' as const,
    accessoryColor: '#8b0000',
    animationStyle: 'powerful'
  },
  {
    name: "Royal Champion",
    colorTheme: 'orange' as const,
    figureStyle: 'normal' as const,
    accessory: 'crown' as const,
    accessoryColor: '#ffd700',
    animationStyle: 'normal'
  },
  {
    name: "Prism Warrior",
    colorTheme: 'rainbow' as const,
    figureStyle: 'crystal' as const,
    accessory: 'energy_cape' as const,
    accessoryColor: '#ff6b6b',
    animationStyle: 'acrobatic'
  }
];

export function FighterCustomizer() {
  const [activeTab, setActiveTab] = useState('player');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [characterName, setCharacterName] = useState('');
  
  const {
    playerColorTheme, playerFigureStyle, playerAccessory, playerAccessoryColor, playerAnimationStyle,
    cpuColorTheme, cpuFigureStyle, cpuAccessory, cpuAccessoryColor, cpuAnimationStyle,
    savedCharacters,
    setPlayerColorTheme, setPlayerFigureStyle, setPlayerAccessory, setPlayerAnimationStyle,
    setCPUColorTheme, setCPUFigureStyle, setCPUAccessory, setCPUAnimationStyle,
    saveCharacter, loadCharacter, deleteCharacter,
    resetCustomizations
  } = useCustomization();

  const { startGame } = useFighting();

  // Save current character configuration with custom name
  const handleSaveCharacter = () => {
    if (characterName.trim()) {
      saveCharacter(characterName.trim(), activeTab === 'player');
      setCharacterName('');
      setShowSaveDialog(false);
    }
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
                    onClick={() => setShowSaveDialog(true)} 
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Character
                  </Button>
                  
                  {/* Save Dialog */}
                  {showSaveDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 w-80">
                        <h3 className="text-lg font-semibold text-white mb-4">Save Character</h3>
                        <Input
                          value={characterName}
                          onChange={(e) => setCharacterName(e.target.value)}
                          placeholder="Enter character name..."
                          className="mb-4 bg-gray-700 border-gray-600 text-white"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSaveCharacter}
                            disabled={!characterName.trim()}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button 
                            onClick={() => setShowSaveDialog(false)}
                            variant="outline"
                            className="flex-1 border-gray-600 text-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
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

                {/* Saved Characters Gallery */}
                {savedCharacters.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Your Saved Characters
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                      {savedCharacters.map((character) => (
                        <div
                          key={character.id}
                          className="p-3 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all"
                        >
                          <div className="font-medium text-white text-sm mb-2">{character.name}</div>
                          <div className="text-xs text-gray-400 mb-2">
                            {character.figureStyle} • {character.colorTheme}
                          </div>
                          <div 
                            className="w-full h-2 rounded mb-3"
                            style={{ 
                              background: `linear-gradient(90deg, ${colorThemes[character.colorTheme].primary}, ${colorThemes[character.colorTheme].secondary})` 
                            }}
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => loadCharacter(character, activeTab === 'player')}
                              className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                            >
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCharacter(character.id)}
                              className="text-xs border-red-600 text-red-400 hover:bg-red-900/30"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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