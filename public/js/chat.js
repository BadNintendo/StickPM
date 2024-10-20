// scripts.js
document.getElementById('menuButton').addEventListener('click', function() {
    document.getElementById('nicknameMenu').classList.toggle('open');
});

document.getElementById('closeMenu').addEventListener('click', function() {
    document.getElementById('nicknameMenu').classList.remove('open');
});

document.getElementById('themeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    document.getElementById('toggleTheme').checked = document.body.classList.contains('dark-theme');
});

document.getElementById('toggleTheme').addEventListener('change', function() {
    document.body.classList.toggle('dark-theme', this.checked);
});

document.getElementById('userPanelClose').addEventListener('click', function() {
    document.getElementById('userPanel').classList.remove('open');
});

document.getElementById('chatSettings').addEventListener('click', function() {
    document.getElementById('userPanel').classList.toggle('open');
});

document.querySelectorAll('.eye-icon').forEach(button => {
    button.addEventListener('click', function() {
        const videoElement = this.closest('.stream').querySelector('.video-element');
        if (videoElement.style.display === 'none') {
            videoElement.style.display = 'block';
            this.classList.remove('hidden');
        } else {
            videoElement.style.display = 'none';
            this.classList.add('hidden');
        }
    });
});

document.querySelectorAll('.mute-button').forEach(button => {
    button.addEventListener('click', function() {
        const videoElement = this.closest('.stream').querySelector('.video-element');
        videoElement.muted = !videoElement.muted;
        this.innerHTML = videoElement.muted ? '🔇' : '🔊';
        const volumeBar = this.nextElementSibling;
        volumeBar.value = videoElement.muted ? 0 : videoElement.volume;
    });
});

document.querySelectorAll('.volume-bar').forEach(bar => {
    bar.addEventListener('input', function() {
        const videoElement = this.closest('.stream').querySelector('.video-element');
        videoElement.volume = this.value;
        if (this.value > 0) {
            videoElement.muted = false;
            this.previousElementSibling.innerHTML = '🔊';
        }
    });
});

document.querySelectorAll('.fullscreen-button').forEach(button => {
    button.addEventListener('click', function() {
        const streamElement = this.closest('.stream');
        const videoElement = streamElement.querySelector('.video-element');
        const usernameOverlay = streamElement.querySelector('.username-overlay');

        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.mozRequestFullScreen) { /* Firefox */
            videoElement.mozRequestFullScreen();
        } else if (videoElement.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) { /* IE/Edge */
            videoElement.msRequestFullscreen();
        }

        videoElement.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                usernameOverlay.style.position = 'fixed';
                usernameOverlay.style.bottom = '10px';
                usernameOverlay.style.left = '10px';
                usernameOverlay.style.zIndex = '1000';
                usernameOverlay.style.opacity = '0.5';
            } else {
                usernameOverlay.style.position = 'absolute';
                usernameOverlay.style.bottom = '10px';
                usernameOverlay.style.left = '10px';
                usernameOverlay.style.zIndex = '1';
                usernameOverlay.style.opacity = '1';
            }
        });
    });
});

document.querySelectorAll('.interaction-toggle').forEach(button => {
    button.addEventListener('click', function() {
        const usernameMenu = this.nextElementSibling;
        usernameMenu.classList.toggle('open');
    });
});