document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. SELEÇÃO DE ELEMENTOS GLOBAIS ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const contentStorage = document.getElementById('content-storage');
    const langSelector = document.getElementById('lang-selector');
    const themeToggleButton = document.getElementById('theme-toggle');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const menuOverlay = document.getElementById('menu-overlay');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox.querySelector('.lightbox-content');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    const lightboxPrev = lightbox.querySelector('.lightbox-nav.prev');
    const lightboxNext = lightbox.querySelector('.lightbox-nav.next');

    const hubs = {
        gallery: {
            tabButtons: document.querySelectorAll('#gallery-hub .hub-tab-button'),
            contentTabs: document.querySelectorAll('#gallery-hub .hub-content-tab'),
            contentButtons: document.querySelectorAll('#gallery-hub .hub-content-button'),
            displayArea: document.getElementById('gallery-hub-content-display')
        }
    };

    const updateArtistImage = () => {
        const artistImage = document.getElementById('artist-profile-pic');
        if (!artistImage) return;

        const isDarkMode = document.body.hasAttribute('data-theme');

        if (isDarkMode) {
            artistImage.src = 'Artist/ImagemEscuro.png';
        } else {
            artistImage.src = 'Artist/ImagemClaro.png';
        }
    };
    
    let translations = {};
    let galleriesData = {};
    let currentLang = 'pt';
    let currentLightboxGallerySlides = [];
    let currentLightboxIndex = 0;

    function random(min, max) { return Math.random() * (max - min) + min; }

    function createStarryNight() {
        const bg = document.getElementById('starry-background');
        if (!bg) return;
        
        const starsFraction = Math.min(bg.clientWidth * bg.clientHeight / 3000, 200);

        for (let i = 0; i < starsFraction; i++) {
            const star = document.createElement('div');
            star.style.cssText = `position:absolute; left:${random(0,99)}%; top:${random(0,99)}%; opacity:${random(0.5,1)}; width:${Math.random()<0.5?1:2}px; height:${Math.random()<0.5?1:2}px; background-color:var(--star-color); border-radius:50%; box-shadow:0 0 8px 2px var(--star-color);`;
            if (Math.random() < 0.25) star.style.animation = `twinkle${Math.floor(random(1,3))} 5s infinite`;
            bg.appendChild(star);
        }
        for (let i = 0; i < 3; i++) {
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';
            shootingStar.style.cssText = `top:${random(-10,60)}%; right:${random(-10,60)}%; animation-duration:${random(3,5)}s; animation-delay:${random(0,7)}s;`;
            bg.appendChild(shootingStar);
            shootingStar.addEventListener('animationend', () => {
                shootingStar.style.cssText = `top:${random(-10,60)}%; right:${random(-10,60)}%; animation:none;`;
                void shootingStar.offsetWidth;
                shootingStar.style.cssText += `animation-duration:${random(3,5)}s; animation-delay:${random(0,7)}s;`;
            });
        }
    }

    const buildGalleries = () => {
        for (const galleryId in galleriesData) {
            const galleryElement = contentStorage.querySelector(`#${galleryId}`);
            const sliderContainer = galleryElement?.querySelector('.slider-container');
            if (sliderContainer) {
                sliderContainer.innerHTML = '';
                galleriesData[galleryId].forEach(path => {
                    const img = document.createElement('img');
                    img.src = path;
                    img.alt = `Imagem da galeria ${galleryId}`;
                    img.classList.add('slide');
                    sliderContainer.appendChild(img);
                });
            }
        }
    };
    
    const loadArtWorkQueue = async () => {
        const getText = (key, fallback) => translations[currentLang]?.[key] || fallback;
        const queueContainer = document.querySelector('#queue');
        if (!queueContainer) return;

        try {
            const response = await fetch('WorkArt.json');
            if (!response.ok) throw new Error('Arquivo WorkArt.json não encontrado');
            const data = await response.json();

            const mapping = {
                'art-queue-not-started': data.NotStartedArt || [],
                'art-queue-in-progress': data.WipArt || [],
                'art-queue-completed': data.FinishArt || []
            };

            for (const id in mapping) {
                const listElement = queueContainer.querySelector(`#${id}`);
                if (listElement) {
                    listElement.innerHTML = '';
                    const items = mapping[id];
                    if (items.length > 0) {
                        items.forEach(item => listElement.innerHTML += `<li>${item}</li>`);
                    } else {
                        listElement.innerHTML = `<li>${getText('queue_empty', 'Nenhum trabalho aqui.')}</li>`;
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao carregar a fila de trabalho:", error);
            const listElement = queueContainer.querySelector('#art-queue-not-started');
            if(listElement) listElement.innerHTML = `<li>${getText('queue_error', 'Erro ao carregar.')}</li>`;
        }
    };

    const populateInfoPages = () => {
        const langData = translations[currentLang];
        if (!langData) return;

        const priceTableBody = document.querySelector('#price-table-body');
        if (priceTableBody && langData.price_table) {
            priceTableBody.innerHTML = '';
            langData.price_table.forEach(item => {
                priceTableBody.innerHTML += `<tr><td>${item.type}</td><td>${item.price}</td></tr>`;
            });
        }

        const tosList = document.querySelector('#tos-list');
        if (tosList && langData.tos_list) {
            tosList.innerHTML = '';
            langData.tos_list.forEach(itemText => {
                tosList.innerHTML += `<li>${itemText}</li>`;
            });
        }
    };

    const applyTranslations = () => {
        const langData = translations[currentLang];
        if (!langData) return;

        document.querySelectorAll('[data-lang]').forEach(element => {
            const key = element.dataset.lang;
            if (langData[key] !== undefined) {
                if (key === 'artist_name' && langData[key].includes(' ')) {
                    element.innerHTML = langData[key].replace(' ', '<br>');
                } else {
                    element.textContent = langData[key];
                }
            }
        });
        populateInfoPages();
    };

    const updateLightboxImage = () => {
        if (currentLightboxGallerySlides.length > 0) {
            lightboxImg.src = currentLightboxGallerySlides[currentLightboxIndex].src;
        }
    };

    const setupSlider = (galleryElement) => {
        const slides = Array.from(galleryElement.querySelectorAll('.slide'));
        if (slides.length === 0) return;
        const thumbnailNav = galleryElement.querySelector('.thumbnail-navigation');
        const counter = galleryElement.querySelector('.slide-counter');
        let currentIndex = 0;

        const showSlide = (index) => {
            currentIndex = index;
            slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
            if(thumbnailNav) thumbnailNav.querySelectorAll('.thumbnail-img').forEach((thumb, i) => thumb.classList.toggle('active', i === index));
            if(counter) counter.textContent = `${index + 1} / ${slides.length}`;
        };

        if(thumbnailNav) {
            thumbnailNav.innerHTML = '';
            slides.forEach((slide, index) => {
                const thumb = document.createElement('img');
                thumb.src = slide.src;
                thumb.className = 'thumbnail-img';
                thumb.addEventListener('click', () => showSlide(index));
                thumbnailNav.appendChild(thumb);
            });
        }

        galleryElement.querySelector('.slider-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('slide') && e.target.classList.contains('active')) {
                currentLightboxGallerySlides = slides;
                currentLightboxIndex = currentIndex;
                updateLightboxImage();
                lightbox.classList.add('active');
            }
        });

        galleryElement.querySelector('.prev')?.addEventListener('click', () => showSlide((currentIndex - 1 + slides.length) % slides.length));
        galleryElement.querySelector('.next')?.addEventListener('click', () => showSlide((currentIndex + 1) % slides.length));
        showSlide(0);
    };

    const showPage = (pageId) => pages.forEach(page => page.classList.toggle('active', page.id === pageId));
    const clearDisplayArea = (displayArea) => { while (displayArea.firstChild) contentStorage.appendChild(displayArea.firstChild); };
    
    const moveContent = (contentId, displayArea) => {
        clearDisplayArea(displayArea);
        const source = contentStorage.querySelector(`#${contentId}`);
        if (source) {
            displayArea.appendChild(source);
            if (source.classList.contains('gallery')) {
                setupSlider(source);
            }
            if (contentId === 'queue') {
                loadArtWorkQueue();
            }
        }
    };

    try {
        const [transRes, galRes] = await Promise.all([
            fetch('languages.json'),
            fetch('galleries.json')
        ]);
        translations = await transRes.json();
        galleriesData = await galRes.json();
    } catch (error) { console.error("Erro ao carregar arquivos JSON.", error); }
    
    buildGalleries();
    currentLang = localStorage.getItem('language') || 'pt';
    if(langSelector) langSelector.value = currentLang;
    applyTranslations();
    updateArtistImage();
    createStarryNight();

    langSelector.addEventListener('change', () => {
        currentLang = langSelector.value;
        localStorage.setItem('language', currentLang);
        applyTranslations();
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) toggleMenu();
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const pageId = link.dataset.page;
            showPage(pageId);
            if (pageId.includes('-hub')) {
                document.querySelector(`#${pageId} .hub-tab-button`)?.click();
            }
        });
    });

    Object.values(hubs).forEach(hub => {
        hub.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                hub.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const targetId = button.dataset.hubTarget;
                const targetElement = document.getElementById(targetId);
                if (hub.contentTabs) hub.contentTabs.forEach(tab => tab.classList.remove('active'));
                if (targetElement && targetElement.classList.contains('hub-content-tab')) {
                    clearDisplayArea(hub.displayArea);
                    targetElement.classList.add('active');
                    if (hub.contentButtons) hub.contentButtons.forEach(btn => btn.classList.remove('active'));
                } else {
                    moveContent(targetId, hub.displayArea);
                }
            });
        });
        if (hub.contentButtons) {
            hub.contentButtons.forEach(button => {
                button.addEventListener('click', () => {
                    hub.contentButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    moveContent(button.dataset.contentId, hub.displayArea);
                });
            });
        }
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    }
    themeToggleButton.addEventListener('click', () => {
        const isDark = document.body.hasAttribute('data-theme');
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        }
        updateArtistImage();
    });

    const closeLightbox = () => lightbox.classList.remove('active');
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { 
        if (e.target === lightbox) closeLightbox(); 
    });
    lightboxNext.addEventListener('click', (e) => { 
        e.stopPropagation(); currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxGallerySlides.length; 
        updateLightboxImage(); 
    });
    lightboxPrev.addEventListener('click', (e) => { 
        e.stopPropagation(); currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxGallerySlides.length) % currentLightboxGallerySlides.length; 
        updateLightboxImage(); 
    });
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') lightboxNext.click();
        if (e.key === 'ArrowLeft') lightboxPrev.click();
    });

    const toggleMenu = () => { sidebar.classList.toggle('open'); menuOverlay.classList.toggle('active'); };
    hamburgerBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
    
    document.querySelector('.nav-link[data-page="about"]').click();
});