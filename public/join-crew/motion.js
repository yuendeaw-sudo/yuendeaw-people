(()=>{
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),ship=document.querySelector('.ship');
const original=ship.querySelector('img');original.src='/join-crew/assets/layers/room-motion-v4.webp';original.classList.add('room-plate');original.alt='ห้องควบคุมยาน พร้อมเลเยอร์ใบไม้ เก้าอี้ และแขนของลูกเรือที่ขยับแยกกัน';
const layers=document.createElement('div');layers.className='scene-layers';layers.setAttribute('aria-hidden','true');
const pieces=[['plant-hanging',0,0,340,275],['plant-desk',0,490,290,310],['captain-point',875,115,300,142]];
for(const [name,x,y,w,h]of pieces){const part=document.createElement('img');part.src='/join-crew/assets/layers/'+name+'.webp';part.alt='';part.className='scene-part '+name;part.style.cssText=`left:${x/1672*100}%;top:${y/941*100}%;width:${w/1672*100}%;height:${h/941*100}%`;layers.append(part)}

// Matching arm cutouts retain the current crew illustration's clothing and colors.
const armShapes={
 'captain-rest-v4':[[875,130],[925,145],[963,200],[989,241],[1038,258],[1046,281],[1010,288],[955,270],[920,234],[882,212]],
 'pen-arm-v4':[[1180,439],[1229,414],[1277,361],[1300,330],[1320,327],[1365,348],[1373,370],[1339,402],[1290,450],[1250,481],[1216,483]]
};
for(const [name,points] of Object.entries(armShapes)){
 const arm=document.createElement('img');arm.src='/join-crew/assets/crew-likeness-v4.webp';arm.alt='';arm.className='scene-arm '+name;
 arm.style.clipPath='polygon('+points.map(([x,y])=>`${x/1670*100}% ${y/941*100}%`).join(',')+')';layers.append(arm);
}
ship.querySelector('.ship-atmosphere').before(layers);
const steam=ship.querySelector('.cup-steam');steam.innerHTML='<svg viewBox="0 0 60 110" aria-hidden="true"><path class="steam-strand strand-a" d="M18 104 C-2 86 41 71 19 51 C3 35 34 19 21 2"/><path class="steam-strand strand-b" d="M34 106 C58 88 14 72 37 52 C51 37 23 19 38 1"/><path class="steam-strand strand-c" d="M25 105 C45 83 10 68 29 45 C44 25 20 15 30 1"/></svg>';
const atmosphere=ship.querySelector('.ship-atmosphere');atmosphere.insertAdjacentHTML('beforeend','<div class="lamp-glow"></div><div class="lamp-glow wall"></div><div class="monitor-playhead"></div><div class="monitor-spark"></div>');
new IntersectionObserver(([e])=>ship.classList.toggle('ship-out-of-view',!e.isIntersecting),{rootMargin:'80px'}).observe(ship);
const video=document.querySelector('.post-background');if(video){let loaded=false,visible=false;function manageVideo(){if(visible&&!document.hidden&&!reduced.matches){if(!loaded){const source=video.querySelector('source');source.src=source.dataset.src;video.load();loaded=true}video.play().catch(()=>{})}else video.pause()}new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;manageVideo()},{rootMargin:'150px'}).observe(video);document.addEventListener('visibilitychange',manageVideo);reduced.addEventListener('change',manageVideo);
}
// Shuffle only once on opening; cards stay still while the visitor reads.
const strip=document.querySelector('.comedian-strip');if(strip){const cards=Array.from(strip.children);for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}cards.forEach(c=>strip.append(c))}
})();
