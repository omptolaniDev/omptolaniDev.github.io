// script.js — data fetch, render, filters, modal, animations

// ----- UI refs
const UI = {
  grid: document.getElementById('inventoryGrid'),
  loading: document.getElementById('loading'),
  empty: document.getElementById('emptyState'),
  currency: null, // optional if you add currency switch later
  search: document.getElementById('searchInput'),
  make: document.getElementById('makeSelect'),
  yearMin: document.getElementById('yearMin'),
  yearMax: document.getElementById('yearMax'),
  fuel: document.getElementById('fuelSelect'),
  apply: document.getElementById('applyFilters'),
  clear: document.getElementById('clearFilters'),
  yearEl: document.getElementById('year'),
  menuToggle: document.getElementById('menuToggle'),
  menu: document.querySelector('.nav')
};

let STATE = {
  cars: [],
  filtered: []
};

// OPTIONAL: put your Unsplash access key here to fetch images automatically.
// If empty, script will use the inline placeholder.
const UNSPLASH_KEY = 'BH5mDHg6QQW96QeliC6E5GaJqTsYxiIhxruaBSYHMWM'; // <-- add your Unsplash key if you want API images
const UNSPLASH_ENDPOINT = 'https://api.unsplash.com/search/photos';

// small inline SVG dataURI placeholder (light)
const PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000'><rect width='100%' height='100%' fill='#e9e9ee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='36' fill='#d4af37' font-family='sans-serif'>Car image</text></svg>`
);

// format price (NOK default)
function money(n){ return new Intl.NumberFormat('no-NO', { style:'currency', currency:'NOK', maximumFractionDigits:0 }).format(n); }

// fetch cars.json
async function fetchCars(){
  UI.loading.classList.remove('hidden');
  try{
    const res = await fetch('cars.json');
    const data = await res.json();
    STATE.cars = data;
    STATE.filtered = [...STATE.cars];
    populateMakes();
    if(UNSPLASH_KEY) await attachUnsplashImages(STATE.cars);
    render();
  }catch(err){
    console.error('Failed to load cars.json', err);
    STATE.cars = [];
    STATE.filtered = [];
    render();
  }finally{
    UI.loading.classList.add('hidden');
  }
}

// populate make select
function populateMakes(){
  const makes = Array.from(new Set(STATE.cars.map(c => c.make))).sort();
  for(const m of makes){
    const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
    UI.make.appendChild(opt);
  }
}

// attach images using Unsplash (if key present)
async function attachUnsplashImages(cars){
  for(const car of cars){
    try{
      const q = encodeURIComponent(`${car.make} ${car.model} ${car.year} car`);
      const url = `${UNSPLASH_ENDPOINT}?query=${q}&per_page=1&client_id=${UNSPLASH_KEY}`;
      const r = await fetch(url);
      const j = await r.json();
      car.image = j?.results?.[0]?.urls?.regular || car.image || PLACEHOLDER_SVG;
    }catch(e){
      car.image = car.image || PLACEHOLDER_SVG;
    }
  }
}

// filtering
function applyFilters(){
  const term = UI.search.value.trim().toLowerCase();
  const make = UI.make.value;
  const yearMin = parseInt(UI.yearMin.value || '0', 10);
  const yearMax = parseInt(UI.yearMax.value || '9999', 10);
  const fuel = UI.fuel.value;

  STATE.filtered = STATE.cars.filter(c=>{
    if(term){
      const text = `${c.make} ${c.model} ${c.trim || ''}`.toLowerCase();
      if(!text.includes(term)) return false;
    }
    if(make && c.make !== make) return false;
    if(yearMin && c.year < yearMin) return false;
    if(yearMax && c.year > yearMax) return false;
    if(fuel && c.fuel !== fuel) return false;
    return true;
  });

  render();
}

// clear
function clearFilters(){
  UI.search.value = '';
  UI.make.value = '';
  UI.yearMin.value = '';
  UI.yearMax.value = '';
  UI.fuel.value = '';
  STATE.filtered = [...STATE.cars];
  render();
}

// render cards
function render(){
  UI.grid.innerHTML = '';
  UI.empty.classList.add('hidden');

  if(!STATE.filtered.length){
    UI.empty.classList.remove('hidden');
    return;
  }

  STATE.filtered.forEach((car, idx) => {
    const el = document.createElement('div');
    el.className = 'car-card';
    el.setAttribute('role','listitem');
    el.innerHTML = `
      <div class="car-card__panel">
        <div style="position:relative;">
          ${car.badge ? `<div class="badge">${escapeHtml(car.badge)}</div>` : ''}
          <div class="car-image-wrap">
            <img src="${car.image || PLACEHOLDER_SVG}" alt="${escapeHtml(car.make)} ${escapeHtml(car.model)}" loading="lazy" />
          </div>
        </div>

        <div class="card-body">
          <div class="card-title">${escapeHtml(car.year)} ${escapeHtml(car.make)} ${escapeHtml(car.model)}</div>
          <div class="card-sub">${escapeHtml(car.trim || '')}</div>
          <div class="card-price">${money(car.priceNOK)}</div>
        </div>

        <div class="card-actions">
          <button class="btn btn-gold" data-id="${car.id}" data-action="view">View</button>
          <a class="btn btn-ghost" href="#contact">Enquire</a>
        </div>
      </div>
    `;

    UI.grid.appendChild(el);

    // stagger reveal
    setTimeout(()=> el.classList.add('reveal'), idx * 90);
  });
}

// simple escape
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// -------------- Modal logic (robust)
const modalEl = document.getElementById('carModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalSpecs = document.getElementById('modalSpecs');
const modalPrice = document.getElementById('modalPrice');
const modalCall = document.getElementById('modalCall');
const modalWhats = document.getElementById('modalWhatsApp');

function openModal(car){
  if(!modalEl) return;
  modalImage.src = car.image || PLACEHOLDER_SVG;
  modalTitle.textContent = `${car.year} ${car.make} ${car.model}`;
  modalSubtitle.textContent = car.trim || '';
  modalSpecs.innerHTML = `
    <div class="spec"><strong>Mileage</strong><div>${car.km?.toLocaleString() ?? '—'} km</div></div>
    <div class="spec"><strong>Fuel</strong><div>${car.fuel ?? '—'}</div></div>
    <div class="spec"><strong>Transmission</strong><div>${car.transmission ?? '—'}</div></div>
    <div class="spec"><strong>VIN</strong><div>${car.vin ?? '—'}</div></div>
    <div class="spec"><strong>Location</strong><div>${car.location ?? '—'}</div></div>
  `;
  modalPrice.textContent = money(car.priceNOK);
  modalCall.href = 'tel:+4798827640';
  modalWhats.href = `https://wa.me/4798827640?text=${encodeURIComponent('Hi, I am interested in ' + car.year + ' ' + car.make + ' ' + car.model)}`;

  modalEl.classList.add('show');
  modalEl.setAttribute('aria-hidden','false');
  // trap focus if you want (not implemented here)
}

function closeModal(){
  if(!modalEl) return;
  modalEl.classList.remove('show');
  modalEl.setAttribute('aria-hidden','true');
  // clear image to reduce memory
  setTimeout(()=> modalImage.src = '', 300);
}

// click handlers (delegated)
document.addEventListener('click', (e)=>{
  const v = e.target.closest('[data-action="view"]');
  if(v){
    const id = v.getAttribute('data-id');
    const car = STATE.cars.find(c => String(c.id) === String(id));
    if(car) openModal(car);
    return;
  }

  // close modal when clicking overlay or close button
  if(e.target.matches('[data-close]') || e.target.closest('[data-close]')){
    closeModal(); return;
  }

  // clicking outside modal content
  if(e.target === modalEl) closeModal();
});

// ESC to close
document.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

// menu toggle mobile
if(UI.menuToggle){
  UI.menuToggle.addEventListener('click', ()=> {
    UI.menu.classList.toggle('open');
  });
}

// filter actions
if(UI.apply) UI.apply.addEventListener('click', applyFilters);
if(UI.clear) UI.clear.addEventListener('click', clearFilters);

// year element if present
if(UI.yearEl) UI.yearEl.textContent = new Date().getFullYear();

// INIT
fetchCars();
