swirl.addEventListener('mousedown', () => {
  swirl.style.transform += ' scale(1.4)';
  swirl.style.boxShadow = `
    0 0 80px 40px rgba(255,255,255,0.25),
    0 0 260px 120px rgba(255,0,255,0.18)
  `;
});
window.addEventListener('mouseup', () => {
  swirl.style.transform = swirl.style.transform.replace(' scale(1.4)', ' scale(1.08)');
  swirl.style.boxShadow = `
    0 0 44px 22px rgba(255,255,255,0.21),
    0 0 160px 60px rgba(255,0,255,0.12),
    0 0 60px 22px rgba(0,255,255,0.09)
  `;
});
