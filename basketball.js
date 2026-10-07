import {advance, BASE_SPEED} from './basketball-motion.js';
const photos = [...document.querySelectorAll('.photo')];
const gallery = document.querySelector('.gallery');
const shell = document.querySelector('.gallery-shell');
const progress = document.querySelector('.progress span');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = {offset:0, speed:reduced.matches ? 0 : BASE_SPEED, impulse:0, held:false};
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mod = (n,m) => ((n % m) + m) % m;
// Alternating positions leave the central title clear while the photographs pass the viewer.
const lanes = [[-1,-.65],[1,.6],[-.85,.75],[1,-.65],[-1,.1],[.9,.75],[-.85,-.75],[1,.05],[-.9,.65],[.9,-.7]];
let width=innerWidth, height=innerHeight, last=performance.now(), frame=0;
let activePointer=null, holdTimer=0, startY=0, previousY=0, swiping=false;
function paint(){
  photos.forEach((el,i)=>{
    const depth=mod(i-state.offset,photos.length);
    // Near plane is in front of the screen; distant photographs fade out before recycling.
    const z=650-depth*370;
    const near=clamp(depth/.55,0,1),far=clamp((photos.length-depth)/2.4,0,1);
    const [lx,ly]=lanes[i];
    const x=lx*width*(width<700?.37:.32), y=ly*height*.35;
    el.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px)`;
    el.style.opacity=String(near*far);
    el.style.zIndex=String(100-Math.round(depth*8));
  });
  progress.style.width=`${mod(state.offset,photos.length)/photos.length*100}%`;
}
function tick(now){
  advance(state,(now-last)/1000,reduced.matches);last=now;paint();
  frame=requestAnimationFrame(tick);
}
function nudge(amount){state.impulse=clamp(state.impulse+amount,-5,5);}
gallery.addEventListener('wheel',e=>{
  e.preventDefault();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1);
  nudge(pixels*.007);
},{passive:false});
addEventListener('keydown',e=>{
  if(e.target.closest('a,button,input'))return;
  if(['ArrowDown','PageDown',' ','ArrowRight'].includes(e.key)){e.preventDefault();nudge(1.5);}
  if(['ArrowUp','PageUp','ArrowLeft'].includes(e.key)){e.preventDefault();nudge(-1.5);}
});
function release(){
  clearTimeout(holdTimer);state.held=false;shell.classList.remove('fast');
  const id=activePointer;activePointer=null;swiping=false;
  if(id!==null&&gallery.hasPointerCapture(id))gallery.releasePointerCapture(id);
}
gallery.addEventListener('pointerdown',e=>{
  if(activePointer!==null||e.button!==0)return;
  activePointer=e.pointerId;startY=previousY=e.clientY;swiping=false;
  gallery.setPointerCapture(e.pointerId);
  holdTimer=setTimeout(()=>{if(activePointer===e.pointerId&&!swiping){state.held=true;shell.classList.add('fast');}},280);
});
gallery.addEventListener('pointermove',e=>{
  if(e.pointerId!==activePointer)return;
  if(Math.abs(e.clientY-startY)>10&&!state.held){swiping=true;clearTimeout(holdTimer);}
  if(swiping)nudge((previousY-e.clientY)*.014);
  previousY=e.clientY;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])gallery.addEventListener(event,release);
gallery.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',release);
addEventListener('resize',()=>{width=innerWidth;height=innerHeight;paint();});
document.addEventListener('visibilitychange',()=>{
  release();cancelAnimationFrame(frame);
  if(!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}
});
reduced.addEventListener('change',()=>{release();state.speed=reduced.matches?0:BASE_SPEED;});
paint();frame=requestAnimationFrame(tick);
