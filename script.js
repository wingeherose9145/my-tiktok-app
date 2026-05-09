const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 数据库初始化
const request = indexedDB.open("VideoPathDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) {
        db.createObjectStore("paths", { autoIncrement: true });
    }
};
request.onsuccess = (e) => {
    db = e.target.result;
    loadSavedPaths();
};

function loadSavedPaths() {
    const transaction = db.transaction(["paths"], "readonly");
    const store = transaction.objectStore("paths");
    store.getAll().onsuccess = (e) => {
        const paths = e.target.result;
        if (paths && paths.length > 0) {
            // 初始有视频时隐藏按钮
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

// 2. 选择视频
async function pickVideos() {
    if (!window.Capacitor) return;
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        const result = await FilePicker.pickVideos({ multiple: true, readData: false });
        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");
            result.files.forEach(file => {
                if (file.path) {
                    store.add(file.path);
                    renderVideo(file.path);
                }
            });
            addBtn.classList.add('hidden');
        }
    } catch (err) { console.error(err); }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickVideos(); };

// 3. 点击屏幕任何地方：切换按钮显示/隐藏，并控制播放/暂停
container.onclick = () => {
    addBtn.classList.toggle('hidden'); // 随时找回添加按钮
    
    const centerY = window.innerHeight / 2;
    document.querySelectorAll('.video-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
            const v = card.querySelector('video');
            if (v) v.paused ? v.play() : v.pause();
        }
    });
};

// 4. 滑动自动播放
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            v.play().catch(() => {
                v.muted = true; // 如果报错尝试静音播放
                v.play();
            });
        } else {
            v.pause();
        }
    });
}, { threshold: 0.6 });
