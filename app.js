import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase.js";

const state = { user:null, profile:null, isAdmin:false, currentPage:"home" };
let app, auth, db;
if (isFirebaseConfigured) { app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); }

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function toast(message){ const el=$("toast"); if(!el) return; el.textContent=message; el.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),3200); }
function initials(name="User"){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "U"; }
function showAuth(){ $("authView").classList.remove("hidden"); $("appView").classList.add("hidden"); }
async function showApp(){ $("authView").classList.add("hidden"); $("appView").classList.remove("hidden"); updateHeaderIdentity(); await renderPage(); }
function setProfile(p){ state.profile=p; updateHeaderIdentity(); }
function updateHeaderIdentity(){
  const p=state.profile;
  const btn=$("profileBtn");
  if(btn){ const a=btn.querySelector(".avatar"); if(a) a.textContent=initials(p?.fullName||"User"); }
}
function friendlyAuthError(error){
  const map={"auth/invalid-credential":"Incorrect email or password.","auth/invalid-email":"Please enter a valid email address.","auth/email-already-in-use":"That email address is already registered.","auth/weak-password":"Use a stronger password (at least 6 characters).","auth/too-many-requests":"Too many attempts. Please try again later."};
  return map[error.code] || error.message || "Something went wrong.";
}

$("showRegister").addEventListener("click",()=>{ $("loginPanel").classList.add("hidden"); $("registerPanel").classList.remove("hidden"); });
$("showLogin").addEventListener("click",()=>{ $("registerPanel").classList.add("hidden"); $("loginPanel").classList.remove("hidden"); });
$$('.eye').forEach(btn=>btn.addEventListener('click',()=>{const el=$(btn.dataset.target); el.type=el.type==='password'?'text':'password';}));

$("forgotBtn").addEventListener("click",async()=>{
  const email=$("loginEmail").value.trim();
  if(!email) return toast("Enter your email first.");
  if(!isFirebaseConfigured) return toast("Firebase is not configured.");
  try{ await sendPasswordResetEmail(auth,email); toast("Password reset email sent."); }catch(e){ toast(friendlyAuthError(e)); }
});

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isFirebaseConfigured) return toast("Firebase is not configured.");
  const email=$("loginEmail").value.trim(), pass=$("loginPassword").value;
  try{
    const cred=await signInWithEmailAndPassword(auth,email,pass);
    const snap=await getDoc(doc(db,"users",cred.user.uid));
    if(!snap.exists()){ await signOut(auth); return toast("Your employee profile is missing. Contact the administrator."); }
    const p=snap.data();
    if(p.status!=="approved"){ await signOut(auth); return toast(`Account status: ${p.status || "pending"}. Please wait for admin approval.`); }
    state.user=cred.user; state.isAdmin=p.role==="admin"; setProfile(p); await showApp();
  }catch(e){ toast(friendlyAuthError(e)); }
});

$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isFirebaseConfigured) return toast("Firebase is not configured.");
  const password=$("regPassword").value, confirm=$("regConfirm").value;
  if(password!==confirm) return toast("Passwords do not match.");
  const profile={employeeId:$("regEmployeeId").value.trim(),fullName:$("regFullName").value.trim(),unit:$("regUnit").value,position:$("regPosition").value.trim(),email:$("regEmail").value.trim(),contact:$("regContact").value.trim(),username:$("regUsername").value.trim(),role:"employee",status:"pending",createdAt:Date.now()};
  try{
    const cred=await createUserWithEmailAndPassword(auth,profile.email,password);
    await updateProfile(cred.user,{displayName:profile.fullName});
    await setDoc(doc(db,"users",cred.user.uid),profile);
    await signOut(auth);
    $("registerForm").reset(); $("registerPanel").classList.add("hidden"); $("loginPanel").classList.remove("hidden");
    toast("Registration submitted. Wait for administrator approval.");
  }catch(e){ toast(friendlyAuthError(e)); }
});

$("logoutBtn").addEventListener("click",async()=>{ if(auth) await signOut(auth); state.user=null; state.profile=null; state.isAdmin=false; showAuth(); toast("Signed out."); });

function avatar(name){ return `<span class="avatar avatar-sm">${initials(name)}</span>`; }

function homePage(){
  const p=state.profile||{}; const first=(p.fullName||"Employee").split(/\s+/)[0];
  return `<div class="page-head"><div><h1>Good morning, ${first} 👋</h1><p>Your private employee community at City Health Office of Antipolo.</p></div></div>
  <div class="composer"><div class="composer-top">${avatar(p.fullName||"Employee")}<button class="open-composer" id="openComposer">What's on your mind, ${first}?</button></div><div class="composer-actions"><button class="chip-btn" id="photoPost">📷 Photo / Video</button><button class="chip-btn" id="tagPost">👤 Tag People</button><button class="chip-btn" id="feelPost">🙂 Feeling / Activity</button></div></div>
  <div class="feed-empty"><div style="font-size:28px">📰</div><h3>No posts yet</h3><p>The community feed is empty. Posts will appear here after employees publish them.</p></div>`;
}

function rightRail(){
  return `<div class="rail-card"><div class="rail-head"><strong>Announcements</strong></div><div class="feed-empty compact"><div style="font-size:22px">📢</div><h3>No announcements yet</h3><p>Official announcements will appear here once published.</p></div></div>
  <div class="rail-card"><div class="rail-head"><strong>Upcoming Events</strong></div><div class="feed-empty compact"><div style="font-size:22px">📅</div><h3>No upcoming events</h3><p>Events will appear here once published.</p></div></div>`;
}

function profilePage(){
  const p=state.profile||{};
  return `<div class="profile-cover"></div><div class="profile-main"><div class="avatar avatar-lg">${initials(p.fullName||"Employee")}</div><div class="profile-name">${p.fullName||"Employee Profile"}</div><div class="muted">${p.position||"Position not set"}${p.unit?` • ${p.unit}`:""}</div><div class="profile-stats"><div><strong>0</strong><small>Posts</small></div><div><strong>0</strong><small>Connections</small></div><div><strong>0</strong><small>Groups</small></div></div></div><div style="height:16px"></div><section class="post"><h3>About</h3><p class="muted">Employee ID: ${p.employeeId||"—"}<br/>Email: ${p.email||"—"}<br/>Username: ${p.username||"—"}<br/>Account status: <b>${p.status||"—"}</b></p></section>`;
}

async function directoryPage(){
  if(!db) return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div></div><div class="feed-empty">👥<h3>Firebase is not configured</h3><p>Connect the app to Firebase to load approved employees.</p></div>`;
  try{
    const snap=await getDocs(collection(db,"users"));
    const users=snap.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.status==="approved");
    if(!users.length) return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div></div><div class="feed-empty">👥<h3>No approved employees yet</h3><p>The directory will populate as registrations are approved.</p></div>`;
    return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div></div><div class="directory-grid">${users.map(x=>`<div class="directory-card">${avatar(x.fullName||"Employee")}<div class="grow"><strong>${x.fullName||"—"}</strong><p>${x.position||"—"}</p><span class="tag">${x.unit||"—"}</span></div></div>`).join("")}</div>`;
  }catch(e){ return `<div class="feed-empty">⚠️<h3>Unable to load directory</h3><p>${e.message||"Please check your Firestore rules."}</p></div>`; }
}
function announcementsPage(){ return `<div class="page-head"><div><h1>Announcements</h1><p>Official updates for CHO employees.</p></div></div><div class="feed-empty">📢<h3>No announcements yet</h3><p>There are no published announcements yet.</p></div>`; }
function eventsPage(){ return `<div class="page-head"><div><h1>Events</h1><p>Upcoming activities and office milestones.</p></div></div><div class="feed-empty">📅<h3>No events yet</h3><p>Published office events will appear here.</p></div>`; }
function groupsPage(){ return `<div class="page-head"><div><h1>Groups / Units</h1><p>Private spaces for teams and divisions.</p></div></div><div class="feed-empty">▦<h3>No groups yet</h3><p>Groups and unit spaces will appear here when configured.</p></div>`; }
function messagesPage(){ return `<div class="page-head"><div><h1>Messages</h1><p>Private employee conversations.</p></div></div><div class="feed-empty">💬<h3>No messages yet</h3><p>Your conversations will appear here.</p></div>`; }
function savedPage(){ return `<div class="page-head"><div><h1>Saved</h1><p>Your saved posts and documents.</p></div></div><div class="feed-empty">🔖<h3>No saved items yet</h3><p>Saved posts and documents will appear here.</p></div>`; }
function settingsPage(){ return `<div class="page-head"><div><h1>Settings</h1><p>Manage your account preferences.</p></div></div><div class="settings-row"><div><strong>Push notifications</strong><p>Receive alerts for announcements and mentions.</p></div><button class="switch on"></button></div><div class="settings-row"><div><strong>Compact mode</strong><p>Show a denser feed on smaller screens.</p></div><button class="switch"></button></div><div class="settings-row"><div><strong>Change password</strong><p>Use Firebase password reset for your account.</p></div><button class="chip-btn" id="changePassBtn">Manage</button></div>`; }
function notificationsPage(){ return `<div class="page-head"><div><h1>Notifications</h1><p>Your account and community alerts.</p></div></div><div class="feed-empty">🔔<h3>No notifications yet</h3><p>New alerts will appear here.</p></div>`; }

async function loadAdminData(){
  if(!state.isAdmin || !db) return {users:[],total:0,pending:0};
  const snap=await getDocs(collection(db,"users"));
  const users=snap.docs.map(d=>({uid:d.id,...d.data()}));
  users.sort((a,b)=>(typeof b.createdAt==="number"?b.createdAt:0)-(typeof a.createdAt==="number"?a.createdAt:0));
  return {users,total:users.length,pending:users.filter(x=>x.status==="pending").length};
}

async function adminPage(){
  if(!state.isAdmin) return `<div class="feed-empty"><h3>Admin access only</h3></div>`;
  try{
    const data=await loadAdminData();
    const rows=data.users.slice(0,10).map(x=>{
      const action=x.status==="pending"?`<button class="chip-btn approve-user" data-uid="${x.uid}">Approve</button> <button class="chip-btn reject-user" data-uid="${x.uid}">Reject</button>`:`<span class="muted">${x.status==="approved"?"Active":"—"}</span>`;
      return `<tr><td>${x.fullName||"—"}</td><td>${x.unit||"—"}</td><td>${x.position||"—"}</td><td><span class="status ${x.status||"pending"}">${x.status||"pending"}</span></td><td>${action}</td></tr>`;
    }).join("");
    return `<div class="page-head"><div><h1>Admin Dashboard</h1><p>Manage Antipolo Connect employee access and content.</p></div><span class="tag">ADMIN</span></div>
    <div class="admin-stats"><div class="admin-stat"><small>Total users</small><b>${data.total}</b></div><div class="admin-stat"><small>Pending approvals</small><b>${data.pending}</b></div><div class="admin-stat"><small>Total posts</small><b>—</b></div><div class="admin-stat"><small>Upcoming events</small><b>—</b></div></div>
    <div class="admin-card"><div style="padding:16px 16px 0"><h3>Recent Registrations</h3><p class="muted" style="font-size:11px">Approve employees only after verifying official staff information.</p></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Unit</th><th>Position</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">No employee registrations yet.</td></tr>'}</tbody></table></div></div>`;
  }catch(e){ return `<div class="feed-empty"><h3>Unable to load admin data</h3><p class="muted">${e.message||"Please check your Firestore rules."}</p></div>`; }
}

function showModal(html){ $("modalContent").innerHTML=html; $("modal").classList.remove("hidden"); }
function closeModal(){ $("modal").classList.add("hidden"); }
function openComposer(){
  showModal(`<h2>Create a post</h2><label>What's on your mind?<textarea id="postText" placeholder="Share an update with the CHO community..."></textarea></label><div class="modal-actions"><button class="secondary-btn" id="cancelModal">Cancel</button><button class="primary-btn" id="publishPost" style="width:auto">Post</button></div>`);
  $("cancelModal").onclick=closeModal;
  $("publishPost").onclick=()=>{ if(!$("postText").value.trim()) return toast("Write something first."); closeModal(); toast("Post publishing will be connected in the next module."); };
}
$("modalClose").addEventListener("click",closeModal); $("modal").addEventListener("click",e=>{if(e.target.classList.contains("modal-backdrop")) closeModal();});

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-page]"); if(b){state.currentPage=b.dataset.page;renderPage();}
  if(e.target.id==="mobileCreate") openComposer();
  if(e.target.id==="profileBtn"){state.currentPage="profile";renderPage();}
  if(e.target.id==="notifBtn"){state.currentPage="notifications";renderPage();}
  if(e.target.id==="messageBtn"){state.currentPage="messages";renderPage();}
});

async function renderPage(){
  const pages={home:homePage,profile:profilePage,directory:directoryPage,announcements:announcementsPage,events:eventsPage,groups:groupsPage,messages:messagesPage,saved:savedPage,settings:settingsPage,admin:adminPage,notifications:notificationsPage};
  const fn=pages[state.currentPage]||homePage;
  $("pageContent").innerHTML=await fn();
  $("rightRail").innerHTML=state.currentPage==="home"?rightRail():"";
  $$('.admin-only').forEach(btn=>btn.classList.toggle("hidden",!state.isAdmin));
  $$('.nav-item').forEach(btn=>btn.classList.toggle("active",btn.dataset.page===state.currentPage));
  $$('.mobile-nav button[data-page]').forEach(btn=>btn.classList.toggle("active",btn.dataset.page===state.currentPage));
  const composer=$("openComposer"); if(composer) composer.addEventListener("click",openComposer);
  const photo=$("photoPost"); if(photo) photo.addEventListener("click",openComposer);
  const tag=$("tagPost"); if(tag) tag.addEventListener("click",openComposer);
  const feel=$("feelPost"); if(feel) feel.addEventListener("click",openComposer);
  const change=$("changePassBtn"); if(change) change.addEventListener("click",async()=>{
    if(!state.profile?.email) return toast("No account email is available.");
    try{ await sendPasswordResetEmail(auth,state.profile.email); toast("Password reset email sent."); }catch(e){toast(friendlyAuthError(e));}
  });
  $$('.approve-user').forEach(b=>b.addEventListener('click',async()=>{
    const uid=b.dataset.uid; if(!uid||!db) return; b.disabled=true;
    try{ await updateDoc(doc(db,"users",uid),{status:"approved",approvedAt:Date.now(),approvedBy:state.user?.uid||null}); toast("Employee approved successfully."); await renderPage(); }
    catch(e){ b.disabled=false; toast(`Approval failed: ${e.message||"Unknown error"}`); }
  }));
  $$('.reject-user').forEach(b=>b.addEventListener('click',async()=>{
    const uid=b.dataset.uid; if(!uid||!db) return; if(!confirm("Reject this employee registration?")) return; b.disabled=true;
    try{ await updateDoc(doc(db,"users",uid),{status:"rejected",rejectedAt:Date.now(),rejectedBy:state.user?.uid||null}); toast("Registration rejected."); await renderPage(); }
    catch(e){ b.disabled=false; toast(`Rejection failed: ${e.message||"Unknown error"}`); }
  }));
}

if(auth){
  onAuthStateChanged(auth,async user=>{
    if(!user){state.user=null;state.profile=null;state.isAdmin=false;showAuth();return;}
    try{
      const snap=await getDoc(doc(db,"users",user.uid));
      if(!snap.exists()){await signOut(auth);return;}
      const p=snap.data();
      if(p.status!=="approved"){await signOut(auth);toast("Your account is still pending approval.");return;}
      state.user=user; state.isAdmin=p.role==="admin"; setProfile(p); await showApp();
    }catch(e){toast("Could not load your profile.");}
  });
}else{showAuth();}
