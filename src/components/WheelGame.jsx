import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import titleImg from '../assets/title_v2.png';
import winnerGift from '../assets/winner_gift.png';
import { drawWheel, easeOutQuad } from '../utils/drawWheel';

// Helper to generate mock prizes purely for demo if API fails
const generateMockPrizes = (tier) => {
    const count = tier === '10000' ? 50 : tier === '5000' ? 30 : 15;
    return Array.from({ length: count }, (_, i) => `獎項 ${tier}-${i + 1}`);
};

const WheelGame = ({ tier, onBack }) => {
    const canvasRef = useRef(null);

    // Game State
    const [items, setItems] = useState([]);
    // const [tier, setTier] = useState('3000'); // REMOVED: Managed by parent
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);

    // Refs for Animation logic to avoid closure staleness issues
    const itemsRef = useRef([]);
    const winnerRef = useRef(null);

    // Physics Refs
    const currentRotation = useRef(0);
    const spinStartTime = useRef(0);
    const spinDuration = useRef(5000); // 5 seconds
    const startRotation = useRef(0);
    const targetRotation = useRef(0);
    const requestRef = useRef();

    // Load Initial Data
    useEffect(() => {
        const fetchPrizes = async () => {
            const url = import.meta.env.VITE_GAS_URL;
            let loadedItems = [];

            // 1. Try to fetch from Google Sheets
            if (url && !url.includes('YOUR_DEPLOYMENT_ID')) {
                try {
                    const response = await fetch(url, { method: 'GET' });
                    const result = await response.json();

                    if (result.status === 'success' && result.data && result.data[tier]) {
                        loadedItems = result.data[tier];
                        console.log(`Loaded prizes for tier ${tier} from Sheet:`, loadedItems);
                    }
                } catch (error) {
                    console.error("Failed to fetch prizes from Sheet, falling back to mock:", error);
                }
            }

            // 2. Fallback to Mock Data if fetch failed or returned empty
            if (loadedItems.length === 0) {
                loadedItems = generateMockPrizes(tier);
                console.warn(`Using fallback prizes for tier ${tier}`);
            }

            setItems(loadedItems);
            itemsRef.current = loadedItems;
        };

        fetchPrizes();
    }, [tier]);

    // Canvas Drawing Loop (Static)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Dimensions
        const size = 500; // Intrinsic size
        const dpr = window.devicePixelRatio || 1;

        // Avoid resetting if size matches to prevent flicker, 
        // but here we need to ensure size is correct
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        // Initial Draw
        drawWheel(ctx, size, size, items, currentRotation.current);

    }, [items]); // Re-draw when items change

    // Animation Frame Handler
    const animate = (time) => {
        if (!spinStartTime.current) spinStartTime.current = time;
        const elapsed = time - spinStartTime.current;

        // Dimensions for draw
        const size = 500;
        const canvas = canvasRef.current;
        const ctx = canvas ? canvas.getContext('2d') : null;

        if (elapsed < spinDuration.current) {
            const totalChange = targetRotation.current - startRotation.current;
            const angle = easeOutQuad(elapsed, startRotation.current, totalChange, spinDuration.current);
            currentRotation.current = angle;

            if (ctx) {
                drawWheel(ctx, size, size, itemsRef.current, currentRotation.current);
            }

            requestRef.current = requestAnimationFrame(animate);
        } else {
            // Stopped
            currentRotation.current = targetRotation.current;
            setIsSpinning(false); // Trigger React Re-render to show result

            if (ctx) {
                drawWheel(ctx, size, size, itemsRef.current, currentRotation.current);
            }

            // Visual Effects
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#D9230F', '#F2C94C', '#FFFFFF'],
                zIndex: 100 // Above everything
            });

            // API Record
            recordResult();
        }
    };

    const spin = () => {
        if (isSpinning || items.length === 0) return;

        setIsSpinning(true);
        setWinner(null);
        winnerRef.current = null;

        // 1. Determine Result
        const winningIndex = Math.floor(Math.random() * items.length);
        const winningPrize = items[winningIndex];
        setWinner(winningPrize);
        winnerRef.current = winningPrize;

        // 2. Calculate Angle
        // Pointer @ -PI/2.
        // Segment Center = Rotation + Index*Step + Step/2
        // Goal: Rotation = -PI/2 - Index*Step - Step/2
        const step = (2 * Math.PI) / items.length;
        let target = (-Math.PI / 2) - (winningIndex * step) - (step / 2);

        // Ensure target is "future" (clockwise positive)
        // Actually our draw logic: angle = rotation + index*step
        // Positive rotation spins "Right" (Clockwise).
        // So we need target > current.

        // Normalize current to avoid huge numbers
        const twoPi = 2 * Math.PI;
        let current = currentRotation.current;

        // Find next matching angle > current
        // Target is modulo 2PI equivalent. 
        // We want target = base_target + k * 2PI, such that target > current

        // First bring target to [0, 2PI] range? No just keep adding 2PI
        while (target < current) {
            target += twoPi;
        }

        // Add minimum spins (e.g. 5 full rotations)
        target += 5 * twoPi;

        // Add randomness within the wedge? (optional, keeps it centered for now)

        startRotation.current = current;
        targetRotation.current = target;
        spinStartTime.current = 0;

        requestRef.current = requestAnimationFrame(animate);
    };

    const recordResult = () => {
        const url = import.meta.env.VITE_GAS_URL;
        const outcome = winnerRef.current;
        console.log("Recording:", outcome);

        if (!url || url.includes('YOUR_DEPLOYMENT_ID')) {
            console.warn("Skipping GAS record: VITE_GAS_URL is not set or is using placeholder.");
            return;
        }

        // Fire and forget (no-cors)
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'record',
                tier: tier,
                prize: outcome,
                timestamp: new Date().toISOString()
            })
        });
    };



    return (

        <>
            {/* Back Button - Fixed to Top Right */}
            <div className="z-[60]" style={{ position: 'fixed', top: '24px', right: '24px', left: 'auto' }}>
                <button
                    onClick={onBack}
                    disabled={isSpinning}
                    className={`flex items-center justify-between px-3 w-[120px] h-[40px] text-white hover:text-white transition-all bg-[#D9230F] rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-y-1 hover:bg-[#c11f0d] ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >

                    <span className="text-sm font-black tracking-widest flex-grow text-center">返回首頁</span>
                </button>
            </div>

            <div className="flex flex-col items-center justify-center w-full h-full min-h-[inherit] relative overflow-hidden gap-6 py-8">
                {/* Header Group */}
                <div className="z-10 text-center flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
                    {/* Title with slightly removed negative margin for better vertical flow, keeping overlap clean */}
                    <img src={titleImg} alt="新春大轉盤" className="relative z-10 w-full max-w-[600px] drop-shadow-xl mb-[-40px]" />

                    {/* Level Indicator */}
                    <div className="relative z-20 inline-block">
                        <div className="bg-[#D9230F] border-[2px] border-black shadow-[2px_2px_0px_#000] px-[10px] rounded-full flex items-center justify-center w-[350px] h-[40px]">
                            <p className="text-white text-[22px] font-['Kaiti_TC','STKaiti','serif'] font-bold drop-shadow-sm flex items-center gap-2 leading-none m-0">
                                當前等級：
                                <span className="font-['SN_Pro'] font-black text-[28px] translate-y-[2px]">
                                    {tier}<span className="text-[16px] font-bold ml-0.5">元</span>
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Wheel Section */}
                <div className="relative z-10 group transform scale-90 md:scale-100 transition-transform">
                    {/* Pointer - Custom SVG Pin Shape (Red Border, Gold Fill) */}
                    <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 -translate-y-12 z-40 filter drop-shadow-xl">
                        <svg width="80" height="90" viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Pin Shape pointing DOWN - Shifted X by 10 to fit in ViewBox (Original had negative X causing clipping) */}
                            <path
                                d="M40 85L20 52C5 30 15 5 40 5C65 5 75 30 60 52L40 85Z"
                                fill="url(#pointerGradient)"
                                stroke="#D9230F"
                                strokeWidth="3"
                            />
                            {/* Inner Highlight/Detail */}
                            <circle cx="40" cy="35" r="14" fill="#FFFFFF" fillOpacity="0.2" />

                            <defs>
                                <linearGradient id="pointerGradient" x1="40" y1="5" x2="40" y2="85" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#FFD700" />
                                    <stop offset="100%" stopColor="#FFA500" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* The Wheel */}
                    <canvas
                        ref={canvasRef}
                        className="rounded-full shadow-[0_0_50px_rgba(255,215,0,0.4)]"
                        style={{ width: '500px', height: '500px', maxWidth: '90vw', maxHeight: '90vw' }}
                    />

                    {/* Center Trigger */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                        <button
                            onClick={spin}
                            disabled={isSpinning}
                            className={`
                   relative
                   min-w-[140px] h-[55px]
                   rounded-full 
                   border-none
                   flex items-center justify-center
                   transition-all duration-100
                   group
                   ${isSpinning ? 'translate-y-[6px] cursor-wait brightness-90' : 'hover:-translate-y-1 active:translate-y-[6px]'}
                 `}
                            style={{
                                backgroundColor: 'transparent',
                                perspective: '500px'
                            }}
                        >
                            {/* 3D Base (Dark Red) */}
                            <div className={`absolute inset-0 rounded-full bg-[#8B0000] translate-y-[8px] ${isSpinning ? 'translate-y-[2px]' : 'group-hover:translate-y-[10px] group-active:translate-y-[2px]'} transition-transform duration-100 ease-out z-0`}></div>

                            {/* Main Button Surface (Red Gradient + Highlight) */}
                            <div className="relative z-10 w-full h-full rounded-full bg-gradient-to-b from-[#ff5e57] to-[#d63031] border-t border-white/30 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4)] flex items-center justify-center px-4">
                                {/* Gloss Highlight */}
                                <div className="absolute top-[8%] left-[10%] w-[80%] h-[40%] bg-gradient-to-b from-white to-transparent opacity-50 rounded-full pointer-events-none"></div>

                                <span className="text-white text-[26px] font-black italic tracking-wider drop-shadow-sm font-sans z-20" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.2)' }}>
                                    START
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Result Modal / Display */}
                {winner && !isSpinning && createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 9999,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        <div
                            className="relative flex flex-col items-center overflow-hidden shadow-2xl animate-[popIn_0.4s_ease-out_forwards]"
                            style={{
                                width: '300px',
                                height: '340px',
                                backgroundColor: '#ffffff',
                                border: '5px solid #b30d0d',
                                borderRadius: '10px',
                                padding: '20px 0'
                            }}
                        >
                            {/* Inner Container for vertical distribution */}
                            <div className="flex flex-col items-center justify-between w-full h-full">

                                {/* Top Section: Image & Divider */}
                                <div className="flex flex-col items-center w-full">
                                    {/* Gift Image (134x144) */}
                                    <img src={winnerGift} alt="Gift" style={{ width: '134px', height: '144px', objectFit: 'contain' }} />

                                    {/* Divider Line */}
                                    <div style={{ width: '80%', height: '1px', backgroundColor: '#989898', opacity: 0.3, marginTop: '15px' }}></div>
                                </div>

                                {/* Middle Section: Text */}
                                <div className="flex flex-col items-center justify-center flex-grow">
                                    {/* Header Text */}
                                    <h3 className="tracking-widest" style={{ color: '#b30d0d', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>恭喜獲得</h3>

                                    {/* Prize Text */}
                                    <div className="font-['Kaiti_TC','STKaiti'] leading-tight px-2 flex items-center justify-center" style={{ color: '#b30d0d', fontSize: '32px', fontWeight: '900', textAlign: 'center' }}>
                                        {winner}
                                    </div>
                                </div>

                                {/* Bottom Section: Close Button */}
                                <div className="w-full flex justify-center">
                                    <button
                                        onClick={() => setWinner(null)}
                                        className="rounded-full hover:bg-[#8d939e] transition-colors tracking-widest flex items-center justify-center"
                                        style={{
                                            width: '100px',
                                            height: '35px',
                                            backgroundColor: '#9da3ae',
                                            color: 'white',
                                            fontSize: '16px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        關 閉
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
};

export default WheelGame;
