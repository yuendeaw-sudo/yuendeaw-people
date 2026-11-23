(()=>{
 const button=document.querySelector('#camera-toggle'),video=document.querySelector('#selfie-video'),mirror=document.querySelector('.camera-mirror'),status=document.querySelector('#camera-status'),live=document.querySelector('.mirror-live');
 let stream=null,request=0,pending=false;
 const idle='ภาพแสดงเฉพาะบนอุปกรณ์นี้ ไม่บันทึกหรืออัปโหลด';
 function stop(message=idle){request++;pending=false;if(stream){stream.getTracks().forEach(track=>track.stop());stream=null}video.pause();video.srcObject=null;video.hidden=true;live.hidden=true;mirror.classList.remove('has-camera');button.disabled=false;button.textContent='เปิดกล้อง';button.setAttribute('aria-pressed','false');status.textContent=message}
 button.addEventListener('click',async()=>{
  if(stream){stop();return}if(pending)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){status.textContent='เบราว์เซอร์นี้ยังเปิดกล้องไม่ได้ กรุณาเปิดเว็บผ่าน HTTPS ในเบราว์เซอร์ที่รองรับ';return}
  const id=++request;pending=true;button.disabled=true;button.textContent='กำลังขออนุญาตกล้อง';status.textContent='อนุญาตกล้องเพื่อดูภาพสะท้อนของคุณ ไม่เปิดไมโครโฟน';
  try{const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});if(id!==request){media.getTracks().forEach(t=>t.stop());return}stream=media;video.srcObject=media;video.hidden=false;await video.play();if(id!==request)return;pending=false;button.disabled=false;button.textContent='ปิดกล้อง';button.setAttribute('aria-pressed','true');mirror.classList.add('has-camera');live.hidden=false;status.textContent=idle;media.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===media)stop('กล้องหยุดแล้ว คุณสามารถกดเปิดใหม่ได้')}))}
  catch(error){if(id!==request)return;stop(error.name==='NotAllowedError'?'ยังไม่ได้รับอนุญาตกล้อง คุณยังอ่านข้อมูลและสมัครได้ตามปกติ หากเปิดผ่านหน้าตัวอย่าง ให้ลองเปิดเว็บในแท็บใหม่':error.name==='NotFoundError'?'ไม่พบกล้องบนอุปกรณ์นี้ คุณยังสมัครได้ตามปกติ':'เปิดกล้องไม่สำเร็จ อาจมีกล้องถูกใช้งานอยู่ คุณยังสมัครได้ตามปกติ')}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||pending))stop()});window.addEventListener('pagehide',()=>stop());
})();
