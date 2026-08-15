document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // عطشان - Main Application
    // =========================================================


    // =========================================================
    // Initialize Map
    // =========================================================

    const map = L.map('map', {
        zoomControl: false
    }).setView([30.0444, 31.2357], 14);


    // =========================================================
    // Tile Layers
    // =========================================================

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


    // =========================================================
    // Map Layer Toggle
    // =========================================================

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


    // =========================================================
    // User Location Marker
    // =========================================================

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


    // =========================================================
    // Variables
    // =========================================================

    let userMarker = null;

    let userLatitude = null;

    let userLongitude = null;

    let waterSources = [];

    let waterMarkers = [];

    let nearestWaterSource = null;

    let selectedSourceMarker = null;

    let selectedSourceLocation = null;

    let activeFilter = 'drinkable';

    let searchQuery = '';


    window.userLatitude = null;

    window.userLongitude = null;


    // =========================================================
    // Water Source Icon
    // =========================================================

    const waterIcon = L.icon({

        iconUrl: 'images/Marker.png',

        iconSize: [48, 48],

        iconAnchor: [24, 48],

        popupAnchor: [0, -48]

    });


    // =========================================================
    // Selected Location Icon
    // =========================================================

    const selectedLocationIcon = L.divIcon({

        className: 'selected-location-marker',

        html: `
            <div
                style="
                    width:42px;
                    height:42px;
                    border-radius:50% 50% 50% 0;
                    background:#0077D9;
                    border:4px solid #fff;
                    box-shadow:0 4px 14px rgba(0,0,0,.25);
                    transform:rotate(-45deg);
                    position:relative;
                "
            >
                <div
                    style="
                        width:12px;
                        height:12px;
                        background:#fff;
                        border-radius:50%;
                        position:absolute;
                        top:11px;
                        left:11px;
                    "
                ></div>
            </div>
        `,

        iconSize: [50, 50],

        iconAnchor: [25, 50]

    });


    // =========================================================
    // Show User Location
    // =========================================================

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
                icon: userIcon,
                zIndexOffset: 1000
            }
        ).addTo(map);


        console.log(
            'User location:',
            latitude,
            longitude
        );

    }


    // =========================================================
    // Get User Location
    // =========================================================

    function getUserLocation() {

        if (!navigator.geolocation) {

            console.warn(
                'Geolocation is not supported.'
            );

            showUserLocation(
                30.0444,
                31.2357
            );

            findNearestWaterSource();

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


                map.setView(
                    [latitude, longitude],
                    16
                );


                findNearestWaterSource();

            },


            (error) => {

                console.warn(
                    'Unable to get user location:',
                    error
                );


                showUserLocation(
                    30.0444,
                    31.2357
                );


                findNearestWaterSource();

            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    }


    // =========================================================
    // Calculate Distance
    // =========================================================

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


    // =========================================================
    // Format Distance
    // =========================================================

    function formatDistance(distanceKm) {

        if (
            distanceKm === null ||
            distanceKm === undefined ||
            Number.isNaN(distanceKm)
        ) {

            return 'غير متاح';

        }


        if (distanceKm < 1) {

            return `${Math.round(distanceKm * 1000)} متر`;

        }


        return `${distanceKm.toFixed(1)} كم`;

    }


    // =========================================================
    // Source Type Text
    // =========================================================

    function getTypeText(type) {

        if (type === 'cooler') {

            return 'كولدير مياه';

        }


        if (type === 'tap') {

            return 'حنفية مياه';

        }


        return 'مصدر مياه';

    }


    // =========================================================
    // Temperature Text
    // =========================================================

    function getTemperatureText(status) {

        if (status === 'cold') {

            return 'باردة';

        }


        if (status === 'sometimes_cold') {

            return 'أحيانًا باردة';

        }


        if (status === 'not_cold') {

            return 'غير باردة';

        }


        if (status === 'normal') {

            return 'عادية';

        }


        return 'غير محددة';

    }


    // =========================================================
    // Price Text
    // =========================================================

    function getPriceText(price) {

        if (price === 'free') {

            return 'مجانية';

        }


        if (price === 'paid') {

            return 'مدفوعة';

        }


        return 'غير محدد';

    }


    // =========================================================
    // Create Popup
    // =========================================================

    function createSourcePopup(source) {

        const latitude =
            Number(source.latitude);


        const longitude =
            Number(source.longitude);


        const distance =
            userLatitude !== null &&
            userLongitude !== null

                ? calculateDistance(
                    userLatitude,
                    userLongitude,
                    latitude,
                    longitude
                )

                : null;


        const typeText =
            getTypeText(source.type);


        const tempText =
            getTemperatureText(
                source.temp_status
            );


        const priceText =
            getPriceText(
                source.price_type
            );


        return `

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

                ${
                    source.photo_url

                    ?

                    `
                    <img
                        src="${source.photo_url}"
                        alt="${source.name || 'مصدر مياه'}"
                        style="
                            width:100%;
                            height:150px;
                            object-fit:cover;
                            border-radius:14px;
                            display:block;
                            margin-bottom:12px;
                        "
                        onerror="this.style.display='none'"
                    >
                    `

                    :

                    `
                    <div
                        style="
                            width:100%;
                            height:150px;
                            border-radius:14px;
                            background:linear-gradient(
                                135deg,
                                #eaf7ff,
                                #d8f5f5
                            );
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            margin-bottom:12px;
                            font-size:48px;
                        "
                    >
                        💧
                    </div>
                    `
                }


                <div
                    style="
                        margin-bottom:8px;
                    "
                >

                    <strong
                        style="
                            font-size:18px;
                            font-weight:700;
                            color:#172033;
                        "
                    >
                        ${source.name || 'مصدر مياه'}
                    </strong>

                </div>


                <div
                    style="
                        color:#667085;
                        font-size:13px;
                        margin-bottom:14px;
                    "
                >

                    💧 ${typeText}

                    ${
                        distance !== null
                            ? ` • ${formatDistance(distance)}`
                            : ''
                    }

                </div>


                <div
                    style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:8px;
                        margin-bottom:14px;
                    "
                >

                    <div
                        style="
                            background:#F6F8FA;
                            border-radius:10px;
                            padding:10px;
                        "
                    >

                        <div
                            style="
                                color:#8A94A6;
                                font-size:11px;
                                margin-bottom:4px;
                            "
                        >
                            المياه
                        </div>

                        <div
                            style="
                                font-size:13px;
                                font-weight:700;
                            "
                        >
                            💧 ${tempText}
                        </div>

                    </div>


                    <div
                        style="
                            background:#F6F8FA;
                            border-radius:10px;
                            padding:10px;
                        "
                    >

                        <div
                            style="
                                color:#8A94A6;
                                font-size:11px;
                                margin-bottom:4px;
                            "
                        >
                            السعر
                        </div>

                        <div
                            style="
                                font-size:13px;
                                font-weight:700;
                            "
                        >
                            ${
                                source.price_type === 'free'
                                    ? '✓ مجانية'
                                    : source.price_type === 'paid'
                                        ? '💰 مدفوعة'
                                        : 'غير محدد'
                            }
                        </div>

                    </div>

                </div>


                <div
                    style="
                        width:100%;
                        box-sizing:border-box;
                        background:#EAF6FF;
                        color:#0077D9;
                        padding:11px;
                        border-radius:10px;
                        font-size:14px;
                        font-weight:700;
                        text-align:center;
                        margin-bottom:10px;
                    "
                >

                    📍 يبعد عنك

                    ${
                        distance !== null
                            ? formatDistance(distance)
                            : 'غير متاح'
                    }

                </div>


                <div
                    style="
                        font-size:10px;
                        color:#98A2B3;
                        text-align:center;
                        padding-top:8px;
                        border-top:1px solid #EAECF0;
                    "
                >

                    ${latitude.toFixed(5)},
                    ${longitude.toFixed(5)}

                </div>

            </div>

        `;

    }


    // =========================================================
    // Remove Water Markers
    // =========================================================

    function clearWaterMarkers() {

        waterMarkers.forEach(marker => {

            if (map.hasLayer(marker)) {

                map.removeLayer(marker);

            }

        });


        waterMarkers = [];

    }


    // =========================================================
    // Add Source Marker
    // =========================================================

    function createWaterMarker(source) {

        const latitude =
            Number(source.latitude);


        const longitude =
            Number(source.longitude);


        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {

            return null;

        }


        const marker =
            L.marker(
                [latitude, longitude],
                {
                    icon: waterIcon
                }
            );


        marker.bindPopup(
            createSourcePopup(source)
        );


        marker.sourceData = source;


        marker.addTo(map);


        waterMarkers.push(marker);


        return marker;

    }


    // =========================================================
    // Render Water Sources
    // =========================================================

    function renderWaterSources() {

        clearWaterMarkers();


        const normalizedSearch =
            searchQuery.trim().toLowerCase();


        waterSources.forEach(source => {

            if (
                source.latitude === null ||
                source.latitude === undefined ||
                source.longitude === null ||
                source.longitude === undefined
            ) {

                return;

            }


            // -------------------------
            // Type Filter
            // -------------------------

            let matchesFilter = true;


            if (activeFilter === 'cooler') {

                matchesFilter =
                    source.type === 'cooler';

            }


            if (activeFilter === 'tap') {

                matchesFilter =
                    source.type === 'tap';

            }


            if (activeFilter === 'drinkable') {

                matchesFilter = true;

            }


            // "open" currently has no opening-hours
            // column in the database.
            if (activeFilter === 'open') {

                matchesFilter = true;

            }


            if (!matchesFilter) {

                return;

            }


            // -------------------------
            // Search
            // -------------------------

            if (normalizedSearch) {

                const sourceName =
                    String(
                        source.name || ''
                    ).toLowerCase();


                const sourceType =
                    getTypeText(
                        source.type
                    ).toLowerCase();


                if (
                    !sourceName.includes(
                        normalizedSearch
                    ) &&

                    !sourceType.includes(
                        normalizedSearch
                    )
                ) {

                    return;

                }

            }


            createWaterMarker(source);

        });


        console.log(
            `Rendered ${waterMarkers.length} water marker(s).`
        );

    }


    // =========================================================
    // Find Nearest Water Source
    // =========================================================

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

            nearestWaterSource = null;

            updateNearestSourceCard();

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
                'Nearest Water Source:',
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


    // =========================================================
    // Update Nearest Source Card
    // =========================================================

    function updateNearestSourceCard() {

        const card =
            document.querySelector(
                '.nearest-source'
            );


        const distanceElement =
            document.getElementById(
                'nearest-distance'
            );


        const typeElement =
            document.getElementById(
                'nearest-source-type'
            );


        if (
            !card ||
            !distanceElement ||
            !typeElement
        ) {

            return;

        }


        if (!nearestWaterSource) {

            card.style.display = 'none';

            return;

        }


        card.style.display = '';


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
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>

            ${formatDistance(
                nearestWaterSource.distance
            )}

        `;


        const typeText =
            getTypeText(
                nearestWaterSource.type
            );


        typeElement.textContent =
            nearestWaterSource.name

                ? `${nearestWaterSource.name} • ${typeText}`

                : typeText;

    }


    // =========================================================
    // Go To Nearest Source
    // =========================================================

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


        const latitude =
            Number(
                nearestWaterSource.latitude
            );


        const longitude =
            Number(
                nearestWaterSource.longitude
            );


        map.setView(
            [latitude, longitude],
            18,
            {
                animate: true
            }
        );


        const marker =
            waterMarkers.find(
                m =>
                    m.sourceData &&
                    String(m.sourceData.id) ===
                    String(nearestWaterSource.id)
            );


        if (marker) {

            setTimeout(() => {

                marker.openPopup();

            }, 500);

        }

    }


    // =========================================================
    // Find Nearest Button
    // =========================================================

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


                setTimeout(() => {

                    map.invalidateSize();

                    goToNearestSource();

                }, 250);

            }
        );

    }


    // =========================================================
    // Close Nearest Card
    // =========================================================

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


    // =========================================================
    // Load Water Sources From API
    // =========================================================

    async function loadWaterSources() {

        try {

            console.log(
                'Loading water sources...'
            );


            const response =
                await fetch(
                    '/api/water-sources',
                    {
                        method: 'GET',
                        headers: {
                            'Accept':
                                'application/json'
                        }
                    }
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


            renderWaterSources();


            findNearestWaterSource();


            console.log(
                `Loaded ${waterSources.length} water source(s).`
            );


        } catch (error) {

            console.error(
                'Error loading water sources:',
                error
            );

        }

    }


    // =========================================================
    // Source Location Selection
    // =========================================================

    const sourceLocation =
        document.getElementById(
            'source-location'
        );


    const latitudeInput =
        document.getElementById(
            'latitude'
        );


    const longitudeInput =
        document.getElementById(
            'longitude'
        );


    function activateSourceLocationSelection() {

        const mapLink =
            document.querySelector(
                '[data-target="view-map"]'
            );


        if (mapLink) {

            mapLink.click();

        }


        setTimeout(() => {

            map.invalidateSize();


            alert(
                'اضغط على الخريطة لتحديد مكان مصدر المياه 📍'
            );


            map.once(
                'click',
                handleSourceMapClick
            );


        }, 250);

    }


    function handleSourceMapClick(e) {

        const latitude =
            e.latlng.lat;


        const longitude =
            e.latlng.lng;


        selectedSourceLocation = {

            latitude: latitude,

            longitude: longitude

        };


        if (latitudeInput) {

            latitudeInput.value =
                latitude.toFixed(7);

        }


        if (longitudeInput) {

            longitudeInput.value =
                longitude.toFixed(7);

        }


        if (selectedSourceMarker) {

            map.removeLayer(
                selectedSourceMarker
            );

        }


        selectedSourceMarker =
            L.marker(
                [latitude, longitude],
                {
                    icon: selectedLocationIcon,
                    zIndexOffset: 2000
                }
            ).addTo(map);


        selectedSourceMarker.bindPopup(
            `
                <div
                    dir="rtl"
                    style="
                        font-family:Tajawal,Arial;
                        text-align:center;
                        font-weight:700;
                    "
                >
                    📍 موقع مصدر المياه
                    <br>
                    <span
                        style="
                            color:#667085;
                            font-size:11px;
                        "
                    >
                        ${latitude.toFixed(6)},
                        ${longitude.toFixed(6)}
                    </span>
                </div>
            `
        ).openPopup();


        if (sourceLocation) {

            sourceLocation.innerHTML = `

                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    style="margin-left:8px;"
                >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>

                تم تحديد الموقع ✓

            `;


            sourceLocation.style.background =
                '#EAF6FF';


            sourceLocation.style.borderColor =
                '#0077D9';


            sourceLocation.style.color =
                '#0077D9';

        }


        // Go back to Add view
        const addLink =
            document.querySelector(
                '[data-target="view-add"]'
            );


        if (addLink) {

            setTimeout(() => {

                addLink.click();

            }, 400);

        }


        console.log(
            'Selected source location:',
            latitude,
            longitude
        );

    }


    if (sourceLocation) {

        sourceLocation.addEventListener(
            'click',
            activateSourceLocationSelection
        );


        sourceLocation.addEventListener(
            'keydown',
            (e) => {

                if (
                    e.key === 'Enter' ||
                    e.key === ' '
                ) {

                    e.preventDefault();

                    activateSourceLocationSelection();

                }

            }
        );

    }


    // =========================================================
    // Add Source Form
    // =========================================================

    const addSourceForm =
        document.getElementById(
            'add-source-form'
        );


    if (addSourceForm) {

        addSourceForm.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();


                console.log(
                    'Submitting water source...'
                );


                const submitButton =
                    document.getElementById(
                        'add-source-btn'
                    );


                try {

                    // -----------------------------------------
                    // Coordinates
                    // -----------------------------------------

                    const latitude =
                        latitudeInput?.value;


                    const longitude =
                        longitudeInput?.value;


                    if (
                        !latitude ||
                        !longitude
                    ) {

                        alert(
                            'من فضلك حدد موقع مصدر المياه على الخريطة أولاً 📍'
                        );

                        return;

                    }


                    // -----------------------------------------
                    // Name
                    // -----------------------------------------

                    const name =
                        document
                            .getElementById(
                                'source-name'
                            )
                            ?.value
                            .trim() || '';


                    // -----------------------------------------
                    // Type
                    // -----------------------------------------

                    const type =
                        document.querySelector(
                            'input[name="type"]:checked'
                        )?.value;


                    // -----------------------------------------
                    // Temperature
                    // -----------------------------------------

                    const tempStatus =
                        document.querySelector(
                            'input[name="temp_status"]:checked'
                        )?.value;


                    // -----------------------------------------
                    // Price
                    // -----------------------------------------

                    const priceType =
                        document.querySelector(
                            'input[name="price_type"]:checked'
                        )?.value;


                    // -----------------------------------------
                    // Validation
                    // -----------------------------------------

                    if (!type) {

                        alert(
                            'من فضلك اختر نوع المصدر.'
                        );

                        return;

                    }


                    if (!tempStatus) {

                        alert(
                            'من فضلك اختر حالة المياه.'
                        );

                        return;

                    }


                    if (!priceType) {

                        alert(
                            'من فضلك اختر التكلفة.'
                        );

                        return;

                    }


                    // -----------------------------------------
                    // Other Type
                    // -----------------------------------------

                    let finalType = type;


                    if (type === 'other') {

                        const otherTypeInput =
                            document.getElementById(
                                'input-type-other'
                            );


                        const otherType =
                            otherTypeInput
                                ?.value
                                .trim();


                        if (!otherType) {

                            alert(
                                'من فضلك اكتب نوع المصدر.'
                            );

                            otherTypeInput?.focus();

                            return;

                        }


                        // Keep database value as "other"
                        finalType = 'other';

                    }


                    // -----------------------------------------
                    // Prepare Data
                    // -----------------------------------------

                    const data = {

                        name: name,

                        type: finalType,

                        temp_status: tempStatus,

                        price_type: priceType,

                        latitude:
                            Number(latitude),

                        longitude:
                            Number(longitude),

                        photo_url: null

                    };


                    console.log(
                        'Data being sent:',
                        data
                    );


                    // -----------------------------------------
                    // Loading
                    // -----------------------------------------

                    if (submitButton) {

                        submitButton.disabled =
                            true;

                        submitButton.textContent =
                            'جاري إضافة المصدر...';

                    }


                    // -----------------------------------------
                    // API
                    // -----------------------------------------

                    const response =
                        await fetch(
                            '/api/water-sources',
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json',

                                    'Accept':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify(
                                        data
                                    )
                            }
                        );


                    const result =
                        await response.json();


                    console.log(
                        'API response:',
                        result
                    );


                    // -----------------------------------------
                    // Error
                    // -----------------------------------------

                    if (
                        !response.ok ||
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            `HTTP error: ${response.status}`
                        );

                    }


                    // -----------------------------------------
                    // Success
                    // -----------------------------------------

                    alert(
                        'تمت إضافة مصدر المياه بنجاح 💧'
                    );


                    // -----------------------------------------
                    // Reset Form
                    // -----------------------------------------

                    addSourceForm.reset();


                    if (latitudeInput) {

                        latitudeInput.value =
                            '';

                    }


                    if (longitudeInput) {

                        longitudeInput.value =
                            '';

                    }


                    selectedSourceLocation =
                        null;


                    if (selectedSourceMarker) {

                        map.removeLayer(
                            selectedSourceMarker
                        );

                        selectedSourceMarker =
                            null;

                    }


                    if (sourceLocation) {

                        sourceLocation.innerHTML = `

                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                style="margin-left:8px;"
                            >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>

                            اختر الموقع على الخريطة

                        `;


                        sourceLocation.style.background =
                            '#EBF3F8';


                        sourceLocation.style.borderColor =
                            'var(--border-color)';


                        sourceLocation.style.color =
                            'var(--primary-blue)';

                    }


                    // -----------------------------------------
                    // Reload Data
                    // -----------------------------------------

                    await loadWaterSources();


                    // -----------------------------------------
                    // Go Map
                    // -----------------------------------------

                    const mapLink =
                        document.querySelector(
                            '[data-target="view-map"]'
                        );


                    if (mapLink) {

                        mapLink.click();

                    }


                } catch (error) {

                    console.error(
                        'Error adding water source:',
                        error
                    );


                    alert(
                        'حدث خطأ أثناء إضافة المصدر.\n\n' +
                        error.message
                    );


                } finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            'إضافة المصدر';

                    }

                }

            }
        );

    }


    // =========================================================
    // Photo Selection
    // =========================================================

    const sourcePhoto =
        document.getElementById(
            'source-photo'
        );


    if (sourcePhoto) {

        sourcePhoto.addEventListener(
            'change',
            () => {

                const file =
                    sourcePhoto.files?.[0];


                if (!file) {

                    return;

                }


                const label =
                    sourcePhoto.closest(
                        'label'
                    );


                if (label) {

                    label.dataset.originalText =
                        label.dataset.originalText ||
                        'اضغط لإضافة صورة';


                    label.lastChild.textContent =
                        ` ${file.name}`;

                }

            }
        );

    }


    // =========================================================
    // Chips
    // =========================================================

    const chips =
        document.querySelectorAll(
            '.chip'
        );


    chips.forEach(chip => {

        chip.addEventListener(
            'click',
            () => {

                chips.forEach(c => {

                    c.classList.remove(
                        'active'
                    );

                });


                chip.classList.add(
                    'active'
                );


                activeFilter =
                    chip.dataset.filter ||
                    'drinkable';


                renderWaterSources();

            }
        );

    });


    // =========================================================
    // Search
    // =========================================================

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


                renderWaterSources();

            }
        );

    }


    // =========================================================
    // Filter Button
    // =========================================================

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


                if (!filters) {

                    return;

                }


                if (
                    filters.style.display ===
                    'none'
                ) {

                    filters.style.display =
                        'flex';

                } else {

                    filters.style.display =
                        'none';

                }

            }
        );

    }


    // =========================================================
    // Navigation
    // =========================================================

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


                if (!targetId) {

                    return;

                }


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


                        view.classList.add(
                            'active'
                        );


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

                    } else {

                        view.style.display =
                            'none';


                        view.classList.remove(
                            'active'
                        );

                    }

                });

            }
        );

    });


    // =========================================================
    // Form Radio Chips
    // =========================================================

    function setupRadioChips(groupName) {

        const radios =
            document.querySelectorAll(
                `input[name="${groupName}"]`
            );


        radios.forEach(radio => {

            radio.addEventListener(
                'change',
                (e) => {

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


                    if (
                        groupName === 'type'
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

                                otherInput.value =
                                    '';

                            }

                        }

                    }

                }
            );

        });

    }


    setupRadioChips('type');

    setupRadioChips('temp_status');

    setupRadioChips('price_type');


    // =========================================================
    // Start Application
    // =========================================================

    getUserLocation();

    loadWaterSources();


    console.log(
        '💧 عطشان App Started Successfully'
    );

});
