import{initializeApp}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import{getAuth,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import{getFirestore,doc,setDoc,onSnapshot}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyAmBmSFCgaFd-yE2vsLItLWKtU0Z8U_bSg',authDomain:'nyachyo-97f7d.firebaseapp.com',projectId:'nyachyo-97f7d',storageBucket:'nyachyo-97f7d.firebasestorage.app',messagingSenderId:'892799826403',appId:'1:892799826403:web:efbffa3ff82921746c88d6',measurementId:'G-5WYFR3YCLB'};
const ADMIN_EMAILS=new Set(['natty09@gmail.com','nyachyo29@gmail.com','rnskrns@gmail.com']);
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
const errorText=document.querySelector('#loginError'),rememberInput=document.querySelector('#rememberLogin');

const normalizeEmail=value=>{const login=String(value||'').trim().toLowerCase();return login.includes('@')?login:`${login}@gmail.com`};
const ensureAdmin=async user=>{if(ADMIN_EMAILS.has(user?.email?.toLowerCase()||''))return user;await signOut(auth);const error=new Error('관리자로 등록된 계정이 아닙니다.');error.code='auth/not-admin';throw error};
const authErrorMessage=error=>{if(error.code==='auth/not-admin')return'관리자로 등록된 계정이 아닙니다.';if(error.code==='auth/unauthorized-domain')return'현재 주소가 Firebase 승인 도메인에 등록되지 않았습니다.';if(error.code==='auth/popup-blocked')return'브라우저에서 로그인 팝업을 허용해 주세요.';if(error.code==='auth/popup-closed-by-user')return'Google 로그인 창이 닫혔습니다.';if(['auth/invalid-credential','auth/user-not-found','auth/wrong-password','auth/invalid-login-credentials'].includes(error.code))return'아이디 또는 비밀번호가 올바르지 않습니다.';if(error.code==='auth/operation-not-allowed')return'Firebase Authentication에서 해당 로그인 방식을 활성화해 주세요.';if(error.code==='auth/too-many-requests')return'로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';return`로그인에 실패했습니다. (${error.code||'unknown'})`};
window.nyachoFirebasePasswordLogin=async(id,password,remember)=>{const email=normalizeEmail(id);if(!id||!password)throw new Error('아이디와 비밀번호를 입력해 주세요.');localStorage.setItem('nyacho-auth-remember',String(remember));try{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);const result=await signInWithEmailAndPassword(auth,email,password);await ensureAdmin(result.user);return result.user}catch(error){const wrapped=new Error(authErrorMessage(error));wrapped.code=error.code;throw wrapped}};
document.querySelector('#googleLoginBtn').onclick=async()=>{errorText.textContent='';if(location.hostname==='127.0.0.1'){location.hostname='localhost';return}const remember=rememberInput.checked;localStorage.setItem('nyacho-auth-remember',String(remember));try{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);const result=await signInWithPopup(auth,provider);await ensureAdmin(result.user);document.querySelector('#loginDialog').close()}catch(error){errorText.textContent=authErrorMessage(error)}};
window.nyachoFirebaseSignOut=()=>signOut(auth).catch(()=>{});
window.nyachoGetFirebaseToken=()=>auth.currentUser?.getIdToken(false)||Promise.resolve('');
// Store all site data as JSON text.  Firestore then only receives primitive fields,
// which prevents invalid-argument errors caused by undefined or browser-only values.
const encodeFirestoreValue=value=>JSON.stringify(value,(_key,item)=>{
  if(item===undefined||typeof item==='function'||typeof item==='symbol')return null;
  if(typeof item==='bigint')return String(item);
  return item;
});
const decodeFirestoreValue=value=>{
  if(typeof value!=='string')return value;
  try{return JSON.parse(value)}catch{return value}
};
window.nyachoFirebaseSave=async(name,value)=>{const user=auth.currentUser;if(!ADMIN_EMAILS.has(user?.email?.toLowerCase()||'')){console.warn('Firestore save skipped: no authenticated administrator');alert('Firebase 관리자 로그인 후 다시 저장해 주세요.');return false}try{const payload=encodeFirestoreValue(value);if(payload===undefined)throw new Error('저장할 데이터가 없습니다.');const target=name==='schedules'?doc(db,'events','calendar'):doc(db,'siteData',name);await setDoc(target,{payload,updatedAt:Date.now(),updatedBy:user.email});return true}catch(error){const code=String(error?.code||'unknown').replace(/^firestore\//,'');console.warn('Firestore save failed',code,error);const message=code==='permission-denied'?'Firestore 보안 규칙에서 저장이 허용되지 않았습니다. events/calendar 쓰기 권한을 관리자 이메일에 허용해 주세요.':`Firebase 저장에 실패했습니다. 오류 코드: ${code}`;alert(message);return false}};

const snapshotValue=snapshot=>{const data=snapshot.data()||{};return decodeFirestoreValue(data.payload??data.value)};
// 메모: 모두 읽을 수 있고(siteData/memo 구독), 쓰기는 관리자만 가능합니다.
let memoUnsubscribe=null;
const startMemoSync=()=>{if(memoUnsubscribe)return;memoUnsubscribe=onSnapshot(doc(db,'siteData','memo'),snapshot=>{if(!snapshot.exists())return;window.dispatchEvent(new CustomEvent('nyachoMemoRemote',{detail:snapshotValue(snapshot)}))},error=>{console.warn('Firestore memo sync failed',error);memoUnsubscribe=null})};
startMemoSync();
onAuthStateChanged(auth,user=>{if(ADMIN_EMAILS.has(user?.email?.toLowerCase()||'')){const remember=localStorage.getItem('nyacho-auth-remember')==='true';window.nyachoSetAdmin?.(true,remember);startMemoSync()}else{window.nyachoSetAdmin?.(false,false);if(user)signOut(auth)}});
let hasEventsCalendar=false;
onSnapshot(doc(db,'events','calendar'),snapshot=>{hasEventsCalendar=snapshot.exists();if(hasEventsCalendar)window.dispatchEvent(new CustomEvent('nyachoSchedulesRemote',{detail:snapshotValue(snapshot)}))},error=>console.warn('Firestore events sync failed',error));
onSnapshot(doc(db,'siteData','schedules'),snapshot=>{if(!hasEventsCalendar&&snapshot.exists())window.dispatchEvent(new CustomEvent('nyachoSchedulesRemote',{detail:snapshotValue(snapshot)}))},error=>console.warn('Firestore legacy schedules sync failed',error));
for(const [name,eventName]of[['contents','nyachoContentsRemote'],['requests','nyachoRequestsRemote'],['settings','nyachoSettingsRemote'],['memberGroups','nyachoMemberGroupsRemote']]){onSnapshot(doc(db,'siteData',name),snapshot=>{if(!snapshot.exists())return;window.dispatchEvent(new CustomEvent(eventName,{detail:snapshotValue(snapshot)}))},error=>console.warn(`Firestore ${name} sync failed`,error))}