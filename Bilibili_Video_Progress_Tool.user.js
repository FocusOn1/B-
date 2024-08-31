// ==UserScript==
// @name         B站视频进度条
// @namespace    http://tampermonkey.net/
// @version      5.0.1
// @description  这个脚本可以显示哔哩哔哩合集视频的进度条
// @author       FocusOn1
// @match        https://greasyfork.org/zh-CN/scripts/505814-b%E7%AB%99%E8%A7%86%E9%A2%91%E8%BF%9B%E5%BA%A6%E6%9D%A1
// @match        https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @match        https://www.bilibili.com/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=greasyfork.org
// @grant        none
// @license      MIT
// ==/UserScript==


(function() {
    'use strict';

    // 默认颜色配置
    let config = {
        backgroundColor: '#f6f8fa', // 背景颜色
        fontColor: '#24292e', // 全部数据字体颜色
        progressBarColor: 'yellow', // 进度条颜色
        progressBarBackgroundColor: '#ddd', // 进度条背景颜色
        progressFontColor: '#24292e' // 进度字体颜色
    };

    // 创建颜色选择弹窗
    const colorPicker = document.createElement('div');
    colorPicker.id = 'color-picker';
    colorPicker.style.display = 'none';
    colorPicker.style.position = 'fixed';
    colorPicker.style.top = '50%';
    colorPicker.style.left = '50%';
    colorPicker.style.transform = 'translate(-50%, -50%)';
    colorPicker.style.backgroundColor = '#fff';
    colorPicker.style.padding = '20px';
    colorPicker.style.border = '1px solid #ccc';
    colorPicker.style.zIndex = '10000000000';
    colorPicker.innerHTML = `
        <label for="background-color">背景颜色:</label>
        <input type="color" id="background-color" value="${config.backgroundColor}"><br>
        <label for="progress-bar-color">进度条颜色:</label>
        <input type="color" id="progress-bar-color" value="${config.progressBarColor}"><br>
        <label for="progress-bar-background-color">进度条背景颜色:</label>
        <input type="color" id="progress-bar-background-color" value="${config.progressBarBackgroundColor}"><br>
        <label for="progress-font-color">进度字体颜色:</label>
        <input type="color" id="progress-font-color" value="${config.progressFontColor}"><br>
        <label for="font-color">全部数据字体颜色:</label>
        <input type="color" id="font-color" value="${config.fontColor}"><br>
        <div style="text-align: center;">
           <button id="save-colors">保存</button>
           <button id="reset-colors">重置</button>
        </div>
    `;
    document.body.appendChild(colorPicker);

    // 保存颜色
    document.getElementById('save-colors').addEventListener('click', () => {
        config.backgroundColor = document.getElementById('background-color').value;
        config.fontColor = document.getElementById('font-color').value;
        config.progressBarColor = document.getElementById('progress-bar-color').value;
        config.progressBarBackgroundColor = document.getElementById('progress-bar-background-color').value;
        config.progressFontColor = document.getElementById('progress-font-color').value;
        colorPicker.style.display = 'none';
        applyColors();
    });

    // 重置颜色
    document.getElementById('reset-colors').addEventListener('click', () => {
        config = {
            backgroundColor: '#f6f8fa',
            fontColor: '#24292e',
            progressBarColor: 'yellow',
            progressBarBackgroundColor: '#ddd',
            progressFontColor: '#24292e'
        };
        document.getElementById('background-color').value = config.backgroundColor;
        document.getElementById('font-color').value = config.fontColor;
        document.getElementById('progress-bar-color').value = config.progressBarColor;
        document.getElementById('progress-bar-background-color').value = config.progressBarBackgroundColor;
        document.getElementById('progress-font-color').value = config.progressFontColor;
        colorPicker.style.display = 'none';
        applyColors();
    });

    // 应用颜色
    function applyColors() {
        timeDisplay.style.backgroundColor = config.backgroundColor;
        timeDisplay.style.color = config.fontColor;
        updateProgressBar(percentageWatched); // 假设 percentageWatched 是一个全局变量
    }

    // 创建时间显示的元素
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'time-display';
    timeDisplay.style.position = 'fixed';
    timeDisplay.style.left = '5px';
    timeDisplay.style.bottom = '10px';
    timeDisplay.style.backgroundColor = config.backgroundColor;
    timeDisplay.style.color = config.fontColor;
    timeDisplay.style.padding = '5px';
    timeDisplay.style.borderRadius = '50px';
    timeDisplay.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'; // GitHub 阴影
    timeDisplay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'; // GitHub 字体
    timeDisplay.style.zIndex = '9999999999';
    timeDisplay.style.width = '80px'; // 调整宽度
    timeDisplay.style.height = '80px'; // 调整高度
    timeDisplay.style.cursor = 'move'; // 更改鼠标样式为移动
    document.body.appendChild(timeDisplay);

    // 创建进度条容器
    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = 'progress-bar-container';
    progressBarContainer.style.width = '100%';
    progressBarContainer.style.height = '100%';
    progressBarContainer.style.position = 'relative';
    timeDisplay.appendChild(progressBarContainer);

    // 创建Canvas元素
    const progressBarCanvas = document.createElement('canvas');
    progressBarCanvas.id = 'progress-bar-canvas';
    progressBarCanvas.width = progressBarContainer.clientWidth;
    progressBarCanvas.height = progressBarContainer.clientHeight;
    progressBarCanvas.style.position = 'absolute';
    progressBarCanvas.style.top = '0';
    progressBarCanvas.style.left = '0';
    progressBarContainer.appendChild(progressBarCanvas);

    const ctx = progressBarCanvas.getContext('2d');

    // 创建数据容器
    const dataContainer = document.createElement('div');
    dataContainer.id = 'data-container';
    dataContainer.style.position = 'absolute';
    dataContainer.style.width = '100%';
    dataContainer.style.height = '100%';
    dataContainer.style.display = 'none'; // 默认隐藏
    dataContainer.style.textAlign = 'center';
    dataContainer.style.fontSize = '12px'; // 调整字体大小
    dataContainer.style.display = 'flex'; // 使用 flex 布局
    dataContainer.style.flexDirection = 'column'; // 垂直布局
    dataContainer.style.justifyContent = 'center'; // 垂直居中
    dataContainer.style.alignItems = 'center'; // 水平居中
    progressBarContainer.appendChild(dataContainer);

    // 格式化时长函数
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 解析时长并转换为秒的函数
    function parseDuration(durationText) {
        const timeParts = durationText.trim().split(':').map(Number);
        let seconds = 0;
        if (timeParts.length === 3) {
            const [hours, minutes, secs] = timeParts;
            seconds = hours * 3600 + minutes * 60 + secs;
        } else if (timeParts.length === 2) {
            const [minutes, secs] = timeParts;
            seconds = minutes * 60 + secs;
        }
        return seconds;
    }

    // 计算时长的函数
    function calculateDurations(durationsInSeconds, currentVideoIndex, currentVideoProgressInSeconds) {
        const totalDurationInSeconds = durationsInSeconds.reduce((total, duration) => total + duration, 0);
        const watchedDurationInSeconds = durationsInSeconds.slice(0, currentVideoIndex).reduce((total, duration) => total + duration, 0);
        const totalWatchedDurationInSeconds = watchedDurationInSeconds + currentVideoProgressInSeconds;
        const remainingDurationInSeconds = totalDurationInSeconds - totalWatchedDurationInSeconds;
        const percentageWatched = (totalDurationInSeconds > 0) ? (totalWatchedDurationInSeconds / totalDurationInSeconds) * 100 : 0;
        return {
            totalDurationInSeconds,
            totalWatchedDurationInSeconds,
            remainingDurationInSeconds,
            percentageWatched
        };
    }

    // 更新合集时长的函数
    function updateCollectionDurations() {
        const currentPageElement = document.querySelector('.cur-page');
        if (!currentPageElement) return false;
        const [currentVideoIndex, totalVideos] = currentPageElement.textContent.match(/\d+/g).map(Number);
        const currentVideoZeroBasedIndex = currentVideoIndex - 1;
        const videoDurations = document.querySelectorAll('.video-episode-card__info-duration');
        if (videoDurations.length === 0) return false;
        const durationsInSeconds = Array.from(videoDurations).map(durationElement => parseDuration(durationElement.textContent));
        const videoPlayer = document.querySelector('video');
        if (!videoPlayer) return false;
        const currentVideoProgressInSeconds = videoPlayer.currentTime;
        const { totalDurationInSeconds, totalWatchedDurationInSeconds, remainingDurationInSeconds, percentageWatched } = calculateDurations(durationsInSeconds, currentVideoZeroBasedIndex, currentVideoProgressInSeconds);
        updateProgressBar(percentageWatched);
        updateDataContainer(totalDurationInSeconds, totalWatchedDurationInSeconds, remainingDurationInSeconds);
        return true;
    }

    // 更新列表时长的函数
    function updateListDurations() {
        const listBox = document.querySelector('.list-box');
        if (!listBox) return false;
        const videoItems = listBox.querySelectorAll('li');
        if (videoItems.length === 0) return false;
        const durationsInSeconds = Array.from(videoItems).map(item => {
            const durationElement = item.querySelector('.duration');
            return durationElement ? parseDuration(durationElement.textContent) : 0;
        });
        const currentVideoItem = listBox.querySelector('.on');
        if (!currentVideoItem) return false;
        const currentVideoIndex = Array.from(videoItems).indexOf(currentVideoItem);
        const videoPlayer = document.querySelector('video');
        if (!videoPlayer) return false;
        const currentVideoProgressInSeconds = videoPlayer.currentTime;
        const { totalDurationInSeconds, totalWatchedDurationInSeconds, remainingDurationInSeconds, percentageWatched } = calculateDurations(durationsInSeconds, currentVideoIndex, currentVideoProgressInSeconds);
        updateProgressBar(percentageWatched);
        updateDataContainer(totalDurationInSeconds, totalWatchedDurationInSeconds, remainingDurationInSeconds);
        return true;
    }

    // 更新进度条的函数
    function updateProgressBar(percentageWatched) {
        const radius = 35; // 调整半径
        const centerX = progressBarCanvas.width / 2;
        const centerY = progressBarCanvas.height / 2;
        const strokeWidth = 5; // 调整线宽

        ctx.clearRect(0, 0, progressBarCanvas.width, progressBarCanvas.height);

        // 绘制背景圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = config.progressBarBackgroundColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // 绘制进度圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, (percentageWatched / 100) * 2 * Math.PI - Math.PI / 2);
        ctx.strokeStyle = config.progressBarColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // 绘制进度百分比文本
        ctx.font = '14px Arial'; // 调整字体大小
        ctx.fillStyle = config.progressFontColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentageWatched.toFixed(2)}%`, centerX, centerY);
    }

    // 更新数据容器的函数
    function updateDataContainer(totalDurationInSeconds, totalWatchedDurationInSeconds, remainingDurationInSeconds) {
        dataContainer.innerHTML = `
            <div>总时长: ${formatDuration(totalDurationInSeconds)}</div>
            <div>已观看: ${formatDuration(totalWatchedDurationInSeconds)}</div>
            <div>剩余: ${formatDuration(remainingDurationInSeconds)}</div>
        `;
    }

    // 更新时长的主函数
    function updateDurations() {
        if (!updateCollectionDurations()) {
            updateListDurations();
        }
    }

    // 监听视频播放事件
    function setupVideoListener() {
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
            videoPlayer.addEventListener('timeupdate', updateDurations);
        }
    }

    // 添加鼠标事件监听器
    progressBarContainer.addEventListener('mouseenter', () => {
        progressBarCanvas.style.display = 'none';
        dataContainer.style.display = 'flex';
    });

    progressBarContainer.addEventListener('mouseleave', () => {
        progressBarCanvas.style.display = 'block';
        dataContainer.style.display = 'none';
    });

    // 初始延迟2000ms执行一次，避免第一次载入网址时无法及时加载数据而导致时长为0
    setTimeout(function(){
        updateDurations();
        setupVideoListener();
    }, 2000);

    // 拖动功能
    let isDragging = false;
    let offsetX, offsetY;
    let isMouseDown = false; // 新增鼠标标志位

    // 禁用文本选择
    function disableTextSelection() {
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }

    // 启用文本选择
    function enableTextSelection() {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }

    timeDisplay.addEventListener('mousedown', (e) => {
        isMouseDown = true; // 设置鼠标标志位
        isDragging = true;
        offsetX = e.clientX - timeDisplay.offsetLeft;
        offsetY = e.clientY - timeDisplay.offsetTop;
        disableTextSelection(); // 禁用文本选择
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            timeDisplay.style.left = `${e.clientX - offsetX}px`;
            timeDisplay.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        enableTextSelection(); // 启用文本选择
        if (isMouseDown) { // 如果鼠标按下后松开，重置标志位
            isMouseDown = false;
        }
    });

    // 点击时间显示元素时弹出颜色选择弹窗
    timeDisplay.addEventListener('click', (e) => {
        if (!isDragging && !isMouseDown) { // 只有在非拖动状态且非鼠标按下状态才显示颜色设置窗口
            colorPicker.style.display = 'block';
        }
    });

    // 初始化颜色
    applyColors();
})();
