// Body motion is measured after collision; aim remains a direct input.
const gait={vx:0,vz:0,speed:0,phase:0,blend:0,next:.42,steps:0,last:null,distance:0};
function restBody(){gait.vx=gait.vz=gait.speed=gait.blend=0}
function resetBody(){restBody();Object.assign(gait,{phase:0,next:.42,steps:0,last:null,distance:0});resetPulseTool()}
function groundContact(landing=0){
 const n=++gait.steps,side=n%2?-.105:.105;
 const x=px+Math.cos(yaw)*side,z=pz-Math.sin(yaw)*side;
 const metal=onDrainCover(x,z),wet=clamp((tide.level-(metal?.082:.055))/.38,0,1);
 // Alternate feet; the variation is repeatable in a recorded take and independent of drone AI.
 const variation=(.5+.5*Math.sin(n*18.39+Math.sin(n*.71)))*.72+(n%2)*.28;
 const load=clamp(.28+gait.speed*.12+landing*.24,.27,1.1);
 sfx(metal?'grate':'step',load*(1-wet*.48),variation);
 if(wet>.12){sfx('wade',load*wet*.92,1-variation);waterStep(x,z)}
 gait.last={surface:metal?'metal':'concrete',wet,variation,landing:!!landing};
}
function slideBody(x,z,delta,isX){
 const p=isX?x:z,other=isX?z:x;let q=clamp(p+delta,isX?-9.36:-14.65,isX?9.36:13.27);
 for(const b of obstacles){const center=isX?b.x:b.z,half=(isX?b.w:b.d)+.29;
  if(Math.abs(other-(isX?b.z:b.x))>=(isX?b.d:b.w)+.29)continue;
  if(delta>0&&p<=center-half)q=Math.min(q,center-half);
  if(delta<0&&p>=center+half)q=Math.max(q,center+half);
 }return q;
}
function moveBody(dt){
 let u=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+stickX,v=Number(keys.has('KeyS'))-Number(keys.has('KeyW'))+stickY;
 const len=Math.hypot(u,v),limit=focus?2.05:(keys.has('ShiftLeft')||keys.has('ShiftRight'))?5.2:3.55;
 const norm=limit/Math.max(1,len),tx=(u*Math.cos(yaw)+v*Math.sin(yaw))*norm,tz=(-u*Math.sin(yaw)+v*Math.cos(yaw))*norm;
 const dx=tx-gait.vx,dz=tz-gait.vz,diff=Math.hypot(dx,dz),rate=len<.001?48:(gait.vx*dx+gait.vz*dz<0?55:37);
 const k=diff?Math.min(1,rate*dt/diff):1;gait.vx+=dx*k;gait.vz+=dz*k;
 const x=px,z=pz;px=slideBody(x,z,gait.vx*dt,true);pz=slideBody(px,z,gait.vz*dt,false);
 if(Math.abs(px-x-gait.vx*dt)>1e-6)gait.vx=0;
 if(Math.abs(pz-z-gait.vz*dt)>1e-6)gait.vz=0;
 const dist=Math.hypot(px-x,pz-z);gait.speed=dist/dt;gait.distance+=dist;
 const wasAir=jumpY>0||jumpV>0;jumpV-=10.5*dt;jumpY+=jumpV*dt;
 if(jumpY<=0){const impact=-jumpV;jumpY=jumpV=0;if(wasAir&&impact>1.5){groundContact(impact*.7);gait.next=gait.phase+.75}}
 const stride=mix(.81,1.57,clamp(gait.speed/5.2,0,1));
 if(!wasAir&&jumpY===0){gait.phase+=dist/stride;if(gait.phase>=gait.next){groundContact();gait.next+=1}}
 const level=jumpY>0?0:clamp(gait.speed/3.55,0,1.18);
 gait.blend+=(level-gait.blend)*(1-Math.exp(-dt*16));
}
