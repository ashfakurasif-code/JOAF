importScripts('/sw.js');


<script>
document.addEventListener('DOMContentLoaded',()=>{
  const ids=['batchPostBtn','postSelectedBtn','qmPostBtn'];
  ids.forEach(id=>{
    const b=document.getElementById(id);
    if(b){
      b.disabled=false;
      b.style.pointerEvents='auto';
      b.style.opacity='1';
      b.style.zIndex='99999';
    }
  });
});
</script>
