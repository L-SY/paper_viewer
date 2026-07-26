const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const inviteCharacterCount = 12;

function getInviteSecret() {
  return process.env.GROUP_INVITE_SECRET?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || "";
}

export async function createGroupInviteCode(groupId: string) {
  const secret = getInviteSecret();
  if (!secret) throw new Error("Group invite secret is not configured");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`paperviewer-group-invite:${groupId}`),
  ));

  let buffer = 0;
  let bitCount = 0;
  let value = "";
  for (const byte of signature) {
    buffer = (buffer << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5 && value.length < inviteCharacterCount) {
      bitCount -= 5;
      value += inviteAlphabet[(buffer >> bitCount) & 31];
    }
    if (value.length === inviteCharacterCount) break;
  }

  return `PV-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
}

export function normalizeGroupInviteCode(input: string) {
  const compact = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("PV") && compact.length === 14) {
    const value = compact.slice(2);
    return `PV-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
  }
  return input.trim();
}

export function isGroupInviteCode(input: string) {
  return /^PV-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(input);
}
