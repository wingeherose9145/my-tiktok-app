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

// 6. 核心交互：点击屏幕暂停/播放 + 切换按钮显隐
container.onclick = (e) => {
    // 找到当前正在显示的视频卡片
    const cards = document.querySelectorAll('.video-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        // 检查哪个视频在屏幕中央
        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
            const v = card.querySelector('video');
            if (v.paused) {
                v.play();
            } else {
                v.pause();
            }
        }
    });
    
    // 同时也切换按钮的显示隐藏，方便再次添加
    addBtn.classList.toggle('hidden');
};
