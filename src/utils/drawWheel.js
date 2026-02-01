/**
 * Draws the spinning wheel on the canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context.
 * @param {number} width - The width of the canvas.
 * @param {number} height - The height of the canvas.
 * @param {string[]} items - List of prizes.
 * @param {number} rotation - Current rotation in radians.
 */
export const drawWheel = (ctx, width, height, items, rotation) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 30; // More padding for thick border
    const step = (2 * Math.PI) / items.length;

    ctx.clearRect(0, 0, width, height);

    // --- 1. Outer Gradient Border (Gold) ---
    const borderThickness = 24;
    const outerRadius = radius + borderThickness;

    // Gradient for the gold rim
    const gradient = ctx.createLinearGradient(centerX - outerRadius, centerY - outerRadius, centerX + outerRadius, centerY + outerRadius);
    gradient.addColorStop(0, '#B8860B'); // Dark Gold
    gradient.addColorStop(0.25, '#FFD700'); // Gold
    gradient.addColorStop(0.5, '#FFFACD'); // Light Gold (Highlights)
    gradient.addColorStop(0.75, '#FFD700');
    gradient.addColorStop(1, '#B8860B');

    // Draw Outer Rim with Shadow
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Inner rim stroke (defining the play area)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#8B4513'; // SaddleBrown outline
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- 2. Segments (Deep Red) ---
    items.forEach((item, index) => {
        const startAngle = rotation + index * step;
        const endAngle = startAngle + step;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Alternating Deep Reds for texture
        // Ref: Dark Red Gradient look
        if (index % 2 === 0) {
            ctx.fillStyle = '#800000'; // Maroon
        } else {
            ctx.fillStyle = '#A52A2A'; // Brown/Red (Slightly lighter)
        }
        // Add a subtle radial gradient feel? 
        // Simple fill is cleaner for performance and text readability
        ctx.fill();

        // Dividers (Gold Lines)
        ctx.strokeStyle = '#F2C94C';
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- 3. Text ---
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + step / 2);
        ctx.textAlign = 'right';

        // Font Settings
        let fontSize = 16;
        if (items.length > 12) fontSize = 14;
        if (items.length > 24) fontSize = 12;

        // Use standard serif/sans mix
        ctx.font = `bold ${fontSize}px "SN Pro", sans-serif`;
        ctx.fillStyle = '#FFFFFF'; // White text pops best on dark red
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;

        ctx.textBaseline = 'middle';

        // Truncate logic
        let text = item;
        if (text.length > 10 && items.length > 20) {
            text = text.substring(0, 8) + '..';
        }

        ctx.fillText(text, radius - 10, 0);
        ctx.restore();
    });

    // --- 4. Lights (Marquee Bulbs on Border) ---
    const totalLights = 36; // More lights
    const lightRadius = radius + (borderThickness / 2);

    for (let i = 0; i < totalLights; i++) {
        const angle = (i / totalLights) * 2 * Math.PI + rotation; // Static bulbs? Or rotating? Reference usually static border.
        // Let's keep bulbs static relative to screen (not rotating with wheel)
        const staticAngle = (i / totalLights) * 2 * Math.PI;

        const lx = centerX + lightRadius * Math.cos(staticAngle);
        const ly = centerY + lightRadius * Math.sin(staticAngle);

        ctx.beginPath();
        ctx.arc(lx, ly, 5, 0, 2 * Math.PI);

        // Glowing effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFD700';

        // Alternating logic could fade in/out if we had time context, 
        // for now just alternate colors
        if (i % 2 === 0) {
            ctx.fillStyle = '#FFF8DC'; // Cornsilk (Bright ON)
        } else {
            ctx.fillStyle = '#DAA520'; // GoldenRod (Dimmer)
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    }

    // Center decoration (Optional - Reference has clean center, but we cover it with button)
    // Add a small inner ring to clean up divider lines
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#800000';
    ctx.fill();
    ctx.strokeStyle = '#F2C94C';
    ctx.stroke();
};

/**
 * Easing function for deceleration
 * @param {number} t - Current time
 * @param {number} b - Start value
 * @param {number} c - Change in value
 * @param {number} d - Duration
 */
export const easeOutQuad = (t, b, c, d) => {
    t /= d;
    return -c * t * (t - 2) + b;
};
