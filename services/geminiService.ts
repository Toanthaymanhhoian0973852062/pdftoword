import { GoogleGenAI } from "@google/genai";
import { ConvertResponse } from "../types";

// Helper để lấy API Key ưu tiên từ LocalStorage, sau đó đến biến môi trường
export const getApiKey = () => {
  // Hàm kiểm tra tính hợp lệ cơ bản của Gemini API Key
  const isValidKey = (key: string | null | undefined) => {
    if (!key) return false;
    const trimmed = key.trim();
    // Key phải có độ dài, bắt đầu bằng AIza, và không chứa từ khóa hướng dẫn
    return trimmed.length > 0 && trimmed.startsWith('AIza') && !trimmed.includes('Điền_Mã');
  };

  const userKey = localStorage.getItem('user_gemini_api_key');
  // Ưu tiên Key người dùng nhập
  if (isValidKey(userKey)) {
    console.debug("Using User API Key from LocalStorage");
    return userKey!.trim();
  }
  
  // Sau đó mới đến Key hệ thống (nếu có)
  if (isValidKey(process.env.API_KEY)) {
    console.debug("Using System API Key from Environment");
    return process.env.API_KEY!;
  }
  
  return '';
};

const SYSTEM_INSTRUCTION = `
Bạn là chuyên gia chuyển đổi tài liệu Toán học sang định dạng văn bản tùy chỉnh. 

### NGUYÊN TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ)

1. **ĐỊNH DẠNG BAO CÔNG THỨC: \`\${\` ... \`}\$\`**
   - Mọi công thức toán, số học, kí hiệu hình học phải nằm trong cặp dấu **\`\${\`** và **\`}\$\`**.
   - Ví dụ: \`\${2x-3}\$\`, \`\${A}\$\`, \`\${\\Delta ABC}\$\`.
   - **SAI**: \`$2x-3$\`, \`$$2x-3$$\`.
   - **TUYỆT ĐỐI KHÔNG DÙNG BACKTICK (\`)** bao quanh công thức.

2. **QUY TẮC DẤU NGOẶC (Phân biệt rõ ràng)**
   - **Ngoặc văn bản** (chú thích, số điểm): **GIỮ NGUYÊN**. 
     - Ví dụ: (1 điểm), (đề bài gồm 1 trang).
   - **Ngoặc toán học**: **PHẢI DÙNG LỆNH LaTeX TỰ ĐỘNG GIÃN**:
     - Ngoặc đơn: \`(\` ... \`)\` \u2192 **\`\\left(\`** ... **\`\\right)\`**.
       - Ví dụ: \`\${\\left(2x+3\\right)}\$\`.
     - Ngoặc vuông: \`[\` ... \`]\` \u2192 **\`\\left[\`** ... **\`\\right]\`**.
     - Ngoặc nhọn: \`{\` ... \`}\` \u2192 **\`\\left\\{\`** ... **\`\\right\\}\`**.
     - Giá trị tuyệt đối: \`|\` ... \`|\` \u2192 **\`\\left|\`** ... **\`\\right|\`**.
   - **Ngoại lệ**: Ngoặc nhọn trong hệ phương trình (ví dụ \`\\begin{cases}\` hoặc \`\\left\\{\\begin{align}\`) thì giữ nguyên cấu trúc, không thêm \`\\left\\{\` lồng vào.
   - **Lưu ý**: Nếu biểu thức ngoặc đứng một mình, phải đưa vào công thức.
     - Ví dụ: "(2x+3)" thành \`\${\\left(2x+3\\right)}\$\`.

3. **QUY TẮC DẤU TRỪ VÀ KHOẢNG TRẮNG**
   - **Dấu trừ (-)**: Trong công thức toán, **KHÔNG** để khoảng trắng trước và sau.
     - Sai: \`\${2x - 3}\$\`
     - Đúng: \`\${2x-3}\$\`
   - **Làm sạch**: Bỏ qua các dòng chứa nhiều dấu chấm (....). Bỏ qua khoảng trắng thừa.

4. **KÍ HIỆU HÌNH HỌC**
   - "Tam giác" hoặc \`\\triangle\` \u2192 dùng **\`\\Delta\`**. Ví dụ: \`\${\\Delta ABC}\$\`.
   - Góc \u2192 dùng **\`\\widehat{...}\`**. Ví dụ: \`\${\\widehat{ABC}}\$\`.
   - Độ \u2192 dùng **\`{}^\\circ\`**. Ví dụ: \`\${50{}^\\circ}\$\`.

5. **XỬ LÝ KHÁC**
   - Nếu MathType quá dài/phức tạp, ghi chú: "[Công thức phức tạp]".
   - Hình ảnh: Chèn tag \`[[IMAGE]]\`.
`;

export interface GeminiInput {
  mimeType: string;
  data: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const convertFileToMarkdown = async (
  inputs: GeminiInput[]
): Promise<ConvertResponse> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("AUTH_ERROR: Chưa nhập API Key. Vui lòng nhấn vào biểu tượng Chìa khóa để nhập.");
  }

  // Khởi tạo AI instance bên trong hàm để luôn dùng key mới nhất
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const parts: any[] = inputs.map(input => ({
    inlineData: {
      mimeType: input.mimeType,
      data: input.data
    }
  }));

  parts.push({
    text: "Chuyển đổi sang văn bản. Áp dụng nghiêm ngặt quy tắc: Công thức bao quanh bởi ${ và }$, dùng \\left \\right cho ngoặc toán, \\Delta cho tam giác, không khoảng trắng quanh dấu trừ."
  });

  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: parts
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
        }
      });

      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error("API_ERROR: Không nhận được phản hồi từ AI.");
      
      const text = response.text || "";
      
      // --- CLEANING PIPELINE ---
      // 1. Loại bỏ các block code Markdown (```)
      let cleanText = text
        .replace(/^```[a-z]*\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/```$/, '');

      // 2. Chuẩn hóa các loại dấu toán học LaTeX thông thường về $ đơn trước
      //    Điều này giúp chúng ta có một nền tảng thống nhất trước khi chuyển sang ${...}$
      cleanText = cleanText
        .replace(/\\\[/g, '$')
        .replace(/\\\]/g, '$')
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\$\$/g, '$'); // Chuyển $$ thành $

      // 3. XỬ LÝ BACKTICK (`): Xóa bỏ định dạng ` và chuyển thành math nếu cần
      cleanText = cleanText.replace(/`([^`\n]+)`/g, (match, inner) => {
         const trimmed = inner.trim();
         
         // Nếu bên trong đã là định dạng $...$
         if (trimmed.startsWith('$') && trimmed.endsWith('$')) return trimmed;
         // Nếu bên trong đã là định dạng ${...}$
         if (trimmed.startsWith('${') && trimmed.endsWith('}$')) return trimmed;

         // Nếu bên trong có dấu hiệu toán học
         if (/[=+\-\\\^_{}<>]/.test(trimmed) || /\d/.test(trimmed)) {
             return `$${trimmed}$`;
         }

         return inner; 
      });

      // 4. CHUẨN HÓA: Nếu AI trả về ${...}$, tạm thời đưa về $...$ để làm sạch đồng bộ
      cleanText = cleanText.replace(/\$\{(.*?)\}\$/g, '$$$1$$');
      
      // 5. Đảm bảo tất cả chỉ là 1 dấu $ (dọn dẹp $$...$$ nếu có lỗi)
      cleanText = cleanText.replace(/\$\$([^$]+)\$\$/g, '$$$1$$');

      // 6. Xử lý khoảng trắng quanh dấu trừ trong công thức $...$
      cleanText = cleanText.replace(/\$([^$]+)\$/g, (match, content) => {
          let newContent = content.replace(/\s*-\s*/g, '-');
          return `$${newContent}$`;
      });

      // 7. Dọn dẹp dòng trống thừa và format đậm không cần thiết
      cleanText = cleanText
         .replace(/(\r\n|\r|\n){2,}/g, '\n')
         .replace(/\*\*(.*?)\*\*/g, '$1')
         .trim();

      // 8. BƯỚC CUỐI: Chuyển đổi tất cả $...$ thành ${...}$ theo yêu cầu người dùng
      //    Regex này tìm $nội_dung$ và thay bằng ${nội_dung}$
      cleanText = cleanText.replace(/\$([^$]+)\$/g, '${$1}$');

      return {
        markdown: cleanText,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          responseTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
      };
    } catch (error: any) {
      lastError = error;
      const msg = error.message || error.toString();
      const isServerIssue = msg.includes("500") || msg.includes("503") || msg.includes("Internal error") || msg.includes("overloaded");
      
      if (isServerIssue && attempt < MAX_RETRIES) {
        await delay(attempt * 2000);
        continue;
      }
      break;
    }
  }

  const msg = lastError?.message || lastError?.toString() || "Unknown Error";
  if (msg.includes("API key") || msg.includes("API Key")) throw new Error("AUTH_ERROR: API Key không hợp lệ hoặc đã hết hạn.");
  if (msg.includes("429")) throw new Error("QUOTA_ERROR: Đã hết hạn mức sử dụng.");
  if (msg.includes("500") || msg.includes("503")) throw new Error("SERVER_ERROR: Máy chủ Google Gemini đang gặp sự cố.");
  if (msg.includes("Failed to fetch")) throw new Error("NETWORK_ERROR: Không thể kết nối Internet.");
  
  throw new Error(`API_ERROR: ${msg}`);
};