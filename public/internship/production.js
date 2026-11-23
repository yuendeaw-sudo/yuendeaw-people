// Standalone public landing; applications use the existing server-backed form.
openApplication=function(){const d=intakeDates(season);window.location.href='/internship/apply?season='+encodeURIComponent(seasons[season][0])+'&start='+d.start+'&end='+d.end+'#'+['creative','specialist','pm','designer'][chosen]};
document.querySelectorAll('.apply').forEach(b=>b.onclick=openApplication);
const track=document.querySelector('#track');if(track)track.remove();
