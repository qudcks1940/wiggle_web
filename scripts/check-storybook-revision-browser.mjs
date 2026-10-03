// Isolated local fixtures only. Never uses a production class, student, DB or bucket.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import sharp from 'sharp';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {startTestServer} from '../tests/harness/server.mjs';
import {sha256} from '../lib/token-crypto.ts';
import {emptyStorybookDocument} from '../lib/storybook-model.ts';
import {emptyDocument} from '../lib/drawing-model.ts';
const {chromium}=createRequire(import.meta.url)(process.env.BOOK_PLAYWRIGHT_MODULE||'playwright');
const chrome=process.env.BOOK_CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const server=await startTestServer({env:{OPENAI_API_KEY:'',SWEETBOOK_API_KEY:''}});await server.fetch('/api/student');
const token=randomUUID(),teacherToken=randomUUID(),student='student_revision',room='class_revision',teacher='teacher_revision',expiresAt=new Date(Date.now()+3600000).toISOString();
await server.DB.batch([
 server.DB.prepare("INSERT INTO teachers(id,email,display_name) VALUES(?,?,'검증 교사')").bind(teacher,'revision@example.test'),
 server.DB.prepare("INSERT INTO classrooms(id,teacher_id,display_name,class_code,join_token) VALUES(?,?,'검증 학급','2738',?)").bind(room,teacher,randomUUID()),
 server.DB.prepare("INSERT INTO student_profiles(id,classroom_id,nickname,animal,seat_number,real_name,entry_code,claimed_at,last_activity_at) VALUES(?,?,'봄이','cat',1,'예시 학생','3579',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(student,room),
 server.DB.prepare('INSERT INTO device_sessions(token_hash,student_id,expires_at,last_used_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(await sha256(token),student,expiresAt),
 server.DB.prepare('INSERT INTO teacher_sessions(token_hash,teacher_id,expires_at,last_used_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(await sha256(teacherToken),teacher,expiresAt),
 server.DB.prepare("INSERT INTO artworks(id,student_id,classroom_id,title,topic,learning_mode,ops_json) VALUES('artwork_revision',?,?,'내 그림','고래','free',?)").bind(student,room,JSON.stringify(emptyDocument())),
]);
const headers={authorization:'Bearer '+token,'content-type':'application/json'};
const create=async title=>(await(await server.fetch('/api/storybooks',{method:'POST',headers,body:JSON.stringify({title})})).json()).storybook.id;
const id=await create('봄이의 바다 - 1차'),draftId=await create('내일의 이야기');
const png=await sharp('public/landing-gallery/artwork-whale.png').png().toBuffer();
const uploaded=await(await server.fetch(`/api/storybooks/${id}/assets`,{method:'POST',headers:{...headers,'content-type':'image/png'},body:png})).json();
const doc=emptyStorybookDocument();doc.pages=Array.from({length:24},(_,i)=>emptyStorybookDocument('squarebook-hc','page_revision'+String(i).padStart(8,'0'),'element_revision'+String(i).padStart(8,'0')).pages[0]);
doc.pages[0].elements[0].text='바다에서 만난 고래';
doc.pages[0].elements.push({id:'element_revisionimage',type:'image',assetId:uploaded.asset.id,x:.16,y:.32,width:.68,height:.52,rotation:0,zIndex:1,opacity:1,locked:false});
await server.DB.prepare("UPDATE storybooks SET document_json=?,status='complete',completed_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(doc),id).run();
const original=await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(id).first();
const output='work/storybook-revision';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:chrome,headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
 await context.addInitScript(({student,token,expiresAt})=>{localStorage.setItem('wiggle.deviceProfiles.v2',JSON.stringify([{studentId:student,nickname:'봄이',animal:'cat',classroomName:'검증 학급'}]));sessionStorage.setItem('wiggle.activeSession.v2',JSON.stringify({studentId:student,deviceToken:token,expiresAt}));},{student,token,expiresAt});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const btn=name=>page.getByRole('button',{name,exact:true});
 const saved=()=>page.waitForFunction(()=>document.querySelector('.storybook-save-state')?.textContent.includes('✓ 저장됨'));
 const text=()=>page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true});
 const closeTools=async()=>{if(await btn('꾸미기 닫기').count())await btn('꾸미기 닫기').click();};
 const range=async(name,value)=>page.getByRole('slider',{name,exact:true}).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 const scrollToBook=()=>page.locator('.storybook-stage-wrap').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY));
 const toolsOffscreen=()=>page.locator('.storybook-editor-header,.storybook-toolbar-shell').evaluateAll(es=>es.every(el=>el.getBoundingClientRect().bottom<=1));
 const touch=await context.newCDPSession(page);
 const swipe=async(x,y,dx,dy)=>{
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let i=1;i<=15;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/15,y:y+dy*i/15,id:1}]});await page.waitForTimeout(20);}
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
 };
 await page.goto(server.origin+'/student');await page.locator('.desk-book-card').last().waitFor();
 for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,568]]){
  await page.setViewportSize({width,height});
  const positions=await page.locator('.desk-art-row>li').evaluateAll(items=>items.map(item=>item.getBoundingClientRect().left));assert.equal(positions[0],Math.min(...positions));
  assert.ok(await page.locator('.desk-book-row').first().locator('li').first().getByRole('link',{name:/새 그림책/}).count());
  assert.ok(await page.getByRole('heading',{name:'완성된 그림책 (1권)',exact:true}).count());
  assert.ok(await page.getByRole('heading',{name:'만드는 중인 그림책 (1권)',exact:true}).count());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:output+'/home.png',fullPage:true});
 await page.goto(server.origin+'/student/books/'+id);await text().waitFor();await page.waitForTimeout(1200);assert.deepEqual(await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(id).first(),original);
 await btn('전체 복제').click();await page.waitForURL(url=>url.pathname.startsWith('/student/books/')&&!url.pathname.endsWith(id));
 const copyId=page.url().split('/').at(-1);await text().waitFor();await page.waitForFunction(()=>!document.querySelector('textarea.storybook-inline-text')?.disabled);
 assert.equal(await text().inputValue(),'바다에서 만난 고래');
 await text().click();assert.equal(await page.locator('.storybook-inspector').getAttribute('aria-label'),'이야기 꾸미기');
 await range('글자 크기',.022);await btn('가운데').click();await btn('중간').click();await text().fill('고래와 나');await saved();
 assert.equal(await text().evaluate(el=>getComputedStyle(el).textAlign),'center');assert.ok(await text().evaluate(el=>parseFloat(getComputedStyle(el).paddingTop)>0));
 await page.reload();await text().waitFor();assert.equal(await text().inputValue(),'고래와 나');
 await page.locator('.storybook-page-rail>button').nth(1).click();await text().fill('가'.repeat(801));await page.locator('.storybook-text-notice').waitFor();
 await page.locator('.storybook-page-rail>button').nth(2).click();assert.equal(await page.locator('.storybook-text-notice').count(),0);
 await page.locator('.storybook-page-rail>button').nth(0).click();await btn('쪽 양식·배경').click();await btn('겉표지').click();
 await page.getByRole('textbox',{name:'글·그림 작가 이름',exact:true}).fill('글 / 그림 봄이');await saved();
 await closeTools();await page.screenshot({path:output+'/cover.png',fullPage:true});
 await page.locator('.storybook-page-rail>button').nth(2).click();await btn('쪽 양식·배경').click();await btn('속표지').click();await page.getByRole('textbox',{name:'이 쪽의 제목',exact:true}).fill('봄이의 바다');
 await page.locator('.storybook-page-rail>button').nth(3).click();await btn('쪽 양식·배경').click();await btn('작가의 말').click();await text().fill('고래를 생각하며 이 책을 만들었어요.');await saved();await closeTools();
 await page.screenshot({path:output+'/author.png',fullPage:true});
 // Scrolling takes both top rows out of view; editing never switches screen modes.
 assert.equal(await btn('전체 화면').count(),0);await scrollToBook();assert.ok(await toolsOffscreen());
 await text().fill('스크롤한 뒤에도 고친 작가의 말');await saved();await closeTools();assert.ok(await toolsOffscreen());await page.screenshot({path:output+'/scrolled-book.png'});
 await page.locator('.storybook-page-rail>button').nth(0).click();await btn('미리보기').click();await page.getByRole('dialog',{name:'그림책 미리보기'}).waitFor();
 assert.equal(await page.locator('.reader-spread>.reader-page').count(),1);await btn('다음 쪽').click();assert.equal(await page.locator('.reader-turn').count(),1);await page.waitForTimeout(550);
 assert.equal(await page.locator('.reader-spread>.reader-page').count(),2);await page.screenshot({path:output+'/reader.png',fullPage:true});
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(550);assert.match(await page.locator('.storybook-reader footer').innerText(),/4–5/);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.storybook-reader').count(),0);
 console.log('PASS home order/groups, no load mutation, whole-book copy, text tools/save, page-local warning, templates/credit, scrolled editing, spread turn/keyboard');
 for(const [width,height]of [[320,568],[390,844],[844,390],[768,1024],[820,1180],[1180,820]]){
  await closeTools();await page.setViewportSize({width,height});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);
  const overlap=await page.locator('.storybook-editor-header').evaluate(el=>{const boxes=[...el.querySelectorAll('a,input,button')].map(e=>e.getBoundingClientRect());return boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));});assert.equal(overlap,false,`header overlap ${width}`);
  await page.getByRole('textbox',{name:'이 쪽의 제목',exact:true}).tap();assert.equal(await page.locator('.storybook-inspector').getAttribute('aria-label'),'이야기 꾸미기');
  assert.ok(await page.getByRole('textbox',{name:'이 쪽의 제목',exact:true}).evaluate(el=>document.activeElement===el),`story tap keeps text focus ${width}`);
  await page.screenshot({path:output+`/text-tools-${width}.png`,fullPage:true});
  const inspectorSize=await page.locator('.storybook-inspector').boundingBox();assert.ok(inspectorSize.height>=150,`text inspector too short ${width}: ${inspectorSize.height}`);
  await btn('가운데').click();await btn('중간').click();
  await page.getByRole('slider',{name:'이야기 칸 높이',exact:true}).scrollIntoViewIfNeeded();
  assert.ok(await page.getByRole('slider',{name:'이야기 칸 높이',exact:true}).evaluate(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight+1;}),`last text tool reachable ${width}`);
  await range('글자 크기',.04);await closeTools();await saved();
  await scrollToBook();await page.evaluate(()=>window.scrollBy(0,-220));
  const paper=await page.locator('.storybook-stage:not(.preview)').boundingBox();
  const swipeY=Math.min(height-24,paper.y+paper.height*.6);
  await swipe(paper.x+6,swipeY,0,-Math.min(300,swipeY-30));
  assert.ok(await toolsOffscreen(),`native touch scroll hides both top rows ${width}`);
  assert.equal(await page.locator('.storybook-inspector').count(),0,'scrolling the paper does not open tools');
  if(width>=768){
   await scrollToBook();await page.evaluate(()=>window.scrollBy(0,-180));
   const illustration=page.locator('.storybook-stage:not(.preview) .storybook-stage-element.image').first();
   const picture=await illustration.boundingBox(),startY=Math.min(height-24,picture.y+picture.height*.3);
   const originalPage=await server.DB.prepare('SELECT document_json FROM storybooks WHERE id=?').bind(copyId).first();
   await swipe(picture.x+picture.width/2,startY,0,-Math.min(260,startY-30));
   assert.ok(await toolsOffscreen(),`native touch scroll over unselected image ${width}`);
   assert.equal(await page.locator('.storybook-inspector').count(),0);
   assert.deepEqual(await server.DB.prepare('SELECT document_json FROM storybooks WHERE id=?').bind(copyId).first(),originalPage,'scroll gestures preserve image geometry');
   await illustration.tap();assert.equal(await page.locator('.storybook-inspector').getAttribute('aria-label'),'그림 꾸미기');
   assert.ok(await toolsOffscreen(),`tapping picture keeps scrolled view ${width}`);await closeTools();await btn('선택 해제').click();
  }
  await scrollToBook();assert.ok(await toolsOffscreen(),`tools scroll away ${width}`);await page.screenshot({path:output+`/scroll-${width}.png`});
  await btn('미리보기').click();await btn('다음 쪽').click();await page.waitForTimeout(550);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:output+`/reader-${width}.png`,fullPage:true});await btn('편집으로 돌아가기').click();
 }
 await saved();assert.deepEqual(await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(id).first(),original);
 await page.reload();await page.locator('.storybook-stage:not(.preview) .image img').waitFor();
 const stored=JSON.parse((await server.DB.prepare('SELECT document_json FROM storybooks WHERE id=?').bind(copyId).first()).document_json);assert.equal(stored.pages[3].elements.find(e=>e.textRole==='story').text,'스크롤한 뒤에도 고친 작가의 말');assert.equal(stored.pages[0].elements.find(e=>e.textRole==='credit').text,'글 / 그림 봄이');
 // Import a real two-page PDF through the teacher UI, then use the same editor.
 await page.setViewportSize({width:1440,height:1000});await context.addCookies([{name:'wiggle_teacher',value:teacherToken,url:server.origin}]);
 await page.goto(server.origin+`/teacher/class/${room}/books`);await page.locator('.pdf-import-panel').waitFor();
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 for(let i=0;i<2;i++){const p=pdf.addPage([300,306]);p.drawRectangle({x:20,y:30,width:260,height:220,color:rgb(.85,.92,.96)});p.drawText('Original PDF page '+(i+1),{x:35,y:265,size:16,font});}
 await page.locator('.pdf-import-panel input[type=file]').setInputFiles({name:'Original book.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
 await page.locator('.pdf-import-row select').selectOption(student);await btn('선택한 PDF 가져오기').click();await page.locator('.pdf-import-row').getByRole('link',{name:'그림책 수정',exact:true}).waitFor({timeout:45000});await page.locator('.pdf-import-row').getByRole('link',{name:'그림책 수정',exact:true}).click();
 await text().waitFor();const pdfId=page.url().split('/').at(-2),pdfOriginal=await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(pdfId).first();
 await btn('전체 복제').click();await page.waitForURL(url=>!url.pathname.includes(pdfId)&&url.pathname.endsWith('/edit'));await text().waitFor();
 await btn('쪽 양식·배경').click();await btn('배경을 그림으로 편집').click();await page.locator('.storybook-stage:not(.preview) .image').waitFor();await range('그림 크기',.8);await closeTools();
 await btn('이야기 칸 추가').click();const extra=page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true}).last();await extra.fill('PDF에도 새 이야기를 더했어요.');await saved();await closeTools();
 await page.screenshot({path:output+'/pdf-edit.png',fullPage:true});await page.reload();assert.equal(await page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true}).last().inputValue(),'PDF에도 새 이야기를 더했어요.');
 assert.deepEqual(await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(pdfId).first(),pdfOriginal);
 await server.DB.prepare('DELETE FROM artworks WHERE id=?').bind('artwork_revision').run();
 await page.goto(server.origin+'/student');await page.locator('.student-art-desk').waitFor();await page.locator('.desk-book-card').last().waitFor();
 assert.ok(await page.locator('.desk-new-book').isVisible(),'books remain reachable when no drawings exist');
 await page.getByRole('link',{name:/새 그림책 만들기/}).click();await page.waitForURL(url=>/\/student\/books\/storybook_/.test(url.pathname));await page.locator('.storybook-editor-header').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS six viewport sizes, unchanged completed original, real PDF import/copy/image editing/text/reload with original unchanged');
 console.log('Screenshots:',output);
}catch(error){console.error(server.logs().split('\n').filter(line=>!line.includes('token')).slice(-10).join('\n'));throw error;}
finally{await browser.close();await server.dispose();}
void draftId;
