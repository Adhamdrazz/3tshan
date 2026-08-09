document.addEventListener('DOMContentLoaded', () => {
    // Initialize Map
    const map = L.map('map', {
        zoomControl: false // We will use custom zoom or disable to keep it clean
    }).setView([30.0444, 31.2357], 14); // Coordinates for Cairo as example

    // Tile layers (Google Maps in Arabic, hiding POIs)
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    });

    const googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=y&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    });

    // Add default layer
    googleStreets.addTo(map);

    let currentLayer = 'streets';
    const toggleBtn = document.getElementById('toggle-layer-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (currentLayer === 'streets') {
                map.removeLayer(googleStreets);
                googleSatellite.addTo(map);
                currentLayer = 'satellite';
                // Update icon to suggest Map view
                toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>';
            } else {
                map.removeLayer(googleSatellite);
                googleStreets.addTo(map);
                currentLayer = 'streets';
                // Update icon to suggest Satellite view
                toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>';
            }
        });
    }

    // Add User Location Marker
    const userIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: '<div class="user-marker"><div class="pulse"></div><div class="dot"></div></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });
    L.marker([30.0444, 31.2357], {icon: userIcon}).addTo(map);

    // Water Source SVG Marker Icon
    const waterIconHtml = `
        <div style="cursor:pointer; transition: transform 0.2s;">
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 48C20 48 40 31.3333 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.3333 20 48 20 48Z" fill="#0077D9"/>
                <path d="M20 36C26.6274 36 32 30.6274 32 24C32 17.3726 20 8 20 8C20 8 8 17.3726 8 24C8 30.6274 13.3726 36 20 36Z" fill="#00C2C7"/>
            </svg>
        </div>
    `;
    const waterIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: waterIconHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 48]
    });

    // Water Source with Plus (Add Source) SVG Marker
    const waterPlusIconHtml = `
        <div style="cursor:pointer; transition: transform 0.2s;">
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 48C20 48 40 31.3333 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.3333 20 48 20 48Z" fill="#0077D9"/>
                <path d="M20 36C26.6274 36 32 30.6274 32 24C32 17.3726 20 8 20 8C20 8 8 17.3726 8 24C8 30.6274 13.3726 36 20 36Z" fill="#00C2C7"/>
                <circle cx="28" cy="12" r="6" fill="#7AC943" stroke="white" stroke-width="2"/>
                <path d="M28 9V15M25 12H31" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        </div>
    `;
    const waterPlusIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: waterPlusIconHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 48]
    });

    // Add some dummy markers
    L.marker([30.0480, 31.2380], {icon: waterPlusIcon}).addTo(map);
    L.marker([30.0410, 31.2310], {icon: waterIcon}).addTo(map);
    L.marker([30.0460, 31.2300], {icon: waterPlusIcon}).addTo(map);

    // Basic interaction for chips
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // Navigation logic (Single Page App)
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.app-view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            // Update active state on nav links
            navLinks.forEach(nav => {
                if(nav.getAttribute('data-target') === targetId) {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });

            // Show target view, hide others
            views.forEach(view => {
                if (view.id === targetId) {
                    view.style.display = 'flex';
                    if (view.id === 'view-map') {
                        // Leaflet map needs invalidation when its container size changes
                        setTimeout(() => {
                            map.invalidateSize();
                        }, 100);
                    }
                } else {
                    view.style.display = 'none';
                }
            });
        });
    });

    // Form Radio Chips Logic
    const setupRadioChips = (groupName) => {
        const radios = document.querySelectorAll(`input[name="${groupName}"]`);
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Reset all labels in this group
                radios.forEach(r => {
                    const label = r.closest('label');
                    if (label) {
                        label.style.background = 'transparent';
                        label.style.borderColor = 'var(--border-color)';
                        label.style.color = 'var(--dark-navy)';
                        label.style.fontWeight = '500';
                    }
                });
                
                // Style selected label
                const selectedLabel = e.target.closest('label');
                if (selectedLabel) {
                    selectedLabel.style.background = 'rgba(0, 119, 217, 0.05)';
                    selectedLabel.style.borderColor = 'var(--primary-blue)';
                    selectedLabel.style.color = 'var(--primary-blue)';
                    selectedLabel.style.fontWeight = '700';
                }

                // Special handling for "Other" type
                if (groupName === 'type') {
                    const otherInput = document.getElementById('input-type-other');
                    if (e.target.value === 'other') {
                        otherInput.style.display = 'block';
                        otherInput.focus();
                    } else {
                        otherInput.style.display = 'none';
                    }
                }
            });
        });
    };

    setupRadioChips('type');
    setupRadioChips('temp');
    setupRadioChips('price');
});
