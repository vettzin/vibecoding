/*
  Controle de Estacionamento
  - Usa localStorage para persistência
  - Duas abas: cadastro e controle
  - Validações: campos obrigatórios, placa mínimo 7 caracteres
  - Filtros, busca por placa, alterar status, excluir, contador de estacionados
*/

const STORAGE_KEY = 'parking_vehicles_v1';

/* Utilities */
const qs = (sel, ctx=document) => ctx.querySelector(sel);
const qsa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const el = tag => document.createElement(tag);

function loadVehicles(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('storage read', e);
    return [];
  }
}
function saveVehicles(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* State */
let vehicles = loadVehicles();
let currentFilter = 'all';
let currentSearch = '';

/* Elements */
const tabRegister = qs('#tab-register');
const tabControl = qs('#tab-control');
const panelRegister = qs('#panel-register');
const panelControl = qs('#panel-control');

const form = qs('#form-register');
const inputName = qs('#driverName');
const inputPlate = qs('#plate');
const inputModel = qs('#model');
const messageArea = qs('#message-area');

const searchInput = qs('#searchPlate');
const clearSearchBtn = qs('#clearSearch');
const filterBtns = qsa('.filter-btn');
const vehiclesBody = qs('#vehiclesBody');
const countParked = qs('#countParked');
const controlMsg = qs('#control-message-area');

/* Tab switching */
tabRegister.addEventListener('click', () => switchTab('register'));
tabControl.addEventListener('click', () => switchTab('control'));

function switchTab(name){
  if(name === 'register'){
    tabRegister.classList.add('active');
    tabControl.classList.remove('active');
    panelRegister.classList.remove('hidden');
    panelControl.classList.add('hidden');
  }else{
    tabControl.classList.add('active');
    tabRegister.classList.remove('active');
    panelControl.classList.remove('hidden');
    panelRegister.classList.add('hidden');
    renderTable();
  }
}

/* Messages */
let msgTimeout = null;
function showMessage(targetEl, text, type='success', ms=2500){
  clearTimeout(msgTimeout);
  targetEl.innerHTML = `<span class="msg ${type==='error'?'error':'success'}">${text}</span>`;
  msgTimeout = setTimeout(()=>{ targetEl.textContent=''; }, ms);
}

/* Validation */
function validateForm(name, plate, model){
  if(!name.trim() || !plate.trim() || !model.trim()){
    return {ok:false, msg:'Todos os campos são obrigatórios.'};
  }
  if(plate.trim().length < 7){
    return {ok:false, msg:'A placa deve possuir no mínimo 7 caracteres.'};
  }
  return {ok:true};
}

/* Create vehicle */
form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const name = inputName.value;
  const plate = inputPlate.value.toUpperCase();
  const model = inputModel.value;

  const v = validateForm(name, plate, model);
  if(!v.ok){
    showMessage(messageArea, v.msg, 'error');
    return;
  }

  const newVehicle = {
    id: cryptoRandomId(),
    name: name.trim(),
    plate: plate.trim(),
    model: model.trim(),
    status: 'parked', // parked | absent
    createdAt: Date.now()
  };

  vehicles.unshift(newVehicle);
  saveVehicles(vehicles);
  form.reset();
  showMessage(messageArea, 'Veículo cadastrado com sucesso!', 'success');
  updateCount();
  // if currently viewing control, refresh table dynamically
  if(!panelControl.classList.contains('hidden')){
    renderTable();
  }
});

/* Reset clears message */
qs('#btnClear').addEventListener('click', ()=>{ messageArea.textContent=''; });

/* Search and filters */
searchInput.addEventListener('input', (e)=>{
  currentSearch = e.target.value.trim().toUpperCase();
  renderTable();
});
clearSearchBtn.addEventListener('click', ()=>{
  searchInput.value = '';
  currentSearch = '';
  renderTable();
});

filterBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    filterBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTable();
  });
});

/* Render table */
function renderTable(){
  vehiclesBody.innerHTML = '';
  const filtered = vehicles.filter(v => {
    if(currentFilter === 'parked' && v.status !== 'parked') return false;
    if(currentFilter === 'absent' && v.status !== 'absent') return false;
    if(currentSearch){
      return v.plate.toUpperCase().includes(currentSearch);
    }
    return true;
  });

  if(filtered.length === 0){
    const tr = el('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center;color:#6b7280;padding:18px">Nenhum veículo encontrado.</td>`;
    vehiclesBody.appendChild(tr);
  }else{
    for(const v of filtered){
      const tr = el('tr');
      tr.innerHTML = `
        <td>${escapeHtml(v.name)}</td>
        <td>${escapeHtml(v.plate)}</td>
        <td>${escapeHtml(v.model)}</td>
        <td><span class="badge ${v.status==='parked'?'parked':'absent'}">${v.status==='parked'?'Estacionado':'Ausente'}</span></td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="small-btn toggle" data-id="${v.id}">${v.status==='parked'?'Marcar Ausente':'Marcar Estacionado'}</button>
            <button class="small-btn delete" data-id="${v.id}">Excluir</button>
          </div>
        </td>
      `;
      vehiclesBody.appendChild(tr);
    }
  }
  attachRowHandlers();
  updateCount();
}

/* Row action handlers */
function attachRowHandlers(){
  qsa('.small-btn.toggle').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const id = btn.dataset.id;
      toggleStatus(id);
    });
  });
  qsa('.small-btn.delete').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const id = btn.dataset.id;
      removeVehicle(id);
    });
  });
}

function toggleStatus(id){
  const idx = vehicles.findIndex(v=>v.id===id);
  if(idx === -1) return;
  vehicles[idx].status = vehicles[idx].status === 'parked' ? 'absent' : 'parked';
  saveVehicles(vehicles);
  renderTable();
  showMessage(controlMsg, 'Status do veículo atualizado.', 'success');
}

function removeVehicle(id){
  const idx = vehicles.findIndex(v=>v.id===id);
  if(idx === -1) return;
  const removed = vehicles.splice(idx,1);
  saveVehicles(vehicles);
  renderTable();
  showMessage(controlMsg, 'Veículo removido com sucesso.', 'success');
}

/* Counter */
function updateCount(){
  const count = vehicles.reduce((acc,v)=> acc + (v.status==='parked'?1:0), 0);
  countParked.textContent = count;
}

/* Helpers */
function cryptoRandomId(){
  // lightweight id
  return 'v_' + Math.random().toString(36).slice(2,9);
}
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* Initialize UI */
(function init(){
  // initial render
  updateCount();
  // if there are vehicles, default to control tab? keep register as default but refresh table when control opened
  // allow pressing Enter in search to focus first result (no extra actions)
  // accessibility: allow tab switching by keyboard (left/right)
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') switchTab('register');
    if(e.key === 'ArrowRight') switchTab('control');
  });

  // Render table once to show message if empty
  renderTable();
})();