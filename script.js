// Global state
const KEY_EXPIRATION_HOURS = 15; // Keys expire after 15 hours
let keys = [];

// Format date helper function
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Load and filter expired keys from localStorage
function loadValidKeys() {
    const savedKeys = JSON.parse(localStorage.getItem('nexusKeys')) || [];
    const now = new Date();
    
    // Filter out expired keys
    const validKeys = savedKeys.filter(keyData => {
        if (!keyData.expiresAt) return true; // Keep keys without expiration for backward compatibility
        return new Date(keyData.expiresAt) > now;
    });
    
    // Save back if any keys were removed
    if (validKeys.length !== savedKeys.length) {
        localStorage.setItem('nexusKeys', JSON.stringify(validKeys));
    }
    
    return validKeys;
}

// Initialize keys
keys = loadValidKeys();

// DOM Elements
let keysContainer, noKeysMessage, createKeyBtn, notification;

// Initialize the app based on the current page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    
    // Common elements
    notification = document.getElementById('notification');
    
    // Initialize based on current page
    if (path === 'index.html' || path === '') {
        initDashboard();
    } else if (path === 'verification.html') {
        initVerification();
    } else if (path === 'generate.html') {
        initGeneration();
    }

    // Initialize 3D background
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const particles = [];
    for (let i = 0; i < 100; i++) {
        const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.x = Math.random() * 10 - 5;
        particle.position.y = Math.random() * 10 - 5;
        particle.position.z = Math.random() * 10 - 5;
        scene.add(particle);
        particles.push(particle);
    }
    function animate() {
        requestAnimationFrame(animate);
        particles.forEach(particle => {
            particle.position.x += Math.random() * 0.01 - 0.005;
            particle.position.y += Math.random() * 0.01 - 0.005;
            particle.position.z += Math.random() * 0.01 - 0.005;
        });
        renderer.render(scene, camera);
    }
    animate();
});

// Dashboard Page
function initDashboard() {
    keysContainer = document.getElementById('keysContainer');
    noKeysMessage = document.getElementById('noKeysMessage');
    createKeyBtn = document.getElementById('createKeyBtn');
    
    // Load and display keys
    displayKeys();
    
    // Event listeners
    if (createKeyBtn) {
        createKeyBtn.addEventListener('click', () => {
            window.location.href = 'verification.html';
        });
    }
    
    // Initialize tilt effect on key cards
    initTiltEffect();
}

// Verification Page
function initVerification() {
    const generateKeyBtn = document.getElementById('generateKeyBtn');
    const backToDashboard = document.getElementById('backToDashboard');
    
    // Back to dashboard
    if (backToDashboard) {
        backToDashboard.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Generate key button
    if (generateKeyBtn) {
        generateKeyBtn.addEventListener('click', () => {
            // Generate key - this already returns an object with key, createdAt, expiresAt, and used
            const keyData = generateKey();
            
            // Store the key in sessionStorage for the generate page
            sessionStorage.setItem('generatedKey', JSON.stringify(keyData));
            
            // Save to localStorage
            let keys = JSON.parse(localStorage.getItem('nexusKeys')) || [];
            keys.push(keyData);
            localStorage.setItem('nexusKeys', JSON.stringify(keys));
            
            // Redirect to generate page
            window.location.href = 'generate.html';
        });
    }

    // Verification system
    const verifyLinks = document.querySelectorAll('.verify-link');
    let currentStep = 1;

    verifyLinks.forEach(link => {
        const stepNumber = parseInt(link.dataset.step);
        const statusEl = document.getElementById(`status${stepNumber}`);
        const stepElement = document.getElementById(`step${stepNumber}`);

        // Only enable first step initially
        if (stepNumber !== 1) {
            link.classList.add('locked');
            stepElement.classList.add('locked');
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();

            // If step is locked, ignore click
            if (link.classList.contains('locked')) return;

            // Show "verifying" status
            statusEl.textContent = 'Verifying...';
            statusEl.style.opacity = '1';
            link.classList.add('verifying');

            // Wait 5 seconds, then mark as verified
            setTimeout(() => {
                statusEl.textContent = 'Verified';
                link.classList.remove('verifying');
                link.classList.add('completed');
                link.style.pointerEvents = 'none'; // prevent re-click
                stepElement.classList.add('completed');
                stepElement.classList.remove('locked');

                // Unlock next step if exists
                const nextStep = stepNumber + 1;
                const nextLink = document.querySelector(`.verify-link[data-step="${nextStep}"]`);
                const nextStatus = document.getElementById(`status${nextStep}`);
                const nextStepElement = document.getElementById(`step${nextStep}`);
                
                if (nextLink && nextStatus && nextStepElement) {
                    nextLink.classList.remove('locked');
                    nextStatus.textContent = 'Waiting...';
                    nextStepElement.classList.remove('locked');
                } else if (generateKeyBtn) {
                    // If last step, enable Generate Key button
                    generateKeyBtn.disabled = false;
                    generateKeyBtn.classList.add('pulse');
                    showNotification('All steps completed! You can now generate your key.');
                }
            }, 5000);

            // Open link in new tab
            window.open(link.href, '_blank');
        });
    });
    if (backToDashboard) {
        backToDashboard.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// Generate Page
function initGeneration() {
    const keyValue = document.getElementById('keyValue');
    const copyKeyBtn = document.getElementById('copyKeyBtn');
    const backToDashboard = document.getElementById('backToDashboardFromGen');
    
    // Get the generated key from session storage
    const keyData = JSON.parse(sessionStorage.getItem('generatedKey'));
    
    if (keyValue && keyData) {
        // Display the key
        keyValue.textContent = keyData.key;
        
        // The key is already saved in localStorage from the verification page
        // So we don't need to save it again here
        
        // Clear the session storage
        sessionStorage.removeItem('generatedKey');
    } else {
        // If no key in session, redirect to dashboard
        window.location.href = 'index.html';
    }
    
    // Copy key to clipboard
    if (copyKeyBtn) {
        copyKeyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(keyValue.textContent)
                .then(() => {
                    showNotification('Key copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    showNotification('Failed to copy key');
                });
        });
    }
    
    // Back to dashboard
    if (backToDashboard) {
        backToDashboard.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// Helper Functions
function formatTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Expires in ${hours}h ${minutes}m`;
}

function displayKeys() {
    if (!keysContainer) return;
    
    // Clear the container
    keysContainer.innerHTML = '';
    
    // Load fresh keys from localStorage
    const savedKeys = JSON.parse(localStorage.getItem('nexusKeys')) || [];
    const now = new Date();
    
    // Filter out expired keys
    const validKeys = savedKeys.filter(keyData => {
        if (!keyData.expiresAt) return true; // Keep keys without expiration
        return new Date(keyData.expiresAt) > now;
    });
    
    // Update the global keys array
    keys = validKeys;
    
    if (keys.length === 0) {
        // Show "no keys" message
        noKeysMessage.style.display = 'block';
        keysContainer.appendChild(noKeysMessage);
        return;
    }
    
    // Hide "no keys" message
    noKeysMessage.style.display = 'none';
    
    // Add each key as a card
    keys.forEach((keyData, index) => {
        if (!keyData) return;
        
        const keyCard = document.createElement('div');
        keyCard.className = 'key-card tilt';
        keyCard.setAttribute('data-tilt', '');
        
        // Ensure we have valid key data
        const keyValue = typeof keyData === 'string' ? keyData : (keyData.key || 'Invalid Key');
        
        // Handle both string and object key data
        let createdAt, expiresAt;
        
        if (typeof keyData === 'object') {
            createdAt = keyData.createdAt ? new Date(keyData.createdAt) : new Date();
            expiresAt = keyData.expiresAt ? new Date(keyData.expiresAt) : null;
        } else {
            // For backward compatibility with old key format
            createdAt = new Date();
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 15); // Set 15 hours from now
        }
        
        // Format the dates
        const formattedDate = formatDate(createdAt);
        const timeRemaining = expiresAt ? formatTimeRemaining(expiresAt) : 'No expiration';
        const isExpired = timeRemaining === 'Expired';
        
        keyCard.innerHTML = `
            <div class="key-header">
                <h3>Key #${index + 1}</h3>
                <span class="key-date">Created: ${formattedDate}</span>
            </div>
            <div class="key-value">${keyValue}</div>
            <div class="key-meta">
                <span class="time-remaining ${isExpired ? 'expired' : ''}">
                    ${timeRemaining}
                </span>
            </div>
            <div class="key-actions">
                <button class="neon-button copy-btn ${isExpired ? 'expired' : ''}" 
                        data-key="${keyValue}" 
                        ${isExpired ? 'disabled' : ''}>
                    Copy
                </button>
            </div>
        `;
        
        keysContainer.appendChild(keyCard);
    });
    
    // Add event listeners to copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.getAttribute('data-key');
            navigator.clipboard.writeText(key)
                .then(() => {
                    showNotification('Key copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    showNotification('Failed to copy key');
                });
        });
    });
    
    // Re-initialize tilt effect
    initTiltEffect();
}

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY-';
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 2) key += '-';
    }
    
    // Set expiration time (15 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (15 * 60 * 60 * 1000)); // 15 hours in milliseconds
    
    return {
        key: key,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false
    };
}

function showNotification(message) {
    if (!notification) return;
    
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 3D Tilt Effect
function initTiltEffect() {
    const cards = document.querySelectorAll('.tilt');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const angleX = (y - centerY) / 20;
            const angleY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

// 3D Particle Background
function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    const particlesJs = document.getElementById('particles-js');
    if (particlesJs) {
        particlesJs.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        // Set canvas size
        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        
        // Particle class
        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 3 + 1;
                this.density = Math.random() * 30 + 1;
                this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.1})`;
                this.velocityX = (Math.random() - 0.5) * 0.5;
                this.velocityY = (Math.random() - 0.5) * 0.5;
            }
            
            update() {
                // Bounce off edges
                if (this.x < 0 || this.x > width) this.velocityX *= -1;
                if (this.y < 0 || this.y > height) this.velocityY *= -1;
                
                // Move particle
                this.x += this.velocityX;
                this.y += this.velocityY;
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
        }
        
        // Create particles
        const particles = [];
        const particleCount = Math.floor((width * height) / 15000); // Adjust density based on screen size
        
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
        
        // Connect particles
        function connect() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 100) {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / 100})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Animation loop
        function animate() {
            ctx.clearRect(0, 0, width, height);
            
            // Update and draw particles
            for (const particle of particles) {
                particle.update();
                particle.draw();
            }
            
            // Connect particles
            connect();
            
            requestAnimationFrame(animate);
        }
        
        // Mouse interaction
        let mouseX = 0;
        let mouseY = 0;
        
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Add repulsion effect
            for (const particle of particles) {
                const dx = mouseX - particle.x;
                const dy = mouseY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (150 - distance) / 150;
                    
                    particle.velocityX -= forceDirectionX * force * 0.1;
                    particle.velocityY -= forceDirectionY * force * 0.1;
                }
            }
        });
        
        // Start animation
        animate();
    }
}

