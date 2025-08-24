// Oily, liquid rainbow trail cursor (advanced.team style!)
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
  document.body.appendChild(canvas);

  let dpr = window.devicePixelRatio || 1;
  function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Hide the native cursor
  document.body.style.cursor = 'none';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let mouse = {x: window.innerWidth/2, y: window.innerHeight/2};
  let last = {...mouse};
  let trail = [];
  const maxTrail = 32;

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function animate() {
    // Draw transparent black rectangle for oily smudge fade
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Smoothly move the last point toward the mouse
    last.x = lerp(last.x, mouse.x, 0.28);
    last.y = lerp(last.y, mouse.y, 0.28);

    // Add to trail and keep fixed length
    trail.push({x: last.x, y: last.y, time: performance.now()});
    if(trail.length > maxTrail) trail.shift();

    // Draw the oily rainbow stroke
    ctx.globalAlpha = 0.68;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 17;
    ctx.beginPath();
    for(let i = 0; i < trail.length-1; i++) {
      let p = trail[i], np = trail[i+1];
      let t = i / trail.length;
      let hue = ((performance.now()/24) + i*10) % 360;
      ctx.strokeStyle = `hsl(${hue},96%,62%)`;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(np.x, np.y);
    }
    ctx.shadowColor = 'rgba(255,255,255,0.09)';
    ctx.shadowBlur = 19;
    ctx.stroke();

    // Draw a tight, bright oily head at the tip
    let tip = trail[trail.length-1];
    if (tip) {
      ctx.globalAlpha = 0.88;
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 17;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 9, 0, 2*Math.PI);
      ctx.fillStyle = `hsl(${(performance.now()/16)%360},100%,85%)`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
