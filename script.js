const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

const request = indexedDB.open("VideoPathDB", 4); // 再次升级版本，确保数据结构干净
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
            // 解决“占位不播放”：增加一个显式的加载动作
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(nativePath) {
    if (!nativePath) return;
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    const card = document.createElement('div');
    card.className = 'video-card';
    // 关键：增加 muted 和 playsinline，并在 JS 里强制 load()
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto"></video>`;
    container.appendChild(card);
    
    const v = card.querySelector('video');
    v.load(); // 强制视频重新加载路径
    observer.observe(card);
}

async function pickVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        // 解决“只能选一个”：强制 multiple 为 true
        const result = await FilePicker.pickVideos({ multiple: true, readData: false });
        
        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");
            for (const file of result.files) {
                if (file.path) {
                    store.add(file.path);
                    renderVideo(file.path);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) { console.error("Pick error:", err); }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickVideos(); };
container.onclick = () => {
    addBtn.classList.toggle('hidden');
    // 点击强制播放当前中心视频
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
