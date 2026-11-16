import{initializeApp}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import{getFirestore,doc,setDoc,onSnapshot}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyAmBmSFCgaFd-yE2vsLItLWKtU0Z8U_bSg',authDomain:'nyachyo-97f7d.firebaseapp.com',projectId:'nyachyo-97f7d',storageBucket:'nyachyo-97f7d.firebasestorage.app',messagingSenderId:'892799826403',appId:'1:892799826403:web:efbffa3ff82921746c88d6',measurementId:'G-5WYFR3YCLB'};
const ADMIN_EMAILS=new Set(['nyachyo29@gmail.com','rnskrns@gmail.com']);
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
const errorText=document.querySelector('#loginError'),rememberInput=document.querySelector('#rememberLogin');

document.querySelector('#googleLoginBtn').onclick=async()=>{errorText.textContent='';if(location.hostname==='127.0.0.1'){location.hostname='localhost';return}const remember=rememberInput.checked;localStorage.setItem('nyacho-google-remember',String(remember));try{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);const result=await signInWithPopup(auth,provider);if(!ADMIN_EMAILS.has(result.user.email?.toLowerCase()||'')){await signOut(auth);throw new Error('not-admin')}document.querySelector('#loginDialog').close()}catch(error){if(error.message==='not-admin')errorText.textContent='관리자로 등록된 계정이 아닙니다.';else if(error.code==='auth/unauthorized-domain')errorText.textContent='현재 주소는 Google 로그인 승인 주소가 아닙니다. localhost로 접속해 주세요.';else if(error.code==='auth/popup-blocked')errorText.textContent='브라우저에서 로그인 팝업을 허용해 주세요.';else errorText.textContent=`Google 로그인에 실패했습니다. (${error.code||'unknown'})`}};
window.nyachoFirebaseSignOut=()=>signOut(auth).catch(()=>{});
window.nyachoGetFirebaseToken=()=>auth.currentUser?.getIdToken(false)||Promise.resolve('');
window.nyachoFirebaseSave=async(name,value)=>{try{await setDoc(doc(db,'siteData',name),{value,updatedAt:Date.now()})}catch(error){console.warn('Firestore save failed',error);alert('Firebase 저장에 실패했습니다. Google 관리자 로그인 상태와 Firestore 권한을 확인해 주세요.')}};

onAuthStateChanged(auth,user=>{if(ADMIN_EMAILS.has(user?.email?.toLowerCase()||'')){const remember=localStorage.getItem('nyacho-google-remember')==='true';window.nyachoSetAdmin?.(true,remember);const saved=JSON.parse(localStorage.getItem('nyacho-settings')||'{}');if(!saved.profileImage&&user.photoURL){saved.profileImage=user.photoURL;localStorage.setItem('nyacho-settings',JSON.stringify(saved));window.dispatchEvent(new CustomEvent('nyachoSettingsRemote',{detail:saved}))}}else if(user){signOut(auth)}});
for(const [name,eventName]of[['schedules','nyachoSchedulesRemote'],['contents','nyachoContentsRemote'],['requests','nyachoRequestsRemote'],['settings','nyachoSettingsRemote'],['memberGroups','nyachoMemberGroupsRemote']]){onSnapshot(doc(db,'siteData',name),snapshot=>{if(!snapshot.exists())return;window.dispatchEvent(new CustomEvent(eventName,{detail:snapshot.data().value}))},error=>console.warn(`Firestore ${name} sync failed`,error))}
