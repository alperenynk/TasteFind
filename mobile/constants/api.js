// Backend adresi. .env (geliştirme) veya EAS env (build) içinde EXPO_PUBLIC_API_URL ile ayarla, örn:
//   EXPO_PUBLIC_API_URL=http://192.168.1.20:5001/api   (gerçek cihaz: bilgisayarının LAN IP'si)
//   EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api       (Android emülatör)
//   EXPO_PUBLIC_API_URL=https://api.senin-domainin.com/api  (production, HTTPS şart)
const configured = process.env.EXPO_PUBLIC_API_URL;

if (!__DEV__ && !configured) {
  // Release build'de localhost'a düşüp sessizce bozuk çalışmaktansa açıkça patla
  throw new Error("EXPO_PUBLIC_API_URL is not set for this build");
}

if (!__DEV__ && !configured.startsWith("https://")) {
  throw new Error("EXPO_PUBLIC_API_URL must use https:// in production builds");
}

const fallback = "http://localhost:5001/api"; // sadece geliştirme (iOS simülatör)
export const API_URL = (configured || fallback).replace(/\/+$/, "");
