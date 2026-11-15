const BOARD_URL='https://www.sooplive.com/station/natty09/board/122887767';
const textOnly=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=300');
  try{
    const response=await fetch(BOARD_URL,{headers:{'user-agent':'Mozilla/5.0','accept-language':'ko-KR,ko;q=0.9'}});
    if(!response.ok)throw new Error(`SOOP ${response.status}`);
    const html=await response.text(),plain=textOnly(html),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),part=type=>parts.find(item=>item.type===type).value;
    const tokens=[`${part('year')}-${part('month')}-${part('day')}`,`${part('year')}.${part('month')}.${part('day')}`,`${part('month')}.${part('day')}`];
    const token=tokens.find(value=>plain.includes(value));let notice=null;
    if(token){const index=plain.indexOf(token),segment=plain.slice(Math.max(0,index-220),index+320);notice=segment.replace(token,' ').replace(/\s+/g,' ').trim().slice(0,180)||null}
    res.status(200).json({notice,date:`${part('year')}-${part('month')}-${part('day')}`,boardUrl:BOARD_URL});
  }catch(error){res.status(502).json({notice:null,error:'SOOP notice unavailable',boardUrl:BOARD_URL})}
};
