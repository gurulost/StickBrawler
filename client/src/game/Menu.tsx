import { useState, useEffect, useRef } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { CharacterCustomizer } from "../components/ui/character-customizer";

// Animated particles for background effect
const Particle = ({ delay = 0 }: { delay?: number }) => {
  // Use refs to avoid style property conflicts during re-renders
  const size = useRef(Math.random() * 3 + 1);
  const duration = useRef(Math.random() * 10 + 15);
  const initialX = useRef(Math.random() * 100);
  const initialY = useRef(Math.random() * 100 + 20);
  
  return (
    <div 
      className="absolute rounded-full bg-white opacity-70 z-0"
      style={{
        width: `${size.current}px`,
        height: `${size.current}px`,
        left: `${initialX.current}%`,
        top: `${initialY.current}%`,
        boxShadow: `0 0 ${size.current * 2}px ${size.current}px rgba(255, 255, 255, 0.3)`,
        animationName: 'floatParticle',
        animationDuration: `${duration.current}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationDelay: `${delay}s`
      }}
    />
  );
};

// Animated stick figure component
const StickFigure = ({ 
  color, 
  position, 
  animationDelay = 0,
  isAttacking = false,
  isDefending = false,
  isJumping = false,
  fadeIn = false
}: { 
  color: string;
  position: 'left' | 'right';
  animationDelay?: number; 
  isAttacking?: boolean;
  isDefending?: boolean;
  isJumping?: boolean;
  fadeIn?: boolean;
}) => {
  const positionStyle = position === 'left' 
    ? { left: '1.5rem' } 
    : { right: '1.5rem' };
  
  // We'll use inline styles for animation properties to avoid conflicts
  const getAnimationStyle = () => {
    let animationName = 'idle';
    
    if (isJumping) {
      animationName = 'jump';
    } else if (isAttacking) {
      animationName = 'attack';
    }
    
    return {
      animationName,
      animationDuration: isJumping ? '1.5s' : isAttacking ? '2s' : '4s',
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
      animationDelay: `${animationDelay}s`
    };
  };
  
  const scaleStyle = position === 'right' ? { transform: 'scaleX(-1)' } : {};
  
  // For fade-in animation, we'll use a class instead of inline style to avoid conflicts
  const fadeInClass = fadeIn ? 'animate-fadeIn' : '';
  
  return (
    <div 
      className={`absolute top-4 ${fadeInClass}`}
      style={{ 
        ...positionStyle, 
        ...getAnimationStyle()
      }}
    >
      <div className="relative" style={scaleStyle}>
        {/* Head */}
        <div className={`w-6 h-6 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} rounded-full shadow-lg ${isDefending ? 'ring-2 ring-yellow-300' : ''}`}></div>
        
        {/* Body */}
        <div className={`w-2 h-28 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} mx-auto shadow-md`}></div>
        
        {/* Arms */}
        <div className="flex justify-center">
          <div className={`w-2 h-16 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} origin-top shadow-md transition-all duration-200`} 
               style={{ transform: `rotate(${isAttacking ? '-90deg' : '-45deg'})` }}></div>
          <div className={`w-2 h-16 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} origin-top shadow-md transition-all duration-200`}
               style={{ transform: `rotate(${isDefending ? '0deg' : '45deg'})` }}></div>
        </div>
        
        {/* Legs */}
        <div className="flex justify-center mt-2">
          <div className={`w-2 h-20 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} origin-top shadow-md transition-all duration-200`}
               style={{ transform: `rotate(${isJumping ? '-30deg' : '-15deg'})` }}></div>
          <div className={`w-2 h-20 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} origin-top shadow-md transition-all duration-200`}
               style={{ transform: `rotate(${isJumping ? '30deg' : '15deg'})` }}></div>
        </div>
        
        {/* Visual effects */}
        {isAttacking && (
          <div className="absolute -right-5 top-8 text-yellow-300 text-2xl" 
               style={{ animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}>
            💥
          </div>
        )}
        
        {isDefending && (
          <div className="absolute -right-2 top-16 w-8 h-8 border-4 border-yellow-300 rounded-full opacity-70"
               style={{ animation: 'pulse 1s infinite alternate' }}></div>
        )}
      </div>
    </div>
  );
};

// Main menu component
const Menu = () => {
  const { startGame } = useFighting();
  const { playBackgroundMusic, toggleMute, isMuted, setMasterVolume, masterVolume } = useAudio();
  
  // UI state management
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [menuSection, setMenuSection] = useState<'main' | 'controls' | 'customization'>('main');
  
  // Animation states
  const [titleEffect, setTitleEffect] = useState(0);
  const [particles, setParticles] = useState<number[]>([]);
  const [leftFighterState, setLeftFighterState] = useState({
    isAttacking: false,
    isDefending: false,
    isJumping: false
  });
  const [rightFighterState, setRightFighterState] = useState({
    isAttacking: false,
    isDefending: false,
    isJumping: false
  });
  
  // Refs for animation
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate particles for background
  useEffect(() => {
    const particleCount = 30;
    const newParticles = Array.from({ length: particleCount }, (_, i) => i);
    setParticles(newParticles);
  }, []);
  
  // Animated title effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTitleEffect(prev => (prev + 1) % 3);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Animate stick figures
  useEffect(() => {
    // Random animation timing for fighters
    const animateLeftFighter = () => {
      const action = Math.floor(Math.random() * 4);
      
      // Reset all states
      setLeftFighterState({
        isAttacking: false,
        isDefending: false,
        isJumping: false
      });
      
      // Set new state based on random action
      switch(action) {
        case 0: // Attack
          setLeftFighterState(prev => ({ ...prev, isAttacking: true }));
          break;
        case 1: // Defend
          setLeftFighterState(prev => ({ ...prev, isDefending: true }));
          break;
        case 2: // Jump
          setLeftFighterState(prev => ({ ...prev, isJumping: true }));
          break;
        // default is idle
      }
      
      // Schedule next animation
      setTimeout(animateLeftFighter, Math.random() * 3000 + 2000);
    };
    
    const animateRightFighter = () => {
      const action = Math.floor(Math.random() * 4);
      
      // Reset all states
      setRightFighterState({
        isAttacking: false,
        isDefending: false,
        isJumping: false
      });
      
      // Set new state based on random action
      switch(action) {
        case 0: // Attack
          setRightFighterState(prev => ({ ...prev, isAttacking: true }));
          break;
        case 1: // Defend
          setRightFighterState(prev => ({ ...prev, isDefending: true }));
          break;
        case 2: // Jump
          setRightFighterState(prev => ({ ...prev, isJumping: true }));
          break;
        // default is idle
      }
      
      // Schedule next animation
      setTimeout(animateRightFighter, Math.random() * 3000 + 2000);
    };
    
    // Start animation loops
    const leftTimer = setTimeout(animateLeftFighter, 2000);
    const rightTimer = setTimeout(animateRightFighter, 3500);
    
    return () => {
      clearTimeout(leftTimer);
      clearTimeout(rightTimer);
    };
  }, []);
  
  // Start background music when component mounts
  useEffect(() => {
    // Short delay to ensure audio is loaded
    const timer = setTimeout(() => {
      playBackgroundMusic();
      console.log("Background music started from menu");
    }, 800);
    
    return () => {
      clearTimeout(timer);
    };
  }, [playBackgroundMusic]);

  // Handle game start with animation
  const handleStartGame = () => {
    setIsAnimating(true);
    setTimeout(() => {
      startGame();
    }, 700);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
  };
  
  // Navigation helpers
  const showMainMenu = () => {
    setMenuSection('main');
    setShowCustomizer(false);
    setShowAdvancedControls(false);
  };
  
  const showControlsMenu = () => {
    setMenuSection('controls');
  };
  
  const showCustomizationMenu = () => {
    setMenuSection('customization');
    setShowCustomizer(true);
  };
  
  // Title animation variations based on effect state
  const getTitleClass = () => {
    switch(titleEffect) {
      case 0:
        return 'text-yellow-300 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]';
      case 1:
        return 'text-blue-300 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]';
      case 2:
        return 'text-red-300 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]';
      default:
        return 'text-white';
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-indigo-900 to-purple-900 transition-opacity duration-700 overflow-hidden ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Particle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((_, index) => (
          <Particle key={index} delay={index * 0.2} />
        ))}
      </div>
      
      {/* Content container */}
      <div className="text-center px-4 max-w-6xl mx-auto z-10 relative">
        {/* Title with glow animation */}
        <h1 
          ref={titleRef}
          className={`text-8xl font-bold mb-10 transition-all duration-1000 tracking-wider ${getTitleClass()}`}
        >
          STICK FIGHTER
        </h1>
        
        {/* Dynamic subtitle that changes with title color */}
        <h2 className="text-2xl font-light mb-12 text-gray-300 tracking-wide">
          MASTER THE ART OF STICK COMBAT
        </h2>
        
        {/* Interactive fighting scene */}
        <div className="relative w-96 h-96 mx-auto mb-10">
          {/* Interactive background elements - Ground/Platform */}
          <div className="absolute inset-x-0 bottom-10 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-80 rounded-full shadow-md"></div>
          <div className="absolute inset-x-10 bottom-9 h-4 bg-gradient-to-b from-indigo-900/30 to-transparent blur-sm rounded-full"></div>
          
          {/* Fighting characters with dynamic animations */}
          <StickFigure 
            color="blue" 
            position="left" 
            isAttacking={leftFighterState.isAttacking}
            isDefending={leftFighterState.isDefending}
            isJumping={leftFighterState.isJumping}
            fadeIn={true}
          />
          
          <StickFigure 
            color="red" 
            position="right" 
            animationDelay={0.5}
            isAttacking={rightFighterState.isAttacking}
            isDefending={rightFighterState.isDefending}
            isJumping={rightFighterState.isJumping}
            fadeIn={true}
          />
          
          {/* Visual fighting effects */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl text-yellow-300 animate-pulse opacity-70">
            {leftFighterState.isAttacking && rightFighterState.isDefending && "⚔️"}
            {rightFighterState.isAttacking && leftFighterState.isDefending && "⚔️"}
            {leftFighterState.isAttacking && rightFighterState.isAttacking && "💥"}
            {leftFighterState.isJumping && rightFighterState.isJumping && "✨"}
          </div>
        </div>

        {/* Main menu section */}
        {menuSection === 'main' && (
          <div className="space-y-8 animate-fadeIn">
            <button 
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold py-5 px-20 rounded-full text-3xl transition-all hover:scale-105 hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              onClick={handleStartGame}
            >
              PLAY GAME
            </button>
            
            <div className="flex flex-wrap justify-center gap-5 mt-8">
              <button 
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
                onClick={showCustomizationMenu}
              >
                CUSTOMIZE FIGHTERS
              </button>
              
              <button 
                className="bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
                onClick={showControlsMenu}
              >
                GAME CONTROLS
              </button>
              
              {/* Audio controls in a styled container */}
              <div className="flex items-center justify-center gap-4 bg-black bg-opacity-50 p-3 px-6 rounded-full mx-auto mt-5 border border-gray-700">
                <button 
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors text-xl"
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={handleVolumeChange}
                  className="w-32 accent-yellow-500"
                />
              </div>
            </div>
            
            {/* Game highlight features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
              <div className="bg-black bg-opacity-40 p-5 rounded-xl border border-indigo-900 transform hover:scale-105 transition-transform">
                <div className="text-yellow-400 text-3xl mb-2">🥋</div>
                <h3 className="text-white text-xl font-bold mb-2">Dynamic Combat</h3>
                <p className="text-gray-300 text-sm">Master a variety of moves including punches, kicks, special attacks, and counters</p>
              </div>
              
              <div className="bg-black bg-opacity-40 p-5 rounded-xl border border-indigo-900 transform hover:scale-105 transition-transform">
                <div className="text-yellow-400 text-3xl mb-2">🏆</div>
                <h3 className="text-white text-xl font-bold mb-2">Challenge CPU</h3>
                <p className="text-gray-300 text-sm">Test your skills against adaptive AI opponents with unique fighting styles</p>
              </div>
              
              <div className="bg-black bg-opacity-40 p-5 rounded-xl border border-indigo-900 transform hover:scale-105 transition-transform">
                <div className="text-yellow-400 text-3xl mb-2">🎮</div>
                <h3 className="text-white text-xl font-bold mb-2">Easy Controls</h3>
                <p className="text-gray-300 text-sm">Simple keyboard controls make it easy to jump in and start playing immediately</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls section */}
        {menuSection === 'controls' && (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold text-white mb-6">Game Controls</h2>
            
            <div className="flex justify-center mb-6">
              <button 
                className={`px-5 py-2 rounded-l-lg border-r border-gray-700 ${!showAdvancedControls ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                onClick={() => setShowAdvancedControls(false)}
              >
                Basic Controls
              </button>
              <button 
                className={`px-5 py-2 rounded-r-lg ${showAdvancedControls ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                onClick={() => setShowAdvancedControls(true)}
              >
                Advanced Controls
              </button>
            </div>
            
            {showAdvancedControls ? (
              // Advanced controls display with categories
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left bg-black bg-opacity-60 p-8 rounded-xl border border-indigo-800 shadow-2xl">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-3 border-b border-blue-900 pb-2">Movement</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">↑</span> Forward:
                    </div>
                    <div>Up Arrow</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">↓</span> Backward:
                    </div>
                    <div>Down Arrow</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">←→</span> Strafe:
                    </div>
                    <div>Left/Right Arrows</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">W</span> Jump:
                    </div>
                    <div>W Key</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">W+↓</span> Drop Down:
                    </div>
                    <div>W + Down Arrow</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-red-300 mb-3 border-b border-red-900 pb-2">Basic Combat</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">J</span> Quick Attack:
                    </div>
                    <div>Light Punch</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">K</span> Strong Attack:
                    </div>
                    <div>Heavy Kick</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">L</span> Block:
                    </div>
                    <div>Defensive Stance</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">Space</span> Special:
                    </div>
                    <div>Powerful Move</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-yellow-300 mb-3 border-b border-yellow-900 pb-2">Advanced Techniques</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">E</span> Air Attack:
                    </div>
                    <div>While Jumping</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">Shift</span> Dodge:
                    </div>
                    <div>Evade Attacks</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">G</span> Grab:
                    </div>
                    <div>Hold Opponent</div>
                    <div className="text-gray-300 flex items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">T</span> Taunt:
                    </div>
                    <div>Show Off</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-green-300 mb-3 border-b border-green-900 pb-2">Pro Tips</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 text-gray-200">
                    <li>Chain attacks together for powerful combos</li>
                    <li>Use platforms to gain height advantage</li>
                    <li>Time your blocks to counter-attack effectively</li>
                    <li>Mix up ground and air attacks to confuse opponents</li>
                    <li>Use taunts to provoke mistakes from your opponent</li>
                    <li>Press <span className="bg-gray-700 px-1 rounded text-xs">J+K</span> quickly for a combo starter</li>
                  </ul>
                </div>
              </div>
            ) : (
              // Basic controls display
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left bg-black bg-opacity-60 p-6 rounded-xl border border-indigo-800 shadow-xl">
                <div className="text-gray-300 flex items-center gap-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-sm min-w-[40px] text-center">↑↓←→</span> Move:
                </div>
                <div className="text-white">Arrow Keys</div>
                
                <div className="text-gray-300 flex items-center gap-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-sm min-w-[40px] text-center">W</span> Jump:
                </div>
                <div className="text-white">W Key</div>
                
                <div className="text-gray-300 flex items-center gap-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-sm min-w-[40px] text-center">J/K</span> Attack:
                </div>
                <div className="text-white">Punch / Kick</div>
                
                <div className="text-gray-300 flex items-center gap-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-sm min-w-[40px] text-center">L</span> Block:
                </div>
                <div className="text-white">Defend</div>
                
                <div className="text-gray-300 flex items-center gap-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-sm min-w-[40px] text-center">Space</span> Special:
                </div>
                <div className="text-white">Power Move</div>
              </div>
            )}
            
            <button 
              className="mt-8 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold py-3 px-6 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              onClick={showMainMenu}
            >
              Back to Main Menu
            </button>
          </div>
        )}
        
        {/* Character Customization Section */}
        {menuSection === 'customization' && (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold text-white mb-6">Customize Your Fighter</h2>
            
            <div className="bg-black bg-opacity-60 p-8 rounded-xl border border-purple-800 shadow-2xl max-w-4xl mx-auto">
              <CharacterCustomizer />
            </div>
            
            <button 
              className="mt-8 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold py-3 px-6 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              onClick={showMainMenu}
            >
              Back to Main Menu
            </button>
          </div>
        )}
        
        {/* Footer with version and credits */}
        <div className="mt-10 text-gray-400 text-sm flex justify-center items-center gap-4">
          <span>Version 1.0</span>
          <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
          <span>Stick Fighter © 2025</span>
          <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
          <span>Built with React + Three.js</span>
        </div>
      </div>
    </div>
  );
};

export default Menu;
