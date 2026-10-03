import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {startTestServer} from './harness/server.mjs';
import {sha256} from '../lib/token-crypto.ts';
import {emptyStorybookDocument,applyStorybookTemplate} from '../lib/storybook-model.ts';

test('HTTP whole-book copy preserves the completed original, retries once, isolates edits and enforces ownership',async t=>{
 const server=await startTestServer({env:{OPENAI_API_KEY:'',SWEETBOOK_API_KEY:''}});t.after(()=>server.dispose());await server.fetch('/api/student');
 const token=randomUUID(),otherToken=randomUUID(),teacherToken=randomUUID(),wrongTeacherToken=randomUUID(),expiry=new Date(Date.now()+3600000).toISOString();
 const tokenHash=await sha256(token), otherHash=await sha256(otherToken), teacherHash=await sha256(teacherToken), wrongTeacherHash=await sha256(wrongTeacherToken);
 await server.DB.batch([
  server.DB.prepare("INSERT INTO teachers(id,email,display_name) VALUES('copy_teacher','copy@example.test','교사')"),
  server.DB.prepare("INSERT INTO teachers(id,email,display_name) VALUES('wrong_teacher','wrong@example.test','다른 교사')"),
  ...[[teacherHash,'copy_teacher'],[wrongTeacherHash,'wrong_teacher']].map(([hash,id])=>server.DB.prepare('INSERT INTO teacher_sessions(token_hash,teacher_id,expires_at,last_used_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(hash,id,expiry)),
  server.DB.prepare("INSERT INTO classrooms(id,teacher_id,display_name,class_code,join_token) VALUES('copy_class','copy_teacher','반','4514','copy_join')"),
  ...['copy_student','copy_other'].map(id=>server.DB.prepare("INSERT INTO student_profiles(id,classroom_id,nickname,animal,last_activity_at) VALUES(?,'copy_class','별','cat',CURRENT_TIMESTAMP)").bind(id)),
  ...[[tokenHash,'copy_student'],[otherHash,'copy_other']].map(([hash,id])=>server.DB.prepare("INSERT INTO device_sessions(token_hash,student_id,expires_at,last_used_at) VALUES(?,?,?,CURRENT_TIMESTAMP)").bind(hash,id,expiry))
 ]);
 const headers={authorization:'Bearer '+token,'content-type':'application/json'};
 const created=await(await server.fetch('/api/storybooks',{method:'POST',headers,body:'{}'})).json(),id=created.storybook.id;
 const png=await sharp({create:{width:20,height:20,channels:3,background:'#45aa66'}}).png().toBuffer();
 const uploaded=await(await server.fetch(`/api/storybooks/${id}/assets`,{method:'POST',headers:{...headers,'content-type':'image/png'},body:png})).json();
 const document=emptyStorybookDocument();
 document.pages=Array.from({length:24},(_,i)=>emptyStorybookDocument('squarebook-hc',`page_copy${String(i).padStart(8,'0')}`,`element_copy${String(i).padStart(8,'0')}`).pages[0]);
 document.pages[0].backgroundAssetId=uploaded.asset.id;
 document.pages[0]=applyStorybookTemplate(document.pages[0],'cover',()=>`element_${randomUUID().replaceAll('-','')}`);
 document.pages[0].elements[0].text='첫 번째 책';document.pages[0].elements[1].text='글 / 그림 봄이';
 document.pages[1].elements[0].text='모두 남아 있어야 하는 이야기';
 document.pages[1].elements.push({id:'element_copyimage01',type:'image',assetId:uploaded.asset.id,x:.08,y:.27,width:.84,height:.65,rotation:4,zIndex:1,opacity:.8,locked:false});
 await server.DB.prepare("UPDATE storybooks SET title='원본 - 1차',document_json=?,status='complete',completed_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(document),id).run();
 const source=await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(id).first();
 const copyId=`storybook_${randomUUID().replaceAll('-','')}`;
 const copy=()=>server.fetch(`/api/storybooks/${id}/duplicate`,{method:'POST',headers,body:JSON.stringify({copyId})});
 const responses=await Promise.all([copy(),copy()]);assert.ok(responses.every(r=>r.ok));
 assert.equal((await(await copy()).json()).storybook.id,copyId);
 const copied=await(await server.fetch(`/api/storybooks/${copyId}`,{headers})).json();
 assert.equal(copied.storybook.status,'draft');assert.equal(copied.storybook.completedAt,null);assert.equal(copied.storybook.revision,0);
 assert.equal(copied.storybook.document.pages.length,24);
 const mapped=structuredClone(copied.storybook.document);for(const page of mapped.pages){if(page.backgroundAssetId)page.backgroundAssetId=uploaded.asset.id;for(const el of page.elements)if(el.assetId)el.assetId=uploaded.asset.id;}
 assert.deepEqual(mapped,document);
 assert.notEqual(copied.assets[0].id,uploaded.asset.id);
 const asset=await server.fetch(`/api/storybooks/${copyId}/assets/${copied.assets[0].id}`,{headers});assert.deepEqual(Buffer.from(await asset.arrayBuffer()),png);
 copied.storybook.document.pages[1].elements[0].text='피드백을 반영한 두 번째 이야기';
 const saved=await server.fetch(`/api/storybooks/${copyId}`,{method:'PUT',headers,body:JSON.stringify({requestId:'save_'+randomUUID(),expectedRevision:0,title:'2차',document:copied.storybook.document,complete:false})});assert.equal(saved.status,200,await saved.text());
 assert.deepEqual(await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(id).first(),source);
 assert.equal((await server.DB.prepare('SELECT count(*) AS n FROM storybooks WHERE student_id=?').bind('copy_student').first()).n,2);
 const denied=await server.fetch(`/api/storybooks/${id}/duplicate`,{method:'POST',headers:{...headers,authorization:'Bearer '+otherToken},body:JSON.stringify({copyId:`storybook_${randomUUID().replaceAll('-','')}`})});assert.equal(denied.status,404);
 assert.equal((await server.fetch(`/api/storybooks/${id}/duplicate`,{method:'POST',headers:{...headers,origin:'https://evil.test'},body:JSON.stringify({copyId})})).status,403);
 const teacherCopyId=`storybook_${randomUUID().replaceAll('-','')}`;
 const teacherCopy=await server.fetch(`/api/teacher/book-editor/${id}/duplicate`,{method:'POST',headers:{cookie:`wiggle_teacher=${teacherToken}`,'content-type':'application/json'},body:JSON.stringify({copyId:teacherCopyId})});assert.equal(teacherCopy.status,201);
 for(const path of [`/duplicate`,`/artworks`,`/artworks/artwork_unknown`]){
  const response=await server.fetch(`/api/teacher/book-editor/${id}${path}`,{method:path==='/duplicate'?'POST':'GET',headers:{cookie:`wiggle_teacher=${wrongTeacherToken}`,'content-type':'application/json'},...(path==='/duplicate'?{body:JSON.stringify({copyId:`storybook_${randomUUID().replaceAll('-','')}`})}:{})});assert.equal(response.status,401,path);
 }
 const longBook=emptyStorybookDocument();longBook.pages=Array.from({length:140},(_,i)=>emptyStorybookDocument('squarebook-hc',`page_imported${String(i).padStart(8,'0')}`,`element_imported${String(i).padStart(8,'0')}`).pages[0]);
 await server.DB.prepare('UPDATE storybooks SET document_json=? WHERE id=?').bind(JSON.stringify(longBook),teacherCopyId).run();
 longBook.pages[139].elements[0].text='가져온 긴 PDF의 마지막 쪽도 고칠 수 있어요';
 const lastPageSave=await server.fetch(`/api/storybooks/${teacherCopyId}`,{method:'PUT',headers,body:JSON.stringify({requestId:'save_'+randomUUID(),expectedRevision:0,title:'긴 PDF 수정',document:longBook,complete:false})});assert.equal(lastPageSave.status,200);
 assert.deepEqual(await server.DB.prepare('SELECT * FROM storybooks WHERE id=?').bind(id).first(),source);
});
