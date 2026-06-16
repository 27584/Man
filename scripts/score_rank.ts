import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

// 安全过滤函数
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 50)
}

// 验证昵称格式
function isValidNickname(nickname: string): boolean {
  const nicknameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{1,20}$/
  return nicknameRegex.test(nickname)
}

// 验证分数
function isValidScore(score: any): boolean {
  const numScore = Number(score)
  return !isNaN(numScore) && 
         Number.isFinite(numScore) && 
         Number.isInteger(numScore) && 
         numScore >= 0 && 
         numScore <= 999999
}

// 检查是否包含 SQL 注入特征
function hasSQLInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bALTER\b.*\bTABLE\b)/i,
    /(\bCREATE\b.*\bTABLE\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(--)/,
    /(;)/,
    /(\bOR\b.*=.*=)/i,
    /(\bAND\b.*=.*=)/i
  ]
  return sqlPatterns.some(pattern => pattern.test(input))
}

// 检查是否包含 XSS 特征
function hasXSSPattern(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/is,
    /<img[^>]*onerror=/is,
    /<[^>]*onload=/is,
    /<[^>]*onclick=/is,
    /<[^>]*onmouseover=/is,
    /javascript:/i,
    /vbscript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ]
  return xssPatterns.some(pattern => pattern.test(input))
}

// 记录安全事件日志
async function logSecurityEvent(supabase: any, eventType: string, details: any) {
  try {
    console.error(`[SECURITY] ${eventType}:`, JSON.stringify(details))
  } catch (err) {
    console.error("Failed to log security event:", err)
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { method } = req
    
    const clientIP = req.headers.get("x-forwarded-for") || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown"

    if (method === "POST") {
      let body
      try {
        body = await req.json()
      } catch (e) {
        return new Response(JSON.stringify({ error: "无效的 JSON 格式" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      let { nickname, score } = body

      if (!nickname || score === undefined) {
        return new Response(JSON.stringify({ error: "参数错误，需提供 nickname 和 score" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      nickname = String(nickname)
      
      if (hasSQLInjectionPattern(nickname)) {
        await logSecurityEvent(supabase, "SQL_INJECTION_ATTEMPT", { 
          ip: clientIP, 
          nickname, 
          score 
        })
        return new Response(JSON.stringify({ error: "检测到可疑的输入内容" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      if (hasXSSPattern(nickname)) {
        await logSecurityEvent(supabase, "XSS_ATTEMPT", { 
          ip: clientIP, 
          nickname, 
          score 
        })
        return new Response(JSON.stringify({ error: "检测到可疑的输入内容" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      const sanitizedNickname = sanitizeInput(nickname)

      if (!isValidNickname(sanitizedNickname)) {
        return new Response(JSON.stringify({ 
          error: "昵称格式错误，仅支持中文、英文、数字、下划线，长度1-20个字符" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      if (!isValidScore(score)) {
        return new Response(JSON.stringify({ 
          error: "分数格式错误，必须是0-999999之间的整数" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      const numScore = Number(score)

      const { data: rows, error: selectError } = await supabase
        .from("Rank")
        .select("id, score")
        .eq("nickname", sanitizedNickname)

      if (selectError) throw selectError

      if (rows && rows.length > 0) {
        const existing = rows[0]
        if (numScore <= existing.score) {
          return new Response(JSON.stringify({ 
            message: "新分数不高于历史最高分，未更新",
            currentHighest: existing.score 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          })
        }

        const { error: updateError } = await supabase
          .from("Rank")
          .update({ score: numScore })
          .eq("id", existing.id)

        if (updateError) throw updateError
        
        console.log(`[INFO] Updated score for ${sanitizedNickname}: ${numScore}`)
      } else {
        const { error: insertError } = await supabase
          .from("Rank")
          .insert({ nickname: sanitizedNickname, score: numScore })

        if (insertError) throw insertError
        
        console.log(`[INFO] New entry for ${sanitizedNickname}: ${numScore}`)
      }

      return new Response(JSON.stringify({ 
        message: "分数上传成功",
        nickname: sanitizedNickname,
        score: numScore
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 获取排行榜
    if (method === "GET") {
      const url = new URL(req.url)
      const limit = parseInt(url.searchParams.get("limit") || "20")
      const validLimit = Math.min(Math.max(1, limit), 100)

      // 并行查询
      const [godResult, normalResult] = await Promise.all([
        // 神仙榜：分数 >= 1000 的前10名
        supabase
          .from("Rank")
          .select("nickname, score")
          .gte("score", 1000)
          .order("score", { ascending: false })
          .limit(10),
        
        // 普通榜：分数 < 1000 的前20名
        supabase
          .from("Rank")
          .select("nickname, score")
          .lt("score", 1000)
          .order("score", { ascending: false })
          .limit(validLimit)
      ])

      if (godResult.error) throw godResult.error
      if (normalResult.error) throw normalResult.error

      // 净化数据
      const godLeaderboard = godResult.data?.map(item => ({
        nickname: sanitizeInput(item.nickname),
        score: item.score
      })) || []

      const normalLeaderboard = normalResult.data?.map(item => ({
        nickname: sanitizeInput(item.nickname),
        score: item.score
      })) || []

      // 返回格式
      return new Response(JSON.stringify({ 
        leaderboard: normalLeaderboard,    // 普通榜（分数 < 1000）
        godLeaderboard: godLeaderboard     // 神仙榜（分数 >= 1000）
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ error: "不支持的请求方法" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error("Server error:", err)
    return new Response(JSON.stringify({ 
      error: "服务器内部错误",
      message: (err as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})