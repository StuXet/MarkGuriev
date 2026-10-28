'use strict';

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offsetTop = target.offsetTop - 80; // Account for fixed navbar
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// Active navigation link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function setActiveNavLink(sectionId) {
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
  });
}

function highlightActiveSection() {
  const scrollY = window.pageYOffset;

  // The last section is too short to reach the top of the screen, so treat the page bottom as it
  const atPageBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
  if (atPageBottom && sections.length) {
    setActiveNavLink(sections[sections.length - 1].getAttribute('id'));
    return;
  }

  sections.forEach(section => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 100;
    const sectionId = section.getAttribute('id');

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });
}

window.addEventListener('scroll', highlightActiveSection);

// Portfolio filtering
const filterButtons = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons
    filterButtons.forEach(btn => btn.classList.remove('active'));
    // Add active class to clicked button
    button.classList.add('active');

    const filterValue = button.getAttribute('data-filter');

    portfolioItems.forEach(item => {
      const itemCategory = item.getAttribute('data-category');

      if (filterValue === 'all' || filterValue === itemCategory) {
        item.classList.remove('hidden');
        item.style.animation = 'fadeIn 0.5s ease';
      } else {
        item.classList.add('hidden');
      }
    });
  });
});

// Portfolio Modal functionality
const portfolioModal = document.getElementById('portfolio-modal');
const modalCloseBtn = document.querySelector('.portfolio-modal-close');
const modalOverlay = document.querySelector('.portfolio-modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMainImage = document.getElementById('modal-main-image');
const modalMainVideo = document.getElementById('modal-main-video');
const modalGallery = document.getElementById('modal-gallery');
const modalContent = document.getElementById('modal-content');
const modalExternalLink = document.getElementById('modal-external-link');
const modalSourceLink = document.getElementById('modal-source-link');

// Portfolio data structure - you can expand this with actual content
const portfolioData = {
  'gnome-splash': {
    title: 'Gnome Splash',
    mainMedia: './assets/images/sD2t3.png',
    mediaType: 'image',
    gallery: ['./assets/images/sD2t3.png'],
    content: `
      <h3>Gnome Splash: A Whimsical Adventure</h3>
      <p>Gnome Splash is an exciting game developed using Unreal Engine. This project showcases advanced game development techniques and creative gameplay mechanics.</p>
      <h3>Key Features</h3>
      <ul>
        <li>Engaging gameplay mechanics</li>
        <li>Beautiful visual design</li>
        <li>Optimized performance</li>
      </ul>
    `
  },
  'dark-descent': {
    title: 'Dark Descent',
    mainMedia: './assets/images/XQZtiY.png',
    mediaType: 'image',
    gallery: ['./assets/images/XQZtiY.png'],
    content: `
      <h3>Dark Descent: Into the Abyss</h3>
      <p>Dark Descent is a Unity-based game that takes players on a thrilling journey through mysterious depths.</p>
      <h3>Development Highlights</h3>
      <ul>
        <li>Unity Engine implementation</li>
        <li>Atmospheric design</li>
        <li>Engaging narrative</li>
      </ul>
    `
  },
  'growbot': {
    title: 'GROWBOT',
    mainMedia: './assets/images/IrZdo2.png',
    mediaType: 'image',
    gallery: ['./assets/images/IrZdo2.png'],
    content: `
      <h3>GROWBOT: Mechanical Evolution</h3>
      <p>GROWBOT is a Unity game featuring unique growth mechanics and robot evolution systems.</p>
      <h3>Game Mechanics</h3>
      <ul>
        <li>Progressive growth system</li>
        <li>Strategic gameplay</li>
        <li>Customizable robots</li>
      </ul>
    `
  },
  'once-upon-a-fantasy': {
    title: 'Once Upon A Fantasy',
    mainMedia: './assets/images/zrsWo3.png',
    mediaType: 'image',
    gallery: ['./assets/images/zrsWo3.png'],
    sourceUrl: 'https://github.com/StuXet/LaserTurtles',
    content: `
      <h3>About the Game</h3>
      <p>Once Upon A Fantasy is an isometric action RPG set inside the magical dreamworld of a sleeping child. Players fight their way through waves of enemies and bosses using melee, heavy and special attacks.</p>
      <p>Developed by a 5-person team as a year-long production project at Tiltan School of Design &amp; Visual Communication (2022–2023).</p>
      <h3>My Role</h3>
      <p>Gameplay Programmer</p>
      <ul>
        <li>Built player melee combat: light attacks and a hold-to-charge heavy attack</li>
        <li>Wrote a wave-based enemy spawner triggered when the player enters an area</li>
        <li>Implemented a 3-lives death system, plus max-HP and speed pickups</li>
        <li>Built the main, pause and settings menus (resolution, fullscreen, graphics quality, volume, cursor), with saving so players can continue later</li>
        <li>Added screen shake for combat feedback</li>
        <li>Prototyped (not in the final build): fireball projectiles, a special attack that pulls enemies toward the player with physics while temporarily disabling their AI and navigation, and breakable environment objects that drop items</li>
      </ul>
      <h3>Tech</h3>
      <ul>
        <li>Unity · C# · Visual Studio · GitHub</li>
      </ul>
    `
  },
  'click-and-learn': {
    title: 'Click and Learn',
    mainMedia: './assets/images/UBzoes.png',
    mediaType: 'image',
    gallery: ['./assets/images/UBzoes.png'],
    sourceUrl: 'https://github.com/StuXet/Click-n-Learn',
    content: `
      <h3>About the Game</h3>
      <p>Click and Learn is an educational 2D platformer for children who are starting to read and write. Players guide Smadji, a slime-like creature on his way to his grandmother's house for dinner. To get past obstacles, they recognize words, read aloud by voice, and choose the object that matches each word. Available in English and Hebrew.</p>
      <p>Made in 3 days (August 2022) by a 2-person team for the <em>Game Design for Children</em> game jam, hosted by D4CR and Tiltan School of Design &amp; Visual Communication.</p>
      <h3>My Role</h3>
      <p>Developer · Game Designer · Audio Designer · Environment Designer</p>
      <ul>
        <li>Set up the Unity project and Git repo; integrated a third-party 2D controller and added fall respawning</li>
        <li>Designed and built the level environment using pixel-art tilesets and props</li>
        <li>Programmed checkpoint respawning for spike and hazard sections</li>
        <li>Built the main menu, pause menu (freezes game time) and win screen</li>
        <li>Added background music that keeps playing across scenes, and integrated the game's audio</li>
      </ul>
      <h3>Tech</h3>
      <ul>
        <li>Unity · C# · Visual Studio · GitHub</li>
      </ul>
    `
  },
  'fall-of-the-aristocats': {
    title: 'Fall of the Aristocats',
    mainMedia: './assets/images/Y1ZdIZ.png',
    mediaType: 'image',
    gallery: ['./assets/images/Y1ZdIZ.png'],
    sourceUrl: 'https://github.com/StuXet/GD2-FinalProject',
    content: `
      <h3>Fall of the Aristocats: Strategic Gameplay</h3>
      <p>Fall of the Aristocats is a Unity strategy game featuring tactical combat and resource management.</p>
      <h3>Game Features</h3>
      <ul>
        <li>Strategic combat system</li>
        <li>Resource management</li>
        <li>Character progression</li>
      </ul>
    `
  }
};

function openPortfolioModal(projectId, externalUrl = null) {
  const project = portfolioData[projectId];
  if (!project) return;

  // Set title
  modalTitle.textContent = project.title;

  // Set itch.io link
  if (externalUrl) {
    modalExternalLink.href = externalUrl;
    modalExternalLink.style.display = '';
  } else {
    modalExternalLink.style.display = 'none';
  }

  // Set source code link (only for projects with a public repo)
  if (project.sourceUrl) {
    modalSourceLink.href = project.sourceUrl;
    modalSourceLink.style.display = '';
  } else {
    modalSourceLink.style.display = 'none';
  }

  // Set main media
  if (project.mediaType === 'video') {
    modalMainImage.style.display = 'none';
    modalMainVideo.style.display = 'block';
    modalMainVideo.src = project.mainMedia;
  } else {
    modalMainVideo.style.display = 'none';
    modalMainImage.style.display = 'block';
    modalMainImage.src = project.mainMedia;
    modalMainImage.alt = project.title;
  }

  // Set gallery
  modalGallery.innerHTML = '';
  project.gallery.forEach((media, index) => {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'portfolio-modal-gallery-item';
    if (index === 0) galleryItem.classList.add('active');
    
    if (media.endsWith('.mp4') || media.endsWith('.webm')) {
      const video = document.createElement('video');
      video.src = media;
      video.muted = true;
      galleryItem.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = media;
      img.alt = `${project.title} - Image ${index + 1}`;
      galleryItem.appendChild(img);
    }
    
    galleryItem.addEventListener('click', () => {
      // Update active state
      modalGallery.querySelectorAll('.portfolio-modal-gallery-item').forEach(item => {
        item.classList.remove('active');
      });
      galleryItem.classList.add('active');
      
      // Update main media
      if (media.endsWith('.mp4') || media.endsWith('.webm')) {
        modalMainImage.style.display = 'none';
        modalMainVideo.style.display = 'block';
        modalMainVideo.src = media;
      } else {
        modalMainVideo.style.display = 'none';
        modalMainImage.style.display = 'block';
        modalMainImage.src = media;
      }
    });
    
    modalGallery.appendChild(galleryItem);
  });

  // Set content
  modalContent.innerHTML = project.content;

  // Show modal
  portfolioModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePortfolioModal() {
  portfolioModal.classList.remove('active');
  document.body.style.overflow = '';
  // Pause video if playing
  if (modalMainVideo) {
    modalMainVideo.pause();
    modalMainVideo.currentTime = 0;
  }
}

// Event listeners
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', closePortfolioModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', closePortfolioModal);
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && portfolioModal.classList.contains('active')) {
    closePortfolioModal();
  }
});

// Update portfolio items to open modals
portfolioItems.forEach(item => {
  const link = item.querySelector('.portfolio-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const projectId = item.getAttribute('data-project-id') || 
                       item.querySelector('.portfolio-title')?.textContent.toLowerCase().replace(/\s+/g, '-');
      const externalUrl = link.getAttribute('href');
      openPortfolioModal(projectId, externalUrl);
    });
  }
});

// Add fadeIn animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// Navbar background on scroll
const navbar = document.querySelector('.top-navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 100) {
    navbar.style.background = 'rgba(7, 7, 7, 0.98)';
    navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
  } else {
    navbar.style.background = 'rgba(7, 7, 7, 0.95)';
    navbar.style.boxShadow = 'none';
  }

  lastScroll = currentScroll;
});

// Calculate Years of Experience from 2021
function calculateYearsOfExperience() {
  const startYear = 2021;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // If we're past April (when education started), count the current year
  let years = currentYear - startYear;
  if (currentMonth < 3) { // Before April
    years = years - 1;
  }
  
  const yearsElement = document.getElementById('years-of-experience');
  if (yearsElement) {
    yearsElement.textContent = years;
  }
}

// Sync photo width with buttons width
function syncPhotoWidthWithButtons() {
  const buttonsContainer = document.querySelector('.hero-buttons');
  const photoWrapper = document.querySelector('.hero-image-wrapper');
  
  if (buttonsContainer && photoWrapper) {
    const buttonsWidth = buttonsContainer.offsetWidth;
    photoWrapper.style.width = `${buttonsWidth}px`;
  }
}

// Initialize - highlight home section on load
window.addEventListener('load', () => {
  if (window.pageYOffset < 100) {
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#home') {
        link.classList.add('active');
      }
    });
  }
  
  // Calculate years of experience
  calculateYearsOfExperience();

  // Keep footer copyright year current
  const currentYearElement = document.getElementById('current-year');
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  // Sync photo width with buttons
  syncPhotoWidthWithButtons();
  
  // Re-sync on window resize
  window.addEventListener('resize', syncPhotoWidthWithButtons);
});
