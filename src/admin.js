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
    const educationList = document.getElementById('education-list');
    const btnAddEdu = document.getElementById('btn-add-edu');
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

    // --- CLOUDFLARE API ---
    const WORKER_URL = 'https://portfolio-api.dincenzo2.workers.dev';

    let projects = [];
    let profile = {};
    let settings = {};

    const fetchAllData = async () => {
        try {
            const response = await fetch(`${WORKER_URL}/api/all-data`);
            if (!response.ok) throw new Error('Failed to fetch from D1');
            const data = await response.json();
            
            projects = data.projects || [];
            profile = data.profile || {};
            // Ensure arrays exist
            if (!profile.skills) profile.skills = [];
            if (!profile.experience) profile.experience = [];
            if (!profile.education) profile.education = [];
            settings = data.settings || {};
            
            // Sync to localStorage as backup
            saveStorage('tv_projects', projects);
            saveStorage('tv_profile', profile);
            saveStorage('tv_settings', settings);
        } catch (err) {
            console.warn('API Fetch failed, using localStorage fallback:', err);
            projects = getStorage('tv_projects', []);
            profile = getStorage('tv_profile', {});
            settings = getStorage('tv_settings', {});
        }
    };

    const apiSave = async (endpoint, data) => {
        const response = await fetch(`${WORKER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Save failed: ${response.statusText}`);
        return response.json();
    };

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
    const initUI = async () => {
        // Greeting
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('dynamic-greeting');
        if (hour < 12) greetingEl.textContent = "GOOD MORNING, DIRECTOR";
        else if (hour < 18) greetingEl.textContent = "GOOD AFTERNOON, DIRECTOR";
        else greetingEl.textContent = "GOOD EVENING, DIRECTOR";

        // Show loading state if needed
        adminWrapper.style.opacity = '0.5';
        await fetchAllData();
        adminWrapper.style.opacity = '1';

        syncSidebar(settings);
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
            const thumbUrl = p.thumbnail || `https://img.youtube.com/vi/${p.youtubeId}/mqdefault.jpg`;
            const thumbBadge = p.thumbnail ? '<span class="r2-badge" title="Thumbnail t὎0ầy R2">R2</span>' : '';
            return `
            <div class="project-card" data-project-id="${p.id}">
                <div class="card-thumbnail">
                    <img src="${thumbUrl}" alt="${p.title}" loading="lazy">
                    <div class="card-overlay">
                        ${thumbBadge}
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

    projectGrid?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete-project')) {
            const card = e.target.closest('.project-card');
            if (card && confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
                const id = Number(card.dataset.projectId);
                projects = projects.filter(p => p.id !== id);
                
                try {
                    await apiSave('/api/projects', projects);
                    saveStorage('tv_projects', projects);
                    renderProjects();
                    updateStats();
                } catch (err) {
                    alert('Lỗi khi xóa dự án: ' + err.message);
                }
            }
        }
    });
    btnToggleAddVideo.addEventListener('click', () => {
        addVideoFormContainer.style.display = addVideoFormContainer.style.display === 'none' ? 'block' : 'none';
    });

    btnCancelAddVideo.addEventListener('click', () => addVideoFormContainer.style.display = 'none');

    // --- LIVE PREVIEW FOR YOUTUBE ---
    const videoPreviewImg = document.getElementById('video-preview-img');
    const videoPreviewPlaceholder = document.getElementById('preview-placeholder');

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

    addVideoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('add-video-title').value;
        const rawId = document.getElementById('add-video-id').value;
        const year = document.getElementById('add-video-year').value;
        const category = document.querySelector('input[name="category"]:checked').value;
        const customThumbnail = (document.getElementById('add-video-thumbnail')?.value || '').trim();

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
            youtubeId: youtubeId,
            thumbnail: customThumbnail || null
        };

        const submitBtn = addVideoForm.querySelector('button[type="submit"]');
        
        await showToast('Đã thêm video mới!', submitBtn, async () => {
            const updatedProjects = [newProject, ...projects];
            await apiSave('/api/projects', updatedProjects);
            projects = updatedProjects;
            saveStorage('tv_projects', projects);
            
            addVideoForm.reset();
            if (videoPreviewImg) videoPreviewImg.style.display = 'none';
            if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'flex';
            addVideoFormContainer.style.display = 'none';
            
            // Reset Microlink UI
            const microlinkStatus = document.getElementById('microlink-status');
            const microlinkResult = document.getElementById('microlink-result');
            const microlinkImageUrl = document.getElementById('microlink-image-url');
            if (microlinkStatus) { microlinkStatus.style.display = 'none'; microlinkStatus.textContent = ''; }
            if (microlinkResult) microlinkResult.style.display = 'none';
            if (microlinkImageUrl) microlinkImageUrl.textContent = '';
            
            renderProjects();
            updateStats();
        });
    });

    // --- MICROLINK FETCHER LOGIC ---
    const btnMicrolinkFetch = document.getElementById('btn-microlink-fetch');
    const microlinkUrlInput = document.getElementById('microlink-url-input');
    const microlinkStatus = document.getElementById('microlink-status');
    const microlinkResult = document.getElementById('microlink-result');
    const microlinkImageUrl = document.getElementById('microlink-image-url');
    const btnCopyMicrolink = document.getElementById('btn-copy-microlink');
    const btnPreviewR2 = document.getElementById('btn-preview-r2');
    const addVideoThumbnail = document.getElementById('add-video-thumbnail');

    const setMicrolinkStatus = (type, msg) => {
        microlinkStatus.style.display = 'flex';
        microlinkStatus.className = `microlink-status status-${type}`;
        microlinkStatus.textContent = msg;
    };

    btnMicrolinkFetch?.addEventListener('click', async () => {
        const url = microlinkUrlInput?.value.trim();
        if (!url) {
            setMicrolinkStatus('error', '⚠ Vui lòng nhập URL trang web trước.');
            return;
        }

        btnMicrolinkFetch.disabled = true;
        btnMicrolinkFetch.textContent = 'ĐANG LẤY...';
        setMicrolinkStatus('loading', '⏳ Đang gọi Microlink API...');
        if (microlinkResult) microlinkResult.style.display = 'none';

        try {
            const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
            const res = await fetch(apiUrl);
            const json = await res.json();

            if (json.status === 'success' && json.data?.image?.url) {
                const imgUrl = json.data.image.url;
                microlinkImageUrl.textContent = imgUrl;
                microlinkResult.style.display = 'block';
                setMicrolinkStatus('success', '✓ Lấy thành công! Copy link và upload lên R2.');

                // Auto-copy to clipboard
                try {
                    await navigator.clipboard.writeText(imgUrl);
                    setMicrolinkStatus('success', '✓ Đã copy link vào clipboard! Upload lên R2 rồi dán URL R2 xuống dưới.');
                } catch (_) {
                    // Clipboard blocked — user can still click COPY button
                }

                // Show image preview in slot
                if (videoPreviewImg && videoPreviewPlaceholder) {
                    videoPreviewImg.src = imgUrl;
                    videoPreviewImg.style.display = 'block';
                    videoPreviewPlaceholder.style.display = 'none';
                }
            } else {
                setMicrolinkStatus('error', `❌ Không tìm thấy ảnh. Status: ${json.status}. Thử URL khác.`);
            }
        } catch (err) {
            setMicrolinkStatus('error', `❌ Lỗi kết nối Microlink: ${err.message}`);
        } finally {
            btnMicrolinkFetch.disabled = false;
            btnMicrolinkFetch.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> LẤY ẢNH`;
        }
    });

    btnCopyMicrolink?.addEventListener('click', async () => {
        const url = microlinkImageUrl?.textContent?.trim();
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            const orig = btnCopyMicrolink.innerHTML;
            btnCopyMicrolink.textContent = '✓ COPIED!';
            btnCopyMicrolink.classList.add('copied');
            setTimeout(() => {
                btnCopyMicrolink.innerHTML = orig;
                btnCopyMicrolink.classList.remove('copied');
            }, 2000);
        } catch (err) {
            alert('Không thể copy. URL: ' + url);
        }
    });

    // Preview R2 URL in thumbnail slot
    addVideoThumbnail?.addEventListener('input', (e) => {
        const r2Url = e.target.value.trim();
        if (r2Url && videoPreviewImg && videoPreviewPlaceholder) {
            videoPreviewImg.src = r2Url;
            videoPreviewImg.style.display = 'block';
            videoPreviewPlaceholder.style.display = 'none';
        }
    });

    btnPreviewR2?.addEventListener('click', () => {
        const r2Url = addVideoThumbnail?.value.trim();
        if (!r2Url) {
            alert('Vui lòng nhập URL R2 trước.');
            return;
        }
        if (videoPreviewImg && videoPreviewPlaceholder) {
            videoPreviewImg.src = r2Url;
            videoPreviewImg.style.display = 'block';
            videoPreviewPlaceholder.style.display = 'none';
        }
    });

    // --- PROFILE LOGIC ---
    // Thu thập dữ liệu từ các ô nhập hiện tại (để không bị mất khi render lại)
    const collectProfileInputs = () => {
        // Bio
        profile.bio = bioTextarea.value;

        // Skills
        const skillItems = document.querySelectorAll('.skill-edit-item');
        profile.skills = Array.from(skillItems).map(item => ({
            name: item.querySelector('.skill-name').value,
            level: parseInt(item.querySelector('.skill-range').value)
        }));

        // Experience
        const expItems = document.querySelectorAll('#experience-list .exp-edit-item');
        profile.experience = Array.from(expItems).map(item => ({
            year: item.querySelector('.exp-year').value,
            role: item.querySelector('.exp-role').value,
            company: item.querySelector('.exp-company').value
        }));

        // Education
        const eduItems = document.querySelectorAll('#education-list .exp-edit-item');
        profile.education = Array.from(eduItems).map(item => ({
            startYear: item.querySelector('.edu-start').value,
            endYear: item.querySelector('.edu-end').value,
            company: item.querySelector('.exp-company').value,
            degree: item.querySelector('.exp-role').value
        }));
    };

    const renderProfile = () => {
        if (!profile.skills) profile.skills = [];
        if (!profile.experience) profile.experience = [];
        if (!profile.education) profile.education = [];

        bioTextarea.value = profile.bio || '';

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
                <input type="text" value="${e.year}" class="admin-input exp-year" placeholder="NĂM (VD: 2021-2024)">
                <input type="text" value="${e.role}" class="admin-input exp-role" placeholder="VỊ TRÍ">
                <input type="text" value="${e.company}" class="admin-input exp-company" placeholder="CÔNG TY">
                <button class="btn-icon delete btn-remove-exp">XÓA</button>
            </div>
        `).join('');

        educationList.innerHTML = profile.education.map((e, i) => `
            <div class="exp-edit-item" data-index="${i}">
                <div class="year-range-inputs">
                    <input type="text" value="${e.startYear || ''}" class="admin-input edu-start" placeholder="BẮT ĐẦU">
                    <span class="year-separator">—</span>
                    <input type="text" value="${e.endYear || ''}" class="admin-input edu-end" placeholder="KẾT THÚC">
                </div>
                <input type="text" value="${e.degree || ''}" class="admin-input exp-role" placeholder="CHUYÊN NGÀNH">
                <input type="text" value="${e.company || ''}" class="admin-input exp-company" placeholder="TRƯỜNG HỌC">
                <button class="btn-icon delete btn-remove-edu">XÓA</button>
            </div>
        `).join('');
    };

    btnAddSkill.addEventListener('click', () => {
        collectProfileInputs();
        profile.skills.push({ name: 'KỸ NĂNG MỚI', level: 50 });
        renderProfile();
    });

    btnAddExp.addEventListener('click', () => {
        collectProfileInputs();
        profile.experience.push({ year: '2024', role: 'VỊ TRÍ', company: 'CÔNG TY' });
        renderProfile();
    });

    btnAddEdu.addEventListener('click', () => {
        collectProfileInputs();
        profile.education.push({ startYear: '2020', endYear: '2024', degree: 'CHUYÊN NGÀNH', company: 'TRƯỜNG HỌC' });
        renderProfile();
    });

    skillsList?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-skill')) {
            collectProfileInputs();
            const index = parseInt(e.target.closest('.skill-edit-item').dataset.index, 10);
            profile.skills.splice(index, 1);
            renderProfile();
        }
    });

    experienceList?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-exp')) {
            collectProfileInputs();
            const index = parseInt(e.target.closest('.exp-edit-item').dataset.index, 10);
            profile.experience.splice(index, 1);
            renderProfile();
        }
    });

    educationList?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-edu')) {
            collectProfileInputs();
            const index = parseInt(e.target.closest('.exp-edit-item').dataset.index, 10);
            profile.education.splice(index, 1);
            renderProfile();
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

    btnSaveProfile?.addEventListener('click', async () => {
        collectProfileInputs();

        await showToast('Hồ sơ đã cập nhật!', btnSaveProfile, async () => {
            await apiSave('/api/profile', profile);
            saveStorage('tv_profile', profile);
        });
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

    btnSaveSettings?.addEventListener('click', async () => {
        const updatedSettings = {
            name: inputUserName.value.toUpperCase(),
            profession: inputUserProfession.value.toUpperCase(),
            slogan: inputUserSlogan.value,
            avatar: inputUserAvatar.value || 'assets/avatar.jpg',
            accentColor: colorPicker.value
        };

        await showToast('Cài đặt đã lưu!', btnSaveSettings, async () => {
            await apiSave('/api/settings', updatedSettings);
            settings = updatedSettings;
            saveStorage('tv_settings', settings);
            syncSidebar(settings);
        });
    });

    // --- AVATAR UPLOAD LOGIC (WITH COMPRESSION) ---
    const handleAvatarFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimensions 400x400 for avatar
                    const MAX_SIZE = 400;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Export as compressed WebP (supports transparency)
                    const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
                    
                    // Check size (approximate for base64)
                    if (compressedBase64.length > 800000) { // ~800KB
                        alert('Ảnh sau khi nén vẫn quá lớn. Vui lòng chọn ảnh khác hoặc dùng Link URL.');
                        return;
                    }

                    avatarPreview.src = compressedBase64;
                    inputUserAvatar.value = compressedBase64;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Vui lòng chọn file hình ảnh hợp lệ.');
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

    const showToast = async (msg, btn, apiCall = null) => {
        if (!btn) return;
        const originalText = btn.textContent;
        btn.textContent = 'ĐANG LƯU...';
        btn.disabled = true;

        try {
            if (apiCall) await apiCall();
            
            btn.textContent = msg || 'THÀNH CÔNG!';
            btn.style.background = '#00FF41';
            btn.style.color = '#000';
        } catch (err) {
            console.error(err);
            btn.textContent = 'LỖI LƯU TRỮ!';
            btn.style.background = '#E21D1D';
            btn.style.color = '#fff';
        }

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.color = '';
            btn.disabled = false;
        }, 2000);
    };

    initUI();
});
