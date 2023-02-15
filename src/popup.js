const SITE_URLS = ["https://i.weread.qq.com", "https://weread.qq.com"]

async function main(...args) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })
  if (SITE_URLS.some((url) => tab.url.startsWith(url))) {
    await sync(tab)
  } else {
    await openWeReadTab()
  }
}

async function sync(tab) {
  const msgEl = document.getElementById("msg")

  msgEl.textContent = "获取书籍数据……"
  const [{ result: booksRes }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getBooks,
  })
  if (booksRes.code !== 200) {
    return errorMsg(booksRes.code)
  }

  msgEl.textContent = "向Logseq导入书籍……"
  const syncBooksRes = await syncBooks(booksRes.data)
  if (syncBooksRes.code !== 200) {
    return errorMsg(syncBooksRes.code)
  }

  if (syncBooksRes.data.toSync.length > 0) {
    msgEl.textContent = "获取笔记数据……"
    const [{ result: detailsRes }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getDetailsAndNotes,
      args: [syncBooksRes.data.toSync],
    })
    if (detailsRes.code !== 200) {
      return errorMsg(detailsRes.code)
    }

    msgEl.textContent = "向Logseq导入笔记……"
    const syncDetailsRes = await syncDetails(detailsRes.data)
    if (syncDetailsRes.code !== 200) {
      return errorMsg(syncDetailsRes.code)
    }
  }

  msgEl.textContent = "完成"
}

async function getBooks() {
  // TODO
}

async function getDetailsAndNotes(bookIds) {
  // TODO
}

async function syncBooks(books) {
  // TODO
  const res = await fetch("")
  if (!res.ok) return { code: res.code }
  const json = await res.json()
  return { code: 200, data: json }
}

async function syncDetails(details) {
  // TODO
  const res = await fetch("")
  if (!res.ok) return { code: res.code }
  const json = await res.json()
  return { code: 200, data: json }
}

function errorMsg(msgEl, code) {
  switch (code) {
    case 401:
      msgEl.textContent = "请先登录微信读书"
      break
    default:
      msgEl.textContent = "同步失败"
      break
  }
}

async function openWeReadTab() {
  await chrome.tabs.create({ url: "https://weread.qq.com" })
}

document.addEventListener("DOMContentLoaded", main)
