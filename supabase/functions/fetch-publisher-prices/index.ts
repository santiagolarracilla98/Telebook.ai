// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseOnix, pickBestRRP } from "../_shared/onixParser.ts";

type Input = { isbns?: string[]; territory?: "GB" | "US" };

const BOWKER_API_KEY = Deno.env.get("BOWKER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOWKER_ENDPOINT = "https://api.bowker.com/book/v1/metadata?isbn="; // replace when you have the real endpoint

async function fetchBowkerPrice(isbn13: string) {
  if (!BOWKER_API_KEY) return null;
  try {
    const res = await fetch(`${BOWKER_ENDPOINT}${isbn13}`, {
      headers: { Authorization: `Bearer ${BOWKER_API_KEY}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const prices = (json?.prices ?? []) as any[];
    if (!prices.length) return null;
    const gb = prices.find(p => p.territory === "GB" && (p.priceType === "02" || p.priceType === "01"));
    const us = prices.find(p => p.territory === "US" && (p.priceType === "02" || p.priceType === "01"));
    const pick = gb ?? us ?? prices[0];
    return {
      isbn13,
      territory: pick.territory ?? "GB",
      price_amount: Number(pick.amount),
      currency: pick.currency ?? "GBP",
      price_type: pick.priceType ?? null,
      raw: json,
      source: "bowker",
    };
  } catch { return null; }
}

async function fetchOnixFallback() {
  try {
    const xml = await Deno.readTextFile("./supabase/functions/onix/sample.xml");
    return parseOnix(xml);
  } catch { return []; }
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });

  try {
    const { isbns, territory }: Input = await req.json().catch(() => ({}));

    // collect target isbns: books missing publisher_rrp
    let target = isbns;
    if (!target || target.length === 0) {
      const { data } = await supabase
        .from("books")
        .select("us_asin, uk_asin, isbn, publisher_rrp")
        .limit(500);
      const uniq = new Set<string>();
      for (const row of data ?? []) {
        if (row.publisher_rrp) continue;
        const guess = row.isbn || row.us_asin || row.uk_asin;
        if (guess) uniq.add(String(guess));
      }
      target = Array.from(uniq);
    }

    const logs: any[] = [];
    const updates: any[] = [];

    for (const raw of target) {
      const isbn13 = String(raw).replace(/[^0-9Xx]/g, "");

      let picked: any = await fetchBowkerPrice(isbn13);

      if (!picked) {
        const onix = await fetchOnixFallback();
        const relevant = onix.filter(p => p.isbn13 === isbn13);
        const best = pickBestRRP(relevant, { territory });
        if (best) {
          picked = {
            isbn13,
            territory: best.territory ?? (territory ?? "GB"),
            price_amount: best.priceAmount,
            currency: best.currencyCode ?? "GBP",
            price_type: best.priceType ?? null,
            raw: best,
            source: "onix",
          };
        }
      }
      if (!picked) continue;

      logs.push({
        isbn: isbn13,
        territory: picked.territory,
        price_amount: picked.price_amount,
        currency: picked.currency,
        price_type: picked.price_type,
        source: picked.source,
        raw: picked.raw,
      });

      updates.push({ isbn13, currency: picked.currency, publisher_rrp: picked.price_amount });
    }

    if (logs.length) await supabase.from("publisher_prices").insert(logs);

    for (const u of updates) {
      await supabase
        .from("books")
        .update({ publisher_rrp: u.publisher_rrp, currency: u.currency })
        .or(`isbn.eq.${u.isbn13},us_asin.eq.${u.isbn13},uk_asin.eq.${u.isbn13}`);
    }

    return new Response(JSON.stringify({ updated: updates.length, attempted: target.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
