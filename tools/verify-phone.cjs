// Run against the single-file build. PHONE_ENGINE=webkit uses Playwright's WebKit.
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const engine=process.env.PHONE_ENGINE||'chromium';
const out=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'tidemark-phone-'));
const file=pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?qa';
const runs=[
  // CSS pixels: browser-constrained viewport, edge-to-edge viewport, and shorter toolbar stress cases.
  ['portrait-bars',430,739,[0,0,0,0]],['portrait-full',430,932,[59,0,34,0]],
  ['landscape-bars',814,380,[0,0,0,0]],['landscape-short',932,323,[0,59,21,59]],
  ['landscape-full',932,430,[0,59,21,59]],['portrait-short',360,640,[0,0,20,0]]
];
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:{channel:'chrome'});
  try{
    const ctx=await browser.newContext({...devices['iPhone 15 Pro Max'],offline:engine!=='webkit'});
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    let url=file;
    if(engine==='webkit'){
      // WebKit's simulated offline mode blocks file: navigation as well. Fulfil the only
      // document locally with an HTTPS origin, as on Pages; abort any other request.
      url='https://phone.test/index.html?qa';
      await ctx.route('**/*',r=>r.request().url()===url?r.fulfill({contentType:'text/html; charset=utf-8',path:path.resolve(__dirname,'../index.html')}):r.abort());
    }
    await page.goto(url);await page.waitForFunction(()=>window.__tidemark,undefined,{timeout:30000});
    await page.evaluate(()=>__tidemark.manual());
    const snap=()=>page.evaluate(()=>__tidemark.snapshot());
    const step=s=>page.evaluate(s=>__tidemark.advance(s),s);
    const rect=s=>page.locator(s).boundingBox();
    const screenshot=name=>page.screenshot({path:path.join(out,name+'.png'),scale:'css'});
    for(const [label,w,h,insets] of runs){
      // Each layout starts in the same state. Waiting through six reloads in one
      // encounter would let the patrol kill the stationary player mid-assertion.
      if(label!==runs[0][0]){await page.goto(url);await page.waitForFunction(()=>window.__tidemark);await page.evaluate(()=>__tidemark.manual())}
      await page.setViewportSize({width:w,height:h});
      // Desktop engines do not supply physical cutouts. Exercise the same custom properties
      // that resolve env(safe-area-inset-*) on a phone; don't add fake browser chrome to captures.
      await page.evaluate(v=>v.forEach((n,i)=>document.getElementById('stage').style.setProperty('--safe-'+'trbl'[i],n+'px')),insets);
      await page.waitForFunction(([w,h])=>{const r=document.getElementById('stage').getBoundingClientRect();return Math.abs(r.width-w)<1&&Math.abs(r.height-h)<1},[w,h]);
      const check=async(ids,checkHits=[])=>{
        const boxes=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>{
          const r=document.getElementById(id).getBoundingClientRect();return [id,[r.left,r.top,r.right,r.bottom]];
        })),ids);
        const [t,r,b,l]=insets;
        for(const [id,[x,y,X,Y]] of Object.entries(boxes)){
          assert.ok(x>=l-.5&&y>=t-.5&&X<=w-r+.5&&Y<=h-b+.5,`${label}: ${id} outside safe area: ${[x,y,X,Y]}`);
          for(const [id2,[u,v,U,V]] of Object.entries(boxes))if(id<id2)
            assert.ok(Math.min(X,U)-Math.max(x,u)<=.5||Math.min(Y,V)-Math.max(y,v)<=.5,`${label}: ${id} overlaps ${id2}`);
        }
        for(const id of checkHits){
          const [x,y,X,Y]=boxes[id];assert.ok(X-x>=44&&Y-y>=44,`${id}: target below 44px`);
          assert.equal(await page.evaluate(([x,y,id])=>document.getElementById(id).contains(document.elementFromPoint(x,y)),[(x+X)/2,(y+Y)/2,id]),true,`${id}: unreachable`);
        }
      };
      await check(['title','desc','start','sound'],['start','sound']);
      await page.locator('#start').tap();await step(.12);
      assert.equal((await snap()).mode,'playing');
      // Include the contextual valve button's footprint even in the first wave.
      await page.locator('#te').evaluate(el=>el.classList.remove('hide'));
      await check(['mission','tideGauge','tp','stick','tf','tr','te','life','ammo'],['tp','stick','tf','tr','te','ammo']);
      await page.locator('#te').evaluate(el=>el.classList.add('hide'));
      const hero=label==='portrait-bars'||label==='landscape-short';
      const shot=(await snap()).shots;await page.locator('#ammo').tap();const inspected=await step(.66);
      assert.ok(inspected.tool.inspect>.99&&[...inspected.tool.tip,...inspected.tool.heel].every(v=>Math.abs(v)<.98),`${label}: cropped inspection ${JSON.stringify(inspected.tool)}`);
      if(hero)await screenshot(label+'-inspect');
      await page.locator('#tf').tap();const fired=await step(.32);assert.equal(fired.shots,shot+1);assert.ok(fired.tool.inspect<.01);
      if(label==='landscape-short'||label==='portrait-bars'){await step(.2);await screenshot(label)}
      await page.locator('#tr').tap();const gap=await step(.84);
      assert.ok(gap.tool.packs.every(p=>!p.visible&&p.screen[1]<-1),`${label}: magazine switch inside viewport`);
      const incoming=await step(.37),mag=incoming.tool.packs.find(p=>p.visible);
      assert.ok(!incoming.tool.docked&&incoming.tool.display==='--'&&mag.id===1&&mag.lit===4&&mag.screen.every(v=>Math.abs(v)<.98),`${label}: incoming magazine ${JSON.stringify(incoming.tool)}`);
      if(hero)await screenshot(label+'-reload');
      const ready=await step(incoming.reloading+.02);assert.equal(ready.rounds,16);assert.equal(ready.tool.display,'16');
      await page.locator('#tp').tap();assert.equal((await snap()).mode,'paused');
    }
    await page.locator('#start').tap();
    const beforeTurn=await snap();
    for(const [width,height] of [[932,430],[430,739]]){
      await page.setViewportSize({width,height});
      await page.waitForFunction(([w,h])=>document.getElementById('world').clientWidth===w&&document.getElementById('world').clientHeight===h,[width,height]);
      const turned=await snap();assert.equal(turned.mode,'playing');assert.equal(turned.clock,beforeTurn.clock);assert.equal(turned.rounds,beforeTurn.rounds);
    }
    // A Safari toolbar transition need not fire window.resize. Keep layout viewport
    // constant and drive only visualViewport.resize, both shrinking and growing.
    const dynamic=await page.evaluate(async()=>{
      const vv=visualViewport,top=innerHeight,keys=['height','offsetTop'],saved=keys.map(k=>Object.getOwnPropertyDescriptor(vv,k));
      const restore=()=>keys.forEach((k,i)=>{delete vv[k];if(saved[i])Object.defineProperty(vv,k,saved[i])});
      const size=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const r=document.getElementById('stage').getBoundingClientRect();done([r.height,r.top])})));
      try{
        Object.defineProperty(vv,'height',{configurable:true,get:()=>top-85});
        Object.defineProperty(vv,'offsetTop',{configurable:true,get:()=>18});vv.dispatchEvent(new Event('resize'));const small=await size();
        restore();vv.dispatchEvent(new Event('resize'));return [top,small,await size(),innerHeight];
      }finally{restore()}
    });
    assert.deepEqual(dynamic,[dynamic[0],[dynamic[0]-85,18],[dynamic[0],0],dynamic[0]]);
    if(engine==='chromium'){
      const a=await snap(),c=await ctx.newCDPSession(page);
      const pad=await rect('#stick'),fire=await rect('#tf');
      const p={id:1,x:pad.x+pad.width/2,y:pad.y+pad.height/2},f={id:2,x:fire.x+fire.width/2,y:fire.y+fire.height/2};
      const send=(type,touchPoints)=>c.send('Input.dispatchTouchEvent',{type,touchPoints});
      await send('touchStart',[p]);await send('touchMove',[{...p,x:p.x+2}]);const drift=await step(.55);
      assert.deepEqual(drift.player,a.player);assert.equal(drift.gait.steps,a.gait.steps);
      await send('touchMove',[{...p,x:p.x+pad.width*.36*.25}]);const creep=await step(.44);await send('touchEnd',[]);await step(.25);
      const slowDist=Math.hypot(creep.player[0]-a.player[0],creep.player[2]-a.player[2]);assert.ok(slowDist>.06&&slowDist<.36,`thumb creep ${slowDist}`);assert.equal(creep.gait.steps,a.gait.steps);
      await send('touchStart',[p,f]);await send('touchMove',[{...p,y:p.y-30},{...f,x:f.x-24}]);
      const moving=await step(.4);await send('touchEnd',[]);const resting=await step(.4);
      assert.ok(moving.player[2]<a.player[2]-.5&&Math.abs(moving.yaw-a.yaw)>.03&&moving.shots>a.shots);
      const coast=Math.hypot(resting.player[0]-moving.player[0],resting.player[2]-moving.player[2]);assert.ok(coast<.15,`stick release coast ${coast}`);assert.equal(resting.gait.speed,0);assert.equal(resting.shots,moving.shots);
      const held=await step(.45);assert.deepEqual([held.player[0],held.player[2],held.gait.steps],[resting.player[0],resting.player[2],resting.gait.steps]);
    }
    assert.deepEqual(errors,[]);console.log(`${engine}: ${runs.length} phone layouts; safe areas, controls, toolbar resize and orientation passed`);
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
