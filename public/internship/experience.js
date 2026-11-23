(()=>{
 const chapters=[
  {image:'work-ideas.webp',title:'คิดไอเดีย',focus:'5% 50%',copy:'ฟังบรีฟ หาข้อมูล และเสนอไอเดียกับทีม ลองคิดสิ่งใหม่แล้วค่อย ๆ ขัดให้ชัดขึ้นจากคำแนะนำของพี่เลี้ยง'},
  {image:'work-planning.webp',title:'ลงมือวางแผน',focus:'42% 100%',copy:'เปลี่ยนไอเดียเป็นบท ภาพร่าง และรายการงาน ช่วยวางคิว เตรียมรายละเอียด และส่งต่อให้ทีมเข้าใจตรงกัน'},
  {image:'work-production.webp',title:'โปรดักชั่นจริง',focus:'43% 28%',copy:'เตรียมพื้นที่ กล้อง แสง และเสียง แล้วร่วมถ่ายทำงานจริงตามหน้าที่ที่ได้รับ โดยมีทีมคอยแนะนำ'},
  {image:'work-rehearsal.webp',title:'ซักซ้อมโชว์',focus:'70% 35%',copy:'ทวนบทและคิว ซ้อมกับผู้แสดง และเตรียมความพร้อมหลังเวที เรียนรู้การประสานคนก่อนโชว์เริ่ม'},
  {image:'work-team.webp',title:'เป็นส่วนหนึ่งกับเรา',focus:'100% 55%',copy:'ร่วมทำงานกับทีมยืนเดี่ยว Communeed และ STANd ตั้งแต่งานหลังกล้องถึงหลังเวที แล้วกลับมาดูผลงานและเรียนรู้ไปด้วยกัน'}
 ];
 document.querySelectorAll('[data-experience]').forEach(button=>button.onclick=()=>{
  const c=chapters[Number(button.dataset.experience)];
  showDetail(`<div class="experience-details" style="--detail-focus:${c.focus}"><h2>${c.title}</h2><img src="assets/${c.image}" width="1536" height="1024" alt="ภาพจำลองบรรยากาศ ${c.title}"><p class="process-brief">${c.copy}</p><p class="scene-disclaimer">ภาพจำลองด้วย AI · รอแทนด้วยภาพถ่ายจริงของทีม</p></div>`);
 });
 const panel=document.querySelector('#role-panel');
 const characters=['creative-cutout','specialist-cutout','pm-cutout','designer-cutout'];
 const labels=['Creative กำลังคิดไอเดียและร่างสตอรีบอร์ด','Specialist ชายผมยาวใส่แว่นกำลังจัดกล้อง','PM สาวผมยุ่งกำลังประสานงาน','Designer เสื้อ oversize ลายกราฟิกกำลังออกแบบ'];
 function updateRole(){
  const i=Math.max(0,[...document.querySelectorAll('[role=tab]')].findIndex(t=>t.getAttribute('aria-selected')==='true'));
  const visual=panel.querySelector('.role-visual');if(!visual)return;
  visual.dataset.roleTone=['creative','specialist','pm','designer'][i];
  visual.innerHTML=`<img class="role-character" src="assets/role-${characters[i]}.png" alt="ภาพวาดคาแรคเตอร์ ${labels[i]}" width="1254" height="1254" loading="lazy">`;
 }

 new MutationObserver(updateRole).observe(panel,{childList:true});updateRole();
})();
