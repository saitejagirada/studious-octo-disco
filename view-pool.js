document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let map, directionsService, directionsRenderer;
    let pickupMarker, dropMarker;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Get pool ID from URL and load data
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get('id');
    console.log('Pool ID:', poolId);

    const poolData = JSON.parse(localStorage.getItem(poolId));
    console.log('Pool Data:', poolData);

    // Validate pool exists
    if (!poolData) {
        alert('Pool not found!');
        window.location.href = 'catch-pools.html';
        return;
    }

    // Update UI elements
    document.getElementById('projectTitle').textContent = poolData.title || 'Untitled Pool';
    document.getElementById('poolType').textContent = formatPoolType(poolData.type);
    document.getElementById('projectBudget').textContent = poolData.budget || '0';
    document.getElementById('projectDescription').textContent = poolData.description || 'No description available';

    // Get join button element
    const joinButton = document.getElementById('joinPool');

    // Show/hide join requests section based on user role
    const joinRequestsSection = document.getElementById('joinRequestsSection');

    if (currentUser && poolData.creatorId === currentUser.id) {
        joinRequestsSection.style.display = 'block';
        joinButton.style.display = 'none';
        loadJoinRequests();
        loadAcceptedSeeders();
    } else {
        joinRequestsSection.style.display = 'none';
        checkJoinStatus();
    }

    // Initialize Google Maps
    function initMap() {
        console.log('Initializing map...');
        
        // Create map instance first
        map = new google.maps.Map(document.getElementById('routeMap'), {
            zoom: 12,
            center: { lat: 20.5937, lng: 78.9629 }, // Default to center of India
            mapTypeControl: false,
            streetViewControl: false,
            zoomControl: true,
            fullscreenControl: false,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        // Create directions service and renderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#4A90E2",
                strokeWeight: 4,
                strokeOpacity: 0.8
            }
        });

        directionsRenderer.setMap(map);

        // Check if we have location data
        if (poolData.location?.pickup && poolData.location?.drop) {
            console.log('Pickup location:', poolData.location.pickup);
            console.log('Drop location:', poolData.location.drop);

            const pickupCoords = {
                lat: parseFloat(poolData.location.pickup.latitude),
                lng: parseFloat(poolData.location.pickup.longitude)
            };
            const dropCoords = {
                lat: parseFloat(poolData.location.drop.latitude),
                lng: parseFloat(poolData.location.drop.longitude)
            };

            // Add pickup marker (green)
            pickupMarker = new google.maps.Marker({
                position: pickupCoords,
                map: map,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: new google.maps.Size(35, 35)
                },
                title: 'Pickup Location',
                animation: google.maps.Animation.DROP
            });

            // Add drop marker (red)
            dropMarker = new google.maps.Marker({
                position: dropCoords,
                map: map,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(35, 35)
                },
                title: 'Drop Location',
                animation: google.maps.Animation.DROP
            });

            // Update addresses immediately
            if (poolData.location.pickup.address && poolData.location.drop.address) {
                document.getElementById('pickupLocation').textContent = poolData.location.pickup.address;
                document.getElementById('dropLocation').textContent = poolData.location.drop.address;
            }

            // Calculate and display route
            const request = {
                origin: pickupCoords,
                destination: dropCoords,
                travelMode: google.maps.TravelMode.DRIVING
            };

            directionsService.route(request, function(result, status) {
                console.log('Directions status:', status);
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    
                    // Get route details
                    const route = result.routes[0];
                    const leg = route.legs[0];
                    const distance = leg.distance.text;
                    const duration = leg.duration.text;

                    // Update location text with details
                    document.getElementById('pickupLocation').innerHTML = `
                        <div class="location-address">${poolData.location.pickup.address || leg.start_address}</div>
                        <div class="location-details">
                            <span class="distance">${distance}</span>
                            <span class="duration">${duration}</span>
                        </div>
                    `;
                    document.getElementById('dropLocation').innerHTML = `
                        <div class="location-address">${poolData.location.drop.address || leg.end_address}</div>
                    `;

                    // Fit map to show entire route
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(pickupCoords);
                    bounds.extend(dropCoords);
                    map.fitBounds(bounds);
                } else {
                    console.error('Directions request failed:', status);
                }
            });
        } else {
            console.log('No location data available');
            document.getElementById('pickupLocation').textContent = 'Location not available';
            document.getElementById('dropLocation').textContent = 'Location not available';
        }
    }

    // Make initMap globally available
    window.initMap = initMap;

    // Helper function to format pool type
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

    // Function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Function to load join requests
    function loadJoinRequests() {
        const pendingRequestsDiv = document.getElementById('pendingRequests');
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const requests = poolRequests[poolId] || [];
        const pendingRequests = requests.filter(req => req.status === 'pending');

        // Update status counts
        const totalRequests = requests.length;
        const acceptedRequests = requests.filter(req => req.status === 'accepted').length;
        document.querySelector('.seeder-count').textContent = totalRequests;
        document.querySelector('.accepted-count').textContent = acceptedRequests;

        // Update progress bar
        const progressBar = document.querySelector('.progress');
        if (totalRequests > 0) {
            const progressPercentage = (acceptedRequests / totalRequests) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }

        if (pendingRequests.length === 0) {
            pendingRequestsDiv.innerHTML = '<div class="no-requests-message">No pending requests</div>';
            return;
        }

        pendingRequestsDiv.innerHTML = pendingRequests.map(request => `
            <div class="request-item" data-request-id="${request.id}">
                <div class="request-info">
                    <span class="request-user">${request.userName}</span>
                    <span class="request-time">Requested on ${formatDate(request.requestedAt)}</span>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" onclick="handleRequest('${request.id}', 'accept')">Accept</button>
                    <button class="reject-btn" onclick="handleRequest('${request.id}', 'reject')">Reject</button>
                </div>
            </div>
        `).join('');
    }

    // Function to load accepted seeders
    function loadAcceptedSeeders() {
        const acceptedSeedersDiv = document.getElementById('acceptedSeeders');
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const requests = poolRequests[poolId] || [];
        const acceptedRequests = requests.filter(req => req.status === 'accepted');

        if (acceptedRequests.length === 0) {
            acceptedSeedersDiv.innerHTML = '<div class="no-seeders-message">No seeders have joined this pool yet.</div>';
            return;
        }

        acceptedSeedersDiv.innerHTML = acceptedRequests.map(request => `
            <div class="seeder-item">
                <div class="seeder-info">
                    <span class="seeder-name">${request.userName}</span>
                    <span class="seeder-status">Joined ${formatDate(request.actionedAt)}</span>
                </div>
            </div>
        `).join('');
    }

    // Function to handle request acceptance/rejection
    window.handleRequest = function(requestId, action) {
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const requests = poolRequests[poolId] || [];
        const requestIndex = requests.findIndex(req => req.id === requestId);

        if (requestIndex === -1) return;

        const request = requests[requestIndex];
        request.status = action === 'accept' ? 'accepted' : 'rejected';
        request.actionedAt = new Date().toISOString();

        // Update the requests in localStorage
        poolRequests[poolId] = requests;
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));

        // Reload both sections
        loadJoinRequests();
        loadAcceptedSeeders();

        // Show notification
        alert(action === 'accept' ? 
            `${request.userName}'s request has been accepted.` : 
            `${request.userName}'s request has been rejected.`
        );
    };

    // Function to check join status
    function checkJoinStatus() {
        if (!currentUser) return;

        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const requests = poolRequests[poolId] || [];
        const userRequest = requests.find(req => req.userId === currentUser.id);

        if (userRequest) {
            switch (userRequest.status) {
                case 'pending':
                    joinButton.textContent = 'Request Pending';
                    joinButton.disabled = true;
                    break;
                case 'accepted':
                    joinButton.textContent = 'Accepted';
                    joinButton.disabled = true;
                    break;
                case 'rejected':
                    joinButton.textContent = 'Request Rejected';
                    joinButton.disabled = true;
                    break;
            }
        }
    }

    // Event Listeners
    joinButton.addEventListener('click', function() {
        if (!currentUser) {
            alert('Please log in to join this pool');
            window.location.href = 'login.html';
            return;
        }

        if (poolData.creatorId === currentUser.id) {
            alert('You cannot join your own pool');
            return;
        }

        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
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

        joinButton.textContent = 'Request Sent';
        joinButton.disabled = true;

        alert('Request sent! Waiting for approval from pool creator.');
    });

    document.getElementById('sharePool').addEventListener('click', function() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: poolData.title,
                text: poolData.description,
                url: url
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url).then(() => {
                alert('Pool link copied to clipboard!');
            }).catch(console.error);
        }
    });
}); 