import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase.js";

const state = {
  user: null,
  profile: null,
  isAdmin: false,
  demo: false,
  currentPage: "home"
};

const demoProfile = { uid:"demo", employeeId:"", fullName:"", username:"", email:"", unit:"", position:"", role:"employee", status:"approved" };
const demoUsers = [];

let app, auth, db;
if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function toast(message){
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast = setTimeout(()=>el.classList.remove("show"), 3200);
}
function initials(name="User") { return name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function showAuth(){ $("authView").classList.remove("hidden"); $("appView").classList.add("hidden"); }
function showApp(){ $("authView").classList.add("hidden"); $("appView").classList.remove("hidden"); renderPage(); }
function setProfile(p){ state.profile=p; }

function friendlyAuthError(error){
  const map = {
    "auth/invalid-credential":"Incorrect email or password.",
    "auth/invalid-email":"Please enter a valid email address.",
    "auth/email-already-in-use":"That email address is already registered.",
    "auth/weak-password":"Use a stronger password (at least 6 characters).",
    "auth/too-many-requests":"Too many attempts. Please try again later."
  };
  return map[error.code] || error.message || "Something went wrong.";
}

$("showRegister").addEventListener("click", ()=>{
  $("loginPanel").classList.add("hidden"); $("registerPanel").classList.remove("hidden");
});
$("showLogin").addEventListener("click", ()=>{
  $("registerPanel").classList.add("hidden"); $("loginPanel").classList.remove("hidden");
});
$$('.eye').forEach(btn=>btn.addEventListener('click',()=>{const el=$(btn.dataset.target); el.type=el.type==='password'?'text':'password';}));

$("forgotBtn").addEventListener("click", async ()=>{
  const email=$("loginEmail").value.trim();
  if(!email) return toast("Enter your email first.");
  if(!isFirebaseConfigured) return toast("Demo mode: password reset is available after Firebase setup.");
  try { await sendPasswordResetEmail(auth,email); toast("Password reset email sent."); } catch(e){ toast(friendlyAuthError(e)); }
});

$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const email=$("loginEmail").value.trim(), pass=$("loginPassword").value;
  if(!isFirebaseConfigured){
    state.demo=true; state.isAdmin=true; setProfile(demoProfile); showApp(); toast("Demo dashboard opened."); return;
  }
  try {
    const cred=await signInWithEmailAndPassword(auth,email,pass);
    const snap=await getDoc(doc(db,"users",cred.user.uid));
    if(!snap.exists()) { await signOut(auth); return toast("Your employee profile is missing. Contact the administrator."); }
    const p=snap.data();
    if(p.status!=="approved"){ await signOut(auth); return toast(`Account status: ${p.status}. Please wait for admin approval.`); }
    state.demo=false; state.isAdmin=p.role==="admin"; setProfile(p); showApp();
  } catch(e){ toast(friendlyAuthError(e)); }
});

$("demoLoginBtn").addEventListener("click",()=>{ state.demo=true; state.isAdmin=true; setProfile(demoProfile); showApp(); toast("Preview mode. Connect Firebase to enable real accounts."); });

$("registerForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const password=$("regPassword").value, confirm=$("regConfirm").value;
  if(password!==confirm) return toast("Passwords do not match.");
  const email=$("regEmail").value.trim();
  const profile={
    employeeId:$("regEmployeeId").value.trim(), fullName:$("regFullName").value.trim(), unit:$("regUnit").value,
    position:$("regPosition").value.trim(), email, contact:$("regContact").value.trim(), username:$("regUsername").value.trim(),
    role:"employee", status:"pending", createdAt:Date.now()
  };
  if(!isFirebaseConfigured){ toast("Demo mode only. Configure Firebase to submit real registrations."); return; }
  try{
    const cred=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(cred.user,{displayName:profile.fullName});
    await setDoc(doc(db,"users",cred.user.uid),profile);
    await signOut(auth);
    $("registerForm").reset(); $("registerPanel").classList.add("hidden"); $("loginPanel").classList.remove("hidden");
    toast("Registration submitted. Wait for administrator approval.");
  }catch(e){toast(friendlyAuthError(e));}
});

$("logoutBtn").addEventListener("click",async()=>{ if(auth && !state.demo) await signOut(auth); state.user=null; state.profile=null; state.demo=false; showAuth(); toast("Signed out."); });

function avatar(name){ return `<span class="avatar avatar-sm">${initials(name)}</span>`; }
function postCard({name,unit,time,body,image=false,likes=126,comments=12,shares=8}){
  return `<article class="post"><div class="post-head"><div class="post-author">${avatar(name)}<div><div class="post-name">${name}</div><div class="post-meta">${unit} • ${time}</div></div></div><button class="link-btn">•••</button></div><div class="post-body">${body}</div>${image?`<div class="post-image">HEALTHY PEOPLE<br/>STRONGER COMMUNITIES<br/><small>A GREATER ANTIPOLO</small></div>`:""}<div class="post-stats"><span>👍 ${likes} reactions</span><span>${comments} comments • ${shares} shares</span></div><div class="post-buttons"><button>👍 Like</button><button>💬 Comment</button><button>↗ Share</button></div></article>`;
}

function homePage(){
  const p=state.profile||demoProfile;
  const first=(p.fullName||"Employee").split(' ')[0];
  return `<div class="page-head"><div><h1>Good morning, ${first} 👋</h1><p>Your private employee community at City Health Office of Antipolo.</p></div></div>
  <div class="composer"><div class="composer-top">${p.fullName?avatar(p.fullName):'<span class="avatar avatar-sm">AC</span>'}<button class="open-composer" id="openComposer">What's on your mind, ${first}?</button></div><div class="composer-actions"><button class="chip-btn" id="photoPost">📷 Photo / Video</button><button class="chip-btn" id="tagPost">👤 Tag People</button><button class="chip-btn" id="feelPost">🙂 Feeling / Activity</button></div></div>
  <div class="feed-empty">📰<h3>No posts yet</h3><p>Your CHO community feed is ready. Be the first to share an update, announcement, or team activity.</p></div>`;
}

function rightRail(){
  return `<div class="rail-card"><div class="rail-head"><strong>Announcements</strong></div><div class="feed-empty compact">📢<h3>No announcements yet</h3><p>Official CHO updates will appear here.</p></div></div>
  <div class="rail-card"><div class="rail-head"><strong>Upcoming Events</strong></div><div class="feed-empty compact">📅<h3>No upcoming events</h3><p>Events will appear here once published.</p></div></div>`;
}

function profilePage(){
  const p=state.profile||demoProfile;
  return `<div class="profile-cover"></div><div class="profile-main"><div class="avatar avatar-lg">${p.fullName?initials(p.fullName):'AC'}</div><div class="profile-name">${p.fullName||'Employee Profile'}</div><div class="muted">${p.position||'Position not set'}${p.unit?` • ${p.unit}`:''}</div><div class="profile-stats"><div><strong>0</strong><small>Posts</small></div><div><strong>0</strong><small>Connections</small></div><div><strong>0</strong><small>Groups</small></div></div></div><div style="height:16px"></div><section class="post"><h3>About</h3><p class="muted">Employee ID: ${p.employeeId||'—'}<br/>Email: ${p.email||'—'}<br/>Username: ${p.username||'—'}<br/>Account status: <b>${p.status||'—'}</b></p></section>`;
}

async function directoryPage(){
  if(!db || state.demo){ return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div></div><div class="feed-empty">👥<h3>No employee directory data yet</h3><p>Approved employee profiles will appear here when they are registered in Firebase.</p></div>`; }
  try {
    const snap=await getDocs(query(collection(db,'users')));
    const users=snap.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.status==='approved');
    if(!users.length) return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div></div><div class="feed-empty">👥<h3>No approved employees yet</h3><p>The directory will populate as registrations are approved.</p></div>`;
    return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div></div><div class="directory-grid">${users.map(x=>`<div class="directory-card">${avatar(x.fullName||'Employee')}<div class="grow"><strong>${x.fullName||'—'}</strong><p>${x.position||'—'}</p><span class="tag">${x.unit||'—'}</span></div></div>`).join('')}</div>`;
  } catch(e){ return `<div class="feed-empty">⚠️<h3>Unable to load directory</h3><p>${e.message||'Please check your Firestore rules.'}</p></div>`; }
}
function announcementsPage(){ return `<div class="page-head"><div><h1>Announcements</h1><p>Official updates for CHO employees.</p></div></div><div class="feed-empty">📢<h3>No announcements yet</h3><p>Official updates published by administrators will appear here.</p></div>`; }

async function adminPage(){
  if(!state.isAdmin)return `<div class="feed-empty"><h3>Admin access only</h3></div>`;
  let data;
  try { data=await loadAdminData(); }
  catch(e){ return `<div class="feed-empty"><h3>Unable to load admin data</h3><p class="muted">${e.message||'Please check your Firestore rules.'}</p></div>`; }
  const rows=data.users.slice(0,10).map(x=>{
    const safeUid=x.uid||'';
    const action=x.status==='pending'
      ? `<button class="chip-btn approve-user" data-uid="${safeUid}">Approve</button> <button class="chip-btn reject-user" data-uid="${safeUid}">Reject</button>`
      : `<span class="muted">${x.status==='approved'?'Active':'—'}</span>`;
    return `<tr><td>${x.fullName||'—'}</td><td>${x.unit||'—'}</td><td>${x.position||'—'}</td><td><span class="status ${x.status||'pending'}">${x.status||'pending'}</span></td><td>${action}</td></tr>`;
  }).join('');
  return `<div class="page-head"><div><h1>Admin Dashboard</h1><p>Manage Antipolo Connect employee access and content.</p></div><span class="tag">ADMIN</span></div>
  <div class="admin-stats"><div class="admin-stat"><small>Total users</small><b>${data.total}</b></div><div class="admin-stat"><small>Pending approvals</small><b>${data.pending}</b></div><div class="admin-stat"><small>Total posts</small><b>—</b></div><div class="admin-stat"><small>Upcoming events</small><b>—</b></div></div>
  <div class="admin-card"><div style="padding:16px 16px 0"><h3>Recent Registrations</h3><p class="muted" style="font-size:11px">Approve employees only after verifying official staff information.</p></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Unit</th><th>Position</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">No employee registrations yet.</td></tr>'}</tbody></table></div></div>`;
}
function notificationsPage(){ return `<div class="page-head"><div><h1>Notifications</h1><p>Your recent account and community alerts.</p></div></div><div class="feed-empty">🔔<h3>No notifications yet</h3><p>New account activity and community alerts will appear here.</p></div>`; }

function openComposer(){
  showModal(`<h2>Create a post</h2><label>What's on your mind?<textarea id="postText" placeholder="Share an update with the CHO community..."></textarea></label><div class="modal-actions"><button class="secondary-btn" id="cancelModal">Cancel</button><button class="primary-btn" id="publishDemo" style="width:auto">Publish Post</button></div>`);
  $("cancelModal").onclick=closeModal;
  $("publishDemo").onclick=()=>{ if(!$("postText").value.trim())return toast('Write something first.'); closeModal(); toast('Post published in demo mode.'); };
}
function showModal(html){$("modalContent").innerHTML=html;$("modal").classList.remove('hidden');}
function closeModal(){$("modal").classList.add('hidden');}
$("modalClose").addEventListener('click',closeModal); $("modal").addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();});

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-page]'); if(b){state.currentPage=b.dataset.page;renderPage();}
  if(e.target.id==='mobileCreate')openComposer();
  if(e.target.id==='profileBtn') {state.currentPage='profile';renderPage();}
  if(e.target.id==='notifBtn') {state.currentPage='notifications';renderPage();}
  if(e.target.id==='messageBtn') {state.currentPage='messages';renderPage();}
});

if(auth){
  onAuthStateChanged(auth, async user=>{
    if(!user){showAuth();return;}
    try{
      const snap=await getDoc(doc(db,'users',user.uid));
      if(!snap.exists()){ await signOut(auth); return; }
      const p=snap.data(); if(p.status!=='approved'){ await signOut(auth); toast('Your account is still pending approval.'); return; }
      state.user=user;state.demo=false;state.isAdmin=p.role==='admin';setProfile(p);showApp();
    }catch(e){toast('Could not load your profile.');}
  });
}else{
  showAuth();
}
