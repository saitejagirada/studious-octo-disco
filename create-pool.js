document.addEventListener('DOMContentLoaded', function() {
    let map, routeMap;
    let marker, pickupMarker, dropMarker;
    let directionsService, directionsRenderer;
    let pickupAutocomplete, dropAutocomplete, locationAutocomplete;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Get DOM elements
    const poolsList = document.getElementById('poolsList');
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    const poolForm = document.getElementById('poolForm');
    const newPoolBtn = document.getElementById('newPoolBtn');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const poolTypeSelect = document.getElementById('poolType');
    const handymanOptions = document.getElementById('handymanOptions');
    const routeLocationSection = document.getElementById('routeLocationSection');
    const singleLocationSection = document.getElementById('singleLocationSection');

    // Function to format pool type
    function formatPoolType(type) {
        const types = {
            'ride': 'Ride Sharing',
            'delivery': 'Package Delivery',
            'homework': 'Homework Help',
            'guide': 'Local Guide',
            'tutor': 'Tutoring',
            'handyman': 'Handyman Services',
            'cleaning': 'Cleaning Services',
            'moving': 'Moving Help',
            'tech': 'Tech Support',
            'other': 'Other'
        };
        return types[type] || 'Other';
    }

    // Function to handle pool type change
    function handlePoolTypeChange() {
        const selectedType = poolTypeSelect.value;
        const routeTypes = ['ride', 'delivery', 'moving'];
        const showRouteSection = routeTypes.includes(selectedType);
        const isHandyman = selectedType === 'handyman';
        
        // Show/hide route section
        routeLocationSection.style.display = showRouteSection ? 'block' : 'none';
        singleLocationSection.style.display = showRouteSection ? 'none' : 'block';

        // Show/hide handyman options
        handymanOptions.style.display = isHandyman ? 'block' : 'none';

        // Update required attributes
        const routeInputs = document.querySelectorAll('#routeLocationSection input[type="text"]:not([readonly])');
        const singleInputs = document.querySelectorAll('#singleLocationSection input[type="text"]:not([readonly])');
        const handymanInputs = document.querySelectorAll('#handymanOptions select');
        
        routeInputs.forEach(input => input.required = showRouteSection);
        singleInputs.forEach(input => input.required = !showRouteSection);
        handymanInputs.forEach(input => input.required = isHandyman);

        // Reset markers and map
        if (showRouteSection) {
            if (marker) {
                marker.setMap(null);
                marker = null;
            }
            if (routeMap) {
                setTimeout(() => {
                    google.maps.event.trigger(routeMap, 'resize');
                    routeMap.setZoom(13);
                }, 0);
            }
        } else {
            if (pickupMarker) {
                pickupMarker.setMap(null);
                pickupMarker = null;
            }
            if (dropMarker) {
                dropMarker.setMap(null);
                dropMarker = null;
            }
            if (directionsRenderer) {
                directionsRenderer.setDirections({routes: []});
            }
            if (map) {
                setTimeout(() => {
                    google.maps.event.trigger(map, 'resize');
                    map.setZoom(13);
                }, 0);
            }
        }

        // Clear input fields
        document.querySelectorAll('#routeLocationSection input[type="text"], #singleLocationSection input[type="text"]').forEach(input => {
            input.value = '';
        });

        // Clear handyman fields if not handyman type
        if (!isHandyman) {
            document.querySelectorAll('#handymanOptions select').forEach(select => {
                select.value = '';
            });
        }

        // Initialize maps if needed
        if (!map || !routeMap) {
            initMap();
        }
    }

    // Event listeners for form toggling
    newPoolBtn.addEventListener('click', function() {
        poolForm.style.display = 'block';
        newPoolBtn.style.display = 'none';
        // Initialize maps when showing the form
        setTimeout(() => {
            initMap();
            if (map) google.maps.event.trigger(map, 'resize');
            if (routeMap) google.maps.event.trigger(routeMap, 'resize');
        }, 0);
    });

    closeFormBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent form submission
        poolForm.style.display = 'none';
        newPoolBtn.style.display = 'block';
    });

    // Add event listener for pool type change
    poolTypeSelect.addEventListener('change', handlePoolTypeChange);

    // Function to load and display user's pools
    function loadUserPools() {
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        const allPools = Object.entries(localStorage)
            .filter(([key, value]) => key.startsWith('pool_'))
            .map(([key, value]) => ({
                id: key,
                ...JSON.parse(value)
            }))
            .filter(pool => pool.creatorId === currentUser.id);

        if (allPools.length === 0) {
            noPoolsMessage.style.display = 'block';
            return;
        }

        poolsList.innerHTML = '';
        allPools.forEach(pool => {
            const card = document.createElement('div');
            card.className = 'pool-card';
            
            const joinedCount = pool.joinedUsers ? pool.joinedUsers.length : 0;
            const location = pool.location.address || 
                           (pool.location.pickup ? `${pool.location.pickup.address} to ${pool.location.drop.address}` : 'No location specified');

            card.innerHTML = `
                <div class="pool-card-header">
                    <h3 class="pool-card-title">${pool.title}</h3>
                    <span class="pool-card-type">${formatPoolType(pool.type)}</span>
                </div>
                <div class="pool-card-details">
                    <div class="pool-card-detail">
                        <span class="pool-card-detail-label">Budget</span>
                        <span class="pool-card-detail-value">$${pool.budget}</span>
                    </div>
                    <div class="pool-card-detail">
                        <span class="pool-card-detail-label">Location</span>
                        <span class="pool-card-detail-value">${location}</span>
                    </div>
                    <div class="pool-card-detail">
                        <span class="pool-card-detail-label">Joined Users</span>
                        <span class="pool-card-detail-value">${joinedCount} user${joinedCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="pool-card-actions">
                    <button class="secondary-button" onclick="window.location.href='view-pool.html?id=${pool.id}'">View Details</button>
                    ${joinedCount > 0 ? `<button class="primary-button" onclick="window.location.href='chat.html'">View Chats</button>` : ''}
                </div>
            `;
            
            poolsList.appendChild(card);
        });
    }

    // Initialize maps and services
    function initMap() {
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: true
        });

        // Default coordinates (center of India)
        const defaultLocation = { lat: 20.5937, lng: 78.9629 };
        
        // Initialize route map
        routeMap = new google.maps.Map(document.getElementById('routeMap'), {
            center: defaultLocation,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        directionsRenderer.setMap(routeMap);

        // Initialize autocomplete for pickup location
        pickupAutocomplete = new google.maps.places.Autocomplete(
            document.getElementById('pickupLocationSearch'),
            { types: ['geocode'] }
        );
        pickupAutocomplete.bindTo('bounds', routeMap);
        pickupAutocomplete.addListener('place_changed', () => {
            const place = pickupAutocomplete.getPlace();
            if (!place.geometry) {
                alert("No details available for this place");
                return;
            }

            // Update map view
            if (place.geometry.viewport) {
                routeMap.fitBounds(place.geometry.viewport);
            } else {
                routeMap.setCenter(place.geometry.location);
                routeMap.setZoom(17);
            }

            // Add or update pickup marker
            const position = place.geometry.location;
            if (pickupMarker) {
                pickupMarker.setPosition(position);
            } else {
                pickupMarker = new google.maps.Marker({
                    map: routeMap,
                    position: position,
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        scaledSize: new google.maps.Size(35, 35)
                    },
                    title: 'Pickup Location',
                    draggable: true
                });

                // Add drag end listener
                pickupMarker.addListener('dragend', function() {
                    const pos = pickupMarker.getPosition();
                    updateLocationDetails({
                        geometry: { location: pos },
                        formatted_address: ''
                    }, 'pickup');

                    // Update address using geocoder
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: pos }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            document.getElementById('selectedPickupLocation').value = results[0].formatted_address;
                        }
                    });
                });
            }

            // Update form fields
            document.getElementById('selectedPickupLocation').value = place.formatted_address;
            document.getElementById('pickupLatitude').value = place.geometry.location.lat();
            document.getElementById('pickupLongitude').value = place.geometry.location.lng();

            // Calculate route if both locations are set
            if (dropMarker) {
                calculateAndDisplayRoute();
            }
        });

        // Initialize autocomplete for drop location
        dropAutocomplete = new google.maps.places.Autocomplete(
            document.getElementById('dropLocationSearch'),
            { types: ['geocode'] }
        );
        dropAutocomplete.bindTo('bounds', routeMap);
        dropAutocomplete.addListener('place_changed', () => {
            const place = dropAutocomplete.getPlace();
            if (!place.geometry) {
                alert("No details available for this place");
                return;
            }

            // Update map view
            if (place.geometry.viewport) {
                routeMap.fitBounds(place.geometry.viewport);
            } else {
                routeMap.setCenter(place.geometry.location);
                routeMap.setZoom(17);
            }

            // Add or update drop marker
            const position = place.geometry.location;
            if (dropMarker) {
                dropMarker.setPosition(position);
            } else {
                dropMarker = new google.maps.Marker({
                    map: routeMap,
                    position: position,
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: new google.maps.Size(35, 35)
                    },
                    title: 'Drop Location',
                    draggable: true
                });

                // Add drag end listener
                dropMarker.addListener('dragend', function() {
                    const pos = dropMarker.getPosition();
                    updateLocationDetails({
                        geometry: { location: pos },
                        formatted_address: ''
                    }, 'drop');

                    // Update address using geocoder
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: pos }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            document.getElementById('selectedDropLocation').value = results[0].formatted_address;
                        }
                    });
                });
            }

            // Update form fields
            document.getElementById('selectedDropLocation').value = place.formatted_address;
            document.getElementById('dropLatitude').value = place.geometry.location.lat();
            document.getElementById('dropLongitude').value = place.geometry.location.lng();

            // Calculate route if both locations are set
            if (pickupMarker) {
                calculateAndDisplayRoute();
            }
        });

        // Add click listeners to map
        routeMap.addListener('click', function(e) {
            const latLng = e.latLng;
            
            // If pickup location is not set, set it first
            if (!pickupMarker) {
                if (pickupMarker) {
                    pickupMarker.setPosition(latLng);
                } else {
                    pickupMarker = new google.maps.Marker({
                        position: latLng,
                        map: routeMap,
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                            scaledSize: new google.maps.Size(35, 35)
                        },
                        title: 'Pickup Location',
                        draggable: true
                    });
                }

                // Get address for clicked location
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: latLng }, (results, status) => {
                    if (status === "OK" && results[0]) {
                        document.getElementById('selectedPickupLocation').value = results[0].formatted_address;
                        document.getElementById('pickupLatitude').value = latLng.lat();
                        document.getElementById('pickupLongitude').value = latLng.lng();
                    }
                });
            }
            // If pickup is set but drop isn't, set drop location
            else if (!dropMarker) {
                if (dropMarker) {
                    dropMarker.setPosition(latLng);
                } else {
                    dropMarker = new google.maps.Marker({
                        position: latLng,
                        map: routeMap,
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                            scaledSize: new google.maps.Size(35, 35)
                        },
                        title: 'Drop Location',
                        draggable: true
                    });
                }

                // Get address for clicked location
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: latLng }, (results, status) => {
                    if (status === "OK" && results[0]) {
                        document.getElementById('selectedDropLocation').value = results[0].formatted_address;
                        document.getElementById('dropLatitude').value = latLng.lat();
                        document.getElementById('dropLongitude').value = latLng.lng();
                    }
                });

                // Calculate route since both markers are now set
                calculateAndDisplayRoute();
            }
        });
    }

    // Make initMap globally available
    window.initMap = initMap;

    function calculateAndDisplayRoute() {
        if (!pickupMarker || !dropMarker) return;

        const request = {
            origin: pickupMarker.getPosition(),
            destination: dropMarker.getPosition(),
            travelMode: google.maps.TravelMode.DRIVING
        };

        directionsService.route(request, (response, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(response);
                
                // Fit bounds to show entire route
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(pickupMarker.getPosition());
                bounds.extend(dropMarker.getPosition());
                routeMap.fitBounds(bounds);
            } else {
                console.error('Directions request failed:', status);
            }
        });
    }

    function updateLocationDetails(place, type) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        if (type === 'single') {
            document.getElementById('selectedLocation').value = place.formatted_address;
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
        } else if (type === 'pickup') {
            document.getElementById('selectedPickupLocation').value = place.formatted_address;
            document.getElementById('pickupLatitude').value = lat;
            document.getElementById('pickupLongitude').value = lng;
        } else if (type === 'drop') {
            document.getElementById('selectedDropLocation').value = place.formatted_address;
            document.getElementById('dropLatitude').value = lat;
            document.getElementById('dropLongitude').value = lng;
        }
    }

    // Handle form submission
    document.getElementById('createPoolForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please log in to create a pool');
            window.location.href = 'login.html';
            return;
        }

        const poolType = document.getElementById('poolType').value;
        const routeTypes = ['ride', 'delivery', 'moving'];
        const isRouteType = routeTypes.includes(poolType);

        // Validate locations based on pool type
        if (isRouteType) {
            if (!document.getElementById('selectedPickupLocation').value || 
                !document.getElementById('selectedDropLocation').value) {
                alert('Please select both pickup and drop locations');
                return;
            }
        }

        // Build the form data
        const formData = {
            type: poolType,
            title: document.getElementById('projectTitle').value,
            description: document.getElementById('projectDescription').value,
            budget: document.getElementById('projectBudget').value,
            creatorId: currentUser.id,
            creatorName: currentUser.name,
            createdAt: new Date().toISOString(),
            location: {
                pickup: {
                    address: document.getElementById('selectedPickupLocation').value,
                    latitude: document.getElementById('pickupLatitude').value,
                    longitude: document.getElementById('pickupLongitude').value
                },
                drop: {
                    address: document.getElementById('selectedDropLocation').value,
                    latitude: document.getElementById('dropLatitude').value,
                    longitude: document.getElementById('dropLongitude').value
                }
            }
        };

        // Save to localStorage
        const poolId = 'pool_' + Date.now();
        localStorage.setItem(poolId, JSON.stringify(formData));

        // Reset form and redirect
        this.reset();
        window.location.href = `view-pool.html?id=${poolId}`;
    });

    // Load user's pools on page load
    loadUserPools();
});