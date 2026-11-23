// Standalone public landing; applications use the existing server-backed form.
openApplication=function(){const d=intakeDates(season);window.location.href='/apply/internship?season='+encodeURIComponent(seasons[season][0])+'&start='+d.start+'&end='+d.end};
document.querySelectorAll('.apply').forEach(b=>b.onclick=openApplication);
const track=document.querySelector('#track');if(track)track.remove();
