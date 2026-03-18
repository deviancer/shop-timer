/**
 * 宝岛音游社计时工具 - 核心应用逻辑
 *
 * 功能模块：
 * 1. 设备识别（localStorage UUID）
 * 2. 状态管理（idle / active / done）
 * 3. Supabase 数据交互
 * 4. 实时计时器
 * 5. 价格计算
 */

// ============================================================
// 配置 - 请替换为你的 Supabase 项目信息
// ============================================================
const SUPABASE_URL = 'https://kfuranvinblagbtsfucj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmdXJhbnZpbmJsYWdidHNmdWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzA5MjgsImV4cCI6MjA4OTM0NjkyOH0.qzkRC-lRhxjMkRjOY0NJlzDCm5ERd6YNT2TroaaC7r4';

// ============================================================
// 全局状态
// ============================================================
let supabaseClient = null;
let deviceId = null;
let currentStatus = 'idle'; // idle | active | done
let activeRecord = null;
let timerInterval = null;
let elapsedSeconds = 0;

// ============================================================
// DOM 元素引用
// ============================================================
const $ = (selector) => document.querySelector(selector);

const DOM = {
    loading: null,
    idleView: null,
    activeView: null,
    doneView: null,
    timerDisplay: null,
    startBtn: null,
    stopBtn: null,
    restartBtn: null,
    startTimeText: null,
    doneStartTime: null,
    doneEndTime: null,
    durationDisplay: null,
    priceAmount: null,
    privacyWarning: null,
    errorToast: null,
};

// ============================================================
// 初始化
// ============================================================
function initDOM() {
    DOM.loading = $('#loading-view');
    DOM.idleView = $('#idle-view');
    DOM.activeView = $('#active-view');
    DOM.doneView = $('#done-view');
    DOM.timerDisplay = $('#timer-display');
    DOM.startBtn = $('#start-btn');
    DOM.stopBtn = $('#stop-btn');
    DOM.restartBtn = $('#restart-btn');
    DOM.startTimeText = $('#start-time-text');
    DOM.doneStartTime = $('#done-start-time');
    DOM.doneEndTime = $('#done-end-time');
    DOM.durationDisplay = $('#duration-display');
    DOM.priceAmount = $('#price-amount');
    DOM.privacyWarning = $('#privacy-warning');
    DOM.errorToast = $('#error-toast');
}

async function init() {
    initDOM();

    // 检测隐私模式
    if (isPrivateMode()) {
        DOM.privacyWarning.style.display = 'block';
    }

    // 初始化设备 ID
    deviceId = getOrCreateDeviceId();

    // 检查 Supabase SDK 是否加载成功
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        console.error('Supabase SDK 未加载，请检查网络连接');
        showError('页面资源加载失败，请刷新重试');
        showView('idle');
        return;
    }

    // 初始化 Supabase 客户端
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        showError('系统初始化失败，请刷新重试');
        console.error('Supabase init error:', err);
        showView('idle');
        return;
    }

    // 绑定按钮事件
    DOM.startBtn.addEventListener('click', handleStart);
    DOM.stopBtn.addEventListener('click', handleStop);
    DOM.restartBtn.addEventListener('click', handleRestart);

    // 查询当前状态（带超时保护）
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), 10000)
        );
        await Promise.race([checkCurrentStatus(), timeoutPromise]);
    } catch (err) {
        console.error('初始化超时:', err);
        showError('加载超时，请检查网络后刷新');
        showView('idle');
    }
}

// ============================================================
// 设备识别
// ============================================================
function getOrCreateDeviceId() {
    const STORAGE_KEY = 'shop_timer_device_id';
    let id = null;

    try {
        id = localStorage.getItem(STORAGE_KEY);
        if (!id) {
            id = generateUUID();
            localStorage.setItem(STORAGE_KEY, id);
        }
    } catch (e) {
        // localStorage 不可用（隐私模式等），生成临时 ID
        id = generateUUID();
        console.warn('localStorage 不可用，使用临时 deviceId');
    }

    return id;
}

function generateUUID() {
    // 使用 crypto API 生成 UUID v4
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 降级方案
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function isPrivateMode() {
    try {
        const testKey = '__private_mode_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return false;
    } catch (e) {
        return true;
    }
}

// ============================================================
// 状态查询与视图切换
// ============================================================
async function checkCurrentStatus() {
    showView('loading');

    try {
        const { data, error } = await supabaseClient
            .from('checkin_records')
            .select('*')
            .eq('device_id', deviceId)
            .is('end_time', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            // 有活跃记录 → 显示计时中
            activeRecord = data[0];
            currentStatus = 'active';
            showActiveView();
        } else {
            // 无活跃记录 → 显示空闲
            currentStatus = 'idle';
            showView('idle');
        }
    } catch (err) {
        console.error('查询状态失败:', err);
        showError('网络连接失败，请检查网络后刷新');
        showView('idle');
    }
}

function showView(viewName) {
    // 隐藏所有视图
    DOM.loading.classList.remove('active');
    DOM.idleView.classList.remove('active');
    DOM.activeView.classList.remove('active');
    DOM.doneView.classList.remove('active');

    // 显示目标视图
    switch (viewName) {
        case 'loading':
            DOM.loading.classList.add('active');
            break;
        case 'idle':
            DOM.idleView.classList.add('active');
            break;
        case 'active':
            DOM.activeView.classList.add('active');
            break;
        case 'done':
            DOM.doneView.classList.add('active');
            break;
    }
}

function showActiveView() {
    if (!activeRecord) return;

    // 显示入场时间
    const startTime = new Date(activeRecord.start_time);
    DOM.startTimeText.textContent = '入场时间：' + formatTime(startTime);

    // 启动计时器
    startTimer(startTime);

    showView('active');
}

function showDoneView(record) {
    const startTime = new Date(record.start_time);
    const endTime = new Date(record.end_time);
    const diffMs = endTime - startTime;

    // 显示总时长
    DOM.durationDisplay.textContent = '总计 ' + formatDuration(diffMs);

    // 计算并显示价格
    const spending = calculatePrice(diffMs);
    DOM.priceAmount.textContent = '￥' + spending;

    // 显示入场/离场时间
    DOM.doneStartTime.textContent = '入场：' + formatTime(startTime);
    DOM.doneEndTime.textContent = '离场：' + formatTime(endTime);

    showView('done');
}

// ============================================================
// 业务操作
// ============================================================
async function handleStart() {
    DOM.startBtn.disabled = true;

    try {
        // 插入新记录，start_time 使用数据库服务端时间
        const { data, error } = await supabaseClient
            .from('checkin_records')
            .insert({
                device_id: deviceId,
                start_time: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        activeRecord = data;
        currentStatus = 'active';
        showActiveView();
    } catch (err) {
        console.error('开始计时失败:', err);
        showError('操作失败，请重试');
        DOM.startBtn.disabled = false;
    }
}

async function handleStop() {
    if (!activeRecord) return;

    // 二次确认
    const confirmed = confirm('确定要结束计时吗？');
    if (!confirmed) return;

    DOM.stopBtn.disabled = true;
    stopTimer();

    try {
        const endTimeISO = new Date().toISOString();

        // 计算消费金额
        const startTime = new Date(activeRecord.start_time);
        const endTime = new Date(endTimeISO);
        const diffMs = endTime - startTime;
        const spending = calculatePrice(diffMs);

        const { data, error } = await supabaseClient
            .from('checkin_records')
            .update({ end_time: endTimeISO, spending: spending })
            .eq('id', activeRecord.id)
            .select()
            .single();

        if (error) throw error;

        currentStatus = 'done';
        activeRecord = null;
        showDoneView(data);
    } catch (err) {
        console.error('结束计时失败:', err);
        showError('操作失败，请重试');
        DOM.stopBtn.disabled = false;
        // 重启计时器
        if (activeRecord) {
            startTimer(new Date(activeRecord.start_time));
        }
    }
}

function handleRestart() {
    currentStatus = 'idle';
    activeRecord = null;
    DOM.startBtn.disabled = false;
    showView('idle');
}

// ============================================================
// 计时器
// ============================================================
function startTimer(startTime) {
    stopTimer(); // 确保没有重复的定时器

    function updateTimer() {
        const now = new Date();
        const diffMs = now - startTime;
        elapsedSeconds = Math.floor(diffMs / 1000);
        DOM.timerDisplay.textContent = formatElapsed(elapsedSeconds);
    }

    updateTimer(); // 立即更新一次
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================================
// 价格计算
// ============================================================

/**
 * 根据时长计算价格（四舍五入到小时，以30分钟为界）
 * 不满半小时向下取整，半小时及以上向上取整
 * 例：1h20m → 1小时，1h32m → 2小时
 *
 * 1小时 17元 | 2小时 32元 | 3小时 45元
 * 4小时 56元 | 5小时 65元 | 6小时及以上 72元
 */
const PRICE_TABLE = [17, 32, 45, 56, 65, 72];

function calculatePrice(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const fullHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    let hours = fullHours;
    if (remainingMinutes >= 30) {
        hours += 1; // 半小时及以上，向上进一位
    }

    if (hours <= 0) hours = 1; // 最少按 1 小时计
    if (hours >= 6) return PRICE_TABLE[5];
    return PRICE_TABLE[hours - 1];
}

// ============================================================
// 格式化工具
// ============================================================

/**
 * 格式化已过秒数为 HH:MM:SS
 */
function formatElapsed(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
        String(hours).padStart(2, '0') + ' : ' +
        String(minutes).padStart(2, '0') + ' : ' +
        String(seconds).padStart(2, '0')
    );
}

/**
 * 格式化毫秒差值为可读时长（如 "2小时34分"）
 */
function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return hours + '小时' + minutes + '分';
    } else if (hours > 0) {
        return hours + '小时';
    } else if (minutes > 0) {
        return minutes + '分钟';
    } else {
        return '不到1分钟';
    }
}

/**
 * 格式化 Date 为时间字符串 HH:MM:SS
 */
function formatTime(date) {
    return (
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':' +
        String(date.getSeconds()).padStart(2, '0')
    );
}

// ============================================================
// 错误提示
// ============================================================
function showError(message) {
    DOM.errorToast.textContent = message;
    DOM.errorToast.classList.add('show');
    setTimeout(() => {
        DOM.errorToast.classList.remove('show');
    }, 3000);
}

// ============================================================
// 启动应用
// ============================================================
document.addEventListener('DOMContentLoaded', init);
