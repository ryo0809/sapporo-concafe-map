import { ImageResponse } from "next/og";
export const size={width:180,height:180};
export const contentType="image/png";
export default function AppleIcon(){
  return new ImageResponse(<div style={{display:"flex",alignItems:"center",justifyContent:"center",background:"#f3f7f2",width:"100%",height:"100%"}}><svg width="150" height="150" viewBox="0 0 64 64"><path d="M12 32a20 20 0 0 1 40 0c-5 5-10 4-13 1-5 4-9 4-14 0-4 3-9 3-13-1Z" fill="#dce5df" stroke="#536e5d" strokeWidth="3"/><path d="M22 39c-6 6 5 8 0 15m10-15c5 5-5 9 0 15m10-15c-5 6 5 8 0 15" fill="none" stroke="#536e5d" strokeWidth="3" strokeLinecap="round"/></svg></div>,size);
}
