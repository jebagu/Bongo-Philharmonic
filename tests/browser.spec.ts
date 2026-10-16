import { test, expect, type Page } from '@playwright/test';
import { createComposition, addPerformer, addEvent, type Composition } from '../src/model';
import { LIBRARY } from '../src/library';
import { readFileSync } from 'node:fs';

const key='bongo-planet-philharmonic-v1';
const state=(page:Page)=>page.evaluate(()=>{
  const app=(window as any).__bongoPhilharmonic;
  return {composition:app.composition as Composition,view:app.view as string,brushId:app.brushId as string|null,selectedEvents:app.selectedEvents as string[],transport:app.transport as {position:number,playing:boolean}};
});
async function open(page:Page, composition?:Composition) {
  await page.addInitScript(({key,composition})=>{
    if(sessionStorage.getItem('philharmonic-test-seeded'))return;
    sessionStorage.setItem('philharmonic-test-seeded','1');
    localStorage.setItem('bongo-original-test-sentinel','retained');
    if(composition)localStorage.setItem(key,JSON.stringify(composition));
  },{key,composition});
  await page.goto('./');await page.waitForFunction(()=>!!(window as any).__bongoPhilharmonic);
}
async function place(page:Page,name:string,junction=1) {
  await page.locator('#placement-palette').getByRole('button',{name:`Place ${name}`,exact:true}).click();
  await page.getByLabel('Placement junction',{exact:true}).fill(String(junction));
  await page.getByRole('button',{name:'Place',exact:true}).click();
}
async function stamp(page:Page,pitch:number,beat:number) {
  const point=await page.locator('#score-host svg').evaluate((svg,{pitch,beat})=>{
    const classes=[0,0,1,1,2,3,3,4,4,5,5,6],step=(n:number)=>Math.floor(n/12)*7+classes[n%12];
    const r=svg.getBoundingClientRect();
    const m=(svg as SVGSVGElement).dataset;return {x:r.left+Number(m.scoreLeft)+(beat-Number(m.pageStart))*Number(m.beatWidth),y:r.top+Number(m.scoreTop)+(Number(m.topStep)-step(pitch))*Number(m.rowHeight)};
  },{pitch,beat});
  await page.mouse.click(point.x,point.y);
}
function twoGuitars() {
  let c=createComposition();c=addPerformer(c,'guitar',1);c=addPerformer(c,'guitar',7);
  return addEvent(c,{performerId:c.performers[0].id,pitch:60,startBeat:0,durationBeats:.25,velocity:.8});
}

test('renamed tool restores legacy saves while the original remains a separate application',async({page})=>{
  const legacy=twoGuitars();
  const original=readFileSync('tests/fixtures/planet-composition.json','utf8');
  await page.addInitScript(({legacy,original})=>{
    if(sessionStorage.getItem('legacy-identity-seeded'))return;
    sessionStorage.setItem('legacy-identity-seeded','1');
    localStorage.setItem('bongo-planet-composer-v1',JSON.stringify(legacy));
    localStorage.setItem('bongo-planet-composer-v1-saved',JSON.stringify(legacy));
    localStorage.setItem('bongo-planet-scene-v1',original);
  },{legacy,original});
  await page.goto('./');await page.waitForFunction(()=>!!(window as any).__bongoPhilharmonic);
  await expect(page).toHaveTitle('Bongo Philharmonic');
  expect((await state(page)).composition.id).toBe(legacy.id);
  expect((await state(page)).transport.playing).toBe(false);
  const records=await page.evaluate(()=>({
    draft:localStorage.getItem('bongo-planet-philharmonic-v1'),
    legacy:localStorage.getItem('bongo-planet-composer-v1'),
    original:localStorage.getItem('bongo-planet-scene-v1'),
  }));
  expect(JSON.parse(records.draft!).id).toBe(legacy.id);expect(records.legacy).toBe(records.draft);expect(records.original).toBe(original);
  await page.getByRole('button',{name:'More options'}).click();
  await page.locator('#import-file').setInputFiles({name:'Bongo-Planet.json',mimeType:'application/json',buffer:Buffer.from(original)});
  await expect(page.locator('#notice')).toContainText('Import failed');expect((await state(page)).composition.id).toBe(legacy.id);

  expect(await page.locator('a[href*="BongoPlanet"]:not(:has(img))').count()).toBe(0);
  expect(await page.evaluate(()=>!!(window as any).__bongo)).toBe(false);

});

test('first chord, shared transport, Performance and paused editing',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  await open(page);await expect(page).toHaveTitle('Bongo Philharmonic');await expect(page.locator('.app-header .brand')).toHaveText('Bongo Philharmonic');await expect(page.locator('.placement-panel .band-count')).toHaveText('0 / 16');
  await page.locator('#placement-palette').getByRole('button',{name:'Place Guitar',exact:true}).click();
  const target=await page.evaluate(()=>{const bounds=document.querySelector('#sphere-host')!.getBoundingClientRect();return (window as any).__bongoPhilharmonic.sphere.getProjectedJunctions().filter((j:any)=>j.visible).sort((a:any,b:any)=>Math.hypot(a.x-(bounds.x+bounds.width/2),a.y-(bounds.y+bounds.height/2))-Math.hypot(b.x-(bounds.x+bounds.width/2),b.y-(bounds.y+bounds.height/2)))[0];});
  await page.mouse.click(target.x,target.y);
  await expect(page.locator('#placement-intent')).toBeHidden();
  await page.getByRole('button',{name:'Composer',exact:true}).click();
  for(const pitch of [60,64,67])await stamp(page,pitch,0);
  let s=await state(page);expect(s.composition.performers).toHaveLength(1);expect(s.composition.events.map(e=>e.pitch)).toEqual([60,64,67]);expect(s.brushId).toBe(s.composition.performers[0].id);
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect.poll(async()=>(await state(page)).transport.playing).toBe(true);
  await expect.poll(async()=>(await state(page)).transport.position).toBeGreaterThan(.4);
  const before=(await state(page)).transport.position;
  await page.getByRole('button',{name:'Performance',exact:true}).click();
  await expect(page.locator('.composer-tools')).toBeHidden();await expect(page.locator('.placement-panel')).toBeHidden();
  expect((await state(page)).transport.position).toBeGreaterThanOrEqual(before-.1);
  const notes=JSON.stringify((await state(page)).composition.events);
  await page.locator('#score-host svg').click({position:{x:150,y:50}});
  await page.keyboard.press('Meta+z');await page.keyboard.press('Meta+Shift+z');
  expect(JSON.stringify((await state(page)).composition.events)).toBe(notes);
  await page.getByRole('button',{name:'Composer',exact:true}).click();expect((await state(page)).view).toBe('composer');
  await stamp(page,72,2);s=await state(page);expect(s.composition.events).toHaveLength(4);expect(s.transport.playing).toBe(false);await expect(page.locator('#notice')).toHaveText('Paused to edit');
  await page.getByRole('button',{name:'Stop and rewind'}).click();expect((await state(page)).transport.position).toBe(0);
  expect(errors).toEqual([]);await page.screenshot({path:'evidence/philharmonic/first-chord.png'});
});

test('actionable missing family preserves intent and returns a new brush without notes',async({page})=>{
  await open(page);await place(page,'Guitar');await page.getByRole('button',{name:'Composer',exact:true}).click();await stamp(page,60,0);
  const original=(await state(page)).brushId;
  await page.locator('#score-scroll').evaluate(node=>{node.scrollLeft=180;node.scrollTop=80;});
  await page.getByRole('button',{name:'Erase',exact:true}).click();
  await page.locator('#family-row').getByRole('button',{name:'Place Glass',exact:true}).click();
  expect((await state(page)).view).toBe('placement');await expect(page.locator('#placement-intent')).toContainText('Place Glass');
  await page.getByRole('button',{name:'Cancel placement'}).click();await page.getByRole('button',{name:'Composer',exact:true}).click();
  expect((await state(page)).brushId).toBe(original);expect((await state(page)).composition.performers).toHaveLength(1);
  expect(await page.locator('#score-scroll').evaluate(node=>node.scrollLeft)).toBe(180);
  await page.locator('#family-row').getByRole('button',{name:'Place Glass',exact:true}).click();
  await page.getByLabel('Placement junction',{exact:true}).fill('8');await page.getByRole('button',{name:'Place',exact:true}).click();
  expect((await state(page)).view).toBe('placement');
  await page.getByRole('button',{name:'Composer',exact:true}).click();
  let s=await state(page);expect(s.composition.performers).toHaveLength(2);expect(s.composition.events).toHaveLength(1);expect(s.brushId).not.toBe(original);
  await expect(page.locator('#stamp-tool')).toHaveAttribute('aria-pressed','true');await stamp(page,64,1);
  s=await state(page);expect(s.composition.events.at(-1)!.performerId).toBe(s.brushId);
});

test('duplicate performers, fixed location names, retained family choice and explicit deletion',async({page})=>{
  await open(page,twoGuitars());await page.getByRole('button',{name:'Placement',exact:true}).click();
  const first=(await state(page)).composition.performers[0];
  const projection=await page.evaluate(id=>(window as any).__bongoPhilharmonic.sphere.getProjectedPerformers().find((p:any)=>p.id===id),first.id);
  // Numeric keyboard fallback can select a body via the score even when its original junction faces away.
  await page.getByRole('button',{name:'Composer',exact:true}).click();await page.locator('[data-event-id]').first().click();await page.getByRole('button',{name:'Show on sphere'}).click();
  await page.getByLabel('Location name',{exact:true}).fill('Lagoon');await page.getByLabel('Location name',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'Duplicate',exact:true}).click();
  await page.getByLabel('Placement junction',{exact:true}).fill('12');await page.getByRole('button',{name:'Place',exact:true}).click();
  let s=await state(page);expect(s.composition.performers).toHaveLength(3);expect(s.composition.events).toHaveLength(1);
  const third=s.composition.performers.at(-1)!;
  await page.getByLabel('Location name',{exact:true}).fill('Moon Garden');await page.getByLabel('Location name',{exact:true}).press('Tab');
  await page.getByLabel('Move to junction',{exact:true}).fill('16');await page.getByRole('button',{name:'Move',exact:true}).click();
  s=await state(page);expect(s.composition.locationNames['11']).toBe('Moon Garden');expect(s.composition.performers.at(-1)!.id).toBe(third.id);expect(s.composition.events[0].performerId).toBe(first.id);
  await page.getByRole('button',{name:'Composer',exact:true}).click();await page.locator('#family-row').getByRole('button',{name:'Guitar, 3 placed'}).click();await page.locator('#family-menu').getByRole('button',{name:/Lagoon · Guitar 1/}).click();
  await stamp(page,64,2);expect((await state(page)).composition.events.at(-1)!.performerId).toBe(first.id);
  await page.getByRole('button',{name:'Performance',exact:true}).click();await page.getByRole('button',{name:'Composer',exact:true}).click();expect((await state(page)).brushId).toBe(first.id);
  await page.locator('[data-event-id]').first().click();await page.getByRole('button',{name:'Show on sphere'}).click();await page.getByRole('button',{name:'Remove',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('2 notes');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect((await state(page)).composition.performers).toHaveLength(3);
  await page.getByRole('button',{name:'Remove',exact:true}).click();await page.getByRole('button',{name:'Remove performer and 2 notes'}).click();expect((await state(page)).composition.events).toHaveLength(0);
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await state(page)).composition.events).toHaveLength(2);expect((await state(page)).composition.performers).toHaveLength(3);
  expect(projection).toBeTruthy();
});

test('sixteen Marios remain valid and seventeenth placement and import are atomic',async({page})=>{
  let comp=createComposition('mario');for(let i=0;i<16;i++)comp=addPerformer(comp,'mario',i);
  await open(page,comp);await expect(page.locator('.placement-panel .band-count')).toHaveText('16 / 16');
  const before=JSON.stringify((await state(page)).composition);
  await page.locator('#placement-palette').getByRole('button',{name:'Place Mario',exact:true}).click();
  await page.getByLabel('Placement junction',{exact:true}).fill('42');await page.getByRole('button',{name:'Place',exact:true}).click();
  await expect(page.locator('#notice')).toContainText('Band full');expect(JSON.stringify((await state(page)).composition)).toBe(before);
  await page.getByRole('button',{name:'More options'}).click();const over={...comp,performers:[...comp.performers,{...comp.performers[0],id:'extra',familyNumber:17,junctionId:40}]};
  await page.locator('#import-file').setInputFiles({name:'over-cap.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(over))});
  await expect(page.locator('#notice')).toContainText('Import failed');expect(JSON.stringify((await state(page)).composition)).toBe(before);
});

test('all 32 library entries load paused with exact scores; replacements are recoverable',async({page})=>{
  await open(page,twoGuitars());const original=(await state(page)).composition;
  for(const entry of LIBRARY){
    await page.getByRole('button',{name:'Library',exact:true}).click();await page.locator(`[data-library-id="${entry.id}"]`).click();
    const s=await state(page);expect(s.composition.events).toEqual(entry.composition.events);expect(s.composition.performers).toEqual(entry.composition.performers);expect(s.composition.performers.length).toBeLessThanOrEqual(16);expect(s.composition.assetSetId).toBe(entry.assetSetId);expect(s.transport.playing).toBe(false);
  }
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await state(page)).composition.id).toBe(LIBRARY.at(-2)!.composition.id);
  await page.getByRole('button',{name:'More options'}).click();await page.getByRole('button',{name:'Recover previous draft'}).click();expect((await state(page)).composition.id).toBe(LIBRARY.at(-2)!.composition.id);
  expect(original.events).toHaveLength(1);expect(await page.evaluate(()=>localStorage.getItem('bongo-original-test-sentinel'))).toBe('retained');
});

test('save reload JSON import/export, malformed imports, and bank replacement Undo',async({page})=>{
  await open(page,twoGuitars());await page.getByRole('button',{name:'Composer',exact:true}).click();
  const original=(await state(page)).composition;
  await page.getByRole('button',{name:'More options'}).click();await page.getByLabel('Theme',{exact:true}).selectOption('nebula-space');await page.getByRole('button',{name:'Save locally'}).click();
  await page.reload();expect((await state(page)).transport.playing).toBe(false);expect((await state(page)).composition.appearance).toBe('nebula-space');
  await page.getByRole('button',{name:'More options'}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/-Philharmonic\.json$/);
  const before=JSON.stringify((await state(page)).composition);await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"bad":true}')});await expect(page.locator('#notice')).toContainText('Import failed');expect(JSON.stringify((await state(page)).composition)).toBe(before);
  const mario=createComposition('mario');await page.locator('#import-file').setInputFiles({name:'mario.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mario))});expect((await state(page)).composition.assetSetId).toBe('mario');
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await state(page)).composition.id).toBe(original.id);expect((await state(page)).composition.events).toEqual(original.events);
  await page.getByRole('button',{name:'More options'}).click();await page.getByRole('button',{name:'New composition',exact:true}).click();expect((await state(page)).composition.performers).toHaveLength(0);
  await page.getByRole('button',{name:'More options'}).click();await page.getByRole('button',{name:'Load local save'}).click();expect((await state(page)).composition.id).toBe(original.id);
});

test('keyboard note selection, group movement, accidental drag and overlapping unisons',async({page})=>{
  let comp=twoGuitars();comp=addEvent(comp,{performerId:comp.performers[0].id,pitch:60,startBeat:.25,durationBeats:.25,velocity:.8});
  comp=addEvent(comp,{performerId:comp.performers[0].id,pitch:61,startBeat:1,durationBeats:.25,velocity:.8});
  // A legitimate imported unison remains separate even on the same performer.
  comp.events.push({...comp.events[0],id:'source_unison'});
  await open(page,comp);await page.getByRole('button',{name:'Composer',exact:true}).click();
  const note=page.locator('[data-event-ids]').filter({hasText:'×2'}).first();await note.focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Selected notes',{exact:true})).toHaveCount(1);
  await expect(page.getByLabel('Selected notes',{exact:true}).locator('option')).toHaveCount(2);
  await page.getByRole('button',{name:'Deselect notes'}).click();
  const sharp=page.locator('[data-event-id]').filter({has:page.locator('text.accidental')}).first();const r=await sharp.boundingBox();expect(r).toBeTruthy();
  await page.mouse.move(r!.x+r!.width/2,r!.y+r!.height/2);await page.mouse.down();await page.mouse.move(r!.x+r!.width/2+168,r!.y+r!.height/2,{steps:8});await page.mouse.up();
  const changed=(await state(page)).composition.events.find(e=>e.id===comp.events[2].id)!;expect(changed.pitch).toBe(61);expect(changed.startBeat).toBe(2);
  await page.getByLabel('Note pitch',{exact:true}).fill('F#4');await page.getByLabel('Note pitch',{exact:true}).press('Tab');
  expect((await state(page)).composition.events.find(e=>e.id===changed.id)!.pitch).toBe(66);
});

test('390px touch/reduced-motion Performance fits one actual bar and restores context',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const page=await context.newPage();
  const comp=structuredClone(LIBRARY.find(e=>e.composition.meter[0]===3)!.composition);
  await open(page,comp);await page.getByRole('button',{name:'Composer',exact:true}).tap();
  if(comp.lengthBeats>16)await page.locator('#score-scroll').evaluate(node=>{node.scrollLeft=16*168;});
  await page.waitForTimeout(80);
  const scrollLeft=await page.locator('#score-scroll').evaluate(node=>node.scrollLeft);await page.getByRole('button',{name:'Performance',exact:true}).tap();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('#score-host svg').evaluate(svg=>svg.getBoundingClientRect().width)).toBeLessThanOrEqual(370);
  expect(await page.locator('#score-host svg').getAttribute('data-page-start')).toBe('0');
  const before=JSON.stringify((await state(page)).composition);await page.locator('#score-host svg').tap({position:{x:150,y:50}});expect(JSON.stringify((await state(page)).composition)).toBe(before);
  await page.screenshot({path:'evidence/philharmonic/performance-390.png'});
  await page.setViewportSize({width:319,height:844});
  for(const selector of ['#play','#stop','#loop']){const r=await page.locator(selector).boundingBox();expect(r!.x).toBeGreaterThanOrEqual(10);expect(r!.x+r!.width).toBeLessThanOrEqual(309);expect(r!.y).toBeGreaterThan(700);}
  await expect(page.locator('.app-header')).toBeVisible();
  await page.getByRole('button',{name:'Composer',exact:true}).tap();await expect.poll(()=>page.locator('#score-scroll').evaluate(node=>node.scrollLeft)).toBe(scrollLeft);
  await context.close();
});

test('batch note edits preserve accepted source unisons and Space activates focused buttons',async({page})=>{
  let comp=twoGuitars();comp.events.push({...comp.events[0],id:'source_unison'});
  await open(page,comp);await page.getByRole('button',{name:'Composer',exact:true}).click();
  await page.locator('[data-event-ids]').first().click();await page.locator('[data-event-ids]').first().click({modifiers:['Shift']});
  expect((await state(page)).selectedEvents).toHaveLength(2);await page.keyboard.press('ArrowRight');
  expect((await state(page)).composition.events.map(e=>e.startBeat)).toEqual([.25,.25]);
  await page.getByRole('button',{name:'More options'}).click();await page.getByRole('button',{name:'Duplicate selected notes'}).click();
  expect((await state(page)).composition.events.map(e=>e.startBeat)).toEqual([.25,.25,.5,.5]);
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:'Performance',exact:true}).focus();await page.keyboard.press('Space');expect((await state(page)).view).toBe('performance');expect((await state(page)).transport.playing).toBe(false);
});

test('bounded dense rendering keeps every written note accessible through the paged list',async({page})=>{
  let comp=createComposition();comp=addPerformer(comp,'piano',1);
  comp.events=Array.from({length:1601},(_,i)=>({id:`dense_${i}`,performerId:comp.performers[0].id,pitch:60,startBeat:i/1000,durationBeats:.01,velocity:.2}));
  await open(page,comp);await page.getByRole('button',{name:'Composer',exact:true}).click();await expect(page.locator('[data-event-id]')).toHaveCount(1600);
  await page.getByRole('button',{name:'More options'}).click();await page.getByRole('button',{name:'Inspect notes…'}).click();
  for(let i=0;i<16;i++)await page.getByRole('button',{name:'Next 100 →'}).click();
  await page.getByRole('button',{name:/C4 · beat 1.6 ·/}).click();
  expect((await state(page)).selectedEvents).toEqual(['dense_1600']);await expect(page.locator('[data-event-id="dense_1600"]')).toBeVisible();expect((await state(page)).composition.events).toHaveLength(1601);
});

test('Placement keeps camera controls and removes redundant Composer actions',async({page})=>{
  await open(page);await expect(page.getByRole('button',{name:'Reset view',exact:true})).toBeVisible();
  await expect(page.locator('.placement-panel').getByRole('button',{name:/Compose|Return to Composer/})).toHaveCount(0);
  const before=await page.evaluate(()=>(window as any).__bongoPhilharmonic.sphere.getProjectedJunctions().find((j:any)=>j.junctionId===25));
  await page.getByRole('button',{name:'Slow rotate',exact:true}).click();await expect(page.getByRole('button',{name:'Slow rotate',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect.poll(async()=>{const p=await page.evaluate(()=>(window as any).__bongoPhilharmonic.sphere.getProjectedJunctions().find((j:any)=>j.junctionId===25));return Math.hypot(p.x-before.x,p.y-before.y);}).toBeGreaterThan(1);
  await page.getByRole('button',{name:'Slow rotate',exact:true}).click();await page.getByRole('button',{name:'Reset view',exact:true}).click();
  const reset=await page.evaluate(()=>(window as any).__bongoPhilharmonic.sphere.getProjectedJunctions().find((j:any)=>j.junctionId===25));expect(Math.hypot(reset.x-before.x,reset.y-before.y)).toBeLessThan(.1);
});

test('notes preview snapped drags, cancel with Escape, zoom without rewriting music and erase with an eraser',async({page})=>{
  await open(page,twoGuitars());await page.getByRole('button',{name:'Composer',exact:true}).click();
  const original=(await state(page)).composition.events[0];
  const image=page.locator(`[data-event-id="${original.id}"] image`);let r=(await image.boundingBox())!;
  const metrics=await page.locator('#score-host svg').evaluate(svg=>({beat:Number((svg as SVGSVGElement).dataset.beatWidth),row:Number((svg as SVGSVGElement).dataset.rowHeight)}));
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+metrics.beat*.61,r.y+r.height/2-metrics.row*2.1,{steps:9});
  await expect(page.locator('.score-drag-preview')).toHaveAttribute('data-beat','0.5');await expect(page.locator('.score-drag-preview')).toHaveAttribute('data-pitch','64');
  expect((await state(page)).composition.events[0]).toEqual(original);
  await page.keyboard.press('Escape');await page.mouse.up();expect((await state(page)).composition.events[0]).toEqual(original);await expect(page.locator('.score-drag-preview')).toHaveCount(0);
  r=(await image.boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+metrics.beat*.61,r.y+r.height/2-metrics.row*2.1,{steps:9});await page.mouse.up();
  const moved=(await state(page)).composition.events[0];expect(moved).toEqual({...original,pitch:64,startBeat:.5});
  const controls=await page.locator('#note-toolbar .field, #note-toolbar button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(Math.max(...controls)-Math.min(...controls)).toBeLessThan(3);
  await expect(page.locator('.note-context')).toHaveCount(0);
  await page.getByRole('button',{name:'Zoom in score'}).click();await expect(page.locator('#zoom-value')).toHaveText('175%');expect((await state(page)).composition.events[0]).toEqual(moved);
  await expect(page.locator('#score-host svg')).toHaveAttribute('data-beat-width','196');
  await page.getByRole('button',{name:'Zoom out score'}).click();await expect(page.locator('#zoom-value')).toHaveText('150%');
  await page.locator('#erase-tool').click();expect(await page.locator('#score-host svg').evaluate(svg=>getComputedStyle(svg).cursor)).toContain('data:image/svg+xml');
  await page.locator(`[data-event-id="${moved.id}"] image`).click();expect((await state(page)).composition.events).toHaveLength(0);expect((await state(page)).composition.performers).toHaveLength(2);
});

test('Library rows group the full scores and original demos and fit a narrow phone',async({page})=>{
  await open(page);await page.getByRole('button',{name:'Library',exact:true}).click();
  await expect(page.locator('#library-count')).toHaveText('32 compositions · 7 full-length arrangements');
  await expect(page.getByRole('list',{name:'Full-length compositions'}).locator('li')).toHaveCount(7);
  await expect(page.getByRole('list',{name:'Original Mario Paint songs'}).locator('li')).toHaveCount(3);
  const rows=page.locator('.composition-row');
  const first=await rows.nth(0).boundingBox(),second=await rows.nth(1).boundingBox();
  expect(first!.x).toBe(second!.x);expect(second!.y).toBeGreaterThanOrEqual(first!.y+first!.height);
  expect(first!.width).toBeGreaterThan(1000);
  await page.screenshot({path:'evidence/philharmonic/library-rows-desktop.png'});
  await page.locator('#library-filters').getByRole('button',{name:'Bongo Planet',exact:true}).click();
  await expect(rows).toHaveCount(27);await expect(page.locator('#library-count')).toHaveText('27 compositions · 5 full-length arrangements');
  await page.locator('#library-filters').getByRole('button',{name:'All',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const row of await rows.all())expect((await row.boundingBox())!.width).toBeLessThan(390);
  await page.screenshot({path:'evidence/philharmonic/library-rows-mobile.png'});
});

test('every new arrangement scrolls through its middle and ending and plays from the opening',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(String(error)));
  await open(page);
  for(const entry of LIBRARY.filter(entry=>entry.kind==='full')){
    await page.getByRole('button',{name:'Library',exact:true}).click();
    await page.locator(`[data-library-id="${entry.id}"]`).click();
    await expect(page.locator('#loop')).toHaveAttribute('aria-pressed','false');
    const sections=entry.sections!;
    for(const section of [sections[Math.floor(sections.length/2)],sections.at(-1)!]){
      await page.locator('#score-scroll').evaluate((node,beat)=>{node.scrollLeft=beat*168;},section.startBeat);
      await expect.poll(()=>page.locator('#score-host svg').getAttribute('data-page-start')).toBe(String(Math.floor(section.startBeat/16)*16));
      expect((await state(page)).transport.playing).toBe(false);
    }
    await page.getByRole('button',{name:'Stop and rewind'}).click();
    await page.getByRole('button',{name:'Play',exact:true}).click();
    await expect.poll(async()=>(await state(page)).transport.position).toBeGreaterThan(.4);
    await page.getByRole('button',{name:'Stop and rewind'}).click();
    expect((await state(page)).composition.events).toEqual(entry.composition.events);
  }
  expect(errors).toEqual([]);
});

test('Library uses horizontal rows and Performance retains the shared header and bottom controls',async({page})=>{
  await open(page);await expect(page.locator('.view-nav button')).toHaveCount(5);await page.getByRole('button',{name:'Library',exact:true}).click();
  expect((await state(page)).view).toBe('library');await expect(page.getByRole('heading',{name:'Composition library'})).toBeVisible();await expect(page.locator('.composition-row')).toHaveCount(32);
  await expect(page.locator('.composition-preview')).toHaveCount(0);await page.screenshot({path:'evidence/philharmonic/library.png'});
  await page.locator('#library-filters').getByRole('button',{name:'Mario Paint',exact:true}).click();await expect(page.locator('.composition-row')).toHaveCount(5);
  await page.locator('.composition-row').first().click();expect((await state(page)).composition.assetSetId).toBe('mario');expect((await state(page)).view).toBe('composer');
  const runner=page.locator('.mario-runner');await expect(runner).toHaveAttribute('height','72');expect(await runner.getAttribute('href')).toContain('mario-paint-walk-a.png');
  await page.getByRole('button',{name:'Play',exact:true}).click();await expect.poll(()=>runner.getAttribute('data-pose')).toBe('jump');
  await page.getByRole('button',{name:'Performance',exact:true}).click();
  for(const selector of ['#play','#stop','#loop']){const rect=await page.locator(selector).boundingBox();expect(rect!.y).toBeGreaterThan(850);}
  await expect(page.locator('.app-header')).toBeVisible();await expect(page.locator('#composition-title')).toBeVisible();
  await expect(page.locator('#philharmonic-app > .transport')).toHaveCount(1);await page.screenshot({path:'evidence/philharmonic/performance-shared-controls.png'});
});


test('header and playback controls stay anchored across all five workspaces at desktop and phone sizes',async({page})=>{
  await open(page,twoGuitars());
  for(const width of [1440,1024,768,390,319]){
    await page.setViewportSize({width,height:844});
    let anchors:unknown;
    for(const name of ['Placement','Composer','Performance','Library','FAQ']){
      await page.getByRole('button',{name,exact:true}).click();
      const current=await page.locator('.app-header, #play, #stop, #loop').evaluateAll(nodes=>nodes.map(node=>{
        const {x,y,width,height}=node.getBoundingClientRect();return {x,y,width,height};
      }));
      if(!anchors)anchors=current;else expect(current,`${name} at ${width}px`).toEqual(anchors);
      for(const selector of ['#composition-title','#tempo','#master-volume','#undo','#redo']){
        await expect(page.locator(selector)).toBeVisible();
        const bounds=(await page.locator(selector).boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
});

test('Performance divider drags, cancels, supports keyboard, and remembers the split without editing music',async({page})=>{
  const composition=twoGuitars();
  await open(page,composition);await page.getByRole('button',{name:'Performance',exact:true}).click();
  const divider=page.getByRole('separator',{name:'Resize performance score'});
  const score=page.locator('.score-section');
  const height=async()=>(await score.boundingBox())!.height;
  const startHeight=await height(),playBox=await page.locator('#play').boundingBox();
  const drag=async(delta:number)=>{
    const bounds=(await divider.boundingBox())!;
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2+delta,{steps:10});
  };
  await drag(-80);await page.mouse.up();expect(await height()).toBeGreaterThan(startHeight+60);
  const draggedHeight=await height();
  expect(await page.locator('#play').boundingBox()).toEqual(playBox);
  await drag(50);await page.keyboard.press('Escape');await page.mouse.up();
  expect((await state(page)).view).toBe('performance');expect(await height()).toBeCloseTo(draggedHeight,0);
  await divider.press('ArrowDown');expect(await height()).toBeCloseTo(draggedHeight-20,0);
  const rememberedHeight=await height();
  await page.getByRole('button',{name:'Library',exact:true}).click();await page.reload();
  await page.getByRole('button',{name:'Performance',exact:true}).click();expect(await height()).toBeCloseTo(rememberedHeight,0);
  await divider.press('Home');expect(await height()).toBeLessThan(rememberedHeight);
  await divider.press('End');expect(await height()).toBeGreaterThan(rememberedHeight);
  expect((await page.locator('.sphere-stage').boundingBox())!.height).toBeGreaterThanOrEqual(149);
  expect(await page.locator('#play').boundingBox()).toEqual(playBox);
  expect((await state(page)).composition).toEqual(composition);
  expect((await state(page)).transport.playing).toBe(false);
  await page.setViewportSize({width:319,height:620});
  await expect(divider).toBeVisible();
  expect((await page.locator('.sphere-stage').boundingBox())!.height).toBeGreaterThan(0);
  const footer=(await page.locator('.transport').boundingBox())!,scoreBounds=(await score.boundingBox())!;
  expect(scoreBounds.y+scoreBounds.height).toBeLessThan(footer.y);
  expect(await divider.evaluate(node=>getComputedStyle(node).touchAction)).toBe('none');
});

test('playback continues across every workspace and Play/Pause keeps the same footprint',async({page})=>{
  const composition=twoGuitars();
  await open(page,composition);
  const playBox=await page.locator('#play').boundingBox();
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect.poll(async()=>(await state(page)).transport.position).toBeGreaterThan(.2);
  for(const name of ['Composer','Library','FAQ','Performance','Placement']){
    const position=(await state(page)).transport.position;
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
    expect(await page.locator('#play').boundingBox()).toEqual(playBox);
    expect((await state(page)).transport.playing).toBe(true);
    expect((await state(page)).transport.position).toBeGreaterThanOrEqual(position);
    if(name==='Performance'){
      await page.getByRole('separator',{name:'Resize performance score'}).press('ArrowUp');
      expect((await state(page)).transport.playing).toBe(true);
    }
  }
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  expect((await state(page)).transport.playing).toBe(false);
  expect(await page.locator('#play').boundingBox()).toEqual(playBox);
  await page.getByRole('button',{name:'Stop and rewind'}).click();
  expect((await state(page)).transport.position).toBe(0);
  expect((await state(page)).composition).toEqual(composition);
});
