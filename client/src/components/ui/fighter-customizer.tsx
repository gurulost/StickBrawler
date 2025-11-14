import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Separator } from './separator';
import { Input } from './input';
import { useCustomization, colorThemes, figureStyles, accessories, animationStyles, inkStyles, SavedCharacter, type CoinLedgerEntry, type ColorTheme, type FigureStyle, type Accessory, type AnimationStyle, type InkStyle, type InkOverrides, type FigureStyleOverrides } from '../../lib/stores/useCustomization';
import type { CosmeticSlot } from '../../lib/stores/useCustomization';
import { useFighting } from '../../lib/stores/useFighting';
import { Palette, User, Zap, Crown, Save, RotateCcw, Eye, Coins, Lock, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, Shuffle, Copy, ArrowLeftRight } from 'lucide-react';
import { CharacterPreview } from '../preview/CharacterPreview';

const formatLedgerTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const describeLedgerReason = (entry: CoinLedgerEntry) => {
  const { reason } = entry;
  if (reason.startsWith('purchase:')) {
    const [, slot] = reason.split(':');
    return `Purchased ${slot ?? 'cosmetic'}`;
  }
  switch (reason) {
    case 'hit':
      return 'Hit confirm bonus';
    case 'ko':
      return 'Knockout payout';
    case 'round_win_ko':
      return 'Round victory (KO)';
    case 'round_win_timeout':
      return 'Round victory (time)';
    case 'round_loss_ko':
      return 'Round loss consolation';
    case 'round_timeout':
      return 'Timeout bonus';
    case 'unspecified':
      return 'Bonus payout';
    default:
      return reason.replace(/_/g, ' ');
  }
};

// Enhanced color palette selector with theme names
const ColorSelector = ({ 
  label, 
  value, 
  onChange, 
  isUnlocked,
  getCost,
  onAttemptPurchase,
  className = "" 
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  isUnlocked?: (id: string) => boolean;
  getCost?: (id: string) => number | undefined;
  onAttemptPurchase?: (id: string) => boolean | void;
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(colorThemes).map(([key, theme]) => {
          const unlocked = isUnlocked ? isUnlocked(key) : true;
          const cost = getCost?.(key);
          const handleSelect = () => {
            if (!unlocked) {
              const unlockedNow = onAttemptPurchase?.(key);
              if (unlockedNow) {
                onChange(key);
              }
              return;
            }
            onChange(key);
          };
          return (
            <button
              type="button"
              key={key}
              onClick={handleSelect}
              className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                value === key 
                  ? 'border-white ring-2 ring-blue-400 bg-gray-700' 
                  : 'border-gray-600 hover:border-gray-400 bg-gray-800'
              } ${unlocked ? '' : 'opacity-70 hover:scale-100'}`}
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
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {theme?.name || key}
                    {!unlocked && (
                      <Lock className="w-3 h-3 text-amber-300" aria-label="Locked" />
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {unlocked 
                      ? (theme?.specialEffect || 'Default') 
                      : `Locked • ${cost?.toLocaleString() ?? '—'} coins`}
                  </div>
                </div>
              </div>
              {!unlocked && (
                <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-amber-200 bg-black/70 px-2 py-0.5 rounded-full">
                  {cost?.toLocaleString() ?? '—'} coins
                </div>
              )}
            </button>
          );
        })}
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
  isUnlocked,
  getCost,
  onAttemptPurchase,
  className = "" 
}: {
  label: string;
  value: string;
  onChange: (style: string) => void;
  options: Record<string, any>;
  isUnlocked?: (id: string) => boolean;
  getCost?: (id: string) => number | undefined;
  onAttemptPurchase?: (id: string) => boolean | void;
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-1 gap-2">
        {Object.keys(options).map((key) => {
          const unlocked = isUnlocked ? isUnlocked(key) : true;
          const cost = getCost?.(key);
          const handleClick = () => {
            if (!unlocked) {
              const unlockedNow = onAttemptPurchase?.(key);
              if (unlockedNow) {
                onChange(key);
              }
              return;
            }
            onChange(key);
          };
          return (
            <button
              type="button"
              key={key}
              onClick={handleClick}
              className={`relative p-3 rounded-lg border text-left transition-all hover:bg-gray-700 ${
                value === key 
                  ? 'border-blue-400 bg-blue-900/30 text-blue-200' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              } ${unlocked ? '' : 'opacity-70 hover:scale-100'}`}
            >
              <div className="font-medium flex items-center gap-2">
                {key.charAt(0).toUpperCase() + key.slice(1)}
                {!unlocked && <Lock className="w-3 h-3 text-amber-300" />}
              </div>
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
                {!unlocked && (
                  <span className="block text-amber-200 mt-1">
                    Locked • {cost?.toLocaleString() ?? '—'} coins
                  </span>
                )}
              </div>
              {!unlocked && (
                <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-amber-200 bg-black/70 px-2 py-0.5 rounded-full">
                  Unlock
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Ink Style Selector with visual preview
const InkStyleSelector = ({ 
  label, 
  value, 
  onChange,
  className = "" 
}: {
  label: string;
  value: InkStyle;
  onChange: (style: InkStyle) => void;
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(inkStyles).map(([key, style]) => {
          const isSelected = value === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onChange(key as InkStyle)}
              className={`relative p-3 rounded-lg border text-left transition-all hover:bg-gray-700 ${
                isSelected
                  ? 'border-blue-400 bg-blue-900/30 text-blue-200' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded flex-shrink-0 relative"
                  style={{ 
                    backgroundColor: '#333',
                    border: `${Math.max(1, style.lineWidth * 20)}px solid ${style.outlineColor}`,
                    boxShadow: style.glow > 0 ? `0 0 ${style.glow * 15}px ${style.rimColor}` : 'none'
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded"
                    style={{
                      background: style.shadeBands <= 2 
                        ? `linear-gradient(135deg, #555 0%, #999 100%)` 
                        : style.shadeBands <= 3
                        ? `linear-gradient(135deg, #444 0%, #777 50%, #aaa 100%)`
                        : `linear-gradient(135deg, #333 0%, #555 25%, #888 50%, #bbb 75%, #ddd 100%)`,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{style.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{style.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SliderControl = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) => {
  const clamped = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="text-sm text-gray-200">{label}</span>
        <span className="font-mono text-gray-300">
          {formatValue ? formatValue(clamped) : clamped.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="w-full accent-blue-400"
      />
    </div>
  );
};

const FigureBlendControls = ({
  baseStyle,
  blendTarget,
  blendAmount,
  styleOptions,
  onTargetChange,
  onBlendChange,
}: {
  baseStyle: FigureStyle;
  blendTarget: FigureStyle | null;
  blendAmount: number;
  styleOptions: FigureStyle[];
  onTargetChange: (style: FigureStyle | null) => void;
  onBlendChange: (amount: number) => void;
}) => (
  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-white">Preset Blending</p>
        <p className="text-xs text-gray-400">Mix silhouettes to craft new forms</p>
      </div>
      <Badge className="bg-gray-700 text-gray-200 border-gray-600">
        {blendTarget ? `${Math.round(blendAmount * 100)}% ${blendTarget}` : 'Base only'}
      </Badge>
    </div>
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wide text-gray-400">Blend Source</label>
      <select
        value={blendTarget ?? ''}
        onChange={(event) => {
          const next = event.target.value || null;
          onTargetChange(next as FigureStyle | null);
          if (!next) {
            onBlendChange(0);
          }
        }}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100"
      >
        <option value="">Use base preset</option>
        {styleOptions
          .filter((style) => style !== baseStyle)
          .map((style) => (
            <option key={style} value={style}>
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </option>
          ))}
      </select>
    </div>
    <SliderControl
      label="Blend Amount"
      value={blendTarget ? blendAmount : 0}
      min={0}
      max={1}
      step={0.05}
      formatValue={(value) => `${Math.round(value * 100)}%`}
      onChange={(value) => onBlendChange(blendTarget ? value : 0)}
    />
  </div>
);

type FigureStyleShape = (typeof figureStyles)[FigureStyle];

const SilhouetteOverrideControls = ({
  label,
  style,
  overrides,
  onChange,
  onReset,
}: {
  label: string;
  style: FigureStyleShape;
  overrides: FigureStyleOverrides | null;
  onChange: (patch: Partial<FigureStyleOverrides>) => void;
  onReset: () => void;
}) => {
  const arms = style.silhouette?.arms;
  const legs = style.silhouette?.legs;
  return (
    <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-gray-400">Directly sculpt the silhouette</p>
        </div>
        <button
          type="button"
          className="text-xs text-blue-300 hover:text-blue-100"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SliderControl
          label="Head Size"
          value={overrides?.headSize ?? style.headSize}
          min={0.18}
          max={0.45}
          step={0.01}
          onChange={(value) => onChange({ headSize: value })}
        />
        <SliderControl
          label="Body Length"
          value={overrides?.bodyLength ?? style.bodyLength}
          min={0.5}
          max={1}
          step={0.01}
          onChange={(value) => onChange({ bodyLength: value })}
        />
        <SliderControl
          label="Limb Thickness"
          value={overrides?.limbThickness ?? style.limbThickness}
          min={0.04}
          max={0.16}
          step={0.005}
          onChange={(value) => onChange({ limbThickness: value })}
        />
        <SliderControl
          label="Shoulder Width"
          value={overrides?.shoulderWidth ?? style.shoulderWidth}
          min={0.25}
          max={0.7}
          step={0.01}
          onChange={(value) => onChange({ shoulderWidth: value })}
        />
        <SliderControl
          label="Outline Width"
          value={overrides?.outlineWidth ?? style.outlineWidth ?? 0.04}
          min={0.01}
          max={0.12}
          step={0.005}
          onChange={(value) => onChange({ outlineWidth: value })}
        />
        <SliderControl
          label="Glow Intensity"
          value={overrides?.glowIntensity ?? style.glowIntensity ?? 0.2}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => onChange({ glowIntensity: value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SliderControl
          label="Arm Length"
          value={overrides?.silhouette?.arms?.length ?? arms?.length ?? 0.7}
          min={0.55}
          max={1.0}
          step={0.01}
          onChange={(value) => onChange({ silhouette: { arms: { length: value } } })}
        />
        <SliderControl
          label="Leg Length"
          value={overrides?.silhouette?.legs?.length ?? legs?.length ?? 0.85}
          min={0.7}
          max={1.1}
          step={0.01}
          onChange={(value) => onChange({ silhouette: { legs: { length: value } } })}
        />
        <SliderControl
          label="Arm Curvature"
          value={overrides?.silhouette?.arms?.curvature ?? arms?.curvature ?? 0}
          min={-0.15}
          max={0.15}
          step={0.005}
          onChange={(value) => onChange({ silhouette: { arms: { curvature: value } } })}
        />
        <SliderControl
          label="Leg Curvature"
          value={overrides?.silhouette?.legs?.curvature ?? legs?.curvature ?? 0}
          min={-0.15}
          max={0.15}
          step={0.005}
          onChange={(value) => onChange({ silhouette: { legs: { curvature: value } } })}
        />
      </div>
    </div>
  );
};

const InkOverrideControls = ({
  label,
  baseStyle,
  overrides,
  onChange,
  onReset,
}: {
  label: string;
  baseStyle: (typeof inkStyles)[InkStyle];
  overrides: InkOverrides | null;
  onChange: (patch: Partial<InkOverrides>) => void;
  onReset: () => void;
}) => {
  const rimColor = overrides?.rimColor ?? baseStyle.rimColor;
  const outlineColor = overrides?.outlineColor ?? baseStyle.outlineColor;
  return (
    <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-gray-400">Fine-tune ink shader response</p>
        </div>
        <button
          type="button"
          className="text-xs text-blue-300 hover:text-blue-100"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-400 flex flex-col gap-1">
          <span className="text-sm text-gray-200">Rim Color</span>
          <input
            type="color"
            value={rimColor}
            onChange={(event) => onChange({ rimColor: event.target.value })}
            className="w-full h-10 rounded border border-gray-600 bg-gray-800"
          />
        </label>
        <label className="text-xs text-gray-400 flex flex-col gap-1">
          <span className="text-sm text-gray-200">Outline Color</span>
          <input
            type="color"
            value={outlineColor}
            onChange={(event) => onChange({ outlineColor: event.target.value })}
            className="w-full h-10 rounded border border-gray-600 bg-gray-800"
          />
        </label>
      </div>
      <SliderControl
        label="Line Width"
        value={overrides?.lineWidth ?? baseStyle.lineWidth}
        min={0.005}
        max={0.12}
        step={0.0025}
        onChange={(value) => onChange({ lineWidth: value })}
      />
      <SliderControl
        label="Shade Bands"
        value={overrides?.shadeBands ?? baseStyle.shadeBands}
        min={1}
        max={5}
        step={1}
        formatValue={(value) => `${Math.round(value)} bands`}
        onChange={(value) => onChange({ shadeBands: Math.round(value) })}
      />
      <SliderControl
        label="Glow Boost"
        value={overrides?.glow ?? baseStyle.glow}
        min={0}
        max={0.6}
        step={0.02}
        onChange={(value) => onChange({ glow: value })}
      />
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
  isUnlocked,
  getCost,
  onAttemptPurchase,
  className = "" 
}: {
  label: string;
  value: string;
  color: string;
  onChange: (accessory: string) => void;
  onColorChange: (color: string) => void;
  isUnlocked?: (id: string) => boolean;
  getCost?: (id: string) => number | undefined;
  onAttemptPurchase?: (id: string) => boolean | void;
  className?: string;
}) => {
  const canCustomizeColor = value !== 'none' && (!isUnlocked || isUnlocked(value));
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {Object.entries(accessories).map(([key, accessory]) => {
          const unlocked = isUnlocked ? isUnlocked(key) : true;
          const cost = getCost?.(key);
          const handleSelect = () => {
            if (!unlocked) {
              const unlockedNow = onAttemptPurchase?.(key);
              if (unlockedNow) {
                onChange(key);
              }
              return;
            }
            onChange(key);
          };
          return (
            <button
              type="button"
              key={key}
              onClick={handleSelect}
              className={`relative p-3 rounded-lg border text-left transition-all hover:bg-gray-700 ${
                value === key 
                  ? 'border-blue-400 bg-blue-900/30 text-blue-200' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              } ${unlocked ? '' : 'opacity-70 hover:scale-100'}`}
            >
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm flex items-center gap-1">
                  {accessory?.name || key}
                  {!unlocked && <Lock className="w-3 h-3 text-amber-300" />}
                </div>
                {accessory?.effect && (
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
              {accessory?.effect && (
                <div className="text-xs text-gray-400 mt-1 capitalize">
                  {accessory.effect.replace('_', ' ')} effect
                </div>
              )}
              {!unlocked && (
                <div className="text-xs text-amber-200 mt-1">
                  Locked • {cost?.toLocaleString() ?? '—'} coins
                </div>
              )}
              {!unlocked && (
                <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-amber-200 bg-black/70 px-2 py-0.5 rounded-full">
                  Unlock
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {canCustomizeColor && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Accessory Color</label>
          <div className="grid grid-cols-4 gap-2">
            {accessoryColorPalette.map((colorOption) => (
              <button
                type="button"
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
type PresetRarity = 'common' | 'rare' | 'epic' | 'legendary';
type PresetFilter = PresetRarity | 'all' | 'owned' | 'locked';

type PresetCharacter = {
  name: string;
  description: string;
  rarity: PresetRarity;
  baseCost: number;
  colorTheme: ColorTheme;
  figureStyle: FigureStyle;
  accessory: Accessory;
  accessoryColor: string;
  animationStyle: AnimationStyle;
};

const rarityStyles: Record<PresetRarity, { label: string; className: string }> = {
  common: { label: 'Common', className: 'bg-gray-700 text-gray-200' },
  rare: { label: 'Rare', className: 'bg-blue-700/60 text-blue-100' },
  epic: { label: 'Epic', className: 'bg-purple-700/60 text-purple-100' },
  legendary: { label: 'Legendary', className: 'bg-amber-600/70 text-amber-50' },
};

const presetCharacters: PresetCharacter[] = [
  {
    name: "Ocean Warrior",
    description: "Balanced striker with crystalline shield shimmer.",
    rarity: "common",
    baseCost: 0,
    colorTheme: "blue",
    figureStyle: "normal",
    accessory: "crystal_shield",
    accessoryColor: "#87ceeb",
    animationStyle: "normal",
  },
  {
    name: "Fire Champion",
    description: "Heavy bruiser wielding the emberblade.",
    rarity: "rare",
    baseCost: 350,
    colorTheme: "red",
    figureStyle: "bulky",
    accessory: "flame_sword",
    accessoryColor: "#ff4444",
    animationStyle: "powerful",
  },
  {
    name: "Shadow Ninja",
    description: "Speed demon cloaked in midnight cloth.",
    rarity: "rare",
    baseCost: 420,
    colorTheme: "black",
    figureStyle: "slim",
    accessory: "ninja_mask",
    accessoryColor: "#2c3e50",
    animationStyle: "fast",
  },
  {
    name: "Mystic Sorcerer",
    description: "Arcane caster with shimmering glyphs.",
    rarity: "epic",
    baseCost: 520,
    colorTheme: "purple",
    figureStyle: "cartoonish",
    accessory: "wizard_hat",
    accessoryColor: "#8e44ad",
    animationStyle: "acrobatic",
  },
  {
    name: "Cyber Ninja",
    description: "Neon assassin with visor-linked HUD.",
    rarity: "epic",
    baseCost: 650,
    colorTheme: "cyber",
    figureStyle: "robot",
    accessory: "cyber_visor",
    accessoryColor: "#00ffff",
    animationStyle: "robotic",
  },
  {
    name: "Light Paladin",
    description: "Guardian bathed in cathedral glow.",
    rarity: "rare",
    baseCost: 300,
    colorTheme: "white",
    figureStyle: "normal",
    accessory: "halo",
    accessoryColor: "#ffffff",
    animationStyle: "normal",
  },
  {
    name: "Angel Guardian",
    description: "Graceful aerialist with luminous wings.",
    rarity: "epic",
    baseCost: 700,
    colorTheme: "white",
    figureStyle: "ethereal",
    accessory: "wings",
    accessoryColor: "#f0f8ff",
    animationStyle: "acrobatic",
  },
  {
    name: "Demon Lord",
    description: "Infernal powerhouse with molten horns.",
    rarity: "epic",
    baseCost: 540,
    colorTheme: "red",
    figureStyle: "bulky",
    accessory: "demon_horns",
    accessoryColor: "#8b0000",
    animationStyle: "powerful",
  },
  {
    name: "Royal Champion",
    description: "Tournament-ready monarch of the arena.",
    rarity: "rare",
    baseCost: 420,
    colorTheme: "orange",
    figureStyle: "normal",
    accessory: "crown",
    accessoryColor: "#ffd700",
    animationStyle: "normal",
  },
  {
    name: "Prism Warrior",
    description: "Crystal avatar that refracts every blow.",
    rarity: "legendary",
    baseCost: 900,
    colorTheme: "rainbow",
    figureStyle: "crystal",
    accessory: "energy_cape",
    accessoryColor: "#ff6b6b",
    animationStyle: "acrobatic",
  },
  {
    name: "Solar Strider",
    description: "Radiant striker with solar flares.",
    rarity: "legendary",
    baseCost: 950,
    colorTheme: "orange",
    figureStyle: "robot",
    accessory: "energy_cape",
    accessoryColor: "#ffaa00",
    animationStyle: "fast",
  },
  {
    name: "Frost Sentinel",
    description: "Glacial defender wielding aurora steel.",
    rarity: "epic",
    baseCost: 680,
    colorTheme: "blue",
    figureStyle: "crystal",
    accessory: "crystal_shield",
    accessoryColor: "#cce7ff",
    animationStyle: "powerful",
  },
];

const accessoryColorPalette = [
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
  { color: '#8888ff', name: 'Mystic Blue' },
];

export function FighterCustomizer() {
  const [activeTab, setActiveTab] = useState('player');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [economyNotice, setEconomyNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('all');
  const [sharePreview, setSharePreview] = useState('');
  const [importBuffer, setImportBuffer] = useState('');
  
  const {
    playerColorTheme,
    playerFigureStyle,
    playerBlendTargetStyle,
    playerBlendAmount,
    playerStyleOverrides,
    playerAccessory,
    playerAccessoryColor,
    playerAnimationStyle,
    playerInkStyle,
    playerInkOverrides,
    cpuColorTheme,
    cpuFigureStyle,
    cpuBlendTargetStyle,
    cpuBlendAmount,
    cpuStyleOverrides,
    cpuAccessory,
    cpuAccessoryColor,
    cpuAnimationStyle,
    cpuInkStyle,
    cpuInkOverrides,
    savedCharacters,
    setPlayerColorTheme,
    setPlayerFigureStyle,
    setPlayerBlendTargetStyle,
    setPlayerBlendAmount,
    updatePlayerStyleOverrides,
    resetPlayerStyleOverrides,
    setPlayerAccessory,
    setPlayerAnimationStyle,
    setPlayerInkStyle,
    setPlayerInkOverrides,
    setCPUColorTheme,
    setCPUFigureStyle,
    setCPUBlendTargetStyle,
    setCPUBlendAmount,
    updateCPUStyleOverrides,
    resetCPUStyleOverrides,
    setCPUAccessory,
    setCPUAnimationStyle,
    setCPUInkStyle,
    setCPUInkOverrides,
    saveCharacter,
    loadCharacter,
    deleteCharacter,
    resetCustomizations,
    coins,
    purchaseCosmetic,
    isCosmeticUnlocked,
    getCostForCosmetic,
    recentCoinEvents = [],
    economySyncError,
    unlockedColorThemes,
    unlockedFigureStyles,
    unlockedAccessories,
    unlockedAnimationStyles,
    getPlayerStyle,
    getCPUStyle,
  } = useCustomization();

  const describeCosmetic = (slot: CosmeticSlot, id: string) => {
    switch (slot) {
      case 'colorTheme':
        return colorThemes[id as keyof typeof colorThemes]?.name ?? id;
      case 'figureStyle':
        return figureStyles[id as keyof typeof figureStyles]?.name ?? id;
      case 'accessory':
        return accessories[id as keyof typeof accessories]?.name ?? id;
      case 'animationStyle':
        const animStyle = animationStyles[id as keyof typeof animationStyles];
        return (animStyle && typeof animStyle === 'object' && 'name' in animStyle) ? String(animStyle.name) : id;
      default:
        return id;
    }
  };

  const attemptPurchase = (slot: CosmeticSlot, id: string) => {
    const result = purchaseCosmetic(slot, id);
    if (!result.success) {
      const message =
        result.error === 'insufficient_funds'
          ? 'Not enough coins. Land more hits and finish rounds to earn currency.'
          : 'Unable to unlock this cosmetic right now.';
      setEconomyNotice({ type: 'error', message });
      return false;
    }
    const prettyName = describeCosmetic(slot, id);
    const costText = result.cost ? `${result.cost.toLocaleString()} coin${result.cost === 1 ? '' : 's'}` : 'coins';
    setEconomyNotice({
      type: 'success',
      message: `Unlocked ${prettyName} for ${costText}!`,
    });
    return true;
  };

  const randomChoice = <T,>(items: T[]): T | null => {
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
  };

  const getPresetRequirements = (preset: PresetCharacter) => [
    { slot: 'colorTheme' as const, id: preset.colorTheme },
    { slot: 'figureStyle' as const, id: preset.figureStyle },
    { slot: 'accessory' as const, id: preset.accessory },
    { slot: 'animationStyle' as const, id: preset.animationStyle },
  ];

  const getPresetUnlockCost = (preset: PresetCharacter) =>
    getPresetRequirements(preset).reduce((total, req) => {
      if (isCosmeticUnlocked(req.slot, req.id)) return total;
      return total + (getCostForCosmetic(req.slot, req.id) ?? 0);
    }, 0);

  const ensurePresetUnlocked = (preset: PresetCharacter) => {
    return getPresetRequirements(preset).every((req) => {
      if (isCosmeticUnlocked(req.slot, req.id)) return true;
      return attemptPurchase(req.slot, req.id);
    });
  };

  const handlePresetEquip = (preset: PresetCharacter, target: 'player' | 'cpu' = (activeTab === 'player' ? 'player' : 'cpu')) => {
    if (!ensurePresetUnlocked(preset)) {
      return;
    }
    loadPreset(preset, target);
    setEconomyNotice({
      type: 'success',
      message: `${preset.name} equipped on ${target === 'player' ? 'Player' : 'CPU'}!`,
    });
  };

  const randomizeFighter = (target: 'player' | 'cpu') => {
    const themePool = unlockedColorThemes.length
      ? (unlockedColorThemes as ColorTheme[])
      : (Object.keys(colorThemes) as ColorTheme[]);
    const stylePool = unlockedFigureStyles.length
      ? (unlockedFigureStyles as FigureStyle[])
      : (Object.keys(figureStyles) as FigureStyle[]);
    const accessoryPool = unlockedAccessories.length
      ? (unlockedAccessories as Accessory[])
      : (Object.keys(accessories) as Accessory[]);
    const animationPool = unlockedAnimationStyles.length
      ? (unlockedAnimationStyles as AnimationStyle[])
      : (Object.keys(animationStyles) as AnimationStyle[]);

    const theme = randomChoice(themePool) ?? 'blue';
    const style = randomChoice(stylePool) ?? 'normal';
    const accessory = randomChoice(accessoryPool) ?? 'none';
    const animation = randomChoice(animationPool) ?? 'normal';
    const accessoryColor = randomChoice(accessoryColorPalette)?.color ?? '#ffffff';

    if (target === 'player') {
      setPlayerColorTheme(theme);
      setPlayerFigureStyle(style);
      setPlayerAccessory(accessory, accessoryColor);
      setPlayerAnimationStyle(animation);
    } else {
      setCPUColorTheme(theme);
      setCPUFigureStyle(style);
      setCPUAccessory(accessory, accessoryColor);
      setCPUAnimationStyle(animation);
    }
  };

  const copyPlayerToCpu = () => {
    setCPUColorTheme(playerColorTheme);
    setCPUFigureStyle(playerFigureStyle);
    setCPUBlendTargetStyle(playerBlendTargetStyle);
    setCPUBlendAmount(playerBlendAmount);
    resetCPUStyleOverrides();
    if (playerStyleOverrides) {
      updateCPUStyleOverrides(playerStyleOverrides);
    }
    setCPUAccessory(playerAccessory, playerAccessoryColor);
    setCPUAnimationStyle(playerAnimationStyle);
    setCPUInkStyle(playerInkStyle);
    setCPUInkOverrides(playerInkOverrides);
    setEconomyNotice({
      type: 'success',
      message: 'Copied player style to CPU.',
    });
  };

  const copyCpuToPlayer = () => {
    setPlayerColorTheme(cpuColorTheme);
    setPlayerFigureStyle(cpuFigureStyle);
    setPlayerBlendTargetStyle(cpuBlendTargetStyle);
    setPlayerBlendAmount(cpuBlendAmount);
    resetPlayerStyleOverrides();
    if (cpuStyleOverrides) {
      updatePlayerStyleOverrides(cpuStyleOverrides);
    }
    setPlayerAccessory(cpuAccessory, cpuAccessoryColor);
    setPlayerAnimationStyle(cpuAnimationStyle);
    setPlayerInkStyle(cpuInkStyle);
    setPlayerInkOverrides(cpuInkOverrides);
    setEconomyNotice({
      type: 'success',
      message: 'Copied CPU style to player.',
    });
  };

  const handleRandomizeActive = () => {
    randomizeFighter(activeTab === 'player' ? 'player' : 'cpu');
  };

  const buildSnapshot = (target: 'player' | 'cpu'): SavedCharacter => {
    const isPlayer = target === 'player';
    return {
      id: `${target}_share_${Date.now()}`,
      name: `${isPlayer ? 'Player' : 'CPU'} Fighter`,
      colorTheme: isPlayer ? playerColorTheme : cpuColorTheme,
      figureStyle: isPlayer ? playerFigureStyle : cpuFigureStyle,
      figureBlendTarget: isPlayer ? playerBlendTargetStyle : cpuBlendTargetStyle,
      figureBlendAmount: isPlayer ? playerBlendAmount : cpuBlendAmount,
      figureStyleOverrides: isPlayer ? playerStyleOverrides : cpuStyleOverrides,
      accessory: isPlayer ? playerAccessory : cpuAccessory,
      accessoryColor: isPlayer ? playerAccessoryColor : cpuAccessoryColor,
      animationStyle: isPlayer ? playerAnimationStyle : cpuAnimationStyle,
      inkStyle: isPlayer ? playerInkStyle : cpuInkStyle,
      inkOverrides: isPlayer ? playerInkOverrides : cpuInkOverrides,
      createdAt: new Date().toISOString(),
    };
  };

  const handleCopyConfig = async (target: 'player' | 'cpu') => {
    const json = JSON.stringify(buildSnapshot(target), null, 2);
    setSharePreview(json);
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setEconomyNotice({
          type: 'success',
          message: `Copied ${target === 'player' ? 'player' : 'CPU'} fighter JSON.`,
        });
      } else {
        throw new Error('Clipboard not available');
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      setEconomyNotice({
        type: 'error',
        message: 'Clipboard unavailable. Copy from the preview text instead.',
      });
    }
  };

  const handleImportConfig = (target: 'player' | 'cpu') => {
    if (!importBuffer.trim()) {
      setEconomyNotice({
        type: 'error',
        message: 'Paste fighter JSON before importing.',
      });
      return;
    }
    try {
      const parsed = JSON.parse(importBuffer);
      if (!parsed.colorTheme || !parsed.figureStyle) {
        throw new Error('Missing required fields');
      }
      const payload: SavedCharacter = {
        id: parsed.id ?? `import_${Date.now()}`,
        name: parsed.name ?? 'Imported Fighter',
        colorTheme: parsed.colorTheme,
        figureStyle: parsed.figureStyle,
        figureBlendTarget: parsed.figureBlendTarget ?? null,
        figureBlendAmount: parsed.figureBlendAmount ?? 0,
        figureStyleOverrides: parsed.figureStyleOverrides ?? null,
        accessory: parsed.accessory ?? 'none',
        accessoryColor: parsed.accessoryColor ?? '#ffffff',
        animationStyle: parsed.animationStyle ?? 'normal',
        inkStyle: parsed.inkStyle ?? 'classic',
        inkOverrides: parsed.inkOverrides ?? null,
        createdAt: parsed.createdAt ?? new Date().toISOString(),
      };
      loadCharacter(payload, target === 'player');
      setImportBuffer('');
      setEconomyNotice({
        type: 'success',
        message: `Imported ${target === 'player' ? 'player' : 'CPU'} fighter.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      setEconomyNotice({
        type: 'error',
        message: 'Invalid fighter JSON payload.',
      });
    }
  };

  const filteredPresets = useMemo(() => {
    return presetCharacters.filter((preset) => {
      const missingCost = getPresetUnlockCost(preset);
      const owned = missingCost === 0;
      switch (presetFilter) {
        case 'owned':
          return owned;
        case 'locked':
          return !owned;
        case 'common':
        case 'rare':
        case 'epic':
        case 'legendary':
          return preset.rarity === presetFilter;
        default:
          return true;
      }
    });
  }, [presetFilter, unlockedAccessories, unlockedAnimationStyles, unlockedColorThemes, unlockedFigureStyles, coins]);

  const presetFilterOptions: Array<{ id: PresetFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'owned', label: 'Owned' },
    { id: 'locked', label: 'Locked' },
    { id: 'common', label: 'Common' },
    { id: 'rare', label: 'Rare' },
    { id: 'epic', label: 'Epic' },
    { id: 'legendary', label: 'Legendary' },
  ];
  const figureStyleKeys = useMemo(() => Object.keys(figureStyles) as FigureStyle[], []);
  const livePlayerStyle = getPlayerStyle();
  const liveCPUStyle = getCPUStyle();
  const isPlayerTab = activeTab === 'player';
  const activeStyle = isPlayerTab ? livePlayerStyle : liveCPUStyle;
  const activeStyleOverrides = isPlayerTab ? playerStyleOverrides : cpuStyleOverrides;
  const activeInkOverrides = isPlayerTab ? playerInkOverrides : cpuInkOverrides;
  const activeInkStyleId = isPlayerTab ? playerInkStyle : cpuInkStyle;
  const activeInkBase = inkStyles[activeInkStyleId] ?? inkStyles.classic;
  const activeBlendTarget = isPlayerTab ? playerBlendTargetStyle : cpuBlendTargetStyle;
  const activeBlendAmount = isPlayerTab ? playerBlendAmount : cpuBlendAmount;
  const handleStyleOverrideChange = (patch: Partial<FigureStyleOverrides>) => {
    if (isPlayerTab) {
      updatePlayerStyleOverrides(patch);
    } else {
      updateCPUStyleOverrides(patch);
    }
  };
  const handleResetStyleOverrides = () => {
    if (isPlayerTab) {
      resetPlayerStyleOverrides();
    } else {
      resetCPUStyleOverrides();
    }
  };
  const handleInkOverrideChange = (patch: Partial<InkOverrides>) => {
    if (isPlayerTab) {
      setPlayerInkOverrides({ ...(playerInkOverrides ?? {}), ...patch });
    } else {
      setCPUInkOverrides({ ...(cpuInkOverrides ?? {}), ...patch });
    }
  };
  const handleResetInkOverrides = () => {
    if (isPlayerTab) {
      setPlayerInkOverrides(null);
    } else {
      setCPUInkOverrides(null);
    }
  };
  const handleBlendTargetChange = (style: FigureStyle | null) => {
    if (isPlayerTab) {
      setPlayerBlendTargetStyle(style);
      if (!style) setPlayerBlendAmount(0);
    } else {
      setCPUBlendTargetStyle(style);
      if (!style) setCPUBlendAmount(0);
    }
  };
  const handleBlendAmountChange = (amount: number) => {
    if (isPlayerTab) {
      setPlayerBlendAmount(amount);
    } else {
      setCPUBlendAmount(amount);
    }
  };

  useEffect(() => {
    if (!economyNotice) return;
    const timeout = setTimeout(() => setEconomyNotice(null), 3500);
    return () => clearTimeout(timeout);
  }, [economyNotice]);

  const { startGame } = useFighting();

  // Save current character configuration with custom name
  const handleSaveCharacter = () => {
    try {
      if (characterName.trim()) {
        saveCharacter(characterName.trim(), activeTab === 'player');
        setCharacterName('');
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error('Error saving character:', error);
    }
  };

  // Load a preset character with error handling
  const loadPreset = (preset: PresetCharacter, targetTab: 'player' | 'cpu' = activeTab as 'player' | 'cpu') => {
    try {
      if (targetTab === 'player') {
        setPlayerColorTheme(preset.colorTheme);
        setPlayerFigureStyle(preset.figureStyle);
        setPlayerBlendTargetStyle(null);
        setPlayerBlendAmount(0);
        resetPlayerStyleOverrides();
        setPlayerAccessory(preset.accessory, preset.accessoryColor);
        setPlayerAnimationStyle(preset.animationStyle);
        setPlayerInkOverrides(null);
      } else {
        setCPUColorTheme(preset.colorTheme);
        setCPUFigureStyle(preset.figureStyle);
        setCPUBlendTargetStyle(null);
        setCPUBlendAmount(0);
        resetCPUStyleOverrides();
        setCPUAccessory(preset.accessory, preset.accessoryColor);
        setCPUAnimationStyle(preset.animationStyle);
        setCPUInkOverrides(null);
      }
    } catch (error) {
      console.error('Error loading preset:', error);
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gray-900/60 border-gray-700">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-amber-300">
                <Coins className="w-8 h-8" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Coin Balance</p>
                  <p className="text-3xl font-bold text-amber-100">{coins.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-sm text-gray-400 max-w-2xl">
                Earn coins automatically during fights by landing hits, extending combos, and closing out rounds. Spend them here to unlock premium color themes, figure styles, accessories, and animation sets.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Palette className="w-5 h-5 text-amber-300" />
                Recent Coin Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCoinEvents.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Play a match to start building a ledger of hits, knockouts, and cosmetic purchases.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentCoinEvents.map((entry, index) => {
                    const isCredit = entry.direction === 'credit';
                    return (
                      <li
                        key={`${entry.timestamp}-${entry.reason}-${index}`}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`p-2 rounded-full ${
                            isCredit ? 'bg-green-500/20 text-green-300' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 text-sm text-gray-200">
                          <div className="flex items-center justify-between gap-3">
                            <span>{describeLedgerReason(entry)}</span>
                            <span className={isCredit ? 'text-green-300' : 'text-rose-300'}>
                              {isCredit ? '+' : '-'}
                              {entry.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatLedgerTimestamp(entry.timestamp)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {economySyncError && (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {economySyncError}
          </div>
        )}

        {economyNotice && (
          <div
            className="fixed bottom-6 right-6 z-50 pointer-events-auto"
            role="status"
            aria-live="polite"
          >
            <div
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border ${
                economyNotice.type === 'success'
                  ? 'bg-green-900/80 border-green-500 text-green-100'
                  : 'bg-rose-900/80 border-rose-500 text-rose-100'
              }`}
            >
              {economyNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{economyNotice.message}</span>
            </div>
          </div>
        )}

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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pointer-events-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRandomizeActive}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Randomize {activeTab === 'player' ? 'Player' : 'CPU'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyPlayerToCpu}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Player → CPU
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyCpuToPlayer}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2 rotate-180" />
                    CPU → Player
                  </Button>
                </div>

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
                    onChange={(color) => {
                      try {
                        if (activeTab === 'player') {
                          setPlayerColorTheme(color as any);
                        } else {
                          setCPUColorTheme(color as any);
                        }
                      } catch (error) {
                        console.error('Error setting color theme:', error);
                      }
                    }}
                    isUnlocked={(colorId) => isCosmeticUnlocked('colorTheme', colorId)}
                    getCost={(colorId) => getCostForCosmetic('colorTheme', colorId)}
                    onAttemptPurchase={(colorId) => attemptPurchase('colorTheme', colorId)}
                  />

                  {/* Figure Style */}
                  <StyleSelector
                    label="Body Style"
                    value={activeTab === 'player' ? playerFigureStyle : cpuFigureStyle}
                    onChange={(style) => {
                      try {
                        if (activeTab === 'player') {
                          setPlayerFigureStyle(style as any);
                        } else {
                          setCPUFigureStyle(style as any);
                        }
                      } catch (error) {
                        console.error('Error setting figure style:', error);
                      }
                    }}
                    options={figureStyles}
                    isUnlocked={(styleId) => isCosmeticUnlocked('figureStyle', styleId)}
                    getCost={(styleId) => getCostForCosmetic('figureStyle', styleId)}
                    onAttemptPurchase={(styleId) => attemptPurchase('figureStyle', styleId)}
                  />

                  {/* Accessories */}
                  <AccessorySelector
                    label="Accessories"
                    value={activeTab === 'player' ? playerAccessory : cpuAccessory}
                    color={activeTab === 'player' ? playerAccessoryColor : cpuAccessoryColor}
                    onChange={(accessory) => {
                      try {
                        if (activeTab === 'player') {
                          setPlayerAccessory(accessory as any, playerAccessoryColor);
                        } else {
                          setCPUAccessory(accessory as any, cpuAccessoryColor);
                        }
                      } catch (error) {
                        console.error('Error setting accessory:', error);
                      }
                    }}
                    onColorChange={(color) => {
                      try {
                        if (activeTab === 'player') {
                          setPlayerAccessory(playerAccessory, color);
                        } else {
                          setCPUAccessory(cpuAccessory, color);
                        }
                      } catch (error) {
                        console.error('Error setting accessory color:', error);
                      }
                    }}
                    isUnlocked={(accessoryId) => isCosmeticUnlocked('accessory', accessoryId)}
                    getCost={(accessoryId) => getCostForCosmetic('accessory', accessoryId)}
                    onAttemptPurchase={(accessoryId) => attemptPurchase('accessory', accessoryId)}
                  />

                  {/* Animation Style */}
                  <StyleSelector
                    label="Fighting Style"
                    value={activeTab === 'player' ? playerAnimationStyle : cpuAnimationStyle}
                    onChange={(style) => {
                      try {
                        if (activeTab === 'player') {
                          setPlayerAnimationStyle(style as AnimationStyle);
                        } else {
                          setCPUAnimationStyle(style as AnimationStyle);
                        }
                      } catch (error) {
                        console.error('Error setting animation style:', error);
                      }
                    }}
                    options={animationStyles}
                    isUnlocked={(styleId) => isCosmeticUnlocked('animationStyle', styleId)}
                    getCost={(styleId) => getCostForCosmetic('animationStyle', styleId)}
                    onAttemptPurchase={(styleId) => attemptPurchase('animationStyle', styleId)}
                  />

                  {/* Ink Style */}
                  <InkStyleSelector
                    label="Ink Shader Style"
                    value={activeTab === 'player' ? playerInkStyle : cpuInkStyle}
                    onChange={(style) => {
                      try {
                        if (activeTab === 'player') {
                          setPlayerInkStyle(style);
                        } else {
                          setCPUInkStyle(style);
                        }
                      } catch (error) {
                        console.error('Error setting ink style:', error);
                      }
                    }}
                  />
                </div>

                <Separator className="my-6 bg-gray-600" />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Advanced Silhouette & Ink</h3>
                  <FigureBlendControls
                    baseStyle={activeTab === 'player' ? playerFigureStyle : cpuFigureStyle}
                    blendTarget={activeBlendTarget}
                    blendAmount={activeBlendTarget ? activeBlendAmount : 0}
                    styleOptions={figureStyleKeys}
                    onTargetChange={handleBlendTargetChange}
                    onBlendChange={handleBlendAmountChange}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SilhouetteOverrideControls
                      label="Silhouette Lab"
                      style={activeStyle}
                      overrides={activeStyleOverrides}
                      onChange={handleStyleOverrideChange}
                      onReset={handleResetStyleOverrides}
                    />
                    <InkOverrideControls
                      label="Ink Overrides"
                      baseStyle={activeInkBase}
                      overrides={activeInkOverrides}
                      onChange={handleInkOverrideChange}
                      onReset={handleResetInkOverrides}
                    />
                  </div>
                </div>

                <Separator className="my-6 bg-gray-600" />

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Share & Import
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col md:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCopyConfig(isPlayerTab ? 'player' : 'cpu')}
                        className="border-blue-500 text-blue-200 hover:bg-blue-900/30"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy {isPlayerTab ? 'Player' : 'CPU'} JSON
                      </Button>
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={importBuffer}
                          onChange={(event) => setImportBuffer(event.target.value)}
                          placeholder="Paste fighter JSON to import"
                          className="bg-gray-800 border-gray-600 text-gray-100 flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => handleImportConfig(isPlayerTab ? 'player' : 'cpu')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Import
                        </Button>
                      </div>
                    </div>
                    {sharePreview && (
                      <textarea
                        readOnly
                        value={sharePreview}
                        className="w-full h-36 bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-200"
                      />
                    )}
                    <p className="text-xs text-gray-400">
                      Exports capture blend, silhouette, accessory, and ink settings. Imports apply to whichever tab
                      (Player or CPU) is active.
                    </p>
                  </div>
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
                    Curated Presets
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {presetFilterOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPresetFilter(option.id)}
                        className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase ${
                          presetFilter === option.id
                            ? 'border-amber-400 text-amber-200 bg-amber-500/10'
                            : 'border-gray-600 text-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400">
                    {filteredPresets.length} preset{filteredPresets.length === 1 ? '' : 's'} match your filter.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPresets.map((preset) => {
                      const rarityMeta = rarityStyles[preset.rarity];
                      const missingCost = getPresetUnlockCost(preset);
                      const owned = missingCost === 0;
                      const canAfford = owned || coins >= missingCost;
                      return (
                        <div
                          key={preset.name}
                          className="p-4 rounded-xl border border-gray-700 bg-gray-900/40 hover:border-gray-500 transition-all flex flex-col gap-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-white">{preset.name}</div>
                              <div className="text-xs text-gray-400">
                                {figureStyles[preset.figureStyle].name} • {colorThemes[preset.colorTheme].name}
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase ${rarityMeta.className}`}>
                              {rarityMeta.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 min-h-[40px]">{preset.description}</p>
                          <div 
                            className="w-full h-2 rounded"
                            style={{ 
                              background: `linear-gradient(90deg, ${colorThemes[preset.colorTheme].primary}, ${colorThemes[preset.colorTheme].secondary})` 
                            }}
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">
                              {owned ? 'All cosmetics unlocked' : `Needs ${missingCost.toLocaleString()} coins`}
                            </span>
                            <span className="text-amber-200">
                              Base value: {preset.baseCost.toLocaleString()}c
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              onClick={() => handlePresetEquip(preset, 'player')}
                              disabled={!canAfford}
                              className={`w-full ${owned ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {owned ? 'Equip Player' : canAfford ? 'Unlock+Equip' : 'Need coins'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handlePresetEquip(preset, 'cpu')}
                              disabled={!canAfford}
                              className="border-gray-600 text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {owned ? 'Equip CPU' : 'Locked'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
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
