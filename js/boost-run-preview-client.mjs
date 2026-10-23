import {createBoostStagingHttpClient} from './boost-staging-http-client.mjs';
const $=id=>document.getElementById(id);
let bearer='',client=null,inventory=null,selected=null;
const status=message=>{$('status').textContent=String(message);};
const post=async(path,body)=>{
 if(!bearer)throw new Error('検証トークンが必要です');
 const res=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+bearer},body:JSON.stringify(body),credentials:'omit',cache:'no-store'});
 if(!res.ok)throw new Error('HTTP '+res.status);
 return res.json();
};
function setButtons(){
 $('start').disabled=!client||!!client.activeRun||!inventory;
 $('finish').disabled=!client?.activeRun;
}
$('connect').addEventListener('click',async()=>{
 if(client?.activeRun){status('未保存のプレイがあります。先に終了・再試行してください。');return;}
 bearer=$('token').value.trim();$('token').value='';
 client=null;inventory=null;setButtons();
 try{
  const data=await post('/api/boost-preview/inventory',{});
  for(const type of ['time','score','sc'])if(!Number.isInteger(data?.[type])||data[type]<0||data[type]>2)throw new Error('Invalid inventory');
  inventory=data;
  client=createBoostStagingHttpClient({getBearer:()=>bearer,origin:location.origin});
  $('inventory').textContent='TIME '+data.time+'/2 · SCORE '+data.score+'/2 · SC '+data.sc+'/2';
  const options=$('boost-options');options.replaceChildren();
  for(const [kind,label] of [[null,'通常'],['time','⚽ +5 SEC'],['score','⚽ ×1.1'],['sc','⚽ SC']]){
   const button=document.createElement('button');button.type='button';button.textContent=label;
   button.disabled=kind!==null&&data[kind]===0;
   button.onclick=()=>{selected=kind;status(label+' を選択');};
   options.append(button);
  }
  selected=null;status('接続成功：通常プレイを選択');
 }catch(error){bearer='';status('接続失敗：'+error.message);}
 setButtons();
});
$('start').addEventListener('click',async()=>{
 $('start').disabled=true;
 try{
  const run=await client.start(selected);
  status('署名付きSTART確認：'+run.runId+' / '+run.durationSeconds+'秒 / '+(run.boost??'normal'));
 }catch(error){status('START失敗：'+error.message);}
 setButtons();
});
$('finish').addEventListener('click',async()=>{
 $('finish').disabled=true;
 try{
  const result=await client.finish({events:[],worldWidth:1000,device:'pc',claimedScore:0});
  status('FINISH確認：'+JSON.stringify(result));
  inventory=null; // Reload authoritative inventory before starting another run.
 }catch(error){status('FINISH失敗：'+error.message+'。同じRUNで再試行できます。');}
 setButtons();
});
addEventListener('pagehide',()=>{bearer='';});
