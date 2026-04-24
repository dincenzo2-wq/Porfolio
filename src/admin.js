document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.admin-section');
    const colorPicker = document.querySelector('.admin-color-picker');
    const colorHex = document.querySelector('.color-hex');
    const greetingEl = document.getElementById('dynamic-greeting');

    // System Startup Sequence (Delight)
    console.log("%c MIDNIGHT COMMAND CENTER v2.0 - INITIALIZING...", "color: #ff4d4d; font-weight: bold; font-family: monospace;");

    // Dynamic Greeting
    const setGreeting = () => {
        const hour = new Date().getHours();
        let message = "CHÀO BUỔI SÁNG, ĐẠO DIỄN";
        if (hour >= 12 && hour < 18) message = "CHÀO BUỔI CHIỀU, ĐẠO DIỄN";
        if (hour >= 18 || hour < 5) message = "CHÀO BUỔI TỐI, ĐẠO DIỄN";
        greetingEl.textContent = message;
    };
    setGreeting();

    // Tab Switching Logic - Optimized with requestAnimationFrame
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            requestAnimationFrame(() => {
                // Update Buttons
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Sections
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetTab) {
                        section.classList.add('active');
                    }
                });

                // Update Header Title
                const title = document.querySelector('.admin-title');
                const tabNames = {
                    dashboard: 'BẢNG ĐIỀU KHIỂN',
                    content: 'KHO SẢN PHẨM',
                    profile: 'BIÊN TẬP HỒ SƠ',
                    settings: 'CẤU HÌNH HỆ THỐNG'
                };
                title.textContent = tabNames[targetTab] || 'HỆ THỐNG';
            });
        });
    });

    // Color Picker - Optimized with Debounce
    let colorTimeout;
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value.toUpperCase();
            colorHex.textContent = color;
            
            clearTimeout(colorTimeout);
            colorTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    document.documentElement.style.setProperty('--accent-color', color);
                });
            }, 10); // Subtle debounce to prevent thrashing
        });
    }

    // Generic "Save" Feedback
    const saveButtons = document.querySelectorAll('.btn-primary');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const originalText = btn.textContent;
            btn.textContent = 'ĐANG ĐỒNG BỘ DỮ LIỆU...';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            setTimeout(() => {
                btn.textContent = 'CẬP NHẬT THÀNH CÔNG!';
                btn.style.background = '#00FF41'; 
                btn.style.color = '#000';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'all';
                }, 2000);
            }, 1200);
        });
    });
});
