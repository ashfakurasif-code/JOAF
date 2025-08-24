// Rainbow Swirl Cursor - advanced.team style
// Place this in public/rainbow-swirl-cursor.js and include it in your HTML

(function() {
  // Create a canvas overlay
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  // Hide the native cursor
  document.body.style.cursor = 'none';

  const ctx = canvas.getContext('2d');

  let mouse = {x: window.innerWidth / 2, y: window.innerHeight / 2};
  let last = {x: mouse.x, y: mouse.y};
  let trail = [];
  const maxTrail = 35;
  const swirlRadius = 24;

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  function lerp(a, b, n) {
    return (1 - n) * a + n * b;
  }

  function drawSwirl(x, y, t) {
    const step = 10;
    for (let i = 0; i < 360; i += step) {
      const rad = (i + t * 2) * Math.PI / 180;
      const cx = x + Math.cos(rad) * swirlRadius;
      const cy = y + Math.sin(rad) * swirlRadius;
      ctx.save();
      ctx.globalAlpha = 0.36;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = `hsl(${i + t * 4}, 98%, 60%)`;
      ctx.shadowColor = `hsl(${i + t * 4}, 98%, 70%)`;
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move last position towards mouse for smooth trailing
    last.x = lerp(last.x, mouse.x, 0.32);
    last.y = lerp(last.y, mouse.y, 0.32);

    // Add to trail
    trail.push({x: last.x, y: last.y, t: performance.now()/13});
    if (trail.length > maxTrail) trail.shift();

    // Draw trailing swirls
    trail.forEach((pos, i) => {
      ctx.save();
      ctx.globalAlpha = (i + 1) / trail.length * 0.9;
      drawSwirl(pos.x, pos.y, pos.t);
      ctx.restore();
    });

    requestAnimationFrame(animate);
  }

  animate();
})();
