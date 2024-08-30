// ==UserScript==
// @name         B站视频进度条
// @namespace    http://tampermonkey.net/
// @version      3.0.2
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

    // 创建时间显示的元素
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'time-display';
    timeDisplay.style.position = 'fixed';
    timeDisplay.style.left = '5px';
    timeDisplay.style.bottom = '10px';
    timeDisplay.style.backgroundColor = '#f6f8fa';
    timeDisplay.style.color = '#24292e';
    timeDisplay.style.padding = '-5px';
    timeDisplay.style.borderRadius = '100px';
    timeDisplay.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'; // GitHub 阴影
    timeDisplay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'; // GitHub 字体
    timeDisplay.style.zIndex = '9999999999';
    timeDisplay.style.width = '115px'; // 调整宽度
    timeDisplay.style.height = '115px'; // 调整高度
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
    dataContainer.style.lineHeight = '115px'; // 垂直居中
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
        const radius = 50;
        const centerX = progressBarCanvas.width / 2;
        const centerY = progressBarCanvas.height / 2;
        const strokeWidth = 10;

        ctx.clearRect(0, 0, progressBarCanvas.width, progressBarCanvas.height);

        // 绘制背景圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // 绘制进度圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, (percentageWatched / 100) * 2 * Math.PI - Math.PI / 2);
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // 绘制进度百分比文本
        ctx.font = '20px Arial';
        ctx.fillStyle = '#24292e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentageWatched.toFixed(2)}%`, centerX, centerY);
    }

    // 更新数据容器的函数
   function updateDataContainer(totalDurationInSeconds, totalWatchedDurationInSeconds, remainingDurationInSeconds) {
    dataContainer.innerHTML = `
        <br><div>总时长: ${formatDuration(totalDurationInSeconds)}</div>
        <div>已观看: ${formatDuration(totalWatchedDurationInSeconds)}</div>
        <div>剩余: ${formatDuration(remainingDurationInSeconds)}</div>
    `;
    dataContainer.style.lineHeight = '22px'; // 确保每行内容垂直居中
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
        dataContainer.style.display = 'block';
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
})();
