(function(root){
'use strict';
const groups=[
 ['JAPAN',[['01','#d7193f','#111827','#ffffff','solid'],['02','#1557b0','#ffffff','#d7193f','stripe'],['03','#6d3a91','#ffffff','#f0c34e','solid'],['04','#f28c28','#162c48','#ffffff','band'],['05','#55aee8','#111827','#ffffff','solid'],['06','#111827','#1557b0','#ffffff','stripe'],['07','#e84a86','#162c48','#ffffff','solid'],['08','#159447','#ffffff','#f2c94c','solid'],['09','#f2c94c','#1557b0','#ffffff','band'],['10','#8b1e3f','#162c48','#ffffff','solid'],['11','#d7193f','#f2c94c','#ffffff','stripe'],['12','#f28c28','#ffffff','#162c48','solid'],['13','#283f8f','#d7193f','#ffffff','stripe'],['14','#7b2c91','#111827','#ffffff','stripe'],['15','#64c7d9','#ffffff','#162c48','band'],['16','#111827','#d7193f','#ffffff','band'],['17','#ffffff','#1557b0','#d7193f','stripe'],['18','#8bcf55','#162c48','#ffffff','solid'],['19','#244a91','#f2c94c','#ffffff','band'],['20','#ffffff','#d7193f','#162c48','band']]],
 ['GERMANY',[['01','#d71920','#ffffff','#111111','solid'],['02','#111111','#d71920','#f2c94c','stripe'],['03','#ffffff','#d71920','#111111','band'],['04','#7b1020','#ffffff','#111111','solid']]],
 ['ENGLAND',[['01','#d71920','#ffffff','#111827','solid'],['02','#1e5aa8','#ffffff','#d71920','solid'],['03','#79c9e8','#ffffff','#202b3a','band'],['04','#7b1f35','#7fc7d9','#ffffff','stripe']]],
 ['SPAIN',[['01','#ffffff','#1e5aa8','#d71920','stripe'],['02','#d71920','#1e3a8a','#f2c94c','band'],['03','#ffffff','#111111','#d71920','solid'],['04','#1e5aa8','#d71920','#ffffff','band']]],
 ['ITALY',[['01','#111111','#1769aa','#ffffff','stripe'],['02','#c51f35','#111111','#ffffff','stripe'],['03','#ffffff','#111111','#d6b24c','stripe'],['04','#1e5aa8','#ffffff','#111111','solid']]],
 ['FRANCE',[['01','#1d3557','#d71920','#ffffff','band'],['02','#ffffff','#d71920','#1d3557','solid'],['03','#7b1f35','#1d3557','#f2c94c','solid'],['04','#f2c94c','#1d3557','#d71920','band']]],
 ['WORLD',[['01','#f2c94c','#1e5aa8','#ffffff','solid'],['02','#75c9ef','#ffffff','#202b3a','stripe'],['03','#1e5aa8','#ffffff','#d71920','solid'],['04','#d71920','#ffffff','#1d3557','band']]]
];
const kits=[];for(const [group,items] of groups)items.forEach(([n,primary,secondary,accent,pattern])=>kits.push({id:group.toLowerCase()+'-'+n,group,name:group+' '+n,primary,secondary,accent,pattern}));
root.PRIME_KITS={groups:groups.map(x=>x[0]),kits,defaultId:'japan-01',get(id){return kits.find(k=>k.id===id)||kits[0];}};
})(globalThis);