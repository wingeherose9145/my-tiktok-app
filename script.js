const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 初始化数据库
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
};

// 2. 加载路径
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

// 3. 渲染视频 (零占用转换)
function renderVideo(nativePath) {
    // 关键：Capacitor 虚拟路径转换
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 4. 点击添加
addBtn.onclick = async () => {
    if (!window.Capacitor) {
        alert("请在打包后的 App 环境中运行");
        return;
    }

    try {
        // 使用 window.Capacitor.Plugins 访问已注册的插件
        const FilePicker = window.Capacitor.Plugins.FilePicker;
        
        // 弹出权限申请
        await FilePicker.requestPermissions();

        const result = await FilePicker.pickVideos({
            multiple: true,
            readData: false
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
        alert("操作失败: " + err.message);
    }
};

// 5. 播放控制逻辑 (保持完美交互)
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
