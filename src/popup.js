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
  const msgEl = document.getElementsByClassName("msg")[0]
  msgEl.classList.remove("success", "failure")

  const vid = await chrome.cookies.get({ name: "wr_vid", url: tab.url })
  const { booksSyncKey, bookmarksSyncKey, reviewsSyncKey } =
    await chrome.storage.sync.get({
      booksSyncKey: "",
      bookmarksSyncKey: "",
      reviewsSyncKey: "",
    })

  msgEl.textContent = "获取数据……"
  const res = await chrome.tabs.sendMessage(tab.id, {
    op: "getData",
    args: [vid.value, booksSyncKey, bookmarksSyncKey, reviewsSyncKey],
  })
  if (res?.code !== 200) {
    return errorMsg(msgEl, res.code, res.err)
  }

  msgEl.textContent = "与Logseq同步中……"
  const syncBooksRes = await syncBooks(res.data)
  if (syncBooksRes?.code !== 200) {
    return errorMsg(msgEl, syncBooksRes.code)
  }

  await chrome.storage.sync.set({
    booksSyncKey: res.data.books.syncKey,
    bookmarksSyncKey: res.data.bookmarks.syncKey,
    reviewsSyncKey: res.data.reviews.syncKey,
  })

  msgEl.textContent = "完成"
  msgEl.classList.add("success")
}

async function syncBooks(data) {
  const { apiUrl, token } = await chrome.storage.local.get({
    apiUrl: "http://localhost:12315",
    token: "",
  })
  const res = await fetch(`${apiUrl}/api`, {
    method: "POST",
    credentials: "omit",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "logseq.App.invokeExternalPluginCmd",
      args: ["logseq-weread-sync", "models", "receiveSyncData", [data]],
    }),
  })
  if (!res.ok) return { code: res.code }
  const ok = await res.json()
  if (!ok) return { code: 400 }
  return { code: 200 }
}

function errorMsg(msgEl, code, err) {
  msgEl.classList.add("failure")
  switch (code) {
    case 401:
      msgEl.textContent = "请先登录微信读书"
      break
    default:
      msgEl.textContent = "同步失败"
      console.error(code, err)
      break
  }
}

async function openWeReadTab() {
  await chrome.tabs.create({ url: "https://weread.qq.com" })
}

document.addEventListener("DOMContentLoaded", main)
