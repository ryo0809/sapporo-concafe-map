export async function readAdminResponse(response:Response){
  const text=await response.text();
  if(!response.headers.get("content-type")?.includes("application/json")){
    if(response.status===401)throw new Error("ログインしてください。管理者ログイン画面から入り直してください。");
    if(/Worker exceeded resource limits|Error\s*1102/i.test(text)){
      throw new Error("サーバーの実行リソース上限に達しました（Cloudflare 1102）。実行環境の設定変更が必要です。保存が反映されている場合もあるため、再操作前に店舗情報をご確認ください。");
    }
    throw new Error(`サーバーから正常な応答を取得できませんでした（HTTP ${response.status}）。時間をおいて再度お試しください。`);
  }
  let result;
  try{result=JSON.parse(text);}catch{
    throw new Error("サーバーからの応答を読み取れませんでした。時間をおいて再度お試しください。");
  }
  if(!result||typeof result!=="object"||Array.isArray(result))throw new Error("サーバーからの応答形式が不正です。");
  if(!response.ok)throw new Error(typeof result.error==="string"?result.error:"処理に失敗しました。");
  return result;
}
