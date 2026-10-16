import { test, expect } from '@playwright/test';
import { addEvent, addPerformer, createComposition } from '../src/model';

function longScore() {
  let composition=addPerformer(createComposition(),'guitar',1);
  composition={...composition,lengthBeats:128,loopRange:[0,128],loopEnabled:false};
  for(const beat of [0,4,32,63.5,95,127.5])composition=addEvent(composition,{
    performerId:composition.performers[0].id,pitch:60,startBeat:beat,durationBeats:.25,velocity:.63,
  });
  return composition;
}

for(const width of [1440,390])test(`Composer has a fixed toolbar and a full-song scrollbar at ${width}px`,async({page})=>{
  const composition=longScore();
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.addInitScript(value=>{
    if(sessionStorage.getItem('composer-toolbar-seeded'))return;
    sessionStorage.setItem('composer-toolbar-seeded','1');
    localStorage.setItem('bongo-planet-philharmonic-v1',JSON.stringify(value));
  },composition);
  await page.goto('./');await page.getByRole('button',{name:'Composer',exact:true}).click();
  await page.locator('.family-tile:not(.unplaced)').click();
  await expect(page.locator('.composer-tool-top h1')).toHaveText('Instruments');
  await expect(page.locator('#zoom-value')).toHaveText('150%');
  await expect(page.getByLabel('Note volume',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Note performer',{exact:true})).toHaveCount(0);
  await expect(page.locator('#current-stamp, .score-pages')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Erase',exact:true})).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Show on sphere',exact:true})).toBeDisabled();
  const top=await page.locator('#score-scroll').evaluate(node=>node.getBoundingClientRect().top);
  const note=page.locator(`[data-event-id="${composition.events[0].id}"]`);
  await note.click();
  await expect(page.getByRole('button',{name:'Show on sphere',exact:true})).toBeEnabled();
  expect(await page.locator('#score-scroll').evaluate(node=>node.getBoundingClientRect().top)).toBe(top);
  expect(await note.locator('image').getAttribute('width')).toBe('48');
  await page.getByRole('button',{name:'Deselect notes'}).click();
  expect(await page.locator('#score-scroll').evaluate(node=>node.getBoundingClientRect().top)).toBe(top);
  // Scroll beyond the removed 16-beat page boundary and edit the exact late note.
  await page.locator('#score-scroll').evaluate(node=>{node.scrollLeft=63*168;});
  const late=page.locator(`[data-event-id="${composition.events[3].id}"]`);
  await expect(late).toHaveCount(1);await late.click();
  await page.getByLabel('Note pitch',{exact:true}).fill('E4');
  await page.getByLabel('Note pitch',{exact:true}).press('Tab');
  const changed=await page.evaluate(()=>(window as any).__bongoPhilharmonic.composition);
  expect(changed.events[3]).toEqual({...composition.events[3],pitch:64});
  expect(changed.events.filter((_:unknown,index:number)=>index!==3)).toEqual(composition.events.filter((_,index)=>index!==3));
  await page.locator('#score-scroll').evaluate(node=>{node.scrollLeft=node.scrollWidth;});
  await expect(page.locator(`[data-event-id="${composition.events.at(-1)!.id}"]`)).toHaveCount(1);
  expect(await page.locator('.score-note').count()).toBeLessThanOrEqual(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#score-scroll').evaluate(node=>{node.scrollLeft=0;});
  await page.locator('.score-heading').evaluate(node=>{node.scrollLeft=0;});
  await page.screenshot({path:`evidence/composer-toolbar-${width}.png`});
  // Zoom is an editing choice for the session; every fresh opening defaults to 150%.
  await page.getByRole('button',{name:'Zoom out score'}).click();
  await expect(page.locator('#zoom-value')).toHaveText('125%');
  await page.reload();await page.getByRole('button',{name:'Composer',exact:true}).click();
  await expect(page.locator('#zoom-value')).toHaveText('150%');
  const clearance=await page.locator('#score-host svg').evaluate(svg=>{
    const labels=[...svg.querySelectorAll<SVGTextElement>('.pitch-label')].filter(n=>['C5','C3'].includes(n.textContent??''));
    const clefs=[...svg.querySelectorAll<SVGTextElement>('.clef')];
    return labels.every(label=>clefs.every(clef=>clef.getBBox().x+clef.getBBox().width+4<label.getBBox().x));
  });
  expect(clearance).toBe(true);
  expect(await page.locator('#score-host svg').evaluate(svg=>{
    const image=svg.querySelector<SVGImageElement>('.score-note image')!;
    const label=[...svg.querySelectorAll<SVGTextElement>('.pitch-label')].find(n=>n.textContent==='C4')!;
    return image.getBBox().x>label.getBBox().x+label.getBBox().width+4;
  })).toBe(true);
});
