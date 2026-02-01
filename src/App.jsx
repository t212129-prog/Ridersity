import { useState } from 'react';
import WheelGame from './components/WheelGame';
import titleImg from './assets/title_v2.png';
import logoImg from './assets/logo.png';
import bgImg from './assets/bg_light.jpg';

function App() {
  const [currentTier, setCurrentTier] = useState(null);

  return (
    <div className="relative w-full min-h-screen bg-cover bg-center bg-no-repeat font-serif text-white overflow-hidden" style={{ backgroundImage: `url(${bgImg})`, backgroundColor: '#b30d0d' }}>

      {/* Global Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0"></div>

      <div className="relative z-10 w-full min-h-screen">
        {currentTier ? (
          <WheelGame tier={currentTier} onBack={() => setCurrentTier(null)} />
        ) : (
          /* Home / Landing Screen */
          <div className="flex flex-col min-h-screen relative z-10 w-full overflow-hidden">

            {/* Content Wrapper - Centered Vertically */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-4 gap-8">

              {/* Header Group */}
              <div className="text-center flex flex-col items-center animate-[fadeIn_1s_ease-out]">
                {/* Brand Logo: width 250px, mb-30px */}
                <img src={logoImg} alt="Brand Logo" className="relative z-20 drop-shadow-xl mb-[30px]" style={{ width: '250px', height: 'auto' }} />

                {/* Title Image */}
                <img src={titleImg} alt="新春大轉盤" className="relative z-10 w-full max-w-[600px] drop-shadow-2xl mb-8 hover:scale-105 transition-transform duration-500" />

                {/* Subtitle */}
                <p className="text-cny-gold/90 text-[22px] font-['Kaiti_TC','STKaiti','BiauKai','DFKai-SB','serif'] font-bold tracking-widest drop-shadow-md">
                  請選擇抽獎面額
                </p>
              </div>

              {/* Tier Buttons - Vertical Column */}
              <div className="flex flex-col gap-[5px] w-full max-w-4xl justify-center items-center px-4">
                {['3000', '5000', '10000'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setCurrentTier(tier)}
                    className="group relative w-full min-w-[120px] max-w-[250px] h-[50px] rounded-full bg-[#D9230F] border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:shadow-none hover:bg-[#c11f0d] transition-all duration-200 flex items-center justify-between px-4 overflow-hidden shrink-0"
                  >
                    <div className="flex-grow text-center text-white text-[18px] font-black tracking-widest drop-shadow-sm mx-1 whitespace-nowrap">
                      <span className="font-['SN_Pro']">{tier}</span><span className="text-sm ml-1">元</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer - Fixed padding from bottom to maintain visual balance */}
            <div className="w-full text-center text-cny-gold/50 text-xs tracking-wider pb-6">
              © <span className="font-['SN_Pro']">2026</span> Ridersity Lunar New Year Event
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
