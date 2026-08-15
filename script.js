document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // عطشان - FINAL SCRIPT
    // =========================================================

    console.log('💧 عطشان App Started');


    // =========================================================
    // MAIN MAP
    // =========================================================

    const map = L.map('map', {
        zoomControl: false
    }).setView([30.0444, 31.2357], 14);


    // =========================================================
    // GOOGLE MAP LAYERS
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
    // MAIN MAP MARKERS LAYER
    // =========================================================

    const waterMarkersLayer =
        L.layerGroup().addTo(map);


    // =========================================================
    // VARIABLES
    // =========================================================

    let currentLayer = 'streets';

    let userMarker = null;

    let userLatitude = null;

    let userLongitude = null;

    let waterSources = [];

    let nearestWaterSource = null;

    let activeFilter = 'drinkable';

    let searchQuery = '';

    let addMap = null;

    let addMarker = null;


    window.userLatitude = null;
    window.userLongitude = null;


    // =========================================================
    // USER ICON
    // =========================================================

    const userIcon = L.divIcon({

        className: 'custom-user-marker',

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
    // WATER ICON
    // =========================================================

    const waterIcon = L.divIcon({

        className: 'custom-water-marker',

        html: `
            <div
                style="
                    width:40px;
                    height:48px;
                    position:relative;
                "
            >

                <svg
                    width="40"
                    height="48"
                    viewBox="0 0 40 48"
                    fill="none"
                >

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
        `,

        iconSize: [40, 48],

        iconAnchor: [20, 48]

    });


    // =========================================================
    // ADD LOCATION ICON
    // =========================================================

    const addLocationIcon = L.divIcon({

        className: 'custom-add-location-marker',

        html: `
            <div
                style="
                    width:42px;
                    height:42px;
                    background:#0077D9;
                    border:4px solid white;
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    box-shadow:0 5px 18px rgba(0,0,0,.25);
                    position:relative;
                "
            >

                <div
                    style="
                        width:12px;
                        height:12px;
                        background:white;
                        border-radius:50%;
                        position:absolute;
                        left:11px;
                        top:11px;
                    "
                ></div>

            </div>
        `,

        iconSize: [50, 50],

        iconAnchor: [25, 50]

    });


    // =========================================================
    // LAYER TOGGLE
    // =========================================================

    const toggleLayerButton =
        document.getElementById('toggle-layer-btn');


    if (toggleLayerButton) {

        toggleLayerButton.addEventListener(
            'click',
            () => {

                if (currentLayer === 'streets') {

                    map.removeLayer(googleStreets);

                    googleSatellite.addTo(map);

                    currentLayer = 'satellite';

                } else {

                    map.removeLayer(googleSatellite);

                    googleStreets.addTo(map);

                    currentLayer = 'streets';

                }

            }
        );

    }


    // =========================================================
    // USER LOCATION
    // =========================================================

    function showUserLocation(
        latitude,
        longitude,
        moveMap = true
    ) {

        userLatitude = latitude;

        userLongitude = longitude;

        window.userLatitude = latitude;

        window.userLongitude = longitude;


        if (userMarker) {

            map.removeLayer(userMarker);

        }


        userMarker =
            L.marker(
                [latitude, longitude],
                {
                    icon: userIcon,
                    zIndexOffset: 1000
                }
            ).addTo(map);


        if (moveMap) {

            map.setView(
                [latitude, longitude],
                16
            );

        }


        console.log(
            'User location:',
            latitude,
            longitude
        );

    }


    function getUserLocation() {

        if (!navigator.geolocation) {

            showUserLocation(
                30.0444,
                31.2357,
                false
            );

            return;

        }


        navigator.geolocation.getCurrentPosition(

            position => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                showUserLocation(
                    latitude,
                    longitude,
                    true
                );


                findNearestWaterSource();


                if (addMap) {

                    addMap.setView(
                        [latitude, longitude],
                        16
                    );

                    setAddLocation(
                        latitude,
                        longitude
                    );

                }

            },


            error => {

                console.warn(
                    'Location permission/error:',
                    error
                );


                showUserLocation(
                    30.0444,
                    31.2357,
                    false
                );

            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    }


    // =========================================================
    // DISTANCE
    // =========================================================

    function calculateDistance(
        lat1,
        lon1,
        lat2,
        lon2
    ) {

        const R = 6371;


        const dLat =
            (lat2 - lat1) *
            Math.PI /
            180;


        const dLon =
            (lon2 - lon1) *
            Math.PI /
            180;


        const a =
            Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +

            Math.cos(
                lat1 * Math.PI / 180
            ) *

            Math.cos(
                lat2 * Math.PI / 180
            ) *

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


    function formatDistance(
        distanceKm
    ) {

        if (
            distanceKm === null ||
            distanceKm === undefined ||
            Number.isNaN(distanceKm)
        ) {

            return 'غير متاح';

        }


        if (distanceKm < 1) {

            return `${Math.round(
                distanceKm * 1000
            )} متر`;

        }


        return `${distanceKm.toFixed(1)} كم`;

    }


    // =========================================================
    // TEXT HELPERS
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


    function getTemperatureText(status) {

        if (status === 'cold') {
            return 'باردة';
        }

        if (status === 'sometimes_cold') {
            return 'أحيانًا باردة';
        }

        if (status === 'normal') {
            return 'عادية';
        }

        if (status === 'not_cold') {
            return 'غير باردة';
        }

        return 'غير محددة';

    }


    function getPriceText(price) {

        if (price === 'free') {
            return 'مجانية';
        }

        if (price === 'paid') {
            return 'مدفوعة';
        }

        return 'غير محدد';

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return '';

        }


        return String(value)

            .replace(
                /&/g,
                '&amp;'
            )

            .replace(
                /</g,
                '&lt;'
            )

            .replace(
                />/g,
                '&gt;'
            )

            .replace(
                /"/g,
                '&quot;'
            )

            .replace(
                /'/g,
                '&#39;'
            );

    }


    // =========================================================
    // POPUP
    // =========================================================

    function createSourcePopup(
        source
    ) {

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


        const name =
            escapeHtml(
                source.name ||
                'مصدر مياه'
            );


        const typeText =
            getTypeText(
                source.type
            );


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
                "
            >

                ${
                    source.photo_url

                    ?

                    `
                    <img
                        src="${escapeHtml(source.photo_url)}"
                        alt="${name}"
                        style="
                            width:100%;
                            height:150px;
                            object-fit:cover;
                            border-radius:14px;
                            margin-bottom:12px;
                        "
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


                <strong
                    style="
                        font-size:18px;
                        display:block;
                        margin-bottom:8px;
                    "
                >
                    ${name}
                </strong>


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

                        <small
                            style="
                                color:#8A94A6;
                                display:block;
                                margin-bottom:4px;
                            "
                        >
                            المياه
                        </small>

                        <strong>
                            💧 ${tempText}
                        </strong>

                    </div>


                    <div
                        style="
                            background:#F6F8FA;
                            border-radius:10px;
                            padding:10px;
                        "
                    >

                        <small
                            style="
                                color:#8A94A6;
                                display:block;
                                margin-bottom:4px;
                            "
                        >
                            السعر
                        </small>

                        <strong>
                            ${priceText}
                        </strong>

                    </div>

                </div>


                <div
                    style="
                        background:#EAF6FF;
                        color:#0077D9;
                        padding:11px;
                        border-radius:10px;
                        text-align:center;
                        font-weight:700;
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
                    "
                >
                    ${latitude.toFixed(5)},
                    ${longitude.toFixed(5)}
                </div>

            </div>

        `;

    }


    // =========================================================
    // RENDER SOURCES
    // =========================================================

    function renderWaterSources() {

        waterMarkersLayer.clearLayers();


        const normalizedSearch =
            searchQuery
                .trim()
                .toLowerCase();


        waterSources.forEach(
            source => {

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


                // Filter

                if (
                    activeFilter === 'cooler' &&
                    source.type !== 'cooler'
                ) {

                    return;

                }


                if (
                    activeFilter === 'tap' &&
                    source.type !== 'tap'
                ) {

                    return;

                }


                // Search

                if (normalizedSearch) {

                    const name =
                        String(
                            source.name || ''
                        ).toLowerCase();


                    const type =
                        getTypeText(
                            source.type
                        ).toLowerCase();


                    if (
                        !name.includes(
                            normalizedSearch
                        ) &&

                        !type.includes(
                            normalizedSearch
                        )
                    ) {

                        return;

                    }

                }


                const marker =
                    L.marker(
                        [latitude, longitude],
                        {
                            icon: waterIcon
                        }
                    );


                marker.bindPopup(
                    createSourcePopup(
                        source
                    )
                );


                marker.addTo(
                    waterMarkersLayer
                );

            }
        );


        console.log(
            'Rendered sources:',
            waterMarkersLayer.getLayers().length
        );

    }


    // =========================================================
    // FIND NEAREST
    // =========================================================

    function findNearestWaterSource() {

        if (
            userLatitude === null ||
            userLongitude === null
        ) {

            return null;

        }


        if (!waterSources.length) {

            nearestWaterSource =
                null;

            updateNearestSourceCard();

            return null;

        }


        let nearest = null;

        let shortestDistance =
            Infinity;


        waterSources.forEach(
            source => {

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


                const distance =
                    calculateDistance(
                        userLatitude,
                        userLongitude,
                        latitude,
                        longitude
                    );


                if (
                    distance <
                    shortestDistance
                ) {

                    shortestDistance =
                        distance;


                    nearest = {
                        ...source,
                        distance
                    };

                }

            }
        );


        nearestWaterSource =
            nearest;


        updateNearestSourceCard();


        return nearestWaterSource;

    }


    // =========================================================
    // NEAREST CARD
    // =========================================================

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

            distanceElement.textContent =
                'لا يوجد مصدر مياه قريب';

            typeElement.textContent =
                'لم يتم العثور على مصدر مياه قريب';

            return;

        }


        distanceElement.innerHTML = `

            📍

            ${formatDistance(
                nearestWaterSource.distance
            )}

        `;


        typeElement.textContent =

            nearestWaterSource.name

                ?

                `${nearestWaterSource.name} • ${getTypeText(
                    nearestWaterSource.type
                )}`

                :

                getTypeText(
                    nearestWaterSource.type
                );

    }


    // =========================================================
    // GO TO NEAREST
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


        setTimeout(() => {

            waterMarkersLayer.eachLayer(
                marker => {

                    const position =
                        marker.getLatLng();


                    if (
                        Math.abs(
                            position.lat -
                            latitude
                        ) < 0.000001 &&

                        Math.abs(
                            position.lng -
                            longitude
                        ) < 0.000001
                    ) {

                        marker.openPopup();

                    }

                }
            );

        }, 400);

    }


    const findNearestButton =
        document.getElementById(
            'find-nearest-btn'
        );


    if (findNearestButton) {

        findNearestButton.addEventListener(
            'click',
            goToNearestSource
        );

    }


    // =========================================================
    // LOAD API
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
                    `HTTP ${response.status}`
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

                throw new Error(
                    'Invalid API response'
                );

            }


            waterSources =
                result.data;


            renderWaterSources();


            findNearestWaterSource();


            console.log(
                `Loaded ${waterSources.length} source(s).`
            );

        } catch (error) {

            console.error(
                'Error loading water sources:',
                error
            );

        }

    }


    // =========================================================
    // ADD LOCATION MAP
    // =========================================================

    function initAddLocationMap() {

        if (addMap) {

            setTimeout(
                () => addMap.invalidateSize(),
                100
            );

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
                16
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


        addMap.on(
            'click',
            event => {

                setAddLocation(
                    event.latlng.lat,
                    event.latlng.lng
                );

            }
        );


        setAddLocation(
            startLat,
            startLng
        );


        setTimeout(
            () => addMap.invalidateSize(),
            150
        );

    }


    // =========================================================
    // SET ADD LOCATION
    // =========================================================

    function setAddLocation(
        latitude,
        longitude
    ) {

        const latInput =
            document.getElementById(
                'input-latitude'
            );


        const lngInput =
            document.getElementById(
                'input-longitude'
            );


        const locationSelected =
            document.getElementById(
                'location-selected'
            );


        if (latInput) {

            latInput.value =
                Number(latitude).toFixed(7);

        }


        if (lngInput) {

            lngInput.value =
                Number(longitude).toFixed(7);

        }


        if (addMarker) {

            addMarker.setLatLng(
                [latitude, longitude]
            );

        } else {

            addMarker =
                L.marker(
                    [latitude, longitude],
                    {
                        icon:
                            addLocationIcon,
                        draggable: true
                    }
                ).addTo(addMap);


            addMarker.on(
                'dragend',
                () => {

                    const position =
                        addMarker.getLatLng();


                    setAddLocation(
                        position.lat,
                        position.lng
                    );

                }
            );

        }


        if (locationSelected) {

            locationSelected.innerHTML = `

                <span>
                    ✓
                </span>

                تم تحديد الموقع

                <span style="font-weight:500;">
                    ${Number(latitude).toFixed(6)},
                    ${Number(longitude).toFixed(6)}
                </span>

            `;

        }

    }


    // =========================================================
    // RADIO OPTIONS
    // =========================================================

    function setupRadioGroup(
        groupName
    ) {

        const radios =
            document.querySelectorAll(
                `input[name="${groupName}"]`
            );


        radios.forEach(
            radio => {

                radio.addEventListener(
                    'change',
                    () => {

                        radios.forEach(
                            item => {

                                const label =
                                    item.closest(
                                        '.radio-option'
                                    );


                                if (label) {

                                    label.classList.remove(
                                        'selected'
                                    );

                                }

                            }
                        );


                        const selected =
                            radio.closest(
                                '.radio-option'
                            );


                        if (selected) {

                            selected.classList.add(
                                'selected'
                            );

                        }


                        if (
                            groupName === 'type'
                        ) {

                            const otherInput =
                                document.getElementById(
                                    'input-type-other'
                                );


                            if (!otherInput) {

                                return;

                            }


                            if (
                                radio.value ===
                                'other'
                            ) {

                                otherInput.classList.add(
                                    'show'
                                );

                                setTimeout(
                                    () => {
                                        otherInput.focus();
                                    },
                                    50
                                );

                            } else {

                                otherInput.classList.remove(
                                    'show'
                                );

                                otherInput.value =
                                    '';

                            }

                        }

                    }
                );

            }
        );

    }


    setupRadioGroup('type');

    setupRadioGroup('temp_status');

    setupRadioGroup('price_type');


    // =========================================================
    // PHOTO PREVIEW
    // =========================================================

    const photoInput =
        document.getElementById(
            'input-photo'
        );


    const photoBox =
        document.getElementById(
            'photo-upload-box'
        );


    const photoPreview =
        document.getElementById(
            'photo-preview'
        );


    if (photoInput) {

        photoInput.addEventListener(
            'change',
            () => {

                const file =
                    photoInput.files?.[0];


                if (!file) {

                    return;

                }


                if (
                    !file.type.startsWith(
                        'image/'
                    )
                ) {

                    alert(
                        'من فضلك اختر ملف صورة.'
                    );

                    photoInput.value =
                        '';

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    event => {

                        if (photoPreview) {

                            photoPreview.src =
                                event.target.result;

                        }


                        if (photoBox) {

                            photoBox.classList.add(
                                'has-image'
                            );

                        }

                    };


                reader.readAsDataURL(file);

            }
        );

    }


    // =========================================================
    // NAVIGATION
    // =========================================================

    const navLinks =
        document.querySelectorAll(
            '.nav-link'
        );


    const views =
        document.querySelectorAll(
            '.app-view'
        );


    function navigateTo(
        targetId
    ) {

        if (!targetId) {

            return;

        }


        navLinks.forEach(
            link => {

                if (
                    link.getAttribute(
                        'data-target'
                    ) === targetId
                ) {

                    link.classList.add(
                        'active'
                    );

                } else {

                    link.classList.remove(
                        'active'
                    );

                }

            }
        );


        views.forEach(
            view => {

                if (
                    view.id === targetId
                ) {

                    view.style.display =
                        'flex';

                    view.classList.add(
                        'active'
                    );

                } else {

                    view.style.display =
                        'none';

                    view.classList.remove(
                        'active'
                    );

                }

            }
        );


        if (
            targetId === 'view-map'
        ) {

            setTimeout(
                () => {

                    map.invalidateSize();

                },
                100
            );

        }


        if (
            targetId === 'view-add'
        ) {

            setTimeout(
                () => {

                    initAddLocationMap();

                },
                100
            );

        }

    }


    navLinks.forEach(
        link => {

            link.addEventListener(
                'click',
                event => {

                    event.preventDefault();


                    const targetId =
                        link.getAttribute(
                            'data-target'
                        );


                    navigateTo(
                        targetId
                    );

                }
            );

        }
    );


    // =========================================================
    // FILTER CHIPS
    // =========================================================

    const chips =
        document.querySelectorAll(
            '.chip'
        );


    chips.forEach(
        chip => {

            chip.addEventListener(
                'click',
                () => {

                    chips.forEach(
                        item => {

                            item.classList.remove(
                                'active'
                            );

                        }
                    );


                    chip.classList.add(
                        'active'
                    );


                    activeFilter =
                        chip.dataset.filter ||
                        'drinkable';


                    renderWaterSources();

                }
            );

        }
    );


    // =========================================================
    // SEARCH
    // =========================================================

    const searchInput =
        document.getElementById(
            'water-search'
        );


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            event => {

                searchQuery =
                    event.target.value ||
                    '';


                renderWaterSources();

            }
        );

    }


    // =========================================================
    // FILTER BUTTON
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


                const current =
                    getComputedStyle(
                        filters
                    ).display;


                filters.style.display =
                    current === 'none'
                        ? 'flex'
                        : 'none';

            }
        );

    }


    // =========================================================
    // ADD SOURCE FORM
    // =========================================================

    const addSourceForm =
        document.getElementById(
            'add-source-form'
        );


    if (addSourceForm) {

        addSourceForm.addEventListener(
            'submit',
            async event => {

                event.preventDefault();


                const statusElement =
                    document.getElementById(
                        'add-source-status'
                    );


                const submitButton =
                    document.getElementById(
                        'submit-add-source'
                    );


                const showStatus =
                    (
                        message,
                        error = false
                    ) => {

                        if (!statusElement) {

                            return;

                        }


                        statusElement.style.display =
                            'block';


                        statusElement.textContent =
                            message;


                        statusElement.style.background =
                            error
                                ? '#FEECEC'
                                : '#EAF6FF';


                        statusElement.style.color =
                            error
                                ? '#D92D20'
                                : '#0077D9';

                    };


                const lat =
                    parseFloat(
                        document.getElementById(
                            'input-latitude'
                        )?.value
                    );


                const lng =
                    parseFloat(
                        document.getElementById(
                            'input-longitude'
                        )?.value
                    );


                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng)
                ) {

                    showStatus(
                        'من فضلك حدد موقع مصدر المياه على الخريطة أولاً.',
                        true
                    );

                    return;

                }


                const name =
                    document.getElementById(
                        'input-name'
                    )?.value
                    ?.trim() || 'مصدر مياه';


                const typeInput =
                    addSourceForm.querySelector(
                        'input[name="type"]:checked'
                    );


                const tempInput =
                    addSourceForm.querySelector(
                        'input[name="temp_status"]:checked'
                    );


                const priceInput =
                    addSourceForm.querySelector(
                        'input[name="price_type"]:checked'
                    );


                if (!typeInput) {

                    showStatus(
                        'من فضلك اختر نوع المصدر.',
                        true
                    );

                    return;

                }


                if (!tempInput) {

                    showStatus(
                        'من فضلك اختر حالة المياه.',
                        true
                    );

                    return;

                }


                if (!priceInput) {

                    showStatus(
                        'من فضلك اختر التكلفة.',
                        true
                    );

                    return;

                }


                let finalType =
                    typeInput.value;


                if (
                    finalType === 'other'
                ) {

                    const otherInput =
                        document.getElementById(
                            'input-type-other'
                        );


                    const otherValue =
                        otherInput
                            ?.value
                            ?.trim();


                    if (!otherValue) {

                        showStatus(
                            'من فضلك اكتب نوع المصدر.',
                            true
                        );

                        otherInput?.focus();

                        return;

                    }


                    /*
                     * مهم:
                     * قاعدة البيانات الحالية تستخدم
                     * cooler / tap.
                     *
                     * لذلك نحافظ على "other"
                     * كقيمة نوع عامة.
                     */
                    finalType = 'other';

                }


                /*
                 * الصورة حاليًا للمعاينة فقط.
                 * الـ API الحالي لا يحتوي على Storage
                 * للصور، لذلك photo_url = null.
                 */

                const payload = {

                    name: name,

                    type: finalType,

                    temp_status:
                        tempInput.value,

                    price_type:
                        priceInput.value,

                    latitude: lat,

                    longitude: lng,

                    photo_url: null

                };


                console.log(
                    'Sending water source:',
                    payload
                );


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        'جاري إضافة المصدر...';

                }


                try {

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

                    } catch (parseError) {

                        console.error(
                            'Invalid server response:',
                            rawText
                        );

                        throw new Error(
                            'الخادم لم يُرجع استجابة صحيحة.'
                        );

                    }


                    console.log(
                        'POST response:',
                        result
                    );


                    if (
                        !response.ok ||
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            `HTTP ${response.status}`
                        );

                    }


                    showStatus(
                        'تمت إضافة مصدر المياه بنجاح 💧',
                        false
                    );


                    // -----------------------------------------
                    // Reset
                    // -----------------------------------------

                    addSourceForm.reset();


                    // Restore default selected chips

                    document
                        .querySelectorAll(
                            '.radio-option'
                        )
                        .forEach(
                            label => {
                                label.classList.remove(
                                    'selected'
                                );
                            }
                        );


                    document
                        .querySelector(
                            'input[name="type"][value="cooler"]'
                        )
                        ?.closest(
                            '.radio-option'
                        )
                        ?.classList.add(
                            'selected'
                        );


                    document
                        .querySelector(
                            'input[name="temp_status"][value="cold"]'
                        )
                        ?.closest(
                            '.radio-option'
                        )
                        ?.classList.add(
                            'selected'
                        );


                    document
                        .querySelector(
                            'input[name="price_type"][value="free"]'
                        )
                        ?.closest(
                            '.radio-option'
                        )
                        ?.classList.add(
                            'selected'
                        );


                    const otherTypeInput =
                        document.getElementById(
                            'input-type-other'
                        );


                    if (otherTypeInput) {

                        otherTypeInput.value =
                            '';

                        otherTypeInput.classList.remove(
                            'show'
                        );

                    }


                    // Reset coordinates

                    const latInput =
                        document.getElementById(
                            'input-latitude'
                        );


                    const lngInput =
                        document.getElementById(
                            'input-longitude'
                        );


                    if (latInput) {

                        latInput.value =
                            '';

                    }


                    if (lngInput) {

                        lngInput.value =
                            '';

                    }


                    if (addMarker && addMap) {

                        addMap.removeLayer(
                            addMarker
                        );

                        addMarker =
                            null;

                    }


                    const locationSelected =
                        document.getElementById(
                            'location-selected'
                        );


                    if (locationSelected) {

                        locationSelected.innerHTML =
                            '📍 لم يتم تحديد الموقع بعد';

                    }


                    // Reset photo

                    if (photoInput) {

                        photoInput.value =
                            '';

                    }


                    if (photoPreview) {

                        photoPreview.src =
                            '';

                    }


                    if (photoBox) {

                        photoBox.classList.remove(
                            'has-image'
                        );

                    }


                    // Reload API

                    await loadWaterSources();


                    // Stay on Add Source page

                    setTimeout(
                        () => {

                            if (
                                statusElement
                            ) {

                                statusElement.style.display =
                                    'none';

                            }

                        },
                        4000
                    );


                } catch (error) {

                    console.error(
                        'Error adding water source:',
                        error
                    );


                    showStatus(
                        error.message ||
                        'حدث خطأ أثناء إضافة المصدر.',
                        true
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
    // INITIALIZE
    // =========================================================

    getUserLocation();

    loadWaterSources();


    // Open Add Map if page is opened with #add
    if (
        window.location.hash === '#add'
    ) {

        navigateTo(
            'view-add'
        );

    }


    console.log(
        '💧 عطشان FINAL initialized successfully'
    );

});
