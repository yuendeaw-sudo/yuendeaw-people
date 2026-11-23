// Standalone public landing; applications use the existing server-backed form.
openApplication=function(){window.location.href='/apply/internship'};
document.querySelectorAll('.apply').forEach(b=>b.onclick=openApplication);
const track=document.querySelector('#track');if(track)track.remove();
