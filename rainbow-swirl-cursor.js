// Oily Rainbow Cursor - robust and error-free!
(function() {
  // Create the canvas overlay
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  // Hide the native cursor
  document.body.style.cursor = 'none';

  let dpr = window.devicePixelRatio || 1;
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const ctx = canvas.getContext('2d');

  let mouse = {x: window.innerWidth/2, y: window.innerHeight/2};
  let last = {...mouse};
  let trail = [];
  const maxTrail = 32;

  window.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function animate() {
    // Ensure correct scaling every frame!
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    // Oily fade
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Smoothed mouse movement
    last.x = lerp(last.x, mouse.x, 0.28);
    last.y = lerp(last.y, mouse.y, 0.28);

    // Trail update
    trail.push({x: last.x, y: last.y, time: performance.now()});
    if(trail.length > maxTrail) trail.shift();

    // Draw rainbow trail
    ctx.globalAlpha = 0.72;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 13;
    ctx.beginPath();
    for(let i = 0; i < trail.length-1; i++) {
      let p = trail[i], np = trail[i+1];
      let hue = ((performance.now()/24) + i*10) % 360;
      ctx.strokeStyle = `hsl(${hue},96%,62%)`;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(np.x, np.y);
    }
    ctx.shadowColor = 'rgba(255,255,255,0.09)';
    ctx.shadowBlur = 19;
    ctx.stroke();

    // Oily head
    let tip = trail[trail.length-1];
    if (tip) {
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 13;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 6, 0, 2*Math.PI);
      ctx.fillStyle = `hsl(${(performance.now()/16)%360},100%,82%)`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
