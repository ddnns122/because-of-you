(() => {
  'use strict';
  const scene=document.querySelector('#scene'), camera=document.querySelector('#sceneCamera');
  const cards=[...document.querySelectorAll('.scene-photo')], n=cards.length;
  const counter=document.querySelector('#frameIndex'), viewer=document.querySelector('#photoViewer');
  const viewerImage=document.querySelector('#viewerImage'), viewerCount=document.querySelector('#viewerCount'), viewerCaption=document.querySelector('#viewerCaption');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const mod=(x,m)=>((x%m)+m)%m, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  let current=0,target=0,raf=0,previousTime=0,drag=null,moved=0,suppressClick=false,wheelTimer=0,wheelOrigin=0,viewerIndex=0,returnFocus=null;
  let opening=true,openingPhase='text',openingProgress=0,openingFrame=0,openingStart=0,openingElapsed=0,hiddenAt=0;
  const openingCopy=document.querySelector('#openingCopy'),openingSkip=document.querySelector('#openingSkip');
  let width=scene.clientWidth,cardWidth=cards[0].clientWidth,gestureStep=cardWidth*.66;
  const label=i=>String(i+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
  function paint(){
    const nearest=mod(Math.round(current),n);
    cards.forEach((card,i)=>{
      const d=mod(i-current+n/2,n)-n/2, a=Math.abs(d), direction=Math.sign(d);
      // The cards sit on an open arc: the centre faces the viewer, sides recede.
      const x=direction*cardWidth*(.90*Math.min(a,1)+.55*Math.max(0,a-1));
      const z=-Math.pow(a,1.12)*(width<800?260:345);
      const angle=-direction*Math.min(64,a*43);
      const y=Math.min(a,3)*6;
      let px=x,py=y,pz=z,rotation=angle,scale=1,opacity=a>3.4?0:1-Math.max(0,a-2.3)*.65;
      if(opening){
        const centreOffset=innerHeight/2-(scene.getBoundingClientRect().top+scene.clientHeight/2);
        if(openingPhase==='text'){opacity=0;}
        if(openingPhase==='flash'){
          const active=Math.min(n-1,Math.floor(openingProgress*n));
          const local=openingProgress*n-active;
          px=0;py=centreOffset;pz=0;rotation=0;scale=.84+local*.035;
          opacity=i===active?1:(i===active-1?.15:0);
        }
        if(openingPhase==='fold'){
          const t=openingProgress,e=t*t*(3-2*t);
          px=(i-(n-1))*3*e;py=centreOffset;pz=-Math.abs(i-(n-1))*2*e;
          rotation=78*e;scale=.875-.57*e;opacity=i===n-1?1:e*.5;
        }
        if(openingPhase==='unfold'){
          const t=openingProgress,e=1-Math.pow(1-t,3);
          px=(i-(n-1))*3*(1-e)+x*e;py=centreOffset*(1-e)+y*e;
          pz=z*e;rotation=78*(1-e)+angle*e;scale=.305+.695*e;
          opacity=(i===n-1?1:.5)*(1-e)+opacity*e;
        }
      }
      card.style.transform=`translate(-50%,-50%) translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,${pz.toFixed(2)}px) rotateY(${rotation.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      card.style.opacity=String(opacity);
      card.style.visibility=opening?(opacity>0?'visible':'hidden'):(a>3.4?'hidden':'visible');
      card.style.zIndex=String(100-Math.round(a*15));
      card.style.pointerEvents=opening||a>3?'none':'auto';
      card.tabIndex=!opening&&i===nearest?0:-1;
      card.setAttribute('aria-hidden',String(opening||a>3.4));
      card.setAttribute('aria-current',String(i===nearest));
    });
  }
  function updateCounter(){const i=mod(Math.round(target),n);counter.textContent=label(i);document.querySelector('#expandPhoto').setAttribute('aria-label',`展开第 ${i+1} 张照片`);}
  function tick(time){
    const dt=previousTime?Math.min(40,time-previousTime):16;previousTime=time;
    current+=(target-current)*(1-Math.exp(-dt/(drag?55:155)));
    if(Math.abs(current-target)<.0008){current=target;raf=0;previousTime=0;paint();return;}
    paint();raf=requestAnimationFrame(tick);
  }
  function requestPaint(){if(reduce.matches){current=target;paint();return;}if(!raf)raf=requestAnimationFrame(tick);}
  function go(value){if(opening)return;clearTimeout(wheelTimer);wheelTimer=0;target=value;updateCounter();requestPaint();}
  function step(delta){go(Math.round(target)+delta);}
  function measure(){width=scene.clientWidth;cardWidth=cards[0].clientWidth;gestureStep=Math.max(160,cardWidth*.66);paint();}
  new ResizeObserver(measure).observe(scene);measure();scene.classList.add('is-ready');
  const controls=[...document.querySelectorAll('.gallery-controls button,.expand-control')];
  function finishOpening(){
    cancelAnimationFrame(openingFrame);openingFrame=0;opening=false;
    document.body.classList.remove('is-opening');document.body.classList.add('opening-finished');
    openingCopy.hidden=true;openingSkip.hidden=true;scene.removeAttribute('aria-busy');
    controls.forEach(b=>b.disabled=false);current=target=10;paint();updateCounter();
  }
  function openingTick(now){
    if(!openingStart)openingStart=now;
    const time=now-openingStart;openingElapsed=time;
    if(time<2700){openingPhase='text';openingProgress=time/2700;}
    else if(time<3900){openingPhase='flash';openingProgress=(time-2700)/1200;}
    else if(time<4450){openingPhase='fold';openingProgress=(time-3900)/550;}
    else if(time<6350){openingPhase='unfold';openingProgress=(time-4450)/1900;current=9+(1-Math.pow(1-openingProgress,3));}
    else {finishOpening();return;}
    document.body.dataset.openingPhase=openingPhase;paint();openingFrame=requestAnimationFrame(openingTick);
  }
  openingSkip.addEventListener('click',()=>{finishOpening();scene.focus({preventScroll:true});});
  if(reduce.matches){finishOpening();}
  else{
    document.body.classList.add('is-opening');scene.setAttribute('aria-busy','true');
    openingSkip.hidden=false;controls.forEach(b=>b.disabled=true);paint();
    // Wait only for image decoding, with a bounded fallback on slow connections.
    const preload=Promise.allSettled(cards.map(card=>{const image=card.querySelector('img');return image.decode?image.decode():Promise.resolve();}));
    Promise.race([preload,new Promise(resolve=>setTimeout(resolve,1800))]).then(()=>{if(opening)openingFrame=requestAnimationFrame(openingTick);});
  }
  document.addEventListener('visibilitychange',()=>{
    if(!opening)return;
    if(document.hidden){hiddenAt=performance.now();cancelAnimationFrame(openingFrame);openingFrame=0;}
    else{if(openingStart&&hiddenAt)openingStart+=performance.now()-hiddenAt;hiddenAt=0;openingFrame=requestAnimationFrame(openingTick);}
  });

  document.querySelector('#previousPhoto').addEventListener('click',()=>step(-1));
  document.querySelector('#nextPhoto').addEventListener('click',()=>step(1));
  scene.addEventListener('keydown',e=>{
    if(opening)return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}
    if(e.key==='Home'){e.preventDefault();go(0);}
    if(e.key==='End'){e.preventDefault();go(n-1);}
  });
  scene.addEventListener('pointerdown',e=>{
    if(opening||e.button!==0||viewer.open)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastT:performance.now(),start:target,velocity:0,locked:false};
    moved=0;suppressClick=false;clearTimeout(wheelTimer);
  });
  scene.addEventListener('pointermove',e=>{
    if(opening)return;
    if(!drag||e.pointerId!==drag.id){
      if(e.pointerType==='mouse'&&!reduce.matches){const r=scene.getBoundingClientRect();camera.style.setProperty('--camera-x',`${(e.clientX-r.left-r.width/2)*.012}px`);camera.style.setProperty('--camera-y',`${(e.clientY-r.top-r.height/2)*.015}px`);}return;
    }
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.locked){
      if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){drag=null;return;}
      if(Math.abs(dx)<5)return;
      drag.locked=true;scene.setPointerCapture(e.pointerId);
    }
    const now=performance.now();
    drag.velocity=clamp((e.clientX-drag.lastX)/Math.max(8,now-drag.lastT),-2.2,2.2);
    drag.lastX=e.clientX;drag.lastT=now;moved=Math.max(moved,Math.abs(dx));
    target=drag.start-dx/gestureStep;requestPaint();
  });
  function release(e){
    if(!drag||e.pointerId!==drag.id)return;
    const saved=drag;drag=null;
    suppressClick=moved>5;
    if(saved.locked){
      const velocity=performance.now()-saved.lastT>100?0:saved.velocity;
      const momentum=e.type==='pointercancel'?0:clamp(-velocity*.22,-.6,.6);
      go(Math.round(target+momentum));
      if(scene.hasPointerCapture(e.pointerId))scene.releasePointerCapture(e.pointerId);
    }
  }
  scene.addEventListener('pointerup',release);scene.addEventListener('pointercancel',release);scene.addEventListener('lostpointercapture',release);
  scene.addEventListener('pointerleave',()=>{camera.style.setProperty('--camera-x','0px');camera.style.setProperty('--camera-y','0px');});
  scene.addEventListener('wheel',e=>{
    // Leave pinch-to-zoom alone. Wheel and trackpad move along the exhibition.
    if(opening||e.ctrlKey||e.metaKey||viewer.open)return;
    e.preventDefault();
    const delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*(e.deltaMode===1?16:1);
    if(!wheelTimer)wheelOrigin=Math.round(target);
    target+=clamp(delta/650,-.3,.3);requestPaint();clearTimeout(wheelTimer);
    wheelTimer=setTimeout(()=>{let next=Math.round(target);if(next===wheelOrigin&&Math.abs(target-wheelOrigin)>.06)next=wheelOrigin+Math.sign(target-wheelOrigin);wheelTimer=0;go(next);},140);
  },{passive:false});
  function showPhoto(i){
    viewerIndex=mod(i,n);const image=cards[viewerIndex].querySelector('img');
    viewerImage.src=image.getAttribute('src');viewerImage.alt=image.alt;
    viewerCount.textContent=label(viewerIndex);viewerCaption.textContent=image.alt;
  }
  function openPhoto(i,focus){
    if(opening)return;
    returnFocus=focus||document.activeElement;showPhoto(i);viewer.showModal();document.body.classList.add('viewer-open');document.querySelector('#closeViewer').focus({preventScroll:true});
  }
  function closePhoto(){
    viewer.close();document.body.classList.remove('viewer-open');
    const nearest=Math.round(target),delta=mod(viewerIndex-mod(nearest,n)+n/2,n)-n/2;
    go(nearest+delta);returnFocus?.focus({preventScroll:true});
  }
  cards.forEach((card,i)=>card.addEventListener('click',e=>{
    if(suppressClick&&e.detail!==0){suppressClick=false;return;}
    const nearest=Math.round(target),delta=mod(i-mod(nearest,n)+n/2,n)-n/2;
    if(delta!==0){go(nearest+delta);return;}
    openPhoto(i,card);
  }));
  document.querySelector('#expandPhoto').addEventListener('click',e=>openPhoto(mod(Math.round(target),n),e.currentTarget));
  document.querySelector('#closeViewer').addEventListener('click',closePhoto);
  document.querySelector('#viewerPrevious').addEventListener('click',()=>showPhoto(viewerIndex-1));
  document.querySelector('#viewerNext').addEventListener('click',()=>showPhoto(viewerIndex+1));
  viewer.addEventListener('cancel',e=>{e.preventDefault();closePhoto();});
  viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showPhoto(viewerIndex+(e.key==='ArrowRight'?1:-1));}});
  viewer.addEventListener('click',e=>{if(e.target.classList.contains('viewer-image-wrap'))closePhoto();});
  let viewerTouch=null;
  viewerImage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')viewerTouch={x:e.clientX,y:e.clientY};});
  viewerImage.addEventListener('pointerup',e=>{if(!viewerTouch)return;const dx=e.clientX-viewerTouch.x,dy=e.clientY-viewerTouch.y;viewerTouch=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)showPhoto(viewerIndex+(dx<0?1:-1));});
  viewerImage.addEventListener('pointercancel',()=>viewerTouch=null);
  reduce.addEventListener('change',()=>{if(opening)finishOpening();cancelAnimationFrame(raf);raf=0;current=target;paint();});
})();
