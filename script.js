const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

const request = indexedDB.open("VideoPathDB", 3); // 再次升级版本号以强制刷新
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
            // 延迟 500ms 加载，确保 WebView 容器完全就绪
            setTimeout(() => {
                paths.forEach(path => renderVideo(path));
            }, 500);
        }
    };
}

function renderVideo(nativePath) {
    // 强制转换路径，这是播放本地视频的唯一合法协议
    let videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <video src="${videoUrl}" 
               loop 
               playsinline 
               preload="auto"
               webkit-playsinline 
               style="width:100%; height:100%; object-fit:cover;">
        </video>`;
    
    container.appendChild(card);
    observer.observe(card);
}

// 交互：点击屏幕控制播放/暂停
container.addEventListener('click', () => {
    addBtn.classList.toggle('hidden');
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
        const rect = v.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight) {
            if (v.paused) v.play().catch(e => console.log(e));
            else v.pause();
        }
    });
});

async function pickVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        const result = await FilePicker.pickVideos({ multiple: true, readData: false });
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
    } catch (err) { alert("选取失败: " + err); }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickVideos(); };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (v && entry.isIntersecting) {
            v.play().catch(() => { v.muted = true; v.play(); });
        } else if (v) {
            v.pause();
        }
    });
}, { threshold: 0.5 });
