-- ============================================================
-- Supabase 数据库初始化脚本
-- 宝岛音游社计时工具 - checkin_records 表
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================================

-- 1. 创建 checkin_records 表
CREATE TABLE IF NOT EXISTS public.checkin_records (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id   VARCHAR(64) NOT NULL,
    start_time  TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time    TIMESTAMP WITH TIME ZONE,
    spending    NUMERIC(10,2),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. 添加表注释
COMMENT ON TABLE public.checkin_records IS '客户签到计时记录表';
COMMENT ON COLUMN public.checkin_records.id IS '记录唯一标识';
COMMENT ON COLUMN public.checkin_records.device_id IS '客户设备唯一标识（UUID，由前端 localStorage 生成）';
COMMENT ON COLUMN public.checkin_records.start_time IS '入场时间（客户端传入）';
COMMENT ON COLUMN public.checkin_records.end_time IS '离场时间（结束计时时更新）';
COMMENT ON COLUMN public.checkin_records.spending IS '本次消费金额（元，根据时长自动计算）';
COMMENT ON COLUMN public.checkin_records.created_at IS '记录创建时间';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_device_id
    ON public.checkin_records (device_id);

CREATE INDEX IF NOT EXISTS idx_device_active
    ON public.checkin_records (device_id, end_time)
    WHERE end_time IS NULL;

-- 4. 启用行级安全策略 (RLS)
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略：允许匿名用户查询自己 device_id 的记录
-- 注意：由于是匿名访问，这里用请求头中的自定义参数无法实现按 device_id 隔离
-- 因此使用较宽松的策略，允许 anon 角色进行基本操作
-- 实际安全性依赖于 device_id 的随机性（UUID v4）

-- 策略：允许匿名读取所有记录（客户端通过 device_id 筛选）
CREATE POLICY "允许匿名读取记录"
    ON public.checkin_records
    FOR SELECT
    TO anon
    USING (true);

-- 策略：允许匿名插入新记录
CREATE POLICY "允许匿名插入记录"
    ON public.checkin_records
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- 策略：允许匿名更新记录（仅允许设置 end_time）
-- 注意：RLS 无法限制"只更新某个字段"，但可以在应用层控制
-- 这里允许更新操作，应用代码中仅更新 end_time 字段
CREATE POLICY "允许匿名更新记录"
    ON public.checkin_records
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- 策略：禁止删除（不创建 DELETE 策略，默认拒绝）
-- 不需要显式创建，RLS 启用后默认拒绝未授权操作

-- ============================================================
-- 完成！
-- 请确认以下事项：
-- 1. 在 Supabase Dashboard → Settings → API 中获取：
--    - Project URL（如 https://xxxxx.supabase.co）
--    - anon public Key
-- 2. 将上述值填入 app.js 顶部的配置常量中
--
-- ❗ 如果表已存在，只需执行以下语句添加 spending 字段：
-- ALTER TABLE public.checkin_records
--     ADD COLUMN IF NOT EXISTS spending NUMERIC(10,2);
-- ============================================================
