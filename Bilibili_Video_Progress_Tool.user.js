// ==UserScript==
// @name         B站视频进度条
// @namespace    http://tampermonkey.net/
// @version      2.0.1
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
    timeDisplay.style.left = '10px';
    timeDisplay.style.bottom = '10px';
    timeDisplay.style.backgroundColor = '#f6f8fa';
    timeDisplay.style.color = '#24292e';
    timeDisplay.style.padding = '5px';
    timeDisplay.style.borderRadius = '25px';
    timeDisplay.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'; // GitHub 阴影
    timeDisplay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'; // GitHub 字体
    timeDisplay.style.zIndex = '9999999999';
    timeDisplay.style.width = 'auto'; // 调整宽度
    document.body.appendChild(timeDisplay);

    // 创建进度条元素
    const progressBar = document.createElement('progress');
    progressBar.id = 'progress-bar';
    progressBar.style.width = '100%';
    progressBar.style.height = '10px'; // 设置进度条的高度
    timeDisplay.appendChild(progressBar);

    // 添加进度条样式
    progressBar.style.webkitAppearance = 'none'; // 移除默认样式
    progressBar.style.appearance = 'none';
    progressBar.style.borderRadius = '5px'; // 设置圆角
    progressBar.style.backgroundColor = '#ddd'; // 设置未完成部分的颜色
    progressBar.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,.2)'; // 设置内阴影

    // 设置已完成部分的颜色
    progressBar.style.setProperty('--progress-color', 'yellow');

    // 使用CSS伪元素设置已完成部分的颜色
    const style = document.createElement('style');
    style.textContent = `
        #progress-bar::-webkit-progress-value {
            background-color: var(--progress-color);
            border-radius: 5px;
        }
        #progress-bar::-moz-progress-bar {
            background-color: var(--progress-color);
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);

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
        timeDisplay.innerHTML = `
            <strong>进度</strong> : ${percentageWatched.toFixed(2)}%  <strong>|</strong>
            <strong>总时长</strong>: ${formatDuration(totalDurationInSeconds)}  <strong>|</strong>
            <strong>已观看时长</strong>: ${formatDuration(totalWatchedDurationInSeconds)}  <strong>|</strong>
            <strong>剩余时长</strong>: ${formatDuration(remainingDurationInSeconds)}
        `;
        progressBar.value = percentageWatched;
        progressBar.max = 100;
        console.log(`Progress: ${percentageWatched.toFixed(2)}%`); // 调试信息
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
        timeDisplay.innerHTML = `
            <strong>进度</strong>: ${percentageWatched.toFixed(2)}%  <strong>|</strong>
            <strong>总时长</strong>: ${formatDuration(totalDurationInSeconds)}  <strong>|</strong>
            <strong>已观看时长</strong>: ${formatDuration(totalWatchedDurationInSeconds)}  <strong>|</strong>
            <strong>剩余时长</strong>: ${formatDuration(remainingDurationInSeconds)}
        `;
        progressBar.value = percentageWatched;
        progressBar.max = 100;
        console.log(`Progress: ${percentageWatched.toFixed(2)}%`); // 调试信息
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
        updateDurations();
        setupVideoListener();
    }, 2000);
})();

