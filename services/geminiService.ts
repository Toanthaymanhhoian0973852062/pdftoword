import { GoogleGenAI } from "@google/genai";
import { ConvertResponse } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
Bạn là chuyên gia chuyển đổi tài liệu. Nhiệm vụ: Chuyển file PDF/Ảnh sang văn bản để đưa vào Word, **TUÂN THỦ TUYỆT ĐỐI** các yêu cầu sau về Hình ảnh và LaTeX.

### 1. XỬ LÝ HÌNH ẢNH & ĐỒ HỌA (QUAN TRỌNG NHẤT)
- **Mục tiêu**: Giữ nguyên toàn bộ hình vẽ, biểu đồ, hình học không gian, hình phẳng trong file Word xuất ra.
- **Hành động**:
  - **KHÔNG** được mô tả hình ảnh bằng lời.
  - **KHÔNG** được cố gắng vẽ lại hình bằng ký tự hay LaTeX.
  - Khi gặp bất kỳ hình minh họa nào (Tam giác, Đường tròn, Khối lập phương, Đồ thị hàm số, bảng biến thiên có hình vẽ...), bạn **BẮT BUỘC** phải chèn tag:
    \`[[IMAGE]]\`
  - Đặt tag \`[[IMAGE]]\` chính xác tại vị trí tương đối của hình đó trong dòng chảy văn bản (thường là ngay sau câu đề bài "Cho hình vẽ bên..." hoặc "Cho tam giác ABC...").
  - Nếu có nhiều hình liên tiếp, đặt nhiều tag: \`[[IMAGE]] [[IMAGE]]\`.

### 2. ĐỊNH DẠNG LATEX CHO TOÁN HỌC
- Toàn bộ công thức toán và kí hiệu phải nằm trong cặp dấu \`\${\` và \`}$\`.
- **Quy tắc ngoặc**:
  - Ngoặc đơn \`( )\` chứa công thức \u2192 \`\\left( ... \\right)\`. Ví dụ: \`\${\\left(x+1\\right)}$\`.
  - Ngoặc vuông \`[ ]\` \u2192 \`\\left[ ... \\right]\`.
  - Ngoặc nhọn \`{ }\` \u2192 \`\\left\\{ ... \\right\\}\`.
  - Dấu trị tuyệt đối \`| |\` \u2192 \`\\left| ... \\right|\`.
  - **Lưu ý**: Ngoặc chứa văn bản chú thích (ví dụ: "(1 điểm)") thì giữ nguyên, không đổi thành LaTeX.
- **Kí hiệu hình học**:
  - Tam giác: \`\\Delta\`. Ví dụ: \`\${\\Delta ABC}$\`.
  - Góc: \`\\widehat{...}\`. Ví dụ: \`\${\\widehat{ABC} = 60{}^\\circ}$\`.
  - Độ: \`{}^\\circ\`.
  - Các đối tượng hình học (điểm, đoạn thẳng, mặt phẳng) phải được coi là công thức: \`\${AB}$\`, \`\${mp(P)}$\`, \`\${S.ABCD}$\`.
- **Dấu trừ**: Sử dụng dấu trừ toán học, không dùng dấu gạch nối ngắn.

### 3. BỐ CỤC & VĂN BẢN
- Giữ nguyên cấu trúc đề mục (Câu 1, Câu 2...).
- Gõ lại chính xác nội dung Tiếng Việt.
- Bỏ qua các dòng kẻ chấm (......) hoặc khoảng trắng thừa.

### VÍ DỤ MẪU
**Input**: 
"Câu 1. Cho hình chóp S.ABCD có đáy là hình vuông (Hình 1).
[Hình vẽ hình chóp]
Tính thể tích khối chóp."

**Output mong đợi**:
"Câu 1. Cho hình chóp \${S.ABCD}$ có đáy là hình vuông (Hình 1).
[[IMAGE]]
Tính thể tích khối chóp."
`;

export const convertFileToMarkdown = async (
  base64Data: string,
  mimeType: string
): Promise<ConvertResponse> => {
  if (!GEMINI_API_KEY) {
    throw new Error("AUTH_ERROR: API Key is missing. Please check your environment configuration.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Thực hiện chuyển đổi. Chú ý: Tại vị trí có hình vẽ, BẮT BUỘC trả về [[IMAGE]]. Không mô tả hình."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      }
    });

    const text = response.text || "";
    
    const cleanText = text
      .replace(/^```[a-z]*\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '');

    return {
      markdown: cleanText,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        responseTokens: response.usageMetadata?.candidatesTokenCount || 0
      }
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const msg = error.message || error.toString();

    if (msg.includes("API key") || msg.includes("403") || msg.includes("permission")) {
      throw new Error("AUTH_ERROR: Invalid API Key or permission denied.");
    }
    
    if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
      throw new Error("QUOTA_ERROR: API rate limit exceeded. Please try again later.");
    }

    if (msg.includes("500") || msg.includes("503") || msg.includes("overloaded")) {
      throw new Error("SERVER_ERROR: Google Gemini service is currently experiencing issues. Please try again later.");
    }

    if (msg.includes("safety") || msg.includes("blocked") || msg.includes("finishReason")) {
      throw new Error("SAFETY_ERROR: The document content was flagged by safety filters and could not be processed.");
    }

    throw new Error(`API_ERROR: ${msg}`);
  }
};