const API_URL='https://api-channel.sooplive.com/v1.3/channel/natty09/board?perPage=20&startDate=&endDate=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&orderBy=reg_date&page=1&bbsNo=122887767';
const BOARD_URL='https://www.sooplive.com/station/natty09/board/122887767';
const clean=value=>String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const findRows=value=>{if(Array.isArray(value)&&value.some(row=>row&&typeof row==='object'&&('reg_date'in row||'title'in row)))return value;if(value&&typeof value==='object')for(const child of Object.values(value)){const found=findRows(child);if(found)return found}return null};
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=180');
  try{
    const response=await fetch(API_URL,{headers:{accept:'application/json','user-agent':'Mozilla/5.0'}});
    if(!response.ok)throw new Error(`SOOP ${response.status}`);
    const payload=await response.json(),rows=findRows(payload)||[],row=rows[0],notice=row?clean(row.title||row.subject||row.contents):null,date=row?.reg_date||row?.regDate||row?.created_at||row?.createdAt||null;
    res.status(200).json({notice,date,boardUrl:BOARD_URL});
  }catch(error){res.status(502).json({notice:null,error:'SOOP notice unavailable',boardUrl:BOARD_URL})}
};
