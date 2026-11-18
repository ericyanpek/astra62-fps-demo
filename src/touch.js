// Each thumb owns its pointer until release, even when it leaves the original target.
const pad=$('stick'),fireKey=$('tf'),view=$('world');
let moveId=null,aimId=null,fireId=null,aimX=0,aimY=0;
function enableTouchUI(){
  touchMode=true;document.documentElement.classList.add('touch-ui');
  if(active())$('touch').classList.remove('hide');
}
if(touchMode)enableTouchUI();
document.addEventListener('pointerdown',e=>{
  if(!touchMode&&e.pointerType==='touch'){enableTouchUI();queueResize()}
},true);
function centerPad(){stickX=stickY=0;pad.firstElementChild.style.transform=''}
function resetTouchInput(){moveId=aimId=fireId=null;centerPad()}
function movePad(e){
  const box=pad.getBoundingClientRect(),radius=box.width*.36;
  const x=(e.clientX-box.x-box.width/2)/radius,y=(e.clientY-box.y-box.height/2)/radius;
  const length=Math.hypot(x,y),travel=Math.min(1,length);
  // A resting thumb can drift a few pixels. Keep the outer rim at full speed.
  const power=Math.pow(Math.max(0,(travel-.085)/.915),1.12);stickX=length?power*x/length:0;stickY=length?power*y/length:0;
  pad.firstElementChild.style.transform=`translate(${stickX*radius*.74}px,${stickY*radius*.74}px)`;
}
function beginAim(e){if(aimId===null){aimId=e.pointerId;aimX=e.clientX;aimY=e.clientY}}
function dragAim(e){
  if(e.pointerId!==aimId||!active())return;
  setAim((e.clientX-aimX)*1.85,(e.clientY-aimY)*1.85);aimX=e.clientX;aimY=e.clientY;
}
function endPointer(e){
  if(e.pointerId===moveId){moveId=null;centerPad()}
  if(e.pointerId===aimId)aimId=null;
  if(e.pointerId===fireId){fireId=null;fireHeld=false}
}
for(const node of [pad,view,fireKey]){
  for(const type of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(type,endPointer);
}
pad.onpointerdown=e=>{
  if(moveId!==null||!active())return;
  moveId=e.pointerId;pad.setPointerCapture(moveId);movePad(e);
};
pad.onpointermove=e=>{if(e.pointerId===moveId)movePad(e)};
view.onpointerdown=e=>{
  if(e.pointerType==='mouse'||!active()||aimId!==null)return;
  beginAim(e);view.setPointerCapture(e.pointerId);
};
view.onpointermove=fireKey.onpointermove=dragAim;
fireKey.onpointerdown=e=>{
  if(fireId!==null||!active())return;
  fireId=e.pointerId;fireKey.setPointerCapture(fireId);beginAim(e);fireHeld=true;shotQueue=true;
};
$('tr').onclick=reload;$('te').onclick=useGate;$('tp').onclick=pause;

$('ammo').onclick=toggleInspection;
