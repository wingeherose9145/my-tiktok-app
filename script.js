const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 初始化数据库：只存路径字符串
const request = indexedDB.open("VideoPathDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) {
        db.createObjectStore("paths", { autoIncrement: true });
    }
};
request.onsuccess = async (e) => {
    db = e.target.result;
    loadSavedPaths();
    // 启动时尝试唤醒原生权限
    if (window.Capacitor && window.Capacitor.Plugins.FilePicker) {
        await window.Capacitor.Plugins.FilePicker.requestPermissions();
    }
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

// 3. 渲染视频：零占用播放
function renderVideo(nativePath) {
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 4. 单击添加：调用原生拾取器
addBtn.onclick = async () => {
    if (!window.Capacitor || !window.Capacitor.Plugins.FilePicker) {
        alert("环境未就绪，请在打包后的 App 内使用");
        return;
    }

    try {
        const { FilePicker } = window.Capacitor.Plugins;
        const result = await FilePicker.pickVideos({
            multiple: true,
            readData: false // 不读取数据到内存，只拿路径
        });

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
        console.error(err);
    }
};

// 5. 交互逻辑
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
