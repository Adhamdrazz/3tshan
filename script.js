document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // Initialize Map
    // =========================

    const map = L.map('map', {
        zoomControl: false
    }).setView([30.0444, 31.2357], 14);


    // =========================
    // Tile Layers
    // =========================

    const googleStreets = L.tileLayer(
        'http://{s}.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff',
        {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }
    );

    const googleSatellite = L.tileLayer(
        'http://{s}.google.com/vt/lyrs=y&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff',
        {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }
    );

    googleStreets.addTo(map);


    // =========================
    // Map Layer Toggle
    // =========================

    let currentLayer = 'streets';

    const toggleBtn = document.getElementById('toggle-layer-btn');

    if (toggleBtn) {

        toggleBtn.addEventListener('click', () => {

            if (currentLayer === 'streets') {

                map.removeLayer(googleStreets);
                googleSatellite.addTo(map);

                currentLayer = 'satellite';

                toggleBtn.innerHTML = `
                    <svg width="24" height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round">

                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                        <line x1="8" y1="2" x2="8" y2="18"></line>
                        <line x1="16" y1="6" x2="16" y2="22"></line>

                    </svg>
                `;

            } else {

                map.removeLayer(googleSatellite);
                googleStreets.addTo(map);

                currentLayer = 'streets';

                toggleBtn.innerHTML = `
                    <svg width="24" height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round">

                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>

                    </svg>
                `;
            }
        });
    }


    // =========================
    // User Location Marker
    // =========================

    const userIcon = L.divIcon({
        className: 'custom-leaflet-marker',

        html: `
            <div class="user-marker">
                <div class="pulse"></div>
                <div class="dot"></div>
            </div>
        `,

        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });


    // =========================
    // Real User Location
    // =========================

    let userMarker = null;

    let userLatitude = null;
    let userLongitude = null;


    function showUserLocation(latitude, longitude) {

        userLatitude = latitude;
        userLongitude = longitude;


        // Remove previous marker
        if (userMarker) {
            map.removeLayer(userMarker);
        }


        // Create user marker
        userMarker = L.marker(
            [latitude, longitude],
            {
                icon: userIcon
            }
        ).addTo(map);


        // Move map to user location
        map.setView(
            [latitude, longitude],
            16
        );


        console.log(
            'User location:',
            latitude,
            longitude
        );
    }


    function getUserLocation() {

        if (!navigator.geolocation) {

            console.error(
                'Geolocation is not supported by this browser.'
            );

            // Fallback
            showUserLocation(
                30.0444,
                31.2357
            );

            return;
        }


        navigator.geolocation.getCurrentPosition(

            (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                showUserLocation(
                    latitude,
                    longitude
                );
            },


            (error) => {

                console.error(
                    'Unable to get user location:',
                    error
                );


                // Fallback to Cairo
                showUserLocation(
                    30.0444,
                    31.2357
                );
            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );
    }


    // Get real user location
    getUserLocation();


    // =========================
    // Water Source Marker
    // =========================

    const waterIconHtml = `
        <div style="cursor:pointer; transition: transform 0.2s;">

            <svg
                width="40"
                height="48"
                viewBox="0 0 40 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">

                <path
                    d="M20 48C20 48 40 31.3333 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.3333 20 48 20 48Z"
                    fill="#0077D9"
                />

                <path
                    d="M20 36C26.6274 36 32 30.6274 32 24C32 17.3726 20 8 20 8C20 8 8 17.3726 8 24C8 30.6274 13.3726 36 20 36Z"
                    fill="#00C2C7"
                />

            </svg>

        </div>
    `;


    const waterIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: waterIconHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 48]
    });


    // =========================
    // Add Source Marker
    // =========================

    const waterPlusIconHtml = `
        <div style="cursor:pointer; transition: transform 0.2s;">

            <svg
                width="40"
                height="48"
                viewBox="0 0 40 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">

                <path
                    d="M20 48C20 48 40 31.3333 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.3333 20 48 20 48Z"
                    fill="#0077D9"
                />

                <path
                    d="M20 36C26.6274 36 32 30.6274 32 24C32 17.3726 20 8 20 8C20 8 8 17.3726 8 24C8 30.6274 13.3726 36 20 36Z"
                    fill="#00C2C7"
                />

                <circle
                    cx="28"
                    cy="12"
                    r="6"
                    fill="#7AC943"
                    stroke="white"
                    stroke-width="2"
                />

                <path
                    d="M28 9V15M25 12H31"
                    stroke="white"
                    stroke-width="1.5"
                    stroke-linecap="round"
                />

            </svg>

        </div>
    `;


    const waterPlusIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: waterPlusIconHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 48]
    });


    // =========================
    // Load Water Sources From API
    // =========================

    async function loadWaterSources() {

        try {

            console.log('Loading water sources...');


            const response =
                await fetch('/api/water-sources');


            if (!response.ok) {

                throw new Error(
                    `HTTP error: ${response.status}`
                );

            }


            const result =
                await response.json();


            console.log(
                'Water sources from API:',
                result
            );


            // Validate response
            if (
                !result.success ||
                !Array.isArray(result.data)
            ) {

                console.error(
                    'Invalid API response:',
                    result
                );

                return;
            }


            // Add sources to map
            result.data.forEach(source => {

                if (
                    source.latitude === null ||
                    source.latitude === undefined ||
                    source.longitude === null ||
                    source.longitude === undefined
                ) {

                    console.warn(
                        'Source has no coordinates:',
                        source
                    );

                    return;
                }


                const latitude =
                    Number(source.latitude);

                const longitude =
                    Number(source.longitude);


                // Create marker
                const marker = L.marker(
                    [latitude, longitude],
                    {
                        icon: waterIcon
                    }
                ).addTo(map);


                // Type
                let typeText = 'مصدر مياه';

                if (source.type === 'cooler') {
                    typeText = 'كولدير';
                }

                if (source.type === 'tap') {
                    typeText = 'حنفية';
                }


                // Temperature
                let tempText = 'غير محددة';

                if (source.temp_status === 'cold') {
                    tempText = 'باردة';
                }

                if (source.temp_status === 'normal') {
                    tempText = 'عادية';
                }


                // Price
                let priceText = 'غير محدد';

                if (source.price_type === 'free') {
                    priceText = 'مجانية';
                }

                if (source.price_type === 'paid') {
                    priceText = 'مدفوعة';
                }


                // Status
                const statusText =
                    source.status === 'pending'
                        ? 'قيد المراجعة'
                        : 'معتمد';


                // Popup
                marker.bindPopup(`
                    <div
                        dir="rtl"
                        style="
                            text-align:right;
                            min-width:200px;
                            font-family:Arial,sans-serif;
                            line-height:1.8;
                        "
                    >

                        <strong
                            style="
                                font-size:16px;
                                color:#0077D9;
                            "
                        >
                            ${source.name || 'مصدر مياه'}
                        </strong>

                        <br>

                        النوع:
                        ${typeText}

                        <br>

                        المياه:
                        ${tempText}

                        <br>

                        السعر:
                        ${priceText}

                        <br>

                        الحالة:
                        ${statusText}

                    </div>
                `);

            });


            console.log(
                `Loaded ${result.data.length} water source(s).`
            );

        } catch (error) {

            console.error(
                'Error loading water sources:',
                error
            );

        }
    }


    // Start loading sources
    loadWaterSources();


    // =========================
    // Chips Interaction
    // =========================

    const chips =
        document.querySelectorAll('.chip');


    chips.forEach(chip => {

        chip.addEventListener('click', () => {

            chips.forEach(c => {
                c.classList.remove('active');
            });

            chip.classList.add('active');

        });

    });


    // =========================
    // Navigation Logic
    // =========================

    const navLinks =
        document.querySelectorAll('.nav-link');

    const views =
        document.querySelectorAll('.app-view');


    navLinks.forEach(link => {

        link.addEventListener('click', (e) => {

            e.preventDefault();


            const targetId =
                link.getAttribute('data-target');


            // Update active navigation
            navLinks.forEach(nav => {

                if (
                    nav.getAttribute('data-target') === targetId
                ) {

                    nav.classList.add('active');

                } else {

                    nav.classList.remove('active');

                }

            });


            // Show selected view
            views.forEach(view => {

                if (view.id === targetId) {

                    view.style.display = 'flex';


                    if (view.id === 'view-map') {

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


    // =========================
    // Form Radio Chips
    // =========================

    const setupRadioChips = (groupName) => {

        const radios =
            document.querySelectorAll(
                `input[name="${groupName}"]`
            );


        radios.forEach(radio => {

            radio.addEventListener(
                'change',
                (e) => {


                    // Reset labels
                    radios.forEach(r => {

                        const label =
                            r.closest('label');


                        if (label) {

                            label.style.background =
                                'transparent';

                            label.style.borderColor =
                                'var(--border-color)';

                            label.style.color =
                                'var(--dark-navy)';

                            label.style.fontWeight =
                                '500';

                        }

                    });


                    // Selected label
                    const selectedLabel =
                        e.target.closest('label');


                    if (selectedLabel) {

                        selectedLabel.style.background =
                            'rgba(0, 119, 217, 0.05)';

                        selectedLabel.style.borderColor =
                            'var(--primary-blue)';

                        selectedLabel.style.color =
                            'var(--primary-blue)';

                        selectedLabel.style.fontWeight =
                            '700';

                    }


                    // Other type
                    if (groupName === 'type') {

                        const otherInput =
                            document.getElementById(
                                'input-type-other'
                            );


                        if (otherInput) {

                            if (
                                e.target.value === 'other'
                            ) {

                                otherInput.style.display =
                                    'block';

                                otherInput.focus();

                            } else {

                                otherInput.style.display =
                                    'none';

                            }

                        }

                    }

                }
            );

        });

    };


    setupRadioChips('type');
    setupRadioChips('temp');
    setupRadioChips('price');

});
