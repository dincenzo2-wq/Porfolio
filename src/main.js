document.addEventListener('DOMContentLoaded', () => {
    // --- DATA HANDLING ---
    const getStorage = (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal;
    const WORKER_URL = 'https://portfolio-api.dincenzo2.workers.dev';

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
        } catch (err) {
            console.warn('API Fetch failed, using localStorage fallback:', err);
            projects = getStorage('tv_projects', []);
            profile = getStorage('tv_profile', {});
            settings = getStorage('tv_settings', {});
        }
    };

    // --- DYNAMIC RENDERING ---
    const renderApp = () => {
        // 1. Branding
        document.getElementById('hero-name').innerHTML = settings.name.replace(' ', ' <span class="accent-name">') + '</span>';
        document.getElementById('hero-profession').textContent = settings.profession;
        const heroAvatar = document.getElementById('hero-avatar');
        if (heroAvatar && settings.avatar) {
            heroAvatar.src = settings.avatar;
            heroAvatar.style.opacity = '1';
        }
        document.documentElement.style.setProperty('--accent-color', settings.accentColor);

        // 2. Bio
        // SECURITY NOTE: Using .innerHTML with data from localStorage can be a security risk (XSS).
        // If the bio content can be complex, consider using a sanitization library like DOMPurify
        // to prevent malicious scripts from being injected.
        // Example: document.getElementById('about-bio').innerHTML = DOMPurify.sanitize(`<p>${profile.bio}</p>`);
        document.getElementById('about-bio').innerHTML = `<p>${profile.bio}</p>`;

        // 3. Skills
        const skillsContainer = document.getElementById('software-skills-container');
        if (skillsContainer) {
            skillsContainer.innerHTML = profile.skills.map(s => `
                <div class="soft-module active">
                    <div class="module-bg"></div>
                    <div class="module-content">
                        <div class="module-top">
                            <span class="soft-id">${s.id || s.name.substring(0, 2)}</span>
                            <span class="soft-level">${s.level > 90 ? 'MASTERED' : 'EXPERT'}</span>
                        </div>
                        <h4 class="soft-name">${s.name}</h4>
                        <div class="module-bar"><div class="bar-fill" style="width: ${s.level}%"></div></div>
                    </div>
                </div>
            `).join('');
        }

        // 4. Experience Timeline
        const expContainer = document.getElementById('experience-timeline-container');
        if (expContainer) {
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

        // 5. Projects Grid
        const projectsGrid = document.getElementById('projects-grid');
        if (projectsGrid) {
            renderProjects(projects, projectsGrid);
        }
    };

    const renderProjects = (projectsData, container) => {
        container.innerHTML = ''; // Clear existing content
        const fragment = document.createDocumentFragment();

        projectsData.forEach((p, i) => {
            const projectItem = document.createElement('div');
            projectItem.className = `work-item interactive-project ${i === 0 ? 'bento-large' : i === 1 ? 'bento-wide' : ''}`;
            projectItem.dataset.category = p.category.toLowerCase();
            projectItem.dataset.youtubeId = p.youtubeId;

            projectItem.innerHTML = `
                <div class="wipe-container">
                    <img src="https://img.youtube.com/vi/${p.youtubeId}/maxresdefault.jpg" alt="${p.title}" class="img-raw" loading="lazy">
                    <img src="https://img.youtube.com/vi/${p.youtubeId}/maxresdefault.jpg" alt="${p.title}" class="img-graded" loading="lazy">
                    <div class="wipe-line"></div>
                    <div class="play-overlay">
                        <div class="play-btn-cinematic">▶</div>
                    </div>
                    ${i === 0 ? '<div class="bento-tag">FEATURED</div>' : ''}
                </div>
                <div class="work-meta">
                    <span class="work-year">${p.year}</span>
                    <h3 class="work-title">${p.title}</h3>
                    <span class="work-cat">${p.category}</span>
                </div>
            `;

            // Attach listeners directly to the new element, eliminating the need for a separate `attachListeners` function.
            projectItem.addEventListener('mouseenter', () => {
                document.body.classList.add('lights-out');
                projectItem.classList.add('project-focus');
            });
            projectItem.addEventListener('mouseleave', () => {
                document.body.classList.remove('lights-out');
                projectItem.classList.remove('project-focus');
            });
            projectItem.addEventListener('click', () => {
                openLightbox(p.youtubeId);
            });

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

    // --- LIGHTBOX LOGIC ---
    const lightbox = document.getElementById('video-lightbox');
    const lightboxIframe = document.getElementById('lightbox-iframe');
    const openLightbox = (youtubeId) => {
        if (!youtubeId) return;
        lightboxIframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        setTimeout(() => { lightboxIframe.src = ''; document.body.style.overflow = ''; }, 300);
    };

    document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-overlay')?.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeLightbox());

    // --- REEL CAROUSEL ---
    const reelContainer = document.getElementById('experience-timeline-container');
    const btnNext = document.getElementById('reel-next');
    const btnPrev = document.getElementById('reel-prev');

    if (btnNext && btnPrev && reelContainer) {
        btnNext.addEventListener('click', () => {
            const active = reelContainer.querySelector('.active-reel');
            const next = active.nextElementSibling;
            if (next) {
                active.classList.remove('active-reel');
                next.classList.add('active-reel');
                next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
        btnPrev.addEventListener('click', () => {
            const active = reelContainer.querySelector('.active-reel');
            const prev = active.previousElementSibling;
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
