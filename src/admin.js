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

    // Live preview for Video
    const addVideoUrlInput = document.getElementById('add-video-url');
    const videoPreviewImg = document.getElementById('video-preview-img');
    const videoPreviewPlaceholder = document.getElementById('preview-placeholder');


    // --- INITIAL DATA (LOCALSTORAGE) ---
    const getStorage = (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal;
    const saveStorage = (key, val) => localStorage.setItem(key, JSON.stringify(val));

    // --- CLOUDFLARE API ---
    const WORKER_URL = 'http://localhost:8787';

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
        if (hour < 12) greetingEl.textContent = "Chào Buổi Sáng, Đạo Diễn";
        else if (hour < 18) greetingEl.textContent = "Chào Buổi Chiều, Đạo Diễn";
        else greetingEl.textContent = "Chào Buổi Tối, Đạo Diễn";


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

    const renderProjects = () => {
        if (!projectGrid) return;
        projectGrid.innerHTML = projects.map(p => {
            const categoryClass = p.category.toLowerCase().replace(/\s+/g, '-');
            const thumbUrl = p.thumbnail || 'https://via.placeholder.com/400x225/111/eee?text=VIDEO';
            return `
            <div class="project-card" data-project-id="${p.id}">
                <div class="card-thumbnail">
                    <img src="${thumbUrl}" alt="${p.title}" loading="lazy">
                    <div class="card-overlay">
                        <div class="card-actions-row">
                            <button class="btn-icon edit btn-edit-project" title="Sửa dự án">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon delete btn-delete-project" title="Xóa dự án">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-meta">
                    <div class="meta-header">
                        <h4 class="card-title">${p.title}</h4>
                        <span class="card-year">${p.year}</span>
                    </div>
                    <div class="meta-footer">
                        <span class="badge ${categoryClass}">${p.category}</span>
                        <span class="card-id" title="${p.videoUrl}">${p.videoUrl ? p.videoUrl.substring(0, 30) + '...' : 'NO URL'}</span>
                    </div>
                </div>
            </div>
        `}).join('');
    };

    // --- PROJECT ACTIONS (DELEGATION) ---
    document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-project');
        const deleteBtn = e.target.closest('.btn-delete-project');

        if (editBtn) {
            e.preventDefault();
            const card = editBtn.closest('.project-card');
            if (!card) return;
            const id = card.dataset.projectId;
            const project = projects.find(p => String(p.id) === String(id));
            
            if (project) {
                // Populate Form
                const editIdInput = document.getElementById('edit-video-id');
                const titleInput = document.getElementById('add-video-title');
                const yearInput = document.getElementById('add-video-year');
                const submitBtn = addVideoForm?.querySelector('button[type="submit"]');


                if (editIdInput) editIdInput.value = project.id;
                if (titleInput) titleInput.value = project.title;
                if (addVideoUrlInput) addVideoUrlInput.value = project.videoUrl;
                if (yearInput) yearInput.value = project.year;

                
                const chips = document.querySelectorAll('input[name="category"]');
                chips.forEach(c => { if (c.value === project.category) c.checked = true; });

                if (btnToggleAddVideo) btnToggleAddVideo.textContent = 'ĐANG CHỈNH SỬA DỰ ÁN';
                if (submitBtn) submitBtn.textContent = 'CẬP NHẬT DỰ ÁN';
                
                if (addVideoFormContainer) {
                    addVideoFormContainer.style.display = 'block';
                    addVideoFormContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                // Trigger preview
                if (addVideoUrlInput) addVideoUrlInput.dispatchEvent(new Event('input'));
            }
        }

        if (deleteBtn) {
            e.preventDefault();
            const card = deleteBtn.closest('.project-card');
            if (!card) return;
            const id = card.dataset.projectId;
            
            // Precise deletion logic (one click, no confirm as requested)
            const index = projects.findIndex(p => String(p.id) === String(id));
            if (index !== -1) {
                projects.splice(index, 1);
                
                try {
                    // Immediate UI update
                    renderProjects();
                    updateStats();

                    // Persist to DB in background
                    await apiSave('/api/projects', projects);
                    saveStorage('tv_projects', projects);
                } catch (err) {
                    console.error('Delete failed:', err);
                    alert('Lỗi khi xóa: ' + err.message);
                    // Rollback UI
                    await fetchAllData();
                    renderProjects();
                }
            }
        }
    });

    btnToggleAddVideo.addEventListener('click', () => {
        // Reset form for "Add New"
        document.getElementById('edit-video-id').value = '';
        addVideoForm.reset();
        btnToggleAddVideo.textContent = '+ THÊM VIDEO MỚI';
        addVideoForm.querySelector('button[type="submit"]').textContent = 'LƯU VÀO KHO SẢN PHẨM';
        
        addVideoFormContainer.style.display = addVideoFormContainer.style.display === 'none' ? 'block' : 'none';
    });

    btnCancelAddVideo.addEventListener('click', () => {
        addVideoFormContainer.style.display = 'none';
        document.getElementById('edit-video-id').value = '';
        btnToggleAddVideo.textContent = '+ THÊM VIDEO MỚI';
        addVideoForm.querySelector('button[type="submit"]').textContent = 'LƯU VÀO KHO SẢN PHẨM';
    });



    addVideoForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titleInput = document.getElementById('add-video-title');
        const urlInput = document.getElementById('add-video-url');
        const yearInput = document.getElementById('add-video-year');
        const categoryInput = document.querySelector('input[name="category"]:checked');

        if (!urlInput?.value) {
            alert('Vui lòng nhập Video URL!');
            return;
        }

        const editId = document.getElementById('edit-video-id')?.value;
        const submitBtn = addVideoForm.querySelector('button[type="submit"]');
        const toastMsg = editId ? 'Đã cập nhật dự án!' : 'Đã thêm video mới!';
        
        await showToast(toastMsg, submitBtn, async () => {
            const finalThumbnail = getYoutubeThumbnail(urlInput.value);
            
            const projectData = {
                id: editId ? Number(editId) : Date.now(),
                title: titleInput?.value.toUpperCase() || 'UNTITLED',
                category: categoryInput?.value || 'COMMERCIAL',
                year: yearInput?.value || '2026',
                videoUrl: urlInput.value,
                thumbnail: finalThumbnail
            };

            let updatedProjects;
            if (editId) {
                updatedProjects = projects.map(p => p.id == editId ? projectData : p);
            } else {
                updatedProjects = [projectData, ...projects];
            }

            await apiSave('/api/projects', updatedProjects);
            projects = updatedProjects;
            saveStorage('tv_projects', projects);
            
            addVideoForm.reset();
            const editIdField = document.getElementById('edit-video-id');
            if (editIdField) editIdField.value = '';
            
            if (btnToggleAddVideo) btnToggleAddVideo.textContent = '+ THÊM VIDEO MỚI';
            if (submitBtn) submitBtn.textContent = 'LƯU VÀO KHO SẢN PHẨM';

            if (videoPreviewImg) videoPreviewImg.style.display = 'none';
            if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'flex';
            if (addVideoFormContainer) addVideoFormContainer.style.display = 'none';
            
            renderProjects();
            updateStats();
        });
    });

    // --- YOUTUBE HELPERS ---
    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const getYoutubeThumbnail = (url) => {
        const id = getYoutubeId(url);
        return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
    };



    if (addVideoUrlInput) {
        addVideoUrlInput.addEventListener('input', () => {
            const url = addVideoUrlInput.value;
            const thumb = getYoutubeThumbnail(url);
            
            if (thumb) {
                if (videoPreviewImg) {
                    videoPreviewImg.src = thumb;
                    videoPreviewImg.style.display = 'block';
                }
                if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'none';
            } else {
                if (videoPreviewImg) videoPreviewImg.style.display = 'none';
                if (videoPreviewPlaceholder) videoPreviewPlaceholder.style.display = 'flex';
            }
        });
    }

    // --- PROJECT LOGIC ---



    // --- PROFILE LOGIC ---
    // Thu thập dữ liệu từ các ô nhập hiện tại (để không bị mất khi render lại)
    const collectProfileInputs = () => {
        if (bioTextarea) profile.bio = bioTextarea.value;

        // Skills
        const skillItems = document.querySelectorAll('.skill-edit-item');
        profile.skills = Array.from(skillItems).map(item => {
            const nameEl = item.querySelector('.skill-name');
            const iconEl = item.querySelector('.skill-icon-url');
            return {
                name: nameEl ? nameEl.value : '',
                icon: iconEl ? iconEl.value : '',
                level: 100
            };
        });

        // Experience
        const expItems = document.querySelectorAll('#experience-list .exp-edit-item');
        profile.experience = Array.from(expItems).map(item => {
            const yearEl = item.querySelector('.exp-year');
            const roleEl = item.querySelector('.exp-role');
            const companyEl = item.querySelector('.exp-company');
            return {
                year: yearEl ? yearEl.value : '',
                role: roleEl ? roleEl.value : '',
                company: companyEl ? companyEl.value : ''
            };
        });

        // Education
        const eduItems = document.querySelectorAll('#education-list .exp-edit-item');
        profile.education = Array.from(eduItems).map(item => {
            const startEl = item.querySelector('.edu-start');
            const endEl = item.querySelector('.edu-end');
            const companyEl = item.querySelector('.exp-company');
            const degreeEl = item.querySelector('.exp-role');
            return {
                startYear: startEl ? startEl.value : '',
                endYear: endEl ? endEl.value : '',
                company: companyEl ? companyEl.value : '',
                degree: degreeEl ? degreeEl.value : ''
            };
        });
    };

    const renderProfile = () => {
        try {
            if (!profile.skills) profile.skills = [];
            if (!profile.experience) profile.experience = [];
            if (!profile.education) profile.education = [];

            if (bioTextarea) bioTextarea.value = profile.bio || '';

            if (skillsList) {
                skillsList.innerHTML = profile.skills.map((s, i) => `
                    <div class="skill-edit-item" data-index="${i}">
                        <div class="skill-top-row">
                            <div class="skill-icon-preview">
                                ${s.icon ? `<img src="${s.icon}" alt="Icon">` : `<span class="no-icon">NO IMG</span>`}
                            </div>
                            <div class="skill-inputs">
                                <input type="text" value="${s.name}" class="admin-input skill-name" placeholder="TÊN PHẦN MỀM">
                                <input type="text" value="${s.icon || ''}" class="admin-input skill-icon-url" placeholder="URL LOGO (R2)">
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button class="btn-icon delete btn-sm btn-remove-skill" title="Xóa phần mềm">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                `).join('');
            }

            if (experienceList) {
                experienceList.innerHTML = profile.experience.map((e, i) => `
                    <div class="exp-edit-item" data-index="${i}">
                        <input type="text" value="${e.year}" class="admin-input exp-year" placeholder="NĂM (VD: 2021-2024)">
                        <input type="text" value="${e.role}" class="admin-input exp-role" placeholder="VỊ TRÍ">
                        <input type="text" value="${e.company}" class="admin-input exp-company" placeholder="CÔNG TY">
                        <button class="btn-icon delete btn-remove-exp" title="Xóa">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `).join('');
            }

            if (educationList) {
                educationList.innerHTML = profile.education.map((e, i) => `
                    <div class="exp-edit-item" data-index="${i}">
                        <div class="year-range-inputs">
                            <input type="text" value="${e.startYear || ''}" class="admin-input edu-start" placeholder="BẮT ĐẦU">
                            <span class="year-separator">—</span>
                            <input type="text" value="${e.endYear || ''}" class="admin-input edu-end" placeholder="KẾT THÚC">
                        </div>
                        <input type="text" value="${e.degree || ''}" class="admin-input exp-role" placeholder="CHUYÊN NGÀNH">
                        <input type="text" value="${e.company || ''}" class="admin-input exp-company" placeholder="TRƯỜNG HỌC">
                        <button class="btn-icon delete btn-remove-edu" title="Xóa">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Error rendering profile:', err);
        }
    };

    btnAddSkill?.addEventListener('click', () => {
        collectProfileInputs();
        profile.skills.push({ name: 'KỸ NĂNG MỚI', icon: '', level: 50 });
        renderProfile();
    });

    btnAddExp?.addEventListener('click', () => {
        collectProfileInputs();
        profile.experience.push({ year: '2024', role: 'VỊ TRÍ', company: 'CÔNG TY' });
        renderProfile();
    });

    btnAddEdu?.addEventListener('click', () => {
        collectProfileInputs();
        profile.education.push({ startYear: '2020', endYear: '2024', degree: 'CHUYÊN NGÀNH', company: 'TRƯỜNG HỌC' });
        renderProfile();
    });

    skillsList?.addEventListener('click', e => {
        const removeBtn = e.target.closest('.btn-remove-skill');
        if (removeBtn) {
            collectProfileInputs();
            const index = parseInt(removeBtn.closest('.skill-edit-item').dataset.index, 10);
            profile.skills.splice(index, 1);
            renderProfile();
        }
    });

    experienceList?.addEventListener('click', e => {
        const removeBtn = e.target.closest('.btn-remove-exp');
        if (removeBtn) {
            collectProfileInputs();
            const index = parseInt(removeBtn.closest('.exp-edit-item').dataset.index, 10);
            profile.experience.splice(index, 1);
            renderProfile();
        }
    });

    educationList?.addEventListener('click', e => {
        const removeBtn = e.target.closest('.btn-remove-edu');
        if (removeBtn) {
            collectProfileInputs();
            const index = parseInt(removeBtn.closest('.exp-edit-item').dataset.index, 10);
            profile.education.splice(index, 1);
            renderProfile();
        }
    });

    // --- REAL-TIME SKILL PREVIEW ---
    skillsList?.addEventListener('input', (e) => {
        const item = e.target.closest('.skill-edit-item');
        if (item) {
            const nameInput = item.querySelector('.skill-name');
            const iconInput = item.querySelector('.skill-icon-url');
            const preview = item.querySelector('.skill-icon-preview');
            
            const name = nameInput.value.toLowerCase();
            const customIcon = iconInput.value.trim();
            
            const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
            const mapping = {
                'premiere': 'adobepremierepro', 'premierepro': 'adobepremierepro',
                'aftereffects': 'adobeaftereffects', 'photoshop': 'adobephotoshop',
                'audition': 'adobeaudition', 'illustrator': 'adobeillustrator',
                'davinci': 'davinciresolve', 'davinciresolve': 'davinciresolve',
                'capcut': 'capcut'
            };
            const slug = mapping[normalized] || normalized;
            const iconSrc = customIcon || `https://cdn.simpleicons.org/${slug}`;

            if (preview) {
                preview.innerHTML = `<img src="${iconSrc}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\'no-icon\'>NO IMG</span>'">`;
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
    const handleAvatarFile = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert('Vui lòng chọn file hình ảnh hợp lệ.');
            return;
        }

        const dropzoneContent = avatarDropzone.querySelector('.dropzone-content');
        const originalHTML = dropzoneContent.innerHTML;
        dropzoneContent.innerHTML = '<p>ĐANG TẢI LÊN R2...</p>';

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${WORKER_URL}/api/upload-thumbnail`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload to R2 failed');
            const data = await response.json();

            if (data.url) {
                inputUserAvatar.value = data.url;
                avatarPreview.src = data.url;
                dropzoneContent.innerHTML = '<p style="color: #4ade80;">TẢI LÊN THÀNH CÔNG!</p>';
                setTimeout(() => { dropzoneContent.innerHTML = originalHTML; }, 2000);
            }
        } catch (err) {
            console.error('Avatar upload failed:', err);
            alert('Lỗi khi tải ảnh lên R2. Vui lòng thử lại.');
            dropzoneContent.innerHTML = originalHTML;
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
