const fileInput = document.getElementById('fileInput');
const addBtn = document.getElementById('add-btn');
const container = document.getElementById('videoContainer');
const emptyState = document.getElementById('empty-state');

// 1. 点击悬浮按钮触发文件选择
addBtn.addEventListener('click', () => {
    fileInput.click();
});

// 2. 处理选中的视频文件
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        emptyState.style.display = 'none'; // 隐藏提示文字
        
        files.forEach(file => {
            const videoUrl = URL.createObjectURL(file);
            addVideoCard(videoUrl, file.name);
        });
    }
});

// 3. 动态添加视频卡片
function addVideoCard(url, name) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <video src="${url}" loop playsinline></video>
        <div class="info">@本地视频: ${name}</div>
    `;
    container.appendChild(card);
    
    // 监听这个新卡片
    videoObserver.observe(card);
}

// 4. 滚动播放逻辑（带声音开启）
const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            // 关键：解除静音并播放
            video.muted = false; 
            video.play().catch(err => {
                console.log("等待用户交互后开启声音");
            });
        } else {
            video.pause();
        }
    });
}, { threshold: 0.8 });

// 点击屏幕切换播放/暂停
container.addEventListener('click', (e) => {
    if (e.target.tagName === 'VIDEO') {
        if (e.target.paused) e.target.play();
        else e.target.pause();
    }
});
