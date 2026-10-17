import { canonicalAddress } from "../../../batch/lib/collection.mjs";
import { normalizeSearch } from "../../domain/admin/candidate-matching";

type Place={name:string;address:string;area:string};
const nameKey=(name:string)=>normalizeSearch(name).replace(/^(?:こすぷれ酒場|和装こんせぷとばー|猫耳めいどかふぇばー|にゃんこめいどかふぇ)/,"");
export const candidateFloor=(address:string)=>canonicalAddress(address).match(/(?:B\d+|\d+)F/i)?.[0]?.toUpperCase();
export function sameSearchCandidate(a:Place,b:Place){
  if(a.area!==b.area||nameKey(a.name)!==nameKey(b.name))return false;
  const left=canonicalAddress(a.address),right=canonicalAddress(b.address);
  const street=(value:string)=>value.match(/南\d+条[東西]\d+(?:-\d+){0,2}/)?.[0]??value;
  const leftFloor=candidateFloor(a.address),rightFloor=candidateFloor(b.address);
  return Boolean(left&&right)&&street(left)===street(right)&&(!leftFloor||!rightFloor||leftFloor===rightFloor);
}
