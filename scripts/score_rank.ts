import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { method } = req

    if (method === "POST") {
      const body = await req.json()
      const { nickname, score } = body

      if (!nickname || score === undefined || isNaN(Number(score))) {
        return new Response(JSON.stringify({ error: "参数错误，需 nickname 和合法 score" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      const numScore = Number(score)

      // 按昵称查找已有记录
      const { data: rows } = await supabase
        .from("Rank")
        .select("id, score")
        .eq("nickname", nickname)

      if (rows && rows.length > 0) {
        // 已有该昵称的分数，只在新分更高时更新
        const existing = rows[0]
        if (numScore <= existing.score) {
          return new Response(JSON.stringify({ message: "新分数不高于历史最高分，未更新" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          })
        }
        // 更新
        const { error } = await supabase
          .from("Rank")
          .update({ score: numScore })
          .eq("id", existing.id)
        if (error) throw error
      } else {
        // 无记录，插入
        const { error } = await supabase
          .from("Rank")
          .insert({ nickname, score: numScore })
        if (error) throw error
      }

      return new Response(JSON.stringify({ message: "分数上传成功" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 获取排行榜
    if (method === "GET") {
      const url = new URL(req.url)
      const limit = parseInt(url.searchParams.get("limit") || "10")

      const { data, error } = await supabase
        .from("Rank")
        .select("nickname, score")
        .order("score", { ascending: false })
        .limit(limit)

      if (error) throw error

      return new Response(JSON.stringify({ leaderboard: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ error: "不支持的请求方法" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})