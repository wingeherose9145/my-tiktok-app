const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            video.play().catch(() => {}); // 自动播放
        } else {
            video.pause(); // 离开视口暂停
        }
    });
}, { threshold: 0.7 }); // 看到 70% 时切换

document.querySelectorAll('.video-card').forEach(card => {
    observer.observe(card);
    // 点击视频可以切换 播放/暂停
    card.addEventListener('click', () => {
        const v = card.querySelector('video');
        if (v.paused) v.play();
        else v.pause();
    });
});
