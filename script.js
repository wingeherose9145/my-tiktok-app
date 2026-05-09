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
            addBtn.classList.add('hidden'); // 默认隐藏
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

// 2. 选择视频逻辑
async function pickVideos() {
    if (!window.Capacitor) {
        alert("请在安卓手机上运行");
        return;
    }
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
    } catch (err) {
        console.log("取消选择或失败");
    }
}

// 单击按钮添加
addBtn.onclick = (e) => {
    e.stopPropagation();
    pickVideos();
};

// 3. 核心交互：点击屏幕任何地方切换按钮显示/隐藏
container.onclick = () => {
    addBtn.classList.toggle('hidden');
    
    // 同时控制播放暂停
    const centerY = window.innerHeight / 2;
    document.querySelectorAll('.video-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
            const v = card.querySelector('video');
            if (v) v.paused ? v.play() : v.pause();
        }
    });
};

// 4. 自动播放
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            v.play().catch(() => {
                v.muted = true;
                v.play();
            });
        } else {
            v.pause();
        }
    });
}, { threshold: 0.6 });
