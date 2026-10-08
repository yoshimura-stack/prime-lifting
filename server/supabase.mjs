import contract from './db-contract.mjs';
import {ApiError} from './replay.mjs';
export function createDatabase(env){
 return {async resetAllPlayers(){
  const secret=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY;
  if(!env.SUPABASE_URL||!secret)throw new ApiError(503,'ランキング接続が未設定です。');
  const base=new URL(env.SUPABASE_URL);
  if(base.protocol!=='https:'||base.pathname!=='/'||base.username||base.password)throw new ApiError(503,'ランキング設定を確認中です。');
  const headers={apikey:secret,Prefer:'return=minimal'};
  if(secret.startsWith('eyJ'))headers.Authorization='Bearer '+secret;
  let response;
  try{response=await fetch(new URL('/rest/v1/lifting_players?id=not.is.null',base),{method:'DELETE',headers,signal:AbortSignal.timeout(8000)});}catch{throw new ApiError(503,'ランキングに接続できません。');}
  if(!response.ok)throw new ApiError(503,'ランキングの初期化に失敗しました。');
  return {ok:true};
 },async call(operation,input={}){
  const mapping=contract.operations[operation];
  if(!contract.verified||!mapping||!env.SUPABASE_URL||!(env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY))throw new ApiError(503,'ランキングの接続準備中です。ゲストで遊べます。');
  const base=new URL(env.SUPABASE_URL);
  if(base.protocol!=='https:'||base.pathname!=='/'||base.username||base.password)throw new ApiError(503,'ランキング設定を確認中です。');
  if(!/^[a-z][a-z0-9_]*$/.test(mapping.rpc))throw new ApiError(503,'ランキング設定を確認中です。');
  const headers={'Content-Type':'application/json',apikey:(env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY)};
  if((env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY).startsWith('eyJ'))headers.Authorization='Bearer '+(env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY);
  const body=mapping.encode(input);
  let response;
  try{response=await fetch(new URL('/rest/v1/rpc/'+mapping.rpc,base),{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});}catch{throw new ApiError(503,'ランキングに接続できません。再試行してください。');}
  // Never forward Postgres error details (or PINs/secrets) to the client/logs.
  if(!response.ok)throw new ApiError(503,'ランキング処理に失敗しました。再試行してください。');
  return mapping.decode(await response.json());
 }};
}
