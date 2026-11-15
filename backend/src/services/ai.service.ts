/**
 * AI Service
 * Integrates with Gemini API for incident image analysis and urban assistant chat
 */

import fs from 'fs';
import path from 'path';
import { env } from '../config/environment';
import { query } from '../config/database';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AIVerificationStatus = 'MATCH' | 'CATEGORY_MISMATCH' | 'UNRELATED_OR_SPAM';

export interface AIAnalysisResult {
  suggested_category_id: number | null;
  confidence: number;
  label: string;
  tags: string[];
  severity_suggestion: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  verification_status?: AIVerificationStatus;
  verification_reason?: string;
  verification_reason_vi?: string;
  what_is_in_image?: string;
}

interface IncidentCategory {
  id: number;
  name: string;
  description?: string | null;
}

interface RecentUserIncident {
  id: number;
  title: string;
  status: string;
  priority: string;
  location_name: string | null;
  created_at: Date;
  category_name: string | null;
}

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
};
const VI_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  assigned: 'Đã tiếp nhận',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn tất',
  rejected: 'Từ chối',
};

const SLA_HOURS: Record<string, number> = {
  critical: 24,
  high: 48,
  medium: 72,
  low: 120,
};

function getCleanApiKey(): string | null {
  const raw = env.geminiApiKey?.trim().replace(/^["']|["']$/g, '').trim();
  if (!raw || raw === 'your_gemini_api_key_here') {
    return null;
  }
  return raw;
}

function getImageMimeType(localFilePath: string): string {
  switch (path.extname(localFilePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function normalizeVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

function stripMarkdownCodeFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function callGeminiGenerateContent(
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs = 15000
): Promise<string | null> {
  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        if ([400, 404, 429, 503].includes(response.status)) {
          continue;
        }
        throw new Error(`Gemini API (${model}) returned HTTP ${response.status}`);
      }

      const responseData = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const responseText = responseData.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

      if (responseText) {
        return responseText;
      }
    } catch (error) {
      console.warn(`Gemini model ${model} attempt failed:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

function findMatchingCategory(
  normalizedMessage: string,
  categories: IncidentCategory[]
): IncidentCategory | null {
  for (const category of categories) {
    const normalizedName = normalizeVietnamese(category.name);
    if (normalizedName && normalizedMessage.includes(normalizedName)) {
      return category;
    }
  }

  const keywordRules: Array<{ pattern: RegExp; categoryPattern: RegExp }> = [
    { pattern: /\b(?:pothole|road damage|damaged road|cracked road|road surface|o ga|duong hong|nut duong|sut lun|mat duong)\b/, categoryPattern: /road damage|road|o ga|duong/ },
    { pattern: /\b(?:sewage|wastewater|nuoc thai|ong nuoc)\b/, categoryPattern: /flood|wastewater|water|nuoc/ },
    { pattern: /\b(?:drain|blocked drain|storm drain|manhole|cong|cong tac|tac cong|thoat nuoc|nap cong)\b/, categoryPattern: /drain|cong|thoat nuoc/ },
    { pattern: /\b(?:flood|flooding|water|water pipe|ngap|nuoc ngap|ngap nuoc|ngap ung)\b/, categoryPattern: /flood|wastewater|water|ngap|nuoc/ },
    { pattern: /\b(?:streetlight|light|power|outage|traffic signal|den|den duong|den giao thong|mat dien|day dien|chieu sang)\b/, categoryPattern: /streetlight|power|light|electric|den|dien/ },
    { pattern: /\b(?:trash|waste|litter|dumping|rac|rac thai|xa rac|o nhiem|ban)\b/, categoryPattern: /waste|litter|trash|rac/ },
    { pattern: /\b(?:tree|trees|branch|branches|cay|cay xanh|cay do|nhanh cay|canh cay)\b/, categoryPattern: /tree|cay/ },
    { pattern: /\b(?:traffic|jam|congestion|road blockage|ket xe|tac duong|un tac|giao thong)\b/, categoryPattern: /traffic|congestion|tac duong|giao thong/ },
    { pattern: /\b(?:safety|hazard|elevator|emergency|an toan|thang may|nguy hiem|tai nan|chay)\b/, categoryPattern: /safety|hazard|elevator|facility|an toan|thang may/ },
  ];

  for (const rule of keywordRules) {
    if (rule.pattern.test(normalizedMessage)) {
      const matched = categories.find((cat) =>
        rule.categoryPattern.test(normalizeVietnamese(cat.name))
      );
      if (matched) return matched;
    }
  }

  return null;
}

function translateCategoryName(name: string | null | undefined, language: 'vi' | 'en'): string {
  if (!name) return '';
  const normalizedName = normalizeVietnamese(name);
  const categories: Array<{ names: string[]; vi: string; en: string }> = [
    { names: ['potholes', 'pothole', 'o ga'], vi: 'Ổ gà', en: 'Potholes' },
    { names: ['road damage', 'duong hong'], vi: 'Đường hỏng', en: 'Road Damage' },
    { names: ['streetlight & power', 'streetlight and power', 'den duong & dien', 'mat dien', 'den duong', 'den bi hu'], vi: 'Đèn đường & Điện', en: 'Streetlight & Power' },
    { names: ['traffic congestion', 'tac duong'], vi: 'Tắc đường', en: 'Traffic Congestion' },
    { names: ['waste & litter', 'waste and litter', 'rac thai', 'rac tren duong'], vi: 'Rác thải', en: 'Waste & Litter' },
    { names: ['public safety', 'an toan cong cong'], vi: 'An toàn công cộng', en: 'Public Safety' },
    { names: ['fallen / damaged trees', 'fallen/damaged trees', 'cay coi', 'cay coi hu hong'], vi: 'Cây cối', en: 'Fallen / Damaged Trees' },
    { names: ['flooding & wastewater', 'flooding and wastewater', 'ngap nuoc & nuoc thai', 'ngap nuoc', 'nuoc ngap', 'nuoc thai'], vi: 'Ngập nước & Nước thải', en: 'Flooding & Wastewater' },
    { names: ['clogged drain', 'cong tac'], vi: 'Cống tắc', en: 'Clogged Drain' },
    { names: ['public facility / elevator', 'public facility/elevator', 'thang may & tien ich', 'thang may'], vi: 'Thang máy & Tiện ích', en: 'Public Facility / Elevator' },
  ];
  const match = categories.find((category) =>
    category.names.some((alias) => normalizedName === normalizeVietnamese(alias))
  );
  return match ? match[language] : name;
}

function buildSmartLocalReply(
  message: string,
  categories: IncidentCategory[],
  recentIncidents: RecentUserIncident[],
  language: 'vi' | 'en'
): { reply: string; suggestedCategoryId: number | null } {
  const normalized = normalizeVietnamese(message);
  const isVietnamese = language === 'vi';

  // 1. Check whether the user is asking about report status or progress.
  if (/\b(?:status|progress|my report|my reports|tien do|bao cao cua toi|trang thai|kiem tra|xu ly toi dau|bao cao nao)\b/.test(normalized)) {
    if (recentIncidents.length === 0) {
      return {
        reply:
          isVietnamese
            ? 'Bạn chưa có báo cáo sự cố nào trên UIRMS. Hãy chọn "Báo cáo mới" tại trang chủ hoặc mô tả sự cố để tôi gợi ý danh mục phù hợp.'
            : 'You do not have any incident reports in UIRMS yet. Select "New Report" on the home page, or describe the issue here and I can suggest the appropriate category.',
        suggestedCategoryId: null,
      };
    }

    const lines = recentIncidents.map((item) => {
      const status = (isVietnamese ? VI_STATUS_LABELS : STATUS_LABELS)[item.status] || item.status;
      const sla = SLA_HOURS[item.priority]
        ? ` (SLA: ${SLA_HOURS[item.priority]} ${isVietnamese ? 'giờ' : 'hours'})`
        : '';
      return `• #${item.id} - ${item.title}: ${status}${sla}${item.location_name ? ` ${isVietnamese ? 'tại' : 'at'} ${item.location_name}` : ''}`;
    });

    return {
      reply: isVietnamese
        ? `Dưới đây là trạng thái ${recentIncidents.length} báo cáo gần đây nhất của bạn:\n${lines.join('\n')}\n\nMở mục "Báo cáo" để xem ảnh hiện trường và chi tiết xử lý.`
        : `Here is the status of your ${recentIncidents.length} most recent report(s):\n${lines.join('\n')}\n\nOpen "Reports" to view incident photos and resolution details.`,
      suggestedCategoryId: null,
    };
  }

  // 2. Explain service-level timelines when requested.
  if (/\b(?:sla|how long|resolution time|processing time|bao lau|thoi gian xu ly|khi nao xong|cam ket)\b/.test(normalized)) {
    return {
      reply:
        isVietnamese
          ? 'Thời gian cam kết xử lý (SLA) được tính từ lúc tiếp nhận báo cáo:\n• Khẩn cấp: trong 24 giờ\n• Cao: trong 48 giờ\n• Trung bình: trong 72 giờ\n• Thấp: trong 120 giờ (5 ngày)'
          : 'UIRMS service-level targets are measured from report receipt:\n• Critical: within 24 hours\n• High: within 48 hours\n• Medium: within 72 hours\n• Low: within 120 hours (5 days)',
      suggestedCategoryId: null,
    };
  }

  // 3. Explain how incidents are prioritized when requested.
  if (/\b(?:classif|severity|priority|serious|muc do|nghiem trong|uu tien)\b/.test(normalized)) {
    return {
      reply:
        isVietnamese
          ? 'UIRMS phân loại mức độ ưu tiên thành bốn cấp để điều phối xử lý phù hợp:\n• Thấp: Ảnh hưởng nhỏ đến giao thông hoặc sinh hoạt, như rác ít hoặc hư hỏng nhẹ trên mặt đường.\n• Trung bình: Gây gián đoạn cục bộ, như đèn đường hỏng hoặc thoát nước chậm.\n• Cao: Có nguy cơ mất an toàn đáng kể, như ổ gà lớn, ngập sâu hoặc cây không vững.\n• Khẩn cấp: Đe dọa trực tiếp đến tính mạng hoặc tài sản, như sập hố ga, dây điện hở hoặc cây chắn ngang đường.'
          : 'UIRMS uses four priority levels to help coordinate an appropriate response:\n• Low: Minor impact on traffic or daily activities, such as small amounts of litter or minor surface damage.\n• Medium: Localized disruption, such as a broken streetlight or slow drainage.\n• High: Significant safety risk, such as a large pothole, deep flooding, or an unstable tree.\n• Critical: Immediate threat to life or property, such as a collapsed manhole, exposed live wiring, or a tree blocking the road.',
      suggestedCategoryId: null,
    };
  }

  // 4. Suggest a category when the user describes a specific incident.
  const matchedCategory = findMatchingCategory(normalized, categories);
  if (matchedCategory) {
    return {
      reply: isVietnamese
        ? `Bạn hãy gửi phản ánh này trong danh mục "${translateCategoryName(matchedCategory.name, 'vi')}". Chụp ảnh hiện trường rõ nét và bật GPS để đội phụ trách xác định vị trí, xử lý nhanh chóng. Chọn nút bên dưới để tạo báo cáo.`
        : `Please submit this issue under "${translateCategoryName(matchedCategory.name, 'en')}". Take a clear photo of the site and enable GPS so the local response team can locate and address it. Select the button below to create a report.`,
      suggestedCategoryId: matchedCategory.id,
    };
  }

  // 5. Respond to greetings.
  if (/^(xin chao|chao|hi|hello|alo|hey|ban oi)\b/.test(normalized)) {
    const categoryNames = categories.map((c) => c.name).join(', ');
    return {
      reply: isVietnamese
        ? `Xin chào! Tôi là Trợ lý Đô thị UIRMS tại TP. Hồ Chí Minh. Tôi có thể hỗ trợ bạn:\n• Tra cứu trạng thái báo cáo\n• Giải thích thời gian cam kết xử lý (SLA) và mức độ ưu tiên\n• Chọn danh mục sự cố (${categories.map((category) => translateCategoryName(category.name, 'vi')).join(', ') || 'đường hỏng, đèn đường, ngập nước hoặc cống tắc'})\n\nBạn cần hỗ trợ nội dung nào?`
        : `Hello! I am the UIRMS Urban Assistant for Ho Chi Minh City. I can help you:\n• Check the status of your reports\n• Explain service-level targets (SLA) and priority levels\n• Select an incident category (${categoryNames || 'road damage, streetlights, flooding, or blocked drains'})\n\nWhat can I help you with?`,
      suggestedCategoryId: null,
    };
  }

  // 6. Provide general guidance.
  const categoryNames = categories.map((c) => c.name).join(', ');
  return {
    reply: isVietnamese
      ? `Trợ lý UIRMS đã nhận được câu hỏi của bạn. Hệ thống tiếp nhận các nhóm sự cố: ${categories.map((category) => translateCategoryName(category.name, 'vi')).join(', ') || 'hạ tầng giao thông, chiếu sáng, thoát nước, cây xanh và vệ sinh công cộng'}.\n\nHãy mô tả cụ thể sự cố (ví dụ: "đường có ổ gà lớn" hoặc "cống tắc gây ngập nước"), hoặc chọn gợi ý bên dưới để tra cứu trạng thái báo cáo.`
      : `The UIRMS assistant has received your question. The system accepts reports for these incident categories: ${categoryNames || 'road infrastructure, street lighting, drainage, trees, and public cleanliness'}.\n\nDescribe the issue in detail (for example, "a large pothole" or "a blocked drain causing flooding"), or select one of the suggestions below to check your report status.`,
    suggestedCategoryId: null,
  };
}

function detectImageMimeTypeFromBuffer(buffer: Buffer, fallbackMimeType: string): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return fallbackMimeType;
}

export class AIService {
  async chatWithAssistant(
    userId: number,
    message: string,
    history: ChatMessage[] = [],
    language: 'vi' | 'en' = 'vi'
  ): Promise<{ reply: string; suggestedCategoryId?: number | null }> {
    let categories: IncidentCategory[] = [];
    let recentIncidents: RecentUserIncident[] = [];

    try {
      [categories, recentIncidents] = await Promise.all([
        query<IncidentCategory>(
          `SELECT id, name, description
           FROM categories
           WHERE is_active = true
           ORDER BY id;`
        ),
        query<RecentUserIncident>(
          `SELECT i.id, i.title, i.status, i.priority, i.location_name, i.created_at,
                  c.name AS category_name
           FROM incidents i
           LEFT JOIN categories c ON c.id = i.category_id
           WHERE i.user_id = $1 AND i.deleted_at IS NULL
           ORDER BY i.created_at DESC
           LIMIT 5;`,
          [userId]
        ),
      ]);
    } catch (dbError) {
      console.error('AI assistant DB context load error:', dbError);
    }

    const apiKey = getCleanApiKey();
    if (!apiKey) {
      return buildSmartLocalReply(message, categories, recentIncidents, language);
    }

    try {
      const recentConversation = history
        .slice(-8)
        .map((item) => `${item.role === 'user' ? (language === 'vi' ? 'Người dân' : 'Resident') : (language === 'vi' ? 'Trợ lý' : 'Assistant')}: ${item.text}`)
        .join('\n');

      const statusLabels = language === 'vi' ? VI_STATUS_LABELS : STATUS_LABELS;
      const prompt = [
        language === 'vi'
          ? 'Bạn là trợ lý ảo UIRMS của Thành phố Hồ Chí Minh, hệ thống tiếp nhận và quản lý phản ánh sự cố đô thị.'
          : 'You are the UIRMS virtual assistant for Ho Chi Minh City’s Urban Incident Reporting and Management System.',
        language === 'vi'
          ? 'Hãy trả lời bằng tiếng Việt lịch sự, ngắn gọn và rõ ràng. Chỉ sử dụng thông tin được cung cấp. Khi nhắc đến danh mục, hãy dịch tên danh mục sang tiếng Việt tự nhiên.'
          : 'Reply in concise, clear, and courteous professional English. Use only the information provided below.',
        language === 'vi'
          ? 'Nhãn trạng thái: pending = Chờ xử lý, assigned = Đã tiếp nhận, in_progress = Đang xử lý, completed = Hoàn tất, rejected = Từ chối.'
          : 'Status labels: pending = Pending, assigned = Assigned, in_progress = In Progress, completed = Completed, rejected = Rejected.',
        language === 'vi'
          ? 'Thời gian cam kết SLA từ lúc tiếp nhận báo cáo: critical = 24 giờ, high = 48 giờ, medium = 72 giờ, low = 120 giờ.'
          : 'SLA targets from report receipt: critical = 24 hours, high = 48 hours, medium = 72 hours, low = 120 hours.',
        `${language === 'vi' ? 'Danh mục sự cố hợp lệ (chỉ chọn các ID này)' : 'Valid incident categories (select only from these IDs)'}: ${JSON.stringify(categories.map(({ id, name }) => ({ id, name })))}.`,
        `${language === 'vi' ? 'Năm báo cáo gần nhất của người dân' : "The resident's five most recent reports"}: ${JSON.stringify(
          recentIncidents.map((incident) => ({
            id: incident.id,
            title: incident.title,
            category: translateCategoryName(incident.category_name, language),
            status_label: statusLabels[incident.status] || incident.status,
            priority: incident.priority,
            sla_hours: SLA_HOURS[incident.priority] ?? null,
            location: incident.location_name,
            created_at: incident.created_at,
          }))
        )}.`,
        recentConversation
          ? `${language === 'vi' ? 'Lịch sử hội thoại gần đây' : 'Recent conversation'}:\n${recentConversation}`
          : '',
        `${language === 'vi' ? 'Tin nhắn hiện tại của người dân' : 'Current resident message'}: "${message}"`,
        language === 'vi'
          ? 'Nếu người dân mô tả sự cố hoặc hỏi nơi báo cáo, hãy đặt suggested_category_id thành ID danh mục phù hợp trong danh sách. Nếu không, đặt thành null.'
          : 'If the resident describes an incident or asks where to report a specific issue, set suggested_category_id to the matching ID from the valid category list. Otherwise, set it to null.',
        language === 'vi'
          ? 'Chỉ trả về một đối tượng JSON hợp lệ, không dùng Markdown, theo cấu trúc: {"reply": "câu trả lời ngắn gọn bằng tiếng Việt", "suggested_category_id": number | null}.'
          : 'Return exactly one valid JSON object without Markdown, using this structure: {"reply": "a concise English response", "suggested_category_id": number | null}.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const responseText = await callGeminiGenerateContent(apiKey, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });

      if (!responseText) {
        return buildSmartLocalReply(message, categories, recentIncidents, language);
      }

      const cleanedJson = stripMarkdownCodeFence(responseText);
      try {
        const parsed = JSON.parse(cleanedJson) as {
          reply?: unknown;
          suggested_category_id?: unknown;
        };

        if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
          const suggestedCategoryId =
            typeof parsed.suggested_category_id === 'number' &&
              categories.some((category) => category.id === parsed.suggested_category_id)
              ? parsed.suggested_category_id
              : findMatchingCategory(normalizeVietnamese(message), categories)?.id ?? null;

          return {
            reply: parsed.reply.trim(),
            suggestedCategoryId,
          };
        }
      } catch {
        // If Gemini returns plain text instead of JSON, display the text.
        if (cleanedJson && !cleanedJson.startsWith('{')) {
          return {
            reply: cleanedJson,
            suggestedCategoryId:
              findMatchingCategory(normalizeVietnamese(message), categories)?.id ?? null,
          };
        }
      }

      return buildSmartLocalReply(message, categories, recentIncidents, language);
    } catch (error) {
      console.error('AI assistant chat error:', error);
      return buildSmartLocalReply(message, categories, recentIncidents, language);
    }
  }

  async analyzeIncidentImage(
    imageSource: string | { buffer: Buffer; mimeType: string },
    title: string,
    description: string | undefined,
    categories: IncidentCategory[],
    selectedCategoryName?: string
  ): Promise<AIAnalysisResult | null> {
    const apiKey = getCleanApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const image =
        typeof imageSource === 'string'
          ? await fs.promises.readFile(imageSource)
          : imageSource.buffer;
      const rawMimeType =
        typeof imageSource === 'string'
          ? getImageMimeType(imageSource)
          : imageSource.mimeType;
      const mimeType = detectImageMimeTypeFromBuffer(image, rawMimeType);
      const categoryList = categories.map(({ id, name }) => ({ id, name }));
      const prompt = [
        'Analyze the urban infrastructure incident shown in the image and cross-check it against the resident-reported details.',
        'Respond in concise, clear, and courteous professional English for label, tags, summary, verification_reason, and what_is_in_image. Also provide verification_reason_vi in natural, concise Vietnamese.',
        `Valid categories (select only an ID from this list, or null if none apply): ${JSON.stringify(categoryList)}`,
        `Resident-selected category: ${selectedCategoryName || 'Not specified'}`,
        `Title: ${title}`,
        `Description: ${description || 'No description provided'}`,
        'Cross-check rules for verification_status:',
        '- "MATCH": The photo clearly depicts an urban infrastructure / public safety incident consistent with the resident-selected category and description.',
        '- "CATEGORY_MISMATCH": The photo shows a real urban infrastructure issue, but it belongs to a different category than the resident-selected category.',
        '- "UNRELATED_OR_SPAM": The photo is unrelated to urban infrastructure (e.g., selfie, food, meme, blank/dark screen, indoor pet, random product) or clearly contradicts the report.',
        'Return exactly one valid JSON object with this structure:',
        '{"suggested_category_id": number | null, "confidence": number from 0.0 to 1.0, "label": string, "tags": string[], "severity_suggestion": "low" | "medium" | "high" | "critical", "summary": string, "verification_status": "MATCH" | "CATEGORY_MISMATCH" | "UNRELATED_OR_SPAM", "what_is_in_image": string, "verification_reason": string, "verification_reason_vi": string}',
        'Assess severity based on risk and impact. Do not infer details that are not visible in the image.',
      ].join('\n');

      const responseText = await callGeminiGenerateContent(apiKey, {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: image.toString('base64'),
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      });

      if (!responseText) {
        return null;
      }

      const parsed = JSON.parse(stripMarkdownCodeFence(responseText)) as Partial<AIAnalysisResult>;
      const severity = parsed.severity_suggestion;
      if (
        typeof parsed.confidence !== 'number' ||
        typeof parsed.label !== 'string' ||
        typeof parsed.summary !== 'string' ||
        !Array.isArray(parsed.tags) ||
        !parsed.tags.every((tag) => typeof tag === 'string') ||
        !['low', 'medium', 'high', 'critical'].includes(severity as string)
      ) {
        return null;
      }

      const suggestedCategoryId =
        typeof parsed.suggested_category_id === 'number' &&
          categories.some((category) => category.id === parsed.suggested_category_id)
          ? parsed.suggested_category_id
          : null;
      const confidence = Math.round(Math.max(0, Math.min(1, parsed.confidence)) * 100) / 100;

      const validStatuses: AIVerificationStatus[] = ['MATCH', 'CATEGORY_MISMATCH', 'UNRELATED_OR_SPAM'];
      let verificationStatus: AIVerificationStatus = validStatuses.includes(parsed.verification_status as AIVerificationStatus)
        ? (parsed.verification_status as AIVerificationStatus)
        : 'MATCH';

      if (!validStatuses.includes(parsed.verification_status as AIVerificationStatus)) {
        if (suggestedCategoryId === null) {
          verificationStatus = 'UNRELATED_OR_SPAM';
        } else if (
          selectedCategoryName &&
          categories.find((c) => c.id === suggestedCategoryId)?.name !== selectedCategoryName
        ) {
          verificationStatus = 'CATEGORY_MISMATCH';
        }
      }

      return {
        suggested_category_id: suggestedCategoryId,
        confidence,
        label: parsed.label,
        tags: parsed.tags,
        severity_suggestion: severity as AIAnalysisResult['severity_suggestion'],
        summary: parsed.summary,
        verification_status: verificationStatus,
        what_is_in_image: typeof parsed.what_is_in_image === 'string' ? parsed.what_is_in_image : parsed.label,
        verification_reason: typeof parsed.verification_reason === 'string' ? parsed.verification_reason : parsed.summary,
        ...(typeof parsed.verification_reason_vi === 'string'
          ? { verification_reason_vi: parsed.verification_reason_vi }
          : {}),
      };
    } catch (error) {
      console.error('AI image analysis error:', error);
      return null;
    }
  }

  async suggestCategory(_description: string): Promise<string | null> {
    return null;
  }

  async checkDuplicates(_title: string, _description: string): Promise<number[]> {
    return [];
  }

  /**
   * AI eKYC OCR for Vietnamese Chip-based CCCD / Căn cước or VNeID App Screenshot
   */
  async extractVNeIDOrCCCDFromImage(
    imageBase64: string,
    rawMimeType = 'image/jpeg'
  ): Promise<{
    is_valid_document: boolean;
    document_type: 'CCCD_CHIP' | 'VNEID_APP' | 'INVALID';
    identity_number: string;
    full_name: string;
    date_of_birth?: string;
    gender?: string;
    place_of_residence?: string;
    reason_vi?: string;
  } | null> {
    const apiKey = getCleanApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const cleanedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
      const buffer = Buffer.from(cleanedBase64, 'base64');
      const mimeType = detectImageMimeTypeFromBuffer(buffer, rawMimeType);

      const prompt = [
        'You are an eKYC OCR engine for Vietnamese National Digital Identity (VNeID / Thẻ Căn cước công dân gắn chip / Thẻ Căn cước).',
        'Examine the image and determine whether it is a valid Vietnamese Citizen ID card (CCCD / Căn cước) or a VNeID mobile app identity screen.',
        'Extract the exact 12-digit personal identification number (Số định danh cá nhân / Số CCCD) and the citizen full name in Vietnamese with proper diacritics (Họ và tên).',
        'Also extract date_of_birth (DD/MM/YYYY), gender (Nam or Nữ), and place_of_residence (Nơi thường trú / Quê quán) if visible.',
        'If the image is NOT a Vietnamese CCCD card or VNeID screen, or if the 12-digit number is unreadable, set is_valid_document to false and document_type to "INVALID", and explain why in Vietnamese in reason_vi.',
        'Return ONLY one valid JSON object matching this exact schema:',
        '{"is_valid_document": boolean, "document_type": "CCCD_CHIP" | "VNEID_APP" | "INVALID", "identity_number": "12 digits or empty string", "full_name": "Full Vietnamese Name or empty string", "date_of_birth": "DD/MM/YYYY or empty", "gender": "Nam" | "Nữ" | "", "place_of_residence": "string", "reason_vi": "short explanation in Vietnamese"}',
      ].join('\n');

      const responseText = await callGeminiGenerateContent(
        apiKey,
        {
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanedBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        },
        20000
      );

      if (!responseText) {
        return null;
      }

      const parsed = JSON.parse(stripMarkdownCodeFence(responseText));
      const digitsOnly = String(parsed.identity_number || '').replace(/\D/g, '');
      return {
        is_valid_document: Boolean(parsed.is_valid_document) && /^\d{12}$/.test(digitsOnly),
        document_type:
          parsed.document_type === 'CCCD_CHIP' || parsed.document_type === 'VNEID_APP'
            ? parsed.document_type
            : 'INVALID',
        identity_number: digitsOnly,
        full_name: String(parsed.full_name || '').trim(),
        date_of_birth: String(parsed.date_of_birth || '').trim(),
        gender: String(parsed.gender || '').trim(),
        place_of_residence: String(parsed.place_of_residence || '').trim(),
        reason_vi: String(parsed.reason_vi || '').trim(),
      };
    } catch (error) {
      console.error('VNeID eKYC OCR error:', error);
      return null;
    }
  }
}

export const aiService = new AIService();