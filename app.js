/* ========================================================
   Durian Smart Garden - Main JavaScript Logic
   State Management, UI Rendering, and LocalStorage
   ======================================================== */

// Configure Tailwind theme extensions
tailwind.config = {
    theme: {
        extend: {
            colors: {
                soft: {
                    bg: '#f0f5fc',        /* Soft Light Blue Background */
                    card: '#ffffff',
                    textDark: '#06172E',   /* Midnight */
                    textMuted: '#58A1D3',  /* Blue Gray */
                    primary: '#0F4C81',    /* Classic Blue Accent */
                    primaryLight: '#B3DEF8',/* Powder Blue */
                    accentGreen: '#10b981',
                    accentGreenLight: '#d1fae5',
                    accentRose: '#f43f5e',
                    accentRoseLight: '#ffe4e6',
                    border: '#dbeafe'
                }
            },
            fontFamily: {
                sans: ['Kanit', 'sans-serif'],
                kawaii: ['Kanit', 'sans-serif']
            }
        }
    }
};

let gardens = [];
let activeGardenId = null;
let draggedIndex = null;
let currentMobileTab = 'tasks';
let currentItemCategoryFilter = 'all';

let synth = null;
function initSynth() {
    if (!synth) {
        synth = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
    }
}

function playClickSound() {
    try {
        initSynth();
        if (Tone.context.state !== 'running') {
            Tone.start();
        }
        synth.triggerAttackRelease("C5", "32n");
    } catch(e) {
        // Audio context policy fallback
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderGardenList();
    
    if (gardens.length > 0) {
        selectGarden(gardens[0].id);
    } else {
        renderEmptyState();
    }

    switchMobileTab(currentMobileTab);
    startThailandClock();
    updateOnlineStatusUI();
    
    const taskDateInput = document.getElementById('task-start-date-input');
    const itemDateInput = document.getElementById('item-purchase-date');
    const todayIso = new Date().toISOString().split('T')[0];
    if (taskDateInput) taskDateInput.value = todayIso;
    if (itemDateInput) itemDateInput.value = todayIso;
});

function saveToLocalStorage() {
    try {
        localStorage.setItem('smart_gardens_data', JSON.stringify(gardens));
        localStorage.setItem('smart_active_garden_id', activeGardenId || '');
    } catch (e) {
        console.error('Failed to save to localStorage', e);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('smart_gardens_data');
        const savedActiveId = localStorage.getItem('smart_active_garden_id');

        if (savedData) {
            gardens = JSON.parse(savedData);
            gardens.forEach(g => {
                if (!g.location || !g.location.lat || !g.location.lng) {
                    g.location = {
                        lat: 12.6112,
                        lng: 101.4234,
                        rawInput: '12.6112, 101.4234',
                        name: 'จันทบุรี / ระยอง'
                    };
                }
                if (g.items) {
                    g.items.forEach(item => {
                        if (item.outOfStock === undefined) item.outOfStock = false;
                        if (!item.category) {
                            if (item.name && item.name.includes('ปุ๋ย')) item.category = 'ปุ๋ย';
                            else if (item.name && (item.name.includes('ยา') || item.name.includes('สาร'))) item.category = 'ยา';
                            else if (item.name && (item.name.includes('ท่อ') || item.name.includes('สปริงเกลอร์') || item.name.includes('สาย'))) item.category = 'ท่อ';
                            else item.category = 'อุปกรณ์';
                        }
                    });
                }
            });
            if (savedActiveId && gardens.some(g => g.id === savedActiveId)) {
                activeGardenId = savedActiveId;
            } else if (gardens.length > 0) {
                activeGardenId = gardens[0].id;
            }
        } else {
            loadSampleData();
            saveToLocalStorage();
        }
    } catch (e) {
        console.error('Failed to load from localStorage', e);
        loadSampleData();
    }
}

function startThailandClock() {
    const thaiMonthsShort = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    function updateClock() {
        const now = new Date();
        const options = { timeZone: 'Asia/Bangkok' };
        const bkkDateStr = now.toLocaleString('en-US', options);
        const bkkDate = new Date(bkkDateStr);

        const dayStr = String(bkkDate.getDate()).padStart(2, '0');
        const monthIndex = bkkDate.getMonth();
        const yearTh = bkkDate.getFullYear() + 543;
        
        const hours = String(bkkDate.getHours()).padStart(2, '0');
        const minutes = String(bkkDate.getMinutes()).padStart(2, '0');
        const seconds = String(bkkDate.getSeconds()).padStart(2, '0');
        const thaiTimeStr = `${hours}:${minutes}:${seconds}`;

        const dayEl = document.getElementById('thai-widget-day');
        const monthEl = document.getElementById('thai-widget-month');
        const timeEl = document.getElementById('thai-widget-time');
        const yearEl = document.getElementById('thai-widget-year');

        if (dayEl) dayEl.innerText = dayStr;
        if (monthEl) monthEl.innerText = thaiMonthsShort[monthIndex] || '';
        if (timeEl) timeEl.innerText = thaiTimeStr;
        if (yearEl) yearEl.innerText = `พ.ศ. ${yearTh}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

function loadSampleData() {
    gardens = [
        {
            id: 'g1',
            name: 'แปลงหมอนทอง (สวนใหญ่ 15 ไร่)',
            description: 'ทุเรียนหมอนทอง 300 ต้น อายุ 8 ปี - ระยะขยายขนาดผล',
            location: {
                lat: 12.6112,
                lng: 101.4234,
                rawInput: '12.6112, 101.4234',
                name: 'อ.ขลุง จันทบุรี'
            },
            tasks: [
                { id: 't1', title: 'ตัดแต่งดอกทุเรียน (เลือกตำแหน่งกิ่งเหมาะสม)', status: 'done', startDate: '2026-04-01', completedAt: '2026-04-01' },
                { id: 't2', title: 'โยงกิ่งและผูกเชือกโยงลูกทุเรียนรับน้ำหนัก', status: 'doing', startDate: '2026-04-02', completedAt: null },
                { id: 't3', title: 'ใส่ปุ๋ยสูตร 13-13-21 ขยายขนาดผลและเพิ่มความหวาน', status: 'todo', startDate: '2026-04-05', completedAt: null },
                { id: 't4', title: 'พ่นสารป้องกันเพลี้ยแป้งและราดำที่ขั้วผล', status: 'todo', startDate: '2026-04-10', completedAt: null }
            ],
            items: [
                { id: 'i1', name: 'ปุ๋ยเคมี สูตร 13-13-21', category: 'ปุ๋ย', qty: '10 กระสอบ', purchaseDate: '2026-04-01', outOfStock: false },
                { id: 'i2', name: 'เชือกฟางโยงกิ่งเกรด A', category: 'อุปกรณ์', qty: '5 ม้วน', purchaseDate: '2026-04-02', outOfStock: false },
                { id: 'i3', name: 'สารป้องกันกำจัดหนอนเจาะเมล็ดทุเรียน', category: 'ยา', qty: '2 แกลลอน', purchaseDate: '2026-04-03', outOfStock: true }
            ],
            finances: [
                { id: 'f1', type: 'expense', title: 'ซื้อปุ๋ยเคมี สูตร 13-13-21 (10 กระสอบ)', amount: 14500, linkedItemId: null },
                { id: 'f2', type: 'expense', title: 'ซื้อเชือกฟางโยงกิ่งเกรด A (5 ม้วน)', amount: 850, linkedItemId: null },
                { id: 'f3', type: 'expense', title: 'ซื้อสารป้องกันกำจัดหนอนเจาะเมล็ดทุเรียน', amount: 2400, linkedItemId: null },
                { id: 'f4', type: 'expense', title: 'ค่าน้ำมันเชื้อเพลิงปั๊มน้ำรดน้ำสวน', amount: 3500, linkedItemId: null },
                { id: 'f5', type: 'income', title: 'มัดจำการตัดทุเรียนล้งลอตแรก (เหมาสวน)', amount: 150000, linkedItemId: null }
            ]
        },
        {
            id: 'g2',
            name: 'แปลงก้านยาว & มูซังคิง (สวนใหม่ 8 ไร่)',
            description: 'ทุเรียนก้านยาวและมูซังคิง 150 ต้น อายุ 4 ปี - ระยะสะสมอาหารทำดอก',
            location: {
                lat: 12.6823,
                lng: 101.2755,
                rawInput: '12.6823, 101.2755',
                name: 'อ.แกลง ระยอง'
            },
            tasks: [
                { id: 't5', title: 'พ่นสะสมอาหาร สูตร 8-24-24 ทางใบ', status: 'done', startDate: '2026-04-01', completedAt: '2026-04-02' },
                { id: 't6', title: 'โชกน้ำกระตุ้นการออกดอก (ดักโศก)', status: 'doing', startDate: '2026-04-03', completedAt: null },
                { id: 't7', title: 'ตรวจเช็กระบบสปริงเกลอร์และท่อน้ำ', status: 'todo', startDate: '2026-04-04', completedAt: null }
            ],
            items: [
                { id: 'i4', name: 'ปุ๋ยทางใบสูตรสะสมอาหาร 8-24-24', category: 'ปุ๋ย', qty: '3 ถุง', purchaseDate: '2026-04-01', outOfStock: false },
                { id: 'i5', name: 'มินิสปริงเกลอร์ชดเชยแรงดัน', category: 'ท่อ', qty: '50 หัว', purchaseDate: '2026-04-02', outOfStock: false }
            ],
            finances: [
                { id: 'f6', type: 'expense', title: 'ซื้อปุ๋ยทางใบสะสมอาหาร 8-24-24', amount: 3200, linkedItemId: null },
                { id: 'f7', type: 'expense', title: 'ซื้อหัวมินิสปริงเกลอร์', amount: 650, linkedItemId: null },
                { id: 'f8', type: 'income', title: 'ขายกิ่งพันธุ์ทุเรียนมูซังคิง', amount: 18000, linkedItemId: null }
            ]
        }
    ];
    activeGardenId = 'g1';
}

function renderGardenList() {
    const container = document.getElementById('garden-list-container');
    container.innerHTML = '';

    renderGardensPendingSummary();

    if (gardens.length === 0) {
        container.innerHTML = `<span class="text-xs text-gray-400 italic font-medium">ยังไม่มีข้อมูลสวน</span>`;
        return;
    }

    gardens.forEach((garden, index) => {
        const isActive = garden.id === activeGardenId;
        const card = document.createElement('div');
        card.draggable = true;
        card.dataset.index = index;
        card.title = garden.name;
        card.className = `px-4 py-2 rounded-2xl cursor-grab active:cursor-grabbing transition flex items-center gap-2 shrink-0 text-xs font-bold whitespace-nowrap border ${
            isActive 
                ? 'bg-[#0F4C81] text-white border-[#0F4C81] shadow-md shadow-blue-200' 
                : 'bg-white hover:bg-blue-50/50 text-[#06172E] border-blue-100'
        }`;

        card.innerHTML = `
            <i class="fa-solid fa-grip-vertical text-[10px] opacity-40 mr-0.5 hidden md:inline-block"></i>
            <i class="fa-solid fa-tree ${isActive ? 'text-[#B3DEF8]' : 'text-[#58A1D3]'} text-xs"></i>
            <span class="max-w-[150px] md:max-w-[200px] truncate">${escapeHtml(garden.name)}</span>
        `;

        card.onclick = () => {
            playClickSound();
            selectGarden(garden.id);
        };

        card.ondragstart = (e) => {
            draggedIndex = index;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        card.ondragend = () => {
            card.classList.remove('dragging');
            draggedIndex = null;
        };
        card.ondragover = (e) => e.preventDefault();
        card.ondrop = (e) => {
            e.preventDefault();
            if (draggedIndex !== null && draggedIndex !== index) {
                moveGardenPosition(draggedIndex, index);
            }
        };

        container.appendChild(card);
    });
}

function moveGardenPosition(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= gardens.length || toIndex < 0 || toIndex >= gardens.length) return;
    const movedGarden = gardens.splice(fromIndex, 1)[0];
    gardens.splice(toIndex, 0, movedGarden);
    saveToLocalStorage();
    renderGardenList();
    if (activeGardenId) renderHeaderActions();
}

function renderHeaderActions() {
    const headerActions = document.getElementById('header-actions');
    const currentIndex = gardens.findIndex(g => g.id === activeGardenId);
    
    if (currentIndex === -1) {
        headerActions.innerHTML = '';
        return;
    }

    headerActions.innerHTML = `
        <button onclick="playClickSound(); confirmDeleteGarden('${activeGardenId}')" class="soft-btn bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 border border-rose-100">
            <i class="fa-solid fa-trash text-xs"></i> <span class="hidden sm:inline">ลบสวน</span>
        </button>
    `;
}

function selectGarden(gardenId) {
    activeGardenId = gardenId;
    saveToLocalStorage();
    renderGardenList();
    
    const garden = gardens.find(g => g.id === gardenId);
    if (!garden) {
        renderEmptyState();
        return;
    }

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');

    document.getElementById('garden-title').innerHTML = `<span>${escapeHtml(garden.name)}</span> <i class="fa-solid fa-seedling text-[#0F4C81] text-base"></i>`;
    document.getElementById('garden-desc').innerText = garden.description || 'ไม่มีคำอธิบายเพิ่มเติม';
    
    renderHeaderActions();

    renderTasks(garden);
    renderItems(garden);
    renderFinances(garden);
    fetchGardenWeather(garden);
}

function renderEmptyState() {
    activeGardenId = null;
    saveToLocalStorage();
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('dashboard-content').classList.add('hidden');
    document.getElementById('garden-title').innerText = 'กรุณาเลือกหรือสร้างสวน';
    document.getElementById('garden-desc').innerText = 'รายละเอียดและภาพรวมการดำเนินงาน';
    document.getElementById('header-actions').innerHTML = '';
}

function renderTasks(garden) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    const todoCount = garden.tasks.filter(t => t.status === 'todo').length;
    const doingCount = garden.tasks.filter(t => t.status === 'doing').length;
    const doneCount = garden.tasks.filter(t => t.status === 'done').length;

    document.getElementById('stat-todo').innerText = todoCount;
    document.getElementById('stat-doing').innerText = doingCount;
    document.getElementById('stat-done').innerText = doneCount;

    renderGardensPendingSummary();

    const activeTasks = garden.tasks.filter(t => t.status !== 'done');

    if (activeTasks.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-xs text-[#58A1D3] font-semibold">ยังไม่มีขั้นตอนการทำงานที่ค้างอยู่ <br>(งานที่เสร็จแล้วสามารถตรวจสอบได้ที่ปุ่มประวัติงาน 🕒)</div>`;
        return;
    }

    activeTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'soft-card-sm p-3.5 flex items-center justify-between gap-3 hover:bg-blue-50/20 transition';
        
        let badgeClass = '';
        let statusBadge = '';
        
        if (task.status === 'todo') {
            badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
            statusBadge = `
                <span class="soft-badge px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1 shrink-0">
                    🔴 ยังไม่ทำ
                </span>`;
        } else if (task.status === 'doing') {
            badgeClass = 'bg-[#B3DEF8]/40 text-[#0F4C81] border-blue-200';
            statusBadge = `
                <span class="soft-badge px-2.5 py-1 text-[11px] font-semibold bg-[#B3DEF8]/40 text-[#0F4C81] border border-blue-200 flex items-center gap-1 shrink-0">
                    🟡 กำลังทำ
                </span>`;
        } else {
            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            statusBadge = `
                <span class="soft-badge px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 shrink-0">
                    🟢 เสร็จแล้ว
                </span>`;
        }

        const startDateText = task.startDate 
            ? `<div class="text-[10px] text-[#58A1D3] mt-0.5 font-medium">📅 เริ่มงาน: ${formatThaiDate(task.startDate)}</div>` 
            : '';

        item.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                ${statusBadge}
                <div class="min-w-0">
                    <span class="text-xs md:text-sm text-[#06172E] font-medium block truncate ${task.status === 'done' ? 'line-through text-gray-400' : ''}">${escapeHtml(task.title)}</span>
                    ${startDateText}
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <select onchange="playClickSound(); updateTaskStatus('${task.id}', this.value)" class="text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 text-[#0F4C81] font-medium bg-white focus:outline-none ${badgeClass}">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>🔴 ยังไม่ทำ</option>
                    <option value="doing" ${task.status === 'doing' ? 'selected' : ''}>🟡 กำลังทำ</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>🟢 เสร็จแล้ว</option>
                </select>
                <button onclick="playClickSound(); deleteTask('${task.id}')" class="text-gray-300 hover:text-rose-500 p-1.5 transition">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

function getItemCategoryBadge(category, isOutOfStock) {
    const opacityClass = isOutOfStock ? 'opacity-50 grayscale-[40%]' : '';
    switch (category) {
        case 'ปุ๋ย':
            return `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shrink-0 ${opacityClass}">🍃 ปุ๋ย</span>`;
        case 'อุปกรณ์':
            return `<span class="text-[10px] font-bold text-blue-700 bg-blue-100/90 border border-blue-300 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shrink-0 ${opacityClass}">🛠️ อุปกรณ์</span>`;
        case 'ท่อ':
            return `<span class="text-[10px] font-bold text-cyan-700 bg-cyan-100/90 border border-cyan-300 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shrink-0 ${opacityClass}">🚰 ท่อ</span>`;
        case 'ยา':
            return `<span class="text-[10px] font-bold text-amber-700 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shrink-0 ${opacityClass}">🧪 ยา</span>`;
        default:
            return category ? `<span class="text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shrink-0 ${opacityClass}">📦 ${escapeHtml(category)}</span>` : '';
    }
}

function filterItemsByCategory(category) {
    currentItemCategoryFilter = category;
    const garden = gardens.find(g => g.id === activeGardenId);
    if (garden) {
        renderItems(garden);
    }
}

function updateItemCategoryFilterUI(garden) {
    const counts = { 'all': 0, 'ปุ๋ย': 0, 'อุปกรณ์': 0, 'ท่อ': 0, 'ยา': 0 };
    if (garden && garden.items) {
        counts['all'] = garden.items.length;
        garden.items.forEach(item => {
            const cat = item.category || 'อุปกรณ์';
            if (counts[cat] !== undefined) {
                counts[cat]++;
            }
        });
    }

    const labels = {
        'all': `ทั้งหมด (${counts.all})`,
        'ปุ๋ย': `🍃 ปุ๋ย (${counts['ปุ๋ย']})`,
        'อุปกรณ์': `🛠️ อุปกรณ์ (${counts['อุปกรณ์']})`,
        'ท่อ': `🚰 ท่อ (${counts['ท่อ']})`,
        'ยา': `🧪 ยา (${counts['ยา']})`
    };

    const activeClasses = {
        'all': 'px-2.5 py-1 rounded-xl font-bold bg-[#0F4C81] text-white shadow-xs transition text-[11px] shrink-0',
        'ปุ๋ย': 'px-2.5 py-1 rounded-xl font-bold bg-emerald-600 text-white shadow-xs shadow-emerald-200 transition text-[11px] shrink-0',
        'อุปกรณ์': 'px-2.5 py-1 rounded-xl font-bold bg-blue-600 text-white shadow-xs shadow-blue-200 transition text-[11px] shrink-0',
        'ท่อ': 'px-2.5 py-1 rounded-xl font-bold bg-cyan-600 text-white shadow-xs shadow-cyan-200 transition text-[11px] shrink-0',
        'ยา': 'px-2.5 py-1 rounded-xl font-bold bg-amber-600 text-white shadow-xs shadow-amber-200 transition text-[11px] shrink-0'
    };

    const inactiveClasses = {
        'all': 'px-2.5 py-1 rounded-xl font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-[11px] shrink-0',
        'ปุ๋ย': 'px-2.5 py-1 rounded-xl font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition text-[11px] shrink-0',
        'อุปกรณ์': 'px-2.5 py-1 rounded-xl font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition text-[11px] shrink-0',
        'ท่อ': 'px-2.5 py-1 rounded-xl font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 transition text-[11px] shrink-0',
        'ยา': 'px-2.5 py-1 rounded-xl font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition text-[11px] shrink-0'
    };

    ['all', 'ปุ๋ย', 'อุปกรณ์', 'ท่อ', 'ยา'].forEach(cat => {
        const btn = document.getElementById(`item-filter-${cat}`);
        if (!btn) return;
        btn.innerText = labels[cat];
        btn.className = (cat === currentItemCategoryFilter) ? activeClasses[cat] : inactiveClasses[cat];
    });
}

function renderItems(garden) {
    const list = document.getElementById('item-list');
    list.innerHTML = '';

    updateItemCategoryFilterUI(garden);

    if (garden.items.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-xs text-[#58A1D3] font-semibold">ยังไม่มีรายการสิ่งที่ต้องใช้</div>`;
        return;
    }

    const filteredItems = currentItemCategoryFilter === 'all'
        ? garden.items
        : garden.items.filter(item => item.category === currentItemCategoryFilter);

    if (filteredItems.length === 0) {
        list.innerHTML = `<div class="text-center py-8 text-xs text-gray-400 font-semibold">ไม่พบรายการในหมวดหมู่ "${escapeHtml(currentItemCategoryFilter)}"</div>`;
        return;
    }

    filteredItems.forEach(item => {
        const isOutOfStock = Boolean(item.outOfStock);
        const el = document.createElement('div');
        el.className = `soft-card-sm p-3.5 flex justify-between items-center text-xs transition ${
            isOutOfStock ? 'bg-rose-50/40 border-rose-200' : ''
        }`;
        
        const dateText = item.purchaseDate 
            ? `<div class="text-[10px] ${isOutOfStock ? 'text-gray-400 line-through' : 'text-[#58A1D3]'} mt-0.5 font-medium">🛒 วันที่ซื้อ: ${formatThaiDate(item.purchaseDate)}</div>` 
            : '';

        const nameClass = isOutOfStock 
            ? 'font-bold text-gray-400 line-through block text-xs md:text-sm' 
            : 'font-bold text-[#06172E] block text-xs md:text-sm';

        const qtyClass = isOutOfStock 
            ? 'text-gray-400 font-medium text-[11px] line-through' 
            : 'text-[#58A1D3] font-medium text-[11px]';

        const stockBadge = isOutOfStock 
            ? `<span class="text-[10px] font-bold text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg inline-block ml-1">🔴 ของหมด (ต้องเติม)</span>` 
            : '';

        const categoryBadge = getItemCategoryBadge(item.category, isOutOfStock);

        const stockBtn = isOutOfStock
            ? `<button onclick="playClickSound(); toggleItemStock('${item.id}')" class="soft-btn text-xs px-3 py-1.5 font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1 shadow-sm shadow-rose-200" title="คลิกเมื่อเติมสิ่งของแล้ว">
                   <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> ของหมด
               </button>`
            : `<button onclick="playClickSound(); toggleItemStock('${item.id}')" class="soft-btn text-xs px-3 py-1.5 font-bold bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 flex items-center gap-1 transition" title="คลิกเพื่อแจ้งว่าของหมด">
                   <i class="fa-solid fa-box-open text-[10px]"></i> ของหมด
               </button>`;

        el.innerHTML = `
            <div class="min-w-0 pr-2">
                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                    ${categoryBadge}
                    <span class="${nameClass}">${escapeHtml(item.name)}</span>
                    ${stockBadge}
                </div>
                <span class="${qtyClass}">จำนวน: ${escapeHtml(item.qty)}</span>
                ${dateText}
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
                ${stockBtn}
                <button onclick="playClickSound(); deleteItem('${item.id}')" class="text-gray-300 hover:text-rose-500 p-1.5 transition" title="ลบรายการ">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `;
        list.appendChild(el);
    });
}

function renderFinances(garden) {
    const list = document.getElementById('finance-list');
    list.innerHTML = '';

    let totalIncome = 0;
    let totalExpense = 0;

    garden.finances.forEach(f => {
        if (f.type === 'income') totalIncome += Number(f.amount);
        if (f.type === 'expense') totalExpense += Number(f.amount);
    });

    const netBalance = totalIncome - totalExpense;

    document.getElementById('total-income').innerText = `${formatMoney(totalIncome)} ฿`;
    document.getElementById('total-expense').innerText = `${formatMoney(totalExpense)} ฿`;
    
    const netEl = document.getElementById('net-balance');
    if (netBalance > 0) {
        netEl.innerText = `+${formatMoney(netBalance)} ฿`;
        netEl.className = "text-xl md:text-2xl font-bold tracking-wide text-emerald-300";
    } else if (netBalance < 0) {
        netEl.innerText = `-${formatMoney(Math.abs(netBalance))} ฿`;
        netEl.className = "text-xl md:text-2xl font-bold tracking-wide text-rose-300";
    } else {
        netEl.innerText = `${formatMoney(netBalance)} ฿`;
        netEl.className = "text-xl md:text-2xl font-bold tracking-wide text-white";
    }

    if (garden.finances.length === 0) {
        list.innerHTML = `<div class="text-center py-8 text-xs text-[#58A1D3] font-semibold">ยังไม่มีประวัติรายรับ-รายจ่าย</div>`;
        return;
    }

    garden.finances.forEach(f => {
        const isIncome = f.type === 'income';
        const item = document.createElement('div');
        item.className = 'soft-card-sm p-3 flex items-center justify-between text-xs';
        
        const qtyText = f.qty ? `<span class="text-[10px] text-[#58A1D3] font-medium block">จำนวน: ${escapeHtml(f.qty)}</span>` : '';

        item.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                    <i class="fa-solid ${isIncome ? 'fa-plus' : 'fa-minus'} text-[10px]"></i>
                </div>
                <div class="min-w-0">
                    <span class="text-[#06172E] font-medium truncate block text-xs">${escapeHtml(f.title)}</span>
                    ${qtyText}
                </div>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
                <span class="text-xs font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}">
                    ${isIncome ? '+' : '-'}${formatMoney(f.amount)} ฿
                </span>
                <button onclick="playClickSound(); deleteFinance('${f.id}')" class="text-gray-300 hover:text-rose-500 p-1 transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

function switchMobileTab(tab) {
    currentMobileTab = tab;
    
    const btnTasks = document.getElementById('mtab-btn-tasks');
    const btnItems = document.getElementById('mtab-btn-items');
    const btnFinance = document.getElementById('mtab-btn-finance');

    const navTasks = document.getElementById('mnav-tasks');
    const navItems = document.getElementById('mnav-items');
    const navFinance = document.getElementById('mnav-finance');

    [btnTasks, btnItems, btnFinance].forEach(b => b.className = 'flex-1 py-2.5 rounded-xl text-center transition text-[#58A1D3] bg-transparent font-medium');
    [navTasks, navItems, navFinance].forEach(n => n.className = 'flex flex-col items-center gap-1 text-[#58A1D3]');

    const pTasks = document.getElementById('panel-tasks');
    const pItems = document.getElementById('panel-items');
    const pFinance = document.getElementById('panel-finance');

    if (window.innerWidth < 768) {
        pTasks.classList.add('hidden');
        pItems.classList.add('hidden');
        pFinance.classList.add('hidden');

        if (tab === 'tasks') {
            pTasks.classList.remove('hidden');
            btnTasks.className = 'flex-1 py-2.5 rounded-xl text-center transition bg-[#0F4C81] text-white font-bold shadow-sm shadow-blue-200';
            navTasks.className = 'flex flex-col items-center gap-1 text-[#0F4C81] font-bold';
        } else if (tab === 'items') {
            pItems.classList.remove('hidden');
            btnItems.className = 'flex-1 py-2.5 rounded-xl text-center transition bg-[#0F4C81] text-white font-bold shadow-sm shadow-blue-200';
            navItems.className = 'flex flex-col items-center gap-1 text-[#0F4C81] font-bold';
        } else if (tab === 'finance') {
            pFinance.classList.remove('hidden');
            btnFinance.className = 'flex-1 py-2.5 rounded-xl text-center transition bg-[#0F4C81] text-white font-bold shadow-sm shadow-blue-200';
            navFinance.className = 'flex flex-col items-center gap-1 text-[#0F4C81] font-bold';
        }
    } else {
        pTasks.classList.remove('hidden');
        pItems.classList.remove('hidden');
        pFinance.classList.remove('hidden');
    }
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        document.getElementById('panel-tasks').classList.remove('hidden');
        document.getElementById('panel-items').classList.remove('hidden');
        document.getElementById('panel-finance').classList.remove('hidden');
    } else {
        switchMobileTab(currentMobileTab);
    }
});

function handleAddGarden(e) {
    e.preventDefault();
    const name = document.getElementById('garden-name-input').value.trim();
    const desc = document.getElementById('garden-desc-input').value.trim();
    const locInput = document.getElementById('garden-location-input-new') ? document.getElementById('garden-location-input-new').value.trim() : '';

    if (!name) return;

    let parsedLoc = parseGoogleMapsLocation(locInput);
    if (!parsedLoc) {
        parsedLoc = { lat: 12.6112, lng: 101.4234, rawInput: '12.6112, 101.4234', name: 'จันทบุรี / ระยอง' };
    } else {
        parsedLoc.rawInput = locInput;
        parsedLoc.name = 'พิกัดสวน';
    }

    const newGarden = {
        id: 'g_' + Date.now(),
        name: name,
        description: desc,
        location: parsedLoc,
        tasks: [],
        items: [],
        finances: []
    };

    gardens.push(newGarden);
    saveToLocalStorage();
    closeModal('modal-add-garden');
    document.getElementById('garden-name-input').value = '';
    document.getElementById('garden-desc-input').value = '';
    if (document.getElementById('garden-location-input-new')) {
        document.getElementById('garden-location-input-new').value = '';
    }

    selectGarden(newGarden.id);
}

function handleAddTask(e) {
    e.preventDefault();
    if (!activeGardenId) return;

    const title = document.getElementById('task-title-input').value.trim();
    const startDate = document.getElementById('task-start-date-input').value;
    const status = document.getElementById('task-status-input').value;

    if (!title) return;

    const garden = gardens.find(g => g.id === activeGardenId);
    const todayStr = new Date().toISOString().split('T')[0];

    garden.tasks.push({
        id: 't_' + Date.now(),
        title: title,
        startDate: startDate || todayStr,
        status: status,
        completedAt: status === 'done' ? todayStr : null
    });

    saveToLocalStorage();
    closeModal('modal-add-task');
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-start-date-input').value = todayStr;
    renderTasks(garden);
}

function handleAddItem(e) {
    e.preventDefault();
    if (!activeGardenId) return;

    const name = document.getElementById('item-name-input').value.trim();
    const category = document.getElementById('item-category-input').value;
    const qty = document.getElementById('item-qty-input').value.trim();
    const purchaseDate = document.getElementById('item-purchase-date').value;

    if (!name || !qty || !purchaseDate) return;

    const garden = gardens.find(g => g.id === activeGardenId);
    
    const newItemId = 'i_' + Date.now();
    garden.items.push({
        id: newItemId,
        name: name,
        category: category || 'อุปกรณ์',
        qty: qty,
        purchaseDate: purchaseDate,
        outOfStock: false
    });

    saveToLocalStorage();
    closeModal('modal-add-item');
    document.getElementById('item-name-input').value = '';
    document.getElementById('item-category-input').value = 'ปุ๋ย';
    document.getElementById('item-qty-input').value = '';
    
    renderItems(garden);
}

function handleAddFinance(e) {
    e.preventDefault();
    if (!activeGardenId) return;

    const type = document.getElementById('finance-type-input').value;
    const title = document.getElementById('finance-title-input').value.trim();
    const qty = document.getElementById('finance-qty-input').value.trim();
    const amount = parseFloat(document.getElementById('finance-amount-input').value) || 0;

    if (!title || amount <= 0) return;

    const garden = gardens.find(g => g.id === activeGardenId);
    garden.finances.push({
        id: 'f_' + Date.now(),
        type: type,
        title: title,
        qty: qty,
        amount: amount,
        linkedItemId: null
    });

    saveToLocalStorage();
    closeModal('modal-add-finance');
    document.getElementById('finance-title-input').value = '';
    document.getElementById('finance-qty-input').value = '';
    document.getElementById('finance-amount-input').value = '';

    renderFinances(garden);
}

function renderGardensPendingSummary() {
    const summaryContainer = document.getElementById('all-gardens-pending-summary');
    if (!summaryContainer) return;
    summaryContainer.innerHTML = '';

    if (gardens.length === 0) {
        summaryContainer.innerHTML = `<div class="col-span-full text-center py-4 text-xs text-[#58A1D3] font-medium">ยังไม่มีแปลงทุเรียนในระบบ</div>`;
        return;
    }

    gardens.forEach((garden, index) => {
        const pendingCount = garden.tasks ? garden.tasks.filter(t => t.status !== 'done').length : 0;
        const isSelected = garden.id === activeGardenId;

        const card = document.createElement('div');
        card.className = `soft-card-sm p-3 flex items-center justify-between gap-3 cursor-pointer transition border ${
            isSelected ? 'border-[#0F4C81] bg-[#B3DEF8]/20 shadow-sm' : 'border-blue-100 hover:bg-blue-50/40'
        }`;

        card.onclick = () => {
            playClickSound();
            selectGarden(garden.id);
        };

        card.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    ${index + 1}
                </div>
                <div class="min-w-0">
                    <span class="text-xs font-bold text-[#06172E] block truncate">${escapeHtml(garden.name)}</span>
                    <span class="text-[10px] text-[#58A1D3]">คลิกเพื่อดูรายละเอียด</span>
                </div>
            </div>
            <div class="shrink-0 text-right">
                <span class="px-2.5 py-1 rounded-xl text-xs font-bold ${pendingCount > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}">
                    ${pendingCount} งาน
                </span>
            </div>
        `;
        summaryContainer.appendChild(card);
    });
}

function updateTaskStatus(taskId, newStatus) {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;
    const task = garden.tasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        if (newStatus === 'done') {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            task.completedAt = `${year}-${month}-${day}`;
        } else {
            task.completedAt = null;
        }
        saveToLocalStorage();
        renderTasks(garden);
    }
}

function deleteTask(taskId) {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;
    garden.tasks = garden.tasks.filter(t => t.id !== taskId);
    saveToLocalStorage();
    renderTasks(garden);
}

function deleteItem(itemId) {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;
    garden.items = garden.items.filter(i => i.id !== itemId);
    saveToLocalStorage();
    renderItems(garden);
}

function toggleItemStock(itemId) {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;
    const item = garden.items.find(i => i.id === itemId);
    if (item) {
        item.outOfStock = !item.outOfStock;
        saveToLocalStorage();
        renderItems(garden);
    }
}

function deleteFinance(financeId) {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;
    garden.finances = garden.finances.filter(f => f.id !== financeId);
    saveToLocalStorage();
    renderFinances(garden);
}

function openTaskHistoryModal() {
    if (!activeGardenId) return;
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;

    const listContainer = document.getElementById('task-history-list');
    listContainer.innerHTML = '';

    const completedTasks = garden.tasks.filter(t => t.status === 'done');

    if (completedTasks.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-8 text-xs text-[#58A1D3] font-semibold">ยังไม่มีประวัติงานที่ทำเสร็จแล้วในสวนนี้</div>`;
    } else {
        completedTasks.forEach(task => {
            const el = document.createElement('div');
            el.className = 'soft-card-sm p-3.5 flex items-center justify-between text-xs';
            const dateFormatted = task.completedAt ? formatThaiDate(task.completedAt) : 'ไม่ระบุวันที่';
            const startFormatted = task.startDate ? formatThaiDate(task.startDate) : '-';
            el.innerHTML = `
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="soft-badge px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 shrink-0">
                        🟢 เสร็จแล้ว
                    </span>
                    <div class="min-w-0">
                        <span class="text-[#06172E] font-medium block truncate text-xs md:text-sm">${escapeHtml(task.title)}</span>
                        <span class="text-[10px] text-[#58A1D3]">เริ่ม: ${startFormatted}</span>
                    </div>
                </div>
                <div class="text-[11px] text-[#58A1D3] font-semibold shrink-0">
                    📅 เสร็จ: ${dateFormatted}
                </div>
            `;
            listContainer.appendChild(el);
        });
    }

    openModal('modal-task-history');
}

function confirmResetTasks() {
    showConfirmDialog(
        'รีเซ็ตขั้นตอนการทำงาน',
        'คุณแน่ใจหรือไม่ว่าต้องการลบขั้นตอนการทำงานทั้งหมดในสวนนี้?',
        () => {
            const garden = gardens.find(g => g.id === activeGardenId);
            if (garden) {
                garden.tasks = [];
                saveToLocalStorage();
                renderTasks(garden);
            }
        }
    );
}

function confirmResetItems() {
    showConfirmDialog(
        'รีเซ็ตสิ่งที่มีไว้ใช้ในสวน',
        'คุณแน่ใจหรือไม่ว่าต้องการลบรายการสิ่งของทั้งหมดในสวนนี้?',
        () => {
            const garden = gardens.find(g => g.id === activeGardenId);
            if (garden) {
                garden.items = [];
                saveToLocalStorage();
                renderItems(garden);
            }
        }
    );
}

function confirmResetFinance() {
    showConfirmDialog(
        'รีเซ็ตรายรับ-รายจ่าย',
        'คุณแน่ใจหรือไม่ว่าต้องการลบรายการรายรับ-รายจ่ายทั้งหมดในสวนนี้?',
        () => {
            const garden = gardens.find(g => g.id === activeGardenId);
            if (garden) {
                garden.finances = [];
                saveToLocalStorage();
                renderFinances(garden);
            }
        }
    );
}

function confirmDeleteGarden(gardenId) {
    const garden = gardens.find(g => g.id === gardenId);
    if (!garden) return;

    showConfirmDialog(
        `ลบข้อมูล "${garden.name}"`,
        'คุณแน่ใจหรือไม่ว่าต้องการลบสวนนี้รวมถึงขั้นตอนและบัญชีทั้งหมด?',
        () => {
            gardens = gardens.filter(g => g.id !== gardenId);
            saveToLocalStorage();
            if (gardens.length > 0) {
                selectGarden(gardens[0].id);
            } else {
                renderGardenList();
                renderEmptyState();
            }
        }
    );
}

function openAddGardenModal() { openModal('modal-add-garden'); }
function openAddTaskModal() { 
    if (activeGardenId) {
        const todayIso = new Date().toISOString().split('T')[0];
        const taskDateInput = document.getElementById('task-start-date-input');
        if (taskDateInput) taskDateInput.value = todayIso;
        openModal('modal-add-task'); 
    }
}
function openAddItemModal() { 
    if (activeGardenId) {
        const todayIso = new Date().toISOString().split('T')[0];
        const itemDateInput = document.getElementById('item-purchase-date');
        if (itemDateInput) itemDateInput.value = todayIso;
        openModal('modal-add-item'); 
    }
}

function openAddFinanceModal(type) {
    if (!activeGardenId) return;
    document.getElementById('finance-type-input').value = type;
    const titleEl = document.getElementById('finance-modal-title');
    const btnEl = document.getElementById('finance-submit-btn');

    if (type === 'income') {
        titleEl.innerText = 'บันทึกรายรับ (+)';
        btnEl.className = 'soft-btn text-xs px-5 py-2.5 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200';
    } else {
        titleEl.innerText = 'บันทึกรายจ่าย (-)';
        btnEl.className = 'soft-btn text-xs px-5 py-2.5 font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-200';
    }
    openModal('modal-add-finance');
}

function showConfirmDialog(title, message, onConfirm) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    
    const actionBtn = document.getElementById('confirm-action-btn');
    actionBtn.onclick = () => {
        onConfirm();
        closeModal('modal-confirm');
    };

    openModal('modal-confirm');
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function formatMoney(amount) {
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatThaiDate(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0]) + 543;
            const m = parseInt(parts[1]);
            const d = parseInt(parts[2]);
            const thaiMonthsShort = [
                '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
            ];
            return `${d} ${thaiMonthsShort[m]} ${y}`;
        }
    } catch(e) {}
    return dateStr;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

/* ========================================================
   Weather Module (Open-Meteo Real-time & Forecast 1-2 Days)
   ======================================================== */

let weatherCache = {};

function parseGoogleMapsLocation(input) {
    if (!input || typeof input !== 'string') return null;
    const str = input.trim();
    
    // Direct "lat, lng" e.g. "12.6112, 101.4234"
    let m = str.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[3]) };
    
    // @lat,lng in google maps URLs
    m = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    
    // ?q=lat,lng or &q=lat,lng
    m = str.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // ll=lat,lng
    m = str.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // search/lat,lng
    m = str.match(/search\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    return null;
}

function getWeatherInfo(code) {
    if (code === 0) return { label: 'แดดจัด ฟ้าโปร่ง', icon: 'fa-solid fa-sun text-amber-500', bg: 'bg-amber-50/50 border-amber-200/80', badge: 'text-amber-700 bg-amber-100/80' };
    if (code === 1 || code === 2) return { label: 'มีเมฆบางส่วน', icon: 'fa-solid fa-cloud-sun text-sky-500', bg: 'bg-sky-50/50 border-sky-200/80', badge: 'text-sky-700 bg-sky-100/80' };
    if (code === 3) return { label: 'เมฆครึ้ม', icon: 'fa-solid fa-cloud text-gray-500', bg: 'bg-gray-50/70 border-gray-200/80', badge: 'text-gray-700 bg-gray-100' };
    if (code >= 45 && code <= 48) return { label: 'มีหมอกบาง', icon: 'fa-solid fa-smog text-slate-400', bg: 'bg-slate-50 border-slate-200', badge: 'text-slate-700 bg-slate-100' };
    if (code >= 51 && code <= 55) return { label: 'ฝนละอองโปรยปราย', icon: 'fa-solid fa-cloud-rain text-blue-400', bg: 'bg-blue-50/60 border-blue-200', badge: 'text-blue-700 bg-blue-100' };
    if (code >= 61 && code <= 65) return { label: 'ฝนตกปานกลาง', icon: 'fa-solid fa-cloud-showers-heavy text-blue-600', bg: 'bg-blue-50 border-blue-300', badge: 'text-blue-800 bg-blue-100' };
    if (code >= 80 && code <= 82) return { label: 'ฝนตกชุก/หนัก', icon: 'fa-solid fa-cloud-showers-water text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', badge: 'text-indigo-800 bg-indigo-100' };
    if (code >= 95) return { label: 'พายุฟ้าคะนอง', icon: 'fa-solid fa-cloud-bolt text-rose-500', bg: 'bg-rose-50 border-rose-200', badge: 'text-rose-800 bg-rose-100' };
    return { label: 'สภาพอากาศทั่วไป', icon: 'fa-solid fa-cloud-sun text-blue-400', bg: 'bg-blue-50/50 border-blue-200', badge: 'text-blue-700 bg-blue-100' };
}

function getDurianAdvice(current, forecastDay1, forecastDay2) {
    if (!current) return 'หมั่นตรวจเช็กระบบน้ำและสุขภาพใบอย่างสม่ำเสมอ';
    const rainProbTomorrow = forecastDay1?.precipitation_probability_max || 0;
    const rainSumTomorrow = forecastDay1?.precipitation_sum || 0;
    const windSpeed = current.wind_speed_10m || 0;
    const tempNow = current.temperature_2m || 0;

    if (rainProbTomorrow >= 60 || rainSumTomorrow >= 10) {
        return `⚠️ วันพรุ่งนี้มีโอกาสเกิดฝนตกสูง (${rainProbTomorrow}% / ${rainSumTomorrow} มม.) ควรงดพ่นปุ๋ยหรือสารเคมีทางใบ เพื่อป้องกันฝนชะล้าง`;
    }
    if (windSpeed >= 25) {
        return `💨 ลมกระโชกแรง (${windSpeed} กม./ชม.) ควรตรวจเช็กเชือกโยงกิ่งและค้ำยันลูกทุเรียนรับน้ำหนัก ป้องกันกิ่งฉีกหัก`;
    }
    if (tempNow >= 36) {
        return `☀️ อุณหภูมิสูงจัด (${tempNow}°C) ควรให้น้ำเพียงพอในตอนเช้าตรู่ และระวังการขาดน้ำที่ส่งผลต่อการเจริญเติบโตของผลทุเรียน`;
    }
    if (current.relative_humidity_2m >= 85 && (current.weather_code >= 51 || rainProbTomorrow >= 40)) {
        return `💧 ความชื้นในอากาศสูง (${current.relative_humidity_2m}%) ระวังการสะสมของเชื้อราใบติดและโรคผลเน่า`;
    }
    return `🌿 สภาพอากาศค่อนข้างแจ่มใส เหมาะสำหรับการฉีดพ่นปุ๋ยบำรุง ตรวจเช็กระบบสปริงเกลอร์ และตัดแต่งดูแลทรงพุ่ม`;
}

async function fetchGardenWeather(garden, forceRefresh = false) {
    if (!garden) return;

    if (!garden.location || !garden.location.lat || !garden.location.lng) {
        garden.location = {
            lat: 12.6112,
            lng: 101.4234,
            rawInput: '12.6112, 101.4234',
            name: 'จันทบุรี / ระยอง'
        };
        saveToLocalStorage();
    }

    const { lat, lng } = garden.location;
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

    const coordsBadge = document.getElementById('weather-coords-text');
    if (coordsBadge) {
        coordsBadge.innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)} (${garden.location.name || 'พิกัดสวน'})`;
    }

    const now = Date.now();
    if (!forceRefresh && weatherCache[cacheKey] && (now - weatherCache[cacheKey].timestamp < 600000)) {
        renderWeatherUI(weatherCache[cacheKey].data, garden);
        return;
    }

    const gridEl = document.getElementById('weather-content-grid');
    if (gridEl && (!weatherCache[cacheKey] || forceRefresh)) {
        gridEl.innerHTML = `
            <div class="col-span-full py-8 text-center text-xs text-[#58A1D3] font-semibold flex flex-col items-center justify-center gap-2">
                <i class="fa-solid fa-cloud-arrow-down fa-bounce text-[#0F4C81] text-2xl"></i>
                <span>กำลังดึงข้อมูลสภาพอากาศ Real-time และพยากรณ์ล่วงหน้า 1-2 วันจาก Open-Meteo...</span>
            </div>
        `;
    }

    const refreshIcon = document.getElementById('weather-refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=3`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
        const data = await res.json();

        weatherCache[cacheKey] = {
            timestamp: now,
            data: data
        };

        renderWeatherUI(data, garden);
    } catch (err) {
        console.error('Failed to load weather:', err);
        if (gridEl) {
            gridEl.innerHTML = `
                <div class="col-span-full py-4 text-center text-xs text-rose-500 font-semibold bg-rose-50/80 rounded-2xl border border-rose-200 p-4">
                    <i class="fa-solid fa-triangle-exclamation mr-1 text-sm"></i> ไม่สามารถติดต่อ Open-Meteo API ได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตหรือลองกดรีเฟรชใหม่อีกครั้ง
                </div>
            `;
        }
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    }
}

function renderWeatherUI(data, garden) {
    const gridEl = document.getElementById('weather-content-grid');
    if (!gridEl || !data || !data.current || !data.daily) return;

    const current = data.current;
    const daily = data.daily;

    const curInfo = getWeatherInfo(current.weather_code);
    const day1Info = getWeatherInfo(daily.weather_code[1]);
    const day2Info = getWeatherInfo(daily.weather_code[2]);

    const formatShortDay = (dateStr) => {
        if (!dateStr) return '';
        try {
            const p = dateStr.split('-');
            const m = parseInt(p[1]);
            const d = parseInt(p[2]);
            const thaiMonthsShort = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            return `${d} ${thaiMonthsShort[m]}`;
        } catch(e) {
            return dateStr;
        }
    };

    const day1DateStr = formatShortDay(daily.time[1]);
    const day2DateStr = formatShortDay(daily.time[2]);

    gridEl.innerHTML = `
        <!-- Card 1: Real-time Weather (ตอนนี้) -->
        <div class="soft-card-sm p-3.5 border transition ${curInfo.bg} relative overflow-hidden flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${curInfo.badge} flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> สภาพอากาศตอนนี้ (Real-time)
                    </span>
                    <span class="text-[10px] font-semibold text-gray-400">วันนี้</span>
                </div>
                <div class="flex items-center gap-3 my-2">
                    <div class="text-3xl text-center shrink-0">
                        <i class="${curInfo.icon}"></i>
                    </div>
                    <div>
                        <div class="text-xl md:text-2xl font-bold text-[#06172E] leading-tight">
                            ${current.temperature_2m}°C
                        </div>
                        <div class="text-xs font-semibold text-[#0F4C81]">${curInfo.label}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-1 pt-2 border-t border-blue-100/80 text-[10px] text-gray-600 font-medium text-center">
                <div title="ความชื้นสัมพัทธ์"><i class="fa-solid fa-droplet text-sky-500"></i> ${current.relative_humidity_2m}%</div>
                <div title="ความเร็วลม"><i class="fa-solid fa-wind text-teal-500"></i> ${current.wind_speed_10m} <span class="text-[9px]">กม./ชม.</span></div>
                <div title="ปริมาณฝนสะสม"><i class="fa-solid fa-cloud-rain text-blue-500"></i> ${current.precipitation || 0} <span class="text-[9px]">มม.</span></div>
            </div>
        </div>

        <!-- Card 2: Forecast 1 Day Ahead (พรุ่งนี้) -->
        <div class="soft-card-sm p-3.5 border transition ${day1Info.bg} relative overflow-hidden flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${day1Info.badge} flex items-center gap-1">
                        <i class="fa-regular fa-calendar-check text-[10px]"></i> พยากรณ์ล่วงหน้า 1 วัน
                    </span>
                    <span class="text-[10px] font-bold text-[#0F4C81]">พรุ่งนี้ (${day1DateStr})</span>
                </div>
                <div class="flex items-center gap-3 my-2">
                    <div class="text-3xl text-center shrink-0">
                        <i class="${day1Info.icon}"></i>
                    </div>
                    <div>
                        <div class="text-base md:text-lg font-bold text-[#06172E] leading-tight">
                            ${daily.temperature_2m_min[1]}°C - ${daily.temperature_2m_max[1]}°C
                        </div>
                        <div class="text-xs font-semibold text-[#0F4C81]">${day1Info.label}</div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-blue-100/80 text-[10px] text-gray-600 font-medium">
                <div><i class="fa-solid fa-umbrella text-indigo-500"></i> โอกาสฝน: <strong class="text-indigo-700">${daily.precipitation_probability_max[1]}%</strong></div>
                <div><i class="fa-solid fa-cloud-rain text-blue-500"></i> ปริมาณ: <strong>${daily.precipitation_sum[1]} มม.</strong></div>
            </div>
        </div>

        <!-- Card 3: Forecast 2 Days Ahead (มะรืนนี้) -->
        <div class="soft-card-sm p-3.5 border transition ${day2Info.bg} relative overflow-hidden flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${day2Info.badge} flex items-center gap-1">
                        <i class="fa-regular fa-calendar-days text-[10px]"></i> พยากรณ์ล่วงหน้า 2 วัน
                    </span>
                    <span class="text-[10px] font-bold text-[#0F4C81]">มะรืนนี้ (${day2DateStr})</span>
                </div>
                <div class="flex items-center gap-3 my-2">
                    <div class="text-3xl text-center shrink-0">
                        <i class="${day2Info.icon}"></i>
                    </div>
                    <div>
                        <div class="text-base md:text-lg font-bold text-[#06172E] leading-tight">
                            ${daily.temperature_2m_min[2]}°C - ${daily.temperature_2m_max[2]}°C
                        </div>
                        <div class="text-xs font-semibold text-[#0F4C81]">${day2Info.label}</div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-blue-100/80 text-[10px] text-gray-600 font-medium">
                <div><i class="fa-solid fa-umbrella text-indigo-500"></i> โอกาสฝน: <strong class="text-indigo-700">${daily.precipitation_probability_max[2]}%</strong></div>
                <div><i class="fa-solid fa-cloud-rain text-blue-500"></i> ปริมาณ: <strong>${daily.precipitation_sum[2]} มม.</strong></div>
            </div>
        </div>
    `;

    // Advice text
    const tipEl = document.getElementById('weather-advice-text');
    if (tipEl) {
        tipEl.innerHTML = `<strong>คำแนะนำดูแลสวนทุเรียน:</strong> ` + getDurianAdvice(current, {
            precipitation_probability_max: daily.precipitation_probability_max[1],
            precipitation_sum: daily.precipitation_sum[1]
        }, {
            precipitation_probability_max: daily.precipitation_probability_max[2],
            precipitation_sum: daily.precipitation_sum[2]
        });
    }
}

function refreshGardenWeather() {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (garden) {
        fetchGardenWeather(garden, true);
    }
}

function openEditLocationModal() {
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;

    const input = document.getElementById('garden-location-input');
    if (input) {
        input.value = garden.location?.rawInput || (garden.location ? `${garden.location.lat}, ${garden.location.lng}` : '');
    }
    openModal('modal-edit-garden-location');
}

function handleSaveGardenLocation(e) {
    e.preventDefault();
    const garden = gardens.find(g => g.id === activeGardenId);
    if (!garden) return;

    const val = document.getElementById('garden-location-input').value.trim();
    if (!val) return;

    const parsed = parseGoogleMapsLocation(val);
    if (!parsed) {
        alert('กรุณากรอกตัวเลขพิกัดที่ถูกต้อง เช่น 12.6112, 101.4234 หรือลิงก์ Google Maps ที่มีพิกัด');
        return;
    }

    parsed.rawInput = val;
    parsed.name = 'พิกัดสวนที่กำหนดเอง';
    garden.location = parsed;
    saveToLocalStorage();

    closeModal('modal-edit-garden-location');
    fetchGardenWeather(garden, true);
}

function useCurrentLocationGPS() {
    if (!navigator.geolocation) {
        alert('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
        return;
    }

    const input = document.getElementById('garden-location-input');
    if (input) input.placeholder = 'กำลังตรวจหาพิกัด GPS ปัจจุบันของคุณ...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(4);
            const lng = position.coords.longitude.toFixed(4);
            if (input) {
                input.value = `${lat}, ${lng}`;
            }
        },
        (error) => {
            alert('ไม่สามารถดึงพิกัดได้: ' + (error.message || 'กรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้งในเบราว์เซอร์'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

/* ========================================================
   Google Sheets & Apps Script Sync Module
   ======================================================== */

const APPS_SCRIPT_CODE_TEMPLATE = `/**
 * Durian Smart Garden - Google Apps Script (Code.gs)
 * วางโค้ดนี้ลงใน Apps Script แล้วกด Deploy เป็น Web App
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'get';
  if (action === 'get') {
    return handleGetData();
  }
  return createResponse({ status: 'success', message: 'API is running' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload' });
    }
    var payload = JSON.parse(e.postData.contents);
    var gardens = payload.data || payload.gardens || payload;
    if (!Array.isArray(gardens)) {
      return createResponse({ status: 'error', message: 'Array expected' });
    }
    saveRawData(gardens);
    exportToFormattedSheets(gardens);
    return createResponse({
      status: 'success',
      message: 'ซิงค์ข้อมูลกับ Google Sheets สำเร็จ!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createResponse({ status: 'error', message: error.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveRawData(gardens) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('_DB_RawData');
  if (!sheet) {
    sheet = ss.insertSheet('_DB_RawData');
    sheet.hideSheet();
  }
  sheet.clear();
  sheet.getRange(1, 1).setValue(JSON.stringify(gardens));
  sheet.getRange(2, 1).setValue(new Date().toISOString());
}

function handleGetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('_DB_RawData');
  if (!sheet) return createResponse({ status: 'empty', data: [] });
  var jsonStr = sheet.getRange(1, 1).getValue();
  if (!jsonStr) return createResponse({ status: 'empty', data: [] });
  try {
    return createResponse({
      status: 'success',
      data: JSON.parse(jsonStr),
      updatedAt: sheet.getRange(2, 1).getValue()
    });
  } catch(e) {
    return createResponse({ status: 'error', message: 'Parse error' });
  }
}

function exportToFormattedSheets(gardens) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sGardens = getOrCreateSheet(ss, '🌳 แปลงสวนทุเรียน');
  sGardens.clear();
  sGardens.appendRow(['ID', 'ชื่อแปลงทุเรียน', 'คำอธิบาย', 'พิกัด GPS', 'ลิงก์ Google Maps', 'จำนวนขั้นตอน', 'จำนวนสิ่งของ', 'ยอดรายรับรวม (บาท)', 'ยอดรายจ่ายรวม (บาท)', 'กำไร/ขาดทุนสุทธิ']);
  formatHeaderRow(sGardens);
  
  var sTasks = getOrCreateSheet(ss, '📝 ขั้นตอนงานในสวน');
  sTasks.clear();
  sTasks.appendRow(['ชื่อแปลงสวน', 'ID งาน', 'ชื่องาน / กิจกรรม', 'วันที่เริ่มงาน', 'สถานะงาน', 'วันที่ทำเสร็จ']);
  formatHeaderRow(sTasks);
  
  var sItems = getOrCreateSheet(ss, '📦 สิ่งที่มีไว้ใช้ในสวน');
  sItems.clear();
  sItems.appendRow(['ชื่อแปลงสวน', 'ID สิ่งของ', 'หมวดหมู่', 'ชื่อสิ่งของ', 'จำนวน/หน่วย', 'วันที่ซื้อ', 'สถานะคงคลัง']);
  formatHeaderRow(sItems);
  
  var sFinance = getOrCreateSheet(ss, '💰 บันทึกการเงิน');
  sFinance.clear();
  sFinance.appendRow(['ชื่อแปลงสวน', 'ID ธุรกรรม', 'ประเภท (รายรับ/รายจ่าย)', 'รายการ', 'จำนวน/หน่วย', 'จำนวนเงิน (บาท)']);
  formatHeaderRow(sFinance);
  
  gardens.forEach(function(g) {
    var totalIncome = 0;
    var totalExpense = 0;
    if (g.finances) {
      g.finances.forEach(function(f) {
        if (f.type === 'income') totalIncome += Number(f.amount || 0);
        if (f.type === 'expense') totalExpense += Number(f.amount || 0);
      });
    }
    
    var coords = (g.location && g.location.lat && g.location.lng) 
      ? (g.location.lat + ', ' + g.location.lng) 
      : '-';
    var mapsUrl = (g.location && g.location.rawInput) ? g.location.rawInput : '-';
    
    sGardens.appendRow([
      g.id, g.name, g.description || '-', coords, mapsUrl,
      g.tasks ? g.tasks.length : 0,
      g.items ? g.items.length : 0,
      totalIncome, totalExpense, totalIncome - totalExpense
    ]);
    
    if (g.tasks && g.tasks.length > 0) {
      g.tasks.forEach(function(t) {
        var statusTh = t.status === 'done' ? 'เสร็จแล้ว' : (t.status === 'doing' ? 'กำลังทำ' : 'ยังไม่ทำ');
        sTasks.appendRow([g.name, t.id, t.title, t.startDate || '-', statusTh, t.completedAt || '-']);
      });
    }
    
    if (g.items && g.items.length > 0) {
      g.items.forEach(function(i) {
        var stockStatus = i.outOfStock ? '🔴 ของหมด (ต้องเติม)' : '🟢 มีของพร้อมใช้';
        sItems.appendRow([g.name, i.id, i.category || 'อุปกรณ์', i.name, i.qty, i.purchaseDate || '-', stockStatus]);
      });
    }
    
    if (g.finances && g.finances.length > 0) {
      g.finances.forEach(function(f) {
        var typeTh = f.type === 'income' ? 'รายรับ (+)' : 'รายจ่าย (-)';
        sFinance.appendRow([g.name, f.id, typeTh, f.title, f.qty || '-', Number(f.amount || 0)]);
      });
    }
  });
  
  [sGardens, sTasks, sItems, sFinance].forEach(function(sheet) {
    sheet.autoResizeColumns(1, sheet.getLastColumn() || 1);
  });
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function formatHeaderRow(sheet) {
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1);
  range.setBackground('#0F4C81');
  range.setFontColor('#FFFFFF');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
}`;

function openSheetsSyncModal() {
    const savedUrl = localStorage.getItem('smart_gardens_sheets_url') || '';
    const urlInput = document.getElementById('sheets-webapp-url-input');
    if (urlInput) urlInput.value = savedUrl;

    updateSheetsSyncStatusUI();

    const codeBlock = document.getElementById('apps-script-code-block');
    if (codeBlock) {
        codeBlock.textContent = APPS_SCRIPT_CODE_TEMPLATE;
    }

    const msgEl = document.getElementById('sheets-sync-status-msg');
    if (msgEl) {
        msgEl.className = 'text-xs font-semibold text-center hidden p-2.5 rounded-xl';
        msgEl.innerText = '';
    }

    openModal('modal-sheets-sync');
}

function updateOnlineStatusUI() {
    const isOnline = navigator.onLine;
    const desktopBtn = document.getElementById('connection-status-btn');
    const mobileBtn = document.getElementById('connection-status-btn-mobile');
    const buttons = [desktopBtn, mobileBtn].filter(Boolean);

    buttons.forEach(btn => {
        const dot = btn.querySelector('.status-indicator-dot');
        const text = btn.querySelector('.status-indicator-text');

        if (isOnline) {
            btn.className = 'soft-btn bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2.5 font-bold text-xs flex items-center gap-2 shadow-2xs transition';
            if (dot) {
                dot.className = 'status-indicator-dot w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
            }
            if (text) text.textContent = 'ออนไลน์';
            btn.title = 'สถานะ: ออนไลน์ (คลิกเพื่อดูการซิงค์ข้อมูล Google Sheets)';
        } else {
            btn.className = 'soft-btn bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 px-3.5 py-2.5 font-bold text-xs flex items-center gap-2 shadow-2xs transition';
            if (dot) {
                dot.className = 'status-indicator-dot w-2.5 h-2.5 rounded-full bg-slate-400';
            }
            if (text) text.textContent = 'ออฟไลน์';
            btn.title = 'สถานะ: ออฟไลน์ (บันทึกข้อมูลในเครื่องอัตโนมัติ)';
        }
    });

    const modalBadge = document.getElementById('online-status-modal-badge');
    if (modalBadge) {
        if (isOnline) {
            modalBadge.innerText = '🟢 ออนไลน์';
            modalBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
        } else {
            modalBadge.innerText = '⚪ ออฟไลน์';
            modalBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600';
        }
    }
}

window.addEventListener('online', () => {
    updateOnlineStatusUI();
});

window.addEventListener('offline', () => {
    updateOnlineStatusUI();
});

function updateSheetsSyncStatusUI() {
    updateOnlineStatusUI();
    const savedUrl = localStorage.getItem('smart_gardens_sheets_url') || '';
    const badge = document.getElementById('sheets-connection-badge');
    if (badge) {
        if (savedUrl) {
            badge.innerText = '🟢 เชื่อมต่อแล้ว';
            badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
        } else {
            badge.innerText = '⚪ ยังไม่เชื่อมต่อ';
            badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500';
        }
    }

    const lastSynced = localStorage.getItem('smart_gardens_sheets_last_synced');
    const lastSyncEl = document.getElementById('sheets-last-synced');
    if (lastSyncEl) {
        lastSyncEl.innerText = lastSynced ? `ซิงค์ล่าสุด: ${lastSynced}` : 'ยังไม่มีประวัติการซิงค์';
    }
}

function saveSheetsUrl() {
    const urlInput = document.getElementById('sheets-webapp-url-input');
    const val = urlInput ? urlInput.value.trim() : '';
    if (!val) {
        alert('กรุณากรอก Web App URL จาก Google Apps Script (ขึ้นต้นด้วย https://script.google.com/...)');
        return;
    }

    localStorage.setItem('smart_gardens_sheets_url', val);
    updateSheetsSyncStatusUI();
    showSheetsSyncMessage('✅ บันทึก Web App URL เรียบร้อยแล้ว พร้อมสำหรับการซิงค์ข้อมูล', 'success');
}

function showSheetsSyncMessage(text, type = 'info') {
    const msgEl = document.getElementById('sheets-sync-status-msg');
    if (!msgEl) return;
    msgEl.classList.remove('hidden');
    if (type === 'success') {
        msgEl.className = 'text-xs font-semibold text-center p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200';
    } else if (type === 'error') {
        msgEl.className = 'text-xs font-semibold text-center p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200';
    } else {
        msgEl.className = 'text-xs font-semibold text-center p-2.5 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200';
    }
    msgEl.innerHTML = text;
}

async function syncUploadToSheets() {
    if (!navigator.onLine) {
        showSheetsSyncMessage('⚠️ ขณะนี้อยู่ในโหมดออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนซิงค์ข้อมูล', 'error');
        return;
    }

    const url = localStorage.getItem('smart_gardens_sheets_url') || (document.getElementById('sheets-webapp-url-input')?.value.trim());
    if (!url) {
        alert('กรุณากรอกและบันทึก Web App URL จาก Google Apps Script ก่อนเริ่มซิงค์ข้อมูล');
        return;
    }

    const icon = document.getElementById('icon-sync-upload');
    const btn = document.getElementById('btn-sync-upload');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-sm';
    if (btn) btn.disabled = true;

    showSheetsSyncMessage('⏳ กำลังส่งข้อมูลสวนทั้งหมดขึ้น Google Sheets...', 'info');

    try {
        const payload = JSON.stringify({ action: 'save', data: gardens });
        
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload
            });
        } catch(postErr) {
            // Mode no-cors fallback for restrictive browser environments
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload
            });
        }

        const nowStr = new Date().toLocaleString('th-TH');
        localStorage.setItem('smart_gardens_sheets_last_synced', nowStr);
        updateSheetsSyncStatusUI();

        showSheetsSyncMessage(`✅ สำรองข้อมูลขึ้น Google Sheets สำเร็จเรียบร้อยแล้ว! (${nowStr})`, 'success');
    } catch (err) {
        console.error('Sync upload error:', err);
        showSheetsSyncMessage('❌ ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้ กรุณาตรวจสอบ URL หรือการตั้งค่าสิทธิ์ให้เป็น "ทุกคน (Anyone)"', 'error');
    } finally {
        if (icon) icon.className = 'fa-solid fa-cloud-arrow-up text-sm';
        if (btn) btn.disabled = false;
    }
}

async function syncDownloadFromSheets() {
    if (!navigator.onLine) {
        showSheetsSyncMessage('⚠️ ขณะนี้อยู่ในโหมดออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนซิงค์ข้อมูล', 'error');
        return;
    }

    const url = localStorage.getItem('smart_gardens_sheets_url') || (document.getElementById('sheets-webapp-url-input')?.value.trim());
    if (!url) {
        alert('กรุณากรอกและบันทึก Web App URL จาก Google Apps Script ก่อนเริ่มซิงค์ข้อมูล');
        return;
    }

    const icon = document.getElementById('icon-sync-download');
    const btn = document.getElementById('btn-sync-download');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-sm text-sky-600';
    if (btn) btn.disabled = true;

    showSheetsSyncMessage('⏳ กำลังดึงข้อมูลจาก Google Sheets...', 'info');

    try {
        const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'action=get&t=' + Date.now();
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const result = await res.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            if (result.data.length === 0) {
                showSheetsSyncMessage('ℹ️ ใน Google Sheets ยังไม่มีข้อมูลที่เคยบันทึกไว้', 'info');
                return;
            }

            if (confirm(`พบข้อมูลสวนใน Google Sheets จำนวน ${result.data.length} แปลง ต้องการดึงมาแทนที่ข้อมูลในเครื่องนี้หรือไม่?`)) {
                gardens = result.data;
                saveToLocalStorage();
                renderGardenList();
                if (gardens.length > 0) {
                    selectGarden(gardens[0].id);
                }

                const nowStr = new Date().toLocaleString('th-TH');
                localStorage.setItem('smart_gardens_sheets_last_synced', nowStr);
                updateSheetsSyncStatusUI();

                showSheetsSyncMessage(`✅ ดึงข้อมูลจาก Google Sheets และอัปเดตหน้าเว็บเรียบร้อยแล้ว (${result.data.length} แปลง)`, 'success');
            } else {
                showSheetsSyncMessage('ยกเลิกการดึงข้อมูล', 'info');
            }
        } else if (result.status === 'empty') {
            showSheetsSyncMessage('ℹ️ ใน Google Sheets ยังไม่มีข้อมูลที่บันทึกไว้ แนะนำให้กดปุ่ม "ส่งข้อมูลขึ้น Google Sheets" ก่อน', 'info');
        } else {
            throw new Error(result.message || 'รูปแบบข้อมูลไม่ถูกต้อง');
        }
    } catch (err) {
        console.error('Sync download error:', err);
        showSheetsSyncMessage('❌ ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบว่าตั้งค่า Web App เป็น "ทุกคน (Anyone)" แล้วหรือไม่', 'error');
    } finally {
        if (icon) icon.className = 'fa-solid fa-cloud-arrow-down text-sm text-sky-600';
        if (btn) btn.disabled = false;
    }
}

function copyAppsScriptCode() {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE).then(() => {
        const textEl = document.getElementById('copy-btn-text');
        if (textEl) {
            const original = textEl.innerText;
            textEl.innerText = '✅ คัดลอกสำเร็จแล้ว!';
            setTimeout(() => {
                textEl.innerText = original;
            }, 2500);
        }
    }).catch(() => {
        alert('กรุณาคัดลอกโค้ดจากกล่องข้อความด้านล่าง');
    });
}
