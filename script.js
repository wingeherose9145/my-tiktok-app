const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');

// 使用浏览器的 Blob URL 方案，这在移动端 WebView 中其实就是一种“路径引用”
// 它不会把文件存入数据库，只会产生临时的内存引用，关闭 App 即释放，零存储占用
function renderVideo(file) {
    const videoUrl = URL.createObjectURL(file);
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline></video>`;
    container.appendChild(card);
    
    // 监听滚动播放
    observer.observe(card);
}

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'video/*';
fileInput.multiple = true;
fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        addBtn.classList.add('hidden');
        files.forEach(file => renderVideo(file));
    }
};

addBtn.onclick = () => fileInput.click();

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

container.onclick = () => addBtn.classList.toggle('hidden');
