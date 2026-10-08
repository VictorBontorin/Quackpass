import { customAlphabet } from "nanoid";
import QRCode from "qrcode";

// Sem 0/O/1/I para facilitar digitação manual na portaria. 12 chars ≈ 62 bits.
const gen = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 12);

export function newTicketCode(): string {
  return gen();
}

export function formatTicketCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function normalizeTicketCode(input: string): string {
  // Aceita o código puro, com hífens, ou a URL inteira do ingresso
  const last = input.trim().split("/").pop() ?? "";
  return last.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 320, errorCorrectionLevel: "M" });
}
