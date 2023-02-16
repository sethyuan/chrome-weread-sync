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
  const { booksSyncKey, notesSyncKey } = await chrome.storage.sync.get({
    booksSyncKey: "",
    notesSyncKey: "",
  })

  msgEl.textContent = "获取数据……"
  const res = await chrome.tabs.sendMessage(tab.id, {
    op: "getData",
    args: [vid.value, booksSyncKey, notesSyncKey],
  })
  if (res?.code !== 200) {
    return errorMsg(msgEl, res.code)
  }
  await chrome.storage.sync.set({
    booksSyncKey: res.data.booksSyncKey,
    notesSyncKey: res.data.notesSyncKey,
  })

  msgEl.textContent = "与Logseq同步中……"
  const syncBooksRes = await syncBooks(res.data)
  if (syncBooksRes?.code !== 200) {
    return errorMsg(msgEl, syncBooksRes.code)
  }

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
      method: "logseq.App.invokeExternalPlugin",
      args: ["logseq-weread-sync.models.receiveSyncData", data],
    }),
  })
  if (!res.ok) return { code: res.code }
  console.log(await res.json())
  return { code: 200 }
}

function errorMsg(msgEl, code) {
  msgEl.classList.add("failure")
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
