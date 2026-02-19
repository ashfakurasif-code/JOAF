// Auto copyright year
const y = document.getElementById("year");
if(y){
 y.innerText = new Date().getFullYear();
}

// Time + day
function updateTime(){
 const now = new Date();
 const t = document.getElementById("time");
 if(t){
   t.innerText = now.toLocaleString();
 }
}
setInterval(updateTime,1000);
updateTime();

// IP location
fetch("https://ipapi.co/json/")
.then(res=>res.json())
.then(data=>{
 const loc = document.getElementById("location");
 if(loc){
   loc.innerText = data.city + ", " + data.country_name;
 }
});
