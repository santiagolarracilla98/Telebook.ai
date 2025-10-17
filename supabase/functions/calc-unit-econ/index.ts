import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { roiTarget = 0.25 } = await req.json(); // Default to 25% ROI target

    console.log(`Calculating unit economics with ${roiTarget * 100}% ROI target...`);

    // Get fee schedules
    const { data: feeSchedules, error: feeError } = await supabase
      .from('fee_schedules')
      .select('*');

    if (feeError) throw feeError;

    // Create fee lookup
    const fees: Record<string, any> = {};
    feeSchedules?.forEach(fee => {
      fees[fee.territory] = fee;
    });

    // Get all books with at least wholesale_price or publisher_rrp
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, us_asin, uk_asin, publisher_rrp, wholesale_price, amazon_price, currency, category')
      .or('publisher_rrp.not.is.null,wholesale_price.not.is.null');

    if (booksError) throw booksError;

    console.log(`Processing ${books?.length || 0} books...`);

    const results = [];

    for (const book of books || []) {
      const territory = book.us_asin ? 'US' : 'UK';
      const feeSchedule = fees[territory];

      if (!feeSchedule) {
        console.warn(`No fee schedule found for ${territory}`);
        continue;
      }

      const cost = book.publisher_rrp || book.wholesale_price || 0;
      
      // Skip books with no cost data
      if (cost === 0) continue;
      
      // Calculate target price to achieve desired ROI after Amazon fees
      // Formula: target_price = ((1 + roi_target) * cost + fixed_fees) / (1 - referral_pct)
      const roiTargetPrice = 
        ((1 + roiTarget) * cost + feeSchedule.closing_fee + feeSchedule.fba_base) / 
        (1 - feeSchedule.referral_pct);

      // Calculate Amazon fees at current price (for reference)
      let amazonFee = 0;
      let currentRoi = 0;
      let marketFlag = 'at_market';

      if (book.amazon_price) {
        const referralFee = book.amazon_price * feeSchedule.referral_pct;
        amazonFee = referralFee + feeSchedule.closing_fee + feeSchedule.fba_base;
        
        // Calculate actual ROI at current Amazon price
        const netProfit = book.amazon_price - amazonFee - cost;
        currentRoi = cost > 0 ? netProfit / cost : 0;

        // Determine market flag based on current price vs target
        const priceDiff = Math.abs(book.amazon_price - roiTargetPrice);
        
        if (priceDiff < 0.5) {
          marketFlag = 'at_market';
        } else if (book.amazon_price < roiTargetPrice) {
          marketFlag = 'below_market';
        } else {
          marketFlag = 'above_market';
        }
      }

      // Update book with calculated values
      const { error: updateError } = await supabase
        .from('books')
        .update({
          amazon_fee: amazonFee,
          roi_target_price: roiTargetPrice,
          market_flag: marketFlag
        })
        .eq('id', book.id);

      if (updateError) {
        console.error('Error updating book economics:', updateError);
      } else {
        results.push({
          id: book.id,
          cost: cost,
          amazon_price: book.amazon_price,
          amazon_fee: amazonFee,
          roi_target_price: roiTargetPrice,
          current_roi: Math.round(currentRoi * 100),
          target_roi: Math.round(roiTarget * 100),
          market_flag: marketFlag
        });
      }
    }

    console.log(`Successfully calculated economics for ${results.length} books`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calc-unit-econ:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
