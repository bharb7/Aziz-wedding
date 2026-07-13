// Supabase setup — already filled in with your project's values.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vprmwqgxkrrpnwcuugkr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcm13cWd4a3JycG53Y3V1Z2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODAwNjksImV4cCI6MjA5OTQ1NjA2OX0.9XjqUCAgcS6niRT3clKis7-Cxkv6r-sL9Qltw-GU5NY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);