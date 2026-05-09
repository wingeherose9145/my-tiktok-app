const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 1. 初始化数据库 - 建议升至 25 确保环境干净
const request = indexedDB.open("VideoPathDB", 25);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) db.createObjectStore("paths", { autoIncrement: true });
};
request.onsuccess = (e) => { db = e.target.result; loadSavedPaths(); };

function loadSavedPaths() {
    const transaction = db.transaction(["paths"], "readonly");
    const store = transaction.objectStore("paths");
    store.getAll().onsuccess = (e) => {
        const paths = e.target.result;
        container.innerHTML = '';
        if (paths && paths.length > 0) {
            addBtn.classList.add('hidden');
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(internalPath) {
    if (!internalPath) return;
    const videoUrl = window.Capacitor.convertFileSrc(internalPath);
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto"></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 2. 关键修改：调起文件管理器实现多选 + 搬家
async function pickAndMove() {
    try {
        const { FilePicker, Filesystem } = window.Capacitor.Plugins;

        // 调起系统文件管理器，长按即可多选
        const result = await FilePicker.pickFiles({
            types: ['video/*'],
            multiple: true,
            readData: false
        });

        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");

            for (const file of result.files) {
                try {
                    // 执行物理搬家，解决重启权限丢失问题
                    const fileName = `v_${Date.now()}_${file.name}`;
                    const copyResult = await Filesystem.copy({
                        from: file.path,
                        to: fileName,
                        toDirectory: 'DATA'
                    });
                    store.add(copyResult.uri);
                    renderVideo(copyResult.uri);
                } catch (e) { console.error("搬家失败:", e); }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) { console.log("操作取消"); }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickAndMove(); };

container.onclick = () => {
    addBtn.classList.toggle('hidden');
    const v = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2)?.closest('.video-card')?.querySelector('video');
    if (v) v.paused ? v.play() : v.pause();
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (v && entry.isIntersecting) v.play().catch(() => { v.muted = true; v.play(); });
        else if (v) v.pause();
    });
}, { threshold: 0.6 });
