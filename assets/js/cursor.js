document.addEventListener('DOMContentLoaded', () => {
    // Inject Styles
    const style = document.createElement('style');
    style.innerHTML = `
        * {
            cursor: none !important;
        }
        .custom-cursor-outline {
            position: fixed;
            top: 0;
            left: 0;
            width: 40px;
            height: 40px;
            border: 2px solid #C08552;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.1s ease-out;
        }
        .custom-cursor-dot {
            position: fixed;
            top: 0;
            left: 0;
            width: 10px;
            height: 10px;
            background-color: #ff9800; /* Orange dot */
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 10000;
            transition: width 0.2s, height 0.2s; /* Transition for the click effect */
        }
        .custom-cursor-dot.click-effect {
            width: 24px;
            height: 24px;
        }
    `;
    document.head.appendChild(style);

    // Inject Elements
    const outline = document.createElement('div');
    outline.className = 'custom-cursor-outline';
    const dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    document.body.appendChild(outline);
    document.body.appendChild(dot);

    // Interaction Logic
    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;
        dot.style.left = `${posX}px`;
        dot.style.top = `${posY}px`;
        
        outline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 100, fill: "forwards" });
    });

    window.addEventListener('mousedown', () => {
        dot.classList.add('click-effect');
        outline.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });

    window.addEventListener('mouseup', () => {
        dot.classList.remove('click-effect');
        outline.style.transform = 'translate(-50%, -50%) scale(1)';
    });
});
