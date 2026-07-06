import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tool definitions (Anthropic format) ──────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_tasks",
    description: "Lista as tarefas do cronograma. Retorna todas ou filtra por projeto.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID do projeto para filtrar (opcional)" },
      },
    },
  },
  {
    name: "list_projects",
    description: "Lista todos os projetos disponíveis com IDs, nomes e cores.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_teams",
    description: "Lista todas as equipes com membros e papéis (responsável/técnico).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_task",
    description: "Cria uma nova tarefa no cronograma. Use list_projects e list_teams antes para obter os IDs corretos.",
    input_schema: {
      type: "object",
      required: ["name", "projectId", "projectName", "startDate", "endDate"],
      properties: {
        name: { type: "string", description: "Nome da tarefa" },
        projectId: { type: "string", description: "ID do projeto (de list_projects)" },
        projectName: { type: "string", description: "Nome do projeto" },
        startDate: { type: "string", description: "Data de início no formato YYYY-MM-DD" },
        endDate: { type: "string", description: "Data de término no formato YYYY-MM-DD" },
        assignee: { type: "string", description: "Nome do responsável (opcional)" },
        teamId: { type: "string", description: "ID da equipe (opcional, de list_teams)" },
        color: { type: "string", description: "Cor hex, ex: #3B82F6 (opcional)" },
        progress: { type: "number", description: "Progresso de 0 a 100 (opcional, padrão 0)" },
      },
    },
  },
  {
    name: "update_task",
    description: "Atualiza campos de uma tarefa existente. Informe apenas os campos que devem mudar.",
    input_schema: {
      type: "object",
      required: ["taskId"],
      properties: {
        taskId: { type: "string", description: "ID da tarefa a atualizar (de list_tasks)" },
        name: { type: "string" },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        progress: { type: "number" },
        assignee: { type: "string" },
        teamId: { type: "string" },
      },
    },
  },
  {
    name: "analyze_workload",
    description: "Analisa o cronograma e detecta: sobreposições de tarefas por equipe, tarefas vencidas, responsáveis ausentes e outros problemas.",
    input_schema: { type: "object", properties: {} },
  },
];

// ─── Convert Anthropic tools to OpenAI function format ────────────────────────

function toOpenAITools(tools: Anthropic.Tool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

// ─── Execute a tool call ───────────────────────────────────────────────────────

async function executeTool(
  name: string,
  // deno-lint-ignore no-explicit-any
  input: Record<string, any>,
  supabase: ReturnType<typeof createClient>,
  // deno-lint-ignore no-explicit-any
  context: { tasks: any[]; projects: any[]; teams: any[] }
): Promise<unknown> {
  const today = new Date().toISOString().split("T")[0];

  switch (name) {
    case "list_tasks": {
      let tasks = context.tasks;
      if (input.projectId) tasks = tasks.filter((t: { projectId: string }) => t.projectId === input.projectId);
      return tasks;
    }

    case "list_projects":
      return context.projects;

    case "list_teams":
      return context.teams;

    case "create_task": {
      const payload = {
        name: input.name,
        project_id: input.projectId,
        project_name: input.projectName,
        start_date: input.startDate,
        end_date: input.endDate,
        assignee: input.assignee ?? null,
        team_id: input.teamId ?? null,
        color: input.color ?? "#3B82F6",
        progress: input.progress ?? 0,
        dependencies: [],
      };
      const { data, error } = await supabase.from("schedule_tasks").insert(payload).select().single();
      if (error) return { error: error.message };
      return { success: true, task: data };
    }

    case "update_task": {
      const { taskId, ...fields } = input;
      // deno-lint-ignore no-explicit-any
      const payload: Record<string, any> = {};
      if (fields.name !== undefined) payload.name = fields.name;
      if (fields.startDate !== undefined) payload.start_date = fields.startDate;
      if (fields.endDate !== undefined) payload.end_date = fields.endDate;
      if (fields.progress !== undefined) payload.progress = fields.progress;
      if (fields.assignee !== undefined) payload.assignee = fields.assignee;
      if (fields.teamId !== undefined) payload.team_id = fields.teamId;
      const { error } = await supabase.from("schedule_tasks").update(payload).eq("id", taskId);
      if (error) return { error: error.message };
      return { success: true };
    }

    case "analyze_workload": {
      const issues: string[] = [];
      const tasksByTeam: Record<string, typeof context.tasks> = {};

      for (const task of context.tasks) {
        if (task.teamId) {
          if (!tasksByTeam[task.teamId]) tasksByTeam[task.teamId] = [];
          tasksByTeam[task.teamId].push(task);
        }
        if (!task.assignee || task.assignee === "") {
          issues.push(`Tarefa "${task.name}" não tem responsável definido.`);
        }
        if (task.endDate && task.endDate < today && task.progress < 100) {
          issues.push(`Tarefa "${task.name}" está vencida (término: ${task.endDate}) com ${task.progress}% de progresso.`);
        }
      }

      for (const [teamId, teamTasks] of Object.entries(tasksByTeam)) {
        const team = context.teams.find((t: { id: string; name: string }) => t.id === teamId);
        const teamName = team?.name ?? teamId;
        for (let i = 0; i < teamTasks.length; i++) {
          for (let j = i + 1; j < teamTasks.length; j++) {
            const a = teamTasks[i];
            const b = teamTasks[j];
            const overlap = a.startDate <= b.endDate && b.startDate <= a.endDate;
            if (overlap) {
              issues.push(`Equipe "${teamName}" tem sobreposição entre "${a.name}" e "${b.name}".`);
            }
          }
        }
      }

      return { issues, total: issues.length };
    }

    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

// ─── Build system prompt ───────────────────────────────────────────────────────

function buildSystemPrompt(
  // deno-lint-ignore no-explicit-any
  context: { tasks: any[]; projects: any[]; teams: any[] },
  companyContext: string
): string {
  const today = new Date().toLocaleDateString("pt-BR");
  const contextSection = companyContext.trim()
    ? `\nCONTEXTO DA EMPRESA:\n${companyContext.trim()}\n`
    : "";
  return `Você é um assistente especialista em gestão de cronogramas, alocação de recursos e gerenciamento de equipes da plataforma Secure Project Management.

Você tem acesso ao contexto atual via ferramentas e pode criar e editar tarefas diretamente no sistema.

REGRAS:
- Sempre use list_projects e list_teams antes de criar tarefas para obter os IDs corretos
- Ao detectar problemas (sobreposições, atrasos, responsáveis ausentes), informe proativamente
- Ao criar ou editar tarefas, confirme as ações realizadas de forma objetiva
- Responda sempre em português brasileiro
- Seja direto e prático — o usuário está em contexto operacional
${contextSection}
RESUMO DO ESTADO ATUAL (${today}):
- ${context.tasks.length} tarefa(s) no cronograma
- ${context.projects.length} projeto(s) ativo(s)
- ${context.teams.length} equipe(s) cadastrada(s)`;
}

// ─── Anthropic tool-use loop ───────────────────────────────────────────────────

async function runAnthropicLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  history: any[],
  userMessage: string,
  supabase: ReturnType<typeof createClient>,
  // deno-lint-ignore no-explicit-any
  context: any
): Promise<{ reply: string; mutations: boolean }> {
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  let mutations = false;

  // deno-lint-ignore no-explicit-any
  let response: any;
  do {
    response = await client.messages.create({
      model,
      system: systemPrompt,
      messages,
      tools: TOOLS,
      thinking: { type: "adaptive" },
      max_tokens: 4096,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        // deno-lint-ignore no-explicit-any
        (b: any) => b.type === "tool_use"
      );
      messages.push({ role: "assistant", content: response.content });

      const toolResults = await Promise.all(
        // deno-lint-ignore no-explicit-any
        toolUseBlocks.map(async (block: any) => {
          const result = await executeTool(block.name, block.input, supabase, context);
          if (block.name === "create_task" || block.name === "update_task") {
            mutations = true;
          }
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        })
      );

      messages.push({ role: "user", content: toolResults });
    }
  } while (response.stop_reason === "tool_use");

  const reply = response.content
    // deno-lint-ignore no-explicit-any
    .filter((b: any) => b.type === "text")
    // deno-lint-ignore no-explicit-any
    .map((b: any) => b.text)
    .join("")
    .trim();

  return { reply, mutations };
}

// ─── OpenAI-compatible loop (OpenAI + xAI Grok) ───────────────────────────────

async function runOpenAILoop(
  apiKey: string,
  model: string,
  baseURL: string | undefined,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  history: any[],
  userMessage: string,
  supabase: ReturnType<typeof createClient>,
  // deno-lint-ignore no-explicit-any
  context: any
): Promise<{ reply: string; mutations: boolean }> {
  const url = baseURL ?? "https://api.openai.com/v1";
  const openaiTools = toOpenAITools(TOOLS);

  // deno-lint-ignore no-explicit-any
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  let mutations = false;

  // deno-lint-ignore no-explicit-any
  let responseJson: any;
  do {
    const res = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, tools: openaiTools }),
    });
    responseJson = await res.json();
    if (!res.ok) throw new Error(responseJson.error?.message ?? "OpenAI API error");

    const choice = responseJson.choices[0];
    if (choice.finish_reason === "tool_calls") {
      messages.push(choice.message);
      const toolResults = await Promise.all(
        // deno-lint-ignore no-explicit-any
        (choice.message.tool_calls ?? []).map(async (call: any) => {
          const args = JSON.parse(call.function.arguments);
          const result = await executeTool(call.function.name, args, supabase, context);
          if (call.function.name === "create_task" || call.function.name === "update_task") {
            mutations = true;
          }
          return { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) };
        })
      );
      messages.push(...toolResults);
    }
  } while (responseJson.choices[0].finish_reason === "tool_calls");

  return { reply: responseJson.choices[0].message.content ?? "", mutations };
}

// ─── Convert Anthropic tools to Gemini function declarations ─────────────────
// Gemini requires UPPERCASE types ("STRING", "OBJECT", etc.) and rejects empty properties: {}

// deno-lint-ignore no-explicit-any
function convertTypesToUppercase(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(convertTypesToUppercase);
  // deno-lint-ignore no-explicit-any
  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "type" && typeof value === "string") {
      result[key] = value.toUpperCase();
    } else if (typeof value === "object" && value !== null) {
      result[key] = convertTypesToUppercase(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toGeminiTools(tools: Anthropic.Tool[]) {
  return [{
    functionDeclarations: tools.map((t) => {
      // deno-lint-ignore no-explicit-any
      const schema = t.input_schema as any;
      const hasProperties = schema.properties && Object.keys(schema.properties).length > 0;
      // deno-lint-ignore no-explicit-any
      const decl: any = { name: t.name, description: t.description };
      if (hasProperties) decl.parameters = convertTypesToUppercase(schema);
      return decl;
    }),
  }];
}

// ─── Google Gemini loop ────────────────────────────────────────────────────────

async function runGeminiLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  history: any[],
  userMessage: string,
  supabase: ReturnType<typeof createClient>,
  // deno-lint-ignore no-explicit-any
  context: any
): Promise<{ reply: string; mutations: boolean }> {
  const geminiTools = toGeminiTools(TOOLS);

  // deno-lint-ignore no-explicit-any
  const contents: any[] = [
    ...history.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let mutations = false;

  // deno-lint-ignore no-explicit-any
  let responseJson: any;
  do {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: geminiTools,
        }),
      }
    );
    responseJson = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(responseJson.error));

    const candidate = responseJson.candidates[0];
    const parts = candidate.content.parts ?? [];
    contents.push({ role: "model", parts });

    const funcCalls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);
    if (funcCalls.length === 0) break;

    const toolResults = await Promise.all(
      // deno-lint-ignore no-explicit-any
      funcCalls.map(async (p: any) => {
        const { name, args } = p.functionCall;
        const result = await executeTool(name, args ?? {}, supabase, context);
        if (name === "create_task" || name === "update_task") mutations = true;
        return { functionResponse: { name, response: { result } } };
      })
    );
    contents.push({ role: "user", parts: toolResults });
  } while (true);

  const textParts = (responseJson.candidates[0]?.content?.parts ?? [])
    // deno-lint-ignore no-explicit-any
    .filter((p: any) => p.text)
    // deno-lint-ignore no-explicit-any
    .map((p: any) => p.text);

  return { reply: textParts.join("").trim(), mutations };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase client with user's JWT (respects RLS)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for DB writes (create/update tasks)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Read active AI config — first try the user's own key, then fall back to
    // any active key (allows admin-configured shared key for all users)
    let aiConfig = null;
    let configError = null;

    const ownResult = await supabaseUser
      .from("ai_settings")
      .select("provider, model, api_key")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (ownResult.data) {
      aiConfig = ownResult.data;
    } else {
      // Fall back to any active key visible to this user (policy allows reading active keys)
      const sharedResult = await supabaseUser
        .from("ai_settings")
        .select("provider, model, api_key")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      aiConfig = sharedResult.data;
      configError = sharedResult.error;
    }

    if (configError || !aiConfig) {
      return new Response(
        JSON.stringify({ error: "Nenhuma chave de IA configurada. Acesse Configurações → IA & Modelos para adicionar uma chave." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, history = [], context = { tasks: [], projects: [], teams: [] } } =
      await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Mensagem não informada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load company context (best-effort — empty string if not configured)
    const { data: aiContextRow } = await supabaseUser
      .from("ai_context")
      .select("content")
      .limit(1)
      .maybeSingle();
    const companyContext = aiContextRow?.content ?? "";

    const systemPrompt = buildSystemPrompt(context, companyContext);
    const { provider, model, api_key } = aiConfig;

    let result: { reply: string; mutations: boolean };

    if (provider === "anthropic") {
      result = await runAnthropicLoop(api_key, model, systemPrompt, history, message, supabaseAdmin, context);
    } else if (provider === "openai") {
      result = await runOpenAILoop(api_key, model, undefined, systemPrompt, history, message, supabaseAdmin, context);
    } else if (provider === "grok") {
      result = await runOpenAILoop(api_key, model, "https://api.x.ai/v1", systemPrompt, history, message, supabaseAdmin, context);
    } else if (provider === "google") {
      result = await runGeminiLoop(api_key, model, systemPrompt, history, message, supabaseAdmin, context);
    } else {
      return new Response(JSON.stringify({ error: `Provedor desconhecido: ${provider}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[ai-agent] erro:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
