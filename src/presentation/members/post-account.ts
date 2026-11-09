export async function postAccount(path:string,body:Record<string,unknown>) {
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.error==="string"?data.error:"処理に失敗しました。もう一度お試しください。");
  return data;
}
