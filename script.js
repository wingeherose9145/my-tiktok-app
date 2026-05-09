const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 初始化数据库
const request = indexedDB.open("VideoPathDB", 1);
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
        if (paths && paths.length > 0) {
            addBtn.classList.add('hidden');
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(nativePath) {
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 唤起拾取器
async function pickVideos() {
    try {
        if (!window.Capacitor) throw new Error("环境非App");
        const { FilePicker } = window.Capacitor.Plugins;
        const result = await FilePicker.pickVideos({ multiple: true, readData: false });
        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");
            result.files.forEach(file => {
                if (file.path) { store.add(file.path); renderVideo(file.path); }
            });
            addBtn.classList.add('hidden');
        }
    } catch (err) { alert("点击屏幕重试: " + err.message); }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickVideos(); };
container.onclick = () => { addBtn.classList.toggle('hidden'); };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting) v.play().catch(() => { v.muted = true; v.play(); });
        else v.pause();
    });
}, { threshold: 0.6 });
