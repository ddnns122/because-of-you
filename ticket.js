/* Standalone paper-ticket interaction; no frameworks or network dependencies.
   Interaction reference: https://reactbits.dev/micro/tear-ticket
   Original geometry and animation implementation for Xijing College. */
(() => {
  const dialog = document.querySelector('#ticketDialog');
  if (!dialog) return;
  const plane = dialog.querySelector('#ticketPlane');
  const svg = dialog.querySelector('#paperTicket');
  const stub = dialog.querySelector('#ticketStub');
  const main = dialog.querySelector('#ticketMain');
  const tear = dialog.querySelector('#ticketTear');
  const hint = dialog.querySelector('#ticketHint');
  const help = dialog.querySelector('.ticket-help');
  const status = dialog.querySelector('#ticketStatus');
  const replay = dialog.querySelector('#ticketReplay');
  const close = dialog.querySelector('.ticket-close');
  const trigger = document.querySelector('#dramaTrigger');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const el = (name, attrs) => { const e=document.createElementNS(ns,name); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e; };
  // Matching vertical paper edges allow peeling from either end of the ticket.
  const edge = [[420,0]];
  for(let y=7;y<340;y+=7) edge.push([420+Math.sin(y*1.23)*1.65+Math.sin(y*.41)*.8,y]);
  edge.push([420,340]);
  const line=pts=>pts.map(([x,y])=>`L${x.toFixed(2)} ${y.toFixed(2)}`).join('');
  dialog.querySelector('#mainPaper').setAttribute('d',`M12 0H420${line(edge)}H12Q0 340 0 328V12Q0 0 12 0Z`);
  dialog.querySelector('#stubPaperShape').setAttribute('d',`M420 0H548Q560 0 560 12V328Q560 340 548 340H420${line([...edge].reverse())}Z`);
  const holes=dialog.querySelector('#perforationHoles');
  holes.append(el('circle',{cx:420,cy:0,r:9}),el('circle',{cx:420,cy:340,r:9}));
  for(let y=20;y<330;y+=20) holes.append(el('circle',{cx:420,cy:y,r:2.3}));
  const barcode=dialog.querySelector('#ticketBarcode');
  for(let x=453,i=0;x<528;i++){let width=[2,1,3,2,1,2,1][i%7];barcode.append(el('rect',{x,y:214,width,height:42,opacity:.7}));x+=width+2;}
  const fibres=[];
  for(let y=10;y<334;y+=11){const p=el('path',{'stroke-width':1.4,opacity:0});dialog.querySelector('#ticketFibres').append(p);fibres.push({y,p});}
  let phase='idle',drag=null,amount=0,frame=0,lastTapMove=0,tiltFrame=0,timer=0;
  let shownTiltX=8,shownTiltY=-7,targetTiltX=8,targetTiltY=-7;
  let hingeY=340,peelX=0,peelY=0,current={x:0,y:0,angle:0,cx:420,cy:340};
  const radians=a=>a*Math.PI/180;
  function transformed(x,y,v=current){
    const a=radians(v.angle),dx=x-v.cx,dy=y-v.cy;
    return {x:v.x+v.cx+dx*Math.cos(a)-dy*Math.sin(a),y:v.y+v.cy+dx*Math.sin(a)+dy*Math.cos(a)};
  }
  function render(v){
    current=v;
    stub.setAttribute('transform',`translate(${v.x} ${v.y}) rotate(${v.angle} ${v.cx} ${v.cy})`);
  }
  function pose(p){
    amount=p;
    const side=hingeY>170?1:-1;
    render({x:peelX*p*.16,y:peelY*p*.16,angle:side*p*20+peelY*p*.025,cx:420,cy:hingeY});
    main.setAttribute('transform',`translate(${-p*2} 0) rotate(${-side*p*.6} 210 170)`);
    fibres.forEach(({y,p:path})=>{
      const b=transformed(420,y),gap=Math.hypot(b.x-420,b.y-y);
      const snapped=gap>14 || p>=1;
      path.style.opacity=p<.008?0:snapped?.35:1;
      path.setAttribute('d',snapped?`M420 ${y}l3 1 M${b.x} ${b.y}l-3 -1`:`M420 ${y}Q${(420+b.x)/2} ${(y+b.y)/2+2} ${b.x} ${b.y}`);
      path.setAttribute('stroke-width',snapped?1:Math.max(.45,1.5-gap*.055));
    });
  }
  function point(e){
    // SVG coordinates keep the finger aligned through responsive sizing and ticket tilt.
    const matrix=svg.getScreenCTM?.();
    if(matrix && typeof DOMPoint!=='undefined')return new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    const r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)*560/r.width,y:(e.clientY-r.top)*340/r.height};
  }
  function animate(duration, paint, done){
    cancelAnimationFrame(frame); const start=performance.now();
    const step=now=>{const t=clamp((now-start)/duration,0,1);paint(t);if(t<1)frame=requestAnimationFrame(step);else{frame=0;done?.();}};
    frame=requestAnimationFrame(step);
  }
  function reset(){
    clearTimeout(timer);cancelAnimationFrame(frame);cancelAnimationFrame(tiltFrame);frame=tiltFrame=0;drag=null;phase='idle';amount=0;
    dialog.classList.remove('is-torn','is-complete','is-closing','is-entering','is-held');
    hingeY=340;peelX=peelY=0;current={x:0,y:0,angle:0,cx:420,cy:340};
    stub.style.opacity='1';stub.removeAttribute('transform');main.removeAttribute('transform');plane.style.transform='';
    fibres.forEach(({p})=>p.style.opacity=0);tear.disabled=false;tear.hidden=false;replay.hidden=true;
    hint.textContent='请撕开以进入戏剧节';help.textContent='从右侧票联上端或下端撕开 · 松手入场';status.textContent='';
    shownTiltX=targetTiltX=8;shownTiltY=targetTiltY=-7;
  }
  function open(){
    if(dialog.open) return;
    reset();document.body.classList.add('ticket-open');dialog.showModal();trigger.setAttribute('aria-expanded','true');
    tear.focus({preventScroll:true});
  }
  function complete(){
    if(!dialog.open)return;
    phase='complete';dialog.classList.add('is-complete');
    hint.textContent='欢迎来到熙敬戏剧节';
    status.textContent='票根已撕开，正在进入戏剧节。';
    dialog.classList.add('is-entering');
    const rect=plane.getBoundingClientRect();
    const scale=Math.max(innerWidth/Math.max(1,rect.width),innerHeight/Math.max(1,rect.height*.65))*2.3;
    plane.style.setProperty('--entry-scale',String(scale));
    timer=setTimeout(()=>{location.assign('drama.html');},reduce.matches?30:1050);
  }
  function fall(velocity={x:70,y:30,spin:22}){
    if(!dialog.open)return;
    phase='falling';dialog.classList.remove('is-held');dialog.classList.add('is-torn');tear.disabled=true;
    status.textContent='票根已松开，正在入场';
    if(reduce.matches){stub.style.opacity=0;fibres.forEach(({p})=>p.style.opacity=0);complete();return;}
    const base={...current};
    animate(720,t=>{
      const seconds=t*.72;
      render({...base,x:base.x+velocity.x*seconds,y:base.y+velocity.y*seconds+790*t*t,angle:base.angle+velocity.spin*seconds});
      stub.style.opacity=String(1-t*t);
      fibres.forEach(({p})=>p.style.opacity=0);
      main.setAttribute('transform',`translate(${-amount*2*(1-t)} 0)`);
    },complete);
  }
  function finish(){
    if(phase==='falling'||phase==='complete'||phase==='tearing')return;
    phase='tearing';drag=null;cancelAnimationFrame(tiltFrame);tiltFrame=0;
    if(reduce.matches){fall();return;}
    const start=amount;
    animate(300,t=>pose(start+(1-start)*(1-Math.pow(1-t,3))),()=>fall());
  }
  function closeDialog(){
    if(!dialog.open)return;
    cancelAnimationFrame(frame);cancelAnimationFrame(tiltFrame);clearTimeout(timer);
    dialog.close();document.body.classList.remove('ticket-open');trigger.setAttribute('aria-expanded','false');reset();trigger.focus({preventScroll:true});
  }
  document.addEventListener('open-drama-ticket',open);
  close.addEventListener('click',closeDialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog();});
  replay.addEventListener('click',()=>{reset();const arrival=dialog.querySelector('.ticket-arrival');arrival.style.animation='none';void arrival.offsetWidth;arrival.style.animation='';tear.focus({preventScroll:true});});
  tear.addEventListener('pointerdown',e=>{
    if(e.button!==0||phase!=='idle')return;
    cancelAnimationFrame(frame);cancelAnimationFrame(tiltFrame);frame=tiltFrame=0;lastTapMove=0;
    const p=point(e);hingeY=p.y<170?340:0;peelX=peelY=0;pose(0);
    drag={id:e.pointerId,start:p,last:p,time:performance.now(),vx:0,vy:0,angle:0};
    tear.setPointerCapture(e.pointerId);phase='dragging';
  });
  tear.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId||!['dragging','held'].includes(phase))return;
    e.preventDefault();
    const p=point(e),now=performance.now(),dt=Math.max(8,now-drag.time)/1000;
    const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
    drag.vx=clamp((p.x-drag.last.x)/dt,-950,950);drag.vy=clamp((p.y-drag.last.y)/dt,-950,950);
    lastTapMove=Math.max(lastTapMove,Math.hypot(dx,dy));
    if(phase==='dragging'){
      peelX=dx;peelY=dy;
      pose(clamp(Math.pow(Math.hypot(dx,dy*.85)/115,1.12),0,1));
      if(amount>=1){
        phase='held';dialog.classList.add('is-held');
        // Preserve both the exact detachment pose and the grabbed point.
        drag.detachedAt=p;drag.base={...current};drag.anchor=transformed(drag.start.x,drag.start.y);
        hint.textContent='票根在你手中';help.textContent='继续拖动 · 松手进入戏剧节';
        status.textContent='票根已撕开，仍可拖动，松手入场';
        fibres.forEach(({p:path})=>path.style.opacity=0);
      }
    }else{
      const ox=p.x-drag.detachedAt.x,oy=p.y-drag.detachedAt.y;
      const wobble=reduce.matches?0:clamp(drag.vx*.012-drag.vy*.006,-14,14);
      drag.angle+=(wobble-drag.angle)*.22;
      const base=drag.base,a=radians(drag.angle),rx=drag.anchor.x-base.cx-base.x,ry=drag.anchor.y-base.cy-base.y;
      render({...base,angle:base.angle+drag.angle,x:base.x+ox+rx-rx*Math.cos(a)+ry*Math.sin(a),y:base.y+oy+ry-rx*Math.sin(a)-ry*Math.cos(a)});
    }
    drag.last=p;drag.time=now;
  });
  function release(e){
    if(!drag||e.pointerId!==drag.id)return;
    const held=phase==='held',saved=drag;drag=null;
    if(e.type==='pointerup' && held){
      const fresh=performance.now()-saved.time<100;
      fall({x:fresh?saved.vx*.65:0,y:fresh?saved.vy*.45:0,spin:fresh?clamp(saved.vx*.08,-75,75):12});
    }else{
      // An interrupted touch restores the ticket; it never navigates accidentally.
      phase='idle';dialog.classList.remove('is-held');
      hint.textContent='请撕开以进入戏剧节';help.textContent='从右侧票联上端或下端撕开 · 松手入场';status.textContent='';
      if(held){pose(0);}else{const start=amount;animate(reduce.matches?1:360,t=>pose(start*Math.pow(1-t,3)),()=>pose(0));}
    }
    if(tear.hasPointerCapture?.(e.pointerId))tear.releasePointerCapture(e.pointerId);
  }
  tear.addEventListener('pointerup',release);
  tear.addEventListener('pointercancel',release);
  tear.addEventListener('lostpointercapture',release);
  tear.addEventListener('click',e=>{if(phase==='idle'&&(e.detail===0||lastTapMove<8))finish();});
  function tilt(){
    shownTiltX+=(targetTiltX-shownTiltX)*.13;shownTiltY+=(targetTiltY-shownTiltY)*.13;
    plane.style.transform=`rotateX(${shownTiltX}deg) rotateY(${shownTiltY}deg) rotateZ(-5deg)`;
    if(Math.abs(targetTiltX-shownTiltX)+Math.abs(targetTiltY-shownTiltY)>.02)tiltFrame=requestAnimationFrame(tilt);else tiltFrame=0;
  }
  dialog.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||reduce.matches||phase!=='idle')return;
    const r=plane.getBoundingClientRect();
    targetTiltX=8-clamp((e.clientY-r.top-r.height/2)/r.height,-.7,.7)*10;
    targetTiltY=-7+clamp((e.clientX-r.left-r.width/2)/r.width,-.7,.7)*12;
    if(!tiltFrame)tiltFrame=requestAnimationFrame(tilt);
  });
  addEventListener('pageshow',e=>{if(e.persisted){if(dialog.open)dialog.close();document.body.classList.remove('ticket-open');reset();trigger.setAttribute('aria-expanded','false');}});
})();
