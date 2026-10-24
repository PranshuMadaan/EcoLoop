// EcoLoop Frontend Client Controller
const API_BASE = '/api/v1';

// State Store
const state = {
  activeTab: 'marketplace',
  listings: [],
  selectedListing: null,
  lastVerifiedVpa: null,
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
  recentEprList: document.getElementById('recent-epr-list'),
  btnRefreshEpr: document.getElementById('btn-refresh-epr'),

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
  btnOpenRazorpayVerify: document.getElementById('btn-open-razorpay-verify'),
  vpaVerificationFeedback: document.getElementById('vpa-verification-feedback'),

  // Modal: Razorpay Verification Module
  modalRazorpayVerify: document.getElementById('modal-razorpay-verify'),
  modalRazorpayClose: document.getElementById('modal-razorpay-close'),
  modalRazorpayDismiss: document.getElementById('modal-razorpay-dismiss'),
  rzpTargetOrg: document.getElementById('rzp-target-org'),
  rzpTargetMobile: document.getElementById('rzp-target-mobile'),
  rzpTabBtnCheckout: document.getElementById('rzp-tab-btn-checkout'),
  rzpTabBtnVpa: document.getElementById('rzp-tab-btn-vpa'),
  rzpTabBtnBank: document.getElementById('rzp-tab-btn-bank'),
  rzpPaneCheckout: document.getElementById('rzp-pane-checkout'),
  rzpPaneVpa: document.getElementById('rzp-pane-vpa'),
  rzpPaneBank: document.getElementById('rzp-pane-bank'),
  btnRzpLaunchCheckout: document.getElementById('btn-rzp-launch-checkout'),
  btnRzpVerifyVpa: document.getElementById('btn-rzp-verify-vpa'),
  btnRzpVerifyAccount: document.getElementById('btn-rzp-verify-account'),
  rzpInputVpa: document.getElementById('rzp-input-vpa'),
  rzpInputAcc: document.getElementById('rzp-input-acc'),
  rzpInputIfsc: document.getElementById('rzp-input-ifsc'),
  rzpVerificationResult: document.getElementById('rzp-verification-result'),

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
  modalReceiptVerifyLedger: document.getElementById('modal-receipt-verify-ledger'),
  settlementReceiptContent: document.getElementById('settlement-receipt-content'),

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
                ? `<div style="font-size: 0.72rem; font-family: monospace; color: #38bdf8; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.25); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 0.4rem;">🏛️ ${item.mstc_lot_no}</div>`
                : ''
            }
            ${
              item.origin_location
                ? `<div style="font-size: 0.78rem; color: #94a3b8; margin: 0.35rem 0 0.5rem 0;">📍 ${item.origin_location}</div>`
                : ''
            }

            <div class="listing-meta-row" style="margin-top: 0.4rem;">
              <span class="text-muted">Available Weight:</span>
              <span class="listing-weight">${(item.weight_kg / 1000).toFixed(1)} MT <span style="font-size: 0.75rem; color: #94a3b8;">(${item.weight_kg.toLocaleString()} kg)</span></span>
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
                <strong style="color: #fff; font-size: 0.85rem; display: block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.seller.organization_name || item.seller.role}">
                  ${item.seller.organization_name || item.seller.role}
                </strong>
                <div style="font-size: 0.72rem; color: #10b981;">
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
    <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.3); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="text-muted" style="font-size: 0.8rem;">DISPATCH STATUS</span>
        <span class="status-tag SOLD" style="background: rgba(16,185,129,0.2); color: #10b981; font-weight: 600;">UPI INSTANT SETTLED</span>
      </div>
      <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: baseline;">
        <span style="color: #fff; font-size: 0.9rem;">Gross Auction Settlement:</span>
        <strong style="color: #10b981; font-size: 1.35rem;">₹${Number(payout.gross_amount).toLocaleString('en-IN')}</strong>
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
            <strong style="color: #fff;">Seller Net Proceeds</strong>
            <div class="text-muted" style="font-size: 0.72rem;">Beneficiary: ${payout.beneficiary_name} (${payout.destination_upi_vpa})</div>
          </td>
          <td style="text-align: right; color: #10b981; font-weight: 600;">98.5%</td>
          <td style="text-align: right; font-weight: 700; color: #10b981;">₹${Number(payout.seller_net_payout).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>
            <strong style="color: #fff;">Platform Clearing Fee</strong>
            <div class="text-muted" style="font-size: 0.72rem;">Escrow processing, KYC & smart contracts</div>
          </td>
          <td style="text-align: right; color: #38bdf8;">1.0%</td>
          <td style="text-align: right; font-weight: 600; color: #38bdf8;">₹${Number(payout.platform_commission).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>
            <strong style="color: #fff;">Informal Waste Picker Welfare</strong>
            <div class="text-muted" style="font-size: 0.72rem;">Health micro-insurance & safety equipment pool</div>
          </td>
          <td style="text-align: right; color: #fbbf24;">0.5%</td>
          <td style="text-align: right; font-weight: 600; color: #fbbf24;">₹${Number(payout.picker_welfare_fund).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 1rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.75rem; font-family: monospace;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span class="text-muted">BANK RRN:</span>
        <span style="color: #fff;">${payout.bank_rrn}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span class="text-muted">GATEWAY TXN ID:</span>
        <span style="color: #fff;">${payout.gateway_transaction_id}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">CPCB EPR LEDGER HASH:</span>
        <span style="color: #38bdf8; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${epr_token ? epr_token.cpcb_certificate_hash : 'VERIFIED'}</span>
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
    const mobileNum = elements.sellerRegMobile?.value?.trim() || '';
    const res = await fetch(`${API_BASE}/auth/verify-vpa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_vpa: vpa, vpa, organization_name: orgName, mobile_number: mobileNum }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to verify UPI VPA');
    }

    state.lastVerifiedVpa = body.data;

    const matchInfo = body.data.name_match || {};
    const matchScore = typeof matchInfo.score === 'number' ? matchInfo.score : 100;
    const isMismatch = matchInfo.status === 'MISMATCH';
    const isPartial = matchInfo.status === 'PARTIAL_MATCH';

    let matchBadgeHtml = '';
    if (isMismatch) {
      matchBadgeHtml = `<span style="background: rgba(244,63,94,0.15); color: #f43f5e; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; border: 1px solid rgba(244,63,94,0.3);">⚠️ Name Mismatch (${matchScore}%)</span>`;
    } else if (isPartial) {
      matchBadgeHtml = `<span style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; border: 1px solid rgba(245,158,11,0.3);">⚡ Partial Match (${matchScore}%)</span>`;
    } else {
      matchBadgeHtml = `<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; border: 1px solid rgba(16,185,129,0.3);">✓ ${matchScore}% Legal Match</span>`;
    }

    const providerLabel = body.data.provider ? String(body.data.provider).toUpperCase() : 'NPCI';
    const borderColor = isMismatch ? 'rgba(244,63,94,0.5)' : 'rgba(16,185,129,0.4)';
    const bgColor = isMismatch ? 'rgba(244,63,94,0.06)' : 'rgba(16,185,129,0.06)';

    elements.vpaVerificationFeedback.className = 'penny-drop-card';
    elements.vpaVerificationFeedback.style.borderColor = borderColor;
    elements.vpaVerificationFeedback.style.background = bgColor;
    elements.vpaVerificationFeedback.innerHTML = `
      <div class="penny-drop-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isMismatch ? '#f43f5e' : '#10b981'}" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <strong style="color: ${isMismatch ? '#f43f5e' : '#10b981'}; font-size: 0.85rem;">
            ${isMismatch ? 'Bank Account Found (Beneficiary Warning)' : 'Bank Account Verified via ' + providerLabel}
          </strong>
        </div>
        ${matchBadgeHtml}
      </div>
      <div style="font-size: 0.82rem; margin-top: 0.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div>
          <span class="text-muted" style="display: block; font-size: 0.7rem;">LEGAL BANK ACCOUNT HOLDER</span>
          <strong style="color: #fff;">${body.data.account_holder_name}</strong>
        </div>
        <div>
          <span class="text-muted" style="display: block; font-size: 0.7rem;">ISSUING BANK / IFSC</span>
          <span style="color: #38bdf8; font-weight: 600;">${body.data.bank_name} (${body.data.ifsc_prefix || 'NPCI'})</span>
        </div>
      </div>
      ${isMismatch ? `
        <div style="margin-top: 0.4rem; padding: 0.4rem 0.6rem; border-radius: 4px; background: rgba(244,63,94,0.1); color: #fca5a5; font-size: 0.73rem;">
          <strong>Compliance Notice:</strong> Account holder "${body.data.account_holder_name}" differs from organization. Make sure this is an authorized business bank account.
        </div>
      ` : ''}
      <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem; display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.4rem;">
        <span>Ref: <code class="font-mono text-cyan">${body.data.reference_id}</code></span>
        <span>Gateway: <span style="color: #38bdf8; font-weight: 600;">${providerLabel} Active</span></span>
      </div>
    `;
    elements.vpaVerificationFeedback.classList.remove('hidden');

    if (isMismatch) {
      showToast(`Warning: Bank name "${body.data.account_holder_name}" does not match organization.`, 'error');
    } else {
      showToast(`Bank Account Verified: ${body.data.account_holder_name} (${body.data.bank_name})`);
    }
  } catch (err) {
    elements.vpaVerificationFeedback.className = 'penny-drop-card';
    elements.vpaVerificationFeedback.style.borderColor = 'rgba(244,63,94,0.4)';
    elements.vpaVerificationFeedback.style.background = 'rgba(244,63,94,0.06)';
    elements.vpaVerificationFeedback.innerHTML = `
      <div style="color: #f43f5e; font-weight: 600; font-size: 0.85rem;">
        ❌ Bank Verification Failed: ${err.message}
      </div>
      <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.3rem;">
        NPCI central switch could not validate this UPI ID. Please check the spelling or bank handle.
      </div>
    `;
    elements.vpaVerificationFeedback.classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    if (elements.btnVerifyVpa) {
      elements.btnVerifyVpa.disabled = false;
      elements.btnVerifyVpa.textContent = 'Verify Bank';
    }
  }
}

// ============================================================================
// Official Razorpay Verification Module Handlers
// ============================================================================
function openRazorpayVerificationModule() {
  const orgName = elements.sellerRegOrg?.value?.trim() || 'EcoLoop Aggregator';
  const mobile = elements.sellerRegMobile?.value?.trim() || '+919876543210';
  const currentVpa = elements.sellerRegVpa?.value?.trim() || '';

  if (elements.rzpTargetOrg) elements.rzpTargetOrg.textContent = orgName;
  if (elements.rzpTargetMobile) elements.rzpTargetMobile.textContent = mobile;
  if (elements.rzpInputVpa) elements.rzpInputVpa.value = currentVpa || 'rohini.dwcc@oksbi';

  switchRazorpayTab('checkout');
  if (elements.rzpVerificationResult) {
    elements.rzpVerificationResult.classList.add('hidden');
    elements.rzpVerificationResult.innerHTML = '';
  }

  elements.modalRazorpayVerify?.classList.remove('hidden');
}

function closeRazorpayVerificationModule() {
  elements.modalRazorpayVerify?.classList.add('hidden');
}

function switchRazorpayTab(tab) {
  const tabs = ['checkout', 'vpa', 'bank'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`rzp-tab-btn-${t}`);
    const pane = document.getElementById(`rzp-pane-${t}`);
    if (t === tab) {
      btn?.classList.add('active');
      if (btn) {
        btn.style.background = 'rgba(51,149,255,0.2)';
        btn.style.color = '#60a5fa';
      }
      pane?.classList.remove('hidden');
    } else {
      btn?.classList.remove('active');
      if (btn) {
        btn.style.background = 'transparent';
        btn.style.color = '#94a3b8';
      }
      pane?.classList.add('hidden');
    }
  });
}

function renderRazorpayResult(data) {
  state.lastVerifiedVpa = data;
  const matchInfo = data.name_match || {};
  const matchScore = typeof matchInfo.score === 'number' ? matchInfo.score : 100;
  const isMismatch = matchInfo.status === 'MISMATCH';

  elements.rzpVerificationResult.className = 'penny-drop-card';
  elements.rzpVerificationResult.style.borderColor = isMismatch ? 'rgba(244,63,94,0.5)' : 'rgba(51,149,255,0.5)';
  elements.rzpVerificationResult.style.background = isMismatch ? 'rgba(244,63,94,0.08)' : 'rgba(12,35,64,0.7)';
  elements.rzpVerificationResult.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem; margin-bottom: 0.6rem;">
      <div style="display: flex; align-items: center; gap: 0.4rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isMismatch ? '#f43f5e' : '#3395ff'}"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <strong style="color: ${isMismatch ? '#f43f5e' : '#60a5fa'}; font-size: 0.85rem;">
          ${isMismatch ? 'Razorpay Warning: Beneficiary Mismatch' : 'Razorpay Verified Beneficiary'}
        </strong>
      </div>
      <span style="font-size: 0.72rem; font-weight: 700; color: ${isMismatch ? '#f43f5e' : '#10b981'}; background: ${isMismatch ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)'}; padding: 2px 8px; border-radius: 4px;">
        ${matchScore}% Match
      </span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem;">
      <div>
        <span class="text-muted" style="display: block; font-size: 0.7rem;">LEGAL BENEFICIARY</span>
        <strong style="color: #fff;">${data.account_holder_name}</strong>
      </div>
      <div>
        <span class="text-muted" style="display: block; font-size: 0.7rem;">ISSUING BANK / IFSC</span>
        <span style="color: #38bdf8; font-weight: 600;">${data.bank_name} (${data.ifsc_prefix || 'RZP'})</span>
      </div>
    </div>
    <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem; display: flex; justify-content: space-between;">
      <span>Ref: <code class="font-mono text-cyan">${data.reference_id}</code></span>
      <span>NPCI RRN: <code class="font-mono" style="color: #60a5fa;">${data.npci_rrn || '429618293019'}</code></span>
    </div>
    <div style="margin-top: 0.75rem;">
      <button type="button" class="btn btn-primary" id="btn-apply-rzp-to-onboarding" style="width: 100%; justify-content: center; background: #10b981; border: none; font-size: 0.82rem; padding: 0.55rem; font-weight: 600;">
        ✓ Apply to Seller Onboarding Form
      </button>
    </div>
  `;
  elements.rzpVerificationResult.classList.remove('hidden');

  document.getElementById('btn-apply-rzp-to-onboarding')?.addEventListener('click', () => {
    if (data.vpa) elements.sellerRegVpa.value = data.vpa;
    applyVerifiedVpaFeedback(data);
    closeRazorpayVerificationModule();
    showToast(`Bank Account Linked: ${data.account_holder_name} (${data.bank_name})`);
  });
}

function applyVerifiedVpaFeedback(data) {
  state.lastVerifiedVpa = data;
  const matchInfo = data.name_match || {};
  const matchScore = typeof matchInfo.score === 'number' ? matchInfo.score : 100;
  const isMismatch = matchInfo.status === 'MISMATCH';
  const providerLabel = data.provider ? String(data.provider).toUpperCase() : 'RAZORPAY';

  elements.vpaVerificationFeedback.className = 'penny-drop-card';
  elements.vpaVerificationFeedback.style.borderColor = isMismatch ? 'rgba(244,63,94,0.5)' : 'rgba(51,149,255,0.4)';
  elements.vpaVerificationFeedback.style.background = isMismatch ? 'rgba(244,63,94,0.06)' : 'rgba(12,35,64,0.4)';
  elements.vpaVerificationFeedback.innerHTML = `
    <div class="penny-drop-header" style="display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isMismatch ? '#f43f5e' : '#3395ff'}"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <strong style="color: ${isMismatch ? '#f43f5e' : '#60a5fa'}; font-size: 0.85rem;">
          Verified via Razorpay Gateway (${providerLabel})
        </strong>
      </div>
      <span style="background: rgba(51,149,255,0.15); color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; border: 1px solid rgba(51,149,255,0.3);">
        ✓ ${matchScore}% Legal Match
      </span>
    </div>
    <div style="font-size: 0.82rem; margin-top: 0.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
      <div>
        <span class="text-muted" style="display: block; font-size: 0.7rem;">LEGAL BANK ACCOUNT HOLDER</span>
        <strong style="color: #fff;">${data.account_holder_name}</strong>
      </div>
      <div>
        <span class="text-muted" style="display: block; font-size: 0.7rem;">ISSUING BANK / IFSC</span>
        <span style="color: #38bdf8; font-weight: 600;">${data.bank_name} (${data.ifsc_prefix || 'RZP'})</span>
      </div>
    </div>
    <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem; display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.4rem;">
      <span>Ref: <code class="font-mono text-cyan">${data.reference_id}</code></span>
      <span>Gateway: <span style="color: #60a5fa; font-weight: 600;">Razorpay Verified</span></span>
    </div>
  `;
  elements.vpaVerificationFeedback.classList.remove('hidden');
}

async function handleLaunchRazorpayCheckout() {
  const orgName = elements.sellerRegOrg?.value?.trim() || 'EcoLoop Seller';
  const mobileNum = elements.sellerRegMobile?.value?.trim() || '+919876543210';
  const targetVpa = elements.sellerRegVpa?.value?.trim() || elements.rzpInputVpa?.value?.trim() || '';

  elements.btnRzpLaunchCheckout.disabled = true;
  elements.btnRzpLaunchCheckout.textContent = 'Opening Razorpay Window...';

  try {
    const res = await fetch(`${API_BASE}/auth/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_inr: 1.00,
        organization_name: orgName,
        mobile_number: mobileNum,
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to initialize Razorpay verification session');
    }

    const orderData = body.data;

    if (typeof window.Razorpay === 'function') {
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EcoLoop Clearing & Escrow',
        description: 'Bank Account Authorization (Refundable ₹1 Penny-Drop)',
        order_id: orderData.orderId,
        prefill: {
          name: orgName,
          contact: mobileNum,
          vpa: targetVpa || undefined,
        },
        theme: {
          color: '#0c2340',
        },
        handler: async function (response) {
          showToast('Razorpay Authorization Successful! Linking bank...');
          await confirmRazorpayAuthorization({
            paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
            orderId: response.razorpay_order_id || orderData.orderId,
            vpa: targetVpa || `${mobileNum.replace(/[^0-9]/g, '').slice(-10)}@razorpay`,
            orgName,
            mobileNum,
          });
        },
        modal: {
          ondismiss: function () {
            showToast('Razorpay checkout popup closed by user.', 'error');
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (err) {
        showToast(`Authorization failed: ${err.error?.description || 'Declined'}`, 'error');
      });
      rzpInstance.open();
    } else {
      showToast('Razorpay SDK loaded via local bridge. Authorizing ₹1.00 penny drop...');
      await confirmRazorpayAuthorization({
        paymentId: `pay_sim_${Date.now()}`,
        orderId: orderData.orderId,
        vpa: targetVpa || 'ecoloop.partner@okaxis',
        orgName,
        mobileNum,
      });
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnRzpLaunchCheckout.disabled = false;
    elements.btnRzpLaunchCheckout.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      Launch Razorpay Checkout Window
    `;
  }
}

async function confirmRazorpayAuthorization({ paymentId, orderId, vpa, orgName, mobileNum }) {
  try {
    const res = await fetch(`${API_BASE}/auth/razorpay/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        upi_vpa: vpa,
        organization_name: orgName,
        mobile_number: mobileNum,
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to confirm Razorpay authorization');
    }
    renderRazorpayResult(body.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRazorpayVpaLookup() {
  const vpa = elements.rzpInputVpa?.value?.trim();
  if (!vpa) {
    showToast('Please enter a UPI VPA to verify.', 'error');
    return;
  }
  const orgName = elements.sellerRegOrg?.value?.trim() || '';
  const mobileNum = elements.sellerRegMobile?.value?.trim() || '';

  elements.btnRzpVerifyVpa.disabled = true;
  elements.btnRzpVerifyVpa.textContent = 'Querying Razorpay...';

  try {
    const res = await fetch(`${API_BASE}/auth/verify-vpa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_vpa: vpa, organization_name: orgName, mobile_number: mobileNum, provider: 'razorpay' }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'UPI verification failed');
    }
    renderRazorpayResult(body.data);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnRzpVerifyVpa.disabled = false;
    elements.btnRzpVerifyVpa.textContent = 'Query NPCI Directory via Razorpay';
  }
}

async function handleRazorpayPennyDrop() {
  const accountNumber = elements.rzpInputAcc?.value?.trim();
  const ifsc = elements.rzpInputIfsc?.value?.trim();
  if (!accountNumber || !ifsc) {
    showToast('Please enter both Account Number and IFSC code.', 'error');
    return;
  }
  const orgName = elements.sellerRegOrg?.value?.trim() || '';

  elements.btnRzpVerifyAccount.disabled = true;
  elements.btnRzpVerifyAccount.textContent = 'Executing Penny Drop...';

  try {
    const res = await fetch(`${API_BASE}/auth/verify-bank-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: accountNumber, ifsc, organization_name: orgName }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Penny drop failed');
    }
    renderRazorpayResult(body.data);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnRzpVerifyAccount.disabled = false;
    elements.btnRzpVerifyAccount.textContent = 'Execute ₹1.00 IMPS Penny Drop via RazorpayX';
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
    showToast(`Seller onboarded successfully to Neon DB! UPI VPA ${upi_vpa} linked.`);

    await loadSellersFromDatabase();

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

  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: bidAmount }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Failed to generate payment intent');
    }

    const intent = body.data;
    elements.escrowUpiIntentLink.href = intent.upi_intent_uri;
    elements.escrowModalQrImg.src = intent.qr_code_url;
    elements.escrowVanNumber.textContent = intent.virtual_account.account_number;

    elements.modalPaymentRails.classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleVerifyHash() {
  const hash = elements.eprHashInput ? elements.eprHashInput.value.trim() : '';
  if (!hash) {
    showToast('Please enter a 64-character SHA-256 hash.', 'error');
    return;
  }

  // Update button state
  if (elements.btnVerifyHash) {
    elements.btnVerifyHash.disabled = true;
    elements.btnVerifyHash.innerHTML = `
      <div class="spinner" style="width: 14px; height: 14px; border-width: 2px; margin-right: 0.35rem;"></div>
      Verifying...
    `;
  }

  elements.eprVerificationResult.className = 'epr-result-card';
  elements.eprVerificationResult.classList.remove('hidden');
  elements.eprVerificationResult.innerHTML = `
    <div class="loader-box" style="padding: 2.5rem 1rem;">
      <div class="spinner"></div>
      <span style="margin-top: 0.75rem; color: #a1a1aa; font-size: 0.9rem;">Querying Central Pollution Control Board (CPCB) Ledger...</span>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/epr/verify/${encodeURIComponent(hash)}`);
    const body = await res.json();

    if (!res.ok || !body.success) {
      elements.eprVerificationResult.className = 'epr-result-card fraud';
      elements.eprVerificationResult.innerHTML = `
        <div class="certificate-header">
          <div>
            <h3 style="color: #f87171; margin: 0; font-size: 1.15rem;">❌ Unverified / Fraudulent Certificate</h3>
            <p class="text-muted" style="font-size: 0.8rem; margin: 0.25rem 0 0;">Central Pollution Control Board (CPCB) Statutory Audit</p>
          </div>
          <span class="cert-badge badge-fraud">NOT REGISTERED</span>
        </div>

        <div style="background: rgba(0, 0, 0, 0.35); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid rgba(244, 63, 94, 0.3); margin-bottom: 1.25rem;">
          <p style="color: #fca5a5; font-size: 0.9rem; font-weight: 500; margin: 0 0 0.5rem;">
            ${body.error || 'The submitted cryptographic hash was not found on the immutable national EPR ledger.'}
          </p>
          <p class="text-muted" style="font-size: 0.8rem; margin: 0; line-height: 1.5;">
            This credit has not been issued through an atomic Escrow auction settlement or was generated by an unaccredited recycler without MoEFCC statutory clearance.
          </p>
        </div>

        <div style="background: rgba(0, 0, 0, 0.45); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.25rem;">
          <span class="text-muted" style="font-size: 0.7rem; text-transform: uppercase;">QUERY HASH SEARCHED</span>
          <code class="font-mono" style="color: #f87171; font-size: 0.8rem; word-break: break-all;">${hash}</code>
        </div>
      `;
      return;
    }

    const cert = body.data;
    const dateFormatted = new Date(cert.issue_timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = new Date(cert.issue_timestamp).toLocaleTimeString('en-IN');

    elements.eprVerificationResult.className = 'epr-result-card';
    elements.eprVerificationResult.innerHTML = `
      <div class="certificate-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h3 style="color: #fff; margin: 0; font-size: 1.2rem;">CPCB Verified Recycling Credit</h3>
          </div>
          <p class="text-muted" style="font-size: 0.8rem; margin: 0;">Ministry of Environment, Forest and Climate Change (MoEFCC) • National EPR Registry</p>
        </div>
        <span class="cert-badge">✓ OFFICIALLY REGISTERED</span>
      </div>

      <!-- Highlight Banner -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; padding: 1.15rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md);">
        <div>
          <span class="cert-meta-label">CERTIFIED RECYCLING VOLUME</span>
          <strong class="text-emerald" style="font-size: 1.35rem; display: block;">${cert.verified_weight_mt} MT</strong>
          <span class="text-muted" style="font-size: 0.75rem;">(${(cert.listing_weight_kg || cert.verified_weight_mt * 1000).toLocaleString('en-IN')} kg net)</span>
        </div>
        <div>
          <span class="cert-meta-label">STATUTORY MATERIAL GRADE</span>
          <strong style="color: #fff; font-size: 1.35rem; display: block;">${cert.material_grade}</strong>
          <span class="text-muted" style="font-size: 0.75rem;">CPCB Schedule II Accredited</span>
        </div>
        <div>
          <span class="cert-meta-label">SETTLEMENT TIMESTAMP</span>
          <strong style="color: #fff; font-size: 0.95rem; display: block; margin-top: 0.35rem;">${dateFormatted}</strong>
          <span class="text-muted" style="font-size: 0.75rem;">${timeFormatted} IST</span>
        </div>
      </div>

      <!-- Provenance Grid -->
      <div class="cert-meta-grid">
        <div class="cert-meta-item">
          <span class="cert-meta-label">ACCREDITED RECYCLER FACILITY</span>
          <div class="cert-meta-value">${cert.recycler_org || 'Certified Recycler'}</div>
          <span class="text-muted font-mono" style="font-size: 0.72rem; display: block; margin-top: 0.25rem;">Reg: ${cert.recycler_cpcb_reg || 'CPCB/EPR/2022/VALID'}</span>
        </div>
        <div class="cert-meta-item">
          <span class="cert-meta-label">ORIGIN AGGREGATION HUB (SELLER)</span>
          <div class="cert-meta-value">${cert.seller_org || 'Authorized DWCC Center'}</div>
          <span class="text-muted font-mono" style="font-size: 0.72rem; display: block; margin-top: 0.25rem;">Traceable Segregation Origin</span>
        </div>
        <div class="cert-meta-item">
          <span class="cert-meta-label">ASSOCIATED AUCTION LOT ID</span>
          <div class="cert-meta-value font-mono text-muted" style="font-size: 0.78rem;">${cert.listing_id}</div>
        </div>
        <div class="cert-meta-item">
          <span class="cert-meta-label">NATIONAL TOKEN IDENTIFIER</span>
          <div class="cert-meta-value font-mono text-muted" style="font-size: 0.78rem;">${cert.token_id}</div>
        </div>
      </div>

      <!-- Payout Audit Trail -->
      <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
          <span style="font-size: 0.75rem; color: #a1a1aa; font-weight: 600; text-transform: uppercase;">ESCROW LIQUIDATION AUDIT TRAIL</span>
          <span style="font-size: 0.7rem; color: #34d399; font-weight: 600;">● ATOMICALLY SETTLED</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; font-size: 0.8rem;">
          <div>
            <span class="text-muted" style="font-size: 0.7rem; display: block;">BANK UPI RRN:</span>
            <div class="font-mono" style="color: #fff;">${cert.payout_audit?.bank_rrn || 'RRN-VERIFIED'}</div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.7rem; display: block;">CLEARING TXN ID:</span>
            <div class="font-mono" style="color: #fff;">${cert.payout_audit?.transaction_id || 'UPI-ESCROW-SETTLED'}</div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.7rem; display: block;">PAYEE VPA:</span>
            <div class="font-mono" style="color: #fff;">${cert.payout_audit?.payee_vpa || 'Direct NPCI Settlement'}</div>
          </div>
        </div>
      </div>

      <!-- SHA-256 Ledger Hash Box -->
      <div style="background: rgba(0, 0, 0, 0.45); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px;">
          <span class="text-muted" style="display: block; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem;">CRYPTOGRAPHIC SHA-256 LEDGER HASH</span>
          <code class="font-mono text-cyan" id="verified-cert-hash-display" style="font-size: 0.8rem; word-break: break-all;">${cert.certificate_hash}</code>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-cert-hash" style="white-space: nowrap;">
          📋 Copy Hash
        </button>
      </div>
    `;

    document.getElementById('btn-copy-cert-hash')?.addEventListener('click', () => {
      navigator.clipboard.writeText(cert.certificate_hash);
      showToast('Ledger hash copied to clipboard!');
    });
  } catch (err) {
    elements.eprVerificationResult.className = 'epr-result-card fraud';
    elements.eprVerificationResult.innerHTML = `<p class="text-muted">Error querying ledger: ${err.message}</p>`;
  } finally {
    if (elements.btnVerifyHash) {
      elements.btnVerifyHash.disabled = false;
      elements.btnVerifyHash.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        Verify on Ledger
      `;
    }
  }
}

// ============================================================================
// Recent CPCB EPR Ledger Tokens Table
// ============================================================================
async function fetchRecentEprTokens() {
  if (!elements.recentEprList) return;

  try {
    const res = await fetch(`${API_BASE}/epr/tokens?limit=10`);
    const body = await res.json();

    if (!res.ok || !body.success || !body.data || !body.data.tokens || body.data.tokens.length === 0) {
      elements.recentEprList.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center;">
          <p class="text-muted" style="margin: 0 0 0.5rem;">No EPR compliance tokens minted yet on this ledger node.</p>
          <p style="font-size: 0.8rem; color: #71717a; margin: 0;">Finalize an auction from the Live Marketplace to mint the first token!</p>
        </div>
      `;
      return;
    }

    const rows = body.data.tokens.map((token) => {
      const dateStr = new Date(token.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = new Date(token.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const shortHash = token.cpcb_certificate_hash ? `${token.cpcb_certificate_hash.slice(0, 10)}...${token.cpcb_certificate_hash.slice(-8)}` : 'N/A';

      return `
        <tr>
          <td>
            <div style="font-weight: 500; color: #fff;">${dateStr}</div>
            <div class="text-muted" style="font-size: 0.72rem;">${timeStr}</div>
          </td>
          <td>
            <span class="badge badge-material">${token.material_grade}</span>
          </td>
          <td>
            <strong class="text-emerald">${token.verified_weight_mt} MT</strong>
            <span class="text-muted" style="display: block; font-size: 0.72rem;">(${(Number(token.listing_weight_kg) || token.verified_weight_mt * 1000).toLocaleString('en-IN')} kg)</span>
          </td>
          <td>
            <div style="color: #fff; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${token.recycler_org || 'Accredited Recycler'}">
              ${token.recycler_org || 'Accredited Recycler'}
            </div>
            <div class="text-muted font-mono" style="font-size: 0.7rem;">${token.recycler_cpcb_reg || 'CPCB/EPR/REG'}</div>
          </td>
          <td>
            <div style="color: #d4d4d8; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${token.seller_org || 'Authorized Hub'}">
              ${token.seller_org || 'Authorized Hub'}
            </div>
          </td>
          <td>
            <span class="ledger-hash-pill btn-quick-verify-hash" data-hash="${token.cpcb_certificate_hash}" title="Click to auto-verify this ledger token">
              ${shortHash}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
          </td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm btn-verify-row" data-hash="${token.cpcb_certificate_hash}" style="padding: 0.25rem 0.6rem; font-size: 0.72rem;">
              Verify
            </button>
          </td>
        </tr>
      `;
    }).join('');

    elements.recentEprList.innerHTML = `
      <table class="recent-epr-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Grade</th>
            <th>Weight</th>
            <th>Accredited Recycler</th>
            <th>Seller Origin Hub</th>
            <th>SHA-256 Ledger Hash</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    // Attach click listeners to all hash pills and verify buttons in table
    elements.recentEprList.querySelectorAll('.btn-quick-verify-hash, .btn-verify-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hash = btn.getAttribute('data-hash');
        if (hash && elements.eprHashInput) {
          elements.eprHashInput.value = hash;
          elements.eprHashInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          handleVerifyHash();
        }
      });
    });
  } catch (err) {
    elements.recentEprList.innerHTML = `
      <div class="empty-state" style="color: var(--rose-400); padding: 1.5rem; text-align: center;">
        Could not load recent ledger tokens: ${err.message}
      </div>
    `;
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
  if (tabName === 'epr') {
    fetchRecentEprTokens();
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
  elements.filterMaterial?.addEventListener('change', fetchListings);
  elements.filterStatus?.addEventListener('change', fetchListings);
  elements.btnRefreshListings?.addEventListener('click', fetchListings);

  // Auction events
  elements.bidListingSelect?.addEventListener('change', handleListingSelectChange);
  elements.formBid?.addEventListener('submit', handleBidSubmit);

  // EPR events
  elements.btnVerifyHash?.addEventListener('click', handleVerifyHash);
  elements.eprHashInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerifyHash();
    }
  });

  // Sample hash chips
  document.querySelectorAll('.epr-sample-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const hash = chip.getAttribute('data-hash');
      if (hash && elements.eprHashInput) {
        elements.eprHashInput.value = hash;
        handleVerifyHash();
      }
    });
  });

  // Refresh recent ledger tokens
  elements.btnRefreshEpr?.addEventListener('click', async () => {
    if (elements.btnRefreshEpr) {
      elements.btnRefreshEpr.disabled = true;
      elements.btnRefreshEpr.textContent = 'Refreshing...';
    }
    await fetchRecentEprTokens();
    if (elements.btnRefreshEpr) {
      elements.btnRefreshEpr.disabled = false;
      elements.btnRefreshEpr.textContent = '↻ Refresh Ledger';
    }
    showToast('CPCB Ledger updated with latest records.');
  });

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
  elements.btnOpenRazorpayVerify?.addEventListener('click', openRazorpayVerificationModule);
  elements.formRegisterSeller?.addEventListener('submit', handleRegisterSellerSubmit);

  // Razorpay Verification Module events
  elements.modalRazorpayClose?.addEventListener('click', closeRazorpayVerificationModule);
  elements.modalRazorpayDismiss?.addEventListener('click', closeRazorpayVerificationModule);
  elements.rzpTabBtnCheckout?.addEventListener('click', () => switchRazorpayTab('checkout'));
  elements.rzpTabBtnVpa?.addEventListener('click', () => switchRazorpayTab('vpa'));
  elements.rzpTabBtnBank?.addEventListener('click', () => switchRazorpayTab('bank'));
  elements.btnRzpLaunchCheckout?.addEventListener('click', handleLaunchRazorpayCheckout);
  elements.btnRzpVerifyVpa?.addEventListener('click', handleRazorpayVpaLookup);
  elements.btnRzpVerifyAccount?.addEventListener('click', handleRazorpayPennyDrop);

  document.querySelectorAll('.rzp-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const vpa = chip.getAttribute('data-vpa');
      if (vpa && elements.rzpInputVpa) {
        elements.rzpInputVpa.value = vpa;
      }
    });
  });

  // Recycler Payment Rails Modal events
  elements.btnPreviewEscrow?.addEventListener('click', handlePreviewEscrowRails);
  elements.modalPaymentClose?.addEventListener('click', () => elements.modalPaymentRails.classList.add('hidden'));
  elements.modalPaymentDone?.addEventListener('click', () => elements.modalPaymentRails.classList.add('hidden'));

  // Settlement Payout Receipt Modal events
  elements.modalReceiptClose?.addEventListener('click', () => elements.modalSettlementReceipt.classList.add('hidden'));
  elements.modalReceiptDone?.addEventListener('click', () => {
    elements.modalSettlementReceipt.classList.add('hidden');
  });
  elements.modalReceiptVerifyLedger?.addEventListener('click', () => {
    elements.modalSettlementReceipt.classList.add('hidden');
    switchTab('epr');
    handleVerifyHash();
  });

// ============================================================================
// Neon Database: Load Verified Sellers
// ============================================================================
async function loadSellersFromDatabase() {
  try {
    const res = await fetch(`${API_BASE}/users?limit=50`);
    const body = await res.json();
    if (res.ok && body.success && body.data.users) {
      const sellers = body.data.users.filter((u) => u.role === 'DWCC' || u.role === 'Picker');
      const createSellerSelect = document.getElementById('create-seller');
      if (createSellerSelect && sellers.length > 0) {
        createSellerSelect.innerHTML = sellers
          .map(
            (u) => `
          <option value="${u.user_id}">
            ${u.organization_name || u.role} (${u.role}${u.upi_vpa ? ` - ${u.upi_vpa}` : ''})
          </option>
        `
          )
          .join('');
      }
    }
  } catch (err) {
    console.warn('Could not load sellers from database:', err.message);
  }
}

// Initial loads
  checkHealth();
  fetchListings();
  loadSellersFromDatabase();
  fetchRecentEprTokens();
}

document.addEventListener('DOMContentLoaded', init);
