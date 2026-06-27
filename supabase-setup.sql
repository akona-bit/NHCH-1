-- Supabase Setup with RLS and Auth integration
-- This script adapts your existing schema to work seamlessly with Supabase Auth.

-- =====================================
-- 1. PROFILES (Mapping to auth.users)
-- =====================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id TEXT,
    email TEXT,
    ho_ten TEXT,
    role VARCHAR(50) DEFAULT 'user',
    domain_assignment TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, ho_ten)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================
-- DROP EXISTING POLICIES (if re-running)
-- =====================================
DROP POLICY IF EXISTS "View all profiles" ON profiles;
DROP POLICY IF EXISTS "Update own profile" ON profiles;
DROP POLICY IF EXISTS "View all knowledge" ON kien_thuc;
DROP POLICY IF EXISTS "Insert knowledge" ON kien_thuc;
DROP POLICY IF EXISTS "Update knowledge" ON kien_thuc;
DROP POLICY IF EXISTS "View own questions" ON cau_hoi;
DROP POLICY IF EXISTS "Insert own questions" ON cau_hoi;
DROP POLICY IF EXISTS "Update own questions" ON cau_hoi;
DROP POLICY IF EXISTS "Delete own questions" ON cau_hoi;
DROP POLICY IF EXISTS "Manage answers for own questions" ON dap_an;
DROP POLICY IF EXISTS "Manage knowledge mapping for own questions" ON kien_thuc_cau_hoi;
DROP POLICY IF EXISTS "View all exams" ON ky_thi;
DROP POLICY IF EXISTS "Manage own exams" ON ky_thi;

-- =====================================
-- 2. ALTER EXISTING TABLES
-- =====================================
-- Add missing columns to kien_thuc
ALTER TABLE kien_thuc ADD COLUMN IF NOT EXISTS difficulty_base NUMERIC DEFAULT 0.65;
ALTER TABLE kien_thuc ADD COLUMN IF NOT EXISTS discrimination NUMERIC DEFAULT 1.20;
ALTER TABLE kien_thuc ADD COLUMN IF NOT EXISTS matrix_priority VARCHAR(10) DEFAULT 'P2';
ALTER TABLE kien_thuc ADD COLUMN IF NOT EXISTS nguoi_tao UUID;
ALTER TABLE kien_thuc ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE kien_thuc ALTER COLUMN ma_phan_thi DROP NOT NULL;

-- Add missing columns to ngu_lieu
ALTER TABLE ngu_lieu ADD COLUMN IF NOT EXISTS nguoi_tao UUID;
ALTER TABLE ngu_lieu ALTER COLUMN ma_phan_thi DROP NOT NULL;
ALTER TABLE ngu_lieu ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Modify cau_hoi if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cau_hoi' AND column_name = 'nguoi_tao' AND data_type != 'uuid') THEN
    ALTER TABLE cau_hoi ALTER COLUMN nguoi_tao TYPE UUID USING nguoi_tao::UUID;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cau_hoi' AND column_name = 'nguoi_tao') THEN
    ALTER TABLE cau_hoi ADD COLUMN nguoi_tao UUID;
  END IF;
END $$;

ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS loai_cau_hoi VARCHAR(50) DEFAULT 'multiple_choice';
ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS p_val NUMERIC DEFAULT 0.5;
ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS pt_bis NUMERIC DEFAULT 0.3;
ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS a_discr NUMERIC DEFAULT 1.0;
ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS b_diff NUMERIC DEFAULT 0.0;
ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS c_guess NUMERIC DEFAULT 0.2;
ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS irt_status VARCHAR(20) DEFAULT 'Review';

DO $$
BEGIN
    ALTER TABLE cau_hoi DROP CONSTRAINT IF EXISTS fk_cauhoi_nguoitao;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

ALTER TABLE cau_hoi ADD CONSTRAINT fk_cauhoi_nguoitao FOREIGN KEY (nguoi_tao) REFERENCES profiles(id) ON DELETE SET NULL;


-- =====================================
-- 3. KY THI (Exams)
-- =====================================
CREATE TABLE IF NOT EXISTS ky_thi (
    ma_ky_thi BIGSERIAL PRIMARY KEY,
    ten_ky_thi TEXT NOT NULL,
    ma_mon_hoc VARCHAR(50),
    hoc_ky VARCHAR(20),
    nam_hoc VARCHAR(20),
    loai_ky_thi VARCHAR(50),
    ngay_thi TIMESTAMP WITH TIME ZONE,
    thoi_gian_lam_bai INTEGER,
    so_luong_thi_sinh INTEGER DEFAULT 0,
    max_thi_sinh INTEGER DEFAULT 0,
    trang_thai VARCHAR(50) DEFAULT 'draft',
    nguoi_tao UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE ky_thi ADD COLUMN IF NOT EXISTS nguoi_tao UUID REFERENCES auth.users(id);
ALTER TABLE ky_thi ADD COLUMN IF NOT EXISTS max_thi_sinh INTEGER DEFAULT 0;
ALTER TABLE ky_thi ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- =====================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kien_thuc ENABLE ROW LEVEL SECURITY;
ALTER TABLE cau_hoi ENABLE ROW LEVEL SECURITY;
ALTER TABLE dap_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE kien_thuc_cau_hoi ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_thi ENABLE ROW LEVEL SECURITY;

-- =====================================
-- RLS POLICIES
-- =====================================

-- PROFILES: Users can view all profiles but only update their own
CREATE POLICY "View all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- KIEN THUC: Everyone can view, authenticated users can insert/update
CREATE POLICY "View all knowledge" ON kien_thuc FOR SELECT USING (true);
CREATE POLICY "Insert knowledge" ON kien_thuc FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update knowledge" ON kien_thuc FOR UPDATE USING (auth.role() = 'authenticated');

-- NGU LIEU: Everyone can view, authenticated users can insert/update/delete
ALTER TABLE ngu_lieu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View all ngu_lieu" ON ngu_lieu;
DROP POLICY IF EXISTS "Insert ngu_lieu" ON ngu_lieu;
DROP POLICY IF EXISTS "Update ngu_lieu" ON ngu_lieu;
DROP POLICY IF EXISTS "Delete ngu_lieu" ON ngu_lieu;
CREATE POLICY "View all ngu_lieu" ON ngu_lieu FOR SELECT USING (true);
CREATE POLICY "Insert ngu_lieu" ON ngu_lieu FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update ngu_lieu" ON ngu_lieu FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Delete ngu_lieu" ON ngu_lieu FOR DELETE USING (auth.role() = 'authenticated');

-- CAU HOI: Users can view their own questions or all questions if they are reviewers (simplification: all can view for analytics)
CREATE POLICY "View own questions" ON cau_hoi FOR SELECT USING (true);
CREATE POLICY "Insert own questions" ON cau_hoi FOR INSERT WITH CHECK (auth.uid() = nguoi_tao);
CREATE POLICY "Update own questions" ON cau_hoi FOR UPDATE USING (auth.uid() = nguoi_tao);
CREATE POLICY "Delete own questions" ON cau_hoi FOR DELETE USING (auth.uid() = nguoi_tao);

-- DAP AN: Users can manage answers for their own questions
CREATE POLICY "Manage answers for own questions" ON dap_an
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cau_hoi 
            WHERE cau_hoi.ma_cau_hoi = dap_an.ma_cau_hoi 
            AND cau_hoi.nguoi_tao = auth.uid()
        )
    );

-- KIEN THUC CAU HOI: Users can manage relationships for their own questions
CREATE POLICY "Manage knowledge mapping for own questions" ON kien_thuc_cau_hoi
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cau_hoi 
            WHERE cau_hoi.ma_cau_hoi = kien_thuc_cau_hoi.ma_cau_hoi 
            AND cau_hoi.nguoi_tao = auth.uid()
        )
    );

-- KY THI: Everyone can view, creators can manage
CREATE POLICY "View all exams" ON ky_thi FOR SELECT USING (true);
CREATE POLICY "Manage own exams" ON ky_thi FOR ALL USING (auth.uid() = nguoi_tao);

-- =====================================
-- 4. SYSTEM ALERTS
-- =====================================
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT,
    action_required BOOLEAN DEFAULT false,
    actions JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '[]',
    telemetry JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View all system alerts" ON system_alerts;
DROP POLICY IF EXISTS "Insert system alerts" ON system_alerts;
CREATE POLICY "View all system alerts" ON system_alerts FOR SELECT USING (true);
CREATE POLICY "Insert system alerts" ON system_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================
-- 5. MATRIX CONFIGS
-- =====================================
CREATE TABLE IF NOT EXISTS matrix_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    algo VARCHAR(50) DEFAULT 'irt',
    diff_range_min NUMERIC DEFAULT -2.5,
    diff_range_max NUMERIC DEFAULT 2.5,
    min_discrimination NUMERIC DEFAULT 0.85,
    max_guessing NUMERIC DEFAULT 0.25,
    unique_questions BOOLEAN DEFAULT true,
    prioritize_unused BOOLEAN DEFAULT true,
    strict_subject_balance BOOLEAN DEFAULT true,
    cog_recall NUMERIC DEFAULT 0.20,
    cog_understanding NUMERIC DEFAULT 0.40,
    cog_application NUMERIC DEFAULT 0.30,
    cog_analysis NUMERIC DEFAULT 0.10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE matrix_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View all matrix configs" ON matrix_configs;
DROP POLICY IF EXISTS "Insert matrix configs" ON matrix_configs;
DROP POLICY IF EXISTS "Update matrix configs" ON matrix_configs;
CREATE POLICY "View all matrix configs" ON matrix_configs FOR SELECT USING (true);
CREATE POLICY "Insert matrix configs" ON matrix_configs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update matrix configs" ON matrix_configs FOR UPDATE USING (auth.role() = 'authenticated');


-- =====================================
-- 6. NOTIFICATIONS
-- =====================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
