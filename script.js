const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 数据库初始化
const request = indexedDB.open("VideoPathDB", 2); // 提升版本号以刷新存储
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
        container.innerHTML = ''; // 清空占位
        if (paths && paths.length > 0) {
            addBtn.classList.add('hidden');
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(nativePath) {
    // 关键：针对 Capacitor 的路径转换逻辑
    let videoUrl = nativePath;
    if (window.Capacitor && window.Capacitor.convertFileSrc) {
        videoUrl = window.Capacitor.convertFileSrc(nativePath);
    }

    const card = document.createElement('div');
    card.className = 'video-card';
    // 增加 controls 以便在 JS 失效时应急，强制 style 确保填充
    card.innerHTML = `
        <video src="${videoUrl}" 
               loop 
               playsinline 
               webkit-playsinline 
               style="width:100%; height:100%; object-fit:cover;">
        </video>`;
    
    container.appendChild(card);
    observer.observe(card);
}

// 2. 选择视频
async function pickVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
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
    } catch (err) {
        console.error("Pick error:", err);
    }
}

addBtn.onclick = (e) => {
    e.stopPropagation();
    pickVideos();
};

// 3. 改进的交互逻辑：点击屏幕
container.addEventListener('click', (e) => {
    // 切换按钮显示
    addBtn.classList.toggle('hidden');
    
    // 获取当前中心点的视频
    const centerY = window.innerHeight / 2;
    const cards = document.querySelectorAll('.video-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top < centerY && rect.bottom > centerY) {
            const v = card.querySelector('video');
            if (v) {
                if (v.paused) v.play().catch(err => console.log("Play failed", err));
                else v.pause();
            }
        }
    });
});

// 4. 滚动自动播放
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (!v) return;
        if (entry.isIntersecting) {
            v.play().catch(() => {
                v.muted = true; // 如果受限则静音播放
                v.play();
            });
        } else {
            v.pause();
        }
    });
}, { threshold: 0.6 });
