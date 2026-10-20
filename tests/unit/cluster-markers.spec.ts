import {expect,test} from "@playwright/test";
import {clusterMapPoints} from "../../src/presentation/cafes/cluster-markers";
type Point={item:number;group:string;x:number;y:number};
function reference(points:Point[]){
  const groups=new Map<string,Point[]>();
  for(const point of points){
    const nearby=[...groups].find(([,members])=>Math.hypot(members[0].x-point.x,members[0].y-point.y)<60);
    const key=nearby?.[0]??point.group;groups.set(key,[...(groups.get(key)??[]),point]);
  }
  return [...groups.values()].map(group=>group.map(point=>point.item));
}
test("pixel-cell clustering preserves first-match ordering, floor groups and boundary behavior",()=>{
  const points=[{item:0,group:"a",x:0,y:0},{item:1,group:"b",x:100,y:0},{item:2,group:"c",x:50,y:0},{item:3,group:"a",x:900,y:0},{item:4,group:"d",x:60,y:0},{item:5,group:"e",x:-59.9,y:0}];
  expect(clusterMapPoints(points)).toEqual(reference(points));
  let state=12345;
  const random=()=>{state=(state*1664525+1013904223)>>>0;return state/2**32;};
  for(let run=0;run<20;run++){
    const sample=Array.from({length:300},(_,item)=>({item,group:`group-${Math.floor(random()*100)}`,x:random()*4000-2000,y:random()*4000-2000}));
    expect(clusterMapPoints(sample)).toEqual(reference(sample));
  }
});
