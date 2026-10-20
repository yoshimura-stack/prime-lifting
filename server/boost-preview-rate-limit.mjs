// Dedicated staging preview request throttle. Requires a bound Cloudflare rate limiter.
export async function allowPreviewRequest(request,limiter){
 if(!limiter||typeof limiter.limit!=='function')return false;
 const ip=request.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>128)return false;
 try{
  const result=await limiter.limit({key:'boost-preview:'+ip});
  return result?.success===true;
 }catch{return false;}
}
