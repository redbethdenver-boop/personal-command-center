const DB_NAME="PersonalCommandCenterDB";const DB_VERSION=1;let db;let currentModule=null;
const modules=[{key:"finance",name:"Net Worth",icon:"💰"},{key:"planes",name:"Planes Near Me",icon:"✈️"},{key:"travel",name:"Travel",icon:"🌎"},{key:"houses",name:"Houses",icon:"🏡"},{key:"shopping",name:"Groceries",icon:"🛒"},{key:"recipes",name:"Recipes",icon:"🍳"},{key:"prints",name:"3D Print List",icon:"🖨️"},{key:"shortGoals",name:"Goals",icon:"🎯"},{key:"kondo",name:"Marie Kondo",icon:"🧹"},{key:"projects",name:"Projects",icon:"🔨"},{key:"tasks",name:"Tasks",icon:"✅"}];
const financeAccounts=["TSP","Vanguard","Schwab","Cash & Money Market","Home Equity","Other Assets"];
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains("items")){const s=d.createObjectStore("items",{keyPath:"id",autoIncrement:true});s.createIndex("module","module",{unique:false})}if(!d.objectStoreNames.contains("holdings")){const s=d.createObjectStore("holdings",{keyPath:"id",autoIncrement:true});s.createIndex("account","account",{unique:false})}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function store(name,mode="readonly"){return db.transaction(name,mode).objectStore(name)}function allFrom(name){return new Promise((res,rej)=>{const r=store(name).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}function addTo(name,obj){return new Promise((res,rej)=>{const r=store(name,"readwrite").add(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}function putTo(name,obj){return new Promise((res,rej)=>{const r=store(name,"readwrite").put(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}function delFrom(name,id){return new Promise((res,rej)=>{const r=store(name,"readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n||0))}function todayGreeting(){const h=new Date().getHours();return h<12?"Good morning.":h<17?"Good afternoon.":"Good evening."}
async function refreshDashboard(){
 const items=await allFrom("items"),holdings=await allFrom("holdings"),today=new Date().toISOString().slice(0,10);
 const openTasks=items.filter(i=>i.module==="tasks"&&!i.completed),activeProjects=items.filter(i=>i.module==="projects"&&(i.projectStatus||"Active")!=="Completed").length;
 const trips=items.filter(i=>i.module==="travel"&&(i.returnDate||i.date||"9999")>=today).length,groceries=items.filter(i=>i.module==="shopping"&&!i.completed).length;
 const goals=items.filter(i=>(i.module==="shortGoals"||i.module==="longGoals")&&(i.status||"Active")!=="Completed").length;
 let kd=items.filter(i=>i.module==="kondo"&&i.category!=="__META__");
 if(kd.length&&kd.every(i=>!i.completed)){for(const i of kd.filter(i=>i.title==="Underwear"||i.title==="Shoes")){i.completed=true;i.updatedAt=Date.now();await putTo("items",i)}kd=items.filter(i=>i.module==="kondo"&&i.category!=="__META__")}
 const kp=kd.length?Math.round(kd.filter(i=>i.completed).length/kd.length*100):0;
 const due=openTasks.filter(t=>{let d=t.dueDate||t.date;if(!d)return false;let x=new Date(d+"T00:00:00"),lim=new Date();lim.setDate(lim.getDate()+14);return x<=lim}).slice(0,4);
 dashboardView.innerHTML=`<div class="dash-top-action"><button id="dQuick">＋ Quick Add</button></div><div class="dash-stats"><button data-m="tasks"><b>${openTasks.length}</b><span>Open Tasks</span></button><button data-m="projects"><b>${activeProjects}</b><span>Projects</span></button><button data-m="travel"><b>${trips}</b><span>Trips</span></button><button data-m="shopping"><b>${groceries}</b><span>Groceries</span></button></div>
 ${due.length?`<section class="dash-attn"><h2>Needs Attention</h2>${due.map(t=>`<button data-m="tasks"><span>${escapeHtml(t.title)}</span><small>${(t.dueDate||t.date)<today?"Overdue":"Due "+escapeHtml(t.dueDate||t.date)}</small></button>`).join("")}</section>`:""}
 <h2 class="dash-title">At a Glance</h2><div class="dash-mini"><button data-m="shortGoals">🎯<span><b>${goals} active</b><small>Goals</small></span></button><button data-m="kondo">🧹<span><b>${kp}% complete</b><small>Marie Kondo</small></span></button><button data-m="prints">🖨️<span><b>${items.filter(i=>i.module==="prints"&&!["Printed","Finished","Archived"].includes(i.status)).length} in queue</b><small>3D Prints</small></span></button><button data-m="finance">💰<span><b>View assets</b><small>Net Worth</small></span></button></div>
 <h2 class="dash-title">Everything</h2><div class="dash-all">${modules.map(m=>`<button data-m="${m.key}"><span>${m.icon}</span><b>${m.name}</b></button>`).join("")}</div>`;
 dashboardView.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>openModule(b.dataset.m));document.getElementById("dQuick").onclick=()=>quickAddBtn.click()
}
async function openModule(key){currentModule=key;dashboardView.classList.remove("active");moduleView.classList.add("active");const m=modules.find(x=>x.key===key);moduleEyebrow.textContent=m.name.toUpperCase();moduleTitle.textContent=`${m.icon} ${m.name}`;addItemBtn.style.display=(key==="planes"||key==="houses"||key==="kondo")?"none":"inline-block";await renderModule()}
async function renderModule(){if(currentModule==="finance")return renderFinance(moduleBody);if(currentModule==="planes")return renderPlanes(moduleBody);if(currentModule==="travel")return renderTravel(moduleBody);if(currentModule==="houses")return renderHouses(moduleBody);if(currentModule==="shopping")return renderGroceries(moduleBody);if(currentModule==="recipes")return renderRecipes(moduleBody);if(currentModule==="prints")return renderPrints(moduleBody);if(currentModule==="shortGoals")return renderGoals(moduleBody);if(currentModule==="kondo")return renderKondo(moduleBody);if(currentModule==="projects")return renderProjects(moduleBody);if(currentModule==="tasks")return renderTasks(moduleBody);const items=(await allFrom("items")).filter(i=>i.module===currentModule).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));if(!items.length){moduleBody.innerHTML='<div class="empty">Nothing here yet.</div>';return}moduleBody.innerHTML='<div class="list-stack"></div>';const stack=moduleBody.firstElementChild;items.forEach(i=>{const card=document.createElement("article");card.className="list-card";const pills=[];if(i.status)pills.push(i.status);if(i.priority)pills.push(i.priority);if(i.date)pills.push(i.date);if(i.amount)pills.push(money(i.amount));if(i.store)pills.push(i.store);card.innerHTML=`<div class="list-top"><h3>${escapeHtml(i.title)}</h3>${i.completed?'<span class="pill">Done</span>':''}</div>${i.details?`<p>${escapeHtml(i.details)}</p>`:""}<div class="pills">${pills.map(x=>`<span class="pill">${escapeHtml(String(x))}</span>`).join("")}</div><div class="actions"><button data-edit="${i.id}">Edit</button><button class="danger" data-del="${i.id}">Delete</button></div>`;card.querySelector("[data-edit]").onclick=()=>openItemForm(i);card.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this item?")){await delFrom("items",i.id);await renderModule();await refreshDashboard()}};stack.appendChild(card)})}








async function renderProjects(body){
 const all=await allFrom("items"),ps=all.filter(i=>i.module==="projects"),ts=all.filter(i=>i.module==="tasks"),rank={High:0,Medium:1,Low:2};
 const active=ps.filter(p=>(p.projectStatus||"Active")!=="Completed").sort((a,b)=>(rank[a.priority]??1)-(rank[b.priority]??1)||String(a.targetDate||a.date||"9999").localeCompare(String(b.targetDate||b.date||"9999")));
 const done=ps.filter(p=>(p.projectStatus||"Active")==="Completed");
 body.innerHTML='<div class="note">Projects are the bigger things you are working on. Tasks can be linked to a project or stand alone.</div><div id="pActive"></div><div id="pDone"></div>';
 const card=p=>{const linked=ts.filter(t=>String(t.projectId||"")===String(p.id)),open=linked.filter(t=>!t.completed).length;c=document.createElement("article");c.className="list-card";c.innerHTML=`<div class="list-top"><h3>${escapeHtml(p.title)}</h3><span class="pill">${escapeHtml(p.projectStatus||"Active")}</span></div><div class="pills">${p.priority?`<span class="pill">${escapeHtml(p.priority)}</span>`:""}${(p.targetDate||p.date)?`<span class="pill">Target ${escapeHtml(p.targetDate||p.date)}</span>`:""}<span class="pill">${open} open task${open===1?"":"s"}</span></div>${p.details?`<p>${escapeHtml(p.details)}</p>`:""}<div class="actions"><button data-task>Add Task</button><button data-edit>Edit</button><button class="danger" data-del>Delete</button></div>`;c.querySelector("[data-task]").onclick=async()=>{currentModule="tasks";await openItemForm({projectId:p.id})};c.querySelector("[data-edit]").onclick=()=>openItemForm(p);c.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this project? Linked tasks will remain.")){await delFrom("items",p.id);await renderModule();await refreshDashboard()}};return c};
 const sec=(id,title,arr)=>{const e=document.getElementById(id);e.innerHTML=`<section class="goal-section"><div class="travel-section-head"><h2>${title}</h2><span class="pill">${arr.length}</span></div><div class="list-stack"></div></section>`;const l=e.querySelector(".list-stack");if(!arr.length)l.innerHTML='<div class="empty">Nothing here yet.</div>';arr.forEach(x=>l.appendChild(card(x)))};
 sec("pActive","Active Projects",active);sec("pDone","Completed",done)
}
async function renderTasks(body){
 const all=await allFrom("items"),ts=all.filter(i=>i.module==="tasks"),ps=all.filter(i=>i.module==="projects"),pm=Object.fromEntries(ps.map(p=>[String(p.id),p.title])),rank={High:0,Medium:1,Low:2};
 const open=ts.filter(t=>!t.completed).sort((a,b)=>(rank[a.priority]??1)-(rank[b.priority]??1)||String(a.dueDate||a.date||"9999").localeCompare(String(b.dueDate||b.date||"9999"))),done=ts.filter(t=>t.completed);
 body.innerHTML=`<div class="task-summary"><div><strong>${open.length}</strong><span>Open</span></div><div><strong>${open.filter(t=>t.priority==="High").length}</strong><span>High Priority</span></div><div><strong>${done.length}</strong><span>Completed</span></div></div><div id="tOpen"></div><div id="tDone"></div>`;
 const card=t=>{const c=document.createElement("article");c.className="list-card"+(t.completed?" task-done":"");c.innerHTML=`<div class="list-top"><h3>${escapeHtml(t.title)}</h3><button class="task-check" data-check>${t.completed?"✓":"○"}</button></div><div class="pills">${t.projectId&&pm[String(t.projectId)]?`<span class="pill">📁 ${escapeHtml(pm[String(t.projectId)])}</span>`:""}${t.priority?`<span class="pill">${escapeHtml(t.priority)}</span>`:""}${(t.dueDate||t.date)?`<span class="pill">Due ${escapeHtml(t.dueDate||t.date)}</span>`:""}</div>${t.details?`<p>${escapeHtml(t.details)}</p>`:""}<div class="actions"><button data-edit>Edit</button><button class="danger" data-del>Delete</button></div>`;c.querySelector("[data-check]").onclick=async()=>{t.completed=!t.completed;t.updatedAt=Date.now();await putTo("items",t);await renderModule();await refreshDashboard()};c.querySelector("[data-edit]").onclick=()=>openItemForm(t);c.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this task?")){await delFrom("items",t.id);await renderModule();await refreshDashboard()}};return c};
 const sec=(id,title,arr)=>{const e=document.getElementById(id);e.innerHTML=`<section class="goal-section"><div class="travel-section-head"><h2>${title}</h2><span class="pill">${arr.length}</span></div><div class="list-stack"></div></section>`;const l=e.querySelector(".list-stack");if(!arr.length)l.innerHTML='<div class="empty">Nothing here yet.</div>';arr.forEach(x=>l.appendChild(card(x)))};
 sec("tOpen","Open Tasks",open);sec("tDone","Completed",done)
}

const KONDO_LIST={"CLOTHING": ["Underwear", "Shoes", "Socks & hosiery", "T-shirts", "Tank tops", "Workout clothes", "Pajamas & sleepwear", "Loungewear", "Sweatshirts & hoodies", "Shorts", "Jeans", "Casual pants", "Skirts", "Dresses", "Sweaters", "Blouses & button-down shirts", "Work clothes", "Formal & special-occasion clothes", "Jackets", "Coats", "Hats", "Scarves", "Gloves", "Belts", "Purses & handbags", "Backpacks & totes", "Jewelry", "Watches & accessories"], "BOOKS": ["Fiction", "Nonfiction", "Cookbooks", "Reference books", "Coffee-table books", "Magazines", "Catalogs"], "PAPER": ["Mail", "Bills & statements", "Receipts", "Manuals", "Warranties", "Financial records", "Insurance paperwork", "Tax records", "Important personal documents", "Greeting cards", "Invitations", "Recipes & clippings", "Notebooks & old notes"], "KITCHEN": ["Water bottles", "Travel mugs", "Coffee mugs", "Drinking glasses", "Wine & specialty glasses", "Plates", "Bowls", "Serving dishes", "Silverware", "Cooking utensils", "Knives", "Cutting boards", "Food-storage containers & lids", "Pots & pans", "Baking sheets", "Bakeware", "Mixing bowls", "Measuring cups & spoons", "Small appliances", "Kitchen gadgets", "Grilling & BBQ supplies", "Pantry — canned & packaged foods", "Pantry — baking supplies", "Spices & seasonings", "Oils, vinegars & sauces", "Refrigerator", "Freezer", "Cleaning supplies under sink"], "BATHROOM & PERSONAL CARE": ["Makeup", "Skin-care products", "Hair-care products", "Hair tools", "Dental supplies", "Medicines — check expiration dates", "Vitamins & supplements", "First-aid supplies", "Towels", "Washcloths", "Extra toiletries", "Travel-size toiletries"], "LINENS": ["Sheets", "Pillowcases", "Blankets", "Comforters & quilts", "Pillows", "Extra bedding", "Tablecloths", "Placemats", "Cloth napkins", "Kitchen towels"], "OFFICE": ["Pens & pencils", "Markers & highlighters", "Notebooks", "Office supplies", "Desk drawers", "Printer supplies", "Computer accessories", "Chargers", "Cables & cords", "Old phones & tablets", "Old computers", "Other outdated electronics"], "HOBBIES & PROJECT SUPPLIES": ["Craft supplies", "Art supplies", "Sewing supplies", "3D-printing supplies", "Project leftovers & scraps", "Unfinished projects", "Specialty cooking equipment", "Party & entertaining supplies"], "GARAGE / BASEMENT / STORAGE": ["Hand tools", "Power tools", "Hardware — screws, nails, bolts, etc.", "Extension cords", "Gardening tools", "Gardening supplies", "Pots & planters", "Lawn supplies", "Paint", "Household chemicals", "Car-care supplies", "Sports equipment", "Camping gear", "Coolers", "Outdoor furniture accessories", "Luggage", "Empty boxes & packaging", "Miscellaneous storage bins"], "HOLIDAY & SEASONAL": ["Christmas decorations", "Other holiday decorations", "Outdoor decorations", "Holiday lights", "Gift wrap", "Gift bags", "Ribbons & bows", "Seasonal serving pieces", "Seasonal clothing"], "DIGITAL": ["Phone apps", "Phone photos", "Computer desktop", "Downloads folder", "Documents", "Computer photos", "Email inbox", "Saved emails", "Cloud storage", "Digital subscriptions", "Old accounts & logins"], "SENTIMENTAL — DO LAST": ["Printed photographs", "Photo albums", "Family keepsakes", "Childhood keepsakes", "Awards & trophies", "Souvenirs", "Letters", "Special greeting cards", "Memorabilia", "Sentimental clothing", "Sentimental holiday ornaments", "Heirlooms", "Items inherited from family", "“I feel guilty getting rid of this” items"], "FINAL WHOLE-HOUSE SWEEP": ["Coat closets", "Entryway", "Nightstands", "Dresser drawers", "Under beds", "Top shelves", "Junk drawer", "Laundry area", "Utility closet", "Guest room", "Spare closets", "Garage/storage corners", "Car trunk & interior", "Donation pile removed from house", "Sell pile listed or donated", "Trash/recycling removed", "Everything being kept has a designated home"]};
async function ensureKondoItems(){const all=await allFrom("items"),e=all.filter(i=>i.module==="kondo");if(e.length)return e;let o=0;for(const [category,names] of Object.entries(KONDO_LIST))for(const title of names)await addTo("items",{module:"kondo",title,category,completed:title==="Underwear"||title==="Shoes",order:o++,updatedAt:Date.now()});return (await allFrom("items")).filter(i=>i.module==="kondo")}
async function renderKondo(body){const items=await ensureKondoItems(),real=items.filter(i=>i.category!=="__META__"),total=real.length,done=real.filter(i=>i.completed).length,pct=total?Math.round(done/total*100):0;body.innerHTML=`<div class="kondo-hero"><div class="kondo-percent">${pct}%</div><div><strong>${done} of ${total} complete</strong><div class="goal-progress"><div style="width:${pct}%"></div></div></div></div><div class="note">Tap each category as you finish it. Your progress is saved on this iPhone.</div><div id="kondoSections"></div><div class="kondo-reset"><button class="ghost-btn" id="resetKondo">Reset Entire Checklist</button></div>`;const root=document.getElementById("kondoSections");for(const category of Object.keys(KONDO_LIST)){const rows=real.filter(i=>i.category===category).sort((a,b)=>(a.order??0)-(b.order??0)),sec=document.createElement("section");sec.className="kondo-section";sec.innerHTML=`<div class="travel-section-head"><h2>${escapeHtml(category)}</h2><span class="pill">${rows.filter(i=>i.completed).length}/${rows.length}</span></div><div class="kondo-list"></div>`;const list=sec.querySelector(".kondo-list");rows.forEach(i=>{const row=document.createElement("button");row.className="kondo-row"+(i.completed?" kondo-done":"");row.innerHTML=`<span class="kondo-check">${i.completed?"✓":"○"}</span><span>${escapeHtml(i.title)}</span>`;row.onclick=async()=>{i.completed=!i.completed;i.updatedAt=Date.now();await putTo("items",i);await renderModule();await refreshDashboard()};list.appendChild(row)});root.appendChild(sec)}const meta=items.find(i=>i.category==="__META__");if(meta){kondoDate.value=meta.completedDate||"";kondoDonated.value=meta.donated||"";kondoTrash.value=meta.trashed||"";kondoSold.value=meta.sold||"";kondoMoney.value=meta.money||""}saveKondoStats.onclick=async()=>{const o=meta||{module:"kondo",category:"__META__",title:"Completion Details",completed:false,order:9999};o.completedDate=kondoDate.value;o.donated=kondoDonated.value;o.trashed=kondoTrash.value;o.sold=kondoSold.value;o.money=kondoMoney.value;o.updatedAt=Date.now();o.id?await putTo("items",o):await addTo("items",o);alert("Completion details saved.")};resetKondo.onclick=async()=>{if(!confirm("Reset every Marie Kondo checkmark and completion detail?"))return;for(const i of items)await delFrom("items",i.id);await renderModule();await refreshDashboard()}}

async function renderGoals(body){
  const all=await allFrom("items");
  const items=all.filter(i=>i.module==="shortGoals"||i.module==="longGoals").map(i=>{
    if(!i.goalType)i.goalType=i.module==="longGoals"?"Long-Term":"Short-Term";
    return i;
  });
  const active=items.filter(i=>(i.status||"Active")!=="Completed").sort((a,b)=>String(a.targetDate||a.date||"9999").localeCompare(String(b.targetDate||b.date||"9999")));
  const done=items.filter(i=>(i.status||"Active")==="Completed").sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  body.innerHTML=`<div class="note">Keep short- and long-term goals together. Use the Type field to distinguish them and update progress as you go.</div>
  <div class="goal-summary"><div><strong>${active.length}</strong><span>Active</span></div><div><strong>${active.filter(i=>i.goalType==="Short-Term").length}</strong><span>Short-Term</span></div><div><strong>${active.filter(i=>i.goalType==="Long-Term").length}</strong><span>Long-Term</span></div></div>
  <div id="activeGoals"></div><section class="goal-section"><div class="travel-section-head"><h2>Completed</h2><span class="pill">${done.length}</span></div><div id="doneGoals" class="list-stack"></div></section>`;
  function card(i){
    const pct=Math.max(0,Math.min(100,Number(i.progress)||0));
    const c=document.createElement("article");c.className="list-card goal-card";
    c.innerHTML=`<div class="list-top"><div><h3>${escapeHtml(i.title)}</h3></div><span class="pill">${escapeHtml(i.goalType||"Short-Term")}</span></div>
    <div class="pills">${i.priority?`<span class="pill">${escapeHtml(i.priority)}</span>`:""}${(i.targetDate||i.date)?`<span class="pill">Target ${escapeHtml(i.targetDate||i.date)}</span>`:""}${i.status?`<span class="pill">${escapeHtml(i.status)}</span>`:""}</div>
    <div class="goal-progress-row"><span>Progress</span><strong>${pct}%</strong></div><div class="goal-progress"><div style="width:${pct}%"></div></div>
    ${i.details?`<p>${escapeHtml(i.details)}</p>`:""}
    <div class="actions">${i.status!=="Completed"?`<button data-complete>Complete</button>`:""}<button data-edit>Edit</button><button class="danger" data-del>Delete</button></div>`;
    const complete=c.querySelector("[data-complete]");
    if(complete)complete.onclick=async()=>{i.status="Completed";i.progress=100;i.module="shortGoals";i.updatedAt=Date.now();await putTo("items",i);await renderModule();await refreshDashboard()};
    c.querySelector("[data-edit]").onclick=()=>openItemForm(i);
    c.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this goal?")){await delFrom("items",i.id);await renderModule();await refreshDashboard()}};
    return c
  }
  const a=document.getElementById("activeGoals");
  a.innerHTML=`<section class="goal-section"><div class="travel-section-head"><h2>Active Goals</h2><span class="pill">${active.length}</span></div><div class="list-stack"></div></section>`;
  const al=a.querySelector(".list-stack");
  if(!active.length)al.innerHTML='<div class="empty">No active goals yet. Tap + Add to create one.</div>';
  active.forEach(i=>al.appendChild(card(i)));
  const dl=document.getElementById("doneGoals");
  if(!done.length)dl.innerHTML='<div class="empty">No completed goals yet.</div>';
  done.forEach(i=>dl.appendChild(card(i)));
}

async function renderPrints(body){
  const items=(await allFrom("items")).filter(i=>i.module==="prints");
  const rank={"High":0,"Medium":1,"Low":2};
  const sorted=a=>a.slice().sort((x,y)=>(rank[x.priority]??1)-(rank[y.priority]??1)||String(x.deadline||"9999").localeCompare(String(y.deadline||"9999")));
  const todo=sorted(items.filter(i=>["Idea","Need Model","Ready to Print"].includes(i.status||"Idea")));
  const progress=sorted(items.filter(i=>["Printing"].includes(i.status)));
  const done=sorted(items.filter(i=>["Printed","Finished","Archived"].includes(i.status)));
  body.innerHTML=`<div class="note">Your print queue. Track ideas, models that still need work, prints ready to run, active prints, and completed projects.</div>
  <div class="print-summary"><div><strong>${todo.length}</strong><span>To Do</span></div><div><strong>${progress.length}</strong><span>Printing</span></div><div><strong>${done.length}</strong><span>Completed</span></div></div>
  <div id="printSections"></div>`;
  const root=document.getElementById("printSections");
  [["To Do",todo],["In Progress",progress],["Completed",done]].forEach(([title,rows])=>{
    const sec=document.createElement("section");sec.className="print-section";
    sec.innerHTML=`<div class="travel-section-head"><h2>${title}</h2><span class="pill">${rows.length}</span></div><div class="list-stack"></div>`;
    const list=sec.querySelector(".list-stack");
    if(!rows.length)list.innerHTML=`<div class="empty">Nothing here.</div>`;
    rows.forEach(i=>{
      const c=document.createElement("article");c.className="list-card print-card";
      c.innerHTML=`<div class="list-top"><div><h3>${escapeHtml(i.title)}</h3>${i.status?`<div class="travel-destination">${escapeHtml(i.status)}</div>`:""}</div>${i.priority?`<span class="pill">${escapeHtml(i.priority)}</span>`:""}</div>
      <div class="pills">${i.quantity?`<span class="pill">Qty ${escapeHtml(i.quantity)}</span>`:""}${i.filament?`<span class="pill">${escapeHtml(i.filament)}</span>`:""}${i.printer?`<span class="pill">${escapeHtml(i.printer)}</span>`:""}${i.deadline?`<span class="pill">Due ${escapeHtml(i.deadline)}</span>`:""}</div>
      ${i.details?`<p>${escapeHtml(i.details)}</p>`:""}
      <div class="actions">${i.url?`<button data-open>Open Model</button>`:""}${!["Finished","Archived"].includes(i.status)?`<button data-next>Next Status</button>`:""}<button data-edit>Edit</button><button class="danger" data-del>Delete</button></div>`;
      if(i.url)c.querySelector("[data-open]").onclick=()=>window.location.assign(i.url);
      const next=c.querySelector("[data-next]");
      if(next)next.onclick=async()=>{const flow=["Idea","Need Model","Ready to Print","Printing","Printed","Finished"];let n=flow.indexOf(i.status||"Idea");i.status=flow[Math.min(n+1,flow.length-1)];i.updatedAt=Date.now();await putTo("items",i);await renderModule();await refreshDashboard()};
      c.querySelector("[data-edit]").onclick=()=>openItemForm(i);
      c.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this 3D print project?")){await delFrom("items",i.id);await renderModule();await refreshDashboard()}};
      list.appendChild(c)
    });
    root.appendChild(sec)
  })
}

async function renderRecipes(body){
  const items=(await allFrom("items")).filter(i=>i.module==="recipes").sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  body.innerHTML=`<div class="recipe-add-grid"><button id="recipeAddLink">🔗<strong>Add from Link</strong><span>Save a recipe website</span></button><button id="recipeAddPhoto">📷<strong>Add from Photo</strong><span>Save a photo or screenshot</span></button><button id="recipeAddManual">✏️<strong>Enter Recipe</strong><span>Ingredients and directions</span></button></div><div class="note">Recipe sites commonly publish structured fields such as ingredients, instructions and yield, but websites may block a browser-only app from importing them automatically. Link recipes always keep the original page one tap away.</div>
  <div class="field"><label>Search recipes<input id="recipeSearch" placeholder="Search by name, category, notes, ingredients, or website"></label></div>
  <div id="recipeList" class="list-stack"></div>`;
  const list=document.getElementById("recipeList"),search=document.getElementById("recipeSearch");
  function matches(i,q){if(!q)return true;q=q.toLowerCase();return [i.title,i.category,i.details,i.ingredients,i.instructions,i.recipeUrl].filter(Boolean).join(" ").toLowerCase().includes(q)}
  function draw(){
    const rows=items.filter(i=>matches(i,search.value.trim()));list.innerHTML="";
    if(!rows.length){list.innerHTML='<div class="empty">No matching recipes.</div>';return}
    rows.forEach(i=>{
      const card=document.createElement("article");card.className="list-card recipe-card";
      let host="";try{host=i.recipeUrl?new URL(i.recipeUrl).hostname.replace(/^www\./,""):""}catch(e){}
      card.innerHTML=`${i.photoData?`<img class="recipe-photo" src="${i.photoData}" alt="Recipe photo">`:""}
      <div class="list-top"><div><h3>${escapeHtml(i.title)}</h3>${i.category?`<div class="travel-destination">${escapeHtml(i.category)}</div>`:""}</div>${i.recipeUrl?`<span class="pill">🔗 ${escapeHtml(host||"Link")}</span>`:""}</div>
      <div class="pills">${i.servings?`<span class="pill">${escapeHtml(i.servings)} servings</span>`:""}${i.prepTime?`<span class="pill">Prep ${escapeHtml(i.prepTime)}</span>`:""}${i.cookTime?`<span class="pill">Cook ${escapeHtml(i.cookTime)}</span>`:""}</div>
      <div class="travel-detail-grid">${i.ingredients?`<div><span>Ingredients</span><p>${escapeHtml(i.ingredients)}</p></div>`:""}${i.instructions?`<div><span>Instructions</span><p>${escapeHtml(i.instructions)}</p></div>`:""}${i.details?`<div><span>Notes</span><p>${escapeHtml(i.details)}</p></div>`:""}</div>
      <div class="actions recipe-actions">${i.recipeUrl?`<button data-open="${i.id}">Open Link</button>`:""}<button data-share="${i.id}">Share</button>${i.ingredients?`<button data-scalehalf="${i.id}">½×</button><button data-scale1="${i.id}">1×</button><button data-scale2="${i.id}">2×</button><button data-grocery="${i.id}">Add Ingredients to Groceries</button>`:""}<button data-edit="${i.id}">Edit</button><button class="danger" data-del="${i.id}">Delete</button></div>`;
      if(i.recipeUrl)card.querySelector("[data-open]").onclick=()=>window.location.assign(i.recipeUrl);
      card.querySelector("[data-share]").onclick=()=>shareRecipe(i);
      const g=card.querySelector("[data-grocery]");if(g)g.onclick=()=>addRecipeIngredientsToGroceries(i);
      const half=card.querySelector("[data-scalehalf]"), one=card.querySelector("[data-scale1]"), two=card.querySelector("[data-scale2]");
      if(half)half.onclick=()=>showScaledRecipe(i,.5);
      if(one)one.onclick=()=>showScaledRecipe(i,1);
      if(two)two.onclick=()=>showScaledRecipe(i,2);
      card.querySelector("[data-edit]").onclick=()=>openItemForm(i);
      card.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this recipe?")){await delFrom("items",i.id);await renderModule();await refreshDashboard()}};
      list.appendChild(card)
    })
  }
  document.getElementById("recipeAddLink").onclick=()=>openItemForm({module:"recipes",recipeMode:"link"});
  document.getElementById("recipeAddPhoto").onclick=()=>openItemForm({module:"recipes",recipeMode:"photo"});
  document.getElementById("recipeAddManual").onclick=()=>openItemForm({module:"recipes",recipeMode:"manual"});
  search.oninput=draw;draw()
}
async function shareRecipe(i){
  const parts=[i.title];if(i.category)parts.push(`Category: ${i.category}`);if(i.servings)parts.push(`Servings: ${i.servings}`);if(i.prepTime)parts.push(`Prep: ${i.prepTime}`);if(i.cookTime)parts.push(`Cook: ${i.cookTime}`);if(i.ingredients)parts.push(`\nINGREDIENTS\n${i.ingredients}`);if(i.instructions)parts.push(`\nINSTRUCTIONS\n${i.instructions}`);if(i.details)parts.push(`\nNOTES\n${i.details}`);if(i.recipeUrl)parts.push(`\nLINK\n${i.recipeUrl}`);
  const text=parts.join("\n");
  try{if(navigator.share){const p={title:i.title,text};if(i.recipeUrl)p.url=i.recipeUrl;await navigator.share(p)}else if(navigator.clipboard){await navigator.clipboard.writeText(text);alert("Recipe copied. You can paste it into Notes.")}}catch(e){if(e.name!=="AbortError")alert("Could not open the Share Sheet.")}
}
async function addRecipeIngredientsToGroceries(i){
  const lines=(i.ingredients||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return alert("This recipe has no ingredient lines to add.");
  if(!confirm(`Add ${lines.length} ingredient line${lines.length===1?"":"s"} to Groceries?`))return;
  for(const line of lines)await addTo("items",{module:"shopping",title:line,quantity:"",category:"Other",completed:false,updatedAt:Date.now()});
  await refreshDashboard();alert("Ingredients added to Groceries.")
}

function scaleIngredientLine(line,factor){
  if(factor===1)return line;
  const fractions={"1/4":.25,"1/3":1/3,"1/2":.5,"2/3":2/3,"3/4":.75};
  return line.replace(/^(\s*)(\d+\s+)?(\d+\/\d+|\d+(?:\.\d+)?)\b/,function(all,space,whole,num){
    let n=0;
    if(whole)n+=parseFloat(whole);
    n+=fractions[num]??parseFloat(num);
    const v=n*factor;
    const common=[[.25,"¼"],[1/3,"⅓"],[.5,"½"],[2/3,"⅔"],[.75,"¾"]];
    const wholePart=Math.floor(v), frac=v-wholePart;
    let out="";
    const hit=common.find(x=>Math.abs(frac-x[0])<.03);
    if(hit)out=(wholePart?wholePart+" ":"")+hit[1];
    else out=(Math.round(v*100)/100).toString();
    return space+out;
  });
}
function showScaledRecipe(i,factor){
  const scaled=(i.ingredients||"").split("\n").map(x=>scaleIngredientLine(x,factor)).join("\n");
  showSheet(`${i.title} — ${factor===.5?"½":factor}×`,`<div class="note">Scaled quantities are best-effort for ingredient lines that begin with a number. Review before cooking.</div><div class="field"><label>Ingredients<textarea style="min-height:320px">${escapeHtml(scaled)}</textarea></label></div>`);
}

function resizeRecipePhoto(file){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const max=1600;let w=img.width,h=img.height;if(Math.max(w,h)>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);resolve(c.toDataURL("image/jpeg",0.78))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})
}

async function renderGroceries(body){
  const categories=["Produce","Meat","Dairy","Bakery","Pantry","Frozen","Beverages","Household","Other"];
  const items=(await allFrom("items")).filter(i=>i.module==="shopping");
  const unchecked=items.filter(i=>!i.completed);
  const checked=items.filter(i=>i.completed);

  body.innerHTML=`<div class="note">Your iPhone grocery list. Tap an item to check it off. Use Share Grocery List to send a clean text list to Notes, Messages, Mail, and other apps.</div>
  <div class="grocery-toolbar">
    <button class="primary-btn" id="shareGroceries">Share Grocery List</button>
    <button class="ghost-btn" id="clearGroceries">Clear Checked</button>
  </div>
  <div id="groceryGroups"></div>
  <div class="travel-section" style="margin-top:24px"><div class="travel-section-head"><h2>Checked Off</h2><span class="pill">${checked.length}</span></div><div id="checkedGroceries" class="list-stack"></div></div>`;

  const groups=document.getElementById("groceryGroups");
  categories.forEach(cat=>{
    const rows=unchecked.filter(i=>(i.category||"Other")===cat);
    if(!rows.length)return;
    const sec=document.createElement("section"); sec.className="grocery-section";
    sec.innerHTML=`<div class="travel-section-head"><h2>${cat}</h2><span class="pill">${rows.length}</span></div>`;
    rows.forEach(i=>sec.appendChild(groceryRow(i,false)));
    groups.appendChild(sec);
  });
  if(!unchecked.length)groups.innerHTML='<div class="empty">Your grocery list is empty. Tap + Add to start a list.</div>';

  const checkedBox=document.getElementById("checkedGroceries");
  if(!checked.length)checkedBox.innerHTML='<div class="empty">Nothing checked off yet.</div>';
  checked.forEach(i=>checkedBox.appendChild(groceryRow(i,true)));

  function groceryRow(i,isChecked){
    const row=document.createElement("div"); row.className="grocery-row"+(isChecked?" grocery-done":"");
    row.innerHTML=`<button class="grocery-check" aria-label="${isChecked?"Uncheck":"Check"} item">${isChecked?"✓":"○"}</button>
      <button class="grocery-main"><strong>${escapeHtml(i.title)}</strong>${i.quantity?`<span>${escapeHtml(i.quantity)}</span>`:""}</button>
      <button class="grocery-edit">Edit</button>`;
    row.querySelector(".grocery-check").onclick=async()=>{i.completed=!i.completed;i.updatedAt=Date.now();await putTo("items",i);await renderModule();await refreshDashboard()};
    row.querySelector(".grocery-main").onclick=async()=>{i.completed=!i.completed;i.updatedAt=Date.now();await putTo("items",i);await renderModule();await refreshDashboard()};
    row.querySelector(".grocery-edit").onclick=()=>openItemForm(i);
    return row;
  }

  document.getElementById("clearGroceries").onclick=async()=>{
    if(!checked.length)return alert("There are no checked items to clear.");
    if(!confirm(`Remove ${checked.length} checked item${checked.length===1?"":"s"}?`))return;
    for(const i of checked)await delFrom("items",i.id);
    await renderModule(); await refreshDashboard();
  };

  document.getElementById("shareGroceries").onclick=async()=>{
    if(!unchecked.length)return alert("Add at least one grocery item first.");
    let lines=["GROCERIES",""];
    categories.forEach(cat=>{
      const rows=unchecked.filter(i=>(i.category||"Other")===cat);
      if(!rows.length)return;
      lines.push(cat.toUpperCase());
      rows.forEach(i=>lines.push(`☐ ${i.quantity?i.quantity+" ":""}${i.title}`));
      lines.push("");
    });
    const text=lines.join("\n").trim();
    try{
      if(navigator.share){
        await navigator.share({title:"Grocery List",text});
      }else if(navigator.clipboard){
        await navigator.clipboard.writeText(text);
        alert("Grocery list copied. You can paste it into Notes.");
      }else{
        showSheet("Grocery List",`<div class="field"><label>Copy this list<textarea style="min-height:300px">${escapeHtml(text)}</textarea></label></div>`);
      }
    }catch(e){ if(e.name!=="AbortError") alert("Could not open the Share Sheet."); }
  };
}

function renderHouses(body){
  const primaryUrl="https://www.zillow.com/homes/for_sale/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22mapBounds%22%3A%7B%22west%22%3A-105.80645%2C%22east%22%3A-103.93915%2C%22south%22%3A38.36706%2C%22north%22%3A39.81634%7D%2C%22mapZoom%22%3A9%2C%22filterState%22%3A%7B%22price%22%3A%7B%22max%22%3A550000%7D%2C%22sqft%22%3A%7B%22min%22%3A1500%7D%2C%22lot%22%3A%7B%22min%22%3A8712%7D%2C%22isForSaleByAgent%22%3A%7B%22value%22%3Atrue%7D%2C%22isForSaleByOwner%22%3A%7B%22value%22%3Atrue%7D%2C%22isNewConstruction%22%3A%7B%22value%22%3Atrue%7D%2C%22isComingSoon%22%3A%7B%22value%22%3Atrue%7D%2C%22isAuction%22%3A%7B%22value%22%3Afalse%7D%2C%22isForeclosure%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%7D";
  const openSpaceUrl="https://www.google.com/search?q=homes+for+sale+near+Monument+Colorado+%22%24550%2C000%22+%22open+space%22+%220.2+acre%22+%221500+sq+ft%22";
  body.innerHTML=`<div class="note">Live home search centered on Monument, Colorado. The main search uses your price, house-size and lot-size targets across roughly a 50-mile map area.</div>
  <div class="card" style="padding:18px">
    <h2 style="margin-bottom:12px">🏡 Monument Home Search</h2>
    <div class="house-criteria">
      <div><span>AREA</span><strong>Within ~50 miles of Monument, CO</strong></div>
      <div><span>PRICE</span><strong>$550,000 or less</strong></div>
      <div><span>HOUSE</span><strong>1,500+ sq ft</strong></div>
      <div><span>LOT</span><strong>0.20+ acres (8,712+ sq ft)</strong></div>
      <div><span>PREFERENCE</span><strong>Near or backing to open space</strong></div>
    </div>
    <button class="primary-btn" id="housesBtn" style="width:100%;margin-top:14px">Open Matching Homes</button>
    <button class="ghost-btn" id="openSpaceBtn" style="width:100%;margin-top:10px">Prioritize Open Space</button>
    <p class="muted" style="margin-top:12px">Open-space language varies by listing, so the second search looks specifically for phrases like “open space” in current listings.</p>
  </div>`;
  document.getElementById("housesBtn").onclick=()=>window.location.assign(primaryUrl);
  document.getElementById("openSpaceBtn").onclick=()=>window.location.assign(openSpaceUrl);
}

async function renderTravel(body){
  const trips=(await allFrom("items")).filter(i=>i.module==="travel");
  const today=new Date(); today.setHours(0,0,0,0);
  const parseDate=s=>s?new Date(s+"T12:00:00"):null;
  const tripEnd=i=>parseDate(i.returnDate||i.date||i.departureDate);
  const tripStart=i=>parseDate(i.departureDate||i.date);
  const upcoming=trips.filter(i=>!tripEnd(i)||tripEnd(i)>=today).sort((a,b)=>(tripStart(a)||new Date(8640000000000000))-(tripStart(b)||new Date(8640000000000000)));
  const past=trips.filter(i=>tripEnd(i)&&tripEnd(i)<today).sort((a,b)=>tripEnd(b)-tripEnd(a));

  body.innerHTML=`<div class="note">Keep each trip in one place: dates, flights, hotel, confirmations, transportation, activities, notes, and anything still to book.</div>
  <div class="travel-section"><div class="travel-section-head"><h2>Upcoming Trips</h2><span class="pill">${upcoming.length}</span></div><div id="upcomingTrips" class="list-stack"></div></div>
  <div class="travel-section"><div class="travel-section-head"><h2>Past Trips</h2><span class="pill">${past.length}</span></div><div id="pastTrips" class="list-stack"></div></div>`;

  function renderTripCards(target, arr, emptyText){
    if(!arr.length){target.innerHTML=`<div class="empty">${emptyText}</div>`;return}
    arr.forEach(i=>{
      const card=document.createElement("article"); card.className="list-card travel-card";
      const dateText=[i.departureDate||i.date,i.returnDate].filter(Boolean).join(" → ");
      const bookingBits=[
        i.flights&&"✈️ Flights",
        i.hotel&&"🏨 Hotel",
        i.transportation&&"🚗 Transportation",
        i.activities&&"🎟️ Activities"
      ].filter(Boolean);
      card.innerHTML=`
        <div class="list-top"><div><h3>${escapeHtml(i.title)}</h3>${i.destination?`<div class="travel-destination">${escapeHtml(i.destination)}</div>`:""}</div>${i.priority?`<span class="pill">${escapeHtml(i.priority)}</span>`:""}</div>
        ${dateText?`<div class="travel-dates">📅 ${escapeHtml(dateText)}</div>`:""}
        ${bookingBits.length?`<div class="pills">${bookingBits.map(x=>`<span class="pill">${x}</span>`).join("")}</div>`:""}
        ${i.stillToBook?`<div class="travel-alert"><strong>Still to book:</strong> ${escapeHtml(i.stillToBook)}</div>`:""}
        <div class="travel-detail-grid">
          ${i.flights?`<div><span>Flights</span><p>${escapeHtml(i.flights)}</p></div>`:""}
          ${i.hotel?`<div><span>Hotel</span><p>${escapeHtml(i.hotel)}</p></div>`:""}
          ${i.confirmations?`<div><span>Confirmations</span><p>${escapeHtml(i.confirmations)}</p></div>`:""}
          ${i.transportation?`<div><span>Transportation</span><p>${escapeHtml(i.transportation)}</p></div>`:""}
          ${i.activities?`<div><span>Activities / Reservations</span><p>${escapeHtml(i.activities)}</p></div>`:""}
          ${i.details?`<div><span>Notes</span><p>${escapeHtml(i.details)}</p></div>`:""}
        </div>
        <div class="actions"><button data-edit="${i.id}">Edit</button><button class="danger" data-del="${i.id}">Delete</button></div>`;
      card.querySelector("[data-edit]").onclick=()=>openItemForm(i);
      card.querySelector("[data-del]").onclick=async()=>{if(confirm("Delete this trip?")){await delFrom("items",i.id);await renderModule();await refreshDashboard()}};
      target.appendChild(card);
    });
  }
  renderTripCards(document.getElementById("upcomingTrips"),upcoming,"No upcoming trips yet.");
  renderTripCards(document.getElementById("pastTrips"),past,"No past trips yet.");
}

async function renderFinance(body){const holdings=await allFrom("holdings");body.innerHTML='<div class="note">Only enter assets you actually own. Vanguard and Schwab can use ticker + shares; TSP, cash, home equity and other assets can be entered as manual values.</div>';for(const account of financeAccounts){const rows=holdings.filter(h=>h.account===account),total=rows.reduce((a,h)=>a+Number(h.value||0),0);const box=document.createElement("section");box.className="finance-account";box.innerHTML=`<div class="finance-account-head"><h3>${account}</h3><span class="account-total">${money(total)}</span></div>`;rows.forEach(h=>{const r=document.createElement("div");r.className="holding";r.innerHTML=`<strong>${escapeHtml(h.name)}</strong>${h.ticker?` <span class="pill">${escapeHtml(h.ticker)}</span>`:""}<div class="muted">${h.shares?`${h.shares} shares · `:""}${money(h.value)}</div><div class="actions"><button>Edit</button><button class="danger">Delete</button></div>`;r.querySelector("button").onclick=()=>openHoldingForm(h);r.querySelector(".danger").onclick=async()=>{if(confirm("Delete this holding?")){await delFrom("holdings",h.id);await renderModule();await refreshDashboard()}};box.appendChild(r)});body.appendChild(box)}}
function renderPlanes(body){body.innerHTML=`<div class="note">This uses your iPhone location and then opens Flightradar24 centered near you.</div><div class="card" style="padding:18px"><h2 style="margin-bottom:8px">What's overhead?</h2><p class="muted" id="planeStatus">Tap below and allow location access.</p><button class="primary-btn" id="planesBtn" style="width:100%;margin-top:10px">Open Flightradar24 Near Me</button><button class="ghost-btn" id="planesFallback" style="width:100%;margin-top:10px">Open Flightradar24 Without Location</button></div>`;
const status=document.getElementById("planeStatus");planesBtn.onclick=()=>{if(!navigator.geolocation){status.textContent="Location is not available. Opening Flightradar24.";window.location.assign("https://www.flightradar24.com/");return}status.textContent="Getting your location…";navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude.toFixed(4),lon=p.coords.longitude.toFixed(4);status.textContent=`Location found. Opening near ${lat}, ${lon}…`;window.location.assign(`https://www.flightradar24.com/${lat},${lon}/10`)},()=>{status.textContent="Could not use your location. Opening regular Flightradar24.";setTimeout(()=>window.location.assign("https://www.flightradar24.com/"),400)},{enableHighAccuracy:true,timeout:10000,maximumAge:60000})};planesFallback.onclick=()=>window.location.assign("https://www.flightradar24.com/")}
function moduleSpecificFields(module,item={}){const common=`<div class="field"><label>Title<input id="fTitle" value="${attr(item.title||"")}"></label></div><div class="field"><label>Details<textarea id="fDetails">${escapeHtml(item.details||"")}</textarea></label></div>`;if(module==="shopping")return `<div class="field"><label>Grocery item<input id="fTitle" placeholder="e.g. Tomatoes" value="${attr(item.title||"")}"></label></div>
<div class="form-row"><div class="field"><label>Quantity (optional)<input id="fQuantity" placeholder="e.g. 2, 1 lb, 1 dozen" value="${attr(item.quantity||"")}"></label></div>
<div class="field"><label>Category<select id="fCategory">${["Produce","Meat","Dairy","Bakery","Pantry","Frozen","Beverages","Household","Other"].map(c=>`<option ${item.category===c||(!item.category&&c==="Other")?"selected":""}>${c}</option>`).join("")}</select></label></div></div>
<div class="field"><label><input type="checkbox" id="fCompleted" ${item.completed?"checked":""}> Checked off</label></div>`;if(module==="travel")return `<div class="field"><label>Trip name<input id="fTitle" value="${attr(item.title||"")}"></label></div>
<div class="field"><label>Destination<input id="fDestination" placeholder="City, state, country, resort, etc." value="${attr(item.destination||"")}"></label></div>
<div class="form-row"><div class="field"><label>Departure<input type="date" id="fDepartureDate" value="${attr(item.departureDate||item.date||"")}"></label></div><div class="field"><label>Return<input type="date" id="fReturnDate" value="${attr(item.returnDate||"")}"></label></div></div>
<div class="field"><label>Flights<textarea id="fFlights" placeholder="Airline, flight numbers, times, airports, seats">${escapeHtml(item.flights||"")}</textarea></label></div>
<div class="field"><label>Hotel / lodging<textarea id="fHotel" placeholder="Hotel name, address, check-in details">${escapeHtml(item.hotel||"")}</textarea></label></div>
<div class="field"><label>Confirmation numbers<textarea id="fConfirmations" placeholder="Airline, hotel, rental car, tour confirmations">${escapeHtml(item.confirmations||"")}</textarea></label></div>
<div class="field"><label>Transportation<textarea id="fTransportation" placeholder="Rental car, train, transfers, parking">${escapeHtml(item.transportation||"")}</textarea></label></div>
<div class="field"><label>Activities / reservations<textarea id="fActivities" placeholder="Tours, restaurants, tickets, appointments">${escapeHtml(item.activities||"")}</textarea></label></div>
<div class="field"><label>Still to book<textarea id="fStillToBook" placeholder="Anything not reserved yet">${escapeHtml(item.stillToBook||"")}</textarea></label></div>
<div class="field"><label>Notes<textarea id="fDetails" placeholder="Packing notes, reminders, addresses, ideas">${escapeHtml(item.details||"")}</textarea></label></div>
<div class="field"><label>Priority<select id="fPriority"><option ${item.priority==="Low"?"selected":""}>Low</option><option ${!item.priority||item.priority==="Normal"?"selected":""}>Normal</option><option ${item.priority==="High"?"selected":""}>High</option></select></label></div>`;
if(["shortGoals","longGoals","projects","tasks"].includes(module))return common+`<div class="form-row"><div class="field"><label>Date<input type="date" id="fDate" value="${attr(item.date||"")}"></label></div><div class="field"><label>Priority<select id="fPriority"><option>Low</option><option ${item.priority==="Normal"?"selected":""}>Normal</option><option ${item.priority==="High"?"selected":""}>High</option></select></label></div></div>${module==="tasks"?`<div class="field"><label><input type="checkbox" id="fCompleted" ${item.completed?"checked":""}> Completed</label></div>`:""}`;if(module==="houses")return common+`<div class="form-row"><div class="field"><label>Price<input type="number" id="fAmount" value="${attr(item.amount||"")}"></label></div><div class="field"><label>Rating 1–5<input type="number" min="1" max="5" id="fRating" value="${attr(item.rating||"")}"></label></div></div><div class="field"><label>Listing URL<input type="url" id="fUrl" value="${attr(item.url||"")}"></label></div>`;if(module==="shortGoals"||module==="longGoals")return `<div class="field"><label>Goal<input id="fTitle" placeholder="What do you want to accomplish?" value="${attr(item.title||"")}"></label></div>
<div class="form-row"><div class="field"><label>Type<select id="fGoalType">${["Short-Term","Long-Term"].map(x=>`<option ${item.goalType===x||(!item.goalType&&((module==="longGoals"&&x==="Long-Term")||(module!=="longGoals"&&x==="Short-Term")))?"selected":""}>${x}</option>`).join("")}</select></label></div>
<div class="field"><label>Priority<select id="fPriority">${["High","Medium","Low"].map(x=>`<option ${item.priority===x||(!item.priority&&x==="Medium")?"selected":""}>${x}</option>`).join("")}</select></label></div></div>
<div class="form-row"><div class="field"><label>Target date<input type="date" id="fTargetDate" value="${attr(item.targetDate||item.date||"")}"></label></div>
<div class="field"><label>Status<select id="fStatus">${["Active","On Hold","Completed"].map(x=>`<option ${item.status===x||(!item.status&&x==="Active")?"selected":""}>${x}</option>`).join("")}</select></label></div></div>
<div class="field"><label>Progress: <strong id="progressValue">${attr(item.progress??0)}%</strong><input type="range" min="0" max="100" step="5" id="fProgress" value="${attr(item.progress??0)}" oninput="document.getElementById('progressValue').textContent=this.value+'%'"></label></div>
<div class="field"><label>Notes<textarea id="fDetails">${escapeHtml(item.details||"")}</textarea></label></div>`;
if(module==="projects")return `<div class="field"><label>Project name<input id="fTitle" value="${attr(item.title||"")}"></label></div><div class="form-row"><div class="field"><label>Status<select id="fProjectStatus">${["Planning","Active","On Hold","Completed"].map(x=>`<option ${item.projectStatus===x||(!item.projectStatus&&x==="Active")?"selected":""}>${x}</option>`).join("")}</select></label></div><div class="field"><label>Priority<select id="fPriority">${["High","Medium","Low"].map(x=>`<option ${item.priority===x||(!item.priority&&x==="Medium")?"selected":""}>${x}</option>`).join("")}</select></label></div></div><div class="field"><label>Target date<input type="date" id="fTargetDate" value="${attr(item.targetDate||item.date||"")}"></label></div><div class="field"><label>Notes<textarea id="fDetails">${escapeHtml(item.details||"")}</textarea></label></div>`;
if(module==="tasks")return `<div class="field"><label>Task<input id="fTitle" value="${attr(item.title||"")}"></label></div><div class="form-row"><div class="field"><label>Project<select id="fProjectId"><option value="">No project</option>${(window._projectChoices||[]).map(p=>`<option value="${p.id}" ${String(item.projectId||"")===String(p.id)?"selected":""}>${escapeHtml(p.title)}</option>`).join("")}</select></label></div><div class="field"><label>Priority<select id="fPriority">${["High","Medium","Low"].map(x=>`<option ${item.priority===x||(!item.priority&&x==="Medium")?"selected":""}>${x}</option>`).join("")}</select></label></div></div><div class="field"><label>Due date<input type="date" id="fDueDate" value="${attr(item.dueDate||item.date||"")}"></label></div><div class="field"><label>Notes<textarea id="fDetails">${escapeHtml(item.details||"")}</textarea></label></div>`;
if(module==="prints")return `<div class="field"><label>Project / model name<input id="fTitle" placeholder="e.g. White House golf obstacle" value="${attr(item.title||"")}"></label></div>
<div class="form-row"><div class="field"><label>Status<select id="fStatus">${["Idea","Need Model","Ready to Print","Printing","Printed","Finished","Archived"].map(x=>`<option ${item.status===x?"selected":""}>${x}</option>`).join("")}</select></label></div>
<div class="field"><label>Priority<select id="fPriority">${["High","Medium","Low"].map(x=>`<option ${item.priority===x||(!item.priority&&x==="Medium")?"selected":""}>${x}</option>`).join("")}</select></label></div></div>
<div class="form-row"><div class="field"><label>Quantity needed<input id="fQuantity" inputmode="numeric" placeholder="1" value="${attr(item.quantity||"")}"></label></div>
<div class="field"><label>Deadline<input type="date" id="fDeadline" value="${attr(item.deadline||"")}"></label></div></div>
<div class="field"><label>Filament / color<input id="fFilament" placeholder="e.g. White PLA, red PETG" value="${attr(item.filament||"")}"></label></div>
<div class="field"><label>Printer<input id="fPrinter" placeholder="e.g. Bambu X1 Carbon" value="${attr(item.printer||"")}"></label></div>
<div class="field"><label>Model / STL link<input type="url" id="fUrl" placeholder="https://..." value="${attr(item.url||"")}"></label></div>
<div class="field"><label>Notes<textarea id="fDetails">${escapeHtml(item.details||"")}</textarea></label></div>`;
if(module==="recipes")return `<div class="recipe-mode-banner">${item.recipeMode==="link"?"🔗 Add from Link":item.recipeMode==="photo"?"📷 Add from Photo":"✏️ Enter Recipe"}</div>
<div class="field"><label>Recipe name<input id="fTitle" placeholder="e.g. Pineapple Salsa" value="${attr(item.title||"")}"></label></div>
<div class="field"><label>Recipe link (optional)<input type="url" id="fRecipeUrl" placeholder="https://..." value="${attr(item.recipeUrl||"")}"></label></div>
<div class="field"><label>Recipe photo or screenshot (optional)<input type="file" accept="image/*" id="fRecipePhoto"></label>${item.photoData?`<img class="recipe-photo-preview" src="${item.photoData}" alt="Saved recipe photo"><label class="remove-photo"><input type="checkbox" id="fRemovePhoto"> Remove saved photo</label>`:""}</div>
<div class="form-row"><div class="field"><label>Category<input id="fCategory" placeholder="Dinner, salsa, sous vide..." value="${attr(item.category||"")}"></label></div><div class="field"><label>Servings<input id="fServings" value="${attr(item.servings||"")}"></label></div></div>
<div class="form-row"><div class="field"><label>Prep time<input id="fPrepTime" placeholder="15 min" value="${attr(item.prepTime||"")}"></label></div><div class="field"><label>Cook time<input id="fCookTime" placeholder="45 min" value="${attr(item.cookTime||"")}"></label></div></div>
<div class="field"><label>Ingredients (optional)<textarea id="fIngredients" placeholder="One ingredient per line">${escapeHtml(item.ingredients||"")}</textarea></label></div>
<div class="field"><label>Instructions (optional)<textarea id="fInstructions" placeholder="Recipe steps">${escapeHtml(item.instructions||"")}</textarea></label></div>
<div class="field"><label>Notes (optional)<textarea id="fDetails">${escapeHtml(item.details||"")}</textarea></label></div>`;
return common}
async function openItemForm(item=null){if(currentModule==="tasks"){const a=await allFrom("items");window._projectChoices=a.filter(x=>x.module==="projects"&&(x.projectStatus||"Active")!=="Completed").sort((a,b)=>String(a.title||"").localeCompare(String(b.title||"")));}const isEdit=!!item;showSheet(isEdit?"Edit item":"Add item",moduleSpecificFields(currentModule,item||{})+`<div class="form-actions"><button class="ghost-btn" id="cancelForm">Cancel</button><button class="primary-btn" id="saveForm">${isEdit?"Save changes":"Add"}</button></div>`);cancelForm.onclick=hideSheet;saveForm.onclick=async()=>{const obj={...(item||{}),module:currentModule,title:document.getElementById("fTitle")?.value.trim()||"",details:document.getElementById("fDetails")?.value.trim()||item?.details||"",updatedAt:Date.now()};if(!obj.title)return alert("Add a title.");for(const [id,key] of [["fStore","store"],["fDate","date"],["fPriority","priority"],["fAmount","amount"],["fRating","rating"],["fUrl","url"],["fStatus","status"],["fDestination","destination"],["fDepartureDate","departureDate"],["fReturnDate","returnDate"],["fFlights","flights"],["fHotel","hotel"],["fConfirmations","confirmations"],["fTransportation","transportation"],["fActivities","activities"],["fStillToBook","stillToBook"],["fQuantity","quantity"],["fCategory","category"],["fRecipeUrl","recipeUrl"],["fServings","servings"],["fPrepTime","prepTime"],["fCookTime","cookTime"],["fIngredients","ingredients"],["fInstructions","instructions"],["fDeadline","deadline"],["fFilament","filament"],["fPrinter","printer"],["fGoalType","goalType"],["fTargetDate","targetDate"],["fProgress","progress"],["fProjectStatus","projectStatus"],["fProjectId","projectId"],["fDueDate","dueDate"]]){const el=document.getElementById(id);if(el)obj[key]=el.value}const comp=document.getElementById("fCompleted");if(comp)obj.completed=comp.checked;
const photoInput=document.getElementById("fRecipePhoto"),removePhoto=document.getElementById("fRemovePhoto");
if(removePhoto?.checked)obj.photoData="";
if(photoInput?.files?.[0]){try{obj.photoData=await resizeRecipePhoto(photoInput.files[0])}catch(e){return alert("I couldn't save that photo. Try another image.")}}
if(currentModule==="shortGoals"&&(obj.module==="longGoals"||obj.module==="shortGoals"))obj.module="shortGoals";if(isEdit)await putTo("items",obj);else await addTo("items",obj);hideSheet();await renderModule();await refreshDashboard()}}
function openHoldingForm(h=null){const account=h?.account||"Vanguard";showSheet(h?"Edit asset":"Add asset",`<div class="field"><label>Account<select id="hAccount">${financeAccounts.map(a=>`<option ${account===a?"selected":""}>${a}</option>`).join("")}</select></label></div><div class="field"><label>Name<input id="hName" value="${attr(h?.name||"")}"></label></div><div class="form-row"><div class="field"><label>Ticker (optional)<input id="hTicker" value="${attr(h?.ticker||"")}"></label></div><div class="field"><label>Shares (optional)<input type="number" step="0.0001" id="hShares" value="${attr(h?.shares||"")}"></label></div></div><div class="field"><label>Current total value<input type="number" step="0.01" id="hValue" value="${attr(h?.value||"")}"></label></div><div class="form-actions"><button class="ghost-btn" id="cancelHold">Cancel</button><button class="primary-btn" id="saveHold">Save</button></div>`);cancelHold.onclick=hideSheet;saveHold.onclick=async()=>{const obj={...(h||{}),account:hAccount.value,name:hName.value.trim(),ticker:hTicker.value.trim().toUpperCase(),shares:Number(hShares.value||0),value:Number(hValue.value||0),updatedAt:Date.now()};if(!obj.name)return alert("Add a name.");if(h)await putTo("holdings",obj);else await addTo("holdings",obj);hideSheet();await renderModule();await refreshDashboard()}}
function showSheet(title,html){sheetTitle.textContent=title;sheetContent.innerHTML=html;sheet.classList.remove("hidden")}function hideSheet(){sheet.classList.add("hidden")}function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}function attr(s){return escapeHtml(s)}
async function exportData(){const payload={version:1,exportedAt:new Date().toISOString(),items:await allFrom("items"),holdings:await allFrom("holdings")};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Personal-Command-Center-Backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
async function restoreData(file){const data=JSON.parse(await file.text());if(!confirm("Restore this backup? This will replace your current app data."))return;await new Promise((res,rej)=>{const tx=db.transaction(["items","holdings"],"readwrite");tx.objectStore("items").clear();tx.objectStore("holdings").clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});for(const x of data.items||[]){delete x.id;await addTo("items",x)}for(const x of data.holdings||[]){delete x.id;await addTo("holdings",x)}await refreshDashboard();if(currentModule)await renderModule();alert("Backup restored.")}
function openMenu(){showSheet("App menu",`<div class="menu-list"><button id="backupBtn">⬇️ Backup My Data</button><button id="restoreBtn">⬆️ Restore Backup</button><button id="aboutBtn">ℹ️ About this app</button></div>`);backupBtn.onclick=exportData;restoreBtn.onclick=()=>restoreFile.click();aboutBtn.onclick=()=>alert("Personal Command Center stores your personal data locally on this iPhone using IndexedDB.")}
backBtn.onclick=async()=>{currentModule=null;moduleView.classList.remove("active");dashboardView.classList.add("active");await refreshDashboard()};addItemBtn.onclick=()=>currentModule==="finance"?openHoldingForm():openItemForm();quickAddBtn.onclick=()=>{showSheet("Quick Add",`<div class="field"><label>Section<select id="qModule">${modules.filter(m=>m.key!=="planes"&&m.key!=="finance").map(m=>`<option value="${m.key}">${m.name}</option>`).join("")}</select></label></div><div class="field"><label>Title<input id="qTitle"></label></div><div class="field"><label>Details<textarea id="qDetails"></textarea></label></div><div class="form-actions"><button class="ghost-btn" id="qCancel">Cancel</button><button class="primary-btn" id="qSave">Add</button></div>`);qCancel.onclick=hideSheet;qSave.onclick=async()=>{if(!qTitle.value.trim())return alert("Add a title.");await addTo("items",{module:qModule.value,title:qTitle.value.trim(),details:qDetails.value.trim(),updatedAt:Date.now()});hideSheet();await refreshDashboard()}};menuBtn.onclick=openMenu;closeSheetBtn.onclick=hideSheet;sheet.onclick=e=>{if(e.target===sheet)hideSheet()};restoreFile.onchange=e=>{if(e.target.files[0])restoreData(e.target.files[0]);e.target.value=""};
(async()=>{db=await openDB();await refreshDashboard()})();if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}