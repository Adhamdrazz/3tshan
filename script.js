// =========================
// Load Water Sources From API
// =========================

async function loadWaterSources() {

    try {

        console.log('Loading water sources...');

        const response = await fetch('/api/water-sources');

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        console.log('Water sources from API:', result);


        // =========================
        // Validate API Response
        // =========================

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


        // =========================
        // Save Sources Globally
        // =========================

        waterSources = result.data;


        // =========================
        // Add Sources To Map
        // =========================

        result.data.forEach(source => {

            // Check coordinates

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


            // =========================
            // Source Type
            // =========================

            let typeText =
                'مصدر مياه';

            if (source.type === 'cooler') {

                typeText =
                    'كولدير';

            }

            if (source.type === 'tap') {

                typeText =
                    'حنفية';

            }


            // =========================
            // Temperature
            // =========================

            let tempText =
                'غير محددة';

            if (source.temp_status === 'cold') {

                tempText =
                    'باردة';

            }

            if (source.temp_status === 'normal') {

                tempText =
                    'عادية';

            }


            // =========================
            // Price
            // =========================

            let priceText =
                'غير محدد';

            if (source.price_type === 'free') {

                priceText =
                    'مجانية';

            }

            if (source.price_type === 'paid') {

                priceText =
                    'مدفوعة';

            }


            // =========================
            // Status
            // =========================

            let statusText =
                'معتمد';

            if (source.status === 'pending') {

                statusText =
                    'قيد المراجعة';

            }


            // =========================
            // Distance
            // =========================

            let distanceText = '';

            if (
                userLatitude !== null &&
                userLongitude !== null
            ) {

                const distance =
                    calculateDistance(
                        userLatitude,
                        userLongitude,
                        latitude,
                        longitude
                    );

                distanceText =
                    formatDistance(distance);

            }


            // =========================
            // Image
            // =========================

            const imageHtml =
                source.photo_url
                    ? `
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
                            onerror="
                                this.style.display='none'
                            "
                        >
                    `
                    : `
                        <div
                            style="
                                width:100%;
                                height:120px;
                                border-radius:14px;
                                background:
                                    linear-gradient(
                                        135deg,
                                        #eaf7ff,
                                        #d8f5f5
                                    );
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                margin-bottom:12px;
                                font-size:42px;
                            "
                        >
                            💧
                        </div>
                    `;


            // =========================
            // Create Marker
            // =========================

            const marker =
                L.marker(
                    [
                        latitude,
                        longitude
                    ],
                    {
                        icon: waterIcon
                    }
                ).addTo(map);


            // =========================
            // Popup
            // =========================

            marker.bindPopup(`

                <div
                    dir="rtl"
                    style="
                        width:280px;
                        font-family:
                            Arial,
                            sans-serif;
                        color:#172033;
                        overflow:hidden;
                    "
                >

                    ${imageHtml}


                    <!-- Header -->

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            gap:10px;
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
                            ${
                                source.name ||
                                'مصدر مياه'
                            }
                        </strong>


                        <span
                            style="
                                background:#E8F7EE;
                                color:#16834B;
                                padding:4px 8px;
                                border-radius:20px;
                                font-size:11px;
                                font-weight:700;
                                white-space:nowrap;
                            "
                        >
                            ${statusText}
                        </span>

                    </div>


                    <!-- Type & Distance -->

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:6px;
                            color:#667085;
                            font-size:13px;
                            margin-bottom:12px;
                        "
                    >

                        <span>
                            📍
                        </span>

                        <span>

                            ${typeText}

                            ${
                                distanceText
                                    ? ` • ${distanceText}`
                                    : ''
                            }

                        </span>

                    </div>


                    <!-- Information -->

                    <div
                        style="
                            display:grid;
                            grid-template-columns:
                                1fr 1fr;
                            gap:8px;
                            margin-bottom:14px;
                        "
                    >


                        <!-- Temperature -->

                        <div
                            style="
                                background:#F6F8FA;
                                border-radius:10px;
                                padding:9px;
                            "
                        >

                            <div
                                style="
                                    font-size:11px;
                                    color:#8A94A6;
                                    margin-bottom:3px;
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


                        <!-- Price -->

                        <div
                            style="
                                background:#F6F8FA;
                                border-radius:10px;
                                padding:9px;
                            "
                        >

                            <div
                                style="
                                    font-size:11px;
                                    color:#8A94A6;
                                    margin-bottom:3px;
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


                    <!-- Directions Button -->

                    <button
                        type="button"
                        onclick="
                            window.open(
                                'https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}',
                                '_blank'
                            );
                        "
                        style="
                            width:100%;
                            border:none;
                            background:#0077D9;
                            color:white;
                            padding:11px;
                            border-radius:10px;
                            font-size:14px;
                            font-weight:700;
                            cursor:pointer;
                        "
                    >
                        الاتجاهات
                    </button>


                </div>

            `);

        });


        // =========================
        // Log Result
        // =========================

        console.log(
            `Loaded ${result.data.length} water source(s).`
        );


        // =========================
        // Find Nearest Source
        // =========================

        findNearestWaterSource();


    } catch (error) {

        console.error(
            'Error loading water sources:',
            error
        );

    }

}
