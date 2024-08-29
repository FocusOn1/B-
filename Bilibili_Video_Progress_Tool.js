// ==UserScript==
// @name         B站视频进度条
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  这个脚本可以显示哔哩哔哩合集视频的进度条
// @author       FocusOn1
// @match        https://greasyfork.org/zh-CN/scripts/505814-b%E7%AB%99%E8%A7%86%E9%A2%91%E8%BF%9B%E5%BA%A6%E6%9D%A1
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
    timeDisplay.style.left = '115px';
    timeDisplay.style.top = '144px';
    timeDisplay.style.backgroundColor = '#f6f8fa';
    timeDisplay.style.color = '#333';
    timeDisplay.style.padding = '2px';
    timeDisplay.style.borderRadius = '5px';
    timeDisplay.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';  // 轻微阴影
    timeDisplay.style.border = '1px solid #e1e4e8';  // 边框颜色
    timeDisplay.style.fontFamily = 'Arial, sans-serif';  // 清晰易读的字体

    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'relative';  // 使子元素能够绝对定位
    progressContainer.style.marginTop = '10px';
    progressContainer.style.height = '20px';
    progressContainer.style.backgroundColor = '#e1e4e8';  // 进度条背景色
    progressContainer.style.borderRadius = '5px';
    progressContainer.style.overflow = 'hidden';

    // 创建进度条前景
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.position = 'absolute';  // 绝对定位以覆盖容器
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = 'rgba(255, 165, 0, 0.5)';  // 进度条前景色
    progressBar.style.width = '0%';  // 初始宽度为0
    progressBar.style.transition = 'width 0.3s ease';  // 添加过渡效果

    // 添加进度条到容器
    progressContainer.appendChild(progressBar);

    // 创建统计数据显示区域
    const statsDisplay = document.createElement('div');
    statsDisplay.style.position = 'absolute';  // 绝对定位在进度条上方
    statsDisplay.style.top = '-25px';  // 调整到进度条的上方
    statsDisplay.style.left = '0';
    statsDisplay.style.right = '0';
    statsDisplay.style.padding = '2px';
    statsDisplay.style.textAlign = 'center';  // 居中对齐
    statsDisplay.style.color = '#333';
    statsDisplay.style.backgroundColor = '#f6f8fa';  // 透明背景以便能看到进度条

    // 添加统计数据显示区域到时间显示元素
    timeDisplay.appendChild(progressContainer);
    timeDisplay.appendChild(statsDisplay);

    // 添加进度条容器到时间显示元素
    timeDisplay.appendChild(progressContainer);

    // 为时长按钮添加重叠优先级，防止被其他元素覆盖
    timeDisplay.style.zIndex = '9999999999';
    document.body.appendChild(timeDisplay);

    // 创建按钮容器，使按钮并排显示
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.right = '10px';
    buttonContainer.style.bottom = '10px';
    buttonContainer.style.zIndex = '10000000000';
    document.body.appendChild(buttonContainer);

   
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
            // 如果包含小时部分
            const [hours, minutes, secs] = timeParts;
            seconds = hours * 3600 + minutes * 60 + secs;
        } else if (timeParts.length === 2) {
            // 如果只有分钟和秒
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

        // 计算已观看占比
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

        // 更新进度条的宽度
        progressBar.style.width = `${percentageWatched.toFixed(2)}%`;

        timeDisplay.innerHTML = `
            <strong>进度</strong> : ${percentageWatched.toFixed(2)}%  <strong>|</strong>
            <strong>总时长</strong>: ${formatDuration(totalDurationInSeconds)}  <strong>|</strong>
            <strong>已观看时长</strong>: ${formatDuration(totalWatchedDurationInSeconds)}  <strong>|</strong>
            <strong>剩余时长</strong>: ${formatDuration(remainingDurationInSeconds)}
        `;
        return true;
    }

    // 更新列表时长的函数
    function updateListDurations() {
        const listBox = document.querySelector('.video-info-detail-list.video-info-detail-content');
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

        // 更新进度条的宽度
        progressBar.style.width = `${percentageWatched.toFixed(2)}%`;

        timeDisplay.innerHTML = `
            <strong>进度</strong>: ${percentageWatched.toFixed(2)}%  <strong>|</strong>
            <strong>总时长</strong>: ${formatDuration(totalDurationInSeconds)}  <strong>|</strong>
            <strong>已观看时长</strong>: ${formatDuration(totalWatchedDurationInSeconds)}  <strong>|</strong>
            <strong>剩余时长</strong>: ${formatDuration(remainingDurationInSeconds)}
        `;
        return true;
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

    // 初始延迟2000ms执行一次，避免第一次载入网址时无法及时加载数据而导致时长为0
    setTimeout(function(){
        // 初始加载时执行一次
        updateDurations();
        setupVideoListener();
    }, 2000);
})();
