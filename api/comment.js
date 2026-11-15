const COMMENT_ARRAY_KEYS=['data','comment_list','list','result'];
const COMMENT_ID_KEYS=['pCommentNo','commentNo','cCommentNo','comment_no','commentNo1','id','no'];
const findCommentArrayKey=obj=>COMMENT_ARRAY_KEYS.find(key=>Array.isArray(obj?.[key]))||null;
const getCommentId=comment=>{for(const key of COMMENT_ID_KEYS)if(comment?.[key]!==undefined&&comment?.[key]!==null)return`${key}:${comment[key]}`};

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  if(req.method==='OPTIONS')return res.status(200).end();
  const{url,highlight}=req.query;
  if(!url)return res.status(400).json({error:'URL 파라미터가 필요합니다.'});
  try{
    const cleanUrl=String(url).split('#')[0],match=cleanUrl.match(/\/station\/([a-zA-Z0-9_-]+)\/post\/(\d+)/),channelId=match?.[1],postId=match?.[2];
    if(!channelId||!postId)return res.status(400).json({error:'SOOP 게시글 주소 형식이 올바르지 않습니다.'});
    const highlightParam=highlight?`&pHighlightNo=${encodeURIComponent(highlight)}`:'',buildApiUrl=page=>`https://api-channel.sooplive.com/v1.1/channel/${channelId}/post/${postId}/comment?page=${page}&orderBy=like_cnt&cCommentNo=0${highlightParam}`;
    const headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36','Referer':cleanUrl,'Accept':'application/json, text/plain, */*'};
    const firstResponse=await fetch(buildApiUrl(1),{headers});if(!firstResponse.ok)throw new Error(`SOOP ${firstResponse.status}`);const aggregated=await firstResponse.json(),arrayKey=findCommentArrayKey(aggregated);
    if(arrayKey&&aggregated[arrayKey].length){const seenIds=new Set();aggregated[arrayKey].forEach(comment=>{const id=getCommentId(comment);if(id)seenIds.add(id)});const declaredLastPage=Number(aggregated.meta?.lastPage||aggregated.meta?.total_page||aggregated.meta?.totalPage)||null,upperBound=declaredLastPage?Math.min(declaredLastPage,200):200;for(let page=2;page<=upperBound;page++){const pageResponse=await fetch(buildApiUrl(page),{headers});if(!pageResponse.ok)break;const pageData=await pageResponse.json(),pageComments=Array.isArray(pageData[arrayKey])?pageData[arrayKey]:[];if(!pageComments.length)break;const fresh=pageComments.filter(comment=>{const id=getCommentId(comment);return!id||!seenIds.has(id)});if(!declaredLastPage&&!fresh.length)break;fresh.forEach(comment=>{const id=getCommentId(comment);if(id)seenIds.add(id)});aggregated[arrayKey].push(...fresh);await new Promise(resolve=>setTimeout(resolve,150))}}
    res.setHeader('Cache-Control','s-maxage=5, stale-while-revalidate=10');return res.status(200).json(aggregated);
  }catch(error){return res.status(500).json({error:'서버에서 댓글을 가져오는 중 문제가 발생했습니다.'})}
};
