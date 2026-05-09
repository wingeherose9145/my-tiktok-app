const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 初始化数据库
const request = indexedDB.open("VideoPathDB", 12); // 升级版本确保干净
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

function renderVideo(nativePath) {
    if (!nativePath) return;
    // 关键：将原始路径转换为 WebView 可识别的路径
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto"></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 2. 核心功能：调起全局管理器进行多选
async function pickMultiVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;

        // 使用 pickFiles 调起全局文件管理器
        const result = await FilePicker.pickFiles({
            types: ['video/*'],
            multiple: true,  // 开启多选
            readData: false  // 不读取数据，只拿原始路径
        });

        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");

            for (const file of result.files) {
                if (file.path) {
                    store.add(file.path); // 直接存入原始路径
                    renderVideo(file.path);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) {
        console.log("用户取消或出错", err);
    }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickMultiVideos(); };

// 3. 交互逻辑
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
        } else if (v) {
            v.pause();
        }
    });
}, { threshold: 0.6 });
