import {expect,test} from "@playwright/test";
import {DatabaseSync} from "node:sqlite";
import {readFileSync,readdirSync} from "node:fs";

test("runtime reads and cleanup use indexes instead of table scans or temporary sorts",()=>{
  const db=new DatabaseSync(":memory:");
  try{
    for(const name of readdirSync("db/migrations").filter(name=>name.endsWith(".sql")).sort())db.exec(readFileSync(`db/migrations/${name}`,"utf8"));
    const plans=[
      ["SELECT count(*) FROM cafes WHERE building_id='building' AND deleted_at IS NULL","cafes_building_deleted"],
      ["SELECT payload FROM collected_candidates ORDER BY run_id DESC LIMIT 5000","collected_candidates_run_id"],
      ["SELECT payload FROM search_candidates ORDER BY fetched_at DESC LIMIT 500","search_candidates_fetched_at"],
      ["SELECT * FROM contact_messages WHERE status='new' ORDER BY created_at DESC LIMIT 100","contact_messages_status_created"],
      ["DELETE FROM sessions WHERE expires_at<=1000","sessions_expires_at"],
      ["DELETE FROM contact_rate_limits WHERE started_at<1000","contact_rate_limits_started_at"],
      ["SELECT * FROM cafes WHERE publication_status='published' AND deleted_at IS NULL ORDER BY name","cafes_publication_list"],
    ];
    for(const [sql,index]of plans){
      const plan=JSON.stringify(db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all());
      expect(plan).toContain(index);expect(plan).not.toContain("USE TEMP B-TREE");
    }
  }finally{db.close();}
});
