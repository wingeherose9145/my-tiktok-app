const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 初始化数据库 (版本 30)
const request = indexedDB.open("VideoPathDB", 30);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) db.createObjectStore("paths", { autoIncrement: true });
};
request.onsuccess = (e) => { db = e.target.result; loadSavedPaths(); };

function loadSavedPaths() {
    const transaction = db.transaction(["paths"], "readonly");
    const store = transaction.objectStore("paths");
    store.getAll().onsuccess = (e) => {
        const paths = e.target.result;
        container.innerHTML = '';
        if (paths && paths.length > 0) {
            addBtn.classList.add('hidden');
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(path) {
    if (!path) return;
    
    // 关键修复：尝试转换路径，如果转换结果异常，保留原路径
    let videoUrl = window.Capacitor.convertFileSrc(path);
    
    const card = document.createElement('div');
    card.className = 'video-card';
    // 增加 controls 方便你排查：如果黑屏但有进度条，说明路径对了但没自动播放
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto" style="width:100%; height:100%; object-fit:cover;"></video>`;
    
    container.appendChild(card);
    observer.observe(card);
}

// 核心：多选但不搬家，直接存路径
async function pickMultiVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        const result = await FilePicker.pickFiles({
            types: ['video/*'],
            multiple: true,
            readData: false 
        });

        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");
            for (const file of result.files) {
                // 直接存储路径，不执行 Filesystem.copy 以节省空间和时间
                store.add(file.path);
                renderVideo(file.path);
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) {
        console.error("选取失败", err);
    }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickMultiVideos(); };

container.onclick = () => {
    addBtn.classList.toggle('hidden');
    const v = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2)?.closest('.video-card')?.querySelector('video');
    if (v) v.paused ? v.play() : v.pause();
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (v && entry.isIntersecting) {
            v.play().catch(() => { v.muted = true; v.play(); });
        } else if (v) { v.pause(); }
    });
}, { threshold: 0.6 });
