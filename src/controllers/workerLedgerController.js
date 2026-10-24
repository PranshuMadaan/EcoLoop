import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// CO2 offset estimation factors (kg CO2 saved per kg of recycled material)
// Source: EPA WARM Model estimates adapted for Indian conditions
const CO2_FACTORS = {
  PET_CLEAR: 1.53,
  HDPE_RIGID: 1.44,
  CORRUGATED_CARDBOARD: 3.12,
  LDPE_FILM: 1.76,
  FERROUS_METAL: 1.89,
  E_WASTE_MIXED: 4.20,
  PP_WOVEN: 1.38,
  ALUMINIUM: 9.13,
  GLASS_CLEAR: 0.31,
};

// Default factor for unknown materials
const DEFAULT_CO2_FACTOR = 1.50;

/**
 * Worker Earnings & Impact Ledger
 * GET /api/v1/iwl/worker/:id/ledger
 *
 * Calculates:
 *  - Total lifetime tonnage recycled (kg & metric tons)
 *  - Current month total earnings in INR (₹)
 *  - Estimated municipal carbon offsets (CO2 equivalent)
 *  - Recent payout receipts with UTR numbers
 *  - Material-wise breakdown
 *  - Monthly trend (last 6 months)
 */
export const getWorkerLedger = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid worker_id format. Must be a valid UUID.', 400);
    }

    // --- Worker Profile ---
    const profileRes = await query(
      `SELECT
         wp.worker_id, wp.full_name, wp.preferred_language,
         wp.municipal_id_number, wp.cooperative_affiliation,
         wp.kyc_status, wp.qr_code_hash, wp.created_at AS member_since,
         u.user_id, u.mobile_number, u.upi_vpa, u.upi_bank_account_holder
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.user_id
       WHERE wp.worker_id = $1;`,
      [id]
    );

    if (profileRes.rows.length === 0) {
      throw new AppError(`Worker profile with id '${id}' not found.`, 404);
    }

    const profile = profileRes.rows[0];

    // --- Lifetime Aggregate Stats ---
    const lifetimeRes = await query(
      `SELECT
         COUNT(*)::int AS total_weigh_ins,
         COALESCE(SUM(net_weight_kg), 0) AS total_weight_kg,
         COALESCE(SUM(total_payable_inr), 0) AS total_earnings_inr,
         COALESCE(SUM(CASE WHEN payout_status = 'PAID' THEN total_payable_inr ELSE 0 END), 0) AS total_paid_inr,
         COALESCE(SUM(CASE WHEN payout_status = 'PENDING' THEN total_payable_inr ELSE 0 END), 0) AS total_pending_inr,
         COALESCE(SUM(CASE WHEN payout_status = 'PAID' THEN 1 ELSE 0 END), 0)::int AS paid_count,
         COALESCE(SUM(CASE WHEN payout_status = 'PENDING' THEN 1 ELSE 0 END), 0)::int AS pending_count,
         MIN(created_at) AS first_weigh_in,
         MAX(created_at) AS last_weigh_in
       FROM worker_weigh_ins
       WHERE worker_id = $1;`,
      [id]
    );

    const lifetime = lifetimeRes.rows[0];

    // --- Current Month Stats ---
    const currentMonthRes = await query(
      `SELECT
         COUNT(*)::int AS month_weigh_ins,
         COALESCE(SUM(net_weight_kg), 0) AS month_weight_kg,
         COALESCE(SUM(total_payable_inr), 0) AS month_earnings_inr,
         COALESCE(SUM(CASE WHEN payout_status = 'PAID' THEN total_payable_inr ELSE 0 END), 0) AS month_paid_inr
       FROM worker_weigh_ins
       WHERE worker_id = $1
         AND created_at >= date_trunc('month', CURRENT_DATE);`,
      [id]
    );

    const currentMonth = currentMonthRes.rows[0];

    // --- Material-Wise Breakdown (for carbon offset calculation) ---
    const materialRes = await query(
      `SELECT
         material_grade,
         COUNT(*)::int AS weigh_in_count,
         COALESCE(SUM(net_weight_kg), 0) AS total_kg,
         COALESCE(SUM(total_payable_inr), 0) AS total_inr,
         COALESCE(AVG(applied_rate_per_kg), 0) AS avg_rate
       FROM worker_weigh_ins
       WHERE worker_id = $1
       GROUP BY material_grade
       ORDER BY total_kg DESC;`,
      [id]
    );

    // Calculate CO2 offsets per material
    let totalCO2Offset = 0;
    const materialBreakdown = materialRes.rows.map((m) => {
      const totalKg = Number(parseFloat(m.total_kg).toFixed(2));
      const factor = CO2_FACTORS[m.material_grade] || DEFAULT_CO2_FACTOR;
      const co2Kg = parseFloat((totalKg * factor).toFixed(2));
      totalCO2Offset += co2Kg;

      return {
        material_grade: m.material_grade,
        display_name: m.material_grade.replace(/_/g, ' '),
        weigh_in_count: m.weigh_in_count,
        total_kg: totalKg,
        total_inr: Number(parseFloat(m.total_inr).toFixed(2)),
        avg_rate_per_kg: Number(parseFloat(m.avg_rate).toFixed(2)),
        co2_offset_kg: co2Kg,
      };
    });

    // --- Monthly Trend (last 6 months) ---
    const trendRes = await query(
      `SELECT
         TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
         COUNT(*)::int AS weigh_ins,
         COALESCE(SUM(net_weight_kg), 0) AS weight_kg,
         COALESCE(SUM(total_payable_inr), 0) AS earnings_inr
       FROM worker_weigh_ins
       WHERE worker_id = $1
         AND created_at >= (CURRENT_DATE - INTERVAL '6 months')
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at) DESC;`,
      [id]
    );

    // --- Recent Payout Receipts (last 10) ---
    const receiptsRes = await query(
      `SELECT
         wpt.payout_id,
         wpt.weigh_in_id,
         wpt.amount_inr,
         wpt.seller_upi_vpa,
         wpt.razorpay_payout_id,
         wpt.utr_number,
         wpt.transaction_status,
         wpt.processed_at,
         wi.material_grade,
         wi.net_weight_kg,
         wi.applied_rate_per_kg
       FROM worker_payout_transactions wpt
       JOIN worker_weigh_ins wi ON wpt.weigh_in_id = wi.weigh_in_id
       WHERE wpt.worker_id = $1
       ORDER BY wpt.processed_at DESC
       LIMIT 10;`,
      [id]
    );

    // --- Calculate active days ---
    const totalWeightKg = Number(parseFloat(lifetime.total_weight_kg).toFixed(2));
    const totalWeightMt = Number((totalWeightKg / 1000).toFixed(3));

    return res.status(200).json({
      success: true,
      data: {
        worker: {
          worker_id: profile.worker_id,
          full_name: profile.full_name,
          cooperative: profile.cooperative_affiliation,
          municipal_id: profile.municipal_id_number,
          preferred_language: profile.preferred_language,
          kyc_status: profile.kyc_status,
          qr_code_hash: profile.qr_code_hash,
          mobile_number: profile.mobile_number,
          upi_vpa: profile.upi_vpa,
          member_since: profile.member_since,
        },
        lifetime_impact: {
          total_weigh_ins: lifetime.total_weigh_ins,
          total_weight_kg: totalWeightKg,
          total_weight_mt: totalWeightMt,
          total_earnings_inr: Number(parseFloat(lifetime.total_earnings_inr).toFixed(2)),
          total_paid_inr: Number(parseFloat(lifetime.total_paid_inr).toFixed(2)),
          total_pending_inr: Number(parseFloat(lifetime.total_pending_inr).toFixed(2)),
          paid_count: lifetime.paid_count,
          pending_count: lifetime.pending_count,
          first_weigh_in: lifetime.first_weigh_in,
          last_weigh_in: lifetime.last_weigh_in,
          estimated_co2_offset_kg: parseFloat(totalCO2Offset.toFixed(2)),
          estimated_co2_offset_mt: parseFloat((totalCO2Offset / 1000).toFixed(3)),
          equivalent_trees_planted: Math.round(totalCO2Offset / 21), // ~21 kg CO2 absorbed per tree/year
        },
        current_month: {
          month: new Date().toISOString().slice(0, 7),
          weigh_ins: currentMonth.month_weigh_ins,
          weight_kg: Number(parseFloat(currentMonth.month_weight_kg).toFixed(2)),
          earnings_inr: Number(parseFloat(currentMonth.month_earnings_inr).toFixed(2)),
          paid_inr: Number(parseFloat(currentMonth.month_paid_inr).toFixed(2)),
        },
        material_breakdown: materialBreakdown,
        monthly_trend: trendRes.rows.map((t) => ({
          month: t.month,
          weigh_ins: t.weigh_ins,
          weight_kg: Number(parseFloat(t.weight_kg).toFixed(2)),
          earnings_inr: Number(parseFloat(t.earnings_inr).toFixed(2)),
        })),
        recent_payout_receipts: receiptsRes.rows.map((r) => ({
          payout_id: r.payout_id,
          weigh_in_id: r.weigh_in_id,
          amount_inr: Number(r.amount_inr),
          upi_vpa: r.seller_upi_vpa,
          utr_number: r.utr_number,
          razorpay_payout_id: r.razorpay_payout_id,
          status: r.transaction_status,
          processed_at: r.processed_at,
          material_grade: r.material_grade,
          net_weight_kg: Number(r.net_weight_kg),
          rate_per_kg: Number(r.applied_rate_per_kg),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getWorkerLedger,
};
