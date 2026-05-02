document.addEventListener('DOMContentLoaded', () => {
    // --- DATA HANDLING ---
    const getStorage = (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal;
    // --- SMART CONFIG ---
    // Always use production URL to avoid confusion with local data
    // Priority: Production Worker (Remote Data) as default
    const WORKER_URL = 'https://portfolio-api.dincenzo2.workers.dev';
    const LOCAL_WORKER_URL = 'http://localhost:8787';

    let projects = [];
    let profile = {};
    let settings = {};
    
    // Pagination & Filter State
    let currentFilter = 'all';
    let visibleCount = 6;
    const PROJECTS_PER_PAGE = 6;

    const fetchData = async () => {
        try {
            const response = await fetch(`${WORKER_URL}/api/all-data`);
            const data = await response.json();
            projects = data.projects || [];
            profile = data.profile || {};
            if (!profile.skills) profile.skills = [];
            if (!profile.experience) profile.experience = [];
            if (!profile.education) profile.education = [];
            settings = data.settings || {};
            try {
                if (typeof settings.categories === 'string') settings.categories = JSON.parse(settings.categories);
            } catch(e) { settings.categories = ["COMMERCIAL", "TRAVEL", "WEDDING", "MUSIC VIDEO"]; }
            if (!settings.categories || settings.categories.length === 0) {
                settings.categories = ["COMMERCIAL", "TRAVEL", "WEDDING", "MUSIC VIDEO"];
            }
            
            // Sync to localStorage
            localStorage.setItem('tv_projects', JSON.stringify(projects));
            localStorage.setItem('tv_profile', JSON.stringify(profile));
            localStorage.setItem('tv_settings', JSON.stringify(settings));
        } catch (err) {
            console.warn('API Fetch failed, using localStorage fallback:', err);
            projects = getStorage('tv_projects', []);
            profile = getStorage('tv_profile', {});
            if (!profile.skills) profile.skills = [];
            if (!profile.experience) profile.experience = [];
            if (!profile.education) profile.education = [];
            settings = getStorage('tv_settings', {});
            try {
                if (typeof settings.categories === 'string') settings.categories = JSON.parse(settings.categories);
            } catch(e) { settings.categories = ["COMMERCIAL", "TRAVEL", "WEDDING", "MUSIC VIDEO"]; }
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
        }

        // Force Amber if legacy red or missing
        if (!settings.accentColor || settings.accentColor.toLowerCase() === '#e21d1d') {
            settings.accentColor = '#F59E0B';
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
        if (skillsContainer && profile && profile.skills) {
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
                const customIcon = s.icon || '';
                const fallbackIcon = `https://cdn.simpleicons.org/${slug}`;

                let iconContent = '';
                if (customIcon.trim().startsWith('<svg')) {
                    iconContent = customIcon;
                } else {
                    const src = customIcon || fallbackIcon;
                    iconContent = `
                        <img src="${src}" alt="${s.name}" class="soft-img" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <span class="soft-id-large" style="display: none;">${shortId}</span>
                    `;
                }

                return `
                    <div class="soft-module active">
                        <div class="soft-icon-box">
                            ${iconContent}
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
            expContainer.innerHTML = profile.experience.map((e, i) => {
                const yearText = e.endYear ? `${e.startYear} — ${e.endYear}` : e.startYear;
                return `
                    <div class="reel-card ${i === 0 ? 'active-reel' : ''}">
                        <div class="reel-card-inner">
                            <span class="reel-date">${yearText}</span>
                            <h4 class="reel-company">${e.company}</h4>
                            <p class="reel-role">${e.role}</p>
                            <span class="reel-star">★</span>
                        </div>
                    </div>
                `;
            }).join('');
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
            updateProjectDisplay();
        }

        // 7. Dynamic Category Tabs
        const consoleTabsContainer = document.querySelector('.console-tabs');
        if (consoleTabsContainer && settings && Array.isArray(settings.categories)) {
            const currentFilter = 'all'; // Default to all on load
            
            let tabsHtml = `
                <button class="console-tab active" data-filter="all">
                    <span class="tab-icon">▣</span> Tất cả dự án
                </button>
            `;
            
            settings.categories.forEach(cat => {
                const filter = cat.toLowerCase();
                tabsHtml += `
                    <button class="console-tab" data-filter="${filter}">
                        <span class="tab-icon">◈</span> ${cat}
                    </button>
                `;
            });
            
            consoleTabsContainer.innerHTML = tabsHtml;
            attachFilterListeners();
        }

        // 8. Load More Listener
        const btnLoadMore = document.getElementById('btn-load-more');
        if (btnLoadMore) {
            btnLoadMore.addEventListener('click', () => {
                visibleCount += PROJECTS_PER_PAGE;
                updateProjectDisplay();
            });
        }

        // 9. Footer Data
        const fSub = document.getElementById('footer-sub-header');
        const fMain = document.getElementById('footer-main-title');
        const fEmailLink = document.getElementById('footer-email-link');
        const fPhoneLink = document.getElementById('footer-phone-link');
        const fLocText = document.getElementById('footer-location-text');
        const fFacebook = document.getElementById('footer-facebook-link');
        const fInstagram = document.getElementById('footer-instagram-link');
        const fTiktok = document.getElementById('footer-tiktok-link');

        if (fSub && settings.footerSubHeader) fSub.textContent = settings.footerSubHeader;
        if (fMain && settings.footerMainTitle) fMain.textContent = settings.footerMainTitle;
        if (fEmailLink && settings.footerEmail) {
            fEmailLink.href = `mailto:${settings.footerEmail}`;
            fEmailLink.textContent = settings.footerEmail;
        }
        if (fPhoneLink && settings.footerPhone) {
            fPhoneLink.href = `tel:${settings.footerPhone}`;
            // Format: 0xxx xxx xxx or similar
            const raw = settings.footerPhone.replace(/\D/g, '');
            let formatted = raw;
            if (raw.length === 10) {
                formatted = `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`;
            } else if (raw.length === 11) {
                formatted = `${raw.slice(0, 5)} ${raw.slice(5, 8)} ${raw.slice(8)}`;
            }
            fPhoneLink.textContent = formatted;
        }
        if (fLocText && settings.footerLocation) fLocText.textContent = settings.footerLocation;
        if (fFacebook && settings.footerFacebook) fFacebook.href = settings.footerFacebook;
        if (fInstagram && settings.footerInstagram) fInstagram.href = settings.footerInstagram;
        if (fTiktok && settings.footerTiktok) fTiktok.href = settings.footerTiktok;
    };

    const updateProjectDisplay = () => {
        const grid = document.getElementById('projects-grid');
        const loadMoreContainer = document.getElementById('load-more-container');
        if (!grid) return;

        // Filter projects
        const filtered = currentFilter === 'all' 
            ? projects 
            : projects.filter(p => p.category.toLowerCase() === currentFilter.toLowerCase());

        // Slice for pagination
        const sliced = filtered.slice(0, visibleCount);
        
        renderProjects(sliced, grid);

        // Toggle Load More Button
        if (loadMoreContainer) {
            loadMoreContainer.style.display = (visibleCount < filtered.length) ? 'flex' : 'none';
        }
    };

    const renderProjects = (projectsData, container) => {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        projectsData.forEach((p, index) => {
            const projectItem = document.createElement('div');
            projectItem.className = 'work-item interactive-project project-reveal-anim';
            projectItem.dataset.category = p.category.toLowerCase();
            
            // Staggered reveal delay
            projectItem.style.animationDelay = `${index * 0.1}s`;

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
    const attachFilterListeners = () => {
        const consoleTabs = document.querySelectorAll('.console-tab');
        const projectsGrid = document.getElementById('projects-grid');

        consoleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                consoleTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                currentFilter = tab.getAttribute('data-filter');
                visibleCount = PROJECTS_PER_PAGE;
                
                if (projectsGrid) {
                    // Quick clear and re-render with animation
                    updateProjectDisplay();
                }
            });
        });
    };

    // --- REEL CAROUSEL ---
    const reelContainer = document.getElementById('experience-timeline-container');
    const btnNext = document.getElementById('reel-next');
    const btnPrev = document.getElementById('reel-prev');

    if (btnNext && btnPrev && reelContainer) {
        const updateActiveReel = () => {
            const cards = reelContainer.querySelectorAll('.reel-card');
            let closest = null;
            let minDistance = Infinity;
            const containerCenter = reelContainer.scrollLeft + reelContainer.offsetWidth / 2;

            cards.forEach(card => {
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                const distance = Math.abs(containerCenter - cardCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = card;
                }
            });

            if (closest && !closest.classList.contains('active-reel')) {
                cards.forEach(c => c.classList.remove('active-reel'));
                closest.classList.add('active-reel');
            }
        };

        reelContainer.addEventListener('scroll', () => {
            // Debounce or throttle could be added if needed
            updateActiveReel();
        });

        btnNext.addEventListener('click', () => {
            const active = reelContainer.querySelector('.active-reel');
            const next = active?.nextElementSibling;
            if (next) {
                next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                // active-reel class will be updated by scroll listener
            }
        });
        btnPrev.addEventListener('click', () => {
            const active = reelContainer.querySelector('.active-reel');
            const prev = active?.previousElementSibling;
            if (prev) {
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
        // 1. Show cached data immediately to prevent layout shift/placeholders
        projects = getStorage('tv_projects', []);
        profile = getStorage('tv_profile', {});
        if (!profile.skills) profile.skills = [];
        if (!profile.experience) profile.experience = [];
        if (!profile.education) profile.education = [];
        settings = getStorage('tv_settings', {});
        
        // Ensure categories are parsed if they come from localStorage as string
        try {
            if (typeof settings.categories === 'string') settings.categories = JSON.parse(settings.categories);
        } catch(e) { settings.categories = ["COMMERCIAL", "TRAVEL", "WEDDING", "MUSIC VIDEO"]; }
        
        renderApp();

        // 2. Fetch fresh data from D1 and update UI silently
        await fetchData();
        renderApp();
        document.body.classList.add('loaded');
    };

    init();
});
