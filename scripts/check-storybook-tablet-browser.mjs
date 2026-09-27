// Run after npm run build, with BOOK_PLAYWRIGHT_MODULE / BOOK_CHROME_PATH if needed.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {startTestServer} from '../tests/harness/server.mjs';
import {emptyStorybookDocument} from '../lib/storybook-model.ts';
import {emptyDocument} from '../lib/drawing-model.ts';
import {sha256} from '../lib/token-crypto.ts';

const {chromium}=createRequire(import.meta.url)(process.env.BOOK_PLAYWRIGHT_MODULE || 'playwright');
const server=await startTestServer({env:{OPENAI_API_KEY:'',SWEETBOOK_API_KEY:''}});
await server.fetch('/api/student');
const room='class_tabletcheck',student='student_tabletcheck',teacher='teacher_tabletcheck';
const teacherToken=randomUUID(),expiresAt=new Date(Date.now()+3600000).toISOString();
await server.DB.batch([
 server.DB.prepare("INSERT INTO teachers(id,email,display_name) VALUES(?,?,'검증 선생님')").bind(teacher,'tablet@example.test'),
 server.DB.prepare("INSERT INTO classrooms(id,teacher_id,display_name,class_code,join_token) VALUES(?,?,'태블릿 검증반','1738',?)").bind(room,teacher,randomUUID()),
 server.DB.prepare("INSERT INTO student_profiles(id,classroom_id,nickname,animal,seat_number,real_name,entry_code,claimed_at,last_activity_at) VALUES(?,?,'봄이','🐷',1,'예시 학생','2468',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(student,room),
 server.DB.prepare('INSERT INTO teacher_sessions(token_hash,teacher_id,expires_at,last_used_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(await sha256(teacherToken),teacher,expiresAt),
 server.DB.prepare("INSERT INTO artworks(id,student_id,classroom_id,title,topic,learning_mode,ops_json) VALUES('artwork_tabletcheck',?,?,'우리 동네','집','free',?)").bind(student,room,JSON.stringify(emptyDocument())),
]);
const browser=await chromium.launch({executablePath:process.env.BOOK_CHROME_PATH || undefined,headless:true});
const output='work/storybook-tablet';await mkdir(output,{recursive:true});
try {
 let context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true});
 let page=await context.newPage();page.setDefaultTimeout(20000);
 async function login(){
  await page.goto(server.origin+'/join/1738');
  await page.getByRole('textbox',{name:'내 참여 코드',exact:true}).fill('2468');
  await page.getByRole('button',{name:'들어가기',exact:true}).click();
  await page.locator('.student-art-desk').waitFor();
 }
 await login();
 const token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('wiggle.activeSession.v2')).deviceToken);
 const headers={authorization:'Bearer '+token,'content-type':'application/json'};
 let id;
 for(let i=0;i<3;i++){
  const response=await server.fetch('/api/storybooks',{method:'POST',headers,body:JSON.stringify({title:'검증 그림책 '+(i+1)})});
  assert.equal(response.status,201);const data=await response.json();if(i===0)id=data.storybook.id;
 }
 const png=await sharp('public/landing-gallery/artwork-whale.png').png().toBuffer();
 const uploaded=await(await server.fetch(`/api/storybooks/${id}/assets`,{method:'POST',headers:{...headers,'content-type':'image/png'},body:png})).json();
 assert.ok(uploaded.asset);
 const doc=emptyStorybookDocument();
 doc.pages=Array.from({length:24},(_,i)=>emptyStorybookDocument('squarebook-hc','page_tablet'+String(i).padStart(8,'0'),'element_tablet'+String(i).padStart(8,'0')).pages[0]);
 doc.pages[0].elements.push({id:'element_tabletimage',type:'image',assetId:uploaded.asset.id,x:.08,y:.27,width:.84,height:.64,rotation:0,opacity:1,locked:false,zIndex:1});
 await server.DB.prepare('UPDATE storybooks SET document_json=? WHERE id=?').bind(JSON.stringify(doc),id).run();
 await page.reload();await page.getByRole('link',{name:'내 그림책 모두 보기 (3권)',exact:true}).waitFor();
 assert.equal(await page.locator('.desk-book-card').count(),3);
 for(const [width,height]of [[1440,1000],[768,1024],[320,568]]){
  await page.setViewportSize({width,height});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.desk-book-row').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.locator('.desk-book-card').last().click();await page.locator('.storybook-editor-header').waitFor();
  await page.goto(server.origin+'/student');await page.locator('.desk-book-card').last().waitFor();
 }
 await page.screenshot({animations:'disabled',path:output+'/home.png',fullPage:true});
 console.log('PASS displayed book count and all three cards match; last card opens at desktop/tablet/phone widths');

 await page.goto(server.origin+'/student/books/'+id);
 const title=()=>page.getByRole('textbox',{name:'그림책 제목',exact:true});
 const text=()=>page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true});
 const saved=()=>page.waitForFunction(()=>document.querySelector('.storybook-save-state')?.textContent.includes('✓ 저장됨'));
 await title().fill('다시 만나는 고래');await text().click();await page.keyboard.insertText('내일도 고래와 함께 놀아요.');
 await saved();await page.getByRole('button',{name:'임시 저장',exact:true}).click();await saved();
 const before=await server.DB.prepare('SELECT title,document_json,status FROM storybooks WHERE id=?').bind(id).first();assert.equal(before.status,'draft');
 await page.goto(server.origin+'/student');await page.getByRole('button',{name:'수업 마치기',exact:false}).click();await page.waitForURL('**/join');
 assert.equal((await server.fetch('/api/storybooks/'+id,{headers})).status,401,'logout invalidates the old session');
 await context.close();context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true});page=await context.newPage();page.setDefaultTimeout(20000);
 await login();await page.locator(`.desk-book-card[href="/student/books/${id}"]`).click();await text().waitFor();
 assert.equal(await title().inputValue(),before.title);assert.equal(await text().inputValue(),'내일도 고래와 함께 놀아요.');
 await page.locator('.storybook-stage:not(.preview) .image img').waitFor();
 const after=await server.DB.prepare('SELECT title,document_json,status FROM storybooks WHERE id=?').bind(id).first();assert.deepEqual(after,before);
 console.log('PASS manual draft save survives logout and a fresh browser login, including text and image document');

 for(const [width,height]of [[1440,1000],[768,1024],[820,1180],[1024,768],[1180,820],[1280,800],[320,568],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.scrollTo(0,0));
  const illustration=page.locator('.storybook-stage:not(.preview) .image');await illustration.click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`horizontal overflow ${width}`);
  assert.deepEqual(await page.locator('.storybook-toolbar button').evaluateAll(items=>items.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)),[],`clipped tools ${width}`);
  const overlap=await page.locator('.storybook-editor-header').evaluate(e=>{
   const boxes=[...e.querySelectorAll('a,input,button')].map(e=>e.getBoundingClientRect());
   return boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
  });assert.equal(overlap,false,`header overlap ${width}`);
  const inspector=page.locator('.storybook-inspector');
  assert.equal(await inspector.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  const last=inspector.getByRole('button',{name:'페이지 전체 배경 넣기',exact:false});await last.scrollIntoViewIfNeeded();
  assert.ok(await last.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`last inspector action unreachable ${width}`);
  await page.getByRole('button',{name:'쪽 복제',exact:true}).click();await saved();
  await page.getByRole('button',{name:'쪽 삭제',exact:true}).click();await saved();
  await page.getByRole('button',{name:'미리보기',exact:true}).click();
  const actions=page.locator('.storybook-preview > header .small-button');
  const metrics=await actions.evaluateAll(items=>items.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,align:s.alignItems,top:r.top,height:r.height,left:r.left,right:r.right};}));
  const [a,b]=metrics;assert.deepEqual([a.font,a.size,a.weight,a.line,a.align,a.top,a.height],[b.font,b.size,b.weight,b.line,b.align,b.top,b.height],`preview buttons differ ${width}`);
  assert.ok(a.left>=0&&b.right<=width&&a.right<=b.left,`preview header clipped ${width}`);
  await page.screenshot({animations:'disabled',path:`${output}/preview-${width}.png`});
  await page.getByRole('button',{name:'편집으로 돌아가기',exact:true}).click();
  await illustration.click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({animations:'disabled',path:`${output}/editor-${width}.png`,fullPage:true});
  console.log(`PASS editor controls, scrolling, header and preview buttons ${width}x${height}`);
 }
 // Real browser touch pan on the workspace gutter, not scrollTop assignment.
 await page.setViewportSize({width:768,height:1024});await page.evaluate(()=>window.scrollTo(0,0));
 const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:8,y:800}]});
 for(let y=760;y>=360;y-=40)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:8,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>scrollY>100);await cdp.detach();
 await page.getByRole('button',{name:'그림책 완성하기',exact:true}).click();await page.getByRole('dialog',{name:'그림책 미리보기'}).waitFor();
 assert.equal((await server.DB.prepare('SELECT status FROM storybooks WHERE id=?').bind(id).first()).status,'complete');
 console.log('PASS touch scrolling and the renamed completion action');

 await context.addCookies([{name:'wiggle_teacher',value:teacherToken,url:server.origin}]);
 await page.goto(server.origin+`/teacher/class/${room}?view=archive`);await page.locator('.twa-heading select').waitFor();
 await page.locator('.twa-book-grid').waitFor();
 const controls=page.locator('.twa-heading select, .twa-section-heading button, .twa-section-heading .twa-text-link');
 // Native select rendering reports line-height: normal on Windows even with an explicit CSS value.
 const fonts=await controls.evaluateAll(items=>items.map(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.fontWeight,s.letterSpacing];}));
 assert.equal(fonts.length,3);assert.deepEqual(fonts[0],fonts[1]);assert.deepEqual(fonts[1],fonts[2]);
 await page.screenshot({animations:'disabled',path:output+'/teacher-archive.png',fullPage:true});
 await server.DB.prepare("UPDATE storybooks SET status='draft',completed_at=NULL WHERE classroom_id=?").bind(room).run();
 await page.goto(server.origin+`/teacher/class/${room}/books`);
 await page.getByText('학생이 그림책을 완성하지 않아도, 선생님이 준비한 PDF를 가져와 그림책 제작을 요청할 수 있어요.',{exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.pdf-import-panel input[type=file]')?.disabled===false);
 assert.equal(await page.locator('.pdf-import-panel input[type=file]').isEnabled(),true);
 await page.screenshot({animations:'disabled',path:output+'/pdf-import.png',fullPage:true});
 console.log('PASS archive control typography matches and independent PDF import guidance is visible');
} finally {await browser.close();await server.dispose();}
