// R-03 Breakwater. All positions below use the concept mesh's right/up/back axes.
// Each rigid assembly is one indexed draw, including all its enamel and metal edges.
const gun=group(weaponScene),tool=group(gun),rifleScale=.177;
gun.scale.setScalar(rifleScale);
weaponScene.add(new T.HemisphereLight(0xd6e7e6,0x677369,1.10));
const glight=new T.DirectionalLight(0xffdfb0,2.55),edgeLight=new T.DirectionalLight(0xb9e2f1,1.1);
glight.position.set(2,3,-1);edgeLight.position.set(-2,2,1.7);weaponScene.add(glight,edgeLight);

function unpackRifle(text){
 // LZ4 block; a length prefix keeps this synchronous even when opened from file://.
 const input=Uint8Array.from(atob(text),c=>c.charCodeAt(0)),size=new DataView(input.buffer).getUint32(0,true),out=new Uint8Array(size);
 let i=4,o=0;const length=n=>{if(n===15){let v;do{v=input[i++];n+=v}while(v===255)}return n};
 while(i<input.length){const tag=input[i++],literal=length(tag>>>4);out.set(input.subarray(i,i+literal),o);i+=literal;o+=literal;if(i===input.length)break;
  const offset=input[i]|(input[i+1]<<8);i+=2;const n=length(tag&15)+4;for(let k=0;k<n;k++,o++)out[o]=out[o-offset];}
 if(o!==size||String.fromCharCode(...out.subarray(0,4))!=='BW03')throw Error('Invalid Breakwater mesh');return out;
}
// Use one material for the opaque batches but retain distinct roughness and metallic response
// per vertex. A small shared surface map adds fine wear on the close-up and exposed bevels.
function rifleSurface(){
 const c=canvas(256,256),cx=c.getContext('2d'),im=cx.createImageData(256,256);let n=4031;
 const noise=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4,b=230+noise()*23+2*Math.sin(.13*x+.5*Math.sin(.17*y));im.data[k]=im.data[k+1]=im.data[k+2]=b;im.data[k+3]=255}cx.putImageData(im,0,0);
 for(let j=0;j<170;j++){let x=noise()*256,y=noise()*256;cx.lineWidth=.4+noise()*.5;cx.strokeStyle=j%3?'#524e483d':'#faf4d084';cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+noise()*13+.7,y+noise()*2-.7);cx.stroke()}return tex(c);
}
const rifleMap=rifleSurface(),rifleFinish=mat(0xffffff,1,1,{vertexColors:true,map:rifleMap});
rifleFinish.onBeforeCompile=s=>{
 s.vertexShader='attribute vec2 surfaceMR; varying vec2 vSurfaceMR;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceMR=surfaceMR;');
 s.fragmentShader='varying vec2 vSurfaceMR;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=vSurfaceMR.y;').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor*=vSurfaceMR.x;');
};
const coilMat=glow(0x69b9ac,.38),glassMat=mat(0x86ac9f,.24,.19,{transparent:true,depthWrite:false,opacity:.12,side:T.DoubleSide});
const gaugeMats=Array.from({length:3},()=>glow(0x94e0c4,1)),partNames=['body','mag','slide','left','right','coil','glass','gauge0','gauge1','gauge2'];
function readRifle(text){
 const b=unpackRifle(text),dv=new DataView(b.buffer),palette=[],parts={};let a=6;
 for(let i=0;i<b[4];i++,a+=5){const color=new T.Color().setRGB(b[a]/255,b[a+1]/255,b[a+2]/255,T.SRGBColorSpace);palette.push([color,b[a+3]/255,b[a+4]/255])}
 const unplane=(n,stride)=>{const buf=new Uint8Array(n*stride);for(let j=0;j<stride;j++){let v=0;for(let k=j;k<buf.length;k+=stride)buf[k]=v=(v+b[a++])&255}return buf};
 for(let j=0;j<b[5];j++){
  const name=partNames[j],n=dv.getUint16(a,true),ni=dv.getUint32(a+2,true);a+=6;const raw=unplane(n,10),d=new DataView(raw.buffer);
  const pos=new Float32Array(n*3),norm=new Float32Array(n*3),uv=new Float32Array(n*2),colors=new Uint8Array(n*3),mr=new Uint8Array(n*2);
  for(let k=0;k<n;k++){let h=k*10,xx=d.getInt16(h,true)/6000,yy=d.getInt16(h+2,true)/6000,zz=d.getInt16(h+4,true)/6000,x=d.getInt8(h+6)/127,y=d.getInt8(h+7)/127,z=1-Math.abs(x)-Math.abs(y);
   if(z<0){const ox=x;x=(1-Math.abs(y))*(x<0?-1:1);y=(1-Math.abs(ox))*(y<0?-1:1)}const scale=1/Math.hypot(x,y,z);pos.set([xx,yy,zz],3*k);norm.set([x*scale,y*scale,z*scale],3*k);
   const [c,m,r]=palette[raw[h+8]],ao=raw[h+9];colors.set([Math.round(ao*c.r),Math.round(ao*c.g),Math.round(ao*c.b)],3*k);mr.set([Math.round(255*m),Math.round(255*r)],2*k);
   uv.set(Math.abs(x)>Math.abs(y)&&Math.abs(x)>Math.abs(z)?[zz*1.41,yy*1.41]:Math.abs(y)>Math.abs(z)?[zz*1.41,xx*1.41]:[xx*1.41,yy*1.41],2*k);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(norm,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('color',new T.BufferAttribute(colors,3,true));g.setAttribute('surfaceMR',new T.BufferAttribute(mr,2,true));
  g.setIndex(new T.BufferAttribute(new Uint16Array(unplane(ni,2).buffer),1));g.computeBoundingSphere();const m=name==='coil'?coilMat:name==='glass'?glassMat:name.startsWith('gauge')?gaugeMats[+name.slice(-1)]:rifleFinish;
  const o=new T.Mesh(g,m);o.name='R-03 / '+name;tool.add(o);parts[name]=o;
 }if(a!==b.length)throw Error('Truncated Breakwater geometry');return parts;
}
const BW=readRifle('/* @embed breakwater.mesh */'),cell=BW.mag,shoe=BW.slide;
// Each cell retains its own markings and charge lights throughout the exchange.
const chargeSeconds=1.64,releaseAt=.223,seatAt=.798;
const gripEase=(a,b,t)=>{const u=clamp((t-a)/(b-a),0,1);return u*u*(3-2*u)};
const seatedGrip=V(-.232,-.62,-.69),homePalm=V(-.142,-.018,-1.58),looseDir=V(),hand=group(tool);
const packs=[cell,cell.clone(false)].map((mesh,i)=>{const rig=group(tool);rig.name=i?'cell / amber B07':'cell / ivory A12';rig.add(mesh);mesh.position.copy(seatedGrip).multiplyScalar(-1);rig.position.copy(seatedGrip);rig.visible=!i;return {rig,mesh,bars:[],idx:i}});
const exch={mounted:0,from:0,startCount:16,attached:true,phase:'就位'};
function startExchange(){exch.from=exch.mounted;exch.startCount=rounds;reloading=chargeSeconds;focus=false;stopInspection()}
function tickCharge(dt){if(reloading<=0)return;const last=1-reloading/chargeSeconds;reloading=Math.max(0,reloading-dt);const t=1-reloading/chargeSeconds;
 if(last<releaseAt&&t>=releaseAt)sfx('reloadA');if(last<seatAt&&t>=seatAt){exch.mounted=1-exch.from;rounds=16;sfx('reloadB')};}
const hideGlove=BW.left;tool.remove(hideGlove);tool.remove(BW.right);
const hideLeather=mat(0x464438,.025,.85),reinforced=mat(0x30332e,.04,.80),stitch=mat(0x686450,.02,.86);
const palmShell=ell(0,0,0,.130,.105,.235,hideLeather,hand),palmPad=ell(0,0,0,1,1,1,reinforced,hand);
const wristPoint=V(),fingers=[];
function fingerSkin(points,r){const curve=new T.CatmullRomCurve3(points.map(a=>V(...a))),segs=16,n=10,frame=curve.computeFrenetFrames(segs,false),vs=[],ids=[];
 for(let i=0;i<=segs;i++){const u=i/segs,p=curve.getPointAt(u),rad=r*(.99-.11*u)*Math.min(1,.18+u*17,.14+(1-u)*12);for(let j=0;j<=n;j++){const a=j*TAU/n;vs.push(...p.clone().addScaledVector(frame.normals[i],-rad*Math.cos(a)).addScaledVector(frame.binormals[i],rad*Math.sin(a)).toArray())}}
 for(let i=0;i<segs;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;ids.push(a,b,a+1,b,b+1,a+1)}const cols=[];for(let i=0;i<=segs;i++)for(let j=0;j<=n;j++){const u=i/segs,k=(i===5||i===10||i===12)?.65:(u>.84?.84:1);cols.push(k,k,k)}const g=new T.BufferGeometry();g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setIndex(ids);g.computeVertexNormals();return g;}
const fingerHide=hideLeather.clone();fingerHide.vertexColors=true;
function digit(s,o,c,r){const g=fingerSkin(s,r),targets=[fingerSkin(o,r),fingerSkin(c,r)];for(const attr of ['position','normal'])g.morphAttributes[attr]=targets.map(v=>v.getAttribute(attr));const m=new T.Mesh(g,fingerHide);m.frustumCulled=false;hand.add(m);fingers.push(m)}
for(let i=0;i<4;i++){const z=-.164+i*.100,h=.143-i*.095,front=-.143-i*.040;
 digit([[-.004,-.036,z],[-.088,-.005,z-.012],[-.113,.074,z-.018],[-.116,.143,z-.026],[-.095,.214-i*.009,z-.038]],
 [[-.025,h,-.018],[-.082,h+.02,-.10],[-.091,h+.04,-.22],[-.055,h+.045,-.29],[-.015,h+.044,-.33]],
 [[-.020,h,-.017],[-.012,h+.013,front+.06],[.026,h+.014,front-.021],[.113,h+.003,front-.035],[.18,h-.012,front-.014]],i===3?.041:.047);}
digit([[.02,-.045,.145],[.093,-.046,.104],[.167,-.016,.046],[.23,.066,-.02],[.251,.108,-.082]], [[-.018,.0,.07],[-.069,.08,.145],[-.065,.168,.22],[-.04,.236,.249],[-.009,.27,.234]], [[-.016,.003,.073],[-.05,.087,.14],[-.048,.183,.141],[-.017,.23,.084],[.042,.22,.057]],.060);
// A complete back and web join the support points around the grip, including when the left hand is away.
const strongHand=group(tool);ell(.064,-.545,.846,.163,.246,.156,hideLeather,strongHand);ell(.017,-.57,.932,.120,.19,.105,reinforced,strongHand);
for(let i=0;i<4;i++){const h=-.31-i*.119,zf=.411+i*.047,zb=.801+i*.052;const route=[[.075,h-.005,zb+.044],[-.057,h-.01,zb+.061],[-.158,h,zb+.026],[-.198,h+.012,zb-.079],[-.205,h+.017,zf+.077],[-.155,h+.022,zf-.015],[-.074,h+.021,zf-.03]];strongHand.add(new T.Mesh(fingerSkin(route,i===3?.050:.055),fingerHide));const pad=ell(-.195,h+.029,zb-.078,.024,.031,.068,reinforced,strongHand);pad.rotation.x=-.20;ell(-.175,h+.033,zb+.002,.030,.029,.048,reinforced,strongHand);}
strongHand.add(new T.Mesh(fingerSkin([[.13,-.53,.893],[.064,-.431,.92],[-.025,-.351,.887],[-.103,-.311,.807],[-.165,-.304,.731]],.077),fingerHide));
const contactRot=new T.Quaternion(),contactEuler=new T.Euler(0,0,0,'YXZ'),identitySwap=new T.Quaternion();
function moveExchange(t){
 const playing=reloading>0,reach=gripEase(0,releaseAt,t)*(1-gripEase(seatAt,1,t)),cl=gripEase(.105,releaseAt,t)*(1-gripEase(seatAt,.904,t));
 // One sweep, with a sideways tangent as the hand turns below the frame.
 // The palm and the held cell use the same transform until the contact ends.
 const u=clamp((t-releaseAt)/(seatAt-releaseAt),0,1),entering=u>=.5,away=Math.sin(PI*u)**2,sweep=away*Math.sin(TAU*u);
 const depth=touchMode&&cam.aspect<1?3.05:2.34;
 looseDir.set(-.48*away-.28*sweep,-depth*away,-.21*away-.15*sweep);
 contactRot.setFromEuler(contactEuler.set(-.15*away,.09*away-.075*sweep,-.16*away,'YXZ'));
 const activePack=playing?(entering?1-exch.from:exch.from):exch.mounted;
 for(const p of packs){p.rig.visible=p.idx===activePack&&(!playing||Math.abs(u-.5)>.018);p.rig.position.copy(seatedGrip).add(looseDir);p.rig.quaternion.copy(contactRot)}
 hand.position.lerpVectors(homePalm,seatedGrip,reach).addScaledVector(looseDir,reach);const arc=Math.sin(PI*reach);hand.position.x-=.25*arc;hand.position.y-=.27*arc;hand.quaternion.slerpQuaternions(identitySwap,contactRot,reach);
 palmShell.scale.set(mix(.13,.093,reach),mix(.105,.209,reach),mix(.235,.155,reach));palmPad.position.set(mix(-.025,-.065,reach),mix(-.079,-.012,reach),.01);palmPad.scale.set(mix(.12,.051,reach),mix(.048,.142,reach),mix(.174,.107,reach));
 for(const f of fingers){f.morphTargetInfluences[0]=reach*(1-cl);f.morphTargetInfluences[1]=reach*cl}wristPoint.set(mix(-.072,-.032,reach),mix(-.07,-.162,reach),mix(.156,.12,reach));
 exch.attached=!playing||t<releaseAt||t>=seatAt;exch.phase=!playing?'就位':t<releaseAt?'握住旧匣':t>=seatAt?'已扣合':entering?'新匣接入':'旧匣退出';
 for(const p of packs){const count=playing?(p.idx===exch.from?exch.startCount:16):rounds;if(p.shownCount===count)continue;p.shownCount=count;const lights=Math.ceil(count/4);for(let i=0;i<p.bars.length;i++)p.bars[i].material=(i%4)<lights?(count<=4?cellAmber:cellMint):cellOff;}
 const tiltTime=t+.079*Math.sin(TAU*t);
 return Math.sin(PI*tiltTime)**1.65;
}
// Anchor the gloves to the prop and the sleeves to the camera. This keeps the wrist
// inside the cuff when the player rolls the rifle or cycles reserve power.
function oilskin(){
 const c=canvas(128,128),q=c.getContext('2d'),im=q.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(128*y+x)*4,b=49+3*Math.cos(TAU*(x+y*.5)/4)+2*Math.cos(TAU*y/4)+2*Math.sin(TAU*(3*x+2*y)/128);im.data[i]=b-5;im.data[i+1]=b+4;im.data[i+2]=b;im.data[i+3]=255}q.putImageData(im,0,0);
 q.strokeStyle='#6a746a';q.setLineDash([2,3]);for(const x of [20,23]){q.beginPath();q.moveTo(x,0);q.lineTo(x,128);q.stroke()}
 return mat(0xffffff,.04,.87,{map:tex(c)});
}
const jacket=oilskin(),cuff=mat(0x303833,.02,.93);
function sleeveForm(profile,material){
 const verts=[],uv=[],faces=[],n=22;
 for(const [y,r] of profile){for(let j=0;j<=n;j++){const a=TAU*j/n,r0=r*(1+.038*Math.cos(5*a+2.5*y)+.035*Math.cos(3*a-4*y));verts.push(r0*Math.sin(a),y,r0*.82*Math.cos(a));uv.push(j/n,y*2.5)}}
 for(let k=0;k<profile.length-1;k++)for(let j=0;j<n;j++){const i=k*(n+1)+j;faces.push(i,i+1,i+n+1,i+1,i+n+2,i+n+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(faces);g.computeVertexNormals();return new T.Mesh(g,material);
}
const jacketShell=sleeveForm([[0,1.72],[.29,1.58],[.46,1.53],[.55,1.32],[.61,1.52],[.65,1.54],[.72,1.24],[.77,1.36],[.82,1.38],[.89,1]],jacket);
const wristBand=sleeveForm([[.86,1.08],[.89,1.13],[.92,1.10],[.965,1.07],[.991,1.08],[1,.85]],cuff);
function makeArm(glove,point,r){const arm=group(weaponScene);arm.add(jacketShell.clone(),wristBand.clone());return {arm,glove,point,r}}
const r03Arms=[makeArm(hand,wristPoint,.033),makeArm(strongHand,V(.076,-.68,.975),.036)],armDir=V(),elbow=V(),armUp=V(0,1,0);
function wrapArms(side){for(const [i,{arm,glove,point,r}] of r03Arms.entries()){
 elbow.set((i?.35:-.18)*side,-.35,i?-.03:-.10);glove.localToWorld(armDir.copy(point));armDir.sub(elbow);
 arm.position.copy(elbow);arm.scale.set(r,armDir.length(),r);arm.quaternion.setFromUnitVectors(armUp,armDir.normalize());
}}
// The stamped plate is legible in inspection or while the receiver is rolled.
const stamp=canvas(660,210),ink=stamp.getContext('2d');ink.fillStyle='#e0d8b8';ink.font='bold 173px Helvetica,Arial,sans-serif';ink.fillText('03',0,167);ink.fillRect(205,21,5,155);
ink.font='bold 51px sans-serif';ink.fillText('北岬泵务',232,87);ink.font='bold 25px monospace';ink.fillText('N.C.W. / BREAKWATER',233,137);ink.font='17px monospace';ink.fillText('FLOODWALL   ·   R / 03',233,169);
let stampSeed=73;for(let i=0;i<3200;i++){stampSeed=Math.imul(stampSeed,1664525)+1013904223|0;let x=(stampSeed>>>9)%660,y=(stampSeed>>>2)%210;ink.clearRect(x,y,1+(x%5),1.4)}
const stencil=mat(0xffffff,.14,.65,{map:tex(stamp,false),alphaTest:.45,polygonOffset:true,polygonOffsetFactor:-1});emit(new T.PlaneGeometry(.68,.22),stencil,-.2825,.383,.35,0,-PI/2,0,tool);
// The amber service tag, a wrap stencil on the cell, and a cloth weave catch the eye up close.
function sideTransfer(parent,x,y,z,width,height,str,color){const c=canvas(512,96),q=c.getContext('2d');q.fillStyle=color;q.font='bold 60px monospace';q.fillText(str,8,68,498);let m=mat(0xffffff,.14,.66,{map:tex(c,false),alphaTest:.45,polygonOffset:true,polygonOffsetFactor:-1});emit(new T.PlaneGeometry(width,height),m,x,y,z,0,-PI/2,0,parent)}
sideTransfer(tool,-.291,.200,-.435,.39,.07,'△  RESIDUAL CHARGE','#2b312e');sideTransfer(tool,-.148,.337,1.565,.275,.080,'NCW   ///','#e5d6ae');
const cellAmber=glow(0xf8aa42,.82),cellMint=glow(0x60cca9,.76),cellOff=mat(0x172220,.15,.42);
for(const p of packs){const m=p.mesh,band=p.idx?M.amber:M.cream;
 const plate=group(m);plate.position.set(-.206,-.288,-.521);
 box(-.008,0,.012,.022,.117,.333,M.dark,plate);for(let i=0;i<4;i++)p.bars.push(box(-.022,.003,-.114+i*.077,.013,.063,.05,cellOff,plate));
 const rear=group(m);rear.position.set(0,-.40,-.29);rear.rotation.x=.344;box(0,0,.006,.29,.098,.023,M.dark,rear);for(let i=0;i<4;i++)p.bars.push(box(-.104+i*.068,0,.023,.044,.055,.012,cellOff,rear));
 for(let i=0;i<(p.idx?2:1);i++){const y=-.72+i*.071,zb=-.383+(y+.63)*.567;box(-.205,y,-.694,.023,.048,.31,band,m,-.18);box(0,y,zb+.011,.33,.050,.023,band,m,.50)}
 box(-.003,-.103,-.51,.232,.027,.242,M.brass,m);sideTransfer(m,-.205,-.425,-.567,.245,.071,p.idx?'B / 07':'A / 12',p.idx?'#edd28d':'#e0e1cd');
}
// Physical rear-facing readout on the left shoulder of the casting, below the sightline.
const pod=group(tool);pod.position.set(-.19,.559,.928);pod.rotation.x=-.58;
chamfer(0,0,0,.192,.135,.10,.022,M.dark,pod);const display=canvas(160,96),dc=display.getContext('2d'),displayTex=tex(display,false);
emit(new T.PlaneGeometry(.16,.102),new T.MeshBasicMaterial({map:displayTex,toneMapped:false}),0,.001,.061,0,0,0,pod);
const muzzle=halo(0,.34,-3.48,1.25,0xbdfbef,tool,0),muzzleLamp=new T.PointLight(0x85dcd4,0,1.1);tool.add(muzzleLamp);muzzleLamp.position.set(0,.34,-3.50);
const sightAnchor=new T.Object3D();tool.add(sightAnchor);sightAnchor.position.set(0,.918,.104);
const packAnchors=packs.map(p=>{const a=new T.Object3D();p.mesh.add(a);a.position.set(-.203,-.425,-.57);return a});
const heelAnchor=new T.Object3D();tool.add(heelAnchor);heelAnchor.position.set(.17,-.37,3.04);
const weaponMotion={slide:0,velocity:0,flash:0,lastDisplay:'',lastBars:-1,inspect:0,inspectWanted:false};
function resetPulseTool(){Object.assign(exch,{mounted:0,from:0,startCount:16,attached:true,phase:"就位"});Object.assign(weaponMotion,{slide:0,velocity:0,flash:0,lastDisplay:'',lastBars:-1,inspect:0,inspectWanted:false})}
function stopInspection(){weaponMotion.inspectWanted=false}
function toggleInspection(){if(active()&&mode!=='drain'&&reloading<=0&&!fireHeld&&!focus){weaponMotion.inspectWanted=!weaponMotion.inspectWanted;}}
function pulseToolShot(){stopInspection();weaponMotion.velocity=Math.min(8.3,weaponMotion.velocity+6.1);weaponMotion.flash=1}
function posePulseTool(dt){
 const w=weaponMotion;w.velocity+=(-290*w.slide-27*w.velocity)*dt;w.slide=clamp(w.slide+w.velocity*dt,-.045,.24);w.flash*=Math.exp(-dt*22);
 if(focus||fireHeld||reloading>0||mode==='drain')stopInspection();w.inspect+=(Number(w.inspectWanted)-w.inspect)*(1-Math.exp(-dt*(w.inspectWanted?9:17)));
 const charging=reloading>0,t=charging?1-reloading/chargeSeconds:0;
 const docked=!charging||t<releaseAt||t>=seatAt,label=docked?String(rounds).padStart(2,'0'):'--',bars=docked?Math.ceil(rounds/4):0;
 shoe.position.z=w.slide*1.9;coilMat.emissiveIntensity=.38+w.flash*3.2;
 if(label!==w.lastDisplay||bars!==w.lastBars){w.lastDisplay=label;w.lastBars=bars;dc.fillStyle='#152524';dc.fillRect(0,0,160,96);dc.fillStyle=docked&&rounds>3?'#c6efdc':'#ffd393';dc.textAlign='center';dc.font='bold 70px monospace';dc.fillText(label,80,68);for(let i=0;i<4;i++){dc.fillStyle=i<bars?'#83d6b8':'#38423a';dc.fillRect(18+i*32,77,25,7)}displayTex.needsUpdate=true;
 gaugeMats.forEach((m,i)=>{const on=bars>i;m.color.setHex(on?(rounds<=4?0xf7b45a:0x98dbc2):0x293a36);m.emissive.copy(m.color);m.emissiveIntensity=on?1.05:.025})}
 glight.position.set(2*Math.cos(yaw+.9),3.2,-.8+Math.sin(yaw+.9)*2);
}
const gripPivot=V(.10,-.53,.78).multiplyScalar(rifleScale),restQ=new T.Quaternion(),restEuler=new T.Euler(0,0,0,'YXZ'),pivotA=V(),pivotB=V();
function poseRifle(amp,pace){
 const w=weaponMotion,a=ads,t=reloading>0?1-reloading/chargeSeconds:0,roll=moveExchange(t),settle=clamp((t-seatAt)/.113,0,1),seat=(729/16)*settle**2*(1-settle)**4;
 const narrow=touchMode&&cam.aspect<1,side=narrow?Math.min(1,cam.aspect/.95):1;
 const breath=reduced.matches?0:Math.sin(worldTime*1.85)*.0013,walk=amp*(1-a*.90);
 // Seat the camera at the same shoulder as the concept render. At full focus the
 // aperture centre is exactly on the centre ray, regardless of screen aspect.
 const centredY=-sightAnchor.position.y*rifleScale;
 let x=mix(.156*side,0,a)+Math.cos(pace)*.0075*walk,y=mix(narrow?-.254:-.222,centredY,a)+breath*(1-a)+Math.sin(pace*2)*.004*walk,z=mix(narrow?-.558:-.459,-.477,a);
 const k=w.inspect,inspectZoom=narrow?.94/Math.max(.40,cam.aspect):1;
 gun.position.set(mix(x,-.06*side,k)-roll*.002*side,mix(y,narrow?-.31:-.125,k)+roll*.125,mix(z,-.92*inspectZoom,k)-roll*.22+w.slide*.13);
 const pitch0=mix(-.040*(1-a),.085,k)+w.slide*.23,yaw0=mix(.010*(1-a),narrow?.74:1.08,k),bank0=mix(-.025*(1-a),narrow?-.24:-.115,k)+Math.cos(pace)*.004*walk;
 gun.rotation.set(pitch0+roll*.058-seat*.016,yaw0+roll*(narrow?.34:.49),bank0-roll*.25,'YXZ');
 // Roll around the hand that bears the weight, instead of orbiting the whole prop.
 if(roll){restQ.setFromEuler(restEuler.set(pitch0,yaw0,bank0,'YXZ'));gun.position.add(pivotA.copy(gripPivot).applyQuaternion(restQ)).sub(pivotB.copy(gripPivot).applyQuaternion(gun.quaternion))}

 wrapArms(side);
 muzzle.material.opacity=flashT>0?flashT/.076:0;muzzleLamp.intensity=flashT*12.7;
}
function rifleScreenPoint(o){const v=o.getWorldPosition(V()).project(gunCam);return [v.x,v.y]}
