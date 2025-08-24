// Rainbow Swirl Cursor with Glow & Spread Effect
const swirl = document.createElement('div');
swirl.style.position = 'fixed';
swirl.style.pointerEvents = 'none';
swirl.style.zIndex = '99999';
swirl.style.width = '42px';
swirl.style.height = '42px';
swirl.style.borderRadius = '50%';
swirl.style.background = 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)';
swirl.style.boxShadow = '0 0 32px 16px rgba(255,255,255,0.15), 0 0 80px 40px rgba(255,0,255,0.08)';
swirl.style.mixBlendMode = 'screen';
swirl.style.transition = 'transform 0.05s linear, box-shadow 0.18s cubic-bezier(0.4,0,0.2,1)';
swirl.style.opacity = '0.93';

document.body.appendChild(swirl);

let angle = 0;
document.addEventListener('mousemove', (e) => {
  swirl.style.left = (e.clientX - 21) + 'px';
  swirl.style.top = (e.clientY - 21) + 'px';
  angle += 4;
  swirl.style.transform = `rotate(${angle}deg) scale(1.08)`;
  swirl.style.boxShadow = `
    0 0 44px 22px rgba(255,255,255,0.21),
    0 0 160px 60px rgba(255,0,255,0.12),
    0 0 60px 22px rgba(0,255,255,0.09)
  `;
});
