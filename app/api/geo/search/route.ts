import { NextRequest, NextResponse } from "next/server";

type NominatimResult = { place_id:number|string; display_name:string; lat:string; lon:string; importance?:number };
function toRad(value:number){return value*Math.PI/180}
function distanceMeters(aLat:number,aLng:number,bLat:number,bLng:number){const r=6371000;const dLat=toRad(bLat-aLat);const dLng=toRad(bLng-aLng);const a=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
async function searchNominatim(q:string, lat:number, lng:number){
  const delta=1.35;
  const params=new URLSearchParams({format:"jsonv2",addressdetails:"1",limit:"10",countrycodes:"mx",q,viewbox:`${lng-delta},${lat+delta},${lng+delta},${lat-delta}`,bounded:"0"});
  const response=await fetch(`https://nominatim.openstreetmap.org/search?${params}`,{headers:{"Accept-Language":"es-MX,es;q=0.9","User-Agent":"HomeRunRewards/1.0"},cache:"no-store"});
  if(!response.ok) throw new Error(`Nominatim ${response.status}`);
  return await response.json() as NominatimResult[];
}
export async function GET(request:NextRequest){
  const q=(request.nextUrl.searchParams.get("q")??"").trim();
  const context=(request.nextUrl.searchParams.get("context")??"").trim();
  const lat=Number(request.nextUrl.searchParams.get("lat"));
  const lng=Number(request.nextUrl.searchParams.get("lng"));
  if(q.length<2) return NextResponse.json({results:[]});
  const refLat=Number.isFinite(lat)?lat:19.432608; const refLng=Number.isFinite(lng)?lng:-99.133209;
  try{
    const searches=[searchNominatim(q,refLat,refLng)];
    if(context && !q.toLowerCase().includes(context.toLowerCase().split(",")[0])) searches.push(searchNominatim(`${q}, ${context}`,refLat,refLng));
    const batches=await Promise.allSettled(searches);
    const merged=new Map<string,NominatimResult>();
    for(const batch of batches){if(batch.status!=="fulfilled")continue;for(const row of batch.value){merged.set(String(row.place_id),row)}}
    const results=[...merged.values()].map(row=>{const rLat=Number(row.lat),rLng=Number(row.lon);return {...row,distance_meters:Number.isFinite(rLat)&&Number.isFinite(rLng)?distanceMeters(refLat,refLng,rLat,rLng):undefined}}).sort((a,b)=>(a.distance_meters??Infinity)-(b.distance_meters??Infinity)||Number(b.importance??0)-Number(a.importance??0)).slice(0,8);
    return NextResponse.json({results});
  }catch(error){console.error("Error búsqueda geográfica",error);return NextResponse.json({results:[]},{status:200})}
}
