const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

const request = indexedDB.open("VideoPathDB", 40); 
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
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline></video>`;
    container.appendChild(card);
    observer.observe(card);
}

async function pickMultiVideos() {
    try {
        const { FilePicker, Filesystem } = window.Capacitor.Plugins;

        // 容错处理：检查插件是否存在
        if (!FilePicker) {
            alert("错误：FilePicker 插件未就绪");
            return;
        }

        // 兼容性处理：尝试 pickFiles 或 pick
        const pickFunc = FilePicker.pickFiles || FilePicker.pick;
        if (typeof pickFunc !== 'function') {
            alert("错误：当前插件版本不支持选择功能，请检查构建配置");
            return;
        }

        const result = await pickFunc({
            types: ['video/*'],
            multiple: true, // 开启多选
            readData: false
        });

        if (result && result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");

            for (const file of result.files) {
                try {
                    // 执行物理复制（搬家）
                    const fileName = `v_${Date.now()}_${file.name}`;
                    const copyResult = await Filesystem.copy({
                        from: file.path,
                        to: fileName,
                        toDirectory: 'DATA'
                    });
                    store.add(copyResult.uri);
                    renderVideo(copyResult.uri);
                } catch (e) { console.error("处理失败", e); }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) {
        alert("操作异常: " + err.message);
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
