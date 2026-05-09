const container = document.getElementById('videoContainer');
const fileInput = document.getElementById('fileInput');
const addBtn = document.getElementById('add-btn');
const emptyState = document.getElementById('empty-state');

let db;

// 1. 初始化本地数据库 (IndexedDB)
const request = indexedDB.open("VideoLibrary", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("videos", { autoIncrement: true });
};
request.onsuccess = (e) => {
    db = e.target.result;
    loadSavedVideos(); // 数据库准备好了，就加载之前存过的视频
};

// 2. 加载已保存的视频
function loadSavedVideos() {
    const transaction = db.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        const files = getAll.result;
        if (files.length > 0) {
            emptyState.style.display = 'none';
            addBtn.classList.add('hidden'); // 如果有视频，隐藏添加按钮
            files.forEach(file => renderVideo(file));
        }
    };
}

// 3. 渲染视频到页面
function renderVideo(file) {
    const url = URL.createObjectURL(file);
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${url}" loop playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 4. 选择文件并保存到数据库
addBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    emptyState.style.display = 'none';
    addBtn.classList.add('hidden'); // 选择完成后隐藏按钮

    const transaction = db.transaction(["videos"], "readwrite");
    const store = transaction.objectStore("videos");

    files.forEach(file => {
        store.add(file); // 存入数据库
        renderVideo(file); // 显示出来
    });
};

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

// 额外功能：点击视频可以再次调出 + 号 (防止想换视频时找不到按钮)
container.onclick = () => {
    addBtn.classList.toggle('hidden');
};
