// Every warning belongs to a visible action: a slow scout shot, a crossing or a marked floor.
let waveStart=0,nextMastLock=0;const sectorSize=1.65;
const sectorPaint=new T.MeshBasicMaterial({color:0xffbf66,transparent:true,opacity:.83,depthWrite:false,side:T.DoubleSide});
function makeSector(){const g=new T.Group(),flat=(geo,mat)=>{const o=new T.Mesh(geo,mat);o.rotation.x=-PI/2;o.renderOrder=5;g.add(o);return o};
 flat(new T.RingGeometry(sectorSize-.045,sectorSize,52),sectorPaint);
 for(let i=0;i<4;i++)flat(new T.RingGeometry(sectorSize-.19,sectorSize-.10,9,1,i*PI/2+.12,.48),sectorPaint);
 const sweep=flat(new T.RingGeometry(.93,1,44),sectorPaint);g.visible=false;dyn.add(g);return {g,sweep};
}
const sectorCue=new T.RingGeometry(.85,1,28),cueMaterial=new T.MeshBasicMaterial({color:0xffd783,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide});
function chargeLens(e){const ring=new T.Mesh(sectorCue,cueMaterial);ring.position.set(0,.045,.41);ring.visible=false;e.o.add(ring);return ring}
function easeBand(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function updateFlight(e,dt){
 const {o,kind}=e,t=e.age+=dt,a=e.phase;
 e.stun=Math.max(0,e.stun-dt);e.disabled=Math.max(0,(e.disabled||0)-dt);
 let x,z,y;
 if(kind==='skimmer'){
  const side=e.id%2?1:-1,track=(e.id>>1)%2,lap=(simTime-waveStart+track*.56)%8.6;
  const crossing=easeBand(.85,2.85,lap)*(1-easeBand(5.55,7.7,lap));
  const flank=side*(5.35+track*.43),inside=side*(1.40+track*.57);
  x=mix(flank,inside,crossing)+.34*Math.sin(t*1.45+a);
  z=mix(-9.15+track*.76,-4.8-track*1.15,crossing)+.50*Math.sin(t*.96+a);
  const lift=track?1.40:.56;y=tide.level+.61+(1-crossing)*lift+.11*Math.sin(t*2+a);
 }else if(kind==='mast'){
  const side=e.id===8?-1:1;
  x=side*(3.35+.98*Math.sin(t*.45+a))+clamp(px*.19,-.9,.9);z=-6.15+Math.sin(t*.54+a)*1.08+clamp(pz*.15,-.9,.9);
  y=3.95+Math.sin(t*.74+a)*.24;
 }else{
  const hold=e.fire<1.16?.35:1;x=e.baseX+Math.sin(t*.64+a)*1.30*hold;z=e.baseZ+Math.min(2.15,t*.28)+.58*Math.sin(t*.45+a);y=e.alt+.25*Math.sin(t*1.34+a);
 }
 if(e.disabled>0)y=tide.level+.34;
 for(const b of obstacles)if(Math.abs(x-b.x)<b.w+.57&&Math.abs(z-b.z)<b.d+.5)y=Math.max(y,b.h+.55);
 y+=Math.exp(-t*1.75)*.83-e.stun*.60;
 o.position.lerp(tmp1.set(x,y,z),1-Math.exp(-dt*(kind==='skimmer'?3.15:2.6)));
 const bank=e.stun/.31;
 o.rotation.set(Math.sin(t*1.8+a)*.048+bank*.20,Math.atan2(px-o.position.x,pz-o.position.z),Math.sin(t*1.43+a)*.11+bank*(e.hitSide||1)*.58);
 e.sh.position.set(o.position.x,Math.max(.049,tide.level+.018),o.position.z);
 if(e.slip){e.slip.position.set(o.position.x,tide.level+.048,o.position.z);e.slip.visible=inHammerReach(e)}
}
function inHammerReach(e){return e.kind!=='mast'&&e.o.position.y<=tide.level+1.31}
function lockThreat(e){return e.sector?.g.visible&&Math.hypot(px-e.lockX,pz-e.lockZ)<sectorSize}
function cancelSector(e){if(e.sector)e.sector.g.visible=false;e.lockLeft=0}
function updatePatrol(e,dt){
 updateFlight(e,dt);const o=e.o,seen=lineClear(o.position,pEye);let warning=0;
 if(e.kind==='mast'){
  if(e.lockLeft>0){
   e.lockLeft=Math.max(0,e.lockLeft-dt);warning=1-e.lockLeft/1.45;
   e.sector.g.position.set(e.lockX,Math.max(.095,tide.level+.065),e.lockZ);e.sector.sweep.scale.setScalar(.15+sectorSize*(1-warning));
   if(e.lockLeft===0){const dest=V(e.lockX,e.sector.g.position.y,e.lockZ);particle('line',o.position,V(),.13,.045,0xffbd72,dest);shower(dest,6,0xffc787);
    if(lockThreat(e)&&seen&&jumpY<.57)damage(22);if(tide.level>.12)waterStep(e.lockX,e.lockZ);sfx('arc',.69);cancelSector(e);e.fire=3.9+gr()*1.6;}
  }else if(seen&&e.age>.8&&(e.fire-=dt)<=0&&simTime>nextMastLock){
   e.lockX=px;e.lockZ=pz;e.lockLeft=1.45;e.sector.g.position.set(px,Math.max(.095,tide.level+.065),pz);e.sector.g.visible=true;e.sector.sweep.scale.setScalar(sectorSize);nextMastLock=simTime+2.55;sfx('scan',.62);
  }
 }else{
  if(seen&&e.age>.7&&e.disabled<=0){const old=e.fire;e.fire-=dt;const lead=e.kind==='scout'?1.15:.69;
   if(old>lead&&e.fire<=lead){e.aim.copy(pEye);sfx('chirp',e.kind==='scout'?.50:.32)}
   warning=e.fire<lead?1-clamp(e.fire/lead,0,1):0;
   if(e.fire<=0){sendBolt(e,e.aim);e.fire=(e.kind==='scout'?4.5:wave===2?3.7:3.05)+gr()*1.35;warning=0}
  }else if(!seen||e.disabled>0){e.fire=Math.max(e.fire,e.kind==='scout'?1.2:.75)}
 }
 e.lens.visible=warning>.005;e.lens.scale.setScalar(.105+.22*warning);e.warn.material.opacity=warning*(.42+.30*Math.sin(e.age*23)**2);
 e.eye.material.color.setHex(e.disabled>0?0x84ffe0:0xff6535);e.eye.material.opacity=.50+e.stun*1.35;
}
