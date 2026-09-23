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

const demoProfile = { uid:"demo", employeeId:"CHO-0001", fullName:"Erwin R. Alincastre", username:"erwin", email:"demo@antipolo.gov.ph", unit:"ICT / Health Information Systems", position:"System User", role:"admin", status:"approved" };
const demoUsers = [
  {fullName:"Ma. Cristina Reyes", unit:"Nursing Division", position:"Nurse I", status:"approved"},
  {fullName:"Jomar Dela Cruz", unit:"Sanitation Unit", position:"Sanitary Inspector", status:"approved"},
  {fullName:"Ana Cruz", unit:"Health Education", position:"Health Officer", status:"approved"},
  {fullName:"Mark Dela Peña", unit:"Administrative Unit", position:"Administrative Aide", status:"pending"},
  {fullName:"Lisa Manuel", unit:"Patient Navigation & Referral Unit", position:"Nurse", status:"approved"},
  {fullName:"Carlo Mendoza", unit:"Nutrition Unit", position:"Nutritionist", status:"approved"}
];

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
  return `<div class="page-head"><div><h1>Good morning, ${p.fullName.split(' ')[0]} 👋</h1><p>Your employee community at City Health Office of Antipolo.</p></div></div>
  <div class="composer"><div class="composer-top">${avatar(p.fullName)}<button class="open-composer" id="openComposer">What's on your mind, ${p.fullName.split(' ')[0]}?</button></div><div class="composer-actions"><button class="chip-btn" id="photoPost">📷 Photo / Video</button><button class="chip-btn" id="tagPost">👤 Tag People</button><button class="chip-btn" id="feelPost">🙂 Feeling / Activity</button></div></div>
  ${postCard({name:"Antipolo City Health Office",unit:"Official Announcement",time:"2 hours ago",body:"Together we build a healthier Antipolo! Salamat sa lahat ng CHO employees para sa inyong patuloy na dedikasyon at serbisyo para sa bawat mamamayan.",image:true})}
  ${postCard({name:"Lisa Manuel",unit:"PNRU • Nurse",time:"Yesterday",body:"Teamwork makes the dream work ❤️ Thank you to everyone who helped our referral desk today. #CHOConnect",likes:72,comments:8,shares:3})}`;
}

function rightRail(){
  return `<div class="rail-card"><div class="rail-head"><strong>Upcoming Events</strong><button>View all</button></div>
    <div class="list-row"><div class="date-box">SEP<br>25</div><div class="grow"><strong>Monthly Meeting</strong><small>CHO Conference Room • 10:00 AM</small></div></div>
    <div class="list-row"><div class="date-box">SEP<br>28</div><div class="grow"><strong>Medical Mission</strong><small>Brgy. San Luis • 8:00 AM</small></div></div>
    <div class="list-row"><div class="date-box">OCT<br>02</div><div class="grow"><strong>World Rabies Day</strong><small>Antipolo Sports Center</small></div></div>
  </div>
  <div class="rail-card"><div class="rail-head"><strong>Announcements</strong><button>View all</button></div>
    <div class="list-row"><div class="date-box">📢</div><div class="grow"><strong>Updated Office Memorandum</strong><small>New schedule and reminders</small></div></div>
    <div class="list-row"><div class="date-box">💚</div><div class="grow"><strong>Flu Vaccination Drive</strong><small>Open to all CHO employees</small></div></div>
    <div class="list-row"><div class="date-box">🔒</div><div class="grow"><strong>System Maintenance</strong><small>Antipolo Connect updates</small></div></div>
  </div>
  <div class="rail-card"><div class="rail-head"><strong>Today's Birthdays 🎂</strong><button>View all</button></div>
    ${demoUsers.slice(0,2).map(x=>`<div class="list-row">${avatar(x.fullName)}<div class="grow"><strong>${x.fullName}</strong><small>${x.unit} • Today</small></div></div>`).join('')}
  </div>`;
}

function profilePage(){
  const p=state.profile||demoProfile;
  return `<div class="profile-cover"></div><div class="profile-main"><div class="avatar avatar-lg">${initials(p.fullName)}</div><div class="profile-name">${p.fullName}</div><div class="muted">${p.position} • ${p.unit}</div><div class="profile-stats"><div><strong>24</strong><small>Posts</small></div><div><strong>118</strong><small>Connections</small></div><div><strong>9</strong><small>Groups</small></div></div></div><div style="height:16px"></div><section class="post"><h3>About</h3><p class="muted">Employee ID: ${p.employeeId}<br/>Email: ${p.email}<br/>Username: ${p.username||'—'}<br/>Account status: <b>${p.status}</b></p></section>`;
}

function directoryPage(){
  return `<div class="page-head"><div><h1>Employee Directory</h1><p>Find your City Health Office colleagues.</p></div><button class="primary-btn" style="width:auto" id="inviteBtn">+ Invite</button></div><div class="directory-grid">${demoUsers.map(x=>`<div class="directory-card">${avatar(x.fullName)}<div class="grow"><strong>${x.fullName}</strong><p>${x.position}</p><span class="tag">${x.unit}</span></div></div>`).join('')}</div>`;
}
function announcementsPage(){ return `<div class="page-head"><div><h1>Announcements</h1><p>Official updates for CHO employees.</p></div></div>${["Updated Office Memorandum","Flu Vaccination Drive","Monthly Staff Meeting","System Maintenance Notice"].map((x,i)=>`<div class="announcement-card"><span class="tag">${i===0?'OFFICIAL':'UPDATE'}</span><h3>${x}</h3><p>${['Please be guided by the new schedule and reminders for all units.','Open vaccination schedule for CHO employees.','Monthly coordination meeting and unit reports.','Planned maintenance window for Antipolo Connect.'][i]}</p><small class="muted">Posted Sep ${20-i}, 2026</small></div>`).join('')}`; }
function eventsPage(){ return `<div class="page-head"><div><h1>Events</h1><p>Upcoming activities and office milestones.</p></div></div><div class="event-grid">${[['25','SEP','Monthly Meeting','CHO Conference Room • 10:00 AM'],['28','SEP','Medical Mission','Brgy. San Luis • 8:00 AM'],['02','OCT','World Rabies Day','Antipolo Sports Center'],['15','OCT','Employee Wellness Day','CHO Grounds']].map(x=>`<div class="event-card"><div class="event-day"><b>${x[0]}</b>${x[1]}</div><div><h3>${x[2]}</h3><p>${x[3]}</p><button class="link-btn">View details</button></div></div>`).join('')}</div>`; }
function groupsPage(){ return `<div class="page-head"><div><h1>Groups / Units</h1><p>Private spaces for teams and divisions.</p></div></div>${['Nursing Division','Patient Navigation & Referral Unit','Sanitation Unit','Administrative Unit','Health Education'].map((x,i)=>`<div class="settings-row"><div><strong>${x}</strong><p>${20+i*7} members • ${i+2} recent posts</p></div><button class="chip-btn">Open</button></div>`).join('')}`; }
function messagesPage(){ return `<div class="page-head"><div><h1>Messages</h1><p>Private employee conversations will be enabled in the next module.</p></div></div><div class="feed-empty">💬<h3>Messaging module ready for Phase 2</h3><p>We can add one-to-one and group messaging after the core employee approval and feed system is stable.</p></div>`; }
function savedPage(){ return `<div class="page-head"><div><h1>Saved</h1><p>Your saved posts and documents.</p></div></div><div class="feed-empty">🔖<h3>No saved items yet</h3><p>Saved posts will appear here.</p></div>`; }
function settingsPage(){ return `<div class="page-head"><div><h1>Settings</h1><p>Manage your account preferences.</p></div></div><div class="settings-row"><div><strong>Push notifications</strong><p>Receive alerts for announcements and mentions.</p></div><button class="switch on"></button></div><div class="settings-row"><div><strong>Compact mode</strong><p>Show a denser feed on smaller screens.</p></div><button class="switch"></button></div><div class="settings-row"><div><strong>Change password</strong><p>Use Firebase password reset for your account.</p></div><button class="chip-btn" id="changePassBtn">Manage</button></div>`; }
async function loadAdminData(){
  if(!state.isAdmin) return {users:[], total:0, pending:0};
  if(state.demo) return {users:demoUsers.slice(), total:demoUsers.length, pending:demoUsers.filter(x=>x.status==='pending').length};
  const snap=await getDocs(collection(db,"users"));
  const users=snap.docs.map(d=>({uid:d.id,...d.data()}));
  users.sort((a,b)=>{
    const aT=typeof a.createdAt==='number'?a.createdAt:0;
    const bT=typeof b.createdAt==='number'?b.createdAt:0;
    return bT-aT;
  });
  return {users, total:users.length, pending:users.filter(x=>x.status==='pending').length};
}

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
function notificationsPage(){ return `<div class="page-head"><div><h1>Notifications</h1><p>Your recent account and community alerts.</p></div></div>${['Antipolo City Health Office mentioned you in an announcement.','New event added: Medical Mission — Sep 28.','Lisa Manuel reacted to your post.'].map((x,i)=>`<div class="settings-row"><div><strong>${x}</strong><p>${i+1} hour${i?'s':''} ago</p></div><span class="tag">NEW</span></div>`).join('')}`; }

async function renderPage(){
  const page=state.currentPage;
  const pages={home:homePage,profile:profilePage,directory:directoryPage,announcements:announcementsPage,events:eventsPage,groups:groupsPage,messages:messagesPage,saved:savedPage,settings:settingsPage,admin:adminPage,notifications:notificationsPage};
  const fn=pages[page]||homePage;
  $("pageContent").innerHTML=await fn();
  $("rightRail").innerHTML=page==='home'?rightRail():'';
  $$('.admin-only').forEach(btn=>btn.classList.toggle('hidden',!state.isAdmin));
  $$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  $$('.mobile-nav button[data-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  const composer=$("openComposer"); if(composer) composer.addEventListener('click',openComposer);
  const photo=$("photoPost"); if(photo) photo.addEventListener('click',openComposer);
  const tag=$("tagPost"); if(tag) tag.addEventListener('click',openComposer);
  const feel=$("feelPost"); if(feel) feel.addEventListener('click',openComposer);
  const change=$("changePassBtn"); if(change) change.addEventListener('click',()=>toast('Use Forgot Password from the login screen for now.'));
  $$('.approve-demo').forEach(b=>b.addEventListener('click',()=>{b.parentElement.innerHTML='<span class="status approved">approved</span>';toast('Demo employee approved.');}));
  $$('.approve-user').forEach(b=>b.addEventListener('click', async ()=>{
    const uid=b.dataset.uid;
    if(!uid || !db || state.demo) return;
    b.disabled=true;
    try{
      await updateDoc(doc(db,'users',uid),{status:'approved',approvedAt:Date.now(),approvedBy:state.user?.uid||null});
      toast('Employee approved successfully.');
      await renderPage();
    }catch(e){ b.disabled=false; toast(`Approval failed: ${e.message||'Unknown error'}`); }
  }));
  $$('.reject-user').forEach(b=>b.addEventListener('click', async ()=>{
    const uid=b.dataset.uid;
    if(!uid || !db || state.demo) return;
    if(!confirm('Reject this employee registration?')) return;
    b.disabled=true;
    try{
      await updateDoc(doc(db,'users',uid),{status:'rejected',rejectedAt:Date.now(),rejectedBy:state.user?.uid||null});
      toast('Registration rejected.');
      await renderPage();
    }catch(e){ b.disabled=false; toast(`Rejection failed: ${e.message||'Unknown error'}`); }
  }));
}

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
