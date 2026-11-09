import {test,expect} from "@playwright/test";
import {validateBanner,BannerValidationError} from "../../src/domain/events/banner";
const valid={title:"イベント",imageUrl:"https://example.com/banner.png",startsAt:"2026-11-09T10:00:00+09:00",endsAt:"2026-11-10T10:00:00+09:00",destination:"detail",detailText:"開催概要",externalUrl:"",published:true};
test("掲載期間と遷移方式を検証する",()=>{
  expect(validateBanner(valid)).toMatchObject({startsAt:"2026-11-09T01:00:00.000Z",destination:"detail",published:true});
  expect(validateBanner({...valid,destination:"none",detailText:""}).externalUrl).toBe("");
  expect(validateBanner({...valid,destination:"external",detailText:"",externalUrl:"https://example.com/event"}).externalUrl).toBe("https://example.com/event");
  for(const data of [
    {...valid,imageUrl:"javascript:alert(1)"},
    {...valid,imageUrl:"https://user:pass@example.com/image"},
    {...valid,endsAt:valid.startsAt},
    {...valid,destination:"external",externalUrl:"http://example.com"},
    {...valid,detailText:""},
  ]) expect(()=>validateBanner(data)).toThrow(BannerValidationError);
});
