import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'Home', 'index.html');
let s = fs.readFileSync(p, 'utf8');

// Loader: fixed timing after bar (no video buffer gate).
s = s.replace(
  /fill\.addEventListener\("animationend",function\(\)\{var t0=Date\.now\(\);\(function w\(\)\{if\(window\.__xyzHeroSettled\|\|Date\.now\(\)-t0>12000\)\{setTimeout\(exit,380\);\}else\{setTimeout\(w,80\);\}\}\)\(\);\}\)/,
  'fill.addEventListener("animationend",function(){setTimeout(exit,380);})',
);

const oldReel = `var v=node.querySelector('video'); if(v){\r\n    var src=v.querySelector('source'); var cur=src?src.getAttribute('src'):'';\r\n    if(src&&cur!==(item.video||'')){ src.setAttribute('src',item.video||''); v.muted=true; v.setAttribute('playsinline',''); v.setAttribute('preload','metadata'); try{v.load();}catch(e){} }\r\n    else { v.setAttribute('preload','metadata'); }\r\n    var seek=function(){ try{ if(v.duration&&s>0&&s<v.duration) v.currentTime=s; }catch(e){} };\r\n    if(v.readyState>=1) seek(); else v.addEventListener('loadedmetadata',seek,{once:true});\r\n  }`;

const newReel = `var v=node.querySelector('video'); if(v){\r\n    var src=v.querySelector('source'); var clip=item.preview||'';\r\n    if(item.mkey) node.setAttribute('data-xyz-href','/work/'+item.mkey+'/');\r\n    if(clip&&src){\r\n      src.setAttribute('src',clip);\r\n      v.muted=true; v.setAttribute('playsinline',''); v.setAttribute('preload','auto'); v.loop=true;\r\n      try{v.load();}catch(e){}\r\n      var reset=function(){ try{if(v.currentTime>0.05)v.currentTime=0;}catch(e){} };\r\n      if(v.readyState>=1) reset(); else v.addEventListener('loadedmetadata',reset,{once:true});\r\n    }\r\n  }`;

if (!s.includes(oldReel)) throw new Error('xyz-home-reel video block not found');
s = s.replace(oldReel, newReel);

const pbOld = s.match(/<script>\/\* xyz-hero-playback-fix \*\/[\s\S]*?<\/script>/)[0];
const pbNew = `<script>/* xyz-hero-playback-fix */(function(){
  function activeIdx(items){var a=0,mz=-1;items.forEach(function(it,i){var z=parseInt(getComputedStyle(it).zIndex,10)||0;if(z>mz){mz=z;a=i;}});return a;}
  function setFooters(items,a){items.forEach(function(it,i){var ft=it.querySelector(".hero_content-footer");if(ft)ft.style.visibility=(i===a?"":"hidden");});}
  function vis(it){var vc=it.querySelector(".hero_vid-container");if(!vc)return 0;return parseFloat(getComputedStyle(vc).opacity)||0;}
  function tick(){
    try{
      var items=[].slice.call(document.querySelectorAll(".hero_item"));
      if(items.length<2)return;
      var a=activeIdx(items);
      setFooters(items,a);
      items.forEach(function(it,i){
        var v=it.querySelector("video"); if(!v)return;
        if(vis(it)>0.01){ if(v.paused){ var p=v.play(); if(p&&p.catch)p.catch(function(){}); } }
        else if(!v.paused){ try{v.pause();}catch(e){} }
      });
    }catch(e){}
  }
  function reveal(){ try{document.documentElement.classList.add("xyz-hero-ready");}catch(e){} }
  document.addEventListener("xyz-exiting",reveal);
  setTimeout(reveal,3200);
  setInterval(tick,90); tick();
  ["wheel","scroll","touchmove","keydown","pointerdown"].forEach(function(ev){window.addEventListener(ev,function(){tick();},{passive:true});});
})();</script>`;
s = s.replace(pbOld, pbNew);

const plOld = s.match(/<script>\/\* xyz-video-preload \*\/[\s\S]*?<\/script>/)[0];
const plNew = `<script>/* xyz-video-preload */(function(){
  function go(){
    document.querySelectorAll(".hero_item video").forEach(function(v){
      v.muted=true; v.setAttribute("preload","auto");
      try{ if(v.paused){ var p=v.play(); if(p&&p.catch)p.catch(function(){}); } }catch(e){}
    });
  }
  if(document.readyState!=="loading")go(); else document.addEventListener("DOMContentLoaded",go);
})();</script>`;
s = s.replace(plOld, plNew);

if (!s.includes('xyz-hero-project-link')) {
  const linkScript = `<script>/* xyz-hero-project-link */(function(){
  function activeItem(){
    var items=[].slice.call(document.querySelectorAll(".hero_item")); var a=0,mz=-1;
    items.forEach(function(it,i){ var z=parseInt(getComputedStyle(it).zIndex,10)||0; if(z>mz){mz=z;a=i;} });
    return items[a];
  }
  function hrefFor(it){
    if(!it) return "";
    var h=it.getAttribute("data-xyz-href"); if(h) return h;
    var idx=parseInt(it.getAttribute("data-slide-index")||"0",10);
    var hl=window.__HOME_ORDER&&window.__HOME_ORDER.homeList;
    var m=hl&&hl[idx]&&hl[idx].mkey;
    return m?"/work/"+m+"/":"";
  }
  function navigate(url){
    var pageOut=document.getElementById("page-out");
    if(!pageOut){ location.href=url; return; }
    pageOut.style.transition="none";
    pageOut.style.transform="translateY(100%)";
    pageOut.style.pointerEvents="all";
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        pageOut.style.transition="transform 0.48s cubic-bezier(0.76,0,0.24,1)";
        pageOut.style.transform="translateY(0)";
      });
    });
    setTimeout(function(){ location.href=url; },540);
  }
  document.addEventListener("click",function(e){
    if(e.target.closest(".nav_container,.projects_item-close,.hero_video-toggle,.hero_video-scrub")) return;
    var t=e.target.closest('[hero_video-button="browser-full-screen"],.hero_trigger_full-screen,.div-block-81,.hero_content-heading-container,.hero_vid-container');
    if(!t) return;
    var it=t.closest(".hero_item")||activeItem();
    var url=hrefFor(it);
    if(!url) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(url);
  },true);
})();</script>`;
  s = s.replace('<script>/* xyz-refresh-guard */', linkScript + '<script>/* xyz-refresh-guard */');
}

fs.writeFileSync(p, s);
console.log('Home/index.html patched for clip-only reel + project links');
