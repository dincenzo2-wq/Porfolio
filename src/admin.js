document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const adminWrapper = document.querySelector('.admin-wrapper');
    const navTabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.admin-section');
    const profileTabBtns = document.querySelectorAll('.tab-btn[data-profile-tab]');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');

    // Forms & Lists
    const addVideoForm = document.getElementById('add-video-form');
    const projectGrid = document.getElementById('project-grid');
    const btnToggleAddVideo = document.getElementById('btn-toggle-add-video');
    const addVideoFormContainer = document.getElementById('add-video-form-container');
    const btnCancelAddVideo = document.getElementById('btn-cancel-add-video');

    // Profile Elements
    const skillsList = document.getElementById('skills-list');
    const btnAddSkill = document.getElementById('btn-add-skill');
    const experienceList = document.getElementById('experience-list');
    const btnAddExp = document.getElementById('btn-add-exp');
    const bioTextarea = document.getElementById('profile-bio-text');
    const btnSaveProfile = document.getElementById('btn-save-profile');

    // Settings Elements
    const inputUserName = document.getElementById('set-user-name');
    const inputUserProfession = document.getElementById('set-user-profession');
    const inputUserSlogan = document.getElementById('set-user-slogan');
    const inputUserAvatar = document.getElementById('setting-avatar');
    const avatarPreview = document.getElementById('setting-avatar-preview');
    const colorPicker = document.getElementById('set-system-color');
    const colorHex = document.getElementById('color-hex-value');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const avatarDropzone = document.getElementById('avatar-dropzone');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');

    // Live preview for Youtube
    const addVideoIdInput = document.getElementById('add-video-id');

    // --- INITIAL DATA (LOCALSTORAGE) ---
    const getStorage = (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal;
    const saveStorage = (key, val) => localStorage.setItem(key, JSON.stringify(val));

    let projects = getStorage('tv_projects', [
        { id: Date.now(), title: 'LUXURY WATCH', category: 'COMMERCIAL', year: '2023', youtubeId: 'dQw4w9WgXcQ' }
    ]);

    let profile = getStorage('tv_profile', {
        bio: 'Tôi là Trần Quốc Vinh, một Video Editor với niềm đam mê kể chuyện qua từng khung hình...',
        skills: [
            { name: 'ADOBE PREMIERE', level: 95 },
            { name: 'AFTER EFFECTS', level: 85 }
        ],
        experience: [
            { year: '2024', role: 'SENIOR EDITOR', company: 'DYNAMIC STUDIO' }
        ]
    });

    let settings = getStorage('tv_settings', {
        name: 'TRẦN QUỐC VINH',
        profession: 'SENIOR VIDEO EDITOR',
        slogan: 'Kể chuyện qua từng khung hình. Kiến tạo trải nghiệm điện ảnh ấn tượng.',
        avatar: 'assets/avatar.jpg',
        accentColor: '#E21D1D'
    });

    // --- SYNC SIDEBAR ---
    const syncSidebar = (data) => {
        const sidebarName = document.getElementById('sidebar-name');
        const sidebarProfession = document.getElementById('sidebar-profession');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (sidebarName) sidebarName.textContent = data.name;
        if (sidebarProfession) sidebarProfession.textContent = data.profession;
        if (sidebarAvatar) sidebarAvatar.src = data.avatar || 'assets/avatar.jpg';
    };

    // --- SIDEBAR TOGGLE ---
    const sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';

    if (sidebarCollapsed) {
        adminWrapper?.classList.add('sidebar-collapsed');
    }

    sidebarToggleBtn?.addEventListener('click', () => {
        adminWrapper?.classList.toggle('sidebar-collapsed');
        const isCollapsed = adminWrapper.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed);
    });

    // --- TAB SWITCHING ---
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            sections.forEach(s => {
                s.classList.remove('active');
                if (s.id === target) s.classList.add('active');
            });

            const titleMap = {
                dashboard: 'BẢNG ĐIỀU KHIỂN',
                products: 'KHO SẢN PHẨM',
                profile: 'BIÊN TẬP HỒ SƠ',
                settings: 'CÀI ĐẶT TRANG CHỦ'
            };
            document.querySelector('.admin-title').textContent = titleMap[target] || 'COMMAND CENTER';
        });
    });
    // --- INITIALIZE UI ---
    const initUI = () => {
        // Greeting
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('dynamic-greeting');
        if (hour < 12) greetingEl.textContent = "GOOD MORNING, DIRECTOR";
        else if (hour < 18) greetingEl.textContent = "GOOD AFTERNOON, DIRECTOR";
        else greetingEl.textContent = "GOOD EVENING, DIRECTOR";

        renderProjects();
        renderProfile();
        renderSettings();
        updateStats();
    };

    // Profile Inner Tabs
    profileTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-profile-tab');
            profileTabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-profile-tab') === targetId));
            profileTabContents.forEach(c => c.classList.toggle('active', c.id === `profile-${targetId}`));
        });
    });

    // --- PROJECT LOGIC ---
    const getYoutubeIdFromInput = (input) => {
        if (!input) return null;
        const trimmedInput = input.trim();
        // Regex to extract ID from various YouTube URL formats
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = trimmedInput.match(regExp);

        // If regex matches and the captured group is 11 chars long, it's a valid ID from a URL
        if (match && match[2].length === 11) {
            return match[2];
        }

        // If no match, assume the input itself is the ID, but validate its length
        if (trimmedInput.length === 11) {
            return trimmedInput;
        }

        // Otherwise, it's not a valid ID or URL
        return null;
    };

    const renderProjects = () => {
        if (!projectGrid) return;
        projectGrid.innerHTML = projects.map(p => {
            const categoryClass = p.category.toLowerCase().replace(/\s+/g, '-');
            return `
            <div class="project-card" data-project-id="${p.id}">
                <div class="card-thumbnail">
                    <img src="https://img.youtube.com/vi/${p.youtubeId}/mqdefault.jpg" alt="${p.title}" loading="lazy">
                    <div class="card-overlay">
                        <button class="btn-icon delete btn-delete-project">XÓA</button>
                    </div>
                </div>
                <div class="card-meta">
                    <div class="meta-header">
                        <h4 class="card-title">${p.title}</h4>
                        <span class="card-year">${p.year}</span>
                    </div>
                    <div class="meta-footer">
                        <span class="badge ${categoryClass}">${p.category}</span>
                        <span class="card-id">${p.youtubeId}</span>
                    </div>
                </div>
            </div>
        `}).join('');
    };

    projectGrid?.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-project')) {
            const card = e.target.closest('.project-card');
            if (card && confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
                const id = Number(card.dataset.projectId);
                projects = projects.filter(p => p.id !== id);
                saveStorage('tv_projects', projects);
                renderProjects();
                updateStats();
            }
        }
    });
    btnToggleAddVideo.addEventListener('click', () => {
        addVideoFormContainer.style.display = addVideoFormContainer.style.display === 'none' ? 'block' : 'none';
    });

    btnCancelAddVideo.addEventListener('click', () => addVideoFormContainer.style.display = 'none');

    // --- LIVE PREVIEW FOR YOUTUBE ---
    const videoPreviewImg = document.getElementById('video-preview-img');
    const videoPreviewPlaceholder = document.querySelector('.preview-empty');

    addVideoIdInput?.addEventListener('input', (e) => {
        const youtubeId = getYoutubeIdFromInput(e.target.value);
        if (youtubeId) {
            const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
            videoPreviewImg.src = thumbUrl;
            videoPreviewImg.style.display = 'block';
            if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'none';
        } else {
            videoPreviewImg.style.display = 'none';
            if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'block';
        }
    });

    addVideoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('add-video-title').value;
        const rawId = document.getElementById('add-video-id').value;
        const year = document.getElementById('add-video-year').value;
        const category = document.querySelector('input[name="category"]:checked').value;

        // Extract ID if user pasted a full URL
        const youtubeId = getYoutubeIdFromInput(rawId);

        if (!youtubeId) {
            alert('YouTube ID hoặc URL không hợp lệ!');
            return;
        }

        const newProject = {
            id: Date.now(),
            title: title.toUpperCase(),
            category: category,
            year: year,
            youtubeId: youtubeId
        };

        projects.unshift(newProject);
        saveStorage('tv_projects', projects);
        renderProjects();
        updateStats();

        addVideoForm.reset();
        if (videoPreviewImg) videoPreviewImg.style.display = 'none';
        if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'block';

        const submitBtn = addVideoForm.querySelector('button[type="submit"]');
        addVideoFormContainer.style.display = 'none';
        showToast('Đã thêm video mới vào kho thành công!', submitBtn);
    });

    // --- PROFILE LOGIC ---
    const renderProfile = () => {
        bioTextarea.value = profile.bio;

        skillsList.innerHTML = profile.skills.map((s, i) => `
            <div class="skill-edit-item" data-index="${i}">
                <input type="text" value="${s.name}" class="admin-input skill-name" placeholder="TÊN KỸ NĂNG">
                <input type="range" value="${s.level}" class="skill-range" min="0" max="100">
                <div class="flex justify-between">
                    <span class="level-val">${s.level}%</span>
                    <button class="btn-icon delete btn-sm btn-remove-skill">XÓA</button>
                </div>
            </div>
        `).join('');

        experienceList.innerHTML = profile.experience.map((e, i) => `
            <div class="exp-edit-item" data-index="${i}">
                <input type="text" value="${e.year}" class="admin-input exp-year" placeholder="NĂM">
                <input type="text" value="${e.role}" class="admin-input exp-role" placeholder="VỊ TRÍ">
                <input type="text" value="${e.company}" class="admin-input exp-company" placeholder="CÔNG TY/TRƯỜNG">
                <button class="btn-icon delete btn-remove-exp">XÓA</button>
            </div>
        `).join('');
    };

    btnAddSkill.addEventListener('click', () => {
        profile.skills.push({ name: 'KỸ NĂNG MỚI', level: 50 });
        renderProfile();
    });

    btnAddExp.addEventListener('click', () => {
        profile.experience.push({ year: '2024', role: 'VỊ TRÍ', company: 'CÔNG TY' });
        renderProfile();
    });

    skillsList?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-skill')) {
            const item = e.target.closest('.skill-edit-item');
            if (item) {
                const index = parseInt(item.dataset.index, 10);
                profile.skills.splice(index, 1);
                renderProfile();
            }
        }
    });

    experienceList?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-exp')) {
            const item = e.target.closest('.exp-edit-item');
            if (item) {
                const index = parseInt(item.dataset.index, 10);
                profile.experience.splice(index, 1);
                renderProfile();
            }
        }
    });

    // Cập nhật giá trị % của thanh skill ngay lập tức
    skillsList?.addEventListener('input', (e) => {
        if (e.target.classList.contains('skill-range')) {
            const levelDisplay = e.target.nextElementSibling.querySelector('.level-val');
            if (levelDisplay) {
                levelDisplay.textContent = `${e.target.value}%`;
            }
        }
    });

    btnSaveProfile?.addEventListener('click', () => {
        // Collect Skills
        const skillItems = document.querySelectorAll('.skill-edit-item');
        profile.skills = Array.from(skillItems).map(item => ({
            name: item.querySelector('.skill-name').value.toUpperCase(),
            level: parseInt(item.querySelector('.skill-range').value)
        }));

        // Collect Experience
        const expItems = document.querySelectorAll('.exp-edit-item');
        profile.experience = Array.from(expItems).map(item => ({
            year: item.querySelector('.exp-year').value,
            role: item.querySelector('.exp-role').value.toUpperCase(),
            company: item.querySelector('.exp-company').value.toUpperCase()
        }));

        profile.bio = bioTextarea.value;
        saveStorage('tv_profile', profile);
        showToast('Hồ sơ đã được cập nhật!', btnSaveProfile);
    });

    // --- SETTINGS LOGIC ---
    const renderSettings = () => {
        if (!inputUserName) return;
        inputUserName.value = settings.name;
        inputUserProfession.value = settings.profession;
        inputUserSlogan.value = settings.slogan;
        inputUserAvatar.value = settings.avatar;
        avatarPreview.src = settings.avatar || 'assets/avatar.jpg';
        colorPicker.value = settings.accentColor;
        colorHex.textContent = settings.accentColor.toUpperCase();
        document.documentElement.style.setProperty('--accent-color', settings.accentColor);
        syncSidebar(settings);
    };

    inputUserAvatar?.addEventListener('input', (e) => {
        avatarPreview.src = e.target.value || 'assets/avatar.jpg';
    });

    colorPicker.addEventListener('input', (e) => {
        const color = e.target.value.toUpperCase();
        colorHex.textContent = color;
        document.documentElement.style.setProperty('--accent-color', color);
    });

    btnSaveSettings?.addEventListener('click', () => {
        settings = {
            name: inputUserName.value.toUpperCase(),
            profession: inputUserProfession.value.toUpperCase(),
            slogan: inputUserSlogan.value,
            avatar: inputUserAvatar.value || 'assets/avatar.jpg',
            accentColor: colorPicker.value
        };
        saveStorage('tv_settings', settings);
        syncSidebar(settings);
        showToast('Cài đặt trang chủ đã lưu!', btnSaveSettings);
    });

    // --- AVATAR UPLOAD LOGIC ---
    const handleAvatarFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result;
                avatarPreview.src = base64Image;
                inputUserAvatar.value = base64Image; // Store base64 for saving
            };
            reader.readAsDataURL(file);
        } else {
            // Simple alert for now, can be replaced with a better toast/notification
            alert('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP).');
        }
    };

    if (avatarDropzone) {
        avatarDropzone.addEventListener('click', () => avatarFileInput.click());

        ['dragenter', 'dragover'].forEach(eventName => {
            avatarDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                avatarDropzone.classList.add('drag-active');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            avatarDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                avatarDropzone.classList.remove('drag-active');
            }, false);
        });

        avatarDropzone.addEventListener('drop', (e) => handleAvatarFile(e.dataTransfer.files[0]), false);
        avatarFileInput.addEventListener('change', (e) => handleAvatarFile(e.target.files[0]));
    }


    // --- UTILS ---
    const updateStats = () => {
        document.getElementById('stat-total-projects').textContent = projects.length;
    };

    const showToast = (msg, btn) => {
        if (!btn) return; // Nếu không có nút, không làm gì cả
        const originalText = btn.textContent;
        btn.textContent = 'ĐANG LƯU...';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = 'THÀNH CÔNG!';
            btn.style.background = '#00FF41';
            btn.style.color = '#000';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.style.color = '';
                btn.disabled = false;
            }, 2000);
        }, 500);
    };

    initUI();
});
