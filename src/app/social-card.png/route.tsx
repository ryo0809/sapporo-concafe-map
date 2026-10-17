import { ImageResponse } from "next/og";
export const dynamic="force-static";
export function GET(){
  return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"center",width:"100%",height:"100%",padding:80,background:"#f3f7f2",color:"#314d3d",borderBottom:"18px solid #71847a"}}><div style={{display:"flex",fontSize:26,letterSpacing:8,color:"#71847a"}}>TANUKIKOJI / SUSUKINO</div><div style={{display:"flex",fontSize:100,fontWeight:700,marginTop:36}}>SAPPORO</div><div style={{display:"flex",fontSize:68,fontWeight:700}}>CONCAFE MAP</div><div style={{display:"flex",fontSize:26,marginTop:48}}>sapporo-concafe-map.com</div></div>,{width:1200,height:630});
}
