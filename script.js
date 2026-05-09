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

// 5. 核心逻辑：监听滚动 + 自动控制按钮显隐
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            v.play().then(() => {
                // 播放成功，隐藏按钮
                addBtn.classList.add('hidden');
            }).catch(() => {});
        } else {
            v.pause();
        }
    });
}, { threshold: 0.7 });

// 6. 核心逻辑：点击控制暂停/播放 + 状态同步
container.onclick = () => {
    const centerY = window.innerHeight / 2;
    const cards = document.querySelectorAll('.video-card');
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
            const v = card.querySelector('video');
            if (v.paused) {
                v.play();
                addBtn.classList.add('hidden'); // 播放时隐藏
            } else {
                v.pause();
                addBtn.classList.remove('hidden'); // 暂停时显示
            }
        }
    });
};
