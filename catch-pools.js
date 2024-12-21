document.addEventListener('DOMContentLoaded', function() {
    // Get all pools from localStorage
    function getAllPools() {
        const pools = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('pool_')) {
                    const poolData = JSON.parse(localStorage.getItem(key));
                    if (poolData && poolData.type && poolData.title) {
                        pools.push({
                            id: key,
                            ...poolData
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error getting pools:', e);
        }
        return pools;
    }

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

    // Function to format address
    function formatAddress(location, type) {
        if (!location) return 'Location not specified';
        
        const routeTypes = ['ride', 'delivery', 'moving'];
        if (routeTypes.includes(type)) {
            if (location.pickup && location.drop) {
                return {
                    pickup: location.pickup.address || 'Pickup location not specified',
                    drop: location.drop.address || 'Drop location not specified'
                };
            }
            return {
                pickup: 'Pickup location not specified',
                drop: 'Drop location not specified'
            };
        }
        return location.address || 'Location not specified';
    }

    // Display pools in the grid
    function displayPools(pools) {
        const container = document.getElementById('poolsContainer');
        const template = document.getElementById('poolCardTemplate');
        
        if (!container || !template) {
            console.error('Required elements not found');
            return;
        }
        
        container.innerHTML = '';

        if (!pools || pools.length === 0) {
            const message = document.createElement('div');
            message.className = 'no-pools-message';
            message.textContent = 'No pools available at the moment.';
            container.appendChild(message);
            return;
        }

        pools.forEach(pool => {
            const card = template.content.cloneNode(true);
            
            // Fill in pool details
            card.querySelector('.pool-title').textContent = pool.title || 'Untitled Pool';
            card.querySelector('.pool-budget').textContent = `$${pool.budget || '0'}`;
            card.querySelector('.pool-type').textContent = formatPoolType(pool.type);
            card.querySelector('.pool-description').textContent = pool.description || 'No description provided';

            // Handle location display based on pool type
            const routeTypes = ['ride', 'delivery', 'moving'];
            const isRouteType = routeTypes.includes(pool.type);
            const locationInfo = formatAddress(pool.location, pool.type);

            if (isRouteType) {
                // Show route locations and hide single location
                const routeLocations = card.querySelector('.route-locations');
                const singleLocation = card.querySelector('.single-location');
                
                routeLocations.style.display = 'flex';
                singleLocation.style.display = 'none';
                
                // Set pickup and drop locations
                card.querySelector('.pickup-location').textContent = locationInfo.pickup;
                card.querySelector('.drop-location').textContent = locationInfo.drop;
            } else {
                // Show single location and hide route locations
                const routeLocations = card.querySelector('.route-locations');
                const singleLocation = card.querySelector('.single-location');
                
                routeLocations.style.display = 'none';
                singleLocation.style.display = 'block';
                
                // Set single location
                card.querySelector('.location').textContent = `📍 ${locationInfo}`;
            }

            // Add event listeners
            card.querySelector('.view-details-btn').addEventListener('click', () => {
                window.location.href = `view-pool.html?id=${pool.id}`;
            });

            card.querySelector('.catch-pool-btn').addEventListener('click', () => {
                handleCatchPool(pool.id);
            });

            container.appendChild(card);
        });
    }

    // Handle search and filtering
    function handleSearch() {
        const searchTerm = document.getElementById('searchPools')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('typeFilter')?.value || '';
        const locationFilter = document.getElementById('locationFilter')?.value || '';
        const budgetFilter = document.getElementById('budgetFilter')?.value || '';

        let pools = getAllPools();

        // Apply search filter
        if (searchTerm) {
            pools = pools.filter(pool => 
                (pool.title || '').toLowerCase().includes(searchTerm) ||
                (pool.description || '').toLowerCase().includes(searchTerm)
            );
        }

        // Apply type filter
        if (typeFilter) {
            pools = pools.filter(pool => pool.type === typeFilter);
        }

        // Apply location filter
        if (locationFilter) {
            pools = pools.filter(pool => {
                if (!pool.location) return false;
                
                const routeTypes = ['ride', 'delivery', 'moving'];
                if (routeTypes.includes(pool.type)) {
                    return (pool.location.pickup?.address || '').includes(locationFilter) ||
                           (pool.location.drop?.address || '').includes(locationFilter);
                }
                return (pool.location.address || '').includes(locationFilter);
            });
        }

        // Apply budget filter
        if (budgetFilter) {
            const [min, max] = budgetFilter.split('-').map(Number);
            pools = pools.filter(pool => {
                const budget = Number(pool.budget) || 0;
                if (max) {
                    return budget >= min && budget <= max;
                }
                return budget >= min;
            });
        }

        displayPools(pools);
    }

    // Handle catching a pool
    function handleCatchPool(poolId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            alert('Please log in to catch a pool');
            window.location.href = 'login.html';
            return;
        }

        const pool = JSON.parse(localStorage.getItem(poolId));
        
        if (!pool) {
            alert('Pool not found');
            return;
        }

        if (pool.creatorId === currentUser.id) {
            alert('You cannot catch your own pool');
            return;
        }

        // Check if already requested
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        if (poolRequests[poolId]?.some(req => req.userId === currentUser.id && req.status === 'pending')) {
            alert('You have already requested to join this pool');
            return;
        }

        // Check if already joined
        const joinedPools = JSON.parse(localStorage.getItem('joinedPools') || '{}');
        if (joinedPools[poolId]?.includes(currentUser.id)) {
            alert('You have already joined this pool');
            return;
        }

        // Create request
        if (!poolRequests[poolId]) {
            poolRequests[poolId] = [];
        }

        const request = {
            id: 'req_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };

        poolRequests[poolId].push(request);
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));

        alert('Request sent! Waiting for approval from pool creator.');
    }

    // Function to view pool details
    function viewPoolDetails(poolId) {
        const pool = JSON.parse(localStorage.getItem(poolId));
        if (!pool) {
            alert('Pool not found!');
            return;
        }

        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.innerHTML = `
            <div class="modal-content pool-details">
                <!-- Pool Header -->
                <div class="pool-header">
                    <h2>${pool.title}</h2>
                    <div class="pool-meta">
                        <span class="pool-type">${formatPoolType(pool.type)}</span>
                        <span class="budget">Budget: $${pool.budget}</span>
                    </div>
                </div>

                <!-- Route Details -->
                <div class="route-section">
                    <h3>Route Details</h3>
                    <div class="route-details">
                        <div class="location-point">
                            <h4>Pickup Location</h4>
                            <p>${pool.location.pickup.address}</p>
                        </div>
                        <div class="location-point">
                            <h4>Drop Location</h4>
                            <p>${pool.location.drop.address}</p>
                        </div>
                    </div>
                    <div id="detailsMap" class="map-container"></div>
                </div>

                <!-- Description -->
                <div class="pool-description">
                    <h3>Description</h3>
                    <p>${pool.description || 'No description provided'}</p>
                </div>

                <!-- Actions -->
                <div class="modal-actions">
                    <button class="secondary-button" onclick="closeModal(this.parentElement.parentElement.parentElement)">Close</button>
                    <button class="primary-button" onclick="requestToJoinPool('${poolId}')">Join Pool</button>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.appendChild(modalContainer);

        // Initialize map
        const map = new google.maps.Map(document.getElementById('detailsMap'), {
            zoom: 12,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DEFAULT,
                position: google.maps.ControlPosition.TOP_LEFT
            },
            fullscreenControl: true,
            fullscreenControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            streetViewControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            }
        });

        // Add markers and route
        if (pool.location?.pickup?.coordinates && pool.location?.drop?.coordinates) {
            const directionsService = new google.maps.DirectionsService();
            const directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true,
                polylineOptions: { 
                    strokeColor: "#4A90E2",
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                }
            });

            directionsRenderer.setMap(map);

            // Add pickup marker (green)
            new google.maps.Marker({
                position: pool.location.pickup.coordinates,
                map: map,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: new google.maps.Size(40, 40)
                },
                title: 'Pickup Location'
            });

            // Add drop marker (red)
            new google.maps.Marker({
                position: pool.location.drop.coordinates,
                map: map,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(40, 40)
                },
                title: 'Drop Location'
            });

            // Calculate and display route
            directionsService.route({
                origin: pool.location.pickup.coordinates,
                destination: pool.location.drop.coordinates,
                travelMode: 'DRIVING'
            }, function(result, status) {
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    
                    // Fit map to show entire route
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(pool.location.pickup.coordinates);
                    bounds.extend(pool.location.drop.coordinates);
                    map.fitBounds(bounds);
                }
            });
        }

        // Add close on click outside
        modalContainer.addEventListener('click', function(e) {
            if (e.target === modalContainer) {
                closeModal(modalContainer);
            }
        });
    }

    // Function to close modal
    function closeModal(modalContainer) {
        modalContainer.remove();
    }

    // Function to request to join pool
    function requestToJoinPool(poolId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            alert('Please log in to join this pool');
            window.location.href = 'login.html';
            return;
        }

        const pool = JSON.parse(localStorage.getItem(poolId));
        if (pool.creatorId === currentUser.id) {
            alert('You cannot join your own pool');
            return;
        }

        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        if (poolRequests[poolId]?.some(req => req.userId === currentUser.id && req.status === 'pending')) {
            alert('You have already requested to join this pool');
            return;
        }

        const joinedPools = JSON.parse(localStorage.getItem('joinedPools') || '{}');
        if (joinedPools[poolId]?.includes(currentUser.id)) {
            alert('You have already joined this pool');
            return;
        }

        if (!poolRequests[poolId]) {
            poolRequests[poolId] = [];
        }

        const request = {
            id: 'req_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };

        poolRequests[poolId].push(request);
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));

        alert('Request sent! Waiting for approval from pool creator.');
        closeModal(document.querySelector('.modal-container'));
    }

    // Initialize: display all pools and set up event listeners
    displayPools(getAllPools());

    // Add event listeners for search and filters
    document.getElementById('searchPools')?.addEventListener('input', handleSearch);
    document.getElementById('typeFilter')?.addEventListener('change', handleSearch);
    document.getElementById('locationFilter')?.addEventListener('change', handleSearch);
    document.getElementById('budgetFilter')?.addEventListener('change', handleSearch);

    // Populate location filter with unique locations
    const pools = getAllPools();
    const locations = [...new Set(pools.flatMap(pool => {
        if (!pool.location) return [];
        
        const routeTypes = ['ride', 'delivery', 'moving'];
        if (routeTypes.includes(pool.type)) {
            return [
                pool.location.pickup?.address,
                pool.location.drop?.address
            ].filter(Boolean);
        }
        return [pool.location.address].filter(Boolean);
    }))];

    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) {
        locations.forEach(location => {
            if (location) {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                locationFilter.appendChild(option);
            }
        });
    }

    // Function to create pool card
    function createPoolCard(pool) {
        const card = document.createElement('div');
        card.className = 'pool-card';
        card.innerHTML = `
            <div class="pool-card-content">
                <h3>${pool.title}</h3>
                <div class="pool-meta">
                    <span class="pool-type">${formatPoolType(pool.type)}</span>
                    <span class="budget">$${pool.budget}</span>
                </div>
                <div class="pool-locations">
                    <div class="location pickup">
                        <strong>From:</strong> ${pool.location.pickup.address}
                    </div>
                    <div class="location drop">
                        <strong>To:</strong> ${pool.location.drop.address}
                    </div>
                </div>
                <p class="pool-description">${pool.description || 'No description provided'}</p>
            </div>
        `;

        // Add click handler for viewing details
        card.addEventListener('click', () => viewPoolDetails(pool.id));

        return card;
    }
});