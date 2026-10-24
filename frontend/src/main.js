// EcoLoop Frontend Client Controller
const API_BASE = '/api/v1';

// State Store
const state = {
  activeTab: 'marketplace',
  listings: [],
  selectedListing: null,
};

// DOM Elements
const elements = {
  apiStatus: document.getElementById('api-status'),
  tabLinks: document.querySelectorAll('.nav-link'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  listingsGrid: document.getElementById('listings-grid'),
  filterMaterial: document.getElementById('filter-material'),
  filterStatus: document.getElementById('filter-status'),
  btnRefreshListings: document.getElementById('btn-refresh-listings'),
  statTotalListings: document.getElementById('stat-total-listings'),
  
  // Auction Elements
  bidListingSelect: document.getElementById('bid-listing-select'),
  bidAmountInput: document.getElementById('bid-amount-input'),
  bidHint: document.getElementById('bid-hint'),
  formBid: document.getElementById('form-bid'),
  auctionHistoryList: document.getElementById('auction-history-list'),

  // EPR Elements
  eprHashInput: document.getElementById('epr-hash-input'),
  btnVerifyHash: document.getElementById('btn-verify-hash'),
  eprVerificationResult: document.getElementById('epr-verification-result'),

  // Modal Elements
  btnCreateListing: document.getElementById('btn-create-listing'),
  modalCreateListing: document.getElementById('modal-create-listing'),
  modalClose: document.getElementById('modal-close'),
  modalCancel: document.getElementById('modal-cancel'),
  formCreateListing: document.getElementById('form-create-listing'),

  // Toast Container
  toastContainer: document.getElementById('toast-container'),
};

// ============================================================================
// Utilities: Notifications & Toast
// ============================================================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// Health Check & Initial Ping
// ============================================================================
async function checkHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();
    if (res.ok && data.success) {
      elements.apiStatus.className = 'api-status-badge online';
      elements.apiStatus.querySelector('.status-label').textContent = 'API Live';
    } else {
      elements.apiStatus.className = 'api-status-badge offline';
      elements.apiStatus.querySelector('.status-label').textContent = 'DB Degraded';
    }
  } catch (err) {
    elements.apiStatus.className = 'api-status-badge offline';
    elements.apiStatus.querySelector('.status-label').textContent = 'Offline';
  }
}

// ============================================================================
// Marketplace Feed Management
// ============================================================================
async function fetchListings() {
  elements.listingsGrid.innerHTML = `
    <div class="loader-box">
      <div class="spinner"></div>
      <span>Loading marketplace lots...</span>
    </div>
  `;

  try {
    const material = elements.filterMaterial.value;
    const status = elements.filterStatus.value;
    
    const params = new URLSearchParams();
    if (material) params.append('material_grade', material);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/listings?${params.toString()}`);
    const body = await res.json();

    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to load scrap listings');
    }

    state.listings = body.data.listings || [];
    elements.statTotalListings.textContent = state.listings.length;
    renderListings(state.listings);
    populateBidDropdown(state.listings);
  } catch (err) {
    elements.listingsGrid.innerHTML = `
      <div class="loader-box text-muted">
        <p>Could not load listings: ${err.message}</p>
        <button class="btn btn-secondary mt-2" onclick="window.location.reload()">Retry</button>
      </div>
    `;
    showToast(err.message, 'error');
  }
}

function renderListings(listings) {
  if (listings.length === 0) {
    elements.listingsGrid.innerHTML = `
      <div class="loader-box text-muted">
        <p>No scrap lots found matching the selected filter criteria.</p>
      </div>
    `;
    return;
  }

  elements.listingsGrid.innerHTML = listings
    .map((item) => {
      const topOffer = item.highest_bid > 0 ? `₹${item.highest_bid.toLocaleString('en-IN')}` : 'No offers yet';
      const reserve = `₹${Number(item.min_price).toLocaleString('en-IN')}`;

      return `
        <div class="listing-card" data-id="${item.listing_id}">
          <div>
            <div class="listing-top">
              <span class="grade-badge">${item.material_grade}</span>
              <span class="status-tag ${item.status}">${item.status}</span>
            </div>

            <div class="listing-meta-row">
              <span class="text-muted">Available Weight:</span>
              <span class="listing-weight">${item.weight_kg.toLocaleString()} kg</span>
            </div>

            <div class="listing-price-box">
              <div class="price-item">
                <span class="price-label">Reserve Price</span>
                <span class="price-amount">${reserve}</span>
              </div>
              <div class="price-item" style="text-align: right;">
                <span class="price-label">Top Bid</span>
                <span class="price-amount text-emerald">${topOffer}</span>
              </div>
            </div>
          </div>

          <div class="listing-footer">
            <div class="seller-info">
              <div class="seller-avatar">${item.seller.role ? item.seller.role[0] : 'U'}</div>
              <div>
                <strong style="color: #fff;">${item.seller.role}</strong>
                <div>${item.seller.verification_status || 'VERIFIED'}</div>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              ${
                item.status === 'OPEN' || item.status === 'BIDDING'
                  ? `<button class="btn btn-secondary btn-sm btn-quick-bid" data-id="${item.listing_id}">Bid Now</button>`
                  : ''
              }
              ${
                (item.status === 'OPEN' || item.status === 'BIDDING') && item.highest_bid > 0
                  ? `<button class="btn btn-primary btn-sm btn-accept-bid" data-id="${item.listing_id}">Accept & Mint EPR</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach dynamic card actions
  document.querySelectorAll('.btn-quick-bid').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const listingId = e.currentTarget.getAttribute('data-id');
      switchTab('bids');
      elements.bidListingSelect.value = listingId;
      handleListingSelectChange();
    });
  });

  document.querySelectorAll('.btn-accept-bid').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const listingId = e.currentTarget.getAttribute('data-id');
      await handleAcceptBid(listingId);
    });
  });
}

function populateBidDropdown(listings) {
  const activeListings = listings.filter((l) => l.status === 'OPEN' || l.status === 'BIDDING');
  elements.bidListingSelect.innerHTML = `
    <option value="">Select an active listing...</option>
    ${activeListings
      .map(
        (l) => `
      <option value="${l.listing_id}" data-min="${l.min_price}" data-highest="${l.highest_bid}">
        ${l.material_grade} (${l.weight_kg}kg) - Reserve ₹${l.min_price} | Top Bid ₹${l.highest_bid || 0}
      </option>
    `
      )
      .join('')}
  `;
}

function handleListingSelectChange() {
  const selectedOption = elements.bidListingSelect.selectedOptions[0];
  if (!selectedOption || !selectedOption.value) {
    elements.bidHint.textContent = 'Must exceed current reserve or highest active bid.';
    elements.auctionHistoryList.innerHTML = '<div class="empty-state">Select a listing to view historical bids and price movements.</div>';
    return;
  }

  const minPrice = Number(selectedOption.getAttribute('data-min')) || 0;
  const highestBid = Number(selectedOption.getAttribute('data-highest')) || 0;
  const targetThreshold = Math.max(minPrice, highestBid);

  elements.bidAmountInput.min = targetThreshold + 1;
  elements.bidAmountInput.value = targetThreshold + 500;
  elements.bidHint.textContent = `Minimum allowed bid: ₹${(targetThreshold + 1).toLocaleString('en-IN')}`;

  loadListingBids(selectedOption.value);
}

async function loadListingBids(listingId) {
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/bids`);
    const body = await res.json();

    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to fetch bids');
    }

    const bids = body.data.bids || [];
    if (bids.length === 0) {
      elements.auctionHistoryList.innerHTML = '<div class="empty-state">No bids placed on this lot yet. Be the first to bid!</div>';
      return;
    }

    elements.auctionHistoryList.innerHTML = bids
      .map(
        (b, i) => `
        <div class="bid-row-item">
          <div>
            <strong style="color: #fff;">₹${b.bid_amount.toLocaleString('en-IN')}</strong>
            <span class="text-muted" style="font-size: 0.75rem; margin-left: 0.5rem;">(${b.bidder.role})</span>
          </div>
          <div>
            <span class="status-tag ${b.bid_status}">${i === 0 ? '🏆 Highest' : b.bid_status}</span>
          </div>
        </div>
      `
      )
      .join('');
  } catch (err) {
    elements.auctionHistoryList.innerHTML = `<div class="empty-state text-muted">Error loading bids: ${err.message}</div>`;
  }
}

// ============================================================================
// Actions: Bid Placement, Auction Settlement & EPR Verification
// ============================================================================
async function handleBidSubmit(e) {
  e.preventDefault();
  const listingId = elements.bidListingSelect.value;
  const bidderId = document.getElementById('bid-recycler-select').value;
  const bidAmount = Number(elements.bidAmountInput.value);

  if (!listingId) {
    showToast('Please select a target scrap listing.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidder_id: bidderId, bid_amount: bidAmount }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to place bid');
    }

    showToast(`Bid of ₹${bidAmount.toLocaleString('en-IN')} submitted successfully!`);
    await fetchListings();
    loadListingBids(listingId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAcceptBid(listingId) {
  if (!confirm('Are you sure you want to finalize this auction? This will trigger an instant UPI payout to the seller and mint an immutable CPCB EPR credit token.')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/accept-bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to finalize auction');
    }

    showToast('Auction Finalized! UPI Payout dispatched & CPCB EPR Token minted.');
    
    // Auto-display minted EPR certificate in EPR tab
    if (body.data.epr_token) {
      switchTab('epr');
      elements.eprHashInput.value = body.data.epr_token.cpcb_certificate_hash;
      await handleVerifyHash();
    }

    await fetchListings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleVerifyHash() {
  const hash = elements.eprHashInput.value.trim();
  if (!hash) {
    showToast('Please enter a 64-character SHA-256 hash.', 'error');
    return;
  }

  elements.eprVerificationResult.className = 'epr-result-card';
  elements.eprVerificationResult.innerHTML = `
    <div class="loader-box">
      <div class="spinner"></div>
      <span>Querying Central Pollution Control Board (CPCB) Ledger...</span>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/epr/verify/${hash}`);
    const body = await res.json();

    if (!res.ok || !body.success) {
      elements.eprVerificationResult.innerHTML = `
        <div style="text-align: center; color: var(--rose-400);">
          <h4>❌ Unverified or Fraudulent Certificate</h4>
          <p class="text-muted" style="margin-top: 0.5rem;">${body.error || 'Certificate hash was not found on the national registry.'}</p>
        </div>
      `;
      return;
    }

    const cert = body.data;
    elements.eprVerificationResult.innerHTML = `
      <div class="certificate-header">
        <div>
          <h3 style="color: #fff;">CPCB Verified Recycling Credit</h3>
          <p class="text-muted" style="font-size: 0.8rem;">Ministry of Environment, Forest and Climate Change (MoEFCC)</p>
        </div>
        <span class="cert-badge">OFFICIALLY REGISTERED</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; margin-bottom: 1.5rem;">
        <div>
          <span class="text-muted" style="display: block; font-size: 0.75rem;">MATERIAL GRADE</span>
          <strong style="color: #fff; font-size: 1.1rem;">${cert.material_grade}</strong>
        </div>
        <div>
          <span class="text-muted" style="display: block; font-size: 0.75rem;">VERIFIED WEIGHT</span>
          <strong class="text-emerald" style="font-size: 1.1rem;">${cert.verified_weight_mt} Metric Tonnes (MT)</strong>
        </div>
        <div>
          <span class="text-muted" style="display: block; font-size: 0.75rem;">CREDIT RECIPIENT ID</span>
          <span class="font-mono text-muted" style="font-size: 0.8rem;">${cert.recycler_id}</span>
        </div>
        <div>
          <span class="text-muted" style="display: block; font-size: 0.75rem;">SETTLEMENT TIMESTAMP</span>
          <span style="font-size: 0.85rem;">${new Date(cert.issue_timestamp).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div style="background: rgba(0, 0, 0, 0.3); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span class="text-muted" style="display: block; font-size: 0.7rem; text-transform: uppercase;">CRYPTOGRAPHIC SHA-256 LEDGER HASH</span>
        <code class="font-mono text-cyan" style="font-size: 0.8rem; word-break: break-all;">${cert.certificate_hash}</code>
      </div>
    `;
  } catch (err) {
    elements.eprVerificationResult.innerHTML = `<p class="text-muted">Error verifying hash: ${err.message}</p>`;
  }
}

async function handleCreateListing(e) {
  e.preventDefault();
  const sellerId = document.getElementById('create-seller').value;
  const materialGrade = document.getElementById('create-material').value;
  const weightKg = Number(document.getElementById('create-weight').value);
  const minPrice = Number(document.getElementById('create-price').value);

  try {
    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: sellerId,
        material_grade: materialGrade,
        weight_kg: weightKg,
        min_price: minPrice,
      }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to create listing');
    }

    showToast(`Scrap lot for ${materialGrade} published to marketplace!`);
    elements.modalCreateListing.classList.add('hidden');
    elements.formCreateListing.reset();
    await fetchListings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================================
// Tab Navigation
// ============================================================================
function switchTab(tabName) {
  state.activeTab = tabName;
  elements.tabLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabName);
  });
  elements.tabPanes.forEach((pane) => {
    pane.classList.toggle('active', pane.id === `tab-${tabName}`);
  });
}

// ============================================================================
// Event Listeners & Bootstrapping
// ============================================================================
function init() {
  // Tabs
  elements.tabLinks.forEach((link) => {
    link.addEventListener('click', () => switchTab(link.getAttribute('data-tab')));
  });

  // Filter events
  elements.filterMaterial.addEventListener('change', fetchListings);
  elements.filterStatus.addEventListener('change', fetchListings);
  elements.btnRefreshListings.addEventListener('click', fetchListings);

  // Auction events
  elements.bidListingSelect.addEventListener('change', handleListingSelectChange);
  elements.formBid.addEventListener('submit', handleBidSubmit);

  // EPR events
  elements.btnVerifyHash.addEventListener('click', handleVerifyHash);

  // Modal events
  elements.btnCreateListing.addEventListener('click', () => elements.modalCreateListing.classList.remove('hidden'));
  elements.modalClose.addEventListener('click', () => elements.modalCreateListing.classList.add('hidden'));
  elements.modalCancel.addEventListener('click', () => elements.modalCreateListing.classList.add('hidden'));
  elements.formCreateListing.addEventListener('submit', handleCreateListing);

  // Initial loads
  checkHealth();
  fetchListings();
}

document.addEventListener('DOMContentLoaded', init);
