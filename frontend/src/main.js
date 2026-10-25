// EcoLoop Frontend Client Controller
const API_BASE = '/api/v1';
const AUTH_STORAGE_KEY = 'ecoloop_auth';
const DEMO_PASSWORD = 'Password@123'; // documented seed password for all demo accounts

// State Store
const state = {
  activeTab: 'marketplace',
  listings: [],
  selectedListing: null,
  lastVerifiedVpa: null,
  currentDeposit: null,
};

// Auth Store (demo session persisted in localStorage)
const auth = { token: null, user: null };

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      auth.token = parsed.token || null;
      auth.user = parsed.user || null;
    }
  } catch (err) {
    auth.token = null;
    auth.user = null;
  }
}

function setAuthSession(token, user) {
  auth.token = token;
  auth.user = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  renderAuthState();
}

function clearAuthSession() {
  auth.token = null;
  auth.user = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  renderAuthState();
}

// Fetch wrapper that attaches the demo session JWT when signed in
function apiFetch(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  return fetch(endpoint, { ...options, headers });
}

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

  // Modal: Create Listing
  btnCreateListing: document.getElementById('btn-create-listing'),
  modalCreateListing: document.getElementById('modal-create-listing'),
  modalClose: document.getElementById('modal-close'),
  modalCancel: document.getElementById('modal-cancel'),
  formCreateListing: document.getElementById('form-create-listing'),

  // Modal: Seller UPI Onboarding
  btnRegisterSeller: document.getElementById('btn-register-seller'),
  modalRegisterSeller: document.getElementById('modal-register-seller'),
  modalSellerClose: document.getElementById('modal-seller-close'),
  modalSellerCancel: document.getElementById('modal-seller-cancel'),
  formRegisterSeller: document.getElementById('form-register-seller'),
  sellerRegRole: document.getElementById('seller-reg-role'),
  sellerRegOrg: document.getElementById('seller-reg-org'),
  sellerRegMobile: document.getElementById('seller-reg-mobile'),
  sellerRegPassword: document.getElementById('seller-reg-password'),
  sellerRegCpcb: document.getElementById('seller-reg-cpcb'),
  sellerRegVpa: document.getElementById('seller-reg-vpa'),
  btnVerifyVpa: document.getElementById('btn-verify-vpa'),
  vpaVerificationFeedback: document.getElementById('vpa-verification-feedback'),

  // Modal: Recycler Inbound Payment Rails
  btnPreviewEscrow: document.getElementById('btn-preview-escrow'),
  modalPaymentRails: document.getElementById('modal-payment-rails'),
  modalPaymentClose: document.getElementById('modal-payment-close'),
  modalPaymentDone: document.getElementById('modal-payment-done'),
  escrowModalLot: document.getElementById('escrow-modal-lot'),
  escrowModalAmount: document.getElementById('escrow-modal-amount'),
  escrowUpiIntentLink: document.getElementById('escrow-upi-intent-link'),
  escrowModalQrImg: document.getElementById('escrow-modal-qr-img'),
  escrowVanNumber: document.getElementById('escrow-van-number'),

  // Modal: Settlement Payout Receipt
  modalSettlementReceipt: document.getElementById('modal-settlement-receipt'),
  modalReceiptClose: document.getElementById('modal-receipt-close'),
  modalReceiptDone: document.getElementById('modal-receipt-done'),
  settlementReceiptContent: document.getElementById('settlement-receipt-content'),

  // Demo Auth Widget
  authSigninWidget: document.getElementById('auth-signin-widget'),
  demoUserSelect: document.getElementById('demo-user-select'),
  btnDemoLogin: document.getElementById('btn-demo-login'),
  authUserChip: document.getElementById('auth-user-chip'),
  authUserLabel: document.getElementById('auth-user-label'),
  btnDemoLogout: document.getElementById('btn-demo-logout'),

  // Escrow Deposit Confirmation
  escrowDepositRef: document.getElementById('escrow-deposit-ref'),
  btnConfirmDeposit: document.getElementById('btn-confirm-deposit'),
  escrowFundedState: document.getElementById('escrow-funded-state'),

  // Payouts Ledger Tab
  payoutStatusFilter: document.getElementById('payout-status-filter'),
  btnRefreshPayouts: document.getElementById('btn-refresh-payouts'),
  payoutsContent: document.getElementById('payouts-content'),

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

            ${
              item.mstc_lot_no
                ? `<div style="font-size: 0.72rem; font-family: monospace; color: #b45309; background: rgba(180,83,9,0.1); border: 1px solid rgba(180,83,9,0.25); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 0.4rem;">🏛️ ${item.mstc_lot_no}</div>`
                : ''
            }
            ${
              item.origin_location
                ? `<div style="font-size: 0.78rem; color: #78716c; margin: 0.35rem 0 0.5rem 0;">📍 ${item.origin_location}</div>`
                : ''
            }

            <div class="listing-meta-row" style="margin-top: 0.4rem;">
              <span class="text-muted">Available Weight:</span>
              <span class="listing-weight">${(item.weight_kg / 1000).toFixed(1)} MT <span style="font-size: 0.75rem; color: #78716c;">(${item.weight_kg.toLocaleString()} kg)</span></span>
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
                <strong style="color: #1f1b17; font-size: 0.85rem; display: block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.seller.organization_name || item.seller.role}">
                  ${item.seller.organization_name || item.seller.role}
                </strong>
                <div style="font-size: 0.72rem; color: #166534;">
                  ${item.seller.cpcb_reg_number ? `CPCB: ${item.seller.cpcb_reg_number}` : (item.seller.verification_status || 'VERIFIED')}
                </div>
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
        ${l.mstc_lot_no ? `[${l.mstc_lot_no}] ` : ''}${l.material_grade} (${(l.weight_kg / 1000).toFixed(1)} MT) - Reserve ₹${Number(l.min_price).toLocaleString('en-IN')} | Top Bid ₹${Number(l.highest_bid || 0).toLocaleString('en-IN')}
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
  
  // If bids already exist, new bid must strictly exceed highest bid (> highestBid).
  // If no bids placed yet, new bid must meet or exceed the reserve price (>= minPrice).
  const minimumBid = highestBid > 0 ? highestBid + 1 : minPrice;

  elements.bidAmountInput.min = minimumBid;
  elements.bidAmountInput.step = 'any';
  elements.bidAmountInput.value = minimumBid > 0 ? Math.ceil(minimumBid / 100) * 100 : 1000;
  elements.bidHint.textContent = `Minimum allowed bid: ₹${minimumBid.toLocaleString('en-IN')}`;

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
            <strong style="color: #1f1b17;">₹${b.bid_amount.toLocaleString('en-IN')}</strong>
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
  if (!auth.token) {
    showToast('Sign in as the listing seller (or ULB) to finalize this auction.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to finalize this auction? This will trigger an instant UPI payout to the seller and mint an immutable CPCB EPR credit token.')) {
    return;
  }

  try {
    const res = await apiFetch(`${API_BASE}/listings/${listingId}/accept-bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to finalize auction');
    }

    if (body.data.idempotent_replay) {
      showToast('Auction was already settled — showing the original payout receipt.');
    } else {
      showToast('Auction Finalized! UPI Payout dispatched & CPCB EPR Token minted.');
    }

    // Auto-display minted EPR certificate in EPR tab
    if (body.data.epr_token) {
      elements.eprHashInput.value = body.data.epr_token.cpcb_certificate_hash;
    }

    // Display Settlement Payout Receipt Modal
    if (body.data.payout) {
      renderSettlementReceipt(body.data);
    }

    await fetchListings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSettlementReceipt(data) {
  const { payout, epr_token } = data;
  elements.settlementReceiptContent.innerHTML = `
    <div style="background: rgba(22,101,52,0.06); border: 1px solid rgba(22,101,52,0.3); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="text-muted" style="font-size: 0.8rem;">DISPATCH STATUS</span>
        <span class="status-tag SOLD" style="background: rgba(22,101,52,0.2); color: #166534; font-weight: 600;">UPI INSTANT SETTLED</span>
      </div>
      <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: baseline;">
        <span style="color: #1f1b17; font-size: 0.9rem;">Gross Auction Settlement:</span>
        <strong style="color: #166534; font-size: 1.35rem;">₹${Number(payout.gross_amount_inr).toLocaleString('en-IN')}</strong>
      </div>
    </div>

    <table class="receipt-table">
      <thead>
        <tr>
          <th>Automated Ledger Allocation</th>
          <th style="text-align: right;">Split %</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong style="color: #1f1b17;">Seller Net Proceeds</strong>
            <div class="text-muted" style="font-size: 0.72rem;">Beneficiary VPA: ${payout.payee_vpa}</div>
          </td>
          <td style="text-align: right; color: #166534; font-weight: 600;">98.5%</td>
          <td style="text-align: right; font-weight: 700; color: #166534;">₹${Number(payout.seller_net_amount_inr).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>
            <strong style="color: #1f1b17;">Platform Clearing Fee</strong>
            <div class="text-muted" style="font-size: 0.72rem;">Escrow processing, KYC & smart contracts</div>
          </td>
          <td style="text-align: right; color: #b45309;">1.0%</td>
          <td style="text-align: right; font-weight: 600; color: #b45309;">₹${Number(payout.platform_fee_inr).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>
            <strong style="color: #1f1b17;">Informal Waste Picker Welfare</strong>
            <div class="text-muted" style="font-size: 0.72rem;">Health micro-insurance & safety equipment pool</div>
          </td>
          <td style="text-align: right; color: #d97706;">0.5%</td>
          <td style="text-align: right; font-weight: 600; color: #d97706;">₹${Number(payout.welfare_levy_inr).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 1rem; background: rgba(31,27,23,0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.75rem; font-family: monospace;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span class="text-muted">BANK RRN:</span>
        <span style="color: #1f1b17;">${payout.bank_rrn}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span class="text-muted">GATEWAY TXN ID:</span>
        <span style="color: #1f1b17;">${payout.transaction_id}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">CPCB EPR LEDGER HASH:</span>
        <span style="color: #b45309; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${epr_token ? epr_token.cpcb_certificate_hash : 'VERIFIED'}</span>
      </div>
    </div>
  `;
  elements.modalSettlementReceipt.classList.remove('hidden');
}

// ============================================================================
// Seller UPI Onboarding & Penny-Drop Bank Verification
// ============================================================================
async function handleVerifyVpa() {
  const vpa = elements.sellerRegVpa.value.trim();
  if (!vpa) {
    showToast('Please enter a UPI VPA (e.g. org@sbi).', 'error');
    return;
  }

  elements.btnVerifyVpa.disabled = true;
  elements.btnVerifyVpa.textContent = 'Verifying...';

  try {
    const orgName = elements.sellerRegOrg?.value?.trim() || '';
    const res = await fetch(`${API_BASE}/auth/verify-vpa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_vpa: vpa, vpa, organization_name: orgName }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to verify UPI VPA');
    }

    state.lastVerifiedVpa = body.data;

    elements.vpaVerificationFeedback.className = 'penny-drop-card';
    elements.vpaVerificationFeedback.style.borderColor = 'rgba(22,101,52,0.4)';
    elements.vpaVerificationFeedback.style.background = 'rgba(22,101,52,0.06)';
    elements.vpaVerificationFeedback.innerHTML = `
      <div class="penny-drop-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <strong style="color: #166534;">Penny-Drop Reverse Lookup Succeeded</strong>
      </div>
      <div style="font-size: 0.82rem; margin-top: 0.4rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div>
          <span class="text-muted" style="display: block; font-size: 0.7rem;">LEGAL BANK ACCOUNT HOLDER</span>
          <strong style="color: #1f1b17;">${body.data.account_holder_name}</strong>
        </div>
        <div>
          <span class="text-muted" style="display: block; font-size: 0.7rem;">ISSUING PSP / BANK</span>
          <span style="color: #b45309;">${body.data.bank_name}</span>
        </div>
      </div>
      <div style="font-size: 0.72rem; color: #78716c; margin-top: 0.4rem;">
        Verified at: ${new Date(body.data.verified_at || body.data.timestamp).toLocaleTimeString('en-IN')} &bull; Status: <span style="color: #166534; font-weight: 600;">ACTIVE_NPCI</span>
      </div>
    `;
    elements.vpaVerificationFeedback.classList.remove('hidden');
    showToast(`Bank Account Verified: ${body.data.account_holder_name} (${body.data.bank_name})`);
  } catch (err) {
    elements.vpaVerificationFeedback.className = 'penny-drop-card';
    elements.vpaVerificationFeedback.style.borderColor = 'rgba(244,63,94,0.4)';
    elements.vpaVerificationFeedback.style.background = 'rgba(244,63,94,0.06)';
    elements.vpaVerificationFeedback.innerHTML = `
      <div style="color: #f43f5e; font-weight: 600; font-size: 0.85rem;">
        ❌ Verification Failed: ${err.message}
      </div>
    `;
    elements.vpaVerificationFeedback.classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    elements.btnVerifyVpa.disabled = false;
    elements.btnVerifyVpa.textContent = 'Verify Bank';
  }
}

async function handleRegisterSellerSubmit(e) {
  e.preventDefault();
  const role = elements.sellerRegRole.value;
  const organization_name = elements.sellerRegOrg.value.trim();
  const mobile = elements.sellerRegMobile.value.trim();
  const password = elements.sellerRegPassword.value;
  const cpcb_registration_number = elements.sellerRegCpcb.value.trim() || undefined;
  const upi_vpa = elements.sellerRegVpa.value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_name,
        role,
        mobile_number: mobile,
        mobile: mobile,
        password,
        cpcb_reg_number: cpcb_registration_number,
        cpcb_registration_number,
        upi_vpa,
        vpa: upi_vpa,
        upi_bank_account_holder: state.lastVerifiedVpa?.account_holder_name || organization_name,
      }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to register seller');
    }

    const newUser = body.data.user;
    if (body.data.token) {
      setAuthSession(body.data.token, newUser);
      showToast(`Onboarded & signed in as ${newUser.organization_name || newUser.role}.`);
    } else {
      showToast(`Seller onboarded successfully! UPI VPA ${upi_vpa} linked.`);
    }

    // Add new seller to create-seller select in modal
    const createSellerSelect = document.getElementById('create-seller');
    if (createSellerSelect && newUser) {
      const opt = document.createElement('option');
      opt.value = newUser.user_id;
      opt.textContent = `${newUser.organization_name} (${newUser.role} - ${upi_vpa})`;
      opt.selected = true;
      createSellerSelect.appendChild(opt);
    }

    // Close modal & reset
    elements.modalRegisterSeller.classList.add('hidden');
    elements.formRegisterSeller.reset();
    elements.vpaVerificationFeedback.classList.add('hidden');
    state.lastVerifiedVpa = null;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================================
// Recycler Inbound Escrow Gateway & Payment Rails Preview
// ============================================================================
async function handlePreviewEscrowRails() {
  if (!auth.token || !auth.user || auth.user.role !== 'Recycler') {
    showToast('Sign in as a Recycler account to open an escrow deposit.', 'error');
    return;
  }

  const listingId = elements.bidListingSelect.value;
  if (!listingId) {
    showToast('Please select a target scrap listing first.', 'error');
    return;
  }

  const selectedLot = state.listings.find((l) => l.listing_id === listingId);
  const bidAmount = Number(elements.bidAmountInput.value) || (selectedLot ? Number(selectedLot.min_price) : 25000);

  elements.escrowModalLot.textContent = selectedLot
    ? `${selectedLot.material_grade} (${(selectedLot.weight_kg / 1000).toFixed(1)} MT / ${selectedLot.weight_kg.toLocaleString()} kg)`
    : 'Selected Scrap Lot';
  elements.escrowModalAmount.textContent = `₹${bidAmount.toLocaleString('en-IN')}`;
  elements.escrowDepositRef.textContent = 'Opening deposit...';
  elements.escrowFundedState.classList.add('hidden');
  elements.btnConfirmDeposit.disabled = true;
  elements.btnConfirmDeposit.style.display = '';

  try {
    const res = await apiFetch(`${API_BASE}/listings/${listingId}/payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bid_amount: bidAmount }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to generate payment intent');
    }

    const intent = body.data;
    state.currentDeposit = intent;
    elements.escrowUpiIntentLink.href = intent.upi_intent_uri;
    elements.escrowModalQrImg.src = intent.qr_data_url;
    elements.escrowVanNumber.textContent = intent.van_b2b_details.virtual_account_number;
    elements.escrowDepositRef.textContent = intent.reference_no;
    elements.btnConfirmDeposit.disabled = false;

    elements.modalPaymentRails.classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleConfirmDeposit() {
  if (!state.currentDeposit || !state.currentDeposit.reference_no) {
    showToast('No active deposit to confirm. Open the payment rails first.', 'error');
    return;
  }

  elements.btnConfirmDeposit.disabled = true;
  elements.btnConfirmDeposit.textContent = 'Confirming with bank...';

  try {
    const res = await apiFetch(`${API_BASE}/deposits/${state.currentDeposit.reference_no}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Deposit confirmation failed');
    }

    elements.escrowFundedState.classList.remove('hidden');
    elements.btnConfirmDeposit.style.display = 'none';
    showToast(`Escrow funded: ₹${Number(body.data.deposit.amount_inr).toLocaleString('en-IN')} confirmed (${body.data.deposit.gateway_transaction_id}).`);
  } catch (err) {
    elements.btnConfirmDeposit.disabled = false;
    showToast(err.message, 'error');
  } finally {
    elements.btnConfirmDeposit.textContent = 'Simulate Bank Confirmation';
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

    if (cert.verified === false) {
      elements.eprVerificationResult.innerHTML = `
        <div style="text-align: center; color: var(--rose-400);">
          <h4>❌ ${cert.status === 'TAMPER_DETECTED' ? 'Certificate Tampering Detected' : 'Unverified or Fraudulent Certificate'}</h4>
          <p class="text-muted" style="margin-top: 0.5rem;">${cert.reason || body.error || 'Certificate hash was not found on the national registry.'}</p>
          ${
            cert.expected_hash
              ? `<p class="font-mono text-muted" style="font-size: 0.72rem; word-break: break-all;">Expected: ${cert.expected_hash}</p>
                 <p class="font-mono text-muted" style="font-size: 0.72rem; word-break: break-all;">Stored: ${cert.certificate_hash}</p>`
              : ''
          }
        </div>
      `;
      return;
    }

    elements.eprVerificationResult.innerHTML = `
      <div class="certificate-header">
        <div>
          <h3 style="color: #1f1b17;">CPCB Verified Recycling Credit</h3>
          <p class="text-muted" style="font-size: 0.8rem;">Ministry of Environment, Forest and Climate Change (MoEFCC)</p>
        </div>
        <span class="cert-badge">OFFICIALLY REGISTERED</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; margin-bottom: 1.5rem;">
        <div>
          <span class="text-muted" style="display: block; font-size: 0.75rem;">MATERIAL GRADE</span>
          <strong style="color: #1f1b17; font-size: 1.1rem;">${cert.material_grade}</strong>
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
// Demo Sign-In (seeded accounts) & Session Chip
// ============================================================================
function renderAuthState() {
  if (auth.token && auth.user) {
    elements.authSigninWidget.style.display = 'none';
    elements.authUserChip.style.display = 'flex';
    elements.authUserChip.classList.remove('hidden');
    elements.authUserLabel.textContent = `${auth.user.organization_name || 'Demo User'} · ${auth.user.role}`;
  } else {
    elements.authSigninWidget.style.display = 'flex';
    elements.authUserChip.style.display = 'none';
    elements.authUserChip.classList.add('hidden');
  }
}

async function handleDemoLogin() {
  const mobile = elements.demoUserSelect.value;
  if (!mobile) {
    showToast('Pick a demo account to sign in.', 'error');
    return;
  }

  elements.btnDemoLogin.disabled = true;
  elements.btnDemoLogin.textContent = 'Signing in...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile_number: mobile, password: DEMO_PASSWORD }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Demo sign-in failed');
    }

    setAuthSession(body.data.token, body.data.user);
    showToast(`Signed in as ${body.data.user.organization_name || body.data.user.role} (${body.data.user.role}).`);
    if (state.activeTab === 'payouts') {
      loadPayouts();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnDemoLogin.disabled = false;
    elements.btnDemoLogin.textContent = 'Sign In';
  }
}

// ============================================================================
// Payouts Ledger Tab (seller history / ULB audit)
// ============================================================================
async function loadPayouts() {
  if (!auth.token || !auth.user) {
    elements.payoutsContent.innerHTML = '<div class="empty-state">Sign in to view your payout ledger history.</div>';
    return;
  }

  const isUlb = auth.user.role === 'ULB';
  const status = elements.payoutStatusFilter.value;
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const endpoint = isUlb ? `${API_BASE}/payouts/all?${params.toString()}` : `${API_BASE}/payouts?${params.toString()}`;

  elements.payoutsContent.innerHTML = `
    <div class="loader-box">
      <div class="spinner"></div>
      <span>Loading payouts ledger...</span>
    </div>
  `;

  try {
    const res = await apiFetch(endpoint);
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to load payouts');
    }

    const payouts = body.data.payouts || [];
    if (payouts.length === 0) {
      elements.payoutsContent.innerHTML = `
        ${isUlb ? '' : renderSellerSummary(body.data)}
        <div class="empty-state">No payout ledger entries yet. Settle an auction to populate the ledger.</div>
      `;
      return;
    }

    const rows = payouts
      .map(
        (p) => `
        <tr>
          <td style="white-space: nowrap;">${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
          <td class="font-mono" style="font-size: 0.72rem; color: #b45309;">${p.mstc_lot_no || p.listing_id.slice(0, 8)}</td>
          <td>${p.material_grade}</td>
          <td style="text-align: right;">₹${p.gross_amount_inr.toLocaleString('en-IN')}</td>
          <td style="text-align: right; color: #166534; font-weight: 600;">₹${p.seller_net_amount_inr.toLocaleString('en-IN')}</td>
          <td style="text-align: right; color: #b45309;">₹${p.platform_fee_inr.toLocaleString('en-IN')}</td>
          <td style="text-align: right; color: #d97706;">₹${p.welfare_levy_inr.toLocaleString('en-IN')}</td>
          <td class="font-mono" style="font-size: 0.72rem;">${p.bank_rrn}</td>
          <td><span class="status-tag ${p.status === 'SUCCESS' ? 'SOLD' : 'OPEN'}">${p.status}</span></td>
          <td>
            ${
              isUlb && p.status === 'SUCCESS'
                ? `<button class="btn btn-secondary btn-sm btn-reverse-payout" data-id="${p.payout_id}" style="font-size: 0.72rem; padding: 0.25rem 0.55rem;">Reverse</button>`
                : ''
            }
          </td>
        </tr>
      `
      )
      .join('');

    elements.payoutsContent.innerHTML = `
      ${isUlb ? '<div class="text-muted" style="font-size: 0.78rem; margin-bottom: 0.75rem;">ULB Audit Mode — full ledger visibility with reversal authority.</div>' : renderSellerSummary(body.data)}
      <div style="overflow-x: auto;">
        <table class="receipt-table">
          <thead>
            <tr>
              <th>Date</th><th>Lot</th><th>Material</th>
              <th style="text-align: right;">Gross</th>
              <th style="text-align: right;">Seller Net</th>
              <th style="text-align: right;">Platform</th>
              <th style="text-align: right;">Welfare</th>
              <th>Bank RRN</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('.btn-reverse-payout').forEach((btn) => {
      btn.addEventListener('click', (e) => handleReversePayout(e.currentTarget.getAttribute('data-id')));
    });
  } catch (err) {
    elements.payoutsContent.innerHTML = `<div class="empty-state text-muted">Error loading payouts: ${err.message}</div>`;
  }
}

function renderSellerSummary(data) {
  if (typeof data.total_gross_inr !== 'number') return '';
  return `
    <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem;">
      <div>
        <span class="text-muted" style="display: block; font-size: 0.72rem;">TOTAL SETTLED (GROSS)</span>
        <strong style="color: #1f1b17; font-size: 1.2rem;">₹${data.total_gross_inr.toLocaleString('en-IN')}</strong>
      </div>
      <div>
        <span class="text-muted" style="display: block; font-size: 0.72rem;">TOTAL RECEIVED (NET)</span>
        <strong class="text-emerald" style="font-size: 1.2rem;">₹${data.total_net_inr.toLocaleString('en-IN')}</strong>
      </div>
      <div>
        <span class="text-muted" style="display: block; font-size: 0.72rem;">LEDGER ENTRIES</span>
        <strong style="color: #1f1b17; font-size: 1.2rem;">${data.total}</strong>
      </div>
    </div>
  `;
}

async function handleReversePayout(payoutId) {
  if (!confirm('Reverse this payout? The ledger row will be marked REVERSED and a compensating escrow entry recorded.')) {
    return;
  }

  try {
    const res = await apiFetch(`${API_BASE}/payouts/${payoutId}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to reverse payout');
    }

    showToast('Payout reversed with compensating escrow entry recorded.');
    loadPayouts();
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
  if (tabName === 'payouts') {
    loadPayouts();
  }
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

  // Create Listing Modal events
  elements.btnCreateListing?.addEventListener('click', () => elements.modalCreateListing.classList.remove('hidden'));
  elements.modalClose?.addEventListener('click', () => elements.modalCreateListing.classList.add('hidden'));
  elements.modalCancel?.addEventListener('click', () => elements.modalCreateListing.classList.add('hidden'));
  elements.formCreateListing?.addEventListener('submit', handleCreateListing);

  // Seller UPI Onboarding Modal events
  elements.btnRegisterSeller?.addEventListener('click', () => elements.modalRegisterSeller.classList.remove('hidden'));
  elements.modalSellerClose?.addEventListener('click', () => elements.modalRegisterSeller.classList.add('hidden'));
  elements.modalSellerCancel?.addEventListener('click', () => elements.modalRegisterSeller.classList.add('hidden'));
  elements.btnVerifyVpa?.addEventListener('click', handleVerifyVpa);
  elements.formRegisterSeller?.addEventListener('submit', handleRegisterSellerSubmit);

  // Recycler Payment Rails Modal events
  elements.btnPreviewEscrow?.addEventListener('click', handlePreviewEscrowRails);
  elements.modalPaymentClose?.addEventListener('click', () => elements.modalPaymentRails.classList.add('hidden'));
  elements.modalPaymentDone?.addEventListener('click', () => elements.modalPaymentRails.classList.add('hidden'));
  elements.btnConfirmDeposit?.addEventListener('click', handleConfirmDeposit);

  // Demo Sign-In events
  elements.btnDemoLogin?.addEventListener('click', handleDemoLogin);
  elements.btnDemoLogout?.addEventListener('click', clearAuthSession);

  // Payouts Ledger events
  elements.payoutStatusFilter?.addEventListener('change', loadPayouts);
  elements.btnRefreshPayouts?.addEventListener('click', loadPayouts);

  // Settlement Payout Receipt Modal events
  elements.modalReceiptClose?.addEventListener('click', () => elements.modalSettlementReceipt.classList.add('hidden'));
  elements.modalReceiptDone?.addEventListener('click', () => {
    elements.modalSettlementReceipt.classList.add('hidden');
    if (elements.eprHashInput.value) {
      switchTab('epr');
      handleVerifyHash();
    }
  });

  // Restore persisted demo session and initial loads
  loadAuth();
  renderAuthState();
  checkHealth();
  fetchListings();
}

document.addEventListener('DOMContentLoaded', init);
