const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');

let db;

// 1. 初始化数据库 (IndexedDB) - 核心：记住选过的视频
const request = indexedDB.open("VideoLibrary", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("videos", { autoIncrement: true });
};
request.onsuccess = (e) => {
    db = e.target.result;
    loadSavedVideos(); // 启动时自动加载
};

// 2. 加载已保存的视频
function loadSavedVideos() {
    const transaction = db.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        const files = getAll.result;
        if (files.length > 0) {
            addBtn.classList.add('hidden'); // 有视频就隐藏按钮
            files.forEach(file => renderVideo(file));
        }
    };
}

// 3. 渲染视频
function renderVideo(file) {
    const url = URL.createObjectURL(file);
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${url}" loop playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 4. 选择视频并保存
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'video/*';
fileInput.multiple = true;
fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        addBtn.classList.add('hidden');
        const transaction = db.transaction(["videos"], "readwrite");
        const store = transaction.objectStore("videos");
        files.forEach(file => {
            store.add(file); // 保存到本地，下次打开还在
            renderVideo(file);
        });
    }
};

addBtn.onclick = () => fileInput.click();

// 5. 滚动播放逻辑
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            v.muted = false;
            v.play().catch(() => {});
        } else {
            v.pause();
        }
    });
}, { threshold: 0.7 });


// 6. 核心交互：精准锁定当前视频并控制播放
container.onclick = (e) => {
    // 逻辑：通过坐标判断哪个视频卡片正处于屏幕中心
    const centerY = window.innerHeight / 2;
    const cards = document.querySelectorAll('.video-card');
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        // 如果卡片的范围覆盖了屏幕中点，说明它是当前正在看的视频
        if (rect.top <= centerY && rect.bottom >= centerY) {
            const v = card.querySelector('video');
            if (v) {
                if (v.paused) {
                    v.play();
                } else {
                    v.pause();
                }
            }
        }
    });
    
    // 同时也切换按钮显隐
    addBtn.classList.toggle('hidden');
};
