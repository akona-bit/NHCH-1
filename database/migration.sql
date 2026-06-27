-- SQL Migration (Tương thích MariaDB/MySQL)

-- 1. Thêm bảng PhanHoiCauHoi
CREATE TABLE IF NOT EXISTS phan_hoi_cau_hoi (
    ma_phan_hoi INT AUTO_INCREMENT PRIMARY KEY,
    ma_cau_hoi INT NOT NULL,
    nguoi_phan_hoi UUID NOT NULL, -- Assuming UUID for user ID based on Supabase, or INT if using custom user table
    loai_phan_hoi ENUM('comment', 'approve', 'reject', 'request_edit') NOT NULL,
    noi_dung TEXT NOT NULL,
    thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phch_cauhoi FOREIGN KEY (ma_cau_hoi) REFERENCES cau_hoi(ma_cau_hoi) ON DELETE CASCADE
    -- CONSTRAINT fk_phch_user FOREIGN KEY (nguoi_phan_hoi) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 2. Thêm cột ExposureCount, ExposureLimit vào CauHoi
ALTER TABLE cau_hoi
ADD COLUMN IF NOT EXISTS exposure_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS exposure_limit INT DEFAULT 5;

-- 3. Thêm TrangThai vào KyThi
ALTER TABLE ky_thi
ADD COLUMN IF NOT EXISTS trang_thai ENUM('draft', 'active', 'finalized', 'archived') DEFAULT 'draft';

-- 4. Thêm RandomSeed, IsFinalized vào DeThi
ALTER TABLE de_thi
ADD COLUMN IF NOT EXISTS random_seed INT,
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT FALSE;

-- 5. Thêm cột QualityFlag vào ItemAnalysis
-- Giả sử bảng tên là item_analysis, nếu chưa có thì tạo mới
CREATE TABLE IF NOT EXISTS item_analysis (
    ma_cau_hoi INT NOT NULL,
    ma_ky_thi INT NOT NULL,
    so_thi_sinh INT,
    ctt_diff FLOAT,
    ctt_disc FLOAT,
    pt_bis FLOAT,
    irt_a FLOAT,
    irt_b FLOAT,
    quality_flag ENUM('ok', 'warn', 'critical') DEFAULT 'ok',
    PRIMARY KEY (ma_cau_hoi, ma_ky_thi),
    CONSTRAINT fk_ia_cauhoi FOREIGN KEY (ma_cau_hoi) REFERENCES cau_hoi(ma_cau_hoi) ON DELETE CASCADE,
    CONSTRAINT fk_ia_kythi FOREIGN KEY (ma_ky_thi) REFERENCES ky_thi(ma_ky_thi) ON DELETE CASCADE
);
