const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 初始化数据库：这次我们只存路径字符串 (Path)
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

// 2. 加载已保存的路径
function loadSavedPaths() {
    const transaction = db.transaction(["paths"], "readonly");
    const store = transaction.objectStore("paths");
    store.getAll().onsuccess = (e) => {
        const paths = e.target.result;
        if (paths.length > 0) {
            addBtn.classList.add('hidden');
            paths.forEach(path => renderVideo(path));
        }
    };
}

// 3. 渲染视频：使用 Capacitor.convertFileSrc 实现零占用播放
function renderVideo(nativePath) {
    // 核心：把手机原生路径 (file://...) 转换为网页能播的虚拟 URL
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 4. 选择视频：获取真实路径
addBtn.onclick = async () => {
    // 动态检查是否在 App 环境
    if (!window.Capacitor) {
        alert("请在安卓 App 内运行以使用路径模式");
        return;
    }

    try {
        // 调用原生拾取器
        const { FilePicker } = await import('@capawesome/capacitor-file-picker');
        const result = await FilePicker.pickVideos({ multiple: true, readData: false });

        if (result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");
            
            result.files.forEach(file => {
                if (file.path) {
                    store.add(file.path); // 只存一串文字路径，零空间占用！
                    renderVideo(file.path);
                }
            });
            addBtn.classList.add('hidden');
        }
    } catch (err) {
        console.error("选取取消或失败", err);
    }
};

// 5. 滚动与点击逻辑 (保持之前的完美交互)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            v.play().then(() => addBtn.classList.add('hidden')).catch(() => {});
        } else {
            v.pause();
        }
    });
}, { threshold: 0.7 });

container.onclick = () => {
    const centerY = window.innerHeight / 2;
    const cards = document.querySelectorAll('.video-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
            const v = card.querySelector('video');
            if (v.paused) {
                v.play();
                addBtn.classList.add('hidden');
            } else {
                v.pause();
                addBtn.classList.remove('hidden');
            }
        }
    });
};
