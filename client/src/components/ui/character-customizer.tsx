import React from "react";
import { useCustomization, ColorTheme, FigureStyle, Accessory, colorThemes, figureStyles, accessories } from "../../lib/stores/useCustomization";

// CSS classes for customization UI
const buttonClass = "px-2 py-1 mx-1 my-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm";
const activeButtonClass = "px-2 py-1 mx-1 my-1 rounded bg-green-500 hover:bg-green-600 text-white text-sm";
const sectionClass = "flex flex-col p-2 mb-2 border border-gray-300 rounded";
const sectionTitleClass = "text-lg font-bold mb-2";
const colorButtonClass = "w-6 h-6 m-1 rounded-full cursor-pointer border border-gray-300";

export function CharacterCustomizer() {
  const {
    playerColorTheme,
    playerFigureStyle,
    playerAccessory,
    playerAccessoryColor,
    
    cpuColorTheme,
    cpuFigureStyle,
    cpuAccessory,
    cpuAccessoryColor,
    
    // Player customization actions
    setPlayerColorTheme,
    setPlayerFigureStyle,
    setPlayerAccessory,
    
    // CPU customization actions
    setCPUColorTheme,
    setCPUFigureStyle,
    setCPUAccessory,
    
    // Reset customizations
    resetCustomizations
  } = useCustomization();

  // Available color schemes and styles
  const colorSchemes = Object.keys(colorThemes) as ColorTheme[];
  const figureStylesList = Object.keys(figureStyles) as FigureStyle[];
  const accessoryList = Object.keys(accessories) as Accessory[];

  return (
    <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Character Customization</h2>
      
      {/* Player Customization Section */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Player Character</h3>
        
        {/* Color Theme Selection */}
        <div className="mb-3">
          <h4 className="font-semibold mb-1">Color Theme</h4>
          <div className="flex flex-wrap">
            {colorSchemes.map((color) => (
              <button
                key={color}
                className={colorButtonClass}
                style={{ 
                  backgroundColor: colorThemes[color].primary,
                  border: playerColorTheme === color ? '2px solid black' : '1px solid #ccc'
                }}
                onClick={() => setPlayerColorTheme(color)}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>
        
        {/* Figure Style Selection */}
        <div className="mb-3">
          <h4 className="font-semibold mb-1">Body Style</h4>
          <div className="flex flex-wrap">
            {figureStylesList.map((style) => (
              <button
                key={style}
                className={playerFigureStyle === style ? activeButtonClass : buttonClass}
                onClick={() => setPlayerFigureStyle(style)}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Accessory Selection */}
        <div className="mb-2">
          <h4 className="font-semibold mb-1">Accessories</h4>
          <div className="flex flex-wrap">
            {accessoryList.map((accessory) => (
              <button
                key={accessory}
                className={playerAccessory === accessory ? activeButtonClass : buttonClass}
                onClick={() => setPlayerAccessory(accessory)}
              >
                {accessories[accessory].name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* CPU Customization Section */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>CPU Character</h3>
        
        {/* Color Theme Selection */}
        <div className="mb-3">
          <h4 className="font-semibold mb-1">Color Theme</h4>
          <div className="flex flex-wrap">
            {colorSchemes.map((color) => (
              <button
                key={color}
                className={colorButtonClass}
                style={{ 
                  backgroundColor: colorThemes[color].primary,
                  border: cpuColorTheme === color ? '2px solid black' : '1px solid #ccc'
                }}
                onClick={() => setCPUColorTheme(color)}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>
        
        {/* Figure Style Selection */}
        <div className="mb-3">
          <h4 className="font-semibold mb-1">Body Style</h4>
          <div className="flex flex-wrap">
            {figureStylesList.map((style) => (
              <button
                key={style}
                className={cpuFigureStyle === style ? activeButtonClass : buttonClass}
                onClick={() => setCPUFigureStyle(style)}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Accessory Selection */}
        <div className="mb-2">
          <h4 className="font-semibold mb-1">Accessories</h4>
          <div className="flex flex-wrap">
            {accessoryList.map((accessory) => (
              <button
                key={accessory}
                className={cpuAccessory === accessory ? activeButtonClass : buttonClass}
                onClick={() => setCPUAccessory(accessory)}
              >
                {accessories[accessory].name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Reset Button */}
      <div className="flex justify-center mt-3">
        <button 
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
          onClick={resetCustomizations}
        >
          Reset All Customizations
        </button>
      </div>
    </div>
  );
}