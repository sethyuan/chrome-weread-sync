const SITE_URLS = ["https://i.weread.qq.com", "https://weread.qq.com"]

async function main(...args) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })
  if (SITE_URLS.some((url) => tab.url.startsWith(url))) {
    const ret = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: foo,
    })
    console.log(ret)
  }
}

async function foo() {
  return document.title
}

main()
