export class D1SearchRateLimiter {
  constructor(private readonly database:()=>Promise<D1Database>){}
  async consume(adminId:string,now=Date.now()){
    const db=await this.database();
    const row=await db.prepare(`INSERT INTO admin_search_limits VALUES(?,1,?)
      ON CONFLICT(admin_id) DO UPDATE SET
      request_count=CASE WHEN ?-started_at>=60000 THEN 1 ELSE request_count+1 END,
      started_at=CASE WHEN ?-started_at>=60000 THEN ? ELSE started_at END
      RETURNING request_count,started_at`).bind(adminId,now,now,now,now).first<{request_count:number;started_at:number}>();
    if(row&&row.request_count>5)throw Object.assign(new Error("外部検索は1分間に5回までです。少し待ってから再試行してください。"),{code:"SEARCH_RATE_LIMIT",retryAfter:Math.max(1,Math.ceil((row.started_at+60000-now)/1000))});
  }
}
