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

    const { roiTarget = 0.20 } = await req.json();

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

    // Get all books with prices
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, us_asin, uk_asin, publisher_rrp, amazon_price, currency, category')
      .not('publisher_rrp', 'is', null)
      .not('amazon_price', 'is', null);

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

      // Calculate Amazon fee
      const referralFee = book.amazon_price * feeSchedule.referral_pct;
      const totalFee = referralFee + feeSchedule.closing_fee + feeSchedule.fba_base;

      // Calculate margin and ROI
      const margin = book.amazon_price - totalFee - book.publisher_rrp;
      const roi = book.publisher_rrp > 0 ? margin / book.publisher_rrp : 0;

      // Calculate target price for desired ROI
      // P * (1 - referral_pct) = (1 + roiTarget) * publisher_rrp + closing_fee + fba_base
      // P = ((1 + roiTarget) * publisher_rrp + closing_fee + fba_base) / (1 - referral_pct)
      const roiTargetPrice = 
        ((1 + roiTarget) * book.publisher_rrp + feeSchedule.closing_fee + feeSchedule.fba_base) / 
        (1 - feeSchedule.referral_pct);

      // Determine market flag
      let marketFlag = 'at_market';
      const priceDiff = Math.abs(book.amazon_price - roiTargetPrice);
      
      if (priceDiff < 0.5) {
        marketFlag = 'at_market';
      } else if (book.amazon_price < roiTargetPrice) {
        marketFlag = 'below_market';
      } else {
        marketFlag = 'above_market';
      }

      // Update book
      const { error: updateError } = await supabase
        .from('books')
        .update({
          amazon_fee: totalFee,
          roi_target_price: roiTargetPrice,
          market_flag: marketFlag
        })
        .eq('id', book.id);

      if (updateError) {
        console.error('Error updating book economics:', updateError);
      } else {
        results.push({
          id: book.id,
          amazon_price: book.amazon_price,
          publisher_rrp: book.publisher_rrp,
          amazon_fee: totalFee,
          margin: margin,
          roi: roi,
          roi_target_price: roiTargetPrice,
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
