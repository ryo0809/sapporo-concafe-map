import type {ManagedCafe} from "@/domain/admin/managed-cafe";
export function groupManagedCafes(cafes:readonly ManagedCafe[]){
  const groups=new Map<string,{key:string;name:string;address:string;cafes:ManagedCafe[]}>();
  for(const cafe of cafes){
    const key=cafe.buildingId?`${cafe.area}:${cafe.buildingId}`:`${cafe.area}:unassigned`;
    if(!groups.has(key))groups.set(key,{key,name:cafe.buildingId?cafe.buildingName:"ビル未登録",address:cafe.buildingId?cafe.address:"",cafes:[]});
    groups.get(key)!.cafes.push(cafe);
  }
  return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,"ja")).map(group=>({...group,cafes:group.cafes.sort((a,b)=>a.floor.localeCompare(b.floor,"ja",{numeric:true})||a.name.localeCompare(b.name,"ja"))}));
}
