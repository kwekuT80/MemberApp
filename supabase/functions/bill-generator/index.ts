/**
 * =====================================================================
 * KSJI MEMBERAPP
 * ANNUAL BILL GENERATION ENGINE
 * =====================================================================
 *
 * Edge Function:
 *   bill-generator
 *
 * Purpose:
 *   Automate annual bill generation for all active members.
 *
 * Business Logic:
 *
 *     1. Load all eligible members (active, not deceased/dismissed)
 *     2. Fetch current year's assessment rates (regular/social/student)
 *     3. For each member:
 *        a. Determine rate type based on membership classification
 *        b. Calculate base amount from the appropriate rate
 *        c. Pull arrears_brought_forward from financial_assessments
 *        d. Compute total_due = base_amount + arrears
 *        e. Insert bill record with 'pending' status
 *     4. Log generation run statistics to bill_generation_log
 *
 * ---------------------------------------------------------------------
 * PRIMARY DATA SOURCES
 * ---------------------------------------------------------------------
 *
 * annual_assessment_rates
 *     ↓
 *     regular_rate / social_rate / student_rate
 *     ↓
 *
 * members (active only)
 *     ↓
 *     membership_type → rate lookup
 *     ↓
 *
 * financial_assessments (earliest year for each member)
 *     ↓
 *     arrears_brought_forward
 *     ↓
 *
 * bills (INSERT)
 *     ↓
 *     pending status, awaiting registrar review
 *
 * ---------------------------------------------------------------------
 * RATE DETERMINATION LOGIC
 * ---------------------------------------------------------------------
 *
 * The system determines the appropriate assessment rate using:
 *
 *     1. Explicit membership_type from members table
 *     2. Fallback to 'regular' if type is unknown/unspecified
 *     3. Social rates apply to: 'social', 'honorary', 'emeritus'
 *     4. Student rates apply to: 'student', 'junior', 'apprentice'
 *     5. All others default to 'regular'
 *
 * ---------------------------------------------------------------------
 * BILL GENERATION PRINCIPLES
 * ---------------------------------------------------------------------
 *
 * - Bills are generated with 'pending' status awaiting registrar review
 * - Duplicate prevention: skip if bill already exists for this member/year
 * - Generation is idempotent — safe to run multiple times per cycle
 * - Members aged 80+ excluded (arrears forgiven at age 80)
 * - Deceased/dismissed/transferred members excluded
 *
 * ---------------------------------------------------------------------
 * EXECUTION FREQUENCY
 * ---------------------------------------------------------------------
 *
 * Annual. Typically executed:
 *
 *     January 1st — New assessment year begins
 *
 * Trigger Path:
 *
 *     Vercel Cron
 *         ↓
 *     API Route (/api/cron/bill-generation)
 *         ↓
 *     bill-generator Edge Function
 *
 * ---------------------------------------------------------------------
 * TABLES UPDATED
 * ---------------------------------------------------------------------
 *
 * bills
 *
 *     INSERT new bill records with 'pending' status.
 *     Uses UPSERT to prevent duplicates on (member_id, assessment_year).
 *
 * ---------------------------------------------------------------------
 *
 * bill_generation_log
 *
 *     Records execution summary: members_processed, bills_created,
 *     total_amount_generated, and run status (running/completed/failed).
 *
 * ---------------------------------------------------------------------
 * MAINTAINER NOTES
 * ---------------------------------------------------------------------
 *
 * If rate structure changes in the future:
 *
 *     1. Update annual_assessment_rates table first.
 *     2. Bill generator reads rates dynamically — no code change needed.
 *     3. Only membership_type classification logic needs updates if
 *        new categories (e.g., 'veteran', 'life_member') are added.
 *
 * =====================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * ---------------------------------------------------------------------
 * ENVIRONMENT CONFIGURATION
 * ---------------------------------------------------------------------
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Current assessment year for bill generation.
 */
const ASSESSMENT_YEAR = new Date().getFullYear();

/**
 * Membership types classified as eligible for social rates.
 */
const SOCIAL_MEMBERSHIP_TYPES = [
  "social",
  "honorary",
  "emeritus",
  "life_member",
];

/**
 * Membership types classified as eligible for student rates.
 */
const STUDENT_MEMBERSHIP_TYPES = [
  "student",
  "junior",
  "apprentice",
];

/**
 * Members excluded from bill generation.
 */
const EXCLUDED_STATUSES = [
  "dismissed",
  "transfer-out",
  "deceased",
];

/**
 * ---------------------------------------------------------------------
 * TYPE DEFINITIONS
 * ---------------------------------------------------------------------
 */

interface AnnualAssessmentRate {
  year: number;
  regular_rate: number;
  social_rate: number;
  student_rate: number;
}

interface Member {
  id: string;
  title: string | null;
  first_name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  membership_type: string | null;
  status: string | null;
  is_deceased: boolean | null;
  date_of_birth: string | null;
  date_of_death: string | null;
}

interface FinancialAssessment {
  year: number;
  arrears_brought_forward: number;
}

/**
 * ---------------------------------------------------------------------
 * RATE CALCULATION UTILITIES
 * ---------------------------------------------------------------------
 */

function getRateFromAnnualRates(
  rates: AnnualAssessmentRate,
  membershipType: string | null
): { rate_type: "regular" | "social" | "student"; amount: number } {
  const normalized = membershipType?.toLowerCase();

  if (SOCIAL_MEMBERSHIP_TYPES.includes(normalized || "")) {
    return { rate_type: "social", amount: rates.social_rate };
  }

  if (STUDENT_MEMBERSHIP_TYPES.includes(normalized || "")) {
    return { rate_type: "student", amount: rates.student_rate };
  }

  // Default to regular rate
  return { rate_type: "regular", amount: rates.regular_rate };
}

/**
 * ---------------------------------------------------------------------
 * ELIGIBILITY CHECKS
 * ---------------------------------------------------------------------
 */

function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const monthDifference = today.getMonth() - dob.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

function isEligibleForBillGeneration(member: Member): boolean {
  // Exclude members without email (cannot receive bill notification)
  if (!member.email) {
    return false;
  }

  // Age-based exclusion — KSJI policy treats arrears as forgiven at 80
  const age = calculateAge(member.date_of_birth);
  if (age !== null && age >= 80) {
    return false;
  }

  // Exclude deceased members
  if (member.is_deceased === true || member.date_of_death) {
    return false;
  }

  // Exclude dismissed or transferred-out members
  const status = member.status?.toLowerCase();
  if (EXCLUDED_STATUSES.includes(status || "")) {
    return false;
  }

  return true;
}

/**
 * ---------------------------------------------------------------------
 * DATA LOADING FUNCTIONS
 * ---------------------------------------------------------------------
 */

async function loadCurrentYearRates(
  supabase: ReturnType<typeof createClient>,
  year: number
): Promise<AnnualAssessmentRate | null> {
  const { data, error } = await supabase
    .from("annual_assessment_rates")
    .select("*")
    .eq("year", year)
    .single();

  if (error || !data) {
    console.error(`[bill-generator] No rates found for year ${year}`);
    return null;
  }

  return data as AnnualAssessmentRate;
}

async function loadActiveMembers(
  supabase: ReturnType<typeof createClient>
): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select(`
      id,
      title,
      first_name,
      surname,
      email,
      phone,
      membership_type,
      status,
      is_deceased,
      date_of_birth,
      date_of_death
    `);

  if (error) {
    throw new Error(`Failed to load members: ${error.message}`);
  }

  return (data || []) as Member[];
}

async function getMemberArrears(
  supabase: ReturnType<typeof createClient>,
  memberId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("financial_assessments")
    .select("year, arrears_brought_forward")
    .eq("member_id", memberId)
    .order("year", { ascending: true })
    .limit(1);

  if (error || !data?.length) {
    return 0;
  }

  return Number(data[0].arrears_brought_forward) || 0;
}

/**
 * ---------------------------------------------------------------------
 * BILL CREATION
 * ---------------------------------------------------------------------
 */

async function createBillRecord(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
  assessmentYear: number,
  rateType: "regular" | "social" | "student",
  baseAmount: number,
  arrearsBroughtForward: number,
  totalDue: number
): Promise<boolean> {
  try {
    // Use upsert to prevent duplicates — if bill already exists, skip it
    const { error } = await supabase
      .from("bills")
      .upsert({
        member_id: memberId,
        assessment_year: assessmentYear,
        rate_type: rateType,
        base_amount: baseAmount,
        arrears_brought_forward: arrearsBroughtForward,
        total_due: totalDue,
        status: "pending",
        generated_by: "edge_function:bill-generator",
        generated_at: new Date().toISOString(),
      }, {
        onConflict: "member_id,assessment_year",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`[bill-generator] Failed to create bill for member ${memberId}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[bill-generator] Upsert failed for member ${memberId}:`, err);
    return false;
  }
}

async function logGenerationRun(
  supabase: ReturnType<typeof createClient>,
  year: number,
  membersProcessed: number,
  billsCreated: number,
  totalAmountGenerated: number,
  status: "running" | "completed" | "failed",
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from("bill_generation_log")
    .insert({
      run_date: new Date().toISOString(),
      year_generated: year,
      members_processed: membersProcessed,
      bills_created: billsCreated,
      total_amount_generated: totalAmountGenerated,
      status,
      error_message: errorMessage || null,
    });

  if (error) {
    console.error("[bill-generator] Failed to log generation run:", error);
  }
}

/**
 * ---------------------------------------------------------------------
 * MAIN EXECUTION FLOW
 * ---------------------------------------------------------------------
 *
 * Initialize Logging
 *     ↓
 * Load Current Year Rates
 *     ↓
 * Load Active Members
 *     ↓
 * Generate Bills (loop)
 *     ↓
 * Update Final Stats & Status
 */

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Initialize run logging with 'running' status
  await logGenerationRun(supabase, ASSESSMENT_YEAR, 0, 0, 0, "running");

  try {
    /**
     * Step 1: Load current year assessment rates.
     */
    const annualRates = await loadCurrentYearRates(supabase, ASSESSMENT_YEAR);

    if (!annualRates) {
      console.error(`[bill-generator] Cannot proceed — no rates for ${ASSESSMENT_YEAR}`);
      await logGenerationRun(
        supabase,
        ASSESSMENT_YEAR,
        0,
        0,
        0,
        "failed",
        `No assessment rates found for year ${ASSESSMENT_YEAR}`
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: `No assessment rates configured for ${ASSESSMENT_YEAR}`,
        }),
        { status: 500 }
      );
    }

    /**
     * Step 2: Load all members from the database.
     */
    const allMembers = await loadActiveMembers(supabase);

    let processedCount = 0;
    let createdCount = 0;
    let skippedDuplicatedCount = 0;
    let totalAmountGenerated = 0;

    /**
     * Step 3: Generate bills for each eligible member.
     */
    for (const member of allMembers) {
      processedCount++;

      // Check eligibility — skip ineligible members
      if (!isEligibleForBillGeneration(member)) {
        continue;
      }

      /**
       * Determine rate type and base amount from annual rates.
       */
      const rateInfo = getRateFromAnnualRates(annualRates, member.membership_type);

      /**
       * Fetch arrears_brought_forward from the member's earliest assessment.
       */
      const arrearsBroughtForward = await getMemberArrears(supabase, member.id);

      /**
       * Calculate total due amount.
       */
      const totalDue = rateInfo.amount + arrearsBroughtForward;

      totalAmountGenerated += totalDue;

      /**
       * Create bill record (idempotent — skips if already exists).
       */
      const success = await createBillRecord(
        supabase,
        member.id,
        ASSESSMENT_YEAR,
        rateInfo.rate_type,
        rateInfo.amount,
        arrearsBroughtForward,
        totalDue
      );

      if (success) {
        createdCount++;
      } else {
        // If upsert failed silently, check for duplicate
        const { data: existingBill } = await supabase
          .from("bills")
          .select("id")
          .eq("member_id", member.id)
          .eq("assessment_year", ASSESSMENT_YEAR)
          .single();

        if (existingBill) {
          skippedDuplicatedCount++;
        } else {
          console.error(`[bill-generator] Failed to create bill for member ${member.id}`);
        }
      }
    }

    /**
     * Step 4: Update final generation log with completion statistics.
     */
    await logGenerationRun(
      supabase,
      ASSESSMENT_YEAR,
      processedCount,
      createdCount + skippedDuplicatedCount,
      totalAmountGenerated,
      "completed"
    );

    return new Response(
      JSON.stringify({
        success: true,
        year: ASSESSMENT_YEAR,
        members_processed: processedCount,
        bills_created: createdCount,
        duplicates_skipped: skippedDuplicatedCount,
        total_amount_generated: totalAmountGenerated,
        rate_used: {
          regular: annualRates.regular_rate,
          social: annualRates.social_rate,
          student: annualRates.student_rate,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    /**
     * On failure, update the log with error status.
     */
    await logGenerationRun(
      supabase,
      ASSESSMENT_YEAR,
      processedCount || 0,
      createdCount || 0,
      totalAmountGenerated,
      "failed",
      (error as Error).message
    );

    console.error("[bill-generator] Generation failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        year: ASSESSMENT_YEAR,
        members_processed: processedCount || 0,
        bills_created: createdCount || 0,
      }),
      { status: 500 }
    );
  }
});
