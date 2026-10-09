(function(root){'use strict';
const milestones=[0,3000,6000,9000,12000,15000,18000,20000,...Array.from({length:25},(_,i)=>24000+i*3000),100000];
const solids=['#d9e0e5','#d3283e','#1564c4','#e9c837','#19865b','#8c4ac4','#161d28'];
const palettes=[['#1d55b5','#f8f8f8','#d52e35','stripe'],['#d82135','#111b35','#e7d5a4','stripe'],['#ffffff','#14274b','#d12835','band'],['#101010','#f2b947','#f2b947','stripe'],['#13a3aa','#ffffff','#073d54','band'],['#8c1f40','#f5d6a0','#111d35','stripe'],['#f5f1dd','#1a3b86','#d52038','band'],['#244eaa','#e5c34e','#ffffff','stripe'],['#e94d24','#101828','#e5b65a','band'],['#121a29','#d42b3d','#f4f0e5','stripe'],['#52a8e4','#ffffff','#172b49','band'],['#e7d541','#224fa8','#ffffff','stripe'],['#156943','#f7e7ac','#e2b851','band'],['#ffffff','#111111','#d2a44a','stripe'],['#a71f30','#f1c5a2','#1d3b73','band'],['#111b24','#d7a84e','#e4bd65','stripe'],['#364bb8','#f2f2f2','#e83754','stripe'],['#bf2036','#f3c44d','#141f38','band'],['#071f37','#31d5e0','#a3ecff','stripe'],['#f0f0f0','#7b1f42','#e8bc72','band'],['#1e2736','#a9b8c6','#e9eef6','stripe'],['#29213f','#d8a9ff','#f1d5ff','band'],['#1c1c1c','#d9ad55','#f3d580','stripe'],['#062a31','#43d7ac','#d4fff0','band'],['#17141e','#b57afa','#f3c6ff','stripe']];
const specialDesigns={
  40000:{name:'NEON PULSE',primary:'#12162d',secondary:'#04f7e2',accent:'#80fff1',pattern:'neon',tier:'SPECIAL',glow:0.34},
  42000:{name:'LEOPARD KING',primary:'#d6a552',secondary:'#2c1a10',accent:'#fff1b5',pattern:'leopard',tier:'WILD'},
  45000:{name:'STREET HOODIE',primary:'#4e6c75',secondary:'#e2f1ed',accent:'#b7f7ed',pattern:'hoodie',tier:'STREET'},
  48000:{name:'BLACK SUIT',primary:'#17191e',secondary:'#f6f5ed',accent:'#e73b44',pattern:'suit',tier:'FORMAL'},
  51000:{name:'TIGER STRIKE',primary:'#ed791d',secondary:'#211711',accent:'#ffe19c',pattern:'tiger',tier:'WILD'},
  54000:{name:'GALAXY',primary:'#25124c',secondary:'#f567ee',accent:'#57f4ff',pattern:'galaxy',tier:'COSMIC',glow:0.28},
  57000:{name:'GOLDEN TUXEDO',primary:'#181818',secondary:'#e6bd61',accent:'#fff1b7',pattern:'tuxedo',tier:'FORMAL',glow:0.16},
  60000:{name:'CYBER GRID',primary:'#071b25',secondary:'#29f6c3',accent:'#7bfff2',pattern:'grid',tier:'CYBER',glow:0.34},
  63000:{name:'ZEBRA RUSH',primary:'#f4f1e9',secondary:'#151515',accent:'#d9ff68',pattern:'zebra',tier:'WILD'},
  66000:{name:'ROYAL CAPE',primary:'#53166d',secondary:'#f3c950',accent:'#fce4a1',pattern:'royal',tier:'ROYAL',glow:0.17},
  69000:{name:'LAVA ARMOR',primary:'#231317',secondary:'#ff5127',accent:'#ffc04c',pattern:'lava',tier:'ELEMENTAL',glow:0.35},
  72000:{name:'DENIM STREET',primary:'#37628c',secondary:'#b2d4ed',accent:'#f1f5f7',pattern:'denim',tier:'STREET'},
  75000:{name:'DISCO FEVER',primary:'#3a124c',secondary:'#f7d146',accent:'#ff65c9',pattern:'disco',tier:'PARTY',glow:0.28},
  78000:{name:'ICE PHANTOM',primary:'#bce9f4',secondary:'#4ac9f1',accent:'#ffffff',pattern:'ice',tier:'ELEMENTAL',glow:0.28},
  81000:{name:'SAMURAI GOLD',primary:'#1b1a21',secondary:'#d6a23e',accent:'#fff1a9',pattern:'samurai',tier:'MYTHIC',glow:0.3},
  84000:{name:'DRAGON SCALE',primary:'#176047',secondary:'#9ef3a6',accent:'#f8d95a',pattern:'scale',tier:'MYTHIC',glow:0.26},
  87000:{name:'PHANTOM SUIT',primary:'#282339',secondary:'#c9a6f7',accent:'#f0d9ff',pattern:'suit',tier:'MYTHIC',glow:0.35},
  90000:{name:'PLASMA STORM',primary:'#101535',secondary:'#d36bff',accent:'#64f9ff',pattern:'plasma',tier:'MYTHIC',glow:0.48},
  93000:{name:'BLACK DIAMOND',primary:'#14171d',secondary:'#91a5c1',accent:'#e8f8ff',pattern:'diamond',tier:'MYTHIC',glow:0.42},
  96000:{name:'GOLD EMPEROR',primary:'#4b3211',secondary:'#ffe082',accent:'#fff4c7',pattern:'royal',tier:'MYTHIC',glow:0.45},
  100000:{name:'LEGEND',primary:'#f3e5ff',secondary:'#78ecff',accent:'#ffe26d',pattern:'legend',tier:'LEGEND',glow:0.72}
};
const kits=milestones.map((pts,i)=>{if(i<7)return {pts,name:['STANDARD','CRIMSON','OCEAN','SUNSHINE','FOREST','VIOLET','MIDNIGHT'][i],primary:solids[i],secondary:solids[i],accent:solids[i],pattern:'solid',tier:'SOLID'};const p=palettes[i-7]||['#f1e2ff','#d7b44d','#72e5ff','stripe'];return {pts,name:i===33?'LEGEND':`WORLD KIT ${String(i-6).padStart(2,'0')}`,primary:p[0],secondary:p[1],accent:p[2],pattern:p[3],tier:i===33?'LEGEND':i>=18?'PREMIUM':'WORLD KIT'};});
kits.forEach((k,i)=>{if(k.pts>=40000){const d=specialDesigns[k.pts];if(d)Object.assign(k,d);}});

const all=kits.map((k,i)=>({...k,id:'unlock-'+String(i).padStart(2,'0'),group:'COLLECTION'}));
root.PRIME_KITS={groups:['COLLECTION'],kits:all,defaultId:all[0].id,get(id){return all.find(k=>k.id===id)||all[0];}};
})(globalThis);
