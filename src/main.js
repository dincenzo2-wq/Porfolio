document.addEventListener('DOMContentLoaded', () => {
    // --- DATA HANDLING ---
    const getStorage = (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal;
    const WORKER_URL = 'http://localhost:8787';

    let projects = [];
    let profile = {};
    let settings = {};

    const fetchData = async () => {
        try {
            const response = await fetch(`${WORKER_URL}/api/all-data`);
            if (!response.ok) throw new Error('API fetch failed');
            const data = await response.json();
            projects = data.projects || [];
            profile = data.profile || {};
            settings = data.settings || {};
            
            // Sync to localStorage
            localStorage.setItem('tv_projects', JSON.stringify(projects));
            localStorage.setItem('tv_profile', JSON.stringify(profile));
            localStorage.setItem('tv_settings', JSON.stringify(settings));
        } catch (err) {
            console.warn('API Fetch failed, using localStorage fallback:', err);
            projects = getStorage('tv_projects', []);
            profile = getStorage('tv_profile', {});
            settings = getStorage('tv_settings', {});
        }
    };

    // --- LIGHTBOX & YOUTUBE PLAYER LOGIC ---
    const lightbox = document.getElementById('video-lightbox');
    
    const openLightbox = (videoUrl) => {
        if (!videoUrl) return;
        
        if (lightbox) {
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        const container = document.getElementById('player');
        container.innerHTML = ''; // Clear content

        // Clean YouTube Handler
        let videoId = '';
        if (videoUrl.includes('v=')) {
            videoId = videoUrl.split('v=')[1].split('&')[0];
        } else if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('embed/')) {
            videoId = videoUrl.split('embed/')[1].split('?')[0];
        }

        if (videoId) {
            container.innerHTML = `
                <div class="youtube-wrapper">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                    <!-- Protective mask to prevent clicking out via YouTube logo -->
                    <div class="yt-mask-bottom-right"></div>
                </div>
            `;
        } else {
            container.innerHTML = `<div class="error-msg">VIDEO LINK KHÔNG HỢP LỆ</div>`;
        }
    };

    const closeLightbox = () => {
        if (lightbox) lightbox.classList.remove('active');
        const container = document.getElementById('player');
        if (container) container.innerHTML = '';
        document.body.style.overflow = '';
    };

    document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-overlay')?.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeLightbox());

    // --- DYNAMIC RENDERING ---
    const renderApp = () => {
        // 1. Branding
        if (settings && settings.name) {
            const name = settings.name || 'DIRECTOR NAME';
            const nameParts = name.split(' ');
            if (nameParts.length > 1) {
                const first = nameParts[0];
                const rest = nameParts.slice(1).join(' ');
                document.getElementById('hero-name').innerHTML = `${first} <span class="accent-name">${rest}</span>`;
            } else {
                document.getElementById('hero-name').textContent = name;
            }
        }
        
        if (settings && settings.profession) {
            document.getElementById('hero-profession').textContent = settings.profession;
        }

        const heroAvatar = document.getElementById('hero-avatar');
        if (heroAvatar && settings && settings.avatar) {
            heroAvatar.src = settings.avatar;
            heroAvatar.style.opacity = '1';
        }

        if (settings && settings.accentColor) {
            document.documentElement.style.setProperty('--accent-color', settings.accentColor);
        }

        // 2. Bio
        const bioEl = document.getElementById('about-bio');
        if (bioEl && profile && profile.bio) {
            bioEl.innerHTML = `<p>${profile.bio}</p>`;
        }

        // 3. Skills
        const skillsContainer = document.getElementById('software-skills-container');
        if (skillsContainer) {
            skillsContainer.innerHTML = profile.skills.map(s => {
                const shortId = s.id || s.name.substring(0, 2).toUpperCase();
                const nameLower = s.name.toLowerCase();
                const normalized = nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
                
                const mapping = {
                    'premiere': 'adobepremierepro', 'premierepro': 'adobepremierepro',
                    'aftereffects': 'adobeaftereffects', 'photoshop': 'adobephotoshop',
                    'audition': 'adobeaudition', 'illustrator': 'adobeillustrator',
                    'davinci': 'davinciresolve', 'davinciresolve': 'davinciresolve',
                    'capcut': 'capcut'
                };
                
                const slug = mapping[normalized] || normalized;
                const iconSrc = `https://cdn.simpleicons.org/${slug}`;

                let brandColor = 'var(--accent-color)';
                if (nameLower.includes('premiere')) brandColor = '#9999FF';
                else if (nameLower.includes('after effects')) brandColor = '#CF96FD';
                else if (nameLower.includes('davinci')) brandColor = '#FFD700';
                else if (nameLower.includes('photoshop')) brandColor = '#31A8FF';
                else if (nameLower.includes('audition')) brandColor = '#01E496';
                else if (nameLower.includes('capcut')) brandColor = '#FFFFFF';
                else if (nameLower.includes('illustrator')) brandColor = '#FF9A00';

                return `
                    <div class="soft-module active" style="--brand-color: ${brandColor}">
                        <div class="soft-icon-box">
                            <img src="${iconSrc}" alt="${s.name}" class="soft-img" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span class="soft-id-large" style="display: none;">${shortId}</span>
                            <div class="soft-glow"></div>
                        </div>
                        <div class="soft-info-v2">
                            <h4 class="soft-name-v2">${s.name}</h4>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 4. Experience Timeline
        const expContainer = document.getElementById('experience-timeline-container');
        if (expContainer && profile && profile.experience && profile.experience.length > 0) {
            expContainer.innerHTML = profile.experience.map((e, i) => `
                <div class="reel-card ${i === 0 ? 'active-reel' : ''}">
                    <div class="reel-card-inner">
                        <span class="reel-date">${e.year}</span>
                        <h4 class="reel-company">${e.company}</h4>
                        <p class="reel-role">${e.role}</p>
                        <span class="reel-star">★</span>
                    </div>
                </div>
            `).join('');
        }

        // 5. Education Timeline
        const eduContainer = document.getElementById('education-timeline-container');
        if (eduContainer && profile && profile.education && profile.education.length > 0) {
            eduContainer.innerHTML = profile.education.map(e => `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <span class="timeline-date">${e.startYear} — ${e.endYear}</span>
                        <h5 class="exp-company">${e.company}</h5>
                        <p class="exp-info">${e.degree}</p>
                    </div>
                </div>
            `).join('');
        }

        // 6. Projects Grid
        const projectsGrid = document.getElementById('projects-grid');
        if (projectsGrid) {
            renderProjects(projects, projectsGrid);
        }
    };

    const renderProjects = (projectsData, container) => {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        projectsData.forEach((p) => {
            const projectItem = document.createElement('div');
            projectItem.className = 'work-item interactive-project';
            projectItem.dataset.category = p.category.toLowerCase();

            // Auto-fallback for thumbnail if missing
            let thumbUrl = p.thumbnail;
            if (!thumbUrl && p.videoUrl) {
                const id = p.videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/)?.[2];
                if (id) thumbUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
            }
            if (!thumbUrl) thumbUrl = 'https://via.placeholder.com/1280x720/111/eee?text=NO+THUMBNAIL';

            projectItem.innerHTML = `
                <div class="thumb-container">
                    <img src="${thumbUrl}" alt="${p.title}" class="project-thumb" loading="lazy">
                    <div class="play-overlay">
                        <div class="play-btn-cinematic">▶</div>
                    </div>
                    <div class="work-cat-overlay">${p.category}</div>
                </div>
                <div class="work-meta">
                    <span class="work-year">${p.year}</span>
                    <h3 class="work-title">${p.title}</h3>
                </div>
            `;

            projectItem.addEventListener('mouseenter', () => document.body.classList.add('lights-out'));
            projectItem.addEventListener('mouseleave', () => document.body.classList.remove('lights-out'));
            projectItem.addEventListener('click', () => openLightbox(p.videoUrl));

            fragment.appendChild(projectItem);
        });

        container.appendChild(fragment);
    };

    // --- INTERSECTION OBSERVER ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('appear');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-in').forEach((el, index) => {
        el.style.transitionDelay = `${index * 100}ms`;
        observer.observe(el);
    });

    // --- FILTER LOGIC ---
    const consoleTabs = document.querySelectorAll('.console-tab');
    consoleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            consoleTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filterValue = tab.getAttribute('data-filter');
            const projectsGrid = document.getElementById('projects-grid');

            projectsGrid.style.opacity = '0';
            setTimeout(() => {
                const projectItems = document.querySelectorAll('.work-item');
                projectItems.forEach(item => {
                    const cat = item.getAttribute('data-category');
                    item.classList.toggle('hidden', filterValue !== 'all' && !cat.includes(filterValue));
                });
                projectsGrid.style.opacity = '1';
            }, 400);
        });
    });

    // --- REEL CAROUSEL ---
    const reelContainer = document.getElementById('experience-timeline-container');
    const btnNext = document.getElementById('reel-next');
    const btnPrev = document.getElementById('reel-prev');

    if (btnNext && btnPrev && reelContainer) {
        btnNext.addEventListener('click', () => {
            const active = reelContainer.querySelector('.active-reel');
            const next = active?.nextElementSibling;
            if (next) {
                active.classList.remove('active-reel');
                next.classList.add('active-reel');
                next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
        btnPrev.addEventListener('click', () => {
            const active = reelContainer.querySelector('.active-reel');
            const prev = active?.previousElementSibling;
            if (prev) {
                active.classList.remove('active-reel');
                prev.classList.add('active-reel');
                prev.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    // --- MOBILE NAVIGATION ---
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (mobileToggle && navLinksContainer) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
            document.body.style.overflow = navLinksContainer.classList.contains('active') ? 'hidden' : '';
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navLinksContainer.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // --- STARTUP ---
    const init = async () => {
        await fetchData();
        renderApp();
        document.body.classList.add('loaded');
    };

    init();
});
