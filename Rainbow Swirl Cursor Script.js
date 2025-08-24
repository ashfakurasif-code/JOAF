// Rainbow Swirl Cursor Script
const swirl = document.createElement('div');
swirl.style.position = 'fixed';
swirl.style.pointerEvents = 'none';
swirl.style.zIndex = '99999';
swirl.style.width = '32px';
swirl.style.height = '32px';
swirl.style.borderRadius = '50%';
swirl.style.background = 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)';
swirl.style.transition = 'transform 0.05s linear';
swirl.style.mixBlendMode = 'difference';

document.body.appendChild(swirl);

let angle = 0;
document.addEventListener('mousemove', (e) => {
  swirl.style.left = (e.clientX - 16) + 'px';
  swirl.style.top = (e.clientY - 16) + 'px';
  angle += 5;
  swirl.style.transform = `rotate(${angle}deg)`;
});
