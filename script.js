const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 初始化数据库
const request = indexedDB.open("VideoPathDB", 35); 
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

function renderVideo(path) {
    if (!path) return;
    const videoUrl = window.Capacitor.convertFileSrc(path);
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto"></video>`;
    container.appendChild(card);
    observer.observe(card);
}

// 核心：解决多选 + 解决报错 + 物理搬家
async function pickMultiVideos() {
    try {
        const { FilePicker, Filesystem } = window.Capacitor.Plugins;

        if (!FilePicker) {
            alert("未检测到选择插件，请确保 workflow 中安装了该插件");
            return;
        }

        // 调用选择器
        const result = await FilePicker.pickFiles({
            types: ['video/*'],
            multiple: true, // 开启批量多选
            readData: false
        });

        if (result && result.files && result.files.length > 0) {
            alert(`已选中 ${result.files.length} 个视频，正在处理...`);
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");

            for (const file of result.files) {
                try {
                    // 执行搬家，确保重启能播
                    const fileName = `v_${Date.now()}_${file.name}`;
                    const copyResult = await Filesystem.copy({
                        from: file.path,
                        to: fileName,
                        toDirectory: 'DATA'
                    });
                    store.add(copyResult.uri);
                    renderVideo(copyResult.uri);
                } catch (e) {
                    console.error("文件复制失败:", e);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) {
        console.log("用户取消或插件错误:", err);
    }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickMultiVideos(); };

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
