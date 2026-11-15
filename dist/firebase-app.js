import{initializeApp}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import{getFirestore,doc,setDoc,onSnapshot}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyAmBmSFCgaFd-yE2vsLItLWKtU0Z8U_bSg',authDomain:'nyachyo-97f7d.firebaseapp.com',projectId:'nyachyo-97f7d',storageBucket:'nyachyo-97f7d.firebasestorage.app',messagingSenderId:'892799826403',appId:'1:892799826403:web:efbffa3ff82921746c88d6',measurementId:'G-5WYFR3YCLB'};
const ADMIN_EMAIL='nyachyo29@gmail.com';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
const errorText=document.querySelector('#loginError'),rememberInput=document.querySelector('#rememberLogin');

document.querySelector('#googleLoginBtn').onclick=async()=>{errorText.textContent='';const remember=rememberInput.checked;localStorage.setItem('nyacho-google-remember',String(remember));try{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);const result=await signInWithPopup(auth,provider);if(result.user.email?.toLowerCase()!==ADMIN_EMAIL){await signOut(auth);throw new Error('not-admin')}document.querySelector('#loginDialog').close()}catch(error){errorText.textContent=error.message==='not-admin'?'허용된 관리자 Google 계정이 아닙니다.':'Google 로그인에 실패했습니다. Firebase의 Google 로그인 설정을 확인해 주세요.'}};
window.nyachoFirebaseSignOut=()=>signOut(auth).catch(()=>{});
window.nyachoFirebaseSave=async(name,value)=>{if(auth.currentUser?.email?.toLowerCase()!==ADMIN_EMAIL)return;try{await setDoc(doc(db,'siteData',name),{value,updatedAt:Date.now()})}catch(error){console.warn('Firestore save failed',error)}};

onAuthStateChanged(auth,user=>{if(user?.email?.toLowerCase()===ADMIN_EMAIL){const remember=localStorage.getItem('nyacho-google-remember')==='true';window.nyachoSetAdmin?.(true,remember);const saved=JSON.parse(localStorage.getItem('nyacho-settings')||'{}');if(!saved.profileImage&&user.photoURL){saved.profileImage=user.photoURL;localStorage.setItem('nyacho-settings',JSON.stringify(saved));window.dispatchEvent(new CustomEvent('nyachoSettingsRemote',{detail:saved}))}}else if(user){signOut(auth)}});
for(const [name,eventName]of[['schedules','nyachoSchedulesRemote'],['contents','nyachoContentsRemote'],['requests','nyachoRequestsRemote'],['settings','nyachoSettingsRemote']]){onSnapshot(doc(db,'siteData',name),snapshot=>{if(!snapshot.exists())return;window.dispatchEvent(new CustomEvent(eventName,{detail:snapshot.data().value}))},error=>console.warn(`Firestore ${name} sync failed`,error))}
