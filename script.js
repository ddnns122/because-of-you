const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const menuBtn=$('#menuBtn'), mobileMenu=$('#mobileMenu'), dockMenu=$('.dock-menu'), dockItems=$$('.dock-item');
function toggleMenu(force){const open=force ?? !mobileMenu.classList.contains('open'); mobileMenu.classList.toggle('open',open); menuBtn.classList.toggle('open',open); menuBtn.setAttribute('aria-expanded',String(open)); mobileMenu.setAttribute('aria-hidden',String(!open)); document.body.classList.toggle('menu-open',open)}
menuBtn?.addEventListener('click',()=>toggleMenu()); dockMenu?.addEventListener('click',()=>toggleMenu()); $$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>toggleMenu(false)));

const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('visible')),{threshold:.12}); $$('.reveal').forEach(e=>io.observe(e));
const progress=$('.progress span');
function onScroll(){const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?scrollY/max*100:0)+'%';const y=scrollY+innerHeight*.35;let active='#top';$$('main section[id],footer[id]').forEach(s=>{if(s.offsetTop<=y)active='#'+s.id});dockItems.forEach(a=>{if(a.tagName==='A')a.classList.toggle('active',a.getAttribute('href')===active||(active==='#top'&&a.getAttribute('href')==='#top'))})}
let scrollPending=false; addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(()=>{onScroll();scrollPending=false})}},{passive:true});onScroll();

const toast=$('#toast');let toastTimer;function say(msg){clearTimeout(toastTimer);toast.textContent=msg;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),1600)}
// 在移动端双击顶部徽标快速回到首页
let lastTap=0;$('.logo')?.addEventListener('click',e=>{const now=Date.now();if(now-lastTap<320){e.preventDefault();scrollTo({top:0,behavior:'smooth'});say('已回到深海首页');}lastTap=now});


// 四大赛事展开/收起：点击、键盘 Enter/空格均可操作；同一时间只展开一个模块
const eventCards=$$('.event-card');
function setEvent(card, open){
  card.classList.toggle('is-open',open);
  const detail=$('.event-detail',card);
  if(detail){detail.inert=!open;detail.setAttribute('aria-hidden',String(!open));}
  card.setAttribute('aria-expanded',String(open));
  const btn=$('.event-toggle',card);
  btn?.setAttribute('aria-expanded',String(open));
}
eventCards.forEach(card=>{
  setEvent(card,false);
  const btn=$('.event-toggle',card);
  btn?.addEventListener('click',()=>{
    if(card.id==='basketballEvent'){eventCards.forEach(c=>setEvent(c,false));document.dispatchEvent(new Event('open-basketball-pass'));return;}
    if(card.id==='dramaEvent'){eventCards.forEach(c=>setEvent(c,false));document.dispatchEvent(new Event('open-drama-ticket'));return;}
    const open=!card.classList.contains('is-open');
    eventCards.forEach(c=>setEvent(c,false));
    if(open)setEvent(card,true);
  });
  card.addEventListener('keydown',e=>{
    if(e.target!==card || (e.key!=='Enter' && e.key!==' ')) return;
    e.preventDefault(); btn?.click();
  });
});


// 联系我们展开/收起
const contactSection=$('#contact'), contactToggle=$('.contact-toggle',contactSection), contactDetail=$('#contactDetail');
if(contactDetail) contactDetail.inert=true;
contactToggle?.addEventListener('click',()=>{
  const open=!contactSection.classList.contains('is-open');
  contactSection.classList.toggle('is-open',open);
  contactToggle.setAttribute('aria-expanded',String(open));
  contactToggle.setAttribute('aria-label',open?'收起联系我们':'展开联系我们');
  contactDetail?.setAttribute('aria-hidden',String(!open));
  if(contactDetail) contactDetail.inert=!open;
});

// 成立时间轴：只有用户滚动进入视口后才从 1960 动画到 2016，并只播放一次。
const historySection=$('#history');
const historyYear=$('.history-year',historySection);
if(historySection&&historyYear){
  const startYear=Number(historyYear.dataset.start)||1960;
  const endYear=Number(historyYear.dataset.end)||2016;
  let historyStarted=false;
  let historyFrame=0;
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finishHistory=()=>{
    cancelAnimationFrame(historyFrame);
    historyYear.textContent=String(endYear);
    historySection.classList.remove('is-running');
    historySection.classList.add('is-finished');
  };
  const startHistory=()=>{
    if(historyStarted)return;
    historyStarted=true;
    if(reduceMotion){finishHistory();return;}
    historySection.classList.add('is-running');
    const duration=4200;
    let startedAt=null;
    const easeOut=t=>1-Math.pow(1-t,3);
    const tick=now=>{
      if(startedAt===null)startedAt=now;
      const progress=Math.min((now-startedAt)/duration,1);
      const value=Math.round(startYear+(endYear-startYear)*easeOut(progress));
      historyYear.textContent=String(value);
      if(progress<1){historyFrame=requestAnimationFrame(tick);}else{finishHistory();}
    };
    historyFrame=requestAnimationFrame(tick);
  };
  if('IntersectionObserver' in window){
    const historyObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){startHistory();historyObserver.disconnect();}});
    },{threshold:.28});
    historyObserver.observe(historySection);
  }else{
    startHistory();
  }
}

(() => {
  const gallery = document.querySelector('.memory-gallery');
  const track = document.querySelector('#memoryTrack');
  const toggle = document.querySelector('#memoryToggle');
  const names = ['书院创作','书院旗帜','书院合影','展览现场','校园一角','篮球赛事','舞台灯光'];
  // 图片按上传顺序排列；所有资源与 index.html 位于同一级。
  for (let copy = 0; copy < 4; copy++) {
    names.forEach((name, i) => {
      const frame = document.createElement('div');
      frame.className = 'memory-frame';
      const img = document.createElement('img');
      img.src = `highlight-${String(i + 1).padStart(2, '0')}.jpg`;
      img.alt = copy === 0 ? name : '';
      img.draggable = false;
      img.decoding = 'async';
      if (copy > 0) frame.setAttribute('aria-hidden', 'true');
      frame.append(img); track.append(frame);
    });
  }
  let offset = 0, period = 1, previous = 0, dragging = false, lastX = 0, velocity = 0, lastMove = 0, autoSpeed = 0;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; }).observe(gallery);
  let paused = motionPreference.matches;
  motionPreference.addEventListener('change',()=>{paused=motionPreference.matches;velocity=0;autoSpeed=0;label()});
  function measure() {
    const frames = track.children;
    period = frames[7].offsetLeft - frames[0].offsetLeft;
    render();
  }
  function render() {
    if(period <= 0) return;
    offset = ((offset % period) + period) % period;
    track.style.transform = `translate3d(${-offset}px,0,0)`;
  }
  function label() {
    toggle.innerHTML = paused ? '播放 <span aria-hidden="true">▷</span>' : '暂停 <span aria-hidden="true">Ⅱ</span>';
    toggle.setAttribute('aria-label', paused ? '播放图片滑动' : '暂停图片滑动');
    toggle.setAttribute('aria-pressed', String(paused));
  }
  toggle.addEventListener('click', () => { paused = !paused; label(); });
  gallery.addEventListener('pointerdown', e => { if(e.button !== 0) return; dragging = true; velocity = 0; lastMove = performance.now(); lastX = e.clientX; gallery.setPointerCapture(e.pointerId); });
  gallery.addEventListener('pointermove', e => { if(!dragging) return; const now=performance.now(), delta=lastX-e.clientX; velocity=velocity*.35+Math.max(-1.5,Math.min(1.5,delta/Math.max(8,now-lastMove)))*.65; offset+=delta; lastMove=now; lastX=e.clientX; render(); });
  const release = () => { if(performance.now()-lastMove>100 || motionPreference.matches) velocity=0; dragging = false; };
  gallery.addEventListener('pointerup', release);
  gallery.addEventListener('pointercancel', release);
  gallery.addEventListener('lostpointercapture', release);
  gallery.addEventListener('keydown', e => {
    if(e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); if(motionPreference.matches){offset+=e.key==='ArrowRight'?100:-100;render()}else{velocity=e.key==='ArrowRight'?.65:-.65;} }
    if(e.key === ' ') { e.preventDefault(); paused = !paused; label(); }
  });
  new ResizeObserver(measure).observe(gallery);
  function tick(now) {
    const elapsed = previous ? Math.min(now - previous, 50) : 0; previous = now;
    if(!dragging && !document.hidden && inView) {
      autoSpeed += ((paused ? 0 : .024) - autoSpeed) * (1-Math.exp(-elapsed/300));
      offset += elapsed * (autoSpeed + velocity);
      velocity *= Math.exp(-elapsed/280);
      if(Math.abs(velocity)<.0005) velocity=0;
      if(autoSpeed>.0001 || velocity) render();
    }
    requestAnimationFrame(tick);
  }
  measure(); label(); requestAnimationFrame(tick);
})();

addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileMenu.classList.contains('open')){toggleMenu(false);menuBtn.focus();}});
