chrome.action.onClicked.addListener(async () => {
  await chrome.windows.create({
    url: "https://sprouttie.app/?source=chrome_extension",
    type: "popup",
    width: 1100,
    height: 800
  });
});