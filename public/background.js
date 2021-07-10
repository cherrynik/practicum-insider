chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        name: "Jack",
        darkTheme: {
            enabled: true
        }
    })
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        // chrome.scripting.injectCSS(() => {});
        chrome.scripting.executeScript({
            target: {tabId: tabId},
            files: ["./foreground.js"]
        }).then(() => {

        }).catch((err) => {});
    }
});
