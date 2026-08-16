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
        'https://{s}.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff',
        {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }
    );


    const googleSatellite = L.tileLayer(
        'https://{s}.google.com/vt/lyrs=y&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff',
        {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }
    );


    googleStreets.addTo(map);


    // =========================
    // Water Source Markers Layer
    // =========================

    const waterMarkersLayer = L.layerGroup().addTo(map);


    // =========================
    // Map Layer Toggle
    // =========================

    let currentLayer = 'streets';

    const toggleBtn =
        document.getElementById('toggle-layer-btn');


    if (toggleBtn) {

        toggleBtn.addEventListener('click', () => {

            if (currentLayer === 'streets') {

                map.removeLayer(googleStreets);

                googleSatellite.addTo(map);

                currentLayer = 'satellite';

                toggleBtn.innerHTML = `
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
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
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
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
    // User Location
    // =========================

    let userMarker = null;

    let userLatitude = null;

    let userLongitude = null;

    window.userLatitude = null;

    window.userLongitude = null;


    // =========================
    // Water Sources Data
    // =========================

    let waterSources = [];

    let nearestWaterSource = null;

    const engagementSessionKey = '3tshan_engagement_session';
    const engagementSessionId = localStorage.getItem(engagementSessionKey) || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(engagementSessionKey, engagementSessionId);

    function trackEngagement(eventType, sourceId = null) {
        fetch('/api/water-sources?event=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: eventType, session_id: engagementSessionId, source_id: sourceId })
        }).catch(() => {});
    }

    if (!sessionStorage.getItem('3tshan_visit_recorded')) {
        sessionStorage.setItem('3tshan_visit_recorded', '1');
        trackEngagement('visit');
    }

    let activeFilter = 'cooler';

    let searchQuery = '';


    // =========================
    // Show User Location
    // =========================

    function showUserLocation(latitude, longitude) {

        userLatitude = latitude;

        userLongitude = longitude;

        window.userLatitude = latitude;

        window.userLongitude = longitude;


        if (userMarker) {

            map.removeLayer(userMarker);

        }


        userMarker = L.marker(
            [latitude, longitude],
            {
                icon: userIcon
            }
        ).addTo(map);


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


    // =========================
    // Get User Location
    // =========================

    function getUserLocation() {

        if (!navigator.geolocation) {

            console.error(
                'Geolocation is not supported by this browser.'
            );

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

                renderSourceMarkers();
                findNearestWaterSource();

            },


            (error) => {

                console.error(
                    'Unable to get user location:',
                    error
                );


                showUserLocation(
                    30.0444,
                    31.2357
                );

                renderSourceMarkers();
                findNearestWaterSource();

            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    }


    // =========================
    // Water Source Marker
    // =========================

    const waterIcon = L.icon({

        iconUrl: 'images/Marker.png',

        iconSize: [48, 48],

        iconAnchor: [24, 48],

        popupAnchor: [0, -48]

    });


    // =========================
    // Add Source Marker
    // =========================

    const waterPlusIconHtml = `

        <div
            style="
                cursor:pointer;
                transition:transform 0.2s;
            "
        >

            <svg
                width="40"
                height="48"
                viewBox="0 0 40 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >

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
    // Calculate Distance
    // =========================

    function calculateDistance(
        lat1,
        lon1,
        lat2,
        lon2
    ) {

        const R = 6371;


        const dLat =
            (lat2 - lat1) * Math.PI / 180;


        const dLon =
            (lon2 - lon1) * Math.PI / 180;


        const a =
            Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +

            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *

            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);


        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );


        return R * c;

    }


    // =========================
    // Format Distance
    // =========================

    function formatDistance(distanceKm) {

        if (distanceKm < 1) {

            return `${Math.round(distanceKm * 1000)} متر`;

        }


        return `${distanceKm.toFixed(1)} كم`;

    }


    // =========================
    // Escape HTML
    // =========================

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return '';

        }


        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    }


    // =========================
    // Find Nearest Water Source
    // =========================

    function findNearestWaterSource() {

        if (
            userLatitude === null ||
            userLongitude === null
        ) {

            console.warn(
                'User location is not available yet.'
            );

            return null;

        }


        if (!waterSources.length) {

            console.warn(
                'No water sources available yet.'
            );

            return null;

        }


        let nearest = null;

        let shortestDistance = Infinity;


        waterSources.forEach(source => {

            if (
                source.latitude === null ||
                source.latitude === undefined ||
                source.longitude === null ||
                source.longitude === undefined
            ) {

                return;

            }


            const sourceLatitude =
                Number(source.latitude);


            const sourceLongitude =
                Number(source.longitude);


            const distance =
                calculateDistance(
                    userLatitude,
                    userLongitude,
                    sourceLatitude,
                    sourceLongitude
                );


            if (
                distance < shortestDistance
            ) {

                shortestDistance =
                    distance;


                nearest = {

                    ...source,

                    distance: distance

                };

            }

        });


        nearestWaterSource =
            nearest;


        if (nearestWaterSource) {

            console.log(
                '=============================='
            );

            console.log(
                'Nearest Water Source:'
            );

            console.log(
                nearestWaterSource
            );

            console.log(
                'Distance:',
                formatDistance(
                    nearestWaterSource.distance
                )
            );

            console.log(
                '=============================='
            );

        }


        updateNearestSourceCard();


        return nearestWaterSource;

    }


    // =========================
    // Update Home Nearest Source Card
    // =========================

    function updateNearestSourceCard() {

        const distanceElement =
            document.getElementById(
                'nearest-distance'
            );


        const typeElement =
            document.getElementById(
                'nearest-source-type'
            );


        if (
            !distanceElement ||
            !typeElement
        ) {

            return;

        }


        if (!nearestWaterSource) {

            distanceElement.innerHTML = `

                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >

                    <path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                    ></path>

                    <circle
                        cx="12"
                        cy="10"
                        r="3"
                    ></circle>

                </svg>

                لا يوجد مصدر مياه قريب

            `;


            typeElement.textContent =
                'لم يتم العثور على مصدر مياه قريب';


            return;

        }


        distanceElement.innerHTML = `

            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >

                <path
                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                ></path>

                <circle
                    cx="12"
                    cy="10"
                    r="3"
                ></circle>

            </svg>

            ${formatDistance(
                nearestWaterSource.distance
            )}

        `;


        let typeText =
            'مصدر مياه';


        if (
            nearestWaterSource.type ===
            'cooler'
        ) {

            typeText =
                'كولدير مياه';

        }


        if (
            nearestWaterSource.type ===
            'tap'
        ) {

            typeText =
                'حنفية مياه';

        }


        typeElement.textContent =
            nearestWaterSource.name

                ? `${nearestWaterSource.name} • ${typeText}`

                : typeText;

    }


    // =========================
    // Load Water Sources From API
    // =========================

    async function loadWaterSources() {

        try {

            console.log(
                'Loading water sources...'
            );


            const response =
                await fetch(
                    '/api/water-sources'
                );


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


            waterSources =
                result.data;


            renderSourceMarkers();


            console.log(
                `Loaded ${result.data.length} water source(s).`
            );


            findNearestWaterSource();


        } catch (error) {

            console.error(
                'Error loading water sources:',
                error
            );

            const distanceElement = document.getElementById('nearest-distance');
            const typeElement = document.getElementById('nearest-source-type');

            if (distanceElement) {
                distanceElement.textContent = 'تعذر تحميل مصادر المياه';
            }

            if (typeElement) {
                typeElement.textContent = 'تحقق من اتصال الإنترنت أو إعدادات الخدمة';
            }

        }

    }


    // =========================
    // Search & Filters
    // =========================

    const searchInput =
        document.getElementById(
            'water-search'
        );


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            (e) => {

                searchQuery =
                    e.target.value || '';


                renderSourceMarkers();

            }
        );

    }


    const mobileAddSourceButton = document.getElementById('mobile-add-source-btn');
    if (mobileAddSourceButton) {
        mobileAddSourceButton.addEventListener('click', () => {
            document.querySelector('[data-target="view-add"]')?.click();
        });
    }

    const filterButton =
        document.getElementById(
            'filter-btn'
        );


    if (filterButton) {

        filterButton.addEventListener(
            'click',
            () => {

                const filters =
                    document.querySelector(
                        '.filters-chips'
                    );


                if (filters) {

                    filters.classList.toggle(
                        'show'
                    );

                }

            }
        );

    }


    const chips =
        document.querySelectorAll(
            '.chip'
        );


    chips.forEach(chip => {

        chip.addEventListener(
            'click',
            () => {

                chips.forEach(c =>
                    c.classList.remove(
                        'active'
                    )
                );


                chip.classList.add(
                    'active'
                );


                activeFilter =
                    chip.dataset.filter ||
                    'drinkable';


                renderSourceMarkers();

            }
        );

    });


    // =========================
    // Render Source Markers
    // =========================

    function renderSourceMarkers() {

        waterMarkersLayer.clearLayers();


        const q =
            searchQuery
                .trim()
                .toLowerCase();


        waterSources
            .filter(source => {

                if (
                    activeFilter === 'cooler' &&
                    source.type !== 'cooler'
                ) {

                    return false;

                }


                if (
                    activeFilter === 'tap' &&
                    source.type !== 'tap'
                ) {

                    return false;

                }

                if (
                    activeFilter === 'other' &&
                    source.type !== 'other'
                ) {

                    return false;

                }


                if (q) {

                    const name =
                        String(
                            source.name || ''
                        ).toLowerCase();


                    const type =
                        source.type === 'cooler'

                            ? 'كولدير'

                            : source.type === 'tap'

                                ? 'حنفية'

                                : 'مصدر مياه';


                    if (
                        !name.includes(q) &&
                        !type.includes(q)
                    ) {

                        return false;

                    }

                }


                return true;

            })
            .forEach(
                source =>
                    addWaterSourceMarker(
                        source
                    )
            );

    }


    // =========================
    // Add Water Source Marker
    // =========================

    function addWaterSourceMarker(source) {

        if (
            source.latitude == null ||
            source.longitude == null
        ) {

            return;

        }


        const latitude =
            Number(source.latitude);


        const longitude =
            Number(source.longitude);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {

            return;

        }


        const marker =
            L.marker(
                [latitude, longitude],
                {
                    icon: waterIcon
                }
            ).addTo(
                waterMarkersLayer
            );


        const typeText =
            source.type === 'cooler'

                ? 'كولدير'

                : source.type === 'tap'

                    ? 'حنفية'

                    : 'مصدر مياه';


        const tempText =
            source.temp_status === 'cold'

                ? 'باردة'

                : source.temp_status === 'normal'

                    ? 'عادية'

                    : source.temp_status === 'not_cold'

                        ? 'غير باردة'

                        : 'غير محددة';


        const priceText =
            source.price_type === 'free'

                ? 'مجانية'

                : source.price_type === 'paid'

                    ? 'مدفوعة'

                    : 'غير محدد';


        const distance =
            userLatitude != null &&
            userLongitude != null

                ? formatDistance(
                    calculateDistance(
                        userLatitude,
                        userLongitude,
                        latitude,
                        longitude
                    )
                )

                : 'غير متاح';


        marker.bindPopup(`

            <div
                dir="rtl"
                style="
                    width:280px;
                    font-family:Tajawal,Arial,sans-serif;
                    color:#172033;
                    text-align:right;
                    overflow:hidden;
                "
            >

                ${source.photo_url ? `
                    <a href="${escapeHtml(source.photo_url)}" target="_blank" rel="noopener" title="فتح الصورة بالحجم الكامل" style="display:block;">
                        <img
                            src="${escapeHtml(source.photo_url)}"
                            alt="صورة ${escapeHtml(source.name || 'مصدر مياه')}"
                            style="width:100%;height:130px;object-fit:contain;background:#eef4f8;border-radius:14px;margin-bottom:12px;display:block;cursor:zoom-in;"
                            onerror="this.outerHTML='<div style=\"width:100%;height:130px;border-radius:14px;background:linear-gradient(135deg,#eaf7ff,#d8f5f5);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:48px;\">💧</div>'"
                        >
                    </a>
                ` : `
                    <div style="width:100%;height:130px;border-radius:14px;background:linear-gradient(135deg,#eaf7ff,#d8f5f5);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:48px;">💧</div>
                `}


                <strong
                    style="
                        font-size:18px;
                    "
                >
                    ${escapeHtml(
                        source.name ||
                        'مصدر مياه'
                    )}
                </strong>


                <div
                    style="
                        color:#667085;
                        font-size:13px;
                        margin:8px 0 14px;
                    "
                >
                    💧 ${typeText} • ${distance}
                </div>


                <div
                    style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:8px;
                        margin-bottom:12px;
                    "
                >

                    <div
                        style="
                            background:#F6F8FA;
                            border-radius:10px;
                            padding:10px;
                        "
                    >

                        <small>
                            المياه
                        </small>

                        <br>

                        <b>
                            💧 ${tempText}
                        </b>

                    </div>


                    <div
                        style="
                            background:#F6F8FA;
                            border-radius:10px;
                            padding:10px;
                        "
                    >

                        <small>
                            السعر
                        </small>

                        <br>

                        <b>
                            ${priceText}
                        </b>

                    </div>

                </div>


                <div
                    style="
                        background:#EAF6FF;
                        color:#0077D9;
                        padding:11px;
                        border-radius:10px;
                        font-weight:700;
                        text-align:center;
                    "
                >
                    📍 يبعد عنك ${distance}
                </div>

            </div>

        `);
        marker.on('popupopen', () => trackEngagement('source_view', Number(source.id)));

    }


    // =========================
    // Find Nearest Button
    // =========================

    const findNearestButton =
        document.getElementById(
            'find-nearest-btn'
        );


    if (findNearestButton) {

        findNearestButton.addEventListener(
            'click',
            () => {

                const mapLink =
                    document.querySelector(
                        '[data-target="view-map"]'
                    );


                if (mapLink) {

                    mapLink.click();

                }


                setTimeout(
                    () => {

                        map.invalidateSize();

                        trackEngagement('nearest_click', nearestWaterSource?.id || null);
                        goToNearestSource();

                    },
                    200
                );

            }
        );

    }


    // =========================
    // Go To Nearest Source
    // =========================

    function goToNearestSource() {

        if (!nearestWaterSource) {

            findNearestWaterSource();

        }


        if (!nearestWaterSource) {

            alert(
                'لم يتم العثور على أي مصدر مياه حتى الآن.'
            );

            return;

        }


        const lat =
            Number(
                nearestWaterSource.latitude
            );


        const lng =
            Number(
                nearestWaterSource.longitude
            );


        map.setView(
            [lat, lng],
            18,
            {
                animate: true
            }
        );

    }


    // =========================
    // Close Nearest Source
    // =========================

    const closeNearestSourceButton =
        document.getElementById(
            'close-nearest-source'
        );


    if (closeNearestSourceButton) {

        closeNearestSourceButton.addEventListener(
            'click',
            () => {

                const card =
                    document.querySelector(
                        '.nearest-source'
                    );


                if (card) {

                    card.style.display =
                        'none';

                }

            }
        );

    }


    // =========================
    // Photo Selection
    // =========================

    const photoInput =
        document.getElementById(
            'input-photo'
        );


    const photoFileName =
        document.getElementById(
            'photo-file-name'
        );

    const photoPreview = document.getElementById('photo-preview');
    const removePhotoButton = document.getElementById('remove-photo-btn');


    function readImageAsDataUrl(file) {

        if (!file) {
            return Promise.resolve(null);
        }

        if (!file.type.startsWith('image/')) {
            return Promise.reject(new Error('من فضلك اختر ملف صورة صالحًا.'));
        }

        if (file.size > 750 * 1024) {
            return Promise.reject(new Error('حجم الصورة يجب ألا يتجاوز 750 كيلوبايت.'));
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
            reader.readAsDataURL(file);
        });
    }


    if (photoInput) {

        photoInput.addEventListener(
            'change',
            () => {

                const file = photoInput.files && photoInput.files[0];
                if (photoFileName) photoFileName.textContent = file ? `تم اختيار: ${file.name}` : 'الصورة اختيارية';
                if (photoPreview) {
                    if (file) {
                        photoPreview.src = URL.createObjectURL(file);
                        photoPreview.hidden = false;
                    } else {
                        photoPreview.removeAttribute('src');
                        photoPreview.hidden = true;
                    }
                }
                if (removePhotoButton) removePhotoButton.hidden = !file;

            }
        );

    }

    if (removePhotoButton) {
        removePhotoButton.addEventListener('click', () => {
            photoInput.value = '';
            photoInput.dispatchEvent(new Event('change'));
        });
    }


    // =========================
    // Start

    getUserLocation();

    loadWaterSources();


    // =========================
    // Navigation Logic
    // =========================

    const navLinks =
        document.querySelectorAll(
            '.nav-link'
        );


    const views =
        document.querySelectorAll(
            '.app-view'
        );


    navLinks.forEach(link => {

        link.addEventListener(
            'click',
            (e) => {

                e.preventDefault();


                const targetId =
                    link.getAttribute(
                        'data-target'
                    );


                navLinks.forEach(nav => {

                    if (
                        nav.getAttribute(
                            'data-target'
                        ) === targetId
                    ) {

                        nav.classList.add(
                            'active'
                        );

                    } else {

                        nav.classList.remove(
                            'active'
                        );

                    }

                });


                views.forEach(view => {

                    if (
                        view.id === targetId
                    ) {

                        view.style.display =
                            'flex';


                        if (
                            view.id === 'view-map'
                        ) {

                            setTimeout(
                                () => {

                                    map.invalidateSize();

                                },
                                100
                            );

                        }


                        if (
                            view.id === 'view-add'
                        ) {

                            setTimeout(
                                () => {

                                    initAddLocationMap();

                                    addMap.invalidateSize();

                                },
                                100
                            );

                        }

                    } else {

                        view.style.display =
                            'none';

                    }

                });

            }
        );

    });


    // =========================
    // Form Radio Chips
    // =========================

    const setupRadioChips =
        (groupName) => {

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
                                r.closest(
                                    'label'
                                );


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
                            e.target.closest(
                                'label'
                            );


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

                        if (
                            groupName ===
                            'type'
                        ) {

                            const otherInput =
                                document.getElementById(
                                    'input-type-other'
                                );


                            if (otherInput) {

                                if (
                                    e.target.value ===
                                    'other'
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


    // =========================
    // Add Source: Location Picker Map
    // =========================

    let addMap = null;

    let addMarker = null;


    function initAddLocationMap() {

        if (addMap) {

            return;

        }


        const startLat =
            userLatitude !== null
                ? userLatitude
                : 30.0444;


        const startLng =
            userLongitude !== null
                ? userLongitude
                : 31.2357;


        addMap =
            L.map(
                'add-location-map',
                {
                    zoomControl: true
                }
            ).setView(
                [startLat, startLng],
                15
            );


        L.tileLayer(
            'https://{s}.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}&apistyle=s.t%3A3%7Cp.v%3Aoff',
            {
                maxZoom: 20,
                subdomains: [
                    'mt0',
                    'mt1',
                    'mt2',
                    'mt3'
                ],
                attribution:
                    '&copy; Google Maps'
            }
        ).addTo(addMap);


        function setPickedLocation(
            lat,
            lng
        ) {

            const latitudeInput =
                document.getElementById(
                    'input-latitude'
                );


            const longitudeInput =
                document.getElementById(
                    'input-longitude'
                );


            if (latitudeInput) {

                latitudeInput.value =
                    lat;

            }


            if (longitudeInput) {

                longitudeInput.value =
                    lng;

            }


            const hint =
                document.getElementById(
                    'add-location-hint'
                );


            if (hint) {

                hint.textContent =
                    `الموقع المختار: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

            }


            if (addMarker) {

                addMarker.setLatLng(
                    [lat, lng]
                );

            } else {

                addMarker =
                    L.marker(
                        [lat, lng],
                        {
                            icon:
                                waterPlusIcon
                        }
                    ).addTo(
                        addMap
                    );

            }

        }


        addMap.on(
            'click',
            (e) => {

                setPickedLocation(
                    e.latlng.lat,
                    e.latlng.lng
                );

            }
        );


        setPickedLocation(
            startLat,
            startLng
        );

    }


    // =========================
    // Add Source: Form Submit
    // =========================

    const addSourceForm =
        document.getElementById(
            'add-source-form'
        );


    if (addSourceForm) {

        addSourceForm.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();


                const statusEl =
                    document.getElementById(
                        'add-source-status'
                    );


                const submitBtn =
                    document.getElementById(
                        'submit-add-source'
                    );


                const showStatus =
                    (
                        message,
                        isError
                    ) => {

                        if (!statusEl) {

                            return;

                        }


                        statusEl.style.display =
                            'block';


                        statusEl.textContent =
                            message;


                        statusEl.style.background =
                            isError
                                ? '#FEECEC'
                                : '#EAF6FF';


                        statusEl.style.color =
                            isError
                                ? '#D92D20'
                                : '#0077D9';

                    };


                const nameInput =
                    document.getElementById(
                        'input-name'
                    );


                const typeInput =
                    addSourceForm.querySelector(
                        'input[name="type"]:checked'
                    );


                const tempInput =
                    addSourceForm.querySelector(
                        'input[name="temp"]:checked'
                    );


                const priceInput =
                    addSourceForm.querySelector(
                        'input[name="price"]:checked'
                    );


                const otherTypeInput =
                    document.getElementById(
                        'input-type-other'
                    );


                const latInput =
                    document.getElementById(
                        'input-latitude'
                    );


                const lngInput =
                    document.getElementById(
                        'input-longitude'
                    );


                const latitude =
                    latInput.value
                        ? parseFloat(
                            latInput.value
                        )
                        : null;


                const longitude =
                    lngInput.value
                        ? parseFloat(
                            lngInput.value
                        )
                        : null;


                if (
                    latitude === null ||
                    longitude === null
                ) {

                    showStatus(
                        'من فضلك اختر الموقع على الخريطة أولاً.',
                        true
                    );

                    return;

                }


                let type =
                    typeInput
                        ? typeInput.value
                        : 'other';


                if (
                    type === 'other' &&
                    otherTypeInput &&
                    otherTypeInput.value.trim()
                ) {

                    type =
                        otherTypeInput.value.trim();

                }


                const name =
                    nameInput &&
                    nameInput.value.trim()

                        ? nameInput.value.trim()

                        : (
                            type === 'cooler'
                                ? 'كولدير'
                                : type === 'tap'
                                    ? 'حنفية'
                                    : 'مصدر مياه'
                        );


                let photoUrl = null;

                try {
                    photoUrl = await readImageAsDataUrl(
                        photoInput && photoInput.files ? photoInput.files[0] : null
                    );
                } catch (photoError) {
                    showStatus(photoError.message, true);
                    return;
                }

                const payload = {

                    name: name,

                    type: type,

                    temp_status:
                        tempInput
                            ? tempInput.value
                            : null,

                    price_type:
                        priceInput
                            ? priceInput.value
                            : null,

                    latitude:
                        latitude,

                    longitude:
                        longitude,

                    photo_url:
                        photoUrl

                };


                if (submitBtn) {

                    submitBtn.disabled =
                        true;


                    submitBtn.textContent =
                        'جاري الإضافة...';

                }


                try {

                    const response =
                        await fetch(
                            '/api/water-sources',
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify(
                                        payload
                                    )

                            }
                        );


                    const rawText =
                        await response.text();


                    let result;


                    try {

                        result =
                            JSON.parse(
                                rawText
                            );

                    } catch (
                        parseError
                    ) {

                        console.error(
                            'Server did not return valid JSON. Raw response:',
                            rawText
                        );


                        throw new Error(
                            'حدث خطأ غير متوقع من الخادم، حاول مرة أخرى.'
                        );

                    }


                    if (
                        !response.ok ||
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            'حدث خطأ أثناء إضافة المصدر'
                        );

                    }


                    trackEngagement('source_add', result.data?.id || null);
                    showStatus(
                        'تمت إضافة المصدر بنجاح، بانتظار المراجعة ✅',
                        false
                    );


                    addSourceForm.reset();
                    if (photoInput) photoInput.dispatchEvent(new Event('change'));

                    await loadWaterSources();


                } catch (error) {

                    console.error(
                        'Error adding water source:',
                        error
                    );


                    showStatus(
                        error.message ||
                        'حدث خطأ، حاول مرة أخرى.',
                        true
                    );


                } finally {

                    if (submitBtn) {

                        submitBtn.disabled =
                            false;


                        submitBtn.textContent =
                            'إضافة المصدر';

                    }

                }

            }
        );

    }

});
