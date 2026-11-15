module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=30');
  try{
    const body=new URLSearchParams({bid:'natty09',bno:'null',type:'live',pwd:'',player_type:'html5',stream_type:'common',quality:'HD',mode:'landing',from_api:'0',is_revive:'false'});
    const response=await fetch('https://live.sooplive.co.kr/afreeca/player_live_api.php',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'Mozilla/5.0'},body});
    if(!response.ok)throw new Error(`SOOP ${response.status}`);
    const payload=await response.json(),channel=payload.CHANNEL||{},broadcastNumber=Number(channel.BNO||0),live=Number(channel.RESULT)===1&&broadcastNumber>0;
    res.status(200).json({live,title:channel.TITLE||'',broadcastNumber:live?broadcastNumber:null,thumbnail:live?`https://liveimg.sooplive.com/m/${broadcastNumber}`:null,watchUrl:'https://play.sooplive.com/natty09/'});
  }catch(error){res.status(502).json({live:false,error:'SOOP live status unavailable'})}
};
