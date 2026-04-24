document.addEventListener('DOMContentLoaded', () => {
    // 1. Interaction Logic (Lights Out Focus)
    const interactiveElements = document.querySelectorAll('a, button, .interactive-project, .nav-link, .reel-card, .work-item, .reel-btn');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (el.classList.contains('work-item')) {
                document.body.classList.add('lights-out');
                el.classList.add('project-focus');
            }
        });
        el.addEventListener('mouseleave', () => {
            document.body.classList.remove('lights-out');
            el.classList.remove('project-focus');
        });
    });

    // 2. Project Filter Logic

    // Intersection Observer for Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach((el, index) => {
        el.style.transitionDelay = `${index * 100}ms`;
        observer.observe(el);
    });

    // Page Load Wipe
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
    });

    // Category Filtering Logic
    const consoleTabs = document.querySelectorAll('.console-tab');
    const projectItems = document.querySelectorAll('.work-item');
    const projectsGrid = document.getElementById('projects-grid');

    consoleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            consoleTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            const filterValue = tab.getAttribute('data-filter');

            // Animate grid out
            projectsGrid.style.opacity = '0';
            projectsGrid.style.transform = 'translateY(10px)';

            setTimeout(() => {
                projectItems.forEach(item => {
                    const itemCategory = item.getAttribute('data-category');
                    
                    if (filterValue === 'all' || itemCategory === filterValue) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });

                // Animate grid back in
                projectsGrid.style.opacity = '1';
                projectsGrid.style.transform = 'translateY(0)';
            }, 400);
        });
    });

    // Video Lightbox Logic
    const lightbox = document.getElementById('video-lightbox');
    const lightboxIframe = document.getElementById('lightbox-iframe');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxOverlay = document.querySelector('.lightbox-overlay');

    function openLightbox(youtubeId) {
        if (!youtubeId) return;
        const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
        lightboxIframe.src = embedUrl;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock scroll
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightboxIframe.src = '';
            document.body.style.overflow = ''; // Unlock scroll
        }, 300);
    }

    projectItems.forEach(item => {
        item.addEventListener('click', () => {
            const youtubeId = item.getAttribute('data-youtube-id');
            openLightbox(youtubeId);
        });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);

    // Escape key to close lightbox
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
});
